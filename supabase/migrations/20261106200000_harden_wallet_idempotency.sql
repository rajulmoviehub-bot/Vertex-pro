-- Harden VELTEX wallet idempotency: a repeated key may only replay the exact same transaction.
-- Apply this migration in the Supabase SQL Editor before enabling live deposits.
create or replace function public.post_wallet_transaction(
  p_user_id uuid,
  p_idempotency_key text,
  p_kind text,
  p_amount numeric,
  p_direction text,
  p_reference text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_balance numeric(20,8);
  v_existing public.wallet_transactions%rowtype;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'server authorization required' using errcode = '42501';
  end if;

  if p_user_id is null or p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'user and idempotency key are required';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  if p_direction not in ('credit','debit') then raise exception 'invalid direction'; end if;

  -- Serialize balance changes for this wallet.
  perform 1 from public.wallets where user_id = p_user_id for update;
  if not found then raise exception 'wallet not found'; end if;

  -- A duplicate key is accepted only as an exact replay, never as a different credit.
  insert into public.wallet_transactions(user_id,idempotency_key,kind,amount,direction,reference,metadata)
  values (p_user_id,p_idempotency_key,p_kind,p_amount,p_direction,p_reference,coalesce(p_metadata,'{}'::jsonb))
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is not null then
    select available_balance into v_balance from public.wallets where user_id = p_user_id;
    if p_direction = 'debit' and v_balance < p_amount then
      raise exception 'insufficient funds';
    end if;

    update public.wallets
      set available_balance = available_balance + case when p_direction='credit' then p_amount else -p_amount end,
          updated_at = now()
      where user_id = p_user_id;
    return v_id;
  end if;

  select * into v_existing
    from public.wallet_transactions
    where idempotency_key = p_idempotency_key
    for update;

  if not found
     or v_existing.user_id is distinct from p_user_id
     or v_existing.kind is distinct from p_kind
     or v_existing.amount is distinct from p_amount
     or v_existing.direction is distinct from p_direction
     or v_existing.reference is distinct from p_reference then
    raise exception 'idempotency key already used for a different transaction' using errcode = '23505';
  end if;

  return v_existing.id;
end;
$$;

revoke all on function public.post_wallet_transaction(uuid,text,text,numeric,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.post_wallet_transaction(uuid,text,text,numeric,text,text,jsonb) to service_role;
