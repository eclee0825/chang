import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BarChart3,
  Download,
  Globe2,
  LineChart,
  Plus,
  RefreshCcw,
  Settings,
  Smartphone,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards
} from "lucide-react";
import "./styles.css";

type Market = "US" | "KR";

type Holding = {
  id: string;
  market: Market;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  price: number;
  changePercent: number;
  source?: "api" | "demo";
  lastUpdated?: string;
};

type ApiStatus = "idle" | "loading" | "success" | "fallback" | "error";

const STORAGE_KEY = "mystock-lab-holdings";
const API_KEY_STORAGE = "mystock-lab-twelvedata-key";
const AUTO_REFRESH_STORAGE = "mystock-lab-auto-refresh";
const QUOTE_REFRESH_MS = 60_000;

const seedHoldings: Holding[] = [
  {
    id: "seed-aapl",
    market: "US",
    symbol: "AAPL",
    name: "Apple",
    quantity: 3,
    avgPrice: 183,
    price: 196.58,
    changePercent: 0.74,
    source: "demo"
  },
  {
    id: "seed-nvda",
    market: "US",
    symbol: "NVDA",
    name: "NVIDIA",
    quantity: 2,
    avgPrice: 112,
    price: 141.22,
    changePercent: 1.42,
    source: "demo"
  },
  {
    id: "seed-005930",
    market: "KR",
    symbol: "005930",
    name: "삼성전자",
    quantity: 5,
    avgPrice: 72000,
    price: 78100,
    changePercent: -0.28,
    source: "demo"
  }
];

const demoPrices: Record<string, { name: string; price: number; changePercent: number }> = {
  AAPL: { name: "Apple", price: 196.58, changePercent: 0.74 },
  MSFT: { name: "Microsoft", price: 478.87, changePercent: 0.42 },
  NVDA: { name: "NVIDIA", price: 141.22, changePercent: 1.42 },
  TSLA: { name: "Tesla", price: 183.71, changePercent: -1.08 },
  GOOGL: { name: "Alphabet", price: 176.2, changePercent: 0.35 },
  "005930": { name: "삼성전자", price: 78100, changePercent: -0.28 },
  "000660": { name: "SK하이닉스", price: 201500, changePercent: 1.12 },
  "035420": { name: "NAVER", price: 188400, changePercent: -0.64 },
  "005380": { name: "현대차", price: 246000, changePercent: 0.56 }
};

const popularSymbols: Record<Market, string[]> = {
  US: ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL"],
  KR: ["005930", "000660", "035420", "005380"]
};

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function currency(value: number, market?: Market) {
  return new Intl.NumberFormat(market === "KR" ? "ko-KR" : "en-US", {
    style: "currency",
    currency: market === "KR" ? "KRW" : "USD",
    maximumFractionDigits: market === "KR" ? 0 : 2
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value);
}

function loadHoldings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return seedHoldings;

  try {
    const parsed = JSON.parse(stored) as Holding[];
    return Array.isArray(parsed) && parsed.length ? parsed : seedHoldings;
  } catch {
    return seedHoldings;
  }
}

async function fetchQuote(symbol: string, market: Market, apiKey: string) {
  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", market === "KR" ? `${symbol}:KRX` : symbol);
  url.searchParams.set("interval", "1min");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url);
  if (!response.ok) throw new Error("quote request failed");

  const data = await response.json();
  if (data.status === "error" || !data.close) throw new Error(data.message || "quote unavailable");

  return {
    name: data.name || symbol,
    price: Number(data.close),
    changePercent: Number(data.percent_change || 0),
    source: "api" as const,
    lastUpdated: data.datetime || new Date().toISOString()
  };
}

function fallbackQuote(symbol: string) {
  const normalized = symbol.toUpperCase().trim();
  const base = demoPrices[normalized] || {
    name: normalized,
    price: normalized.match(/^\d+$/) ? 50000 : 100,
    changePercent: 0
  };
  const drift = 1 + (Math.random() - 0.5) * 0.035;
  return {
    ...base,
    price: Math.max(1, Math.round(base.price * drift * 100) / 100),
    changePercent: Math.round((base.changePercent + (Math.random() - 0.5) * 1.3) * 100) / 100,
    source: "demo" as const,
    lastUpdated: new Date().toISOString()
  };
}

