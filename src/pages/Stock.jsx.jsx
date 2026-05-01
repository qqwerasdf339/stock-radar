import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";
import "../App.css";

const API_BASE = "https://stock-radar-api-os48.onrender.com";

const NAME_TO_CODE = {
  台積電: "2330",
  鴻海: "2317",
  聯發科: "2454",
  台達電: "2308",
  廣達: "2382",
  台灣50: "0050",
  元大台灣50: "0050",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveSymbol(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (NAME_TO_CODE[raw]) return NAME_TO_CODE[raw];

  const upper = raw.toUpperCase();
  if (upper.endsWith(".TW") || upper.endsWith(".TWO")) return upper;

  const code = upper.match(/\d{4}/)?.[0];
  if (code) return code;

  return upper;
}

function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchYahooHistory(input, range = "6mo", interval = "1d") {
  const symbol = resolveSymbol(input);
  if (!symbol) throw new Error("請輸入股票代碼或名稱");

  const url = `${API_BASE}/api/yahoo/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo 資料抓取失敗：${symbol}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`找不到股票資料：${symbol}`);

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const meta = result.meta || {};

  const history = timestamps
    .map((t, i) => ({
      time: new Date(t * 1000).toISOString().slice(0, 10),
      date: new Date(t * 1000).toLocaleDateString("zh-TW"),
      open: cleanNumber(quote.open?.[i]),
      high: cleanNumber(quote.high?.[i]),
      low: cleanNumber(quote.low?.[i]),
      close: cleanNumber(quote.close?.[i]),
      volume: cleanNumber(quote.volume?.[i]) || 0,
    }))
    .filter((x) => x.open && x.high && x.low && x.close);

  return {
    symbol,
    name: meta.longName || meta.shortName || symbol,
    currency: meta.currency || "TWD",
    regularMarketPrice: meta.regularMarketPrice || history.at(-1)?.close || null,
    history,
  };
}

function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let current = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    current = values[i] * k + current * (1 - k);
  }
  return current;
}

function calcRSI(closes, period = 14) {
  if (closes.length <= period) return null;
  let gains = 0;
  let losses = 0;
  const start = closes.length - period;
  for (let i = start; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calcMACD(closes) {
  if (closes.length < 35) return { dif: null, dea: null, hist: null };
  const difSeries = [];
  for (let i = 26; i <= closes.length; i++) {
    const part = closes.slice(0, i);
    const fast = ema(part, 12);
    const slow = ema(part, 26);
    if (fast !== null && slow !== null) difSeries.push(fast - slow);
  }
  const dif = difSeries.at(-1) ?? null;
  const dea = ema(difSeries, 9);
  const hist = dif !== null && dea !== null ? dif - dea : null;
  return { dif, dea, hist };
}

function calcKD(history, period = 9) {
  if (history.length < period) return { k: null, d: null, golden: false };
  let k = 50;
  let d = 50;
  let prevK = 50;
  let prevD = 50;

  history.forEach((_, index) => {
    if (index < period - 1) return;
    const slice = history.slice(index - period + 1, index + 1);
    const high = Math.max(...slice.map((x) => x.high));
    const low = Math.min(...slice.map((x) => x.low));
    const close = history[index].close;
    const rsv = high === low ? 50 : ((close - low) / (high - low)) * 100;
    prevK = k;
    prevD = d;
    k = (2 / 3) * k + (1 / 3) * rsv;
    d = (2 / 3) * d + (1 / 3) * k;
  });

  return { k, d, golden: prevK <= prevD && k > d };
}

function calcVolumeRatio(history) {
  if (history.length < 21) return null;
  const latestVol = history.at(-1)?.volume || 0;
  const avg20 = history.slice(-21, -1).reduce((sum, x) => sum + (x.volume || 0), 0) / 20;
  return avg20 ? latestVol / avg20 : null;
}

function backtestStrategy(history) {
  if (history.length < 60) {
    return { trades: 0, winRate: 0, totalReturn: 0, maxDrawdown: 0, equity: [] };
  }

  let inPosition = false;
  let entry = 0;
  let equity = 100;
  let peak = 100;
  let maxDrawdown = 0;
  let wins = 0;
  let trades = 0;
  const equityCurve = [];

  for (let i = 35; i < history.length; i++) {
    const slice = history.slice(0, i + 1);
    const closes = slice.map((x) => x.close);
    const ma5 = sma(closes, 5);
    const ma20 = sma(closes, 20);
    const rsi = calcRSI(closes);
    const macd = calcMACD(closes);
    const price = history[i].close;

    const buy = !inPosition && ma5 > ma20 && macd.hist > 0 && rsi > 45 && rsi < 72;
    const sell = inPosition && (ma5 < ma20 || rsi > 78 || macd.hist < 0);

    if (buy) {
      inPosition = true;
      entry = price;
    }

    if (sell) {
      const ret = ((price - entry) / entry) * 100;
      equity *= 1 + ret / 100;
      trades += 1;
      if (ret > 0) wins += 1;
      inPosition = false;
    }

    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, ((equity - peak) / peak) * 100);
    equityCurve.push({ time: history[i].time, value: Number(equity.toFixed(2)) });
  }

  return {
    trades,
    winRate: trades ? Math.round((wins / trades) * 100) : 0,
    totalReturn: Number((equity - 100).toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    equity: equityCurve,
  };
}

function analyzeStock(stock) {
  const { history } = stock;
  const closes = history.map((x) => x.close).filter(Boolean);
  const latest = history.at(-1);
  const prev = history.at(-2);
  const close = latest?.close || stock.regularMarketPrice || null;
  const changePct = prev?.close && close ? ((close - prev.close) / prev.close) * 100 : 0;

  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const kd = calcKD(history);
  const ma5 = sma(closes, 5);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const volumeRatio = calcVolumeRatio(history);
  const backtest = backtestStrategy(history);

  const high20 = Math.max(...history.slice(-20).map((x) => x.high));
  const low20 = Math.min(...history.slice(-20).map((x) => x.low));
  const breakout = close >= high20 * 0.98;
  const nearLow = close <= low20 * 1.05;
  const trendUp = ma5 !== null && ma20 !== null && ma5 > ma20;
  const longTrendUp = ma20 !== null && ma60 !== null && ma20 > ma60;
  const macdBull = macd.hist !== null && macd.hist > 0 && macd.dif > macd.dea;
  const rsiHealthy = rsi !== null && rsi >= 48 && rsi <= 70;
  const volumeHot = volumeRatio !== null && volumeRatio >= 1.25;
  const momentum = changePct > 0.5;

  let score = 0;
  if (trendUp) score += 16;
  if (longTrendUp) score += 12;
  if (macdBull) score += 16;
  if (kd.golden) score += 12;
  if (rsiHealthy) score += 12;
  if (volumeHot) score += 12;
  if (momentum) score += 8;
  if (breakout) score += 12;
  if (backtest.totalReturn > 5) score += 6;
  if (backtest.winRate >= 55) score += 4;
  if (changePct > 4) score -= 8;
  if (nearLow) score -= 6;
  if (rsi !== null && rsi > 78) score -= 14;

  const tags = [];
  if (trendUp) tags.push("短線多頭");
  if (longTrendUp) tags.push("中線多頭");
  if (macdBull) tags.push("MACD翻紅");
  if (kd.golden) tags.push("KD金叉");
  if (volumeHot) tags.push("放量");
  if (breakout) tags.push("接近突破");
  if (backtest.totalReturn > 0) tags.push("回測正報酬");

  let level = "偏弱";
  if (score >= 80) level = "強勢命中";
  else if (score >= 60) level = "可追蹤";
  else if (score >= 40) level = "普通";

  return {
    ...stock,
    close,
    changePct,
    volume: latest?.volume || 0,
    volumeRatio,
    rsi,
    k: kd.k,
    d: kd.d,
    macdHist: macd.hist,
    ma5,
    ma20,
    ma60,
    score: Math.max(0, Math.min(100, Math.round(score))),
    level,
    tags,
    backtest,
  };
}

function TradingChart({ stock }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !stock?.history?.length) return;

    const chart = createChart(containerRef.current, {
      height: 520,
      layout: {
        background: { color: "#020617" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,.12)" },
        horzLines: { color: "rgba(148,163,184,.12)" },
      },
      rightPriceScale: { borderColor: "rgba(148,163,184,.25)" },
      timeScale: {
        borderColor: "rgba(148,163,184,.25)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 1 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const ma5Series = chart.addSeries(LineSeries, {
      color: "#facc15",
      lineWidth: 2,
      priceLineVisible: false,
    });

    const ma20Series = chart.addSeries(LineSeries, {
      color: "#60a5fa",
      lineWidth: 2,
      priceLineVisible: false,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const candles = stock.history.map((d) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const closes = stock.history.map((x) => x.close);
    const ma5 = stock.history
      .map((d, i) => {
        const part = closes.slice(0, i + 1);
        const value = sma(part, 5);
        return value ? { time: d.time, value } : null;
      })
      .filter(Boolean);

    const ma20 = stock.history
      .map((d, i) => {
        const part = closes.slice(0, i + 1);
        const value = sma(part, 20);
        return value ? { time: d.time, value } : null;
      })
      .filter(Boolean);

    const volume = stock.history.map((d) => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? "rgba(34,197,94,.38)" : "rgba(239,68,68,.38)",
    }));

    candleSeries.setData(candles);
    ma5Series.setData(ma5);
    ma20Series.setData(ma20);
    volumeSeries.setData(volume);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [stock]);

  return <div ref={containerRef} className="trading-chart" />;
}

export default function Stock() {
  const navigate = useNavigate();
  const { symbol } = useParams();
  const [activeTab, setActiveTab] = useState("analysis");
  const [query, setQuery] = useState(symbol || "2330");
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("stockRadarFavorites") || "[]");
    } catch {
      return [];
    }
  });
  const [watchText, setWatchText] = useState("2330,2317,2454,2308,2382,0050,AAPL,NVDA,TSLA,SPY,QQQ");
  const [range, setRange] = useState("6mo");
  const [stock, setStock] = useState(null);
  const [watchList, setWatchList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem("stockRadarFavorites", JSON.stringify(favorites));
  }, [favorites]);

  function addFavorite(targetStock = stock) {
    if (!targetStock?.symbol) return;

    setFavorites((prev) => {
      const exists = prev.some((item) => item.symbol === targetStock.symbol);
      if (exists) return prev;

      return [
        ...prev,
        {
          symbol: targetStock.symbol,
          name: targetStock.name,
        },
      ];
    });
  }

  function removeFavorite(symbol) {
    setFavorites((prev) => prev.filter((item) => item.symbol !== symbol));
  }

  async function searchOne(input = query) {
    const target = String(input || "").trim();
    if (!target) return;
    setQuery(target);
    setActiveTab("analysis");
    setLoading(true);
    setError("");
    try {
      const data = await fetchYahooHistory(target, range, "1d");
      const analyzed = analyzeStock(data);
      setStock(analyzed);
    } catch (err) {
      console.error(err);
      setError(err.message || "查詢失敗");
    } finally {
      setLoading(false);
    }
  }

  async function scanWatchList() {
    setScanning(true);
    setError("");
    try {
      const items = watchText
        .split(/[ ,，\n]+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 20);

      const result = [];
      for (const item of items) {
        try {
          const data = await fetchYahooHistory(item, range, "1d");
          result.push(analyzeStock(data));
          await sleep(120);
        } catch (err) {
          console.warn("watch scan failed", item, err);
        }
      }
      result.sort((a, b) => b.score - a.score);
      setWatchList(result);
      if (!stock && result[0]) setStock(result[0]);
    } catch (err) {
      setError(err.message || "自選清單掃描失敗");
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    if (symbol) searchOne(symbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    if (!autoScan) return;
    scanWatchList();
    const timer = setInterval(scanWatchList, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan, watchText, range]);

  const suggestion = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return Object.entries(NAME_TO_CODE)
      .filter(([name, code]) => name.includes(q) || code.includes(q))
      .slice(0, 8);
  }, [query]);

  return (
    <div className="radar-page has-fixed-nav">
      <style>{`
        body { margin: 0; background: #0f172a; color: #e5e7eb; font-family: Arial, 'Microsoft JhengHei', sans-serif; }
        button, input, select, textarea { font-family: inherit; }
        .radar-page { min-height: 100vh; padding: 84px 28px 96px; background: radial-gradient(circle at top left, #1e293b, #020617 55%); }
        .top-nav { position: fixed; top: 0; left: 0; right: 0; height: 60px; z-index: 999; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 18px; background: rgba(2, 6, 23, 0.82); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(148,163,184,.18); box-sizing: border-box; }
        .nav-left, .nav-tabs { display: flex; align-items: center; gap: 8px; }
        .nav-title { color: #cbd5e1; font-size: 14px; font-weight: 800; letter-spacing: .3px; }
        .tab-btn { background: transparent; color: #cbd5e1; border: 1px solid rgba(148,163,184,.25); padding: 8px 12px; border-radius: 999px; }
        .tab-btn.active { background: #38bdf8; color: #082f49; border-color: #38bdf8; }
        .hero { display: flex; justify-content: space-between; gap: 20px; align-items: stretch; margin-bottom: 20px; }
        .eyebrow { color: #38bdf8; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; }
        h1 { font-size: 36px; margin: 8px 0; }
        h2 { margin: 0 0 12px; font-size: 20px; }
        h3 { margin: 0; font-size: 24px; }
        .subtitle, .note, .status { color: #94a3b8; }
        .panel { background: rgba(15,23,42,0.84); border: 1px solid rgba(148,163,184,0.25); border-radius: 18px; box-shadow: 0 18px 50px rgba(0,0,0,.35); padding: 18px; }
        .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        label { display: block; color: #cbd5e1; margin: 12px 0 8px; font-size: 14px; }
        input, textarea, select { width: 100%; box-sizing: border-box; background: #020617; color: #e5e7eb; border: 1px solid #334155; border-radius: 12px; padding: 12px; outline: none; }
        .btn-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
        button { border: 0; border-radius: 12px; padding: 11px 15px; background: #38bdf8; color: #082f49; font-weight: 800; cursor: pointer; }
        button:disabled { opacity: .55; cursor: not-allowed; }
        button.ghost { background: #1e293b; color: #e5e7eb; border: 1px solid #334155; }
        button.danger { background: #fb7185; color: #450a0a; }
        button.small { padding: 8px 10px; font-size: 13px; }
        .stock-actions { display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .chips button { padding: 8px 10px; background: #172554; color: #bfdbfe; font-size: 13px; }
        .error { color: #fecaca; background: rgba(127,29,29,.4); padding: 10px; border-radius: 12px; margin-top: 12px; }
        .dashboard { display: grid; grid-template-columns: minmax(640px, 1.2fr) minmax(420px, .8fr); gap: 16px; }
        .stock-head { display: flex; justify-content: space-between; gap: 16px; align-items: start; margin-bottom: 14px; }
        .stock-head p { color: #94a3b8; margin: 6px 0 0; }
        .price { font-size: 30px; font-weight: 900; text-align: right; }
        .price small { display: block; font-size: 14px; margin-top: 4px; }
        .up { color: #f87171; }
        .down { color: #4ade80; }
        .score-card { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
        .score-card div, .metric-grid div { background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 14px; text-align: center; }
        .score-card b, .metric-grid b { display: block; font-size: 22px; }
        .score-card span, .metric-grid span { color: #94a3b8; font-size: 12px; }
        .trading-chart { width: 100%; min-height: 520px; border-radius: 16px; overflow: hidden; background: #020617; }
        .tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
        .tag-row span { background: #172554; color: #bfdbfe; padding: 7px 10px; border-radius: 999px; font-size: 13px; }
        .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { padding: 12px 10px; border-bottom: 1px solid rgba(148,163,184,.16); text-align: left; white-space: nowrap; }
        th { color: #93c5fd; }
        tr { cursor: pointer; }
        tr:hover { background: rgba(56,189,248,.09); }
        .score { display: inline-flex; align-items: center; justify-content: center; min-width: 38px; height: 28px; border-radius: 999px; background: #1d4ed8; color: white; font-weight: 800; }
        .empty { color: #94a3b8; padding: 18px; }
        .mobile-bottom-nav { display: none; }
        @media (max-width: 1100px) { .hero, .control-grid, .dashboard { grid-template-columns: 1fr; display: grid; } }
        @media (max-width: 720px) {
          .radar-page { padding: 78px 14px 92px; }
          .nav-title { display: none; }
          .nav-tabs { display: none; }
          h1 { font-size: 28px; }
          .dashboard { grid-template-columns: 1fr; }
          .mobile-bottom-nav { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 999; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 8px; border-radius: 18px; background: rgba(2, 6, 23, 0.88); backdrop-filter: blur(12px); border: 1px solid rgba(148,163,184,.2); }
          .mobile-bottom-nav button { padding: 10px 6px; font-size: 13px; }
        }
      `}</style>

      <nav className="top-nav">
        <div className="nav-left">
          <button className="ghost small" onClick={() => navigate("/")}>← 返回</button>
          <span className="nav-title">AI 股票雷達 Pro</span>
        </div>
        <div className="nav-tabs">
          <button className={`tab-btn ${activeTab === "home" ? "active" : ""}`} onClick={() => setActiveTab("home")}>首頁</button>
          <button className={`tab-btn ${activeTab === "analysis" ? "active" : ""}`} onClick={() => setActiveTab("analysis")}>分析</button>
          <button className={`tab-btn ${activeTab === "favorites" ? "active" : ""}`} onClick={() => setActiveTab("favorites")}>收藏</button>
        </div>
      </nav>

      <header className="hero">
        <div>
          <p className="eyebrow">Yahoo Finance + Lightweight Charts</p>
          <h1>🤖 AI 股票快速查詢雷達 Pro</h1>
          <p className="subtitle">互動K線、5秒自選掃描、AI分數升級、策略回測。</p>
        </div>
      </header>

      {activeTab === "home" && (
        <section className="control-grid">
          <div className="panel">
            <h2>單股快速查詢</h2>
            <label>股票代碼或名稱</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="例如 2330、台積電、AAPL、SPY" onKeyDown={(e) => e.key === "Enter" && searchOne()} />
            <label>資料區間</label>
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="3mo">3個月</option>
              <option value="6mo">6個月</option>
              <option value="1y">1年</option>
              <option value="2y">2年</option>
              <option value="5y">5年</option>
            </select>
            <div className="btn-row">
              <button onClick={() => searchOne()} disabled={loading}>{loading ? "查詢中..." : "搜尋並前往分析"}</button>
            </div>
            {suggestion.length > 0 && (
              <div className="chips">
                {suggestion.map(([name, code]) => (
                  <button key={name} onClick={() => { setQuery(code); searchOne(code); }}>{code} {name}</button>
                ))}
              </div>
            )}
            {error && <p className="error">{error}</p>}
          </div>

          <div className="panel">
            <h2>自選清單掃描</h2>
            <label>輸入股票，最多 20 檔</label>
            <textarea rows={4} value={watchText} onChange={(e) => setWatchText(e.target.value)} />
            <div className="btn-row">
              <button className="ghost" onClick={scanWatchList} disabled={scanning}>{scanning ? "掃描中..." : "掃描自選清單"}</button>
              <button className={autoScan ? "danger" : "ghost"} onClick={() => setAutoScan((v) => !v)}>
                {autoScan ? "停止5秒刷新" : "啟動5秒刷新"}
              </button>
            </div>
            <p className="note">5秒刷新會持續呼叫 Yahoo API，自選清單建議控制在 5～10 檔。</p>
          </div>

          {watchList.length > 0 && (
            <div className="panel" style={{ gridColumn: "1 / -1" }}>
              <h2>🔥 自選清單排行榜</h2>
              <table>
                <thead>
                  <tr>
                    <th>股票</th>
                    <th>價格</th>
                    <th>漲跌%</th>
                    <th>RSI</th>
                    <th>AI</th>
                    <th>回測</th>
                    <th>狀態</th>
                    <th>收藏</th>
                  </tr>
                </thead>
                <tbody>
                  {watchList.map((s) => (
                    <tr key={s.symbol} onClick={() => { setStock(s); setActiveTab("analysis"); }}>
                      <td>{s.symbol}<br />{s.name}</td>
                      <td>{s.close?.toFixed?.(2)}</td>
                      <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct.toFixed(2)}%</td>
                      <td>{s.rsi?.toFixed(1) ?? "--"}</td>
                      <td><span className="score">{s.score}</span></td>
                      <td>{s.backtest.totalReturn}%</td>
                      <td>{s.level}</td>
                      <td>
                        {favorites.some((item) => item.symbol === s.symbol) ? (
                          <button className="danger small" onClick={(e) => { e.stopPropagation(); removeFavorite(s.symbol); }}>取消</button>
                        ) : (
                          <button className="ghost small" onClick={(e) => { e.stopPropagation(); addFavorite(s); }}>收藏</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "analysis" && (
        <section className="dashboard">
          <div className="panel">
            <h2>📊 互動 K 線圖</h2>
            {stock ? (
              <>
                <div className="stock-head">
                  <div>
                    <h3>{stock.symbol} {stock.name}</h3>
                    <p>{stock.level}・{stock.currency}</p>
                  </div>
                  <div className="stock-actions">
                    <div className={stock.changePct >= 0 ? "price up" : "price down"}>
                      {stock.close?.toFixed?.(2)}
                      <small>{stock.changePct.toFixed(2)}%</small>
                    </div>
                    {favorites.some((item) => item.symbol === stock.symbol) ? (
                      <button className="danger small" onClick={() => removeFavorite(stock.symbol)}>取消收藏</button>
                    ) : (
                      <button className="ghost small" onClick={() => addFavorite(stock)}>加入收藏</button>
                    )}
                  </div>
                </div>
                <TradingChart stock={stock} />
                <div className="tag-row">
                  {stock.tags.length ? stock.tags.map((t) => <span key={t}>{t}</span>) : <span>暫無強勢訊號</span>}
                </div>
              </>
            ) : (
              <p className="empty">請先到「首頁」搜尋股票，或使用網址 /stock/2330。</p>
            )}
          </div>

          <div className="panel">
            <h2>🧠 AI 分數 + 回測</h2>
            {stock ? (
              <>
                <div className="score-card">
                  <div><b>{stock.score}</b><span>AI分數</span></div>
                  <div><b>{stock.level}</b><span>狀態</span></div>
                  <div><b>{stock.volumeRatio?.toFixed(2) ?? "--"}</b><span>量比</span></div>
                </div>
                <div className="metric-grid">
                  <div><b>{stock.rsi?.toFixed(1) ?? "--"}</b><span>RSI</span></div>
                  <div><b>{stock.k?.toFixed(1) ?? "--"}</b><span>K 值</span></div>
                  <div><b>{stock.d?.toFixed(1) ?? "--"}</b><span>D 值</span></div>
                  <div><b>{stock.macdHist?.toFixed(2) ?? "--"}</b><span>MACD</span></div>
                  <div><b>{stock.ma5?.toFixed(2) ?? "--"}</b><span>MA5</span></div>
                  <div><b>{stock.ma20?.toFixed(2) ?? "--"}</b><span>MA20</span></div>
                  <div><b>{stock.backtest.totalReturn}%</b><span>回測報酬</span></div>
                  <div><b>{stock.backtest.winRate}%</b><span>勝率</span></div>
                  <div><b>{stock.backtest.maxDrawdown}%</b><span>最大回撤</span></div>
                </div>
              </>
            ) : (
              <p className="empty">尚無分析資料。</p>
            )}
          </div>
        </section>
      )}

      {activeTab === "favorites" && (
        <section className="panel">
          <h2>⭐ 收藏股票</h2>
          {favorites.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>股票</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {favorites.map((item) => (
                  <tr key={item.symbol}>
                    <td>{item.symbol}<br />{item.name}</td>
                    <td>
                      <button className="ghost small" onClick={() => searchOne(item.symbol)}>查看分析</button>{" "}
                      <button className="danger small" onClick={() => removeFavorite(item.symbol)}>刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty">尚未收藏股票。查詢股票後，點「加入收藏」。</p>
          )}
        </section>
      )}

      <div className="mobile-bottom-nav">
        <button className={activeTab === "home" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("home")}>首頁</button>
        <button className={activeTab === "analysis" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("analysis")}>分析</button>
        <button className={activeTab === "favorites" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("favorites")}>收藏</button>
      </div>
    </div>
  );
}
