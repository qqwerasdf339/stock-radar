import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/*
  AI 台股全市場選股雷達｜App.jsx 單檔版

  ✅ 改版重點
  1. 不再只掃描固定股票清單
  2. 會先抓 TWSE 上市全市場清單 STOCK_DAY_ALL
  3. 自動挑成交量前 N 檔進行技術分析，避免一次掃全部股票太慢或被擋
  4. 線圖改成 K 棒圖
  5. 內建 RSI / KD / MACD / MA5 / MA20 / 量比 / AI 分數

  使用方式：
  直接整份貼到 src/App.jsx，Ctrl + S。

  注意：
  - 這版以「上市股票 TWSE」為主。
  - 上櫃 TPEx 可再另外接資料源。
  - TWSE 有請求頻率限制，所以建議掃描 30～80 檔，不建議一次掃全部。
  - 這是研究工具，不是投資建議。
*/

const TWSE_ALL_URL = "http://localhost:3001/api/twse/all";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumber(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/--/g, "")
    .replace(/X/g, "")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function recentMonthStarts(count = 5) {
  const now = new Date();
  const result = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    result.push(`${y}${m}01`);
  }
  return result;
}

function parseTwseRow(row) {
  return {
    date: row[0],
    volume: toNumber(row[1]),
    open: toNumber(row[3]),
    high: toNumber(row[4]),
    low: toNumber(row[5]),
    close: toNumber(row[6]),
  };
}

function normalizeMarketItem(item) {
  return {
    symbol: String(item.Code || item.code || "").trim(),
    name: String(item.Name || item.name || "").trim(),
    volume: toNumber(item.TradeVolume || item.Volume || item.trade_volume),
    open: toNumber(item.OpeningPrice || item.Open || item.open),
    high: toNumber(item.HighestPrice || item.High || item.high),
    low: toNumber(item.LowestPrice || item.Low || item.low),
    close: toNumber(item.ClosingPrice || item.Close || item.close),
    change: toNumber(item.Change || item.change),
  };
}

async function fetchTwseUniverse() {
  const res = await fetch(TWSE_ALL_URL);
  if (!res.ok) throw new Error("無法取得上市全市場清單");
  const data = await res.json();

  return data
    .map(normalizeMarketItem)
    .filter((x) => /^\d{4}$/.test(x.symbol))
    .filter((x) => x.close && x.volume)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0));
}

