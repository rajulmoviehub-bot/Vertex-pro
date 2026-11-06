-- Account-bound MV6 AUTO BOT licences. Apply in Supabase SQL Editor.
create table if not exists public.bot_licenses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_email text not null,
  mobile_number text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  activated_at timestamptz not null default now(),
  activated_by uuid references auth.users(id),
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists bot_licenses_status_idx on public.bot_licenses(status, activated_at desc);
alter table public.bot_licenses enable row level security;
drop policy if exists bot_licenses_select_self on public.bot_licenses;
create policy bot_licenses_select_self on public.bot_licenses for select to authenticated using (user_id = auth.uid());
revoke all on public.bot_licenses from anon, authenticated;
grant select on public.bot_licenses to authenticated;
