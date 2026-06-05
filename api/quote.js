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
  const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.KS`;
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`);
  url.searchParams.set("interval", "1m");
  url.searchParams.set("range", "1d");

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;

    if (!upstream.ok || data.chart?.error || !meta || typeof meta.regularMarketPrice !== "number") {
      return response.status(502).json({
        error: `${symbol} is not available from Yahoo Finance delayed quote data.`,
        symbol
      });
    }

    const price = Number(meta.regularMarketPrice);
    const previousClose = Number(meta.chartPreviousClose || meta.previousClose || 0);
    const changePercent = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;

    return response.status(200).json({
      symbol,
      name: name || meta.longName || meta.shortName || symbol,
      price,
      open: Number(meta.regularMarketOpen || 0),
      high: Number(meta.regularMarketDayHigh || 0),
      low: Number(meta.regularMarketDayLow || 0),
      previousClose,
      changePercent,
      lastUpdated: meta.regularMarketTime ? new Date(Number(meta.regularMarketTime) * 1000).toISOString() : new Date().toISOString(),
      provider: "Yahoo Finance delayed",
      market: "KR"
    });
  } catch (error) {
    return response.status(502).json({
      error: error instanceof Error ? error.message : "Yahoo Finance quote request failed",
      symbol
    });
  }
}
