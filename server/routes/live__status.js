export const config = { runtime: "nodejs" };

const CONTROL_FIELDS = [
  "legal_authorization_verified",
  "independent_fairness_audit_verified",
  "market_rules_published",
  "custody_and_reconciliation_verified",
  "risk_controls_verified",
  "incident_and_dispute_process_verified"
];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const base = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\\/$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const checks = {
    controlPlaneDatabaseReady: false,
    proprietaryLiveMarketFeed: false,
    independentFairnessAudit: false,
    publishedMarketRules: false,
    legalAuthorization: false,
    safeguardedCustomerFunds: false,
    ledgerReconciliation: false,
    riskAndExposureControls: false,
    disputeAndIncidentProcess: false,
    realMoneyOrderExecution: false,
    serverSideSettlement: false
  };
  const blockers = [];

  if (!base || !key) {
    blockers.push("Supabase server credentials are not configured.");
    return res.status(200).json({
      ok: true, service: "VELTEX Live Engine", mode: "READINESS_ONLY",
      tradingEnabled: false, orderPlacementEnabled: false, walletDebitsEnabled: false,
      settlementEnabled: false, checks, blockers,
      message: "Readiness check only. No live orders or customer-fund movements are available."
    });
  }

  try {
    const response = await fetch(
      `${base}/rest/v1/veltex_live_engine_control?id=eq.true&select=id,trading_enabled,${CONTROL_FIELDS.join(",")}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(7000) }
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      blockers.push(response.status === 404
        ? "Apply migration 20261110090000_veltex_live_engine_control.sql in Supabase."
        : `Live-engine control table check failed (HTTP ${response.status}).`);
      console.error("VELTEX live readiness database check failed:", response.status, detail.slice(0, 300));
    } else {
      const rows = await response.json();
      const row = rows?.[0];
      checks.controlPlaneDatabaseReady = Boolean(row);
      if (!row) blockers.push("Live-engine control row is missing; apply the live-engine migration.");
      if (row) {
        checks.legalAuthorization = row.legal_authorization_verified === true;
        checks.independentFairnessAudit = row.independent_fairness_audit_verified === true;
        checks.publishedMarketRules = row.market_rules_published === true;
        checks.safeguardedCustomerFunds = row.custody_and_reconciliation_verified === true;
        checks.ledgerReconciliation = row.custody_and_reconciliation_verified === true;
        checks.riskAndExposureControls = row.risk_controls_verified === true;
        checks.disputeAndIncidentProcess = row.incident_and_dispute_process_verified === true;
        for (const field of CONTROL_FIELDS) {
          if (row[field] !== true) blockers.push(`Required review not verified: ${field}.`);
        }
        if (row.trading_enabled !== false) {
          blockers.push("Database trading lock is not in its required disabled state; manual security review required.");
        }
        // Keep a server-side audit trail of readiness checks without storing secrets.
        const audit = await fetch(`${base}/rest/v1/veltex_live_engine_audit`, {
          method: "POST",
          headers: {
            apikey: key, Authorization: `Bearer ${key}`,
            "Content-Type": "application/json", Prefer: "return=minimal"
          },
          body: JSON.stringify({
            event_type: "READINESS_REVIEW",
            actor: "system:live-status",
            details: { control_plane_ready: checks.controlPlaneDatabaseReady, blockers: blockers.length }
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(5000)
        });
        if (!audit.ok) {
          blockers.push("Readiness audit log could not be written; check the live-engine audit table permissions.");
          console.error("VELTEX live readiness audit insert failed:", audit.status, (await audit.text().catch(() => "")).slice(0, 200));
        }
      }
    }
  } catch (error) {
    blockers.push("Could not reach Supabase to verify live-engine controls.");
    console.error("VELTEX live readiness check error:", error?.message || "unknown");
  }

  // These capabilities are intentionally hard-disabled. Passing readiness checks alone
  // never enables real-money trading; activation requires separately reviewed code,
  // a lawful operating basis, and end-to-end independent verification.
  return res.status(200).json({
    ok: true,
    service: "VELTEX Live Engine",
    mode: "READINESS_ONLY",
    tradingEnabled: false,
    orderPlacementEnabled: false,
    walletDebitsEnabled: false,
    settlementEnabled: false,
    checks,
    blockers,
    message: "Live trading remains locked. This endpoint verifies readiness controls and records a review; it cannot place orders or move customer funds."
  });
}
