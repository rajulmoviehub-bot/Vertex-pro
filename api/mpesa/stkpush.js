export const config = { runtime: "nodejs" };

const json = (res, status, body) => res.status(status).json(body);
const bearer = req => String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
const digits = value => String(value || "").replace(/\D/g, "");
const phone254 = value => {
  let n = digits(value);
  if (n.startsWith("0")) n = "254" + n.slice(1);
  if (n.startsWith("7") || n.startsWith("1")) n = "254" + n;
  return /^254[71]\d{8}$/.test(n) ? n : "";
};

async function supabaseFetch(path, key, options = {}) {
  const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return fetch(base + path, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(options.headers || {}) },
    cache: "no-store"
  });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return json(res, 405, { ok:false, error:"Method not allowed" }); }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const passkey = process.env.MPESA_PASSKEY;
  const shortcode = process.env.MPESA_SHORTCODE;
  const callbackToken = process.env.MPESA_CALLBACK_TOKEN;
  const siteUrl = process.env.SITE_URL || "https://vertexpromax.vercel.app";
  const kesPerUsd = Number(process.env.VELTEX_KES_PER_USD);
  if (!supabaseUrl || !serviceKey || !consumerKey || !consumerSecret || !passkey || !shortcode || !callbackToken || !Number.isFinite(kesPerUsd) || kesPerUsd <= 0) {
    return json(res, 503, { ok:false, error:"M-Pesa is not configured. Required server environment variables are missing." });
  }

  const accessToken = bearer(req);
  if (!accessToken || accessToken.length > 8192) return json(res, 401, { ok:false, error:"Please sign in first." });
  const amountUsd = Number(req.body?.amountUsd);
  const phone = phone254(req.body?.phone);
  if (!phone || !Number.isFinite(amountUsd) || amountUsd < 5 || amountUsd > 10000) {
    return json(res, 400, { ok:false, error:"Enter a valid Kenyan M-Pesa number and deposit amount (USD 5–10,000)." });
  }
  const amountKes = Math.ceil(amountUsd * kesPerUsd);
  if (amountKes < 1 || amountKes > 250000) return json(res, 400, { ok:false, error:"The KES amount is outside the allowed STK Push limit." });

  try {
    const auth = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers:{ apikey:serviceKey, Authorization:`Bearer ${accessToken}` }, cache:"no-store"
    });
    if (!auth.ok) return json(res, 401, { ok:false, error:"Your session is invalid. Sign in again." });
    const user = await auth.json();
    if (!user?.id || !user.email_confirmed_at && !user.confirmed_at) return json(res, 403, { ok:false, error:"Verify your email before depositing." });

    const pending = await supabaseFetch("/rest/v1/deposit_requests", serviceKey, {
      method:"POST", headers:{ Prefer:"return=representation" },
      body:JSON.stringify([{ user_id:user.id, provider:"safaricom_daraja_stk", amount:amountUsd, currency:"USD", amount_kes:amountKes, phone_number:phone, status:"pending" }])
    });
    const pendingRows = await pending.json().catch(()=>[]);
    if (!pending.ok || !pendingRows[0]?.id) return json(res, 500, { ok:false, error:"Could not create a pending deposit record. Apply the VELTEX M-Pesa SQL migration first." });
    const depositId = pendingRows[0].id;

    const sandbox = String(process.env.MPESA_ENV || "sandbox").toLowerCase() !== "production";
    const apiBase = sandbox ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke";
    const tokenResponse = await fetch(`${apiBase}/oauth/v1/generate?grant_type=client_credentials`, {
      headers:{ Authorization:"Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64") }, cache:"no-store"
    });
    const tokenData = await tokenResponse.json().catch(()=>({}));
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error("Safaricom OAuth failed. Check Daraja app credentials and environment.");

    const timestamp = new Date().toISOString().replace(/[^0-9]/g,"").slice(0,14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
    const callbackUrl = `${siteUrl.replace(/\/$/,"")}/api/mpesa/callback?key=${encodeURIComponent(callbackToken)}`;
    const stkResponse = await fetch(`${apiBase}/mpesa/stkpush/v1/processrequest`, {
      method:"POST",
      headers:{ Authorization:`Bearer ${tokenData.access_token}`, "Content-Type":"application/json" },
      body:JSON.stringify({
        BusinessShortCode:shortcode,
        Password:password,
        Timestamp:timestamp,
        TransactionType:process.env.MPESA_TRANSACTION_TYPE || "CustomerBuyGoodsOnline",
        Amount:amountKes,
        PartyA:phone,
        PartyB:shortcode,
        PhoneNumber:phone,
        CallBackURL:callbackUrl,
        AccountReference:"VELTEX",
        TransactionDesc:"VELTEX wallet deposit"
      })
    });
    const stk = await stkResponse.json().catch(()=>({}));
    if (!stkResponse.ok || stk.ResponseCode !== "0" || !stk.CheckoutRequestID) {
      await supabaseFetch(`/rest/v1/deposit_requests?id=eq.${depositId}`, serviceKey, {
        method:"PATCH", body:JSON.stringify({ status:"failed", result_description:stk.errorMessage || stk.ResponseDescription || "STK request failed" })
      });
      return json(res, 502, { ok:false, error:stk.errorMessage || stk.ResponseDescription || "Safaricom rejected the STK Push request." });
    }

    await supabaseFetch(`/rest/v1/deposit_requests?id=eq.${depositId}`, serviceKey, {
      method:"PATCH", body:JSON.stringify({ merchant_request_id:stk.MerchantRequestID, checkout_request_id:stk.CheckoutRequestID })
    });
    return json(res, 200, { ok:true, message:"STK Push sent. Approve the payment prompt on your phone.", depositId, checkoutRequestId:stk.CheckoutRequestID, amountKes });
  } catch (error) {
    return json(res, 502, { ok:false, error:error.message || "Could not start M-Pesa payment." });
  }
}
