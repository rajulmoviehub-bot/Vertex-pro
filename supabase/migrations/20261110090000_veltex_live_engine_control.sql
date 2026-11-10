-- VELTEX live-engine control plane.
-- Creates auditable readiness records only. It deliberately does NOT debit wallets,
-- accept real-money orders, settle trades, or enable live trading.
create table if not exists public.veltex_live_engine_control (
  id boolean primary key default true check (id = true),
  trading_enabled boolean not null default false check (trading_enabled = false),
  legal_authorization_verified boolean not null default false,
  independent_fairness_audit_verified boolean not null default false,
  market_rules_published boolean not null default false,
  custody_and_reconciliation_verified boolean not null default false,
  risk_controls_verified boolean not null default false,
  incident_and_dispute_process_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.veltex_live_engine_control(id) values (true)
on conflict (id) do nothing;

alter table public.veltex_live_engine_control enable row level security;
revoke all on public.veltex_live_engine_control from public, anon, authenticated;
grant select, insert, update on public.veltex_live_engine_control to service_role;

create table if not exists public.veltex_live_engine_audit (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('READINESS_REVIEW','CONTROL_CHANGE','ENGINE_HEALTH_CHECK')),
  actor text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists veltex_live_engine_audit_created_idx
  on public.veltex_live_engine_audit(created_at desc);
alter table public.veltex_live_engine_audit enable row level security;
revoke all on public.veltex_live_engine_audit from public, anon, authenticated;
grant select, insert on public.veltex_live_engine_audit to service_role;

-- No client-facing policy and no order/settlement function are created here.
-- A future activation requires a separately reviewed migration and legal sign-off.
