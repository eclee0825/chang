export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return response.status(500).json({
      error: "FINNHUB_API_KEY is not configured in Vercel Environment Variables."
    });
  }

  const query = String(request.query.q || "").trim();
  if (query.length < 2) {
    return response.status(400).json({ error: "Enter at least 2 characters to search." });
  }

  const url = new URL("https://finnhub.io/api/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("exchange", "US");
  url.searchParams.set("token", apiKey);

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();

    if (!upstream.ok || !Array.isArray(data.result)) {
      return response.status(502).json({ error: data.error || "symbol search failed" });
    }

    const results = data.result
      .filter((item) => item.symbol && item.description)
      .filter((item) => !String(item.symbol).includes("."))
      .filter((item) => !String(item.symbol).includes(":"))
      .slice(0, 10)
      .map((item) => ({
        symbol: String(item.symbol).toUpperCase(),
        name: String(item.description),
        type: String(item.type || "Stock"),
        provider: "Finnhub"
      }));

    return response.status(200).json({ results });
  } catch (error) {
    return response.status(502).json({
      error: error instanceof Error ? error.message : "symbol search failed"
    });
  }
}
