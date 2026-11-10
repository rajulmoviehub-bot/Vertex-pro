import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const config = { runtime: "nodejs" };

const ROUND_MS = 5000;
const SYMBOL = "VELTEX-FAIR-SYNTH-1";
const BASE_PRICE = 10000;
const SECRET_MIN_BYTES = 32;

function hmac(secret, message) {
  return createHmac("sha256", secret).update(message).digest();
}
function roundSeed(master, roundId) {
  return hmac(master, `VELTEX|FAIR-SYNTHETIC|v1|round:${roundId}`);
}
function describeRound(master, roundId, now) {
  const seed = roundSeed(master, roundId);
  const commitment = createHash("sha256").update(seed).digest("hex");
  const priceBytes = hmac(seed, "VELTEX|price|v1");
  const raw = priceBytes.readUInt32BE(0) / 0xffffffff;
  const quote = Number((BASE_PRICE + raw * 100).toFixed(3));
  const closesAt = (roundId + 1) * ROUND_MS;
  const settled = now >= closesAt;
  const proof = {
    scheme: "HMAC-SHA256 commit/reveal",
    version: "veltex-fair-synthetic-v1",
    round_id: roundId,
    commitment_sha256: commitment,
    opens_at: new Date(roundId * ROUND_MS).toISOString(),
    closes_at: new Date(closesAt).toISOString()
  };
  if (!settled) {
    return { ...proof, status: "OPEN", symbol: SYMBOL, quote: null, digit: null, outcome: null, seed_revealed: false };
  }
  const digit = Number(quote.toFixed(3).slice(-1));
  const outcome = digit % 2 === 0 ? "EVEN" : "ODD";
  const revealedSeed = seed.toString("hex");
  const check = createHash("sha256").update(Buffer.from(revealedSeed, "hex")).digest("hex");
  const verified = timingSafeEqual(Buffer.from(check, "hex"), Buffer.from(commitment, "hex"));
  return {
    ...proof,
    status: "SETTLED",
    symbol: SYMBOL,
    quote,
    digit,
    outcome,
    seed_revealed: true,
    seed: revealedSeed,
    verification: {
      commitment_matches_revealed_seed: verified,
      outcome_rule: "Take the final decimal digit of the published 3-decimal quote; even=EVEN, odd=ODD"
    }
  };
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const rawSecret = String(process.env.VELTEX_MARKET_SEED_SECRET || "").trim();
  if (!rawSecret) {
    return res.status(503).json({
      ok: false,
      mode: "FAIR_SYNTHETIC_NOT_CONFIGURED",
      error: "Set VELTEX_MARKET_SEED_SECRET in Vercel Production to a randomly generated secret of at least 32 bytes, then redeploy."
    });
  }
  const secret = Buffer.from(rawSecret, "base64");
  if (secret.length < SECRET_MIN_BYTES) {
    return res.status(503).json({
      ok: false,
      mode: "FAIR_SYNTHETIC_NOT_CONFIGURED",
      error: "VELTEX_MARKET_SEED_SECRET must be base64-encoded random data containing at least 32 bytes."
    });
  }

  const now = Date.now();
  const currentRound = Math.floor(now / ROUND_MS);
  const rounds = [];
  for (let id = Math.max(0, currentRound - 11); id <= currentRound; id += 1) {
    rounds.push(describeRound(secret, id, now));
  }
  const current = rounds[rounds.length - 1];
  return res.status(200).json({
    ok: true,
    engine: "VELTEX_OWN_ENGINE",
    mode: "PROVABLY_FAIR_SYNTHETIC",
    market_type: "synthetic_generated_not_external_asset",
    real_world_asset_price: false,
    real_money_trading_enabled: false,
    order_placement_enabled: false,
    wallet_debits_enabled: false,
    settlement_to_customer_wallet_enabled: false,
    symbol: SYMBOL,
    round_interval_ms: ROUND_MS,
    server_time: new Date(now).toISOString(),
    current_round: current,
    recent_rounds: rounds.filter(round => round.status === "SETTLED"),
    disclosure: "VELTEX-generated synthetic outcomes. Commitments are published before each round and seeds are revealed after close for reproducibility. This endpoint is a proof feed only; it does not accept orders or move customer funds. Independent fairness audit and legal authorization are not implied."
  });
}
