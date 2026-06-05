export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  const symbol = String(request.query.symbol || "").trim().toUpperCase();
  const name = String(request.query.name || symbol).trim();
  const market = String(request.query.market || "US").trim().toUpperCase();

  if (!symbol) {
    return response.status(400).json({ error: "symbol is required" });
  }

  if (market === "KR") {
    return fetchKoreanQuote({ symbol, name, response });
  }

  return fetchUsQuote({ symbol, name, response });
}

async function fetchUsQuote({ symbol, name, response }) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return response.status(500).json({
      error: "FINNHUB_API_KEY is not configured in Vercel Environment Variables."
    });
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
      provider: "Finnhub",
      market: "US"
    });
  } catch (error) {
    return response.status(502).json({
      error: error instanceof Error ? error.message : "quote request failed",
      symbol
    });
  }
}

async function fetchKoreanQuote({ symbol, name, response }) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    return response.status(500).json({
      error: "TWELVE_DATA_API_KEY is not configured in Vercel Environment Variables."
    });
  }

  const krxSymbol = symbol.includes(":") ? symbol : `${symbol}:KRX`;
  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", krxSymbol);
  url.searchParams.set("interval", "1min");
  url.searchParams.set("apikey", apiKey);

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();

    if (!upstream.ok || data.status === "error" || !data.close) {
      return response.status(502).json({
        error: data.message || `${symbol} is not available from the KRX quote API.`,
        symbol
      });
    }

    return response.status(200).json({
      symbol,
      name: data.name || name || symbol,
      price: Number(data.close),
      open: Number(data.open || 0),
      high: Number(data.high || 0),
      low: Number(data.low || 0),
      previousClose: Number(data.previous_close || 0),
      changePercent: Number(data.percent_change || 0),
      lastUpdated: data.datetime ? new Date(data.datetime).toISOString() : new Date().toISOString(),
      provider: "Twelve Data",
      market: "KR"
    });
  } catch (error) {
    return response.status(502).json({
      error: error instanceof Error ? error.message : "KRX quote request failed",
      symbol
    });
  }
}
