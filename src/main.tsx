import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  LineChart,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Smartphone,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards
} from "lucide-react";
import "./styles.css";

type Market = "US" | "KR";
type QuoteState = "pending" | "live" | "error";
type ApiStatus = "idle" | "loading" | "success" | "error";

type SearchResult = {
  market: Market;
  symbol: string;
  name: string;
  type: string;
  provider: string;
};

type Quote = {
  market: Market;
  symbol: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  changePercent: number;
  lastUpdated: string;
  provider: string;
};

type Holding = {
  id: string;
  market: Market;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  changePercent: number;
  lastUpdated?: string;
  provider?: string;
  quoteState: QuoteState;
  errorMessage?: string;
};

const STORAGE_KEY = "mystock-lab-live-global-v1";
const AUTO_REFRESH_STORAGE = "mystock-lab-auto-refresh";
const QUOTE_REFRESH_MS = 60_000;
const USD_KRW_RATE = 1350;

const seedHoldings: Holding[] = [
  createSeedHolding("US", "AAPL", "Apple Inc", 3, 183),
  createSeedHolding("US", "NVDA", "NVIDIA Corp", 2, 112),
  createSeedHolding("KR", "005930", "삼성전자", 5, 72000)
];

const popularQueries: Record<Market, string[]> = {
  US: ["Apple", "Microsoft", "NVIDIA", "Tesla", "Google", "Amazon", "Meta"],
  KR: ["삼성전자", "SK하이닉스", "NAVER", "카카오", "현대차", "기아", "셀트리온"]
};

const marketLabel: Record<Market, string> = {
  US: "미국 주식",
  KR: "국내 주식"
};

function createSeedHolding(market: Market, symbol: string, name: string, quantity: number, avgPrice: number): Holding {
  return {
    id: `seed-${market}-${symbol}`,
    market,
    symbol,
    name,
    quantity,
    avgPrice,
    price: 0,
    open: 0,
    high: 0,
    low: 0,
    previousClose: 0,
    changePercent: 0,
    quoteState: "pending"
  };
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function usd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function krw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);
}

function money(value: number, market: Market) {
  return market === "KR" ? krw(value) : usd(value);
}

function toUsd(value: number, market: Market) {
  return market === "KR" ? value / USD_KRW_RATE : value;
}

function toKrw(value: number, market: Market) {
  return market === "KR" ? value : value * USD_KRW_RATE;
}

function loadHoldings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return seedHoldings;

  try {
    const parsed = JSON.parse(stored) as Partial<Holding>[];
    if (!Array.isArray(parsed) || !parsed.length) return seedHoldings;

    return parsed
      .filter((item) => item.symbol)
      .map((item) => ({
        id: item.id || uid(),
        market: (item.market as Market) || "US",
        symbol: String(item.symbol).toUpperCase(),
        name: item.name || String(item.symbol).toUpperCase(),
        quantity: Number(item.quantity || 0),
        avgPrice: Number(item.avgPrice || 0),
        price: item.quoteState === "live" ? Number(item.price || 0) : 0,
        open: item.quoteState === "live" ? Number(item.open || 0) : 0,
        high: item.quoteState === "live" ? Number(item.high || 0) : 0,
        low: item.quoteState === "live" ? Number(item.low || 0) : 0,
        previousClose: item.quoteState === "live" ? Number(item.previousClose || 0) : 0,
        changePercent: item.quoteState === "live" ? Number(item.changePercent || 0) : 0,
        lastUpdated: item.quoteState === "live" ? item.lastUpdated : undefined,
        provider: item.provider,
        quoteState: item.quoteState === "live" ? "live" : "pending",
        errorMessage: undefined
      }));
  } catch {
    return seedHoldings;
  }
}

async function searchSymbols(query: string, market: Market): Promise<SearchResult[]> {
  const url = new URL("/api/search", window.location.origin);
  url.searchParams.set("q", query);
  url.searchParams.set("market", market);

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !Array.isArray(data.results)) {
    throw new Error(data.error || "종목 검색에 실패했습니다.");
  }

  return data.results;
}

async function fetchQuote(symbol: string, market: Market, name?: string): Promise<Quote> {
  const url = new URL("/api/quote", window.location.origin);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("market", market);
  if (name) url.searchParams.set("name", name);

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || typeof data.price !== "number") {
    throw new Error(data.error || "실시간 시세를 조회할 수 없습니다.");
  }

  return data;
}

