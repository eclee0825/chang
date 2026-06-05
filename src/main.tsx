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

type QuoteState = "pending" | "live" | "error";
type ApiStatus = "idle" | "loading" | "success" | "error";

type SearchResult = {
  symbol: string;
  name: string;
  type: string;
  provider: string;
};

type Quote = {
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
  quoteState: QuoteState;
  errorMessage?: string;
};

const STORAGE_KEY = "mystock-lab-finnhub-live-us-v1";
const AUTO_REFRESH_STORAGE = "mystock-lab-auto-refresh";
const QUOTE_REFRESH_MS = 60_000;
const USD_KRW_RATE = 1350;

const seedHoldings: Holding[] = [
  createSeedHolding("AAPL", "Apple Inc", 3, 183),
  createSeedHolding("NVDA", "NVIDIA Corp", 2, 112),
  createSeedHolding("MSFT", "Microsoft Corp", 1, 420)
];

const popularSymbols = ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META"];

function createSeedHolding(symbol: string, name: string, quantity: number, avgPrice: number): Holding {
  return {
    id: `seed-${symbol}`,
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
        quoteState: item.quoteState === "live" ? "live" : "pending",
        errorMessage: undefined
      }));
  } catch {
    return seedHoldings;
  }
}

async function searchSymbols(query: string): Promise<SearchResult[]> {
  const url = new URL("/api/search", window.location.origin);
  url.searchParams.set("q", query);

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !Array.isArray(data.results)) {
    throw new Error(data.error || "회사명 검색에 실패했습니다.");
  }

  return data.results;
}

async function fetchQuote(symbol: string, name?: string): Promise<Quote> {
  const url = new URL("/api/quote", window.location.origin);
  url.searchParams.set("symbol", symbol);
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

  const liveHoldings = holdings.filter((item) => item.quoteState === "live");
  const totals = useMemo(() => {
    return liveHoldings.reduce(
      (acc, item) => {
        const invested = item.quantity * item.avgPrice;
        const value = item.quantity * item.price;
        acc.invested += invested;
        acc.value += value;
        acc.krwValue += value * USD_KRW_RATE;
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
          const quote = await fetchQuote(item.symbol, item.name);
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

    if (trimmed.length < 2) {
      setSearchError("회사명이나 티커를 2글자 이상 입력하세요.");
      return;
    }

    try {
      const results = await searchSymbols(trimmed);
      if (!results.length) {
        setSearchError("검색 결과가 없습니다.");
        return;
      }
      setSearchResults(results);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "회사명 검색에 실패했습니다.");
    }
  }

  async function selectStock(result: SearchResult) {
    setSelectedStock(result);
    setSearchError("");
    setQuotePreview(null);
    setStatus("loading");

    try {
      const quote = await fetchQuote(result.symbol, result.name);
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
        quoteState: "live"
      },
      ...items
    ]);
    setStatus("success");
    setQuery("Microsoft");
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
          <p className="eyebrow">Finnhub Live US Stocks</p>
          <h1>MyStock Lab</h1>
          <p className="subtitle">회사명으로 미국 주식을 검색하고, 실시간 quote가 확인된 종목만 포트폴리오에 추가합니다.</p>
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
          <span className={best && best.changePercent >= 0 ? "gain" : "loss"}>
            {best ? `${best.changePercent.toFixed(2)}%` : "시세 대기"}
          </span>
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
              <p>Finnhub 검색 결과에서 실시간 quote가 성공한 미국 주식만 추가할 수 있습니다.</p>
            </div>
          </div>
          <form className="formGrid" onSubmit={addHolding}>
            <div className="quoteSearch">
              <label>
                회사명 또는 티커
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Apple, Tesla, Microsoft, AAPL" />
              </label>
              <button className="lookupButton" type="button" onClick={() => runSearch()}>
                <Search size={17} />
                검색
              </button>
            </div>
            <div className="quickSymbols">
              {popularSymbols.map((item) => (
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
                    key={`${result.symbol}-${result.name}`}
                    className={selectedStock?.symbol === result.symbol ? "selected" : ""}
                    type="button"
                    onClick={() => selectStock(result)}
                  >
                    <strong>{result.symbol}</strong>
                    <span>{result.name}</span>
                  </button>
                ))}
              </div>
            )}
            {quotePreview && (
              <article className="quotePreview">
                <div>
                  <span>실시간 시세 확인</span>
                  <strong>{quotePreview.name}</strong>
                </div>
                <div>
                  <span>현재가</span>
                  <strong>{usd(quotePreview.price)}</strong>
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
              <strong>{usd(Number(quantity) * Number(avgPrice || 0))}</strong>
              <span>현재가 기준 평가금액</span>
              <strong>{usd(Number(quantity) * (quotePreview?.price || 0))}</strong>
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
              <p>이 앱은 데모 가격 없이 Finnhub 실시간 미국 주식 quote만 사용합니다.</p>
            </div>
          </div>
          <div className="settingsList">
            <article className="note">
              <CheckCircle2 size={18} />
              <div>
                <strong>필요한 Vercel 환경변수</strong>
                <p>Vercel 프로젝트에 <code>FINNHUB_API_KEY</code>를 추가해야 <code>/api/search</code>와 <code>/api/quote</code>가 동작합니다.</p>
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
                <p>회사명 검색 후 실시간 quote가 성공한 미국 주식만 포트폴리오에 들어갑니다. 조회 실패 종목은 추가되지 않습니다.</p>
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
        <div className="symbolBadge">US</div>
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
          <strong>{isLive ? usd(item.price) : "-"}</strong>
        </div>
        <div>
          <span>평가금액</span>
          <strong>{isLive ? usd(value) : "-"}</strong>
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
