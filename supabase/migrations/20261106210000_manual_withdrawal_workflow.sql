-- VELTEX manual withdrawal workflow.
-- Requests reserve funds at submission. Rejections NEVER trigger an automatic refund.
-- The owner must use the separate manual-refund action after rejecting a request.

alter table public.withdrawal_requests
  add column if not exists payment_method text,
  add column if not exists destination_ciphertext text,
  add column if not exists refund_transaction_id uuid references public.wallet_transactions(id),
  add column if not exists refunded_at timestamptz;

create unique index if not exists withdrawal_requests_refund_transaction_uidx
  on public.withdrawal_requests(refund_transaction_id)
  where refund_transaction_id is not null;

create or replace function public.create_withdrawal_request(
  p_request_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_destination_masked text,
  p_destination_ciphertext text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'server authorization required' using errcode = '42501';
  end if;
  if p_request_id is null or p_user_id is null then raise exception 'request and user are required'; end if;
  if p_amount is null or p_amount < 5 or p_amount > 10000 then raise exception 'withdrawal amount must be between USD 5 and USD 10000'; end if;
  if p_payment_method is distinct from 'M-PESA' then raise exception 'payment method is not enabled'; end if;
  if coalesce(length(trim(p_destination_ciphertext)),0) < 20 then raise exception 'secure destination is required'; end if;

  -- Debit and request insertion occur in one database transaction.
  perform public.post_wallet_transaction(
    p_user_id,
    'withdrawal-request:' || p_request_id::text,
    'withdrawal',
    p_amount,
    'debit',
    p_request_id::text,
    jsonb_build_object('request_id',p_request_id,'payment_method',p_payment_method)
  );

  insert into public.withdrawal_requests(
    id,user_id,amount,currency,destination_masked,status,payment_method,destination_ciphertext
  ) values (
    p_request_id,p_user_id,p_amount,'USD',p_destination_masked,'pending',p_payment_method,p_destination_ciphertext
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.manual_refund_withdrawal(
  p_request_id uuid,
  p_admin_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_transaction_id uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'server authorization required' using errcode = '42501';
  end if;
  if p_request_id is null or p_admin_id is null then raise exception 'request and admin are required'; end if;

  select * into v_request
    from public.withdrawal_requests
    where id = p_request_id
    for update;

  if not found then raise exception 'withdrawal request not found'; end if;
  if v_request.status <> 'rejected' then raise exception 'only rejected requests can be manually refunded'; end if;
  if v_request.refund_transaction_id is not null or v_request.refunded_at is not null then
    raise exception 'this withdrawal has already been refunded';
  end if;

  v_transaction_id := public.post_wallet_transaction(
    v_request.user_id,
    'withdrawal-refund:' || v_request.id::text,
    'refund',
    v_request.amount,
    'credit',
    v_request.id::text,
    jsonb_build_object('withdrawal_request_id',v_request.id,'manual_refund',true,'refunded_by',p_admin_id)
  );

  update public.withdrawal_requests
    set refund_transaction_id = v_transaction_id,
        refunded_at = now()
    where id = v_request.id;

  return v_transaction_id;
end;
$$;

revoke all on function public.create_withdrawal_request(uuid,uuid,numeric,text,text,text) from public, anon, authenticated;
grant execute on function public.create_withdrawal_request(uuid,uuid,numeric,text,text,text) to service_role;
revoke all on function public.manual_refund_withdrawal(uuid,uuid) from public, anon, authenticated;
grant execute on function public.manual_refund_withdrawal(uuid,uuid) to service_role;