async function fetchMonthlyHistory(symbol, date) {
  const url = `http://localhost:3001/api/twse/history/${symbol}?date=${date}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`歷史資料失敗：${symbol}`);
  const json = await res.json();
  if (!json?.data) return [];
  return json.data.map(parseTwseRow).filter((x) => x.open && x.high && x.low && x.close);
}

async function fetchHistory(symbol) {
  const months = recentMonthStarts(5);
  const all = [];

  for (const month of months) {
    try {
      const rows = await fetchMonthlyHistory(symbol, month);
      all.push(...rows);
      await sleep(100);
    } catch (err) {
      console.warn("history error", symbol, month, err);
    }
  }

  const unique = Array.from(new Map(all.map((x) => [x.date, x])).values());
  return unique.slice(-100);
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

function analyzeStock(base, history) {
  const closes = history.map((x) => x.close).filter(Boolean);
  const latest = history.at(-1);
  const prev = history.at(-2);
  const close = latest?.close || base.close || null;
  const changePct = prev?.close && close ? ((close - prev.close) / prev.close) * 100 : 0;
  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const kd = calcKD(history);
  const ma5 = sma(closes, 5);
  const ma20 = sma(closes, 20);
  const volumeRatio = calcVolumeRatio(history);

  const trendUp = ma5 !== null && ma20 !== null && ma5 > ma20;
  const macdBull = macd.hist !== null && macd.hist > 0 && macd.dif > macd.dea;
  const kdGolden = kd.golden;
  const rsiHealthy = rsi !== null && rsi >= 45 && rsi <= 72;
  const rsiRebound = rsi !== null && rsi >= 35 && rsi < 45 && changePct > 0;
  const volumeHot = volumeRatio !== null && volumeRatio >= 1.25;
  const momentum = changePct > 0.5;

  let score = 0;
  if (trendUp) score += 20;
  if (macdBull) score += 20;
  if (kdGolden) score += 15;
  if (rsiHealthy) score += 15;
  if (rsiRebound) score += 10;
  if (volumeHot) score += 20;
  if (momentum) score += 10;
  if (changePct > 3) score -= 8;
  if (rsi !== null && rsi > 78) score -= 15;

  const tags = [];
  if (trendUp) tags.push("MA多頭");
  if (macdBull) tags.push("MACD翻紅");
  if (kdGolden) tags.push("KD金叉");
  if (volumeHot) tags.push("放量");
  if (rsiRebound) tags.push("RSI反彈");
  if (momentum) tags.push("動能轉強");

  let level = "偏弱";
  if (score >= 75) level = "強勢命中";
  else if (score >= 55) level = "可追蹤";
  else if (score >= 35) level = "普通";

  return {
    symbol: base.symbol,
    name: base.name,
    close,
    changePct,
    volume: latest?.volume || base.volume || 0,
    volumeRatio,
    rsi,
    k: kd.k,
    d: kd.d,
    macdHist: macd.hist,
    ma5,
    ma20,
    score: Math.max(0, Math.min(100, Math.round(score))),
    level,
    tags,
    history,
  };
}

function CandleChart({ history }) {
  const data = history.slice(-45).filter((x) => x.open && x.high && x.low && x.close);
  if (data.length < 2) return <div className="chart-empty">K 棒資料不足</div>;

  const w = 720;
  const h = 320;
  const pad = 28;
  const highs = data.map((x) => x.high);
  const lows = data.map((x) => x.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const range = max - min || 1;
  const step = (w - pad * 2) / data.length;
  const candleWidth = Math.max(4, Math.min(11, step * 0.55));

  const y = (price) => pad + ((max - price) / range) * (h - pad * 2);

  const ma5Values = data.map((_, i) => {
    const part = data.slice(0, i + 1).map((x) => x.close);
    return part.length >= 5 ? sma(part, 5) : null;
  });

  const ma20Values = data.map((_, i) => {
    const part = data.slice(0, i + 1).map((x) => x.close);
    return part.length >= 20 ? sma(part, 20) : null;
  });

  const linePath = (values) => {
    return values
      .map((v, i) => {
        if (v === null) return null;
        const x = pad + i * step + step / 2;
        return `${i === 0 || values.slice(0, i).every((x) => x === null) ? "M" : "L"}${x.toFixed(1)},${y(v).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="candle-chart">
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} className="grid-line" />
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} className="grid-line" />

      {[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const yy = pad + p * (h - pad * 2);
        const price = max - p * range;
        return (
          <g key={p}>
            <line x1={pad} y1={yy} x2={w - pad} y2={yy} className="soft-grid" />
            <text x={w - pad + 6} y={yy + 4} className="axis-text">{price.toFixed(1)}</text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const x = pad + i * step + step / 2;
        const up = d.close >= d.open;
        const bodyTop = y(Math.max(d.open, d.close));
        const bodyBottom = y(Math.min(d.open, d.close));
        const bodyHeight = Math.max(2, bodyBottom - bodyTop);
        return (
          <g key={`${d.date}-${i}`} className={up ? "candle-up" : "candle-down"}>
            <line x1={x} y1={y(d.high)} x2={x} y2={y(d.low)} stroke="currentColor" strokeWidth="1.5" />
            <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1" fill="currentColor" />
          </g>
        );
      })}

      <path d={linePath(ma5Values)} className="ma ma5" />
      <path d={linePath(ma20Values)} className="ma ma20" />

      <text x={pad} y={18} className="legend ma5-text">MA5</text>
      <text x={pad + 46} y={18} className="legend ma20-text">MA20</text>
    </svg>
  );
}

