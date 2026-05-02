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

  const code = upper.match(/\d{4,6}/)?.[0];
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

function stddev(values) {
  if (!values.length) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function rsiText(rsi) {
  if (rsi === null || rsi === undefined) return "資料不足";
  if (rsi >= 80) return "過熱，追高風險";
  if (rsi >= 70) return "偏強但過熱";
  if (rsi >= 55) return "多方偏強";
  if (rsi >= 45) return "中性整理";
  if (rsi >= 30) return "弱勢修正";
  return "超賣反彈觀察";
}

function analyzeVolumeSignal(history, changePct, volumeRatio) {
  if (!history.length || volumeRatio === null) {
    return { title: "量能不足", detail: "成交量資料不足，暫不判斷。" };
  }

  const latest = history.at(-1);
  const bodyPct = latest.open ? ((latest.close - latest.open) / latest.open) * 100 : 0;
  const isUp = changePct > 0.3 || bodyPct > 0.3;
  const isFlat = Math.abs(changePct) <= 0.6;
  const isHighVolume = volumeRatio >= 1.35;
  const isLowVolume = volumeRatio <= 0.8;

  if (isHighVolume && isUp) {
    return { title: "爆量上漲｜強勢", detail: "價格上漲且量能明顯放大，代表買盤積極。" };
  }
  if (isHighVolume && !isUp) {
    return { title: "爆量不漲｜出貨疑慮", detail: "成交量放大但價格沒有跟上，可能有上方賣壓。" };
  }
  if (isLowVolume && isUp) {
    return { title: "縮量上漲｜偏虛", detail: "價格上漲但量能不足，動能可靠度較低。" };
  }
  if (isLowVolume && isFlat) {
    return { title: "縮量整理｜醞釀", detail: "量縮且價格整理，可能在等待方向表態。" };
  }
  return { title: "量價中性", detail: "量價沒有明顯極端訊號，需搭配趨勢與型態。" };
}

function analyzeCandlePattern(history) {
  if (history.length < 2) return { title: "資料不足", detail: "K線資料不足。" };

  const latest = history.at(-1);
  const prev = history.at(-2);
  const range = latest.high - latest.low || 1;
  const body = Math.abs(latest.close - latest.open);
  const upperShadow = latest.high - Math.max(latest.open, latest.close);
  const lowerShadow = Math.min(latest.open, latest.close) - latest.low;
  const bodyRatio = body / range;
  const upperRatio = upperShadow / range;
  const lowerRatio = lowerShadow / range;
  const isUp = latest.close >= latest.open;

  if (bodyRatio <= 0.15) {
    return { title: "十字線｜多空觀望", detail: "開收盤接近，代表多空拉鋸，常出現在轉折或整理區。" };
  }
  if (upperRatio >= 0.45 && upperShadow > body * 1.5) {
    return { title: "長上影線｜壓力大", detail: "盤中衝高後回落，上方賣壓明顯。" };
  }
  if (lowerRatio >= 0.45 && lowerShadow > body * 1.5) {
    return { title: "長下影線｜有支撐", detail: "盤中下殺後拉回，下方承接力道出現。" };
  }
  if (isUp && latest.close > prev.high) {
    return { title: "突破K｜偏強", detail: "收盤突破前一根高點，短線動能較強。" };
  }
  if (!isUp && latest.close < prev.low) {
    return { title: "跌破K｜偏弱", detail: "收盤跌破前一根低點，短線賣壓較重。" };
  }
  if (isUp) {
    return { title: "紅K｜買盤較強", detail: "收盤高於開盤，多方略占優勢。" };
  }
  return { title: "黑K｜賣壓較強", detail: "收盤低於開盤，空方略占優勢。" };
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
  const volumeSignal = analyzeVolumeSignal(history, changePct, volumeRatio);
  const candlePattern = analyzeCandlePattern(history);

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
    volumeSignal,
    candlePattern,
    rsiLabel: rsiText(rsi),
  };
}

