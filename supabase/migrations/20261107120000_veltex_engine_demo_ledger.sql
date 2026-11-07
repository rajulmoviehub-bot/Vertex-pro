-- VELTEX proprietary engine foundation (DEMO only).
-- This migration deliberately does not debit customer cash wallets or enable real-money trading.
create table if not exists public.veltex_demo_trades (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  market_symbol text not null default 'VELTEX-SIM-1',
  contract text not null check (contract in ('EVEN','ODD')),
  stake numeric(20,8) not null check (stake > 0 and stake <= 10000),
  duration_ticks integer not null check (duration_ticks between 1 and 100),
  entry_sequence bigint not null check (entry_sequence >= 0),
  exit_sequence bigint,
  entry_digit smallint check (entry_digit between 0 and 9),
  exit_digit smallint check (exit_digit between 0 and 9),
  virtual_payout numeric(20,8) not null default 0 check (virtual_payout >= 0),
  status text not null default 'open' check (status in ('open','won','lost','cancelled')),
  opened_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint veltex_demo_trade_settlement_check check (
    (status = 'open' and exit_sequence is null and exit_digit is null and settled_at is null)
    or
    (status <> 'open' and exit_sequence is not null and exit_digit between 0 and 9 and settled_at is not null)
  )
);
create index if not exists veltex_demo_trades_user_opened_idx
  on public.veltex_demo_trades(user_id, opened_at desc);
create index if not exists veltex_demo_trades_open_idx
  on public.veltex_demo_trades(status, opened_at) where status = 'open';

alter table public.veltex_demo_trades enable row level security;
drop policy if exists veltex_demo_trades_select_self on public.veltex_demo_trades;
create policy veltex_demo_trades_select_self
  on public.veltex_demo_trades for select to authenticated
  using (user_id = auth.uid());

create or replace function public.veltex_open_demo_trade(
  p_trade_id uuid,
  p_user_id uuid,
  p_contract text,
  p_stake numeric,
  p_duration_ticks integer,
  p_entry_sequence bigint,
  p_entry_digit smallint
) returns public.veltex_demo_trades
language plpgsql security definer set search_path = public
as $$
declare
  v_trade public.veltex_demo_trades%rowtype;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'server authorization required' using errcode = '42501';
  end if;
  if p_trade_id is null or p_user_id is null then raise exception 'trade and user are required'; end if;
  if p_contract not in ('EVEN','ODD') then raise exception 'invalid contract'; end if;
  if p_stake is null or p_stake <= 0 or p_stake > 10000 then raise exception 'invalid demo stake'; end if;
  if p_duration_ticks is null or p_duration_ticks < 1 or p_duration_ticks > 100 then raise exception 'invalid duration'; end if;
  if p_entry_sequence is null or p_entry_sequence < 0 or p_entry_digit not between 0 and 9 then raise exception 'invalid entry tick'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'customer not found'; end if;

  insert into public.veltex_demo_trades(
    id,user_id,contract,stake,duration_ticks,entry_sequence,entry_digit
  ) values (
    p_trade_id,p_user_id,p_contract,p_stake,p_duration_ticks,p_entry_sequence,p_entry_digit
  ) returning * into v_trade;
  return v_trade;
exception when unique_violation then
  select * into v_trade from public.veltex_demo_trades where id = p_trade_id;
  if v_trade.id is not null and v_trade.user_id = p_user_id
     and v_trade.contract = p_contract and v_trade.stake = p_stake
     and v_trade.duration_ticks = p_duration_ticks
     and v_trade.entry_sequence = p_entry_sequence then
    return v_trade;
  end if;
  raise exception 'trade id already used for a different request' using errcode = '23505';
end;
$$;

create or replace function public.veltex_settle_demo_trade(
  p_trade_id uuid,
  p_exit_sequence bigint,
  p_exit_digit smallint
) returns public.veltex_demo_trades
language plpgsql security definer set search_path = public
as $$
declare
  v_trade public.veltex_demo_trades%rowtype;
  v_won boolean;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'server authorization required' using errcode = '42501';
  end if;
  if p_trade_id is null or p_exit_sequence is null or p_exit_digit not between 0 and 9 then
    raise exception 'valid settlement tick is required';
  end if;
  select * into v_trade from public.veltex_demo_trades where id = p_trade_id for update;
  if not found then raise exception 'trade not found'; end if;
  if v_trade.status <> 'open' then return v_trade; end if;
  if p_exit_sequence < v_trade.entry_sequence + v_trade.duration_ticks then
    raise exception 'trade duration has not elapsed';
  end if;

  v_won := (p_exit_digit % 2 = 0 and v_trade.contract = 'EVEN')
        or (p_exit_digit % 2 = 1 and v_trade.contract = 'ODD');

  update public.veltex_demo_trades
    set exit_sequence = p_exit_sequence,
        exit_digit = p_exit_digit,
        status = case when v_won then 'won' else 'lost' end,
        virtual_payout = case when v_won then round(v_trade.stake * 1.95, 8) else 0 end,
        settled_at = now()
    where id = p_trade_id
    returning * into v_trade;
  return v_trade;
end;
$$;

revoke all on function public.veltex_open_demo_trade(uuid,uuid,text,numeric,integer,bigint,smallint) from public, anon, authenticated;
grant execute on function public.veltex_open_demo_trade(uuid,uuid,text,numeric,integer,bigint,smallint) to service_role;
revoke all on function public.veltex_settle_demo_trade(uuid,bigint,smallint) from public, anon, authenticated;
grant execute on function public.veltex_settle_demo_trade(uuid,bigint,smallint) to service_role;
