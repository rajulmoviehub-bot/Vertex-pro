import { createDecipheriv } from "node:crypto";
export const config = { runtime: "nodejs" };
const OWNER_EMAIL = "rajulmoviehub@gmail.com";
const bearer = req => String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
function decryptDestination(value,keyText) {
  const [version,ivText,tagText,dataText] = String(value || "").split(".");
  const rawKey = String(keyText || "");
  const decodedKey = Buffer.from(rawKey,"base64");
  const key = Buffer.byteLength(rawKey,"utf8") === 32 ? Buffer.from(rawKey,"utf8") : decodedKey;
  if (version !== "v1" || key.length !== 32 || !ivText || !tagText || !dataText) throw new Error("Encrypted destination or encryption key is invalid.");
  const decipher = createDecipheriv("aes-256-gcm",key,Buffer.from(ivText,"base64"));
  decipher.setAuthTag(Buffer.from(tagText,"base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataText,"base64")),decipher.final()]).toString("utf8");
}
async function owner(req) {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/,"");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = bearer(req);
  if (!url || !key) return {error:"Admin service is not configured.",status:503};
  if (!token || token.length > 8192) return {error:"Sign in as the owner first.",status:401};
  const auth = await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`},cache:"no-store"});
  if (!auth.ok) return {error:"Admin session is invalid or expired.",status:401};
  const user = await auth.json();
  if (String(user.email || "").trim().toLowerCase() !== OWNER_EMAIL || !(user.email_confirmed_at || user.confirmed_at)) return {error:"Only the verified VELTEX owner can manage withdrawals.",status:403};
  return {url,key,user};
}
export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  if (!["GET","POST"].includes(req.method)) {res.setHeader("Allow","GET, POST");return res.status(405).json({ok:false,error:"Method not allowed"});}
  try {
    const auth = await owner(req);
    if (auth.error) return res.status(auth.status).json({ok:false,error:auth.error});
    const {url,key,user} = auth;
    if (req.method === "GET") {
      const response = await fetch(`${url}/rest/v1/withdrawal_requests?select=id,user_id,amount,currency,destination_masked,status,payment_method,created_at,reviewed_at,refund_transaction_id,refunded_at&order=created_at.desc&limit=100`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
      const rows = await response.json().catch(()=>[]);
      if (!response.ok) return res.status(502).json({ok:false,error:"Could not load withdrawal requests."});
      return res.status(200).json({ok:true,requests:rows});
    }
    const action = String(req.body?.action || "");
    const requestId = String(req.body?.requestId || "");
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return res.status(400).json({ok:false,error:"Invalid withdrawal request ID."});
    const getOne = async () => {
      const r = await fetch(`${url}/rest/v1/withdrawal_requests?id=eq.${requestId}&select=*&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
      const rows = await r.json().catch(()=>[]);
      return r.ok ? rows[0] : null;
    };
    if (action === "refund") {
      const before = await getOne();
      if (!before || before.status !== "rejected") return res.status(409).json({ok:false,error:"Only a rejected request can be manually refunded."});
      if (before.refund_transaction_id || before.refunded_at) return res.status(409).json({ok:false,error:"This request has already been refunded."});
      const rpc = await fetch(`${url}/rest/v1/rpc/manual_refund_withdrawal`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({p_request_id:requestId,p_admin_id:user.id}),cache:"no-store"});
      const result = await rpc.json().catch(()=>null);
      if (!rpc.ok) return res.status(409).json({ok:false,error:result?.message || "Manual refund failed."});
      return res.status(200).json({ok:true,message:"Manual refund recorded and wallet credited.",transactionId:result});
    }
    if (action === "reveal") {
      const row = await getOne();
      if (!row?.destination_ciphertext) return res.status(404).json({ok:false,error:"Destination not found."});
      try { return res.status(200).json({ok:true,destination:decryptDestination(row.destination_ciphertext,process.env.WITHDRAWAL_ENCRYPTION_KEY)}); }
      catch { return res.status(503).json({ok:false,error:"Could not decrypt destination. Check WITHDRAWAL_ENCRYPTION_KEY."}); }
    }
    if (!["approve","reject","paid"].includes(action)) return res.status(400).json({ok:false,error:"Unknown withdrawal action."});
    const before = await getOne();
    if (!before) return res.status(404).json({ok:false,error:"Withdrawal request not found."});
    if (action === "approve" && before.status !== "pending") return res.status(409).json({ok:false,error:"Only pending requests can be approved."});
    if (action === "reject" && before.status !== "pending") return res.status(409).json({ok:false,error:"Only pending requests can be rejected."});
    if (action === "paid" && !["approved","processing"].includes(before.status)) return res.status(409).json({ok:false,error:"Only approved or processing requests can be marked paid."});
    const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "paid";
    const patch = await fetch(`${url}/rest/v1/withdrawal_requests?id=eq.${requestId}&status=eq.${before.status}`,{
      method:"PATCH",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation"},
      body:JSON.stringify({status,reviewed_by:user.id,reviewed_at:new Date().toISOString()}),cache:"no-store"
    });
    const changed = await patch.json().catch(()=>[]);
    if (!patch.ok || !changed.length) return res.status(409).json({ok:false,error:"Request status changed elsewhere. Refresh the list and try again."});
    return res.status(200).json({ok:true,status,message:status === "rejected" ? "Rejected. No refund was made; use Manual refund only if you decide to return the funds." : status === "approved" ? "Approved for manual payout. No money has been sent." : "Marked paid. This records a payout you completed outside VELTEX."});
  } catch (error) {
    console.error("VELTEX admin withdrawal action failed:",error?.message || "unknown error");
    return res.status(502).json({ok:false,error:"Admin withdrawal service is temporarily unavailable."});
  }
}
