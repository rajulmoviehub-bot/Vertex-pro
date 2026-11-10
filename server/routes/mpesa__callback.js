export const config = { runtime: "nodejs" };

// Retired legacy callback route.
// All current Daraja STK requests use the tokenized
// /api/payments/callback/[token] endpoint, which performs strict
// callback-token, pending-status, amount, phone, receipt and idempotency checks.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Allow", "POST");
  return res.status(410).json({
    ok: false,
    error: "This legacy callback endpoint is retired. Use the configured VERTEX payment callback URL."
  });
}
