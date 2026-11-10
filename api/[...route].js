export const config = { runtime: "nodejs" };

const handlers = {
  "/api/admin/add-capital": () => import("../server/routes/admin__add-capital.js"),
  "/api/admin/customers": () => import("../server/routes/admin__customers.js"),
  "/api/admin/mpesa-check": () => import("../server/routes/admin__mpesa-check.js"),
  "/api/admin/verify": () => import("../server/routes/admin__verify.js"),
  "/api/admin/withdrawals": () => import("../server/routes/admin__withdrawals.js"),
  "/api/bot-license": () => import("../server/routes/bot-license.js"),
  "/api/health": () => import("../server/routes/health.js"),
  "/api/market/catalog": () => import("../server/routes/market__catalog.js"),
  "/api/market/tick": () => import("../server/routes/market__tick.js"),
  "/api/mpesa/callback": () => import("../server/routes/mpesa__callback.js"),
  "/api/mpesa/stkpush": () => import("../server/routes/mpesa__stkpush.js"),
  "/api/withdrawals/request": () => import("../server/routes/withdrawals__request.js")
};

export default async function handler(req, res) {
  const pathname = new URL(req.url || "/", "https://vertexprobinary.online").pathname.replace(/\/+$/, "") || "/";
  let load = handlers[pathname];
  if (pathname.startsWith("/api/payments/callback/")) {
    const token = pathname.slice("/api/payments/callback/".length);
    req.query = { ...(req.query || {}), token };
    load = () => import("../server/routes/payments__callback__token.js");
  }
  if (!load) return res.status(404).json({ ok: false, error: "API route not found" });
  try {
    const route = await load();
    return await route.default(req, res);
  } catch (error) {
    console.error("VELTEX API dispatcher error:", error?.message || "unknown");
    return res.status(500).json({ ok: false, error: "Internal API error" });
  }
}
