import { randomUUID, createCipheriv, randomBytes } from "node:crypto";

export const config = { runtime: "nodejs" };
const bearer = req => String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
const digits = value => String(value || "").replace(/\D/g, "");
function normalizePhone(value) {
  let n = digits(value);
  if (n.startsWith("0")) n = "254" + n.slice(1);
  if (n.startsWith("7") || n.startsWith("1")) n = "254" + n;
  return /^254[71]\d{8}$/.test(n) ? n : "";
}
function encryptDestination(value, keyText) {
  const key = Buffer.from(String(keyText || ""), "base64");
  if (key.length !== 32) throw new Error("WITHDRAWAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ok:false,error:"Method not allowed"}); }
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = bearer(req);
  if (!url || !serviceKey) return res.status(503).json({ok:false,error:"Withdrawal service is not configured."});
  if (!token || token.length > 8192) return res.status(401).json({ok:false,error:"Sign in first."});
  const amount = Number(req.body?.amountUsd);
  const method = String(req.body?.method || "");
  const phone = normalizePhone(req.body?.destination || "");
  if (!Number.isFinite(amount) || amount < 5 || amount > 10000 || method !== "M-PESA" || !phone) {
    return res.status(400).json({ok:false,error:"Enter an amount from USD 5 to 10,000 and a valid Kenyan M-Pesa number. Only M-Pesa withdrawal requests are enabled."});
  }
  let encrypted;
  try { encrypted = encryptDestination(phone, process.env.WITHDRAWAL_ENCRYPTION_KEY); }
  catch (error) { return res.status(503).json({ok:false,error:error.message}); }
  try {
    const auth = await fetch(`${url}/auth/v1/user`, {headers:{apikey:serviceKey,Authorization:`Bearer ${token}`},cache:"no-store"});
    if (!auth.ok) return res.status(401).json({ok:false,error:"Your session is invalid or expired."});
    const user = await auth.json();
    if (!user?.id || !(user.email_confirmed_at || user.confirmed_at)) return res.status(403).json({ok:false,error:"Verify your email before requesting a withdrawal."});
    const requestId = randomUUID();
    const rpc = await fetch(`${url}/rest/v1/rpc/create_withdrawal_request`, {
      method:"POST",
      headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        p_request_id:requestId,p_user_id:user.id,p_amount:Number(amount.toFixed(2)),
        p_payment_method:method,p_destination_masked:`+254••••••${phone.slice(-3)}`,
        p_destination_ciphertext:encrypted
      }),
      cache:"no-store"
    });
    const result = await rpc.json().catch(()=>null);
    if (!rpc.ok) {
      const reason = result?.message || result?.details || "Could not reserve wallet funds.";
      const status = /insufficient funds/i.test(reason) ? 409 : 400;
      return res.status(status).json({ok:false,error:reason});
    }
    const wallet = await fetch(`${url}/rest/v1/wallets?user_id=eq.${encodeURIComponent(user.id)}&select=available_balance&limit=1`, {
      headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`},cache:"no-store"
    });
    const walletRows = wallet.ok ? await wallet.json().catch(()=>[]) : [];
    return res.status(200).json({ok:true,requestId,amountUsd:Number(amount.toFixed(2)),status:"pending",availableBalance:walletRows[0]?.available_balance ?? null,message:"Withdrawal request submitted. Funds are reserved for manual review. No payout or refund is automatic."});
  } catch (error) {
    console.error("VELTEX withdrawal request failed:",error?.message || "unknown error");
    return res.status(502).json({ok:false,error:"Withdrawal service is temporarily unavailable."});
  }
}
