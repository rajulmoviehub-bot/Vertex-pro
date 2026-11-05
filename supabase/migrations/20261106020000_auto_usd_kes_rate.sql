-- Store the exact FX rate used for each M-Pesa deposit and cache the provider's daily USD/KES reference rate.
alter table public.deposit_requests
  add column if not exists exchange_rate_kes_per_usd numeric(18,8),
  add column if not exists exchange_rate_updated_at timestamptz;

create table if not exists public.veltex_exchange_rates (
  base_currency text not null,
  quote_currency text not null,
  rate numeric(18,8) not null check (rate > 0),
  provider_updated_at timestamptz not null,
  next_update_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  primary key (base_currency, quote_currency)
);

alter table public.veltex_exchange_rates enable row level security;
revoke all on table public.veltex_exchange_rates from anon, authenticated;
grant select, insert, update, delete on table public.veltex_exchange_rates to service_role;
