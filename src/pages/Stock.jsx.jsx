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
  const code = upper.match(/\d{4,6}[A-Z]?/)?.[0];
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

function stddev(values) {
  if (!values.length) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
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

  if (bodyRatio <= 0.15) return { title: "十字線｜多空觀望", detail: "開收盤接近，代表多空拉鋸，常出現在轉折或整理區。" };
  if (upperRatio >= 0.45 && upperShadow > body * 1.5) return { title: "長上影線｜壓力大", detail: "盤中衝高後回落，上方賣壓明顯。" };
  if (lowerRatio >= 0.45 && lowerShadow > body * 1.5) return { title: "長下影線｜有支撐", detail: "盤中下殺後拉回，下方承接力道出現。" };
  if (isUp && latest.close > prev.high) return { title: "突破K｜偏強", detail: "收盤突破前一根高點，短線動能較強。" };
  if (!isUp && latest.close < prev.low) return { title: "跌破K｜偏弱", detail: "收盤跌破前一根低點，短線賣壓較重。" };
  if (isUp) return { title: "紅K｜買盤較強", detail: "收盤高於開盤，多方略占優勢。" };
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

function createTradeSignal({ score, rsi, macd, trendUp, longTrendUp, volumeRatio, changePct, volumeSignal, candlePattern, close, atr }) {
  const reasons = [];
  const risk = [];

  if (trendUp) reasons.push("短線均線偏多");
  else risk.push("短線均線尚未轉強");

  if (longTrendUp) reasons.push("中線趨勢偏多");
  else risk.push("中線趨勢仍需確認");

  if (macd?.hist > 0) reasons.push("MACD 動能翻正");
  else risk.push("MACD 動能偏弱");

  if (volumeRatio !== null && volumeRatio >= 1.25) reasons.push("成交量放大");
  if (volumeSignal?.title?.includes("出貨")) risk.push("爆量不漲，有出貨疑慮");
  if (candlePattern?.title?.includes("長上影")) risk.push("長上影線，上方賣壓大");
  if (rsi !== null && rsi >= 75) risk.push("RSI 過熱，追高風險較高");
  if (changePct > 5) risk.push("短線漲幅過大，容易震盪");

  let action = "HOLD";
  let label = "觀望";
  let tone = "neutral";

  if (score >= 78 && trendUp && macd?.hist > 0 && rsi < 75 && !volumeSignal?.title?.includes("出貨")) {
    action = "BUY";
    label = "偏多買進觀察";
    tone = "buy";
  } else if (score >= 60 && trendUp) {
    action = "HOLD";
    label = "偏多續抱";
    tone = "hold";
  } else if (score <= 35 || (!trendUp && macd?.hist < 0)) {
    action = "SELL";
    label = "偏弱避開";
    tone = "sell";
  }

  const safeAtr = atr || close * 0.025;
  const stopLoss = action === "BUY" ? close - safeAtr * 1.5 : close + safeAtr * 1.5;
  const takeProfit = action === "BUY" ? close + safeAtr * 2.5 : close - safeAtr * 2.0;

  return {
    action,
    label,
    tone,
    stopLoss,
    takeProfit,
    reasons: reasons.length ? reasons : ["尚未出現明確多方訊號"],
    risk: risk.length ? risk : ["目前未偵測到明顯風險，但仍需控管停損"],
  };
}

function calcATR(history, period = 14) {
  if (history.length <= period) return null;
  const trs = [];
  for (let i = 1; i < history.length; i++) {
    const highLow = history[i].high - history[i].low;
    const highClose = Math.abs(history[i].high - history[i - 1].close);
    const lowClose = Math.abs(history[i].low - history[i - 1].close);
    trs.push(Math.max(highLow, highClose, lowClose));
  }
  return sma(trs, period);
}

function predictWinRate({ score, rsi, trendUp, longTrendUp, volumeRatio, backtest }) {
  let rate = 45;
  if (score >= 80) rate += 14;
  else if (score >= 60) rate += 8;
  else if (score <= 35) rate -= 8;
  if (trendUp) rate += 6;
  if (longTrendUp) rate += 5;
  if (volumeRatio !== null && volumeRatio >= 1.25) rate += 5;
  if (rsi !== null && rsi > 70) rate -= 6;
  if (backtest?.winRate) rate = rate * 0.65 + backtest.winRate * 0.35;
  return Math.max(15, Math.min(85, Math.round(rate)));
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
  const atr = calcATR(history);

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

  // 多因子 AI 評分：技術面 + 量能 + 趨勢 + 波動 + 回測
  let techScore = 0;
  if (rsi !== null && rsi > 55) techScore += 50;
  if (macd?.hist > 0) techScore += 50;

  let volumeScore = 30;
  if (volumeRatio !== null) {
    if (volumeRatio > 1.35) volumeScore = 100;
    else if (volumeRatio > 1) volumeScore = 60;
  }

  let trendScore = 30;
  if (trendUp && longTrendUp) trendScore = 100;
  else if (trendUp) trendScore = 70;

  let volatilityScore = Math.min(Math.abs(changePct) * 10, 100);
  if (changePct < 0) volatilityScore *= 0.55;

  let backtestScore = 40;
  if (backtest.totalReturn > 10 && backtest.winRate >= 55) backtestScore = 90;
  else if (backtest.totalReturn > 0) backtestScore = 65;

  let score =
    techScore * 0.35 +
    volumeScore * 0.2 +
    trendScore * 0.25 +
    volatilityScore * 0.1 +
    backtestScore * 0.1;

  if (breakout) score += 6;
  if (kd.golden) score += 5;
  if (nearLow) score -= 6;
  if (rsi !== null && rsi > 78) score -= 10;

  const scoreClamped = Math.max(0, Math.min(100, Math.round(score)));

  const tags = [];
  if (trendUp) tags.push("短線多頭");
  if (longTrendUp) tags.push("中線多頭");
  if (macdBull) tags.push("MACD翻紅");
  if (kd.golden) tags.push("KD金叉");
  if (volumeHot) tags.push("放量");
  if (breakout) tags.push("接近突破");
  if (backtest.totalReturn > 0) tags.push("回測正報酬");

  let level = "📉 偏弱";
  if (scoreClamped >= 80) level = "🔥 強勢";
  else if (scoreClamped >= 60) level = "📈 偏多";
  else if (scoreClamped >= 40) level = "⚖️ 中性";

  const winRatePredict = predictWinRate({
    score: scoreClamped,
    rsi,
    trendUp,
    longTrendUp,
    volumeRatio,
    backtest,
  });

  const tradeSignal = createTradeSignal({
    score: scoreClamped,
    rsi,
    macd,
    trendUp,
    longTrendUp,
    volumeRatio,
    changePct,
    volumeSignal,
    candlePattern,
    close,
    atr,
  });

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
    score: scoreClamped,
    level,
    tags,
    backtest,
    volumeSignal,
    candlePattern,
    rsiLabel: rsiText(rsi),
    tradeSignal,
    winRatePredict,
  };
}

