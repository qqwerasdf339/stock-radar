import { useMemo, useState } from "react";
import "./App.css";

/*
  AI 台股單股查詢雷達｜Yahoo Finance Chart API 版

  ✅ 這版解決：
  1. 不再抓 TWSE，改抓 Yahoo Finance chart API
  2. 不再一進網站就全市場掃描，速度快很多
  3. 輸入 2330 / 2317 / 0050 會自動轉成 2330.TW / 2317.TW / 0050.TW
  4. 可輸入常見中文名稱，例如 台積電、鴻海、聯發科
  5. 顯示 K 棒、MA5、MA20、RSI、KD、MACD、AI 分數

  注意：
  - API_BASE 請改成你的 Render 後端網址
  - 這是研究工具，不是投資建議
*/

const API_BASE = "https://stock-radar-hv9h.onrender.com";

const STOCK_NAME_MAP = {
  台積電: "2330",
  鴻海: "2317",
  聯發科: "2454",
  台達電: "2308",
  廣達: "2382",
  中華電: "2412",
  富邦金: "2881",
  國泰金: "2882",
  中信金: "2891",
  長榮: "2603",
  萬海: "2615",
  欣興: "3037",
  世芯: "3661",
  "世芯-KY": "3661",
  日月光: "3711",
  日月光投控: "3711",
  華碩: "2357",
  緯創: "3231",
  奇鋐: "3017",
  緯穎: "6669",
  瑞昱: "2379",
  大立光: "3008",
  元大台灣50: "0050",
  台灣50: "0050",
};

const QUICK_LIST = [
  "2330 台積電",
  "2317 鴻海",
  "2454 聯發科",
  "2308 台達電",
  "2382 廣達",
  "3231 緯創",
  "0050 台灣50",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveSymbol(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  const codeFromName = STOCK_NAME_MAP[raw];
  if (codeFromName) return codeFromName;

  const upper = raw.toUpperCase();

  // 已經輸入 2330.TW / 3234.TWO / AAPL 就照原樣
  if (upper.endsWith(".TW") || upper.endsWith(".TWO")) return upper;
  
  // 台股代碼
  if (/^\d{4}$/.test(upper)) return upper;

  // 美股 / 美股 ETF
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
      date: new Date(t * 1000).toLocaleDateString("zh-TW"),
      open: cleanNumber(quote.open?.[i]),
      high: cleanNumber(quote.high?.[i]),
      low: cleanNumber(quote.low?.[i]),
      close: cleanNumber(quote.close?.[i]),
      volume: cleanNumber(quote.volume?.[i]),
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
  const volumeRatio = calcVolumeRatio(history);

  const trendUp = ma5 !== null && ma20 !== null && ma5 > ma20;
  const macdBull = macd.hist !== null && macd.hist > 0 && macd.dif > macd.dea;
  const rsiHealthy = rsi !== null && rsi >= 45 && rsi <= 72;
  const rsiRebound = rsi !== null && rsi >= 35 && rsi < 45 && changePct > 0;
  const volumeHot = volumeRatio !== null && volumeRatio >= 1.25;
  const momentum = changePct > 0.5;

  let score = 0;
  if (trendUp) score += 20;
  if (macdBull) score += 20;
  if (kd.golden) score += 15;
  if (rsiHealthy) score += 15;
  if (rsiRebound) score += 10;
  if (volumeHot) score += 20;
  if (momentum) score += 10;
  if (changePct > 3) score -= 8;
  if (rsi !== null && rsi > 78) score -= 15;

  const tags = [];
  if (trendUp) tags.push("MA多頭");
  if (macdBull) tags.push("MACD翻紅");
  if (kd.golden) tags.push("KD金叉");
  if (volumeHot) tags.push("放量");
  if (rsiRebound) tags.push("RSI反彈");
  if (momentum) tags.push("動能轉強");

  let level = "偏弱";
  if (score >= 75) level = "強勢命中";
  else if (score >= 55) level = "可追蹤";
  else if (score >= 35) level = "普通";

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
    score: Math.max(0, Math.min(100, Math.round(score))),
    level,
    tags,
  };
}

