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

    const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
    profileUrl.searchParams.set("select", "role");
    profileUrl.searchParams.set("id", `eq.${authUser.id}`);
    profileUrl.searchParams.set("limit", "1");

    const profileResponse = await fetch(profileUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      },
      cache: "no-store"
    });

    if (!profileResponse.ok) {
      return res.status(503).json({ ok: false, error: "Admin role table is unavailable" });
    }

    const profiles = await profileResponse.json();
    const isAdmin = Array.isArray(profiles) && profiles[0]?.role === "admin";
    return res.status(isAdmin ? 200 : 403).json({
      ok: isAdmin,
      userId: authUser.id,
      role: isAdmin ? "admin" : "customer",
      error: isAdmin ? undefined : "Admin access is not assigned to this account"
    });
  } catch {
    return res.status(502).json({ ok: false, error: "Could not verify admin access" });
  }
}