function TradingChart({ stock, showMA5, showMA20, showMA60, showBollinger }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !stock?.history?.length) return;

    const chart = createChart(containerRef.current, {
      height: 620,
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

    const ma60Series = chart.addSeries(LineSeries, {
      color: "#a78bfa",
      lineWidth: 2,
      priceLineVisible: false,
    });

    const bollUpperSeries = chart.addSeries(LineSeries, {
      color: "rgba(45,212,191,.9)",
      lineWidth: 1,
      priceLineVisible: false,
    });

    const bollMidSeries = chart.addSeries(LineSeries, {
      color: "rgba(45,212,191,.55)",
      lineWidth: 1,
      priceLineVisible: false,
    });

    const bollLowerSeries = chart.addSeries(LineSeries, {
      color: "rgba(45,212,191,.9)",
      lineWidth: 1,
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

    const ma60 = stock.history
      .map((d, i) => {
        const part = closes.slice(0, i + 1);
        const value = sma(part, 60);
        return value ? { time: d.time, value } : null;
      })
      .filter(Boolean);

    const boll = stock.history
      .map((d, i) => {
        const part = closes.slice(Math.max(0, i - 19), i + 1);
        if (part.length < 20) return null;
        const mid = sma(part, 20);
        const sd = stddev(part);
        return {
          time: d.time,
          upper: mid + sd * 2,
          mid,
          lower: mid - sd * 2,
        };
      })
      .filter(Boolean);

    const volume = stock.history.map((d) => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? "rgba(34,197,94,.38)" : "rgba(239,68,68,.38)",
    }));

    candleSeries.setData(candles);
    ma5Series.setData(showMA5 ? ma5 : []);
    ma20Series.setData(showMA20 ? ma20 : []);
    ma60Series.setData(showMA60 ? ma60 : []);
    bollUpperSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.upper })) : []);
    bollMidSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.mid })) : []);
    bollLowerSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.lower })) : []);
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
  }, [stock, showMA5, showMA20, showMA60, showBollinger]);

  return <div ref={containerRef} className="trading-chart" />;
}

