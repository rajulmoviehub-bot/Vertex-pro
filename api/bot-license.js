export const config = { runtime: "nodejs" };
const OWNER_EMAIL = "rajulmoviehub@gmail.com";
const bearer = req => String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
const cleanEmail = value => String(value || "").trim().toLowerCase();
const phoneDigits = value => String(value || "").replace(/\D/g, "").replace(/^0/, "254");
async function authenticate(req, requireOwner = false) {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = bearer(req);
  if (!url || !key) return { error: "Bot licence service is not configured.", status: 503 };
  if (!token || token.length > 8192) return { error: "Sign in first.", status: 401 };
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) return { error: "Session is invalid or expired.", status: 401 };
  const user = await response.json();
  if (!user?.id) return { error: "Could not verify account.", status: 401 };
  if (requireOwner && (cleanEmail(user.email) !== OWNER_EMAIL || !(user.email_confirmed_at || user.confirmed_at))) return { error: "Only the verified VELTEX owner can manage bot licences.", status: 403 };
  return { url, key, user };
}
async function listAuthUsers(url, key, wantedEmail) {
  for (let page = 1; page <= 20; page++) {
    const response = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=100`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!response.ok) throw new Error("Could not search registered VELTEX accounts.");
    const data = await response.json();
    const users = Array.isArray(data.users) ? data.users : [];
    const found = users.find(item => cleanEmail(item.email) === wantedEmail);
    if (found) return found;
    if (users.length < 100) break;
  }
  return null;
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Method not allowed" }); }
  try {
    const auth = await authenticate(req, req.method === "POST" || req.query?.admin === "1");
    if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
    const { url, key, user } = auth;
    if (req.method === "GET" && req.query?.admin !== "1") {
      const response = await fetch(`${url}/rest/v1/bot_licenses?user_id=eq.${encodeURIComponent(user.id)}&select=status,activated_at,revoked_at&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
      const rows = await response.json().catch(() => []);
      if (!response.ok) return res.status(503).json({ ok: false, error: "Could not check your bot licence. Apply the licence database migration first." });
      return res.status(200).json({ ok: true, licence: rows[0] || null });
    }
    if (req.method === "GET") {
      const response = await fetch(`${url}/rest/v1/bot_licenses?select=user_id,customer_email,mobile_number,status,activated_at,revoked_at&order=activated_at.desc&limit=200`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
      const rows = await response.json().catch(() => []);
      if (!response.ok) return res.status(502).json({ ok: false, error: "Could not load bot licences." });
      return res.status(200).json({ ok: true, licences: rows });
    }
    const action = String(req.body?.action || "");
    const email = cleanEmail(req.body?.email);
    const phone = phoneDigits(req.body?.mobileNumber);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^254[71]\d{8}$/.test(phone)) return res.status(400).json({ ok: false, error: "Enter the buyer's registered VELTEX email and mobile number." });
    const buyer = await listAuthUsers(url, key, email);
    if (!buyer) return res.status(404).json({ ok: false, error: "No VELTEX account found for that email." });
    const registeredPhone = phoneDigits(buyer.user_metadata?.mobile_number || buyer.user_metadata?.phone || buyer.phone || "");
    if (registeredPhone && registeredPhone !== phone) return res.status(409).json({ ok: false, error: "The mobile number does not match the number saved on that VELTEX account." });
    if (!(buyer.email_confirmed_at || buyer.confirmed_at)) return res.status(409).json({ ok: false, error: "The buyer must verify their email before activation." });
    if (action === "activate") {
      if (!registeredPhone) {
        const metadataResponse = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(buyer.id)}`, {
          method: "PUT",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ user_metadata: { ...(buyer.user_metadata || {}), mobile_number: phone } }),
          cache: "no-store"
        });
        if (!metadataResponse.ok) return res.status(502).json({ ok: false, error: "Could not save this mobile number to the buyer account. No licence was activated." });
      }
      const response = await fetch(`${url}/rest/v1/bot_licenses?on_conflict=user_id`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ user_id: buyer.id, customer_email: email, mobile_number: phone, status: "active", activated_at: new Date().toISOString(), activated_by: user.id, revoked_at: null, updated_at: new Date().toISOString() }),
        cache: "no-store"
      });
      const rows = await response.json().catch(() => []);
      if (!response.ok || !rows.length) return res.status(502).json({ ok: false, error: "Activation could not be saved. Confirm the bot licence migration is applied." });
      return res.status(200).json({ ok: true, message: "MV6 AUTO BOT licence activated for this VELTEX account only.", licence: rows[0] });
    }
    if (action === "revoke") {
      const response = await fetch(`${url}/rest/v1/bot_licenses?user_id=eq.${encodeURIComponent(buyer.id)}&status=eq.active`, {
        method: "PATCH",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
        cache: "no-store"
      });
      const rows = await response.json().catch(() => []);
      if (!response.ok) return res.status(502).json({ ok: false, error: "Could not revoke this licence." });
      if (!rows.length) return res.status(404).json({ ok: false, error: "No active licence found for this account." });
      return res.status(200).json({ ok: true, message: "Licence revoked. This account no longer has paid bot access." });
    }
    return res.status(400).json({ ok: false, error: "Unknown licence action." });
  } catch (error) {
    console.error("VELTEX bot licence error:", error?.message || "unknown");
    return res.status(502).json({ ok: false, error: "Bot licence service is temporarily unavailable." });
  }
}
