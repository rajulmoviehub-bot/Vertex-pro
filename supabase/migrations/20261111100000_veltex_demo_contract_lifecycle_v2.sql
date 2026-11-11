-- VELTEX demo contract lifecycle v2.
-- Server-only demo records; no customer cash wallet access or live order execution.
alter table public.veltex_demo_trades
  add column if not exists entry_price numeric(24,12),
  add column if not exists exit_price numeric(24,12),
  add column if not exists engine_version text not null default '1.1.0';

create table if not exists public.veltex_demo_contract_events (
  id bigint generated always as identity primary key,
  trade_id uuid not null references public.veltex_demo_trades(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('OPENED','SETTLED')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists veltex_demo_contract_events_trade_idx
  on public.veltex_demo_contract_events(trade_id, created_at);
create index if not exists veltex_demo_contract_events_user_idx
  on public.veltex_demo_contract_events(user_id, created_at desc);
alter table public.veltex_demo_contract_events enable row level security;
revoke all on public.veltex_demo_contract_events from public, anon, authenticated;
grant select, insert on public.veltex_demo_contract_events to service_role;
grant usage, select on sequence public.veltex_demo_contract_events_id_seq to service_role;

create or replace function public.veltex_open_demo_contract(
  p_trade_id uuid,
  p_user_id uuid,
  p_contract text,
  p_stake numeric,
  p_duration_ticks integer,
  p_entry_sequence bigint,
  p_entry_digit smallint,
  p_entry_price numeric
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
  if p_stake is null or p_stake <= 0 or p_stake > 10000 then raise exception 'demo stake exceeds configured limit'; end if;
  if p_duration_ticks is null or p_duration_ticks < 1 or p_duration_ticks > 100 then raise exception 'invalid duration'; end if;
  if p_entry_sequence is null or p_entry_sequence < 0 or p_entry_digit not between 0 and 9
     or p_entry_price is null or p_entry_price <= 0 then raise exception 'invalid entry quote'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'customer not found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if exists (select 1 from public.veltex_demo_trades where user_id = p_user_id and status = 'open') then
    raise exception 'An open demo contract already exists for this account.' using errcode = '23505';
  end if;

  insert into public.veltex_demo_trades(
    id,user_id,contract,stake,duration_ticks,entry_sequence,entry_digit,entry_price,engine_version
  ) values (
    p_trade_id,p_user_id,p_contract,p_stake,p_duration_ticks,p_entry_sequence,p_entry_digit,p_entry_price,'1.1.0'
  ) returning * into v_trade;

  insert into public.veltex_demo_contract_events(trade_id,user_id,event_type,details)
  values (v_trade.id,v_trade.user_id,'OPENED',jsonb_build_object(
    'contract',v_trade.contract,'stake',v_trade.stake,'duration_ticks',v_trade.duration_ticks,
    'entry_sequence',v_trade.entry_sequence,'entry_digit',v_trade.entry_digit,
    'entry_price',v_trade.entry_price,'market_symbol',v_trade.market_symbol,'engine_version',v_trade.engine_version
  ));
  return v_trade;
end;
$$;

create or replace function public.veltex_settle_demo_contract(
  p_trade_id uuid,
  p_exit_sequence bigint,
  p_exit_digit smallint,
  p_exit_price numeric
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
  if p_trade_id is null or p_exit_sequence is null or p_exit_digit not between 0 and 9
     or p_exit_price is null or p_exit_price <= 0 then
    raise exception 'valid settlement quote is required';
  end if;
  select * into v_trade from public.veltex_demo_trades where id = p_trade_id for update;
  if not found then raise exception 'trade not found'; end if;
  if v_trade.status <> 'open' then return v_trade; end if;
  if p_exit_sequence < v_trade.entry_sequence + v_trade.duration_ticks then
    raise exception 'contract duration has not elapsed';
  end if;

  v_won := (p_exit_digit % 2 = 0 and v_trade.contract = 'EVEN')
        or (p_exit_digit % 2 = 1 and v_trade.contract = 'ODD');

  update public.veltex_demo_trades
    set exit_sequence = p_exit_sequence,
        exit_digit = p_exit_digit,
        exit_price = p_exit_price,
        status = case when v_won then 'won' else 'lost' end,
        virtual_payout = case when v_won then round(v_trade.stake * 1.95, 8) else 0 end,
        settled_at = now()
    where id = p_trade_id
    returning * into v_trade;

  insert into public.veltex_demo_contract_events(trade_id,user_id,event_type,details)
  values (v_trade.id,v_trade.user_id,'SETTLED',jsonb_build_object(
    'status',v_trade.status,'exit_sequence',v_trade.exit_sequence,
    'exit_digit',v_trade.exit_digit,'exit_price',v_trade.exit_price,
    'virtual_payout',v_trade.virtual_payout,'settled_at',v_trade.settled_at,
    'engine_version',v_trade.engine_version
  ));
  return v_trade;
end;
$$;

revoke all on function public.veltex_open_demo_contract(uuid,uuid,text,numeric,integer,bigint,smallint,numeric) from public, anon, authenticated;
grant execute on function public.veltex_open_demo_contract(uuid,uuid,text,numeric,integer,bigint,smallint,numeric) to service_role;
revoke all on function public.veltex_settle_demo_contract(uuid,bigint,smallint,numeric) from public, anon, authenticated;
grant execute on function public.veltex_settle_demo_contract(uuid,bigint,smallint,numeric) to service_role;
