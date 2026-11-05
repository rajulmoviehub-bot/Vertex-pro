export const config = { runtime: "nodejs" };

function bearer(req) {
  const match = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = bearer(req);
  if (!url || !serviceKey) return res.status(503).json({ ok: false, error: "Secure wallet admin is not configured on the server" });
  if (!token || token.length > 8192) return res.status(401).json({ ok: false, error: "Sign in as the owner first" });

  const email = String(req.body?.email || "").trim().toLowerCase();
  const amount = Number(req.body?.amount);
  if (!/^\S+@\S+\.\S+$/.test(email) || !Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    return res.status(400).json({ ok: false, error: "Enter a valid customer email and an amount up to $100,000" });
  }

  try {
    const auth = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (!auth.ok) return res.status(401).json({ ok: false, error: "Admin session is invalid or expired" });
    const admin = await auth.json();
    if (String(admin.email || "").trim().toLowerCase() !== "rajulmoviehub@gmail.com" || !(admin.email_confirmed_at || admin.confirmed_at)) {
      return res.status(403).json({ ok: false, error: "Only the verified VELTEX owner can add capital" });
    }

    const rpc = await fetch(`${url}/rest/v1/rpc/admin_credit_wallet`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_customer_email: email, p_amount: Number(amount.toFixed(2)), p_admin_email: String(admin.email).toLowerCase() }),
      cache: "no-store"
    });
    const result = await rpc.json().catch(() => ({}));
    if (!rpc.ok) return res.status(400).json({ ok: false, error: result.message || result.details || "Wallet credit failed. Apply the VELTEX wallet migration in Supabase first." });
    const row = Array.isArray(result) ? result[0] : result;
    return res.status(200).json({ ok: true, balance: Number(row?.available_balance || 0), customerEmail: email });
  } catch {
    return res.status(502).json({ ok: false, error: "Wallet service could not be reached" });
  }
}