export default function Stock() {
  const navigate = useNavigate();
  const { symbol } = useParams();
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
  const [rightView, setRightView] = useState("ai");
  const [showMA5, setShowMA5] = useState(true);
  const [showMA20, setShowMA20] = useState(true);
  const [showMA60, setShowMA60] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);

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
    <div className="desktop-shell">
      <style>{`
        body { margin: 0; background: #020617; color: #e5e7eb; font-family: Arial, 'Microsoft JhengHei', sans-serif; }
        button, input, select, textarea { font-family: inherit; }
        button { border: 0; border-radius: 12px; padding: 10px 13px; background: #38bdf8; color: #082f49; font-weight: 800; cursor: pointer; }
        button:disabled { opacity: .55; cursor: not-allowed; }
        button.ghost { background: #1e293b; color: #e5e7eb; border: 1px solid #334155; }
        button.danger { background: #fb7185; color: #450a0a; }
        button.small { padding: 7px 9px; font-size: 12px; }
        input, textarea, select { width: 100%; box-sizing: border-box; background: #020617; color: #e5e7eb; border: 1px solid #334155; border-radius: 12px; padding: 11px; outline: none; }
        label { display: block; color: #cbd5e1; margin: 12px 0 8px; font-size: 13px; }
        h1, h2, h3 { margin: 0; }
        .desktop-shell { min-height: 100vh; background: radial-gradient(circle at top left, #1e293b, #020617 55%); padding-top: 64px; }
        .top-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 999; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; box-sizing: border-box; background: rgba(2, 6, 23, .88); border-bottom: 1px solid rgba(148,163,184,.18); backdrop-filter: blur(14px); }
        .top-left { display: flex; align-items: center; gap: 14px; }
        .brand-title { font-size: 15px; font-weight: 900; color: #e2e8f0; }
        .brand-subtitle { font-size: 12px; color: #94a3b8; margin-top: 2px; }
        .top-symbol { text-align: right; }
        .top-symbol b { font-size: 16px; }
        .top-symbol span { display: block; color: #94a3b8; font-size: 12px; margin-top: 3px; }
        .dashboard-layout { display: grid; grid-template-columns: 320px minmax(620px, 1fr) 360px; gap: 16px; padding: 16px; box-sizing: border-box; }
        .side-panel, .main-panel, .right-panel { background: rgba(15,23,42,.84); border: 1px solid rgba(148,163,184,.22); border-radius: 18px; box-shadow: 0 18px 50px rgba(0,0,0,.32); }
        .side-panel, .right-panel { padding: 16px; height: calc(100vh - 96px); overflow: auto; position: sticky; top: 80px; }
        .main-panel { padding: 16px; min-height: calc(100vh - 96px); }
        .section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .view-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
        .view-tabs button { background: #020617; color: #cbd5e1; border: 1px solid rgba(148,163,184,.2); padding: 9px 8px; font-size: 13px; }
        .view-tabs button.active { background: #38bdf8; color: #082f49; border-color: #38bdf8; }
        .institution-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .institution-card { background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 14px; }
        .institution-card .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .institution-card b { font-size: 18px; }
        .institution-card span { color: #94a3b8; font-size: 12px; }
        .placeholder-box { background: rgba(15,23,42,.8); border: 1px dashed rgba(148,163,184,.35); border-radius: 14px; padding: 14px; color: #94a3b8; font-size: 13px; line-height: 1.6; }
        .section-title h2 { font-size: 18px; }
        .muted { color: #94a3b8; font-size: 13px; }
        .btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .chips button { padding: 7px 9px; background: #172554; color: #bfdbfe; font-size: 12px; }
        .divider { height: 1px; background: rgba(148,163,184,.18); margin: 18px 0; }
        .indicator-toggle { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 10px; }
        .toggle-card { display: flex; align-items: center; gap: 8px; background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 12px; padding: 10px; color: #cbd5e1; font-size: 13px; cursor: pointer; }
        .toggle-card input { width: auto; accent-color: #38bdf8; }
        .signal-card { background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 14px; margin-top: 10px; }
        .signal-card b { display: block; font-size: 16px; margin-bottom: 6px; }
        .signal-card p { color: #94a3b8; font-size: 13px; line-height: 1.55; margin: 0; }
        .error { color: #fecaca; background: rgba(127,29,29,.4); padding: 10px; border-radius: 12px; margin-top: 12px; }
        .watch-box { max-height: 280px; overflow: auto; border: 1px solid rgba(148,163,184,.16); border-radius: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 10px 9px; border-bottom: 1px solid rgba(148,163,184,.14); text-align: left; white-space: nowrap; }
        th { color: #93c5fd; font-size: 12px; position: sticky; top: 0; background: rgba(15,23,42,.96); }
        tr { cursor: pointer; }
        tr:hover { background: rgba(56,189,248,.08); }
        .stock-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 14px; }
        .stock-title h1 { font-size: 28px; margin-bottom: 6px; }
        .tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .tag-row span { background: #172554; color: #bfdbfe; padding: 7px 10px; border-radius: 999px; font-size: 12px; }
        .price { font-size: 30px; font-weight: 900; text-align: right; }
        .price small { display: block; font-size: 14px; margin-top: 4px; }
        .up { color: #f87171; }
        .down { color: #4ade80; }
        .trading-chart { width: 100%; min-height: 620px; border-radius: 16px; overflow: hidden; background: #020617; }
        .score-hero { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 14px; }
        .score-main { background: linear-gradient(135deg, rgba(56,189,248,.22), rgba(37,99,235,.18)); border: 1px solid rgba(56,189,248,.28); border-radius: 18px; padding: 18px; text-align: center; }
        .score-main b { display: block; font-size: 48px; line-height: 1; }
        .score-main span { color: #bfdbfe; font-size: 13px; }
        .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .metric-card { background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 13px; }
        .metric-card b { display: block; font-size: 20px; margin-bottom: 4px; }
        .metric-card span { color: #94a3b8; font-size: 12px; }
        .empty { color: #94a3b8; padding: 18px; }
        .favorite-list { display: grid; gap: 8px; }
        .favorite-item { display: flex; justify-content: space-between; gap: 8px; align-items: center; background: #020617; border: 1px solid rgba(148,163,184,.16); border-radius: 14px; padding: 10px; }
        .favorite-item b { display: block; }
        .favorite-item span { color: #94a3b8; font-size: 12px; }
        @media (max-width: 1280px) {
          .dashboard-layout { grid-template-columns: 300px minmax(520px, 1fr); }
          .right-panel { grid-column: 1 / -1; height: auto; position: static; }
          .metric-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>

      <header className="top-bar">
        <div className="top-left">
          <button className="ghost small" onClick={() => navigate("/")}>← 返回首頁</button>
          <div>
            <div className="brand-title">AI 股票雷達 Pro</div>
            <div className="brand-subtitle">Desktop Dashboard</div>
          </div>
        </div>
        <div className="top-symbol">
          <b>{stock?.symbol || query}</b>
          <span>{stock?.name || "尚未載入股票資料"}</span>
        </div>
      </header>

      <main className="dashboard-layout">
        <aside className="side-panel">
          <div className="section-title">
            <h2>🔎 搜尋</h2>
          </div>

          <label>股票代碼或名稱</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如 2330、AAPL、SPY"
            onKeyDown={(e) => e.key === "Enter" && searchOne()}
          />

          <label>資料區間</label>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="3mo">3個月</option>
            <option value="6mo">6個月</option>
            <option value="1y">1年</option>
            <option value="2y">2年</option>
            <option value="5y">5年</option>
          </select>

          <div className="btn-row">
            <button onClick={() => searchOne()} disabled={loading}>{loading ? "查詢中..." : "查詢股票"}</button>
            {stock && favorites.some((item) => item.symbol === stock.symbol) ? (
              <button className="danger" onClick={() => removeFavorite(stock.symbol)}>取消收藏</button>
            ) : (
              <button className="ghost" onClick={() => addFavorite(stock)}>收藏</button>
            )}
          </div>

          {suggestion.length > 0 && (
            <div className="chips">
              {suggestion.map(([name, code]) => (
                <button key={name} onClick={() => searchOne(code)}>{code} {name}</button>
              ))}
            </div>
          )}

          {error && <p className="error">{error}</p>}

          <div className="divider" />

          <div className="section-title">
            <h2>📐 指標開關</h2>
          </div>
          <div className="indicator-toggle">
            <label className="toggle-card"><input type="checkbox" checked={showMA5} onChange={(e) => setShowMA5(e.target.checked)} /> MA5 日線</label>
            <label className="toggle-card"><input type="checkbox" checked={showMA20} onChange={(e) => setShowMA20(e.target.checked)} /> MA20 月線</label>
            <label className="toggle-card"><input type="checkbox" checked={showMA60} onChange={(e) => setShowMA60(e.target.checked)} /> MA60 季線</label>
            <label className="toggle-card"><input type="checkbox" checked={showBollinger} onChange={(e) => setShowBollinger(e.target.checked)} /> 布林通道</label>
          </div>

          <div className="divider" />

          <div className="section-title">
            <h2>⭐ 收藏</h2>
          </div>
          {favorites.length > 0 ? (
            <div className="favorite-list">
              {favorites.map((item) => (
                <div className="favorite-item" key={item.symbol}>
                  <div>
                    <b>{item.symbol}</b>
                    <span>{item.name}</span>
                  </div>
                  <div className="btn-row" style={{ marginTop: 0 }}>
                    <button className="ghost small" onClick={() => searchOne(item.symbol)}>查看</button>
                    <button className="danger small" onClick={() => removeFavorite(item.symbol)}>刪除</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">尚未收藏股票。</p>
          )}

          <div className="divider" />

          <div className="section-title">
            <h2>⚡ 掃描</h2>
          </div>
          <label>自選清單，最多 20 檔</label>
          <textarea rows={4} value={watchText} onChange={(e) => setWatchText(e.target.value)} />
          <div className="btn-row">
            <button className="ghost" onClick={scanWatchList} disabled={scanning}>{scanning ? "掃描中..." : "掃描"}</button>
            <button className={autoScan ? "danger" : "ghost"} onClick={() => setAutoScan((v) => !v)}>
              {autoScan ? "停止5秒" : "5秒刷新"}
            </button>
          </div>
          <p className="muted">自動刷新建議控制在 5～10 檔，避免 API 太慢。</p>
        </aside>

        <section className="main-panel">
          <div className="stock-head">
            <div className="stock-title">
              <h1>{stock ? `${stock.symbol} ${stock.name}` : "請搜尋股票"}</h1>
              <p className="muted">互動 K 線、MA5 / MA20、成交量</p>
            </div>
            {stock && (
              <div className={stock.changePct >= 0 ? "price up" : "price down"}>
                {stock.close?.toFixed?.(2)}
                <small>{stock.changePct.toFixed(2)}%</small>
              </div>
            )}
          </div>

          {stock ? (
            <>
              <TradingChart stock={stock} showMA5={showMA5} showMA20={showMA20} showMA60={showMA60} showBollinger={showBollinger} />
              <div className="tag-row">
                {stock.tags.length ? stock.tags.map((t) => <span key={t}>{t}</span>) : <span>暫無強勢訊號</span>}
              </div>
            </>
          ) : (
            <p className="empty">請從左側搜尋股票，或使用網址 /stock/2330。</p>
          )}

          {watchList.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="section-title">
                <h2>🔥 自選排行榜</h2>
              </div>
              <div className="watch-box">
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
                      <tr key={s.symbol} onClick={() => setStock(s)}>
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
            </div>
          )}
        </section>

        <aside className="right-panel">
          <div className="view-tabs">
            <button className={rightView === "ai" ? "active" : ""} onClick={() => setRightView("ai")}>AI分析</button>
            <button className={rightView === "signals" ? "active" : ""} onClick={() => setRightView("signals")}>指標訊號</button>
            <button className={rightView === "institution" ? "active" : ""} onClick={() => setRightView("institution")}>法人</button>
          </div>

          {rightView === "ai" && (
            <>
              <div className="section-title">
                <h2>🧠 AI 分析</h2>
              </div>

              {stock ? (
                <>
                  <div className="score-hero">
                    <div className="score-main">
                      <b>{stock.score}</b>
                      <span>{stock.level}</span>
                    </div>
                  </div>

                  <div className="metric-grid">
                    <div className="metric-card"><b>{stock.rsi?.toFixed(1) ?? "--"}</b><span>RSI｜{stock.rsiLabel}</span></div>
                    <div className="metric-card"><b>{stock.k?.toFixed(1) ?? "--"}</b><span>K 值</span></div>
                    <div className="metric-card"><b>{stock.d?.toFixed(1) ?? "--"}</b><span>D 值</span></div>
                    <div className="metric-card"><b>{stock.macdHist?.toFixed(2) ?? "--"}</b><span>MACD</span></div>
                    <div className="metric-card"><b>{stock.ma5?.toFixed(2) ?? "--"}</b><span>MA5</span></div>
                    <div className="metric-card"><b>{stock.ma20?.toFixed(2) ?? "--"}</b><span>MA20</span></div>
                    <div className="metric-card"><b>{stock.volumeRatio?.toFixed(2) ?? "--"}</b><span>量比</span></div>
                    <div className="metric-card"><b>{stock.backtest.trades}</b><span>交易次數</span></div>
                  </div>

                  <div className="divider" />

                  <div className="section-title">
                    <h2>📈 回測</h2>
                  </div>
                  <div className="metric-grid">
                    <div className="metric-card"><b>{stock.backtest.totalReturn}%</b><span>策略報酬</span></div>
                    <div className="metric-card"><b>{stock.backtest.winRate}%</b><span>勝率</span></div>
                    <div className="metric-card"><b>{stock.backtest.maxDrawdown}%</b><span>最大回撤</span></div>
                    <div className="metric-card"><b>{stock.backtest.trades}</b><span>交易數</span></div>
                  </div>
                </>
              ) : (
                <p className="empty">尚無分析資料。</p>
              )}
            </>
          )}

          {rightView === "signals" && (
            <>
              <div className="section-title">
                <h2>📊 指標訊號</h2>
              </div>

              {stock ? (
                <>
                  <div className="signal-card">
                    <b>{stock.volumeSignal.title}</b>
                    <p>{stock.volumeSignal.detail}</p>
                  </div>

                  <div className="signal-card">
                    <b>{stock.candlePattern.title}</b>
                    <p>{stock.candlePattern.detail}</p>
                  </div>

                  <div className="signal-card">
                    <b>RSI｜{stock.rsiLabel}</b>
                    <p>RSI 目前為 {stock.rsi?.toFixed(1) ?? "--"}。55 以上偏多，45 以下偏弱，70 以上需留意過熱。</p>
                  </div>

                  <div className="signal-card">
                    <b>布林通道</b>
                    <p>布林通道已加入圖表開關。價格靠近上緣代表偏強但可能震盪，靠近下緣代表偏弱或反彈觀察。</p>
                  </div>
                </>
              ) : (
                <p className="empty">尚無指標資料。</p>
              )}
            </>
          )}

          {rightView === "institution" && (
            <>
              <div className="section-title">
                <h2>🏦 法人籌碼</h2>
              </div>

              <div className="placeholder-box">
                法人資料頁面已建立。外資、投信、自營商資料不屬於 Yahoo K 線資料，下一步需要另外接法人資料來源後，這裡就能顯示每日買賣超。
              </div>

              <div className="divider" />

              <div className="institution-grid">
                <div className="institution-card">
                  <div className="row"><b>外資</b><span>Foreign Investors</span></div>
                  <p className="muted">待接 API：今日買賣超、連續買賣天數、5日合計。</p>
                </div>
                <div className="institution-card">
                  <div className="row"><b>投信</b><span>Investment Trust</span></div>
                  <p className="muted">待接 API：投信買賣超、是否連買、波段法人動向。</p>
                </div>
                <div className="institution-card">
                  <div className="row"><b>自營商</b><span>Dealer</span></div>
                  <p className="muted">待接 API：自營商買賣超、避險或方向單變化。</p>
                </div>
              </div>

              <div className="divider" />

              <div className="signal-card">
                <b>法人解讀規則</b>
                <p>
                  外資連買 + 投信同步買超：偏多。<br />
                  股價上漲但法人賣超：追價需保守。<br />
                  三大法人同步買超：籌碼偏強。<br />
                  投信連買通常代表中線題材較明確。
                </p>
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
