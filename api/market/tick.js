import { randomUUID } from "node:crypto";

export const config = { runtime: "nodejs" };

const TICK_MS = 1000;
const BASE_PRICE = 10000;
const SYMBOL = "VELTEX-SIM-1";
const SOURCE = "VELTEX proprietary simulated market";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const bearer = req => String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const enginePriceAt = sequence => {
  let x = (sequence + 0x9e3779b9) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  const noise = ((x >>> 0) / 0xffffffff) - 0.5;
  const wave = 18 * Math.sin(sequence / 41) + 9 * Math.sin(sequence / 13) + 4 * Math.sin(sequence / 5.3);
  return Number((10000 + wave + noise * 2.4).toFixed(3));
};
const digitAt = sequence => Number(enginePriceAt(sequence).toFixed(3).slice(-1));
async function authenticate(req) {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = bearer(req);
  if (!url || !key) return { error: "VELTEX engine is not configured on the server.", status: 503 };
  if (!token || token.length > 8192) return { error: "Sign in to use the VELTEX demo engine.", status: 401 };
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) return { error: "Your session is invalid or expired.", status: 401 };
  const user = await response.json();
  if (!user?.id || !(user.email_confirmed_at || user.confirmed_at)) return { error: "Verify your email before trading.", status: 403 };
  return { url, key, user };
}
async function rpc(url, key, name, args) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args), cache: "no-store"
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || body?.hint || "VELTEX engine database request failed.");
    error.status = response.status;
    throw error;
  }
  return body;
}


// Public, deterministic tick function: the same sequence number always returns
// the same price. This is a synthetic demo market, not an external asset price.
function priceAt(sequence) {
  let x = (sequence + 0x9e3779b9) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  const noise = ((x >>> 0) / 0xffffffff) - 0.5;
  const wave = 18 * Math.sin(sequence / 41) +
    9 * Math.sin(sequence / 13) +
    4 * Math.sin(sequence / 5.3);
  return Number((BASE_PRICE + wave + noise * 2.4).toFixed(3));
}

function makeTick(sequence) {
  const timestamp = sequence * TICK_MS;
  return {
    symbol: SYMBOL,
    sequence,
    timestamp: new Date(timestamp).toISOString(),
    epoch_ms: timestamp,
    quote: priceAt(sequence)
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (req.method === "POST") {
  try {
    const auth = await authenticate(req);
    if (auth.error) return res.status(auth.status).json({ ok: false, error: auth.error });
    const { url, key, user } = auth;
    const action = String(req.body?.action || "");
    if (action === "open") {
      const contract = String(req.body?.contract || "").toUpperCase();
      const stake = Number(req.body?.stake);
      const duration = Number(req.body?.durationTicks);
      if (!["EVEN", "ODD"].includes(contract)) return res.status(400).json({ ok: false, error: "Choose EVEN or ODD." });
      if (!Number.isFinite(stake) || stake <= 0 || stake > 10000) return res.status(400).json({ ok: false, error: "Demo stake must be between 0 and 10,000." });
      if (!Number.isInteger(duration) || duration < 1 || duration > 100) return res.status(400).json({ ok: false, error: "Tick duration must be between 1 and 100." });
      const sequence = Math.floor(Date.now() / 1000);
      const trade = await rpc(url, key, "veltex_open_demo_trade", {
        p_trade_id: randomUUID(), p_user_id: user.id, p_contract: contract,
        p_stake: stake, p_duration_ticks: duration, p_entry_sequence: sequence,
        p_entry_digit: digitAt(sequence)
      });
      return res.status(201).json({ ok: true, engine: "VELTEX_DEMO", trade });
    }
    if (action === "settle") {
      const tradeId = String(req.body?.tradeId || "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tradeId)) return res.status(400).json({ ok: false, error: "A valid trade ID is required." });
      const lookup = await fetch(`${url}/rest/v1/veltex_demo_trades?id=eq.${encodeURIComponent(tradeId)}&user_id=eq.${encodeURIComponent(user.id)}&select=id,status,entry_sequence,duration_ticks&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store"
      });
      const rows = await lookup.json().catch(() => []);
      if (!lookup.ok) return res.status(502).json({ ok: false, error: "Could not read the demo trade." });
      if (!rows.length) return res.status(404).json({ ok: false, error: "Trade not found for this account." });
      if (rows[0].status !== "open") return res.status(200).json({ ok: true, engine: "VELTEX_DEMO", trade: rows[0] });
      const sequence = Math.floor(Date.now() / 1000);
      if (sequence < Number(rows[0].entry_sequence) + Number(rows[0].duration_ticks)) {
        return res.status(409).json({ ok: false, error: "Trade duration has not elapsed.", remainingTicks: Number(rows[0].entry_sequence) + Number(rows[0].duration_ticks) - sequence });
      }
      const trade = await rpc(url, key, "veltex_settle_demo_trade", {
        p_trade_id: tradeId, p_exit_sequence: sequence, p_exit_digit: digitAt(sequence)
      });
      return res.status(200).json({ ok: true, engine: "VELTEX_DEMO", trade });
    }
    return res.status(400).json({ ok: false, error: "Action must be open or settle." });
  } catch (error) {
    console.error("VELTEX demo engine error:", error?.message || "unknown");
    return res.status(error?.status === 42501 ? 403 : 502).json({ ok: false, error: error?.message || "VELTEX engine request failed." });
  }
  if (req.method !== "GET") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ ok: false, error: "Method not allowed" }); }
  const now = Date.now();
  const currentSequence = Math.floor(now / TICK_MS);
  const requestedLimit = Number.parseInt(req.query?.limit ?? "30", 10);
  const limit = clamp(Number.isFinite(requestedLimit) ? requestedLimit : 30, 1, 60);
  const ticks = [];
  for (let seq = currentSequence - limit + 1; seq <= currentSequence; seq += 1) {
    ticks.push(makeTick(seq));
  }

  return res.status(200).json({
    ok: true,
    market: {
      symbol: SYMBOL,
      name: "VELTEX Synthetic Index",
      source: SOURCE,
      market_type: "synthetic_demo",
      real_world_asset_price: false,
      real_money_trading_enabled: false,
      algorithm: "Deterministic published formula: multi-frequency sine waves plus sequence-hashed bounded noise",
      tick_interval_ms: TICK_MS
    },
    server_time: new Date(now).toISOString(),
    tick: ticks[ticks.length - 1],
    ticks
  });
}
