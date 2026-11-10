export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const checks = {
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

  return res.status(200).json({
    ok: true,
    service: "VELTEX Live Engine",
    mode: "READINESS_ONLY",
    tradingEnabled: false,
    orderPlacementEnabled: false,
    walletDebitsEnabled: false,
    settlementEnabled: false,
    checks,
    blockers: Object.keys(checks).filter(key => !checks[key]),
    message: "Live trading is locked. This endpoint reports readiness only; it cannot place orders or move customer funds."
  });
}
