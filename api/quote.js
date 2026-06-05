export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return response.status(500).json({
      error: "FINNHUB_API_KEY is not configured in Vercel Environment Variables."
    });
  }

  const symbol = String(request.query.symbol || "").trim().toUpperCase();
  const name = String(request.query.name || symbol).trim();

  if (!symbol) {
    return response.status(400).json({ error: "symbol is required" });
  }

  const url = new URL("https://finnhub.io/api/v1/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("token", apiKey);

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();

    if (!upstream.ok || typeof data.c !== "number" || data.c <= 0 || !data.t) {
      return response.status(502).json({
        error: `${symbol} is not available from the live quote API.`,
        symbol
      });
    }

    const previousClose = Number(data.pc || 0);
    const changePercent = previousClose > 0 ? ((Number(data.c) - previousClose) / previousClose) * 100 : 0;

    return response.status(200).json({
      symbol,
      name,
      price: Number(data.c),
      open: Number(data.o || 0),
      high: Number(data.h || 0),
      low: Number(data.l || 0),
      previousClose,
      changePercent,
      lastUpdated: new Date(Number(data.t) * 1000).toISOString(),
      provider: "Finnhub"
    });
  } catch (error) {
    return response.status(502).json({
      error: error instanceof Error ? error.message : "quote request failed",
      symbol
    });
  }
}
