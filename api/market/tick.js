export const config = { runtime: "nodejs" };

const TICK_MS = 1000;
const BASE_PRICE = 10000;
const SYMBOL = "VELTEX-SIM-1";
const SOURCE = "VELTEX proprietary simulated market";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

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
