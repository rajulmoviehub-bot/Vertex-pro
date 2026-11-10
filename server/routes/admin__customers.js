export const config = { runtime: "nodejs" };

const OWNER_EMAIL = "rajulmoviehub@gmail.com";
const bearer = req => String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
const cleanEmail = value => String(value || "").trim().toLowerCase();

async function authenticateOwner(req) {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = bearer(req);
  if (!url || !key) return { error: "Customer directory service is not configured.", status: 503 };
  if (!token || token.length > 8192) return { error: "Sign in as the owner first.", status: 401 };
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!response.ok) return { error: "Admin session is invalid or expired.", status: 401 };
  const user = await response.json();
  if (cleanEmail(user.email) !== OWNER_EMAIL || !(user.email_confirmed_at || user.confirmed_at)) {
    return { error: "Only the verified VERTEX owner can view customer contact details.", status: 403 };
  }
  return { url, key };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await authenticateOwner(req);
    if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });

    const customers = [];
    for (let page = 1; page <= 20; page++) {
      const response = await fetch(`${auth.url}/auth/v1/admin/users?page=${page}&per_page=100`, {
        headers: { apikey: auth.key, Authorization: `Bearer ${auth.key}` },
        cache: "no-store"
      });
      if (!response.ok) return res.status(502).json({ ok: false, error: "Could not load registered customer accounts." });
      const payload = await response.json();
      const users = Array.isArray(payload.users) ? payload.users : [];
      for (const item of users) {
        const email = String(item.email || "").trim();
        if (!email || cleanEmail(email) === OWNER_EMAIL) continue;
        const phone = String(item.user_metadata?.mobile_number || item.user_metadata?.phone || item.phone || "").trim();
        customers.push({ id: item.id, email, phone });
      }
      if (users.length < 100) break;
    }

    return res.status(200).json({ ok: true, count: customers.length, customers });
  } catch (error) {
    console.error("VERTEX customer directory failed:", error?.message || "unknown");
    return res.status(502).json({ ok: false, error: "Customer directory is temporarily unavailable." });
  }
}
