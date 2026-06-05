export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  const market = String(request.query.market || "US").trim().toUpperCase();
  if (market === "KR") {
    return searchKoreanStocks(request, response);
  }

  return searchUsStocks(request, response);
}

const koreanStocks = [
  { symbol: "005930", name: "삼성전자", type: "Common Stock" },
  { symbol: "000660", name: "SK하이닉스", type: "Common Stock" },
  { symbol: "035420", name: "NAVER", type: "Common Stock" },
  { symbol: "035720", name: "카카오", type: "Common Stock" },
  { symbol: "005380", name: "현대차", type: "Common Stock" },
  { symbol: "000270", name: "기아", type: "Common Stock" },
  { symbol: "068270", name: "셀트리온", type: "Common Stock" },
  { symbol: "051910", name: "LG화학", type: "Common Stock" },
  { symbol: "373220", name: "LG에너지솔루션", type: "Common Stock" },
  { symbol: "207940", name: "삼성바이오로직스", type: "Common Stock" },
  { symbol: "005490", name: "POSCO홀딩스", type: "Common Stock" },
  { symbol: "105560", name: "KB금융", type: "Common Stock" },
  { symbol: "055550", name: "신한지주", type: "Common Stock" },
  { symbol: "012330", name: "현대모비스", type: "Common Stock" },
  { symbol: "028260", name: "삼성물산", type: "Common Stock" }
];

async function searchUsStocks(request, response) {
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
        provider: "Finnhub",
        market: "US"
      }));

    return response.status(200).json({ results });
  } catch (error) {
    return response.status(502).json({
      error: error instanceof Error ? error.message : "symbol search failed"
    });
  }
}

async function searchKoreanStocks(request, response) {
  const query = String(request.query.q || "").trim();
  if (query.length < 1) {
    return response.status(400).json({ error: "검색어를 입력하세요." });
  }

  const normalized = query.toLowerCase();
  const localResults = koreanStocks
    .filter((item) => item.symbol.includes(query) || item.name.toLowerCase().includes(normalized))
    .map((item) => ({
      ...item,
      provider: "Twelve Data",
      market: "KR"
    }));

  return response.status(200).json({ results: localResults.slice(0, 10) });
}