function CandleChart({ history }) {
  const data = history.slice(-60).filter((x) => x.open && x.high && x.low && x.close);
  if (data.length < 2) return <div className="empty">K 棒資料不足</div>;

  const w = 760;
  const h = 340;
  const pad = 32;
  const max = Math.max(...data.map((x) => x.high));
  const min = Math.min(...data.map((x) => x.low));
  const range = max - min || 1;
  const step = (w - pad * 2) / data.length;
  const candleWidth = Math.max(4, Math.min(10, step * 0.55));
  const y = (price) => pad + ((max - price) / range) * (h - pad * 2);

  const ma5Values = data.map((_, i) => {
    const part = data.slice(0, i + 1).map((x) => x.close);
    return part.length >= 5 ? sma(part, 5) : null;
  });

  const ma20Values = data.map((_, i) => {
    const part = data.slice(0, i + 1).map((x) => x.close);
    return part.length >= 20 ? sma(part, 20) : null;
  });

  const linePath = (values) =>
    values
      .map((v, i) => {
        if (v === null) return null;
        const x = pad + i * step + step / 2;
        const first = values.slice(0, i).every((x) => x === null);
        return `${i === 0 || first ? "M" : "L"}${x.toFixed(1)},${y(v).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="candle-chart">
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
            <line x1={x} y1={y(d.high)} x2={x} y2={y(d.low)} stroke="currentColor" strokeWidth="1.4" />
            <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} rx="1" fill="currentColor" />
          </g>
        );
      })}

      <path d={linePath(ma5Values)} className="ma ma5" />
      <path d={linePath(ma20Values)} className="ma ma20" />
      <text x={pad} y={20} className="legend ma5-text">MA5</text>
      <text x={pad + 48} y={20} className="legend ma20-text">MA20</text>
    </svg>
  );
}

export default function App() {
  const [query, setQuery] = useState("2330");
  const [watchText, setWatchText] = useState("2330,2317,2454,2308,2382,0050");
  const [range, setRange] = useState("6mo");
  const [stock, setStock] = useState(null);
  const [watchList, setWatchList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  async function searchOne(input = query) {
    setLoading(true);
    setError("");
    try {
      const data = await fetchYahooHistory(input, range, "1d");
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
          await sleep(150);
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

  const suggestion = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return Object.entries(STOCK_NAME_MAP)
      .filter(([name, code]) => name.includes(q) || code.includes(q))
      .slice(0, 8);
  }, [query]);

  return (
    <div className="radar-page">
      <style>{`
        body { margin: 0; background: #0f172a; color: #e5e7eb; font-family: Arial, 'Microsoft JhengHei', sans-serif; }
        button, input, select, textarea { font-family: inherit; }
        .radar-page { min-height: 100vh; padding: 28px; background: radial-gradient(circle at top left, #1e293b, #020617 55%); }
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
        .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .chips button { padding: 8px 10px; background: #172554; color: #bfdbfe; font-size: 13px; }
        .error { color: #fecaca; background: rgba(127,29,29,.4); padding: 10px; border-radius: 12px; margin-top: 12px; }
        .dashboard { display: grid; grid-template-columns: minmax(520px, 1.15fr) minmax(420px, .85fr); gap: 16px; }
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
        .candle-chart { width: 100%; height: auto; background: #020617; border-radius: 16px; padding: 8px; box-sizing: border-box; }
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
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { padding: 12px 10px; border-bottom: 1px solid rgba(148,163,184,.16); text-align: left; white-space: nowrap; }
        th { color: #93c5fd; }
        tr { cursor: pointer; }
        tr:hover { background: rgba(56,189,248,.09); }
        .score { display: inline-flex; align-items: center; justify-content: center; min-width: 38px; height: 28px; border-radius: 999px; background: #1d4ed8; color: white; font-weight: 800; }
        .empty { color: #94a3b8; padding: 18px; }
        @media (max-width: 1100px) { .hero, .control-grid, .dashboard { grid-template-columns: 1fr; display: grid; } }
      `}</style>

      <header className="hero">
        <div>
          <p className="eyebrow">Yahoo Finance Chart API</p>
          <h1>🤖 AI 台股快速查詢雷達</h1>
          <p className="subtitle">輸入股票代碼或名稱，只抓單支股票，不再全市場慢慢掃。</p>
        </div>
      </header>

      <section className="control-grid">
        <div className="panel">
          <h2>單股快速查詢</h2>
          <label>股票代碼或名稱</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="例如 2330、台積電、0050" onKeyDown={(e) => e.key === "Enter" && searchOne()} />
          <label>資料區間</label>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="3mo">3個月</option>
            <option value="6mo">6個月</option>
            <option value="1y">1年</option>
            <option value="2y">2年</option>
          </select>
          <div className="btn-row">
            <button onClick={() => searchOne()} disabled={loading}>{loading ? "查詢中..." : "查詢股票"}</button>
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
          </div>
          <p className="note">想快就用單股查詢；想比較幾支股票才用自選清單掃描。</p>
        </div>
      </section>

      <section className="dashboard">
        <div className="panel">
          <h2>📈 K 棒與 AI 分析</h2>
          {stock ? (
            <>
              <div className="stock-head">
                <div>
                  <h3>{stock.symbol} {stock.name}</h3>
                  <p>{stock.level}・{stock.currency}</p>
                </div>
                <div className={stock.changePct >= 0 ? "price up" : "price down"}>
                  {stock.close?.toFixed?.(2)}
                  <small>{stock.changePct.toFixed(2)}%</small>
                </div>
              </div>
              <CandleChart history={stock.history} />
              <div className="tag-row">
                {stock.tags.length ? stock.tags.map((t) => <span key={t}>{t}</span>) : <span>暫無強勢訊號</span>}
              </div>
            </>
          ) : (
            <p className="empty">輸入股票代碼後按「查詢股票」。</p>
          )}
        </div>

        <div className="panel">
          <h2>🧠 指標分數</h2>
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
              </div>
            </>
          ) : (
            <p className="empty">尚無分析資料。</p>
          )}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>🔥 自選清單排行榜</h2>
        {watchList.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>股票</th>
                <th>價格</th>
                <th>漲跌%</th>
                <th>RSI</th>
                <th>AI</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {watchList.map((s) => (
                <tr key={s.symbol} onClick={() => setStock(s)}>
                  <td>{s.symbol}<br />{s.name}</td>
                  <td>{s.close?.toFixed?.(2)}</td>
                  <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct.toFixed(2)}%</td>
                  <td>{s.rsi?.toFixed(1) ?? "--"}</td>
                  <td><span className="score">{s.score}</span></td>
                  <td>{s.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">可輸入幾支股票做比較，例如：2330,2317,2454,0050</p>
        )}
      </section>
    </div>
  );
}
