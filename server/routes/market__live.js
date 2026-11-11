export const config = { runtime: "nodejs" };

const ALLOWED_SYMBOL = /^[A-Z0-9]{2,12}(\/[A-Z0-9]{2,12})?$/;
const MAX_QUOTE_AGE_SECONDS = 180;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const apiKey = String(process.env.TWELVE_DATA_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      mode: "LIVE_PROVIDER_NOT_CONFIGURED",
      provider: "Twelve Data",
      error: "Add TWELVE_DATA_API_KEY in Vercel Production environment variables, then redeploy."
    });
  }

  const requested = String(req.query?.symbol || process.env.TWELVE_DATA_SYMBOL || "EUR/USD").trim().toUpperCase();
  if (!ALLOWED_SYMBOL.test(requested)) {
    return res.status(400).json({ ok: false, error: "Invalid market symbol format." });
  }

  try {
    const url = new URL("https://api.twelvedata.com/quote");
    url.searchParams.set("symbol", requested);
    url.searchParams.set("interval", "1min");
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload || payload.status === "error" || payload.code || payload.close == null) {
      console.error("Twelve Data quote request failed:", response.status, payload?.code || payload?.message || "invalid response");
      return res.status(response.status === 429 ? 429 : 502).json({
        ok: false,
        mode: "LIVE_PROVIDER_ERROR",
        provider: "Twelve Data",
        error: "The market-data provider did not return a valid timestamped quote. Check symbol access, plan limits and API configuration."
      });
    }

    const price = Number(payload.close);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(502).json({ ok: false, mode: "LIVE_PROVIDER_ERROR", error: "Provider returned an invalid quote price." });
    }

    const timestampValue = payload.last_quote_at ?? payload.timestamp ?? null;
    const timestampSeconds = timestampValue == null ? NaN : Number(timestampValue);
    const providerTimestamp = Number.isFinite(timestampSeconds) && timestampSeconds > 0
      ? new Date(timestampSeconds * 1000)
      : null;
    const providerTimestampIso = providerTimestamp && Number.isFinite(providerTimestamp.getTime())
      ? providerTimestamp.toISOString()
      : null;
    const receivedAt = new Date();
    const quoteAgeSeconds = providerTimestampIso
      ? Math.max(0, Math.floor((receivedAt.getTime() - providerTimestamp.getTime()) / 1000))
      : null;
    const quoteFresh = quoteAgeSeconds !== null && quoteAgeSeconds <= MAX_QUOTE_AGE_SECONDS;

    return res.status(200).json({
      ok: true,
      mode: "LIVE_EXTERNAL_MARKET_DATA",
      provider: "Twelve Data",
      symbol: requested,
      price,
      price_text: String(payload.close),
      provider_timestamp: providerTimestampIso,
      provider_timestamp_unix: providerTimestampIso ? timestampSeconds : null,
      provider_datetime: payload.datetime || null,
      received_at: receivedAt.toISOString(),
      quote_age_seconds: quoteAgeSeconds,
      quote_fresh: quoteFresh,
      quote_stale: !quoteFresh,
      market_data_only: true,
      real_money_trading_enabled: false,
      order_placement_enabled: false,
      wallet_debits_enabled: false,
      disclosure: "Timestamped 1-minute provider quote. Quotes older than 180 seconds or without a provider timestamp are marked stale. Availability, delay and display rights depend on the Twelve Data subscription and applicable exchange licences. This endpoint does not execute or settle trades."
    });
  } catch (error) {
    console.error("Twelve Data connection failed:", error?.message || "unknown");
    return res.status(502).json({
      ok: false,
      mode: "LIVE_PROVIDER_ERROR",
      provider: "Twelve Data",
      error: "Could not reach the market-data provider. Retry shortly."
    });
  }
}
