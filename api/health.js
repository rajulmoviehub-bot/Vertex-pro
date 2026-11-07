export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const checks = {
    supabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    mpesaConsumerKey: Boolean(process.env.MPESA_CONSUMER_KEY),
    mpesaConsumerSecret: Boolean(process.env.MPESA_CONSUMER_SECRET),
    mpesaShortcode: Boolean(process.env.MPESA_SHORTCODE),
    mpesaPasskey: Boolean(process.env.MPESA_PASSKEY),
    mpesaCallbackUrl: Boolean(process.env.MPESA_CALLBACK_URL),
    withdrawalEncryptionKey: Boolean(process.env.WITHDRAWAL_ENCRYPTION_KEY)
  };

  return res.status(200).json({
    ok: true,
    service: "VELTEX Pro",
    checks,
    customerAuthReady: checks.supabaseUrl && checks.supabaseAnonKey,
    secureAdminVerificationReady: checks.supabaseUrl && checks.supabaseServiceRoleKey,
    withdrawalServiceConfigured: checks.supabaseUrl && checks.supabaseServiceRoleKey && checks.withdrawalEncryptionKey,
    mpesaConfigurationPresent: checks.mpesaConsumerKey && checks.mpesaConsumerSecret &&
      checks.mpesaShortcode && checks.mpesaPasskey && checks.mpesaCallbackUrl,
    livePaymentsEnabled: false,
    liveTradingEnabled: false,
    note: "This endpoint reports configuration presence only. It does not verify provider accounts, licensing, payment callbacks, or broker execution."
  });
}
