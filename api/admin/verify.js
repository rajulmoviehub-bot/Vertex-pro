export const config = { runtime: "nodejs" };

function getBearerToken(req) {
  const value = req.headers.authorization || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const accessToken = getBearerToken(req);

  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ ok: false, error: "Secure admin verification is not configured" });
  }
  if (!accessToken || accessToken.length > 8192) {
    return res.status(401).json({ ok: false, error: "Sign in is required" });
  }

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    });

    if (!userResponse.ok) {
      return res.status(401).json({ ok: false, error: "Session is invalid or expired" });
    }

    const authUser = await userResponse.json();
    if (!authUser?.id) {
      return res.status(401).json({ ok: false, error: "Could not verify signed-in user" });
    }

    // The explicitly designated platform owner is the only account granted admin access.
    const ownerEmail = "rajulmoviehub@gmail.com";
    const signedInEmail = String(authUser.email || "").trim().toLowerCase();
    const emailVerified = Boolean(authUser.email_confirmed_at || authUser.confirmed_at);
    if (signedInEmail === ownerEmail && emailVerified) {
      return res.status(200).json({
        ok: true,
        userId: authUser.id,
        role: "admin",
        owner: true
      });
    }

    // Every account other than the verified owner is always a customer.
    return res.status(403).json({
      ok: false,
      userId: authUser.id,
      role: "customer",
      error: "Admin access is restricted to the verified platform owner"
    });
  } catch {
    return res.status(502).json({ ok: false, error: "Could not verify admin access" });
  }
}