function App() {
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings);
  const [apiKey, setApiKey] = useState(localStorage.getItem(API_KEY_STORAGE) || "");
  const [status, setStatus] = useState<ApiStatus>("idle");
  const [activeTab, setActiveTab] = useState<"portfolio" | "add" | "settings">("portfolio");
  const [market, setMarket] = useState<Market>("US");
  const [symbol, setSymbol] = useState("AAPL");
  const [quantity, setQuantity] = useState(1);
  const [avgPrice, setAvgPrice] = useState(100);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(localStorage.getItem(AUTO_REFRESH_STORAGE) !== "false");
  const [quotePreview, setQuotePreview] = useState<ReturnType<typeof fallbackQuote> | null>(null);
  const [quoteError, setQuoteError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem(API_KEY_STORAGE, apiKey);
  }, [apiKey]);

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
    if (!apiKey || !autoRefresh) return;

    const timer = window.setInterval(() => {
      refreshPrices();
    }, QUOTE_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [apiKey, autoRefresh, holdings]);

  useEffect(() => {
    setQuotePreview(null);
    setQuoteError("");
  }, [market, symbol]);

  const totals = useMemo(() => {
    return holdings.reduce(
      (acc, item) => {
        const invested = item.quantity * item.avgPrice;
        const value = item.quantity * item.price;
        acc.invested += item.market === "KR" ? invested / 1350 : invested;
        acc.value += item.market === "KR" ? value / 1350 : value;
        acc.krwValue += item.market === "KR" ? value : value * 1350;
        return acc;
      },
      { invested: 0, value: 0, krwValue: 0 }
    );
  }, [holdings]);

  const profit = totals.value - totals.invested;
  const profitPercent = totals.invested ? (profit / totals.invested) * 100 : 0;
  const best = holdings.reduce<Holding | null>((top, item) => (!top || item.changePercent > top.changePercent ? item : top), null);

  async function refreshPrices() {
    setStatus("loading");

    let usedApi = false;
    let usedFallback = false;
    const updated = await Promise.all(
      holdings.map(async (item) => {
        try {
          if (apiKey) {
            const quote = await fetchQuote(item.symbol, item.market, apiKey);
            usedApi = true;
            return { ...item, ...quote };
          }
          usedFallback = true;
          return { ...item, ...fallbackQuote(item.symbol) };
        } catch {
          usedFallback = true;
          return { ...item, ...fallbackQuote(item.symbol) };
        }
      })
    );

    setHoldings(updated);
    setStatus(usedApi && !usedFallback ? "success" : "fallback");
  }

  async function previewQuote() {
    setStatus("loading");
    setQuoteError("");
    const normalized = symbol.trim().toUpperCase();

    try {
      const quote = apiKey ? await fetchQuote(normalized, market, apiKey) : fallbackQuote(normalized);
      setQuotePreview(quote);
      setAvgPrice(quote.price);
      setStatus(apiKey ? "success" : "fallback");
    } catch {
      const quote = fallbackQuote(normalized);
      setQuotePreview(quote);
      setAvgPrice(quote.price);
      setQuoteError("API 조회에 실패해 데모 가격을 표시했습니다.");
      setStatus("fallback");
    }
  }

  async function addHolding(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    const normalized = symbol.trim().toUpperCase();

    let quote = quotePreview || fallbackQuote(normalized);
    try {
      if (apiKey && !quotePreview) {
        quote = await fetchQuote(normalized, market, apiKey);
        setStatus("success");
      } else {
        setStatus(quote.source === "api" ? "success" : "fallback");
      }
    } catch {
      setStatus("fallback");
    }

    setHoldings((items) => [
      {
        id: uid(),
        market,
        symbol: normalized,
        name: quote.name,
        quantity: Math.max(0, Number(quantity)),
        avgPrice: Math.max(0, Number(avgPrice)),
        price: quote.price,
        changePercent: quote.changePercent,
        source: quote.source,
        lastUpdated: quote.lastUpdated
      },
      ...items
    ]);
    setSymbol(market === "US" ? "MSFT" : "000660");
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
          <p className="eyebrow">PWA Stock Portfolio</p>
          <h1>MyStock Lab</h1>
          <p className="subtitle">관심 종목, 모의 수익률, 모바일 설치까지 한 번에 실습하는 개인 주식 앱</p>
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
          <strong>{currency(totals.krwValue, "KR")}</strong>
          <span>USD 환산 {currency(totals.value, "US")}</span>
        </article>
        <article className="summaryCard">
          <div className="cardLabel">
            {profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            총 손익
          </div>
          <strong className={profit >= 0 ? "gain" : "loss"}>{currency(profit, "US")}</strong>
          <span className={profit >= 0 ? "gain" : "loss"}>{profitPercent.toFixed(2)}%</span>
        </article>
        <article className="summaryCard">
          <div className="cardLabel">
            <Activity size={16} />
            오늘의 강세
          </div>
          <strong>{best ? best.symbol : "-"}</strong>
          <span className={best && best.changePercent >= 0 ? "gain" : "loss"}>
            {best ? `${best.changePercent.toFixed(2)}%` : "0.00%"}
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
            <h2>관심 종목</h2>
            <p>{statusMessage(status)}</p>
          </div>
            <button className="iconButton" onClick={refreshPrices} title="가격 새로고침">
              <RefreshCcw size={18} />
            </button>
          </div>
          <div className="holdings">
            {holdings.map((item) => {
              const value = item.quantity * item.price;
              const invested = item.quantity * item.avgPrice;
              const itemProfit = value - invested;
              const itemProfitPercent = invested ? (itemProfit / invested) * 100 : 0;

              return (
                <article className="holdingCard" key={item.id}>
                  <div className="stockTop">
                    <div className="symbolBadge">{item.market}</div>
                    <div>
                      <h3>{item.symbol}</h3>
                      <p>
                        {item.name} · {item.source === "api" ? "실제 시세" : "데모 시세"}
                      </p>
                    </div>
                    <button
                      className="deleteButton"
                      onClick={() => setHoldings((items) => items.filter((candidate) => candidate.id !== item.id))}
                      title="종목 삭제"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <div className="miniChart" aria-hidden="true">
                    {Array.from({ length: 18 }).map((_, index) => (
                      <span
                        key={index}
                        style={{
                          height: `${26 + Math.abs(Math.sin(index + item.price / 13)) * 50}%`
                        }}
                      />
                    ))}
                  </div>
                  <div className="stockNumbers">
                    <div>
                      <span>현재가</span>
                      <strong>{currency(item.price, item.market)}</strong>
                    </div>
                    <div>
                      <span>평가금액</span>
                      <strong>{currency(value, item.market)}</strong>
                    </div>
                    <div>
                      <span>손익률</span>
                      <strong className={itemProfit >= 0 ? "gain" : "loss"}>{itemProfitPercent.toFixed(2)}%</strong>
                    </div>
                    <div>
                      <span>업데이트</span>
                      <strong>{formatUpdateTime(item.lastUpdated)}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "add" && (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>종목 추가</h2>
              <p>종목을 먼저 조회한 뒤 실제 증권앱처럼 보유 수량과 평균 매수가를 입력합니다.</p>
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
                종목 검색
                <input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="AAPL 또는 005930" />
              </label>
              <button className="lookupButton" type="button" onClick={previewQuote}>
                <RefreshCcw size={17} />
                현재가 조회
              </button>
            </div>
            <div className="quickSymbols">
              {popularSymbols[market].map((item) => (
                <button key={item} type="button" onClick={() => setSymbol(item)}>
                  {item}
                </button>
              ))}
            </div>
            {quotePreview && (
              <article className="quotePreview">
                <div>
                  <span>{quotePreview.source === "api" ? "실제 시세" : "데모 시세"}</span>
                  <strong>{quotePreview.name}</strong>
                </div>
                <div>
                  <span>현재가</span>
                  <strong>{currency(quotePreview.price, market)}</strong>
                </div>
                <div>
                  <span>변동률</span>
                  <strong className={quotePreview.changePercent >= 0 ? "gain" : "loss"}>{quotePreview.changePercent.toFixed(2)}%</strong>
                </div>
              </article>
            )}
            {quoteError && <p className="formNotice">{quoteError}</p>}
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
              <strong>{currency(Number(quantity) * Number(avgPrice || 0), market)}</strong>
              <span>현재가 기준 평가금액</span>
              <strong>{currency(Number(quantity) * (quotePreview?.price || avgPrice || 0), market)}</strong>
            </article>
            <button className="primaryButton" type="submit">
              <Plus size={18} />
              내 포트폴리오에 추가
            </button>
          </form>
        </section>
      )}

      {activeTab === "settings" && (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>API와 설치</h2>
              <p>수업에서는 데모 모드로 완성한 뒤, API 키를 넣어 미국 주식 조회를 확장합니다.</p>
            </div>
          </div>
          <div className="settingsList">
            <label>
              Twelve Data API Key
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="브라우저 실습용 키를 입력하세요"
                autoComplete="off"
              />
            </label>
            <article className="note">
              <Globe2 size={18} />
              <div>
                <strong>실제 시세 업데이트</strong>
                <p>Twelve Data API Key가 있으면 미국 주식과 KRX 심볼을 실제 조회하고, 실패한 종목은 데모 가격으로 유지합니다.</p>
              </div>
            </article>
            <label className="toggleRow">
              <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
              <span>1분마다 자동으로 가격 새로고침</span>
            </label>
            <article className="note">
              <BarChart3 size={18} />
              <div>
                <strong>국내 주식</strong>
                <p>Twelve Data에서는 삼성전자처럼 <code>005930:KRX</code> 형식으로 조회를 시도합니다. 플랜/지원 범위에 따라 데모 가격으로 전환될 수 있습니다.</p>
              </div>
            </article>
            <article className="note">
              <Smartphone size={18} />
              <div>
                <strong>PWA 설치</strong>
                <p>Vercel 배포 후 스마트폰 브라우저에서 접속해 홈 화면에 추가하면 앱 아이콘처럼 실행됩니다.</p>
              </div>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}

function statusMessage(status: ApiStatus) {
  if (status === "loading") return "가격을 불러오는 중입니다.";
  if (status === "success") return "API 가격을 반영했습니다.";
  if (status === "fallback") return "일부 종목은 데모 가격으로 업데이트했습니다.";
  if (status === "error") return "조회에 실패했습니다.";
  return "새로고침 버튼으로 가격을 업데이트하세요.";
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
