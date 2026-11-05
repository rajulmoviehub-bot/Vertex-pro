-- Daraja STK Push deposit tracking for VELTEX.
alter table public.deposit_requests
  add column if not exists amount_kes numeric(18,2),
  add column if not exists phone_number text,
  add column if not exists merchant_request_id text,
  add column if not exists checkout_request_id text,
  add column if not exists mpesa_receipt_number text,
  add column if not exists result_description text;

create unique index if not exists deposit_requests_checkout_request_id_uidx
  on public.deposit_requests(checkout_request_id)
  where checkout_request_id is not null;

create index if not exists deposit_requests_status_created_idx
  on public.deposit_requests(status, created_at desc);
