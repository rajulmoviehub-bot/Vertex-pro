export const config = { runtime: "nodejs" };

async function db(path, serviceKey, options = {}) {
  const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return fetch(base + path, {
    ...options,
    headers:{ apikey:serviceKey, Authorization:`Bearer ${serviceKey}`, "Content-Type":"application/json", ...(options.headers || {}) },
    cache:"no-store"
  });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  if (req.method !== "POST") { res.setHeader("Allow","POST"); return res.status(405).json({ ok:false }); }
  const token = String(req.query?.token || "");
  if (!process.env.MPESA_CALLBACK_TOKEN || token !== process.env.MPESA_CALLBACK_TOKEN) return res.status(404).json({ ok:false });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return res.status(503).json({ ok:false });

  try {
    const cb = req.body?.Body?.stkCallback;
    const checkoutId = String(cb?.CheckoutRequestID || "");
    if (!checkoutId) return res.status(400).json({ ok:false });
    const lookup = await db(`/rest/v1/deposit_requests?checkout_request_id=eq.${encodeURIComponent(checkoutId)}&select=id,user_id,amount,amount_kes,exchange_rate_kes_per_usd,exchange_rate_updated_at,phone_number,status`, serviceKey);
    const rows = await lookup.json();
    const deposit = rows?.[0];
    if (!lookup.ok || !deposit) return res.status(404).json({ ok:false });
    if (deposit.status === "confirmed") return res.status(200).json({ ResultCode:0, ResultDesc:"Already processed" });
    if (deposit.status !== "pending") return res.status(200).json({ ResultCode:0, ResultDesc:"Deposit is not pending; no wallet credit was made." });

    const resultCode = Number(cb.ResultCode);
    if (resultCode !== 0) {
      await db(`/rest/v1/deposit_requests?id=eq.${deposit.id}`, serviceKey, {
        method:"PATCH", body:JSON.stringify({ status:"failed", result_description:String(cb.ResultDesc || "Payment cancelled or failed").slice(0,500) })
      });
      return res.status(200).json({ ResultCode:0, ResultDesc:"Failure recorded" });
    }

    const items = Array.isArray(cb.CallbackMetadata?.Item) ? cb.CallbackMetadata.Item : [];
    const value = name => items.find(item=>item.Name===name)?.Value;
    const receipt = String(value("MpesaReceiptNumber") || "");
    const paidKes = Number(value("Amount"));
    const phone = String(value("PhoneNumber") || "");
    const expectedPhone = String(deposit.phone_number || "").replace(/\D/g, "");
    const callbackPhone = phone.replace(/\D/g, "");
    if (!receipt || !Number.isFinite(paidKes) || paidKes <= 0 || Math.abs(paidKes - Number(deposit.amount_kes)) > 0.01 || !expectedPhone || !callbackPhone || expectedPhone !== callbackPhone) {
      await db(`/rest/v1/deposit_requests?id=eq.${deposit.id}`, serviceKey, {
        method:"PATCH", body:JSON.stringify({ status:"failed", result_description:"Callback amount or receipt did not match the pending deposit." })
      });
      return res.status(200).json({ ResultCode:0, ResultDesc:"Payment details require reconciliation" });
    }

    const fx = Number(deposit.exchange_rate_kes_per_usd);
    if (!Number.isFinite(fx) || fx <= 0) {
      await db(`/rest/v1/deposit_requests?id=eq.${deposit.id}`, serviceKey, {
        method:"PATCH", body:JSON.stringify({ status:"failed", result_description:"The exchange rate saved for this deposit is missing or invalid." })
      });
      return res.status(200).json({ ResultCode:0, ResultDesc:"Deposit requires reconciliation" });
    }
    const usdCredit = Number((paidKes / fx).toFixed(2));
    const credit = await db("/rest/v1/rpc/post_wallet_transaction", serviceKey, {
      method:"POST",
      body:JSON.stringify({
        p_user_id:deposit.user_id,
        p_idempotency_key:"mpesa:"+receipt,
        p_kind:"deposit",
        p_amount:usdCredit,
        p_direction:"credit",
        p_reference:receipt,
        p_metadata:{ provider:"safaricom_daraja_stk", checkout_request_id:checkoutId, amount_kes:paidKes, phone_number:phone, exchange_rate_kes_per_usd:fx, exchange_rate_updated_at:deposit.exchange_rate_updated_at }
      })
    });
    if (!credit.ok) return res.status(500).json({ ok:false, error:"Wallet credit failed; payment needs reconciliation." });

    const marked = await db(`/rest/v1/deposit_requests?id=eq.${deposit.id}`, serviceKey, {
      method:"PATCH",
      body:JSON.stringify({ status:"confirmed", verified_at:new Date().toISOString(), mpesa_receipt_number:receipt, result_description:"Payment confirmed by Safaricom callback." })
    });
    if (!marked.ok) return res.status(500).json({ ok:false, error:"Wallet credit posted; deposit status update needs retry." });
    return res.status(200).json({ ResultCode:0, ResultDesc:"Accepted" });
  } catch {
    return res.status(500).json({ ok:false });
  }
}
