export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  let serviceKeyType = serviceKey ? "other_or_unrecognized" : "missing";
  if (serviceKey.startsWith("sb_secret_")) {
    serviceKeyType = "supabase_secret_key";
  } else if (serviceKey) {
    try {
      const parts = serviceKey.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        if (String(payload?.role || "") === "service_role") {
          serviceKeyType = "legacy_service_role_jwt";
        } else if (payload?.role) {
          serviceKeyType = "jwt_with_non_service_role";
        } else {
          serviceKeyType = "jwt_without_role";
        }
      }
    } catch {
      serviceKeyType = "not_a_recognized_jwt_or_secret";
    }
  }

  const callbackUrl = String(process.env.MPESA_CALLBACK_URL || "").trim();
  let mpesaCallbackUrlValid = false;
  try {
    const parsed = new URL(callbackUrl);
    const token = String(process.env.MPESA_CALLBACK_TOKEN || "");
    mpesaCallbackUrlValid = parsed.protocol === "https:" && !parsed.search && !parsed.hash &&
      token.length >= 24 && parsed.pathname === `/api/payments/callback/${encodeURIComponent(token)}`;
  } catch {}
  const withdrawalKeyText = String(process.env.WITHDRAWAL_ENCRYPTION_KEY || "");
  const withdrawalKeyBytes = Buffer.byteLength(withdrawalKeyText, "utf8") === 32
    ? Buffer.from(withdrawalKeyText, "utf8")
    : Buffer.from(withdrawalKeyText, "base64");

  const checks = {
    supabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: Boolean(serviceKey),
    mpesaConsumerKey: Boolean(process.env.MPESA_CONSUMER_KEY),
    mpesaConsumerSecret: Boolean(process.env.MPESA_CONSUMER_SECRET),
    mpesaShortcode: Boolean(process.env.MPESA_SHORTCODE),
    mpesaPasskey: Boolean(process.env.MPESA_PASSKEY),
    mpesaCallbackUrl: Boolean(process.env.MPESA_CALLBACK_URL),
    withdrawalEncryptionKey: Boolean(withdrawalKeyText),
    withdrawalEncryptionKeyValid: withdrawalKeyBytes.length === 32,
    mpesaCallbackUrlValid
  };

  return res.status(200).json({
    ok: true,
    service: "VELTEX Pro",
    checks,
    supabaseServiceRoleKeyType: serviceKeyType,
    supabaseServiceRoleKeyAcceptedByFormatCheck:
      serviceKeyType === "supabase_secret_key" || serviceKeyType === "legacy_service_role_jwt",
    customerAuthReady: checks.supabaseUrl && checks.supabaseAnonKey,
    secureAdminVerificationReady: checks.supabaseUrl && checks.supabaseServiceRoleKey,
    withdrawalServiceConfigured: checks.supabaseUrl && checks.supabaseServiceRoleKey && checks.withdrawalEncryptionKey,
    mpesaConfigurationPresent: checks.mpesaConsumerKey && checks.mpesaConsumerSecret &&
      checks.mpesaShortcode && checks.mpesaPasskey && checks.mpesaCallbackUrl && checks.mpesaCallbackUrlValid,
    livePaymentsEnabled: false,
    liveTradingEnabled: false,
    note: "This endpoint reports configuration presence and a non-secret key format classification only. It does not verify provider accounts, licensing, payment callbacks, or broker execution."
  });
}
