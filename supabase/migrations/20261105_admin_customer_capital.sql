-- VELTEX owner-authorized customer capital credits.
-- Apply in Supabase SQL Editor before using Admin > Add Customer Capital.

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_balance numeric(18,2) not null default 0 check (available_balance >= 0),
  updated_at timestamptz not null default now()
);

create unique index if not exists wallets_user_id_unique on public.wallets(user_id);

create table if not exists public.wallet_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(18,2) not null,
  transaction_type text not null,
  description text not null,
  created_by_email text not null,
  created_at timestamptz not null default now()
);

create or replace function public.admin_credit_wallet(
  p_customer_email text,
  p_amount numeric,
  p_admin_email text
)
returns table(available_balance numeric)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_balance numeric(18,2);
begin
  if auth.role() <> 'service_role' then
    raise exception 'Not authorized';
  end if;
  if lower(trim(p_admin_email)) <> 'rajulmoviehub@gmail.com' then
    raise exception 'Not authorized';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then
    raise exception 'Invalid capital amount';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_customer_email))
  limit 1;

  if v_user_id is null then
    raise exception 'No registered customer found with that email';
  end if;

  insert into public.wallets(user_id, available_balance, updated_at)
  values (v_user_id, p_amount, now())
  on conflict (user_id) do update
    set available_balance = public.wallets.available_balance + excluded.available_balance,
        updated_at = now()
  returning public.wallets.available_balance into v_balance;

  insert into public.wallet_transactions(user_id, amount, transaction_type, description, created_by_email)
  values (v_user_id, p_amount, 'ADMIN_CREDIT', 'Capital added by VELTEX owner', lower(trim(p_admin_email)));

  return query select v_balance;
end;
$$;

revoke all on function public.admin_credit_wallet(text, numeric, text) from public, anon, authenticated;
grant execute on function public.admin_credit_wallet(text, numeric, text) to service_role;

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "Customers can read own wallet" on public.wallets;
create policy "Customers can read own wallet" on public.wallets
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Customers can read own wallet transactions" on public.wallet_transactions;
create policy "Customers can read own wallet transactions" on public.wallet_transactions
  for select to authenticated using (auth.uid() = user_id);
