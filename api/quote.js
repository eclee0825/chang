export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: "TWELVE_DATA_API_KEY is not configured" });
  }

  const rawSymbol = String(request.query.symbol || "").trim().toUpperCase();
  const market = String(request.query.market || "US").toUpperCase();

  if (!rawSymbol) {
    return response.status(400).json({ error: "symbol is required" });
  }

  const symbol = market === "KR" ? `${rawSymbol}:KRX` : rawSymbol;
  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1min");
  url.searchParams.set("apikey", apiKey);

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();

    if (!upstream.ok || data.status === "error" || !data.close) {
      return response.status(502).json({
        error: data.message || "quote unavailable",
        symbol: rawSymbol,
        market
      });
    }

    return response.status(200).json({
      name: data.name || rawSymbol,
      price: Number(data.close),
      changePercent: Number(data.percent_change || 0),
      source: "api",
      lastUpdated: data.datetime || new Date().toISOString()
    });
  } catch (error) {
    return response.status(502).json({
      error: error instanceof Error ? error.message : "quote request failed",
      symbol: rawSymbol,
      market
    });
  }
}
