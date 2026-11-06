-- Allow signed-in customers to create only their own pending M-Pesa deposit request.
-- The server still performs all provider calls and payment confirmation.
drop policy if exists "deposits_insert_own_pending_mpesa" on public.deposit_requests;
create policy "deposits_insert_own_pending_mpesa"
on public.deposit_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and provider = 'safaricom_daraja_stk'
  and amount > 0
  and currency = 'USD'
);
