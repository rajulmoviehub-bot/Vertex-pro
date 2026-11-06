export const config = { runtime: "nodejs" };

const OWNER_EMAIL = "rajulmoviehub@gmail.com";
const json = (res, status, body) => res.status(status).json(body);
const bearer = (req) => String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok:false, error:"Method not allowed" });
  }

  const mode = new URL(req.url, "https://vertexpromax.vercel.app").searchParams.get("check");
  if (!["oauth", "preflight"].includes(mode)) return json(res, 400, { ok:false, error:"Specify check=oauth or check=preflight." });

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = bearer(req);
  if (!supabaseUrl || !serviceKey) return json(res, 503, { ok:false, error:"Secure admin verification is not configured." });
  if (!token || token.length > 8192) return json(res, 401, { ok:false, error:"Sign in as the owner first." });

  try {
    const auth = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers:{ apikey:serviceKey, Authorization:`Bearer ${token}` },
      cache:"no-store", signal:AbortSignal.timeout(10000)
    });
    if (!auth.ok) return json(res, 401, { ok:false, error:"Admin session is invalid or expired." });
    const user = await auth.json();
    if (String(user.email || "").trim().toLowerCase() !== OWNER_EMAIL || !(user.email_confirmed_at || user.confirmed_at)) {
      return json(res, 403, { ok:false, error:"Only the verified VELTEX owner can run this check." });
    }

    const environment = String(process.env.MPESA_ENV || "").trim().toLowerCase();
    if (environment !== "production" && environment !== "sandbox") return json(res, 503, { ok:false, environment:"invalid", error:"MPESA_ENV must be exactly production or sandbox." });
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    if (!consumerKey || !consumerSecret) return json(res, 503, { ok:false, environment, error:"Daraja Consumer Key or Consumer Secret is missing." });
    const host = environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

    if (mode === "oauth") {
      const response = await fetch(`${host}/oauth/v1/generate?grant_type=client_credentials`, {
        headers:{ Authorization:"Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64") },
        cache:"no-store", signal:AbortSignal.timeout(10000)
      });
      const raw = await response.text().catch(()=>"");
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}
      if (!response.ok || !data.access_token) {
        const reason = [data.errorMessage, data.error_description, data.error, data.errorCode].filter(Boolean).join(" | ");
        console.error("VELTEX Daraja OAuth check failed:", { environment, status:response.status, reason:reason || "No detail" });
        return json(res, 502, { ok:false, environment, httpStatus:response.status, error:reason || "Daraja OAuth failed. Check the matching environment credentials." });
      }
      return json(res, 200, { ok:true, environment, message:`Daraja ${environment} OAuth succeeded. No STK Push was sent and no money was requested.` });
    }

    const shortcode = String(process.env.MPESA_SHORTCODE || "").trim();
    const transactionType = String(process.env.MPESA_TRANSACTION_TYPE || "CustomerBuyGoodsOnline").trim();
    const callbackToken = String(process.env.MPESA_CALLBACK_TOKEN || "");
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = `https://vertexpromax.vercel.app/api/payments/callback/${encodeURIComponent(callbackToken)}`;
    const checks = {
      environment:true,
      shortcode_present_and_numeric:/^\d{5,7}$/.test(shortcode),
      transaction_type_supported:["CustomerBuyGoodsOnline","CustomerPayBillOnline"].includes(transactionType),
      consumer_key_present:Boolean(consumerKey),
      consumer_secret_present:Boolean(consumerSecret),
      passkey_present:Boolean(passkey),
      callback_token_present:callbackToken.length >= 24,
      service_role_key_present:Boolean(serviceKey),
      callback_url_https:callbackUrl.startsWith("https://")
    };
    const failed = Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
    if (failed.length) return json(res, 200, { ok:false, environment, transactionType, checks, failed, message:"Configuration preflight found missing or invalid settings. No STK request was sent." });

    const oauth = await fetch(`${host}/oauth/v1/generate?grant_type=client_credentials`, {
      headers:{ Authorization:"Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64") },
      cache:"no-store", signal:AbortSignal.timeout(10000)
    });
    const raw = await oauth.text().catch(()=>"");
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch {}
    checks.oauth_connection = oauth.ok && Boolean(data.access_token);
    if (!checks.oauth_connection) {
      const reason = [data.errorMessage,data.error_description,data.error,data.errorCode].filter(Boolean).join(" | ");
      console.error("VELTEX STK preflight OAuth failed:", { environment, status:oauth.status, reason:reason || "No detail" });
      return json(res, 200, { ok:false, environment, transactionType, checks, failed:["oauth_connection"], message:reason || `Daraja ${environment} OAuth failed (HTTP ${oauth.status}). No STK request was sent.` });
    }
    const timestamp = new Date().toISOString().replace(/[^0-9]/g,"").slice(0,14);
    checks.stk_password_constructible = Boolean(Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64") && timestamp.length === 14);
    return json(res, 200, {
      ok:true, environment, transactionType, checks,
      limitations:[
        "No STK Push was sent and no customer was charged.",
        "Shortcode ownership, Passkey validity, and live STK acceptance cannot be proven without a real STK request.",
        "Callback URL configuration was checked only; no callback was simulated and no wallet was credited."
      ],
      message:"Preflight passed. This confirms configuration presence and OAuth only, not a completed M-Pesa payment."
    });
  } catch (error) {
    console.error("VELTEX M-Pesa admin check failed:", error?.message || "unknown error");
    return json(res, 502, { ok:false, error:"M-Pesa check could not complete. Check Vercel runtime logs. No STK request was sent." });
  }
}