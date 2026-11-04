-- VELTEX Pro core ledger foundation.
-- Apply in Supabase SQL Editor. This does NOT enable live-money trading or payments.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete restrict,
  currency text not null default 'USD',
  available_balance numeric(20,8) not null default 0 check (available_balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null unique,
  kind text not null check (kind in ('deposit','withdrawal','trade_stake','trade_payout','adjustment','refund')),
  amount numeric(20,8) not null check (amount > 0),
  direction text not null check (direction in ('credit','debit')),
  status text not null default 'posted' check (status in ('pending','posted','reversed','rejected')),
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists wallet_transactions_user_created_idx
  on public.wallet_transactions(user_id, created_at desc);

create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null,
  provider_reference text unique,
  amount numeric(20,8) not null check (amount > 0),
  currency text not null default 'KES',
  status text not null default 'pending' check (status in ('pending','confirmed','failed','cancelled')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(20,8) not null check (amount > 0),
  currency text not null default 'USD',
  destination_masked text,
  status text not null default 'pending' check (status in ('pending','approved','processing','paid','rejected','failed')),
  reviewed_by uuid references public.profiles(id),
  provider_reference text unique,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  instrument text not null,
  direction text not null check (direction in ('up','down')),
  stake numeric(20,8) not null check (stake > 0),
  entry_price numeric(24,12) not null,
  exit_price numeric(24,12),
  payout numeric(20,8) not null default 0,
  status text not null default 'open' check (status in ('open','won','lost','void')),
  price_source text not null,
  opened_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists trades_user_opened_idx on public.trades(user_id, opened_at desc);

-- Profile and zero-balance wallet are created after verified Supabase Auth signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,email) values (new.id,new.email)
  on conflict (id) do nothing;
  insert into public.wallets(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_veltex on auth.users;
create trigger on_auth_user_created_veltex
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- All money movement must go through this server-only function.
create or replace function public.post_wallet_transaction(
  p_user_id uuid,
  p_idempotency_key text,
  p_kind text,
  p_amount numeric,
  p_direction text,
  p_reference text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
  v_balance numeric(20,8);
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'server authorization required' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  if p_direction not in ('credit','debit') then raise exception 'invalid direction'; end if;
  perform 1 from public.wallets where user_id = p_user_id for update;
  if not found then raise exception 'wallet not found'; end if;
  select available_balance into v_balance from public.wallets where user_id = p_user_id;
  if p_direction = 'debit' and v_balance < p_amount then
    raise exception 'insufficient funds';
  end if;
  insert into public.wallet_transactions(user_id,idempotency_key,kind,amount,direction,reference,metadata)
  values (p_user_id,p_idempotency_key,p_kind,p_amount,p_direction,p_reference,coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  update public.wallets
    set available_balance = available_balance + case when p_direction='credit' then p_amount else -p_amount end,
        updated_at = now()
    where user_id = p_user_id;
  return v_id;
exception when unique_violation then
  select id into v_id from public.wallet_transactions where idempotency_key = p_idempotency_key;
  if v_id is not null then return v_id; end if;
  raise;
end;
$$;

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.trades enable row level security;

-- Customers can read their own records only. Writes are deliberately server-only.
create policy "profile_select_self" on public.profiles for select to authenticated using (id = auth.uid());
create policy "wallet_select_self" on public.wallets for select to authenticated using (user_id = auth.uid());
create policy "transactions_select_self" on public.wallet_transactions for select to authenticated using (user_id = auth.uid());
create policy "deposits_select_self" on public.deposit_requests for select to authenticated using (user_id = auth.uid());
create policy "withdrawals_select_self" on public.withdrawal_requests for select to authenticated using (user_id = auth.uid());
create policy "trades_select_self" on public.trades for select to authenticated using (user_id = auth.uid());

revoke all on public.wallet_transactions from anon, authenticated;
grant select on public.wallet_transactions to authenticated;
revoke all on function public.post_wallet_transaction(uuid,text,text,numeric,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.post_wallet_transaction(uuid,text,text,numeric,text,text,jsonb) to service_role;
