export const config = { runtime: "nodejs" };

import handler from "../../server/routes/market__fair.js";

export default function fairMarketRoute(req, res) {
  return handler(req, res);
}
