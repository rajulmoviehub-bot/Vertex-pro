export const config = { runtime: "nodejs" };

const OWNER_EMAIL = "rajulmoviehub@gmail.com";

function bearer(req) {
  return String(req.headers.authorization || "").match(/^Bearer\\s+(.+)$/i)?.[1]?.trim() || "";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok:false, error:"Method not allowed" });
  }

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = bearer(req);
  if (!url || !serviceKey) return res.status(503).json({ ok:false, error:"Secure admin verification is not configured." });
  if (!token || token.length > 8192) return res.status(401).json({ ok:false, error:"Sign in as the owner first." });

  try {
    const auth = await fetch(`${url}/auth/v1/user`, {
      headers:{ apikey:serviceKey, Authorization:`Bearer ${token}` }, cache:"no-store"
    });
    if (!auth.ok) return res.status(401).json({ ok:false, error:"Admin session is invalid or expired." });
    const user = await auth.json();
    if (String(user.email || "").trim().toLowerCase() !== OWNER_EMAIL || !(user.email_confirmed_at || user.confirmed_at)) {
      return res.status(403).json({ ok:false, error:"Only the verified VELTEX owner can run this check." });
    }

    const environment = String(process.env.MPESA_ENV || "").trim().toLowerCase();
    if (environment !== "production" && environment !== "sandbox") {
      return res.status(503).json({ ok:false, environment:"invalid", error:"MPESA_ENV must be exactly production or sandbox." });
    }
    const key = process.env.MPESA_CONSUMER_KEY;
    const secret = process.env.MPESA_CONSUMER_SECRET;
    if (!key || !secret) return res.status(503).json({ ok:false, environment, error:"Daraja Consumer Key or Consumer Secret is missing." });

    const host = environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
    const response = await fetch(`${host}/oauth/v1/generate?grant_type=client_credentials`, {
      headers:{ Authorization:"Basic " + Buffer.from(`${key}:${secret}`).toString("base64") },
      cache:"no-store",
      signal:AbortSignal.timeout(10000)
    });
    const raw = await response.text().catch(()=>"");
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch {}
    if (!response.ok || !data.access_token) {
      const safeReason = [data.errorMessage, data.error_description, data.error, data.errorCode].filter(Boolean).join(" | ");
      console.error("VELTEX admin Daraja OAuth diagnostic failed:", { environment, status:response.status, reason:safeReason || "No error detail" });
      return res.status(502).json({
        ok:false, environment, httpStatus:response.status,
        error:safeReason || (environment === "production"
          ? "Production OAuth rejected the credentials. Confirm the key and secret belong to the same approved Production Daraja app with the required product enabled."
          : "Sandbox OAuth rejected the credentials. Confirm the key and secret belong to the same Sandbox Daraja app.")
      });
    }
    return res.status(200).json({ ok:true, environment, message:`Daraja ${environment} OAuth succeeded. No STK Push was sent and no money was requested.` });
  } catch (error) {
    console.error("VELTEX admin Daraja OAuth diagnostic unavailable:", error?.message || "network error");
    return res.status(502).json({ ok:false, error:"Could not reach Safaricom OAuth. Check Vercel runtime logs and try again." });
  }
}