function TradingChart({ stock, showMA5, showMA20, showMA60, showBollinger }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !stock?.history?.length) return;

    const chart = createChart(containerRef.current, {
      height: 560,
      layout: { background: { color: "#020617" }, textColor: "#cbd5e1" },
      grid: {
        vertLines: { color: "rgba(148,163,184,.12)" },
        horzLines: { color: "rgba(148,163,184,.12)" },
      },
      rightPriceScale: { borderColor: "rgba(148,163,184,.25)" },
      timeScale: { borderColor: "rgba(148,163,184,.25)", timeVisible: true, secondsVisible: false },
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

    const ma5Series = chart.addSeries(LineSeries, { color: "#facc15", lineWidth: 2, priceLineVisible: false });
    const ma20Series = chart.addSeries(LineSeries, { color: "#60a5fa", lineWidth: 2, priceLineVisible: false });
    const ma60Series = chart.addSeries(LineSeries, { color: "#a78bfa", lineWidth: 2, priceLineVisible: false });
    const bollUpperSeries = chart.addSeries(LineSeries, { color: "rgba(45,212,191,.9)", lineWidth: 1, priceLineVisible: false });
    const bollMidSeries = chart.addSeries(LineSeries, { color: "rgba(45,212,191,.55)", lineWidth: 1, priceLineVisible: false });
    const bollLowerSeries = chart.addSeries(LineSeries, { color: "rgba(45,212,191,.9)", lineWidth: 1, priceLineVisible: false });
    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "volume" });

    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const candles = stock.history.map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close }));
    const closes = stock.history.map((x) => x.close);

    const buildMA = (period) =>
      stock.history
        .map((d, i) => {
          const value = sma(closes.slice(0, i + 1), period);
          return value ? { time: d.time, value } : null;
        })
        .filter(Boolean);

    const boll = stock.history
      .map((d, i) => {
        const part = closes.slice(Math.max(0, i - 19), i + 1);
        if (part.length < 20) return null;
        const mid = sma(part, 20);
        const sd = stddev(part);
        return { time: d.time, upper: mid + sd * 2, mid, lower: mid - sd * 2 };
      })
      .filter(Boolean);

    const volume = stock.history.map((d) => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? "rgba(34,197,94,.38)" : "rgba(239,68,68,.38)",
    }));

    candleSeries.setData(candles);
    ma5Series.setData(showMA5 ? buildMA(5) : []);
    ma20Series.setData(showMA20 ? buildMA(20) : []);
    ma60Series.setData(showMA60 ? buildMA(60) : []);
    bollUpperSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.upper })) : []);
    bollMidSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.mid })) : []);
    bollLowerSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.lower })) : []);
    volumeSeries.setData(volume);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
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
  const [range, setRange] = useState("1y");
  const [stock, setStock] = useState(null);
  const [watchList, setWatchList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [error, setError] = useState("");
  const [rightView, setRightView] = useState("ai");
  const [watchMenuOpen, setWatchMenuOpen] = useState(false);
  const [newWatchSymbol, setNewWatchSymbol] = useState("");
  const [favoriteNotice, setFavoriteNotice] = useState("");
  const [activeMenu, setActiveMenu] = useState("analysis");
  const [sortMode, setSortMode] = useState("score");
  const [showMA5, setShowMA5] = useState(true);
  const [showMA20, setShowMA20] = useState(true);
  const [showMA60, setShowMA60] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);

  useEffect(() => {
    localStorage.setItem("stockRadarFavorites", JSON.stringify(favorites));
  }, [favorites]);

  function addFavorite(targetStock = stock) {
    if (!targetStock?.symbol) {
      setFavoriteNotice("請先查詢股票，再加入收藏");
      return;
    }

    setFavorites((prev) => {
      const exists = prev.some((item) => item.symbol === targetStock.symbol);
      if (exists) {
        setFavoriteNotice(`${targetStock.symbol} 已在收藏清單`);
        return prev;
      }

      setFavoriteNotice(`已收藏 ${targetStock.symbol}`);
      return [...prev, { symbol: targetStock.symbol, name: targetStock.name }];
    });
  }

  function removeFavorite(symbol) {
    setFavorites((prev) => prev.filter((item) => item.symbol !== symbol));
    setFavoriteNotice(`已移除 ${symbol}`);
  }

  function addWatchSymbol() {
    const value = newWatchSymbol.trim().toUpperCase();
    if (!value) return;
    const items = watchText
      .split(/[ ,，]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean);

    if (!items.includes(value)) {
      setWatchText([...items, value].join(","));
    }
    setNewWatchSymbol("");
    setWatchMenuOpen(false);
  }

  function removeSelectedWatchSymbol() {
    const value = newWatchSymbol.trim().toUpperCase();
    if (!value) return;
    const items = watchText
      .split(/[ ,，]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)
      .filter((item) => item !== value);

    setWatchText(items.join(","));
    setNewWatchSymbol("");
    setWatchMenuOpen(false);
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
      setActiveMenu("analysis");
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
        .slice(0, 30);

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
      setWatchList(result);
      if (!stock && result[0]) setStock(result[0]);
      setActiveMenu("watchlist");
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

  const sortedWatchList = useMemo(() => {
    const list = [...watchList];
    const sorters = {
      score: (a, b) => b.score - a.score,
      change: (a, b) => b.changePct - a.changePct,
      volume: (a, b) => (b.volumeRatio || 0) - (a.volumeRatio || 0),
      rsi: (a, b) => (b.rsi || 0) - (a.rsi || 0),
      win: (a, b) => (b.winRatePredict || 0) - (a.winRatePredict || 0),
    };
    return list.sort(sorters[sortMode] || sorters.score);
  }, [watchList, sortMode]);

  const marketStats = useMemo(() => {
    const up = watchList.filter((s) => s.changePct > 0).length;
    const down = watchList.filter((s) => s.changePct < 0).length;
    const avg = watchList.length ? watchList.reduce((sum, s) => sum + s.changePct, 0) / watchList.length : 0;
    return { up, down, avg };
  }, [watchList]);

  const suggestion = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return Object.entries(NAME_TO_CODE)
      .filter(([name, code]) => name.includes(q) || code.includes(q))
      .slice(0, 8);
  }, [query]);

  return (
    <div className="terminal-shell">
      <style>{`
        body { margin: 0; background: #050914; color: #e5e7eb; font-family: Arial, 'Microsoft JhengHei', sans-serif; }
        button, input, select, textarea { font-family: inherit; }
        button { border: 0; border-radius: 12px; padding: 10px 13px; background: #22d3ee; color: #06202a; font-weight: 900; cursor: pointer; }
        button:disabled { opacity: .55; cursor: not-allowed; }
        button.ghost { background: #111827; color: #e5e7eb; border: 1px solid #334155; }
        button.danger { background: #fb7185; color: #450a0a; }
        button.small { padding: 7px 9px; font-size: 12px; }
        input, textarea, select { width: 100%; box-sizing: border-box; background: #020617; color: #e5e7eb; border: 1px solid #334155; border-radius: 12px; padding: 11px; outline: none; }
        label { display: block; color: #cbd5e1; margin: 12px 0 8px; font-size: 13px; }
        h1, h2, h3 { margin: 0; }
        .terminal-shell { min-height: 100vh; background: radial-gradient(circle at top left, #1e293b, #050914 50%); }
        #root { width: 100vw; min-height: 100vh; margin: 0; padding: 0; }
        .app-frame { min-height: 100vh; }
        .left-nav { position: fixed !important; left: 0; top: 0; bottom: 0; width: 170px; z-index: 1000; }
        .content { margin-left: 170px; min-height: 100vh; }
        .left-nav { background: rgba(2,6,23,.92); border-right: 1px solid rgba(148,163,184,.16); padding: 14px 10px; height: 100vh; box-sizing: border-box; }
        .logo { display: flex; gap: 10px; align-items: center; padding: 8px 8px 18px; border-bottom: 1px solid rgba(148,163,184,.14); margin-bottom: 12px; }
        .logo-icon { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg,#38bdf8,#8b5cf6); display: grid; place-items: center; font-weight: 900; }
        .logo b { display: block; font-size: 14px; }
        .logo span { color: #64748b; font-size: 11px; }
        .nav-btn { width: 100%; display: flex; align-items: center; gap: 8px; margin-bottom: 7px; background: transparent; color: #94a3b8; border: 1px solid transparent; justify-content: flex-start; padding: 10px; }
        .nav-btn.active { color: #67e8f9; background: rgba(34,211,238,.12); border-color: rgba(34,211,238,.35); }
        .content { padding: 16px; margin-left: 170px; }
        .top-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
        .top-title h1 { font-size: 28px; }
        .top-title p { color: #94a3b8; font-size: 13px; margin: 6px 0 0; }
        .top-stats { display: flex; gap: 12px; align-items: center; }
        .mini-stat { min-width: 92px; background: rgba(15,23,42,.86); border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 10px 12px; }
        .mini-stat span { color: #94a3b8; font-size: 11px; }
        .mini-stat b { display: block; font-size: 17px; margin-top: 3px; }
        .card { background: rgba(15,23,42,.84); border: 1px solid rgba(148,163,184,.18); border-radius: 18px; box-shadow: 0 18px 50px rgba(0,0,0,.32); padding: 16px; }
        .favorite-action { background: linear-gradient(135deg, #facc15, #fb923c); color: #1f1300; }
        .favorite-action.saved { background: #14532d; color: #bbf7d0; border: 1px solid rgba(34,197,94,.45); }
        .favorite-notice { margin-top: 8px; color: #facc15; font-size: 13px; }
        .watch-actions { position: relative; display: inline-block; }
        .watch-menu { position: absolute; right: 0; top: 44px; z-index: 20; width: 280px; background: #020617; border: 1px solid rgba(148,163,184,.25); border-radius: 16px; padding: 12px; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
        .chart-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .chart-tools .indicator-toggle { margin-top: 0; min-width: 440px; }
        .summary-grid { display: grid; grid-template-columns: 1.1fr 1fr .8fr 1fr; gap: 12px; margin-bottom: 12px; }
        .main-grid { display: grid; grid-template-columns: minmax(680px, 1fr) 390px; gap: 12px; align-items: start; }
        .section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .section-title h2 { font-size: 18px; }
        .muted { color: #94a3b8; font-size: 13px; }
        .btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .chips button { padding: 7px 9px; background: #172554; color: #bfdbfe; font-size: 12px; }
        .divider { height: 1px; background: rgba(148,163,184,.16); margin: 14px 0; }
        .market-card { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .market-box { background: #020617; border: 1px solid rgba(148,163,184,.14); border-radius: 14px; padding: 12px; }
        .market-box b { display: block; font-size: 22px; }
        .up { color: #34d399; }
        .down { color: #fb7185; }
        .neutral { color: #facc15; }
        .stock-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px; }
        .stock-title h1 { font-size: 24px; margin-bottom: 5px; }
        .price { font-size: 30px; font-weight: 900; text-align: right; }
        .price small { display: block; font-size: 14px; margin-top: 4px; }
        .trading-chart { width: 100%; min-height: 560px; border-radius: 16px; overflow: hidden; background: #020617; }
        .tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .tag-row span { background: #172554; color: #bfdbfe; padding: 7px 10px; border-radius: 999px; font-size: 12px; }
        .indicator-toggle { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 10px; }
        .toggle-card { display: flex; align-items: center; gap: 8px; background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 12px; padding: 10px; color: #cbd5e1; font-size: 13px; cursor: pointer; }
        .toggle-card input { width: auto; accent-color: #38bdf8; }
        .view-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
        .view-tabs button { background: #020617; color: #cbd5e1; border: 1px solid rgba(148,163,184,.2); padding: 9px 8px; font-size: 13px; }
        .view-tabs button.active { background: #38bdf8; color: #082f49; border-color: #38bdf8; }
        .score-main { background: linear-gradient(135deg, rgba(56,189,248,.22), rgba(37,99,235,.18)); border: 1px solid rgba(56,189,248,.28); border-radius: 18px; padding: 18px; text-align: center; margin-bottom: 12px; }
        .score-main b { display: block; font-size: 48px; line-height: 1; }
        .score-main span { color: #bfdbfe; font-size: 13px; }
        .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .metric-card { background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 13px; }
        .metric-card b { display: block; font-size: 20px; margin-bottom: 4px; }
        .metric-card span { color: #94a3b8; font-size: 12px; }
        .trade-signal { border-radius: 18px; padding: 16px; margin-bottom: 14px; border: 1px solid rgba(148,163,184,.22); background: #020617; }
        .trade-signal.buy { border-color: rgba(34,197,94,.45); background: rgba(20,83,45,.2); }
        .trade-signal.hold { border-color: rgba(250,204,21,.42); background: rgba(113,63,18,.18); }
        .trade-signal.sell { border-color: rgba(248,113,113,.42); background: rgba(127,29,29,.18); }
        .signal-action { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
        .signal-action b { font-size: 30px; letter-spacing: 1px; }
        .signal-action span { display: block; color: #cbd5e1; font-size: 13px; margin-top: 4px; }
        .signal-list { margin: 8px 0 0; padding-left: 18px; color: #94a3b8; font-size: 13px; line-height: 1.65; }
        .signal-card { background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 14px; margin-top: 10px; }
        .signal-card b { display: block; font-size: 16px; margin-bottom: 6px; }
        .signal-card p { color: #94a3b8; font-size: 13px; line-height: 1.55; margin: 0; }
        .watch-table-card { margin-top: 12px; }
        .table-wrap { overflow: auto; border: 1px solid rgba(148,163,184,.16); border-radius: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 12px 10px; border-bottom: 1px solid rgba(148,163,184,.14); text-align: left; white-space: nowrap; }
        th { color: #93c5fd; font-size: 12px; background: rgba(15,23,42,.96); }
        tr { cursor: pointer; }
        tr:hover { background: rgba(56,189,248,.08); }
        .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 8px; font-size: 12px; background: #020617; border: 1px solid rgba(148,163,184,.2); color: #cbd5e1; }
        .favorite-list { display: grid; gap: 8px; }
        .favorite-item { display: flex; justify-content: space-between; gap: 8px; align-items: center; background: #020617; border: 1px solid rgba(148,163,184,.16); border-radius: 14px; padding: 10px; }
        .empty { color: #94a3b8; padding: 18px; }
        .error { color: #fecaca; background: rgba(127,29,29,.4); padding: 10px; border-radius: 12px; margin-top: 12px; }
        @media (max-width: 1300px) { .summary-grid, .main-grid { grid-template-columns: 1fr; } .left-nav { width: 150px; } .content { margin-left: 150px; } .chart-tools { align-items: stretch; flex-direction: column; } .chart-tools .indicator-toggle { min-width: 0; width: 100%; } }
      `}</style>

      <div className="app-frame">
        <aside className="left-nav">
          <div className="logo">
            <div className="logo-icon">↗</div>
            <div><b>股市雷達</b><span>Quant Terminal</span></div>
          </div>
          <button className={`nav-btn ${activeMenu === "analysis" ? "active" : ""}`} onClick={() => setActiveMenu("analysis")}>📊 分析看板</button>
          <button className={`nav-btn ${activeMenu === "watchlist" ? "active" : ""}`} onClick={() => setActiveMenu("watchlist")}>⭐ 自選股票</button>
          <button className={`nav-btn ${activeMenu === "signals" ? "active" : ""}`} onClick={() => setActiveMenu("signals")}>🚨 強勢掃描</button>
          <button className={`nav-btn ${activeMenu === "report" ? "active" : ""}`} onClick={() => setActiveMenu("report")}>🧾 每日報告</button>
          <button className={`nav-btn ${activeMenu === "settings" ? "active" : ""}`} onClick={() => setActiveMenu("settings")}>⚙️ 參數設定</button>
          <button className="nav-btn" onClick={() => navigate("/")}>← 返回首頁</button>
        </aside>

        <section className="content">
          <header className="top-bar">
            <div className="top-title">
              <h1>股市分析</h1>
              <p>追蹤台股、美股與 ETF，整合 AI 分數、K線、量價與進出場提示。</p>
            </div>
            <div className="top-stats">
              <div className="mini-stat"><span>目前標的</span><b>{stock?.symbol || query}</b></div>
              <div className="mini-stat"><span>AI分數</span><b>{stock?.score ?? "--"}</b></div>
              <div className="mini-stat"><span>勝率預測</span><b>{stock?.winRatePredict ? `${stock.winRatePredict}%` : "--"}</b></div>
            </div>
          </header>

          {activeMenu === "analysis" && (
            <>
              <div className="summary-grid">
                <div className="card">
                  <div className="section-title"><h2>加入自選或搜尋</h2></div>
                  <label>股票代碼或名稱</label>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="2330、00919、AAPL、SPY" onKeyDown={(e) => e.key === "Enter" && searchOne()} />
                  <label>資料區間</label>
                  <select value={range} onChange={(e) => setRange(e.target.value)}>
                    <option value="3mo">3個月</option>
                    <option value="6mo">6個月</option>
                    <option value="1y">1年</option>
                    <option value="2y">2年</option>
                    <option value="5y">5年</option>
                    <option value="10y">10年</option>
                    <option value="max">最長</option>
                  </select>
                  <div className="btn-row">
                    <button onClick={() => searchOne()} disabled={loading}>{loading ? "查詢中..." : "查詢股票"}</button>
                    <button
                      className={`favorite-action ${stock && favorites.some((item) => item.symbol === stock.symbol) ? "saved" : ""}`}
                      onClick={() => addFavorite(stock)}
                    >
                      {stock && favorites.some((item) => item.symbol === stock.symbol) ? "已收藏" : "加入收藏"}
                    </button>
                  </div>
                  {suggestion.length > 0 && <div className="chips">{suggestion.map(([name, code]) => <button key={name} onClick={() => searchOne(code)}>{code} {name}</button>)}</div>}
                  {favoriteNotice && <p className="favorite-notice">{favoriteNotice}</p>}
                  {error && <p className="error">{error}</p>}
                </div>

                <div className="card">
                  <div className="section-title"><h2>目前選股</h2></div>
                  <h2>{stock?.symbol || query}</h2>
                  <p className="muted">{stock?.name || "尚未載入資料"}</p>
                  <div className={stock?.changePct >= 0 ? "price up" : "price down"}>{stock?.close?.toFixed?.(2) ?? "--"}<small>{stock?.changePct?.toFixed?.(2) ?? "--"}%</small></div>
                </div>

                <div className="card">
                  <div className="section-title"><h2>市場寬度</h2></div>
                  <div className="market-card">
                    <div className="market-box"><span className="muted">上漲</span><b className="up">{marketStats.up}</b></div>
                    <div className="market-box"><span className="muted">下跌</span><b className="down">{marketStats.down}</b></div>
                    <div className="market-box"><span className="muted">平均</span><b className={marketStats.avg >= 0 ? "up" : "down"}>{marketStats.avg.toFixed(2)}%</b></div>
                  </div>
                </div>

                <div className="card">
                  <div className="section-title"><h2>AI 交易看板</h2></div>
                  <button style={{ width: "100%" }} onClick={scanWatchList} disabled={scanning}>{scanning ? "掃描中..." : "執行強勢掃描"}</button>
                  <p className="muted">用 AI 分數、勝率預測、量比與 RSI 進行排行。</p>
                </div>
              </div>

              <div className="main-grid">
                <div className="card">
                  <div className="stock-head">
                    <div className="stock-title">
                      <h1>{stock ? `${stock.symbol} ${stock.name}` : "請搜尋股票"}</h1>
                      <p className="muted">互動 K 線、MA5 / MA20 / MA60、布林通道、成交量</p>
                    </div>
                    {stock && <div className={stock.changePct >= 0 ? "price up" : "price down"}>{stock.close?.toFixed?.(2)}<small>{stock.changePct.toFixed(2)}%</small></div>}
                  </div>

                  <div className="chart-tools">
                    <div className="muted">圖表指標</div>
                    <div className="indicator-toggle">
                      <label className="toggle-card"><input type="checkbox" checked={showMA5} onChange={(e) => setShowMA5(e.target.checked)} /> MA5 日線</label>
                      <label className="toggle-card"><input type="checkbox" checked={showMA20} onChange={(e) => setShowMA20(e.target.checked)} /> MA20 月線</label>
                      <label className="toggle-card"><input type="checkbox" checked={showMA60} onChange={(e) => setShowMA60(e.target.checked)} /> MA60 季線</label>
                      <label className="toggle-card"><input type="checkbox" checked={showBollinger} onChange={(e) => setShowBollinger(e.target.checked)} /> 布林通道</label>
                    </div>
                  </div>

                  {stock ? <TradingChart stock={stock} showMA5={showMA5} showMA20={showMA20} showMA60={showMA60} showBollinger={showBollinger} /> : <p className="empty">請從上方搜尋股票，或使用網址 /stock/2330。</p>}
                  {stock && <div className="tag-row">{stock.tags.length ? stock.tags.map((t) => <span key={t}>{t}</span>) : <span>暫無強勢訊號</span>}</div>}
                </div>

                <div className="card">
                  <div className="view-tabs">
                    <button className={rightView === "ai" ? "active" : ""} onClick={() => setRightView("ai")}>AI</button>
                    <button className={rightView === "signals" ? "active" : ""} onClick={() => setRightView("signals")}>訊號</button>
                    <button className={rightView === "institution" ? "active" : ""} onClick={() => setRightView("institution")}>法人</button>
                  </div>

                  {rightView === "ai" && stock && (
                    <>
                      <div className={`trade-signal ${stock.tradeSignal.tone}`}>
                        <div className="signal-action"><div><b>{stock.tradeSignal.action}</b><span>{stock.tradeSignal.label}</span></div><span className="badge">AI訊號</span></div>
                        <div className="muted">主要理由</div>
                        <ul className="signal-list">{stock.tradeSignal.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                        <div className="muted" style={{ marginTop: 8 }}>風險提醒</div>
                        <ul className="signal-list">{stock.tradeSignal.risk.map((r) => <li key={r}>{r}</li>)}</ul>
                      </div>

                      <div className="metric-grid">
                        <div className="metric-card"><b>{stock.tradeSignal.stopLoss?.toFixed?.(2)}</b><span>停損 SL</span></div>
                        <div className="metric-card"><b>{stock.tradeSignal.takeProfit?.toFixed?.(2)}</b><span>停利 TP</span></div>
                        <div className="metric-card"><b>{stock.winRatePredict}%</b><span>勝率預測</span></div>
                        <div className="metric-card"><b>{stock.score}</b><span>{stock.level}</span></div>
                      </div>

                      <div className="divider" />
                      <div className="score-main"><b>{stock.score}</b><span>{stock.level}</span></div>
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
                    </>
                  )}

                  {rightView === "signals" && stock && (
                    <>
                      <div className="signal-card"><b>{stock.volumeSignal.title}</b><p>{stock.volumeSignal.detail}</p></div>
                      <div className="signal-card"><b>{stock.candlePattern.title}</b><p>{stock.candlePattern.detail}</p></div>
                      <div className="signal-card"><b>RSI｜{stock.rsiLabel}</b><p>RSI 目前為 {stock.rsi?.toFixed(1) ?? "--"}。55 以上偏多，45 以下偏弱，70 以上需留意過熱。</p></div>
                      <div className="signal-card"><b>布林通道</b><p>價格靠近上緣代表偏強但可能震盪，靠近下緣代表偏弱或反彈觀察。</p></div>
                    </>
                  )}

                  {rightView === "institution" && (
                    <>
                      <div className="signal-card"><b>法人籌碼</b><p>法人資料頁面已建立。外資、投信、自營商資料需另接資料源後顯示每日買賣超。</p></div>
                      <div className="signal-card"><b>法人解讀規則</b><p>外資連買 + 投信同步買超：偏多。三大法人同步買超：籌碼偏強。股價上漲但法人賣超：追價需保守。</p></div>
                    </>
                  )}

                  {!stock && <p className="empty">尚無分析資料。</p>}
                </div>
              </div>
            </>
          )}

          {activeMenu === "watchlist" && (
            <div className="card">
              <div className="section-title">
                <h2>自選股，即時台股與美股標的</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="muted">更新 {new Date().toLocaleString("zh-TW")}</span>
                  <div className="watch-actions">
                    <button className="ghost" onClick={() => setWatchMenuOpen((v) => !v)}>管理標的 ▾</button>
                    {watchMenuOpen && (
                      <div className="watch-menu">
                        <label>新增 / 刪除代碼</label>
                        <input value={newWatchSymbol} onChange={(e) => setNewWatchSymbol(e.target.value)} placeholder="例如 00919、2330、AAPL" />
                        <div className="btn-row">
                          <button onClick={addWatchSymbol}>新增</button>
                          <button className="danger" onClick={removeSelectedWatchSymbol}>刪除</button>
                        </div>
                        <p className="muted">輸入代碼後可加入或從自選清單移除。</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="btn-row" style={{ marginBottom: 12 }}>
                <button onClick={scanWatchList} disabled={scanning}>{scanning ? "掃描中..." : "更新自選資料"}</button>
                <button className={autoScan ? "danger" : "ghost"} onClick={() => setAutoScan((v) => !v)}>{autoScan ? "停止5秒刷新" : "啟動5秒刷新"}</button>
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={{ width: 180 }}>
                  <option value="score">AI分數排序</option>
                  <option value="change">漲跌幅排序</option>
                  <option value="volume">量比排序</option>
                  <option value="rsi">RSI排序</option>
                  <option value="win">勝率預測排序</option>
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>代號</th><th>市場</th><th>價格</th><th>漲跌</th><th>AI</th><th>勝率</th><th>量比</th><th>訊號</th><th>操作</th></tr></thead>
                  <tbody>
                    {sortedWatchList.map((s) => (
                      <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}>
                        <td><b>{s.symbol}</b><br /><span className="muted">{s.name}</span></td>
                        <td><span className="badge">{s.currency === "USD" ? "美股" : "台股"}</span></td>
                        <td>{s.currency} {s.close?.toFixed?.(2)}</td>
                        <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct.toFixed(2)}%</td>
                        <td>{s.score}</td>
                        <td>{s.winRatePredict}%</td>
                        <td>{s.volumeRatio?.toFixed(2) ?? "--"}</td>
                        <td><span className="badge">{s.tradeSignal.action}</span></td>
                        <td><button className="ghost small" onClick={(e) => { e.stopPropagation(); addFavorite(s); }}>收藏</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === "signals" && (
            <div className="card">
              <div className="section-title"><h2>🚨 即時強勢股掃描</h2></div>
              <label>輸入股票清單，最多 30 檔</label>
              <textarea rows={5} value={watchText} onChange={(e) => setWatchText(e.target.value)} />
              <div className="btn-row"><button onClick={scanWatchList} disabled={scanning}>{scanning ? "掃描中..." : "開始掃描"}</button><button className="ghost" onClick={() => setSortMode("score")}>依 AI 排序</button><button className="ghost" onClick={() => setSortMode("win")}>依勝率排序</button></div>
              {sortedWatchList.length > 0 && <div className="watch-table-card table-wrap"><table><thead><tr><th>排名</th><th>股票</th><th>AI</th><th>勝率</th><th>量比</th><th>訊號</th><th>理由</th></tr></thead><tbody>{sortedWatchList.map((s, i) => <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}><td>{i + 1}</td><td>{s.symbol}<br /><span className="muted">{s.name}</span></td><td>{s.score}</td><td>{s.winRatePredict}%</td><td>{s.volumeRatio?.toFixed(2) ?? "--"}</td><td><span className="badge">{s.tradeSignal.action}</span></td><td>{s.tradeSignal.reasons.slice(0,2).join("、")}</td></tr>)}</tbody></table></div>}
            </div>
          )}

          {activeMenu === "report" && (
            <div className="card">
              <div className="section-title"><h2>🧾 每日交易報告</h2><span className="muted">Demo Report</span></div>
              <div className="signal-card"><b>市場背景</b><p>目前依據自選清單統計，上漲 {marketStats.up} 檔，下跌 {marketStats.down} 檔，平均漲跌 {marketStats.avg.toFixed(2)}%。此報告可作為每日盤後觀察模板。</p></div>
              <div className="signal-card"><b>AI摘要</b><p>{sortedWatchList.slice(0,3).map((s) => `${s.symbol}：${s.tradeSignal.action}，AI ${s.score} 分`).join("；") || "尚未掃描自選清單。"}</p></div>
              <div className="signal-card"><b>操作提醒</b><p>BUY 僅代表進場觀察，不代表保證獲利；請搭配停損、停利與自身風險承受度。</p></div>
            </div>
          )}

          {activeMenu === "settings" && (
            <div className="card">
              <div className="section-title"><h2>⚙️ 參數設定</h2></div>
              <div className="indicator-toggle">
                <label className="toggle-card"><input type="checkbox" checked={showMA5} onChange={(e) => setShowMA5(e.target.checked)} /> MA5 日線</label>
                <label className="toggle-card"><input type="checkbox" checked={showMA20} onChange={(e) => setShowMA20(e.target.checked)} /> MA20 月線</label>
                <label className="toggle-card"><input type="checkbox" checked={showMA60} onChange={(e) => setShowMA60(e.target.checked)} /> MA60 季線</label>
                <label className="toggle-card"><input type="checkbox" checked={showBollinger} onChange={(e) => setShowBollinger(e.target.checked)} /> 布林通道</label>
              </div>
              <div className="divider" />
              <label>自選清單</label>
              <textarea rows={5} value={watchText} onChange={(e) => setWatchText(e.target.value)} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