function App() {
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings);
  const [status, setStatus] = useState<ApiStatus>("idle");
  const [activeTab, setActiveTab] = useState<"portfolio" | "add" | "settings">("portfolio");
  const [market, setMarket] = useState<Market>("US");
  const [query, setQuery] = useState("Apple");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedStock, setSelectedStock] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [avgPrice, setAvgPrice] = useState(100);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(localStorage.getItem(AUTO_REFRESH_STORAGE) !== "false");
  const [quotePreview, setQuotePreview] = useState<Quote | null>(null);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem(AUTO_REFRESH_STORAGE, String(autoRefresh));
  }, [autoRefresh]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  useEffect(() => {
    refreshPrices();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = window.setInterval(() => {
      refreshPrices();
    }, QUOTE_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [autoRefresh, holdings]);

  useEffect(() => {
    setQuery(market === "KR" ? "삼성전자" : "Apple");
    setSearchResults([]);
    setSelectedStock(null);
    setQuotePreview(null);
    setSearchError("");
  }, [market]);

  const liveHoldings = holdings.filter((item) => item.quoteState === "live");
  const totals = useMemo(() => {
    return liveHoldings.reduce(
      (acc, item) => {
        const invested = item.quantity * item.avgPrice;
        const value = item.quantity * item.price;
        acc.invested += toUsd(invested, item.market);
        acc.value += toUsd(value, item.market);
        acc.krwValue += toKrw(value, item.market);
        return acc;
      },
      { invested: 0, value: 0, krwValue: 0 }
    );
  }, [liveHoldings]);

  const profit = totals.value - totals.invested;
  const profitPercent = totals.invested ? (profit / totals.invested) * 100 : 0;
  const best = liveHoldings.reduce<Holding | null>((top, item) => (!top || item.changePercent > top.changePercent ? item : top), null);

  async function refreshPrices() {
    if (!holdings.length) return;
    setStatus("loading");

    let hasError = false;
    const updated = await Promise.all(
      holdings.map(async (item) => {
        try {
          const quote = await fetchQuote(item.symbol, item.market, item.name);
          return {
            ...item,
            ...quote,
            quoteState: "live" as const,
            errorMessage: undefined
          };
        } catch (error) {
          hasError = true;
          return {
            ...item,
            quoteState: "error" as const,
            errorMessage: error instanceof Error ? error.message : "실시간 시세를 조회할 수 없습니다."
          };
        }
      })
    );

    setHoldings(updated);
    setStatus(hasError ? "error" : "success");
  }

  async function runSearch(event?: React.FormEvent, nextQuery?: string) {
    event?.preventDefault();
    const trimmed = (nextQuery || query).trim();
    setSearchError("");
    setSearchResults([]);
    setSelectedStock(null);
    setQuotePreview(null);

    if (trimmed.length < 1) {
      setSearchError("회사명이나 종목코드를 입력하세요.");
      return;
    }

    try {
      const results = await searchSymbols(trimmed, market);
      if (!results.length) {
        setSearchError("검색 결과가 없습니다.");
        return;
      }
      setSearchResults(results);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "종목 검색에 실패했습니다.");
    }
  }

  async function selectStock(result: SearchResult) {
    setSelectedStock(result);
    setSearchError("");
    setQuotePreview(null);
    setStatus("loading");

    try {
      const quote = await fetchQuote(result.symbol, result.market, result.name);
      setQuotePreview(quote);
      setAvgPrice(quote.price);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setSearchError(error instanceof Error ? error.message : "이 종목은 실시간 시세를 사용할 수 없습니다.");
    }
  }

  async function addHolding(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedStock || !quotePreview) {
      setSearchError("검색 결과에서 실시간 조회가 성공한 종목을 먼저 선택하세요.");
      return;
    }

    setHoldings((items) => [
      {
        id: uid(),
        market: quotePreview.market,
        symbol: quotePreview.symbol,
        name: quotePreview.name || selectedStock.name,
        quantity: Math.max(0, Number(quantity)),
        avgPrice: Math.max(0, Number(avgPrice)),
        price: quotePreview.price,
        open: quotePreview.open,
        high: quotePreview.high,
        low: quotePreview.low,
        previousClose: quotePreview.previousClose,
        changePercent: quotePreview.changePercent,
        lastUpdated: quotePreview.lastUpdated,
        provider: quotePreview.provider,
        quoteState: "live"
      },
      ...items
    ]);
    setStatus("success");
    setQuery(market === "KR" ? "삼성전자" : "Microsoft");
    setSearchResults([]);
    setSelectedStock(null);
    setQuotePreview(null);
    setActiveTab("portfolio");
  }

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <p className="eyebrow">Live US/KR Stock PWA</p>
          <h1>MyStock Lab</h1>
          <p className="subtitle">미국 주식은 Finnhub, 국내 주식은 Twelve Data KRX API로 조회해 실시간 확인 종목만 추가합니다.</p>
        </div>
        <button className="installButton" onClick={installApp} disabled={!installPrompt} title="홈 화면에 설치">
          <Download size={18} />
          설치
        </button>
      </section>

      <section className="summaryGrid">
        <article className="summaryCard primary">
          <div className="cardLabel">
            <WalletCards size={16} />
            총 평가금액
          </div>
          <strong>{usd(totals.value)}</strong>
          <span>원화 환산 {krw(totals.krwValue)}</span>
        </article>
        <article className="summaryCard">
          <div className="cardLabel">
            {profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            총 손익
          </div>
          <strong className={profit >= 0 ? "gain" : "loss"}>{usd(profit)}</strong>
          <span className={profit >= 0 ? "gain" : "loss"}>{profitPercent.toFixed(2)}%</span>
        </article>
        <article className="summaryCard">
          <div className="cardLabel">
            <Activity size={16} />
            오늘의 강세
          </div>
          <strong>{best ? best.symbol : "-"}</strong>
          <span className={best && best.changePercent >= 0 ? "gain" : "loss"}>{best ? `${best.changePercent.toFixed(2)}%` : "시세 대기"}</span>
        </article>
      </section>

      <nav className="tabs" aria-label="앱 메뉴">
        <button className={activeTab === "portfolio" ? "active" : ""} onClick={() => setActiveTab("portfolio")}>
          <LineChart size={17} />
          포트폴리오
        </button>
        <button className={activeTab === "add" ? "active" : ""} onClick={() => setActiveTab("add")}>
          <Plus size={17} />
          종목 추가
        </button>
        <button className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")}>
          <Settings size={17} />
          API/PWA
        </button>
      </nav>

      {activeTab === "portfolio" && (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>실시간 포트폴리오</h2>
              <p>{statusMessage(status)}</p>
            </div>
            <button className="iconButton" onClick={refreshPrices} title="실시간 가격 새로고침">
              <RefreshCcw size={18} />
            </button>
          </div>
          <div className="holdings">
            {holdings.map((item) => (
              <HoldingCard key={item.id} item={item} onDelete={() => setHoldings((items) => items.filter((candidate) => candidate.id !== item.id))} />
            ))}
          </div>
        </section>
      )}

      {activeTab === "add" && (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>회사명으로 종목 추가</h2>
              <p>시장 선택 후 검색 결과에서 실시간 API 조회가 성공한 종목만 추가할 수 있습니다.</p>
            </div>
          </div>
          <form className="formGrid" onSubmit={addHolding}>
            <div className="marketSwitch" role="group" aria-label="시장 선택">
              <button type="button" className={market === "US" ? "selected" : ""} onClick={() => setMarket("US")}>
                미국 주식
              </button>
              <button type="button" className={market === "KR" ? "selected" : ""} onClick={() => setMarket("KR")}>
                국내 주식
              </button>
            </div>
            <div className="quoteSearch">
              <label>
                회사명 또는 종목코드
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Apple, 삼성전자, AAPL, 005930" />
              </label>
              <button className="lookupButton" type="button" onClick={() => runSearch()}>
                <Search size={17} />
                검색
              </button>
            </div>
            <div className="quickSymbols">
              {popularQueries[market].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    runSearch(undefined, item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            {searchResults.length > 0 && (
              <div className="searchResults">
                {searchResults.map((result) => (
                  <button
                    key={`${result.market}-${result.symbol}-${result.name}`}
                    className={selectedStock?.symbol === result.symbol && selectedStock?.market === result.market ? "selected" : ""}
                    type="button"
                    onClick={() => selectStock(result)}
                  >
                    <strong>{result.symbol}</strong>
                    <span>
                      {result.name} · {marketLabel[result.market]}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {quotePreview && (
              <article className="quotePreview">
                <div>
                  <span>{quotePreview.provider} 시세 확인</span>
                  <strong>{quotePreview.name}</strong>
                </div>
                <div>
                  <span>현재가</span>
                  <strong>{money(quotePreview.price, quotePreview.market)}</strong>
                </div>
                <div>
                  <span>변동률</span>
                  <strong className={quotePreview.changePercent >= 0 ? "gain" : "loss"}>{quotePreview.changePercent.toFixed(2)}%</strong>
                </div>
              </article>
            )}
            {searchError && <p className="formNotice">{searchError}</p>}
            <label>
              보유 수량
              <input type="number" min="0" step="0.01" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
            </label>
            <label>
              평균 매수가
              <input type="number" min="0" step="0.01" value={avgPrice} onChange={(event) => setAvgPrice(Number(event.target.value))} />
            </label>
            <article className="tradeTicket">
              <span>예상 매수 원금</span>
              <strong>{money(Number(quantity) * Number(avgPrice || 0), market)}</strong>
              <span>현재가 기준 평가금액</span>
              <strong>{quotePreview ? money(Number(quantity) * quotePreview.price, quotePreview.market) : money(0, market)}</strong>
            </article>
            <button className="primaryButton" type="submit" disabled={!quotePreview}>
              <Plus size={18} />
              실시간 확인 종목 추가
            </button>
          </form>
        </section>
      )}

      {activeTab === "settings" && (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>API와 설치</h2>
              <p>미국/국내 주식 모두 데모 가격 없이 서버리스 API가 반환한 시세만 사용합니다.</p>
            </div>
          </div>
          <div className="settingsList">
            <article className="note">
              <CheckCircle2 size={18} />
              <div>
                <strong>필요한 Vercel 환경변수</strong>
                <p><code>FINNHUB_API_KEY</code>는 미국 주식, <code>TWELVE_DATA_API_KEY</code>는 국내 KRX 조회에 사용합니다.</p>
              </div>
            </article>
            <label className="toggleRow">
              <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
              <span>1분마다 자동으로 실시간 가격 새로고침</span>
            </label>
            <article className="note">
              <BarChart3 size={18} />
              <div>
                <strong>추가 가능한 종목</strong>
                <p>검색 후 quote 조회가 성공한 종목만 포트폴리오에 들어갑니다. 조회 실패 종목은 추가되지 않습니다.</p>
              </div>
            </article>
            <article className="note">
              <Smartphone size={18} />
              <div>
                <strong>PWA 설치</strong>
                <p>Vercel 배포 후 아이폰 Safari에서 접속해 홈 화면에 추가하면 앱 아이콘처럼 실행됩니다.</p>
              </div>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}

function HoldingCard({ item, onDelete }: { item: Holding; onDelete: () => void }) {
  const isLive = item.quoteState === "live";
  const value = isLive ? item.quantity * item.price : 0;
  const invested = item.quantity * item.avgPrice;
  const itemProfit = value - invested;
  const itemProfitPercent = invested && isLive ? (itemProfit / invested) * 100 : 0;

  return (
    <article className={`holdingCard ${item.quoteState === "error" ? "hasError" : ""}`}>
      <div className="stockTop">
        <div className="symbolBadge">{item.market}</div>
        <div>
          <h3>{item.symbol}</h3>
          <p>
            {item.name} · {quoteStateLabel(item.quoteState)}
          </p>
        </div>
        <button className="deleteButton" onClick={onDelete} title="종목 삭제">
          <Trash2 size={17} />
        </button>
      </div>
      <div className="miniChart" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            style={{
              height: `${26 + Math.abs(Math.sin(index + Math.max(item.price, 1) / 13)) * 50}%`
            }}
          />
        ))}
      </div>
      <div className="stockNumbers">
        <div>
          <span>현재가</span>
          <strong>{isLive ? money(item.price, item.market) : "-"}</strong>
        </div>
        <div>
          <span>평가금액</span>
          <strong>{isLive ? money(value, item.market) : "-"}</strong>
        </div>
        <div>
          <span>손익률</span>
          <strong className={itemProfit >= 0 ? "gain" : "loss"}>{isLive ? `${itemProfitPercent.toFixed(2)}%` : "-"}</strong>
        </div>
        <div>
          <span>업데이트</span>
          <strong>{formatUpdateTime(item.lastUpdated)}</strong>
        </div>
      </div>
      {item.quoteState === "error" && (
        <p className="quoteError">
          <AlertCircle size={15} />
          {item.errorMessage}
        </p>
      )}
    </article>
  );
}

function quoteStateLabel(state: QuoteState) {
  if (state === "live") return "실시간 시세";
  if (state === "error") return "조회 실패";
  return "시세 조회 중";
}

function statusMessage(status: ApiStatus) {
  if (status === "loading") return "실시간 가격을 불러오는 중입니다.";
  if (status === "success") return "실시간 가격을 반영했습니다.";
  if (status === "error") return "일부 종목의 실시간 조회에 실패했습니다.";
  return "새로고침 버튼으로 실시간 가격을 업데이트하세요.";
}

function formatUpdateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

createRoot(document.getElementById("root")!).render(<App />);
