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

type Holding = {
  id: string;
  market: Market;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  price: number;
  changePercent: number;
  lastUpdated?: string;
  quoteState: QuoteState;
  errorMessage?: string;
};

type Quote = {
  name: string;
  price: number;
  changePercent: number;
  lastUpdated: string;
};

const STORAGE_KEY = "mystock-lab-live-holdings-v2";
const AUTO_REFRESH_STORAGE = "mystock-lab-auto-refresh";
const QUOTE_REFRESH_MS = 60_000;
const USD_KRW_RATE = 1350;

const seedHoldings: Holding[] = [
  createSeedHolding("US", "AAPL", "Apple", 3, 183),
  createSeedHolding("US", "NVDA", "NVIDIA", 2, 112),
  createSeedHolding("US", "MSFT", "Microsoft", 1, 420)
];

const popularSymbols: Record<Market, string[]> = {
  US: ["AAPL", "MSFT", "NVDA", "TSLA", "GOOGL", "AMZN", "META"],
  KR: ["005930", "000660", "035420", "005380", "068270"]
};

const marketLabels: Record<Market, string> = {
  US: "미국 주식",
  KR: "국내 주식"
};

function createSeedHolding(market: Market, symbol: string, name: string, quantity: number, avgPrice: number): Holding {
  return {
    id: `seed-${symbol}`,
    market,
    symbol,
    name,
    quantity,
    avgPrice,
    price: 0,
    changePercent: 0,
    quoteState: "pending"
  };
}

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

function loadHoldings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return seedHoldings;

  try {
    const parsed = JSON.parse(stored) as Partial<Holding>[];
    if (!Array.isArray(parsed) || !parsed.length) return seedHoldings;

    return parsed
      .filter((item) => item.symbol && item.market)
      .map((item) => ({
        id: item.id || uid(),
        market: item.market as Market,
        symbol: String(item.symbol).toUpperCase(),
        name: item.name || String(item.symbol).toUpperCase(),
        quantity: Number(item.quantity || 0),
        avgPrice: Number(item.avgPrice || 0),
        price: item.quoteState === "live" ? Number(item.price || 0) : 0,
        changePercent: item.quoteState === "live" ? Number(item.changePercent || 0) : 0,
        lastUpdated: item.quoteState === "live" ? item.lastUpdated : undefined,
        quoteState: item.quoteState === "live" ? "live" : "pending",
        errorMessage: undefined
      }));
  } catch {
    return seedHoldings;
  }
}

async function fetchQuote(symbol: string, market: Market): Promise<Quote> {
  const url = new URL("/api/quote", window.location.origin);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("market", market);

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || typeof data.price !== "number") {
    throw new Error(data.error || "실시간 시세를 조회할 수 없습니다.");
  }

  return {
    name: data.name || symbol,
    price: Number(data.price),
    changePercent: Number(data.changePercent || 0),
    lastUpdated: data.lastUpdated || new Date().toISOString()
  };
}

function App() {
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings);
  const [status, setStatus] = useState<ApiStatus>("idle");
  const [activeTab, setActiveTab] = useState<"portfolio" | "add" | "settings">("portfolio");
  const [market, setMarket] = useState<Market>("US");
  const [symbol, setSymbol] = useState("AAPL");
  const [quantity, setQuantity] = useState(1);
  const [avgPrice, setAvgPrice] = useState(100);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(localStorage.getItem(AUTO_REFRESH_STORAGE) !== "false");
  const [quotePreview, setQuotePreview] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");

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
    setQuotePreview(null);
    setQuoteError("");
  }, [market, symbol]);

  const liveHoldings = holdings.filter((item) => item.quoteState === "live");
  const totals = useMemo(() => {
    return liveHoldings.reduce(
      (acc, item) => {
        const invested = item.quantity * item.avgPrice;
        const value = item.quantity * item.price;
        acc.invested += item.market === "KR" ? invested / USD_KRW_RATE : invested;
        acc.value += item.market === "KR" ? value / USD_KRW_RATE : value;
        acc.krwValue += item.market === "KR" ? value : value * USD_KRW_RATE;
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
          const quote = await fetchQuote(item.symbol, item.market);
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

  async function previewQuote() {
    setStatus("loading");
    setQuoteError("");
    setQuotePreview(null);
    const normalized = symbol.trim().toUpperCase();

    if (!normalized) {
      setQuoteError("종목 코드를 입력하세요.");
      setStatus("error");
      return;
    }

    try {
      const quote = await fetchQuote(normalized, market);
      setQuotePreview(quote);
      setAvgPrice(quote.price);
      setStatus("success");
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : "실시간 시세를 조회할 수 없습니다.");
      setStatus("error");
    }
  }

  async function addHolding(event: React.FormEvent) {
    event.preventDefault();
    setQuoteError("");
    const normalized = symbol.trim().toUpperCase();

    try {
      const quote = quotePreview || (await fetchQuote(normalized, market));
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
          lastUpdated: quote.lastUpdated,
          quoteState: "live"
        },
        ...items
      ]);
      setStatus("success");
      setSymbol(market === "US" ? "MSFT" : "000660");
      setQuotePreview(null);
      setActiveTab("portfolio");
    } catch (error) {
      setStatus("error");
      setQuoteError(error instanceof Error ? error.message : "실시간 시세 확인 후 추가할 수 있습니다.");
    }
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
          <p className="eyebrow">Live Stock PWA</p>
          <h1>MyStock Lab</h1>
          <p className="subtitle">실시간 API 시세가 확인된 종목만 포트폴리오에 담아 관리하는 개인 주식 앱</p>
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
          <span>실시간 반영 종목 {liveHoldings.length}개</span>
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
              <h2>실시간 종목 추가</h2>
              <p>API 조회가 성공한 종목만 포트폴리오에 추가할 수 있습니다.</p>
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
                실시간 조회
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
                  <span>실시간 시세 확인</span>
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
              <strong>{currency(Number(quantity) * (quotePreview?.price || 0), market)}</strong>
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
              <p>이 앱은 데모 가격 없이 Vercel 서버리스 API가 반환한 실제 시세만 사용합니다.</p>
            </div>
          </div>
          <div className="settingsList">
            <article className="note">
              <CheckCircle2 size={18} />
              <div>
                <strong>실시간 전용 모드</strong>
                <p>앱은 <code>/api/quote</code>를 호출하고, Vercel 환경변수 <code>TWELVE_DATA_API_KEY</code>로 Twelve Data 시세만 조회합니다.</p>
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
                <p>종목 추가 전에 실시간 조회가 성공해야 합니다. 조회 실패 종목은 포트폴리오에 추가되지 않습니다.</p>
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
          <strong>{isLive ? currency(item.price, item.market) : "-"}</strong>
        </div>
        <div>
          <span>평가금액</span>
          <strong>{isLive ? currency(value, item.market) : "-"}</strong>
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
  if (status === "success") return "모든 가능한 종목의 실시간 가격을 반영했습니다.";
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