export default function App() {
  const [universe, setUniverse] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [scanLimit, setScanLimit] = useState(50);
  const [minScore, setMinScore] = useState(55);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("尚未掃描");
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  async function loadUniverse() {
    setError("");
    setStatus("正在取得台股上市全市場清單...");
    const list = await fetchTwseUniverse();
    setUniverse(list);
    setStatus(`已取得 ${list.length} 檔上市股票`);
    return list;
  }

  async function scanMarket() {
    setLoading(true);
    setError("");
    try {
      const list = universe.length ? universe : await loadUniverse();
      const candidates = list.slice(0, scanLimit);
      const result = [];

      for (let i = 0; i < candidates.length; i++) {
        const base = candidates[i];
        setStatus(`掃描中 ${i + 1}/${candidates.length}：${base.symbol} ${base.name}`);
        const history = await fetchHistory(base.symbol);
        if (history.length >= 35) {
          result.push(analyzeStock(base, history));
        }
        await sleep(130);
      }

      result.sort((a, b) => b.score - a.score);
      setStocks(result);
      setSelected(result[0] || null);
      setStatus(`掃描完成：分析 ${result.length} 檔，命中 ${result.filter((x) => x.score >= minScore).length} 檔`);
    } catch (err) {
      console.error(err);
      setError("抓資料失敗：可能是 TWSE 暫時無回應、網路問題，或請求太頻繁。請降低掃描檔數再試。");
      setStatus("掃描失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUniverse().catch((err) => {
      console.error(err);
      setError("初始化上市股票清單失敗，請稍後再試。");
    });
  }, []);

  useEffect(() => {
    if (!autoScan) {
      clearInterval(timerRef.current);
      return;
    }
    scanMarket();
    timerRef.current = setInterval(scanMarket, 30000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan, scanLimit, minScore, universe.length]);

  const visibleStocks = stocks.filter((s) => {
    const q = keyword.trim();
    const hitKeyword = !q || s.symbol.includes(q) || s.name.includes(q);
    return hitKeyword && s.score >= minScore;
  });

  const marketSearch = universe.filter((s) => {
    const q = keyword.trim();
    if (!q) return false;
    return s.symbol.includes(q) || s.name.includes(q);
  }).slice(0, 10);

  const summary = useMemo(() => {
    const strong = stocks.filter((x) => x.score >= 75).length;
    const avg = stocks.length ? Math.round(stocks.reduce((sum, x) => sum + x.score, 0) / stocks.length) : 0;
    return { strong, avg, total: stocks.length };
  }, [stocks]);

  return (
    <div className="radar-page">
      <style>{`
        body { margin: 0; background: #0f172a; color: #e5e7eb; font-family: Arial, 'Microsoft JhengHei', sans-serif; }
        button, input { font-family: inherit; }
        .radar-page { min-height: 100vh; padding: 28px; background: radial-gradient(circle at top left, #1e293b, #020617 55%); }
        .hero { display: flex; justify-content: space-between; gap: 20px; align-items: stretch; margin-bottom: 20px; }
        .eyebrow { color: #38bdf8; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; }
        h1 { font-size: 36px; margin: 8px 0; }
        h2 { margin: 0; font-size: 20px; }
        h3 { margin: 0; font-size: 22px; }
        .subtitle { color: #94a3b8; }
        .hero-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; min-width: 360px; }
        .hero-stats div, .panel { background: rgba(15,23,42,0.82); border: 1px solid rgba(148,163,184,0.25); border-radius: 18px; box-shadow: 0 18px 50px rgba(0,0,0,.35); }
        .hero-stats div { padding: 18px; text-align: center; }
        .hero-stats b { display: block; font-size: 30px; color: #f8fafc; }
        .hero-stats span { color: #94a3b8; font-size: 13px; }
        .control-grid { display: grid; grid-template-columns: 1.4fr .9fr; gap: 16px; margin-bottom: 16px; }
        .panel { padding: 18px; }
        label { display: block; color: #cbd5e1; margin: 12px 0 8px; font-size: 14px; }
        input[type='text'], input:not([type]), textarea { width: 100%; box-sizing: border-box; background: #020617; color: #e5e7eb; border: 1px solid #334155; border-radius: 12px; padding: 12px; outline: none; }
        input[type='range'] { width: 100%; }
        .btn-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
        button { border: 0; border-radius: 12px; padding: 11px 15px; background: #38bdf8; color: #082f49; font-weight: 700; cursor: pointer; }
        button:disabled { opacity: .55; cursor: not-allowed; }
        button.ghost { background: #1e293b; color: #e5e7eb; border: 1px solid #334155; }
        button.danger { background: #fb7185; color: #450a0a; }
        .status { color: #94a3b8; margin: 10px 0 0; font-size: 13px; }
        .error { color: #fecaca; background: rgba(127,29,29,.4); padding: 10px; border-radius: 12px; }
        .dashboard { display: grid; grid-template-columns: minmax(680px, 1.25fr) minmax(420px, .85fr); gap: 16px; }
        .section-title { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
        .section-title span { color: #94a3b8; font-size: 13px; }
        .table-wrap { overflow: auto; max-height: 620px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { padding: 12px 10px; border-bottom: 1px solid rgba(148,163,184,.16); text-align: left; white-space: nowrap; }
        th { position: sticky; top: 0; background: #0f172a; color: #93c5fd; z-index: 1; }
        tr { cursor: pointer; }
        tr:hover, .active-row { background: rgba(56,189,248,.09); }
        td span { color: #94a3b8; font-size: 12px; }
        .up { color: #f87171; }
        .down { color: #4ade80; }
        .score { display: inline-flex; align-items: center; justify-content: center; min-width: 38px; height: 28px; border-radius: 999px; background: #1d4ed8; color: white; font-weight: 800; }
        .empty { color: #94a3b8; padding: 18px; }
        .stock-head { display: flex; justify-content: space-between; gap: 16px; align-items: start; margin-bottom: 14px; }
        .stock-head p { color: #94a3b8; margin: 6px 0 0; }
        .price { font-size: 28px; font-weight: 900; text-align: right; }
        .price small { display: block; font-size: 14px; margin-top: 4px; }
        .candle-chart { width: 100%; height: auto; background: #020617; border-radius: 16px; padding: 8px; box-sizing: border-box; }
        .grid-line { stroke: rgba(148,163,184,.35); }
        .soft-grid { stroke: rgba(148,163,184,.14); }
        .axis-text { fill: #94a3b8; font-size: 11px; }
        .candle-up { color: #f87171; }
        .candle-down { color: #4ade80; }
        .ma { fill: none; stroke-width: 2; }
        .ma5 { stroke: #facc15; }
        .ma20 { stroke: #60a5fa; }
        .legend { font-size: 12px; font-weight: 700; }
        .ma5-text { fill: #facc15; }
        .ma20-text { fill: #60a5fa; }
        .tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
        .tag-row span { background: #172554; color: #bfdbfe; padding: 7px 10px; border-radius: 999px; font-size: 13px; }
        .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
        .metric-grid div { background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 14px; text-align: center; }
        .metric-grid b { display: block; font-size: 20px; }
        .metric-grid span { color: #94a3b8; font-size: 12px; }
        .search-box { margin-top: 14px; background: rgba(2,6,23,.65); border: 1px solid rgba(148,163,184,.14); border-radius: 14px; padding: 12px; }
        .search-box p { margin: 0 0 8px; color: #94a3b8; font-size: 13px; }
        .search-result { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(148,163,184,.1); }
        .note { color: #94a3b8; font-size: 13px; line-height: 1.6; margin-top: 16px; }
        @media (max-width: 1100px) { .hero, .control-grid, .dashboard { grid-template-columns: 1fr; display: grid; } .hero-stats { min-width: unset; } }
      `}</style>

      <header className="hero">
        <div>
          <p className="eyebrow">TWSE Full Market Scanner</p>
          <h1>🤖 AI 台股全市場選股雷達</h1>
          <p className="subtitle">自動抓上市股票清單，不再只掃固定幾檔；圖表已改為 K 棒。</p>
        </div>
        <div className="hero-stats">
          <div><b>{universe.length}</b><span>上市股票清單</span></div>
          <div><b>{summary.strong}</b><span>強勢命中</span></div>
          <div><b>{summary.avg}</b><span>平均 AI 分</span></div>
        </div>
      </header>

      <section className="control-grid">
        <div className="panel">
          <h2>市場掃描設定</h2>
          <label>掃描成交量前 {scanLimit} 檔</label>
          <input type="range" min="10" max="120" step="10" value={scanLimit} onChange={(e) => setScanLimit(Number(e.target.value))} />

          <label>最低 AI 分數：{minScore}</label>
          <input type="range" min="0" max="100" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />

          <div className="btn-row">
            <button onClick={scanMarket} disabled={loading}>{loading ? "掃描中..." : "一鍵掃全市場"}</button>
            <button className={autoScan ? "danger" : "ghost"} onClick={() => setAutoScan((v) => !v)}>{autoScan ? "停止自動掃描" : "每30秒自動掃描"}</button>
            <button className="ghost" onClick={loadUniverse}>重新抓股票清單</button>
          </div>
          <p className="status">{status}</p>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="panel">
          <h2>搜尋全市場股票</h2>
          <label>輸入股票代碼或名稱</label>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="例如 2330 或 台積電" />
          {marketSearch.length > 0 && (
            <div className="search-box">
              <p>全市場搜尋結果</p>
              {marketSearch.map((s) => (
                <div className="search-result" key={s.symbol}>
                  <span>{s.symbol} {s.name}</span>
                  <span>{s.close}</span>
                </div>
              ))}
            </div>
          )}
          <p className="note">搜尋會查目前抓到的 TWSE 上市股票清單；掃描則會從成交量前 N 檔進行技術分析。</p>
        </div>
      </section>

      <section className="dashboard">
        <div className="panel table-panel">
          <div className="section-title">
            <h2>🔥 AI 飆股排行榜</h2>
            <span>{visibleStocks.length} 檔符合條件</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>股票</th>
                  <th>收盤</th>
                  <th>漲跌%</th>
                  <th>RSI</th>
                  <th>K/D</th>
                  <th>MACD</th>
                  <th>量比</th>
                  <th>AI</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {visibleStocks.map((s) => (
                  <tr key={s.symbol} onClick={() => setSelected(s)} className={selected?.symbol === s.symbol ? "active-row" : ""}>
                    <td><b>{s.symbol}</b><br /><span>{s.name}</span></td>
                    <td>{s.close?.toFixed?.(2) ?? "--"}</td>
                    <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct.toFixed(2)}%</td>
                    <td>{s.rsi?.toFixed(1) ?? "--"}</td>
                    <td>{s.k?.toFixed(1) ?? "--"}/{s.d?.toFixed(1) ?? "--"}</td>
                    <td>{s.macdHist?.toFixed(2) ?? "--"}</td>
                    <td>{s.volumeRatio?.toFixed(2) ?? "--"}</td>
                    <td><span className="score">{s.score}</span></td>
                    <td>{s.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleStocks.length === 0 && <p className="empty">請先按「一鍵掃全市場」。如果分數門檻太高，可把最低 AI 分數調低。</p>}
        </div>

        <div className="panel detail-panel">
          <div className="section-title">
            <h2>📈 K 棒掃描視圖</h2>
            <span>{selected ? `${selected.symbol} ${selected.name}` : "尚未選擇"}</span>
          </div>
          {selected ? (
            <>
              <div className="stock-head">
                <div>
                  <h3>{selected.symbol} {selected.name}</h3>
                  <p>{selected.level}・AI {selected.score} 分</p>
                </div>
                <div className={selected.changePct >= 0 ? "price up" : "price down"}>
                  {selected.close?.toFixed?.(2)}
                  <small>{selected.changePct.toFixed(2)}%</small>
                </div>
              </div>
              <CandleChart history={selected.history} />
              <div className="tag-row">
                {selected.tags.length ? selected.tags.map((t) => <span key={t}>{t}</span>) : <span>暫無強勢訊號</span>}
              </div>
              <div className="metric-grid">
                <div><b>{selected.rsi?.toFixed(1) ?? "--"}</b><span>RSI</span></div>
                <div><b>{selected.k?.toFixed(1) ?? "--"}</b><span>K 值</span></div>
                <div><b>{selected.d?.toFixed(1) ?? "--"}</b><span>D 值</span></div>
                <div><b>{selected.macdHist?.toFixed(2) ?? "--"}</b><span>MACD</span></div>
                <div><b>{selected.ma5?.toFixed(2) ?? "--"}</b><span>MA5</span></div>
                <div><b>{selected.ma20?.toFixed(2) ?? "--"}</b><span>MA20</span></div>
              </div>
            </>
          ) : (
            <p className="empty">掃描完成後，點左邊排行榜股票看 K 棒。</p>
          )}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>說明</h2>
        <p className="note">
          這版會先抓 TWSE 上市全市場每日成交資料，再依成交量排序，針對前 N 檔下載近幾個月歷史資料來計算 RSI、KD、MACD、均線與 AI 分數。
          因為每檔股票都要查歷史資料，所以不建議一次掃太多，30～80 檔會比較穩。
        </p>
      </section>
    </div>
  );
}
