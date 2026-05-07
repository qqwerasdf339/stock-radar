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

const FAVORITE_GROUPS = ["選單1", "選單2", "選單3", "選單4", "選單5"];

const MARKET_STRONG_POOL = [
  // 上市：權值、電子、AI、金融、傳產
  { symbol: "2330", baseType: "上市權值" },
  { symbol: "2317", baseType: "上市電子" },
  { symbol: "2454", baseType: "上市IC設計" },
  { symbol: "2308", baseType: "上市電源" },
  { symbol: "2382", baseType: "上市AI伺服器" },
  { symbol: "2344", baseType: "上市記憶體" },
  { symbol: "2303", baseType: "上市半導體" },
  { symbol: "2408", baseType: "上市記憶體" },
  { symbol: "3034", baseType: "上市網通" },
  { symbol: "2379", baseType: "上市IC設計" },
  { symbol: "3661", baseType: "上市IC設計" },
  { symbol: "3443", baseType: "上市IC設計" },
  { symbol: "6669", baseType: "上市伺服器" },
  { symbol: "3711", baseType: "上市科技控股" },
  { symbol: "2357", baseType: "上市電腦" },
  { symbol: "2327", baseType: "上市被動元件" },
  { symbol: "4938", baseType: "上市電子零組件" },
  { symbol: "3017", baseType: "上市散熱" },
  { symbol: "2409", baseType: "上市面板" },
  { symbol: "3481", baseType: "上市面板" },
  { symbol: "3234", baseType: "上市中小型強勢" },
  { symbol: "2603", baseType: "上市航運" },
  { symbol: "2609", baseType: "上市航運" },
  { symbol: "2615", baseType: "上市航運" },
  { symbol: "2002", baseType: "上市鋼鐵" },
  { symbol: "1101", baseType: "上市水泥" },
  { symbol: "1102", baseType: "上市水泥" },
  { symbol: "1301", baseType: "上市塑化" },
  { symbol: "1303", baseType: "上市塑化" },
  { symbol: "1216", baseType: "上市食品" },
  { symbol: "2412", baseType: "上市電信" },
  { symbol: "2881", baseType: "上市金融" },
  { symbol: "2882", baseType: "上市金融" },
  { symbol: "2883", baseType: "上市金融" },
  { symbol: "2884", baseType: "上市金融" },
  { symbol: "2885", baseType: "上市金融" },
  { symbol: "2886", baseType: "上市金融" },
  { symbol: "2887", baseType: "上市金融" },
  { symbol: "2891", baseType: "上市金融" },
  { symbol: "2892", baseType: "上市金融" },
  { symbol: "5871", baseType: "上市金融" },
  { symbol: "5880", baseType: "上市金融" },
  { symbol: "0050", baseType: "上市ETF" },
  { symbol: "0056", baseType: "上市ETF" },
  { symbol: "00878", baseType: "上市ETF" },
  { symbol: "00919", baseType: "上市高股息ETF" },
  { symbol: "00929", baseType: "上市高股息ETF" },
  { symbol: "00940", baseType: "上市高股息ETF" },
  // 上櫃：半導體、IC設計、生技、電子零組件
  { symbol: "3105", baseType: "上櫃IC設計" },
  { symbol: "3264", baseType: "上櫃IC設計" },
  { symbol: "3324", baseType: "上櫃IC設計" },
  { symbol: "3374", baseType: "上櫃IC設計" },
  { symbol: "3227", baseType: "上櫃IC設計" },
  { symbol: "3217", baseType: "上櫃IC設計" },
  { symbol: "5274", baseType: "上櫃半導體" },
  { symbol: "5347", baseType: "上櫃半導體" },
  { symbol: "5483", baseType: "上櫃半導體" },
  { symbol: "5425", baseType: "上櫃光電" },
  { symbol: "6121", baseType: "上櫃電子" },
  { symbol: "6147", baseType: "上櫃電子" },
  { symbol: "6182", baseType: "上櫃電子零組件" },
  { symbol: "6187", baseType: "上櫃電子零組件" },
  { symbol: "6231", baseType: "上櫃電子零組件" },
  { symbol: "6274", baseType: "上櫃電子零組件" },
  { symbol: "6488", baseType: "上櫃生技" },
  { symbol: "6547", baseType: "上櫃生技" },
  { symbol: "8069", baseType: "上櫃通路" },
  { symbol: "8299", baseType: "上櫃電子" },
];

function classifyStrongStock(stock) {
  if (!stock) return "待觀察";
  if ((stock.volumeRatio || 0) >= 1.5 && stock.changePct > 0) return "爆量上漲";
  if (stock.score >= 80) return "AI強勢";
  if (stock.changePct >= 2) return "漲幅強勢";
  if ((stock.volumeRatio || 0) >= 1.3) return "量能強勢";
  if (stock.tradeSignal?.action === "BUY") return "買進訊號";
  return stock.baseType || "系統候選";
}


function calcRecent3DayStrength(stock) {
  const history = stock?.history || [];
  const latest = history.at(-1);
  const base = history.at(-4) || history.at(0);
  const last3 = history.slice(-3);

  if (!latest || !base || last3.length === 0) {
    return {
      recent3DayScore: 0,
      recent3DayChange: 0,
      recent3DayVolumeRatio: stock?.volumeRatio || 0,
      recent3DayType: "資料不足",
    };
  }

  const recent3DayChange = base.close
    ? ((latest.close - base.close) / base.close) * 100
    : 0;

  const avg3Volume =
    last3.reduce((sum, x) => sum + (x.volume || 0), 0) / last3.length;

  const prev20 = history.slice(-24, -4);
  const avg20Volume = prev20.length
    ? prev20.reduce((sum, x) => sum + (x.volume || 0), 0) / prev20.length
    : avg3Volume || 1;

  const recent3DayVolumeRatio = avg20Volume ? avg3Volume / avg20Volume : 0;
  const closeNearHigh =
    latest.high && latest.close
      ? ((latest.high - latest.close) / latest.close) * 100
      : 999;

  let recent3DayScore = 0;
  if (recent3DayChange >= 3) recent3DayScore += 30;
  if (recent3DayChange >= 6) recent3DayScore += 25;
  if (recent3DayChange >= 10) recent3DayScore += 20;
  if (recent3DayVolumeRatio >= 1.3) recent3DayScore += 20;
  if (recent3DayVolumeRatio >= 2) recent3DayScore += 20;
  if (closeNearHigh <= 1.2) recent3DayScore += 15;
  if ((stock.score || 0) >= 70) recent3DayScore += 15;

  let recent3DayType = "近3日觀察";
  if (recent3DayChange >= 6 && recent3DayVolumeRatio >= 1.5) recent3DayType = "近3日爆量強勢";
  else if (recent3DayChange >= 6) recent3DayType = "近3日漲幅強勢";
  else if (recent3DayVolumeRatio >= 1.5) recent3DayType = "近3日量能強勢";
  else if ((stock.score || 0) >= 80) recent3DayType = "AI強勢";

  return {
    recent3DayScore: Math.round(recent3DayScore),
    recent3DayChange,
    recent3DayVolumeRatio,
    recent3DayType,
  };
}

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


function getKlineRequest(klineType, selectedRange = "1y") {
  const map = {
    "1m": { range: "1d", interval: "1m", label: "1分K" },
    "5m": { range: "5d", interval: "5m", label: "5分K" },
    "30m": { range: "1mo", interval: "30m", label: "30分K" },
    "1d": { range: selectedRange || "1y", interval: "1d", label: "日K" },
    "1wk": { range: "5y", interval: "1wk", label: "周K" },
    "1mo": { range: "10y", interval: "1mo", label: "月K" },
  };

  return map[klineType] || map["1d"];
}

function klineLabel(klineType) {
  return getKlineRequest(klineType).label;
}


function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchYahooHistory(input, range = "6mo", interval = "1d") {
  const symbol = resolveSymbol(input);
  if (!symbol) throw new Error("請輸入股票代碼或名稱");

  const url = `${API_BASE}/api/yahoo/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&_=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo 資料抓取失敗：${symbol}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`找不到股票資料：${symbol}`);

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const meta = result.meta || {};

  const history = timestamps
    .map((t, i) => {
      const dt = new Date(t * 1000);
      return {
        time:
          interval === "1d"
            ? dt.toISOString().slice(0, 10)
            : t,
        date:
          interval === "1d"
            ? dt.toLocaleDateString("zh-TW")
            : dt.toLocaleString("zh-TW", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
        open: cleanNumber(quote.open?.[i]),
        high: cleanNumber(quote.high?.[i]),
        low: cleanNumber(quote.low?.[i]),
        close: cleanNumber(quote.close?.[i]),
        volume: cleanNumber(quote.volume?.[i]) || 0,
      };
    })
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

function analyzeDayTrade(stock) {
  if (!stock?.close) return null;

  const history = stock.history || [];
  const latest = history.at(-1) || {};
  const prev = history.at(-2) || {};
  const close = stock.close;
  const open = latest.open ?? close;
  const prevClose = prev.close ?? close;
  const reasons = [];
  const risks = [];
  let score = 15; // 避免資料不足時永遠 0 分，先給基礎觀察分

  const rsi = stock.rsi ?? 50;
  const macdHist = stock.macdHist ?? 0;
  const changePct = stock.changePct ?? 0;
  const candlePct = prevClose ? ((close - prevClose) / prevClose) * 100 : 0;
  const bodyPct = open ? ((close - open) / open) * 100 : 0;

  let volumeRatio = stock.volumeRatio;
  if ((volumeRatio === null || volumeRatio === undefined) && history.length >= 6) {
    const latestVol = latest.volume || 0;
    const avgVol = history.slice(-6, -1).reduce((sum, x) => sum + (x.volume || 0), 0) / 5;
    volumeRatio = avgVol ? latestVol / avgVol : null;
  }
  volumeRatio = volumeRatio ?? 1;

  // 量能：當沖最重要，但門檻調整得比較合理，不再容易 0 分
  if (volumeRatio >= 1.8) {
    score += 28;
    reasons.push("量能明顯放大");
  } else if (volumeRatio >= 1.25) {
    score += 20;
    reasons.push("量能放大");
  } else if (volumeRatio >= 0.85) {
    score += 8;
    reasons.push("量能尚可");
  } else {
    risks.push("量能偏低，容易假突破");
  }

  // 短線動能：同時看當日漲跌與最近一根分K
  if (changePct >= 0.2) {
    score += 14;
    reasons.push("當日漲幅轉正");
  } else if (changePct < -1.5) {
    score -= 8;
    risks.push("當日跌幅偏大");
  }

  if (candlePct > 0.05 || bodyPct > 0.05) {
    score += 14;
    reasons.push("最新分K偏多");
  } else if (candlePct < -0.25) {
    score -= 6;
    risks.push("最新分K轉弱");
  }

  // RSI：放寬到 45~72 比較符合當沖觀察，不再過度嚴苛
  if (rsi >= 50 && rsi <= 72) {
    score += 18;
    reasons.push("RSI 位於健康偏多區");
  } else if (rsi >= 45 && rsi < 50) {
    score += 8;
    reasons.push("RSI 接近轉強區");
  } else if (rsi > 78) {
    score -= 14;
    risks.push("RSI 過熱，容易拉回");
  } else if (rsi < 40) {
    score -= 8;
    risks.push("RSI 偏弱，買盤不足");
  }

  // MACD：分K容易小幅震盪，允許接近翻正也給分
  if (macdHist > 0) {
    score += 16;
    reasons.push("MACD 短線動能翻正");
  } else if (macdHist > -0.03) {
    score += 6;
    reasons.push("MACD 接近翻正");
  } else {
    risks.push("MACD 尚未轉強");
  }

  if (stock.ma5 && close > stock.ma5) {
    score += 8;
    reasons.push("價格站上 MA5");
  } else if (history.length >= 2 && close > prevClose) {
    score += 4;
    reasons.push("價格短線回升");
  } else {
    risks.push("價格尚未站上 MA5");
  }

  if (stock.ma20 && close > stock.ma20) {
    score += 6;
    reasons.push("價格站上 MA20");
  }

  if (stock.candlePattern?.title?.includes("長上影")) {
    score -= 12;
    risks.push("長上影線，上方賣壓較大");
  }

  if (stock.volumeSignal?.title?.includes("出貨")) {
    score -= 16;
    risks.push("爆量不漲，有出貨疑慮");
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const canEnter = finalScore >= 65 && !stock.volumeSignal?.title?.includes("出貨") && rsi < 78;

  let signal = "❌ 不建議當沖";
  let tone = "sell";
  if (canEnter) {
    signal = "🔥 現在可進場觀察";
    tone = "buy";
  } else if (finalScore >= 45) {
    signal = "⚡ 觀察，等突破再進";
    tone = "hold";
  }

  const stopLoss = close * 0.985;
  const takeProfit = close * 1.025;

  return {
    score: finalScore,
    signal,
    tone,
    canEnter,
    entry: close,
    stopLoss,
    takeProfit,
    reasons: reasons.length ? reasons : ["資料偏少，先觀察量能與最新分K方向"],
    risks: risks.length ? risks : ["仍需嚴格控管停損與成交量變化"],
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

  const dayTrade = analyzeDayTrade({
    ...stock,
    close,
    changePct,
    volume: latest?.volume || 0,
    volumeRatio,
    rsi,
    macdHist: macd.hist,
    ma5,
    ma20,
    ma60,
    volumeSignal,
    candlePattern,
  });

  const nextDay = analyzeNextDayStrategy(
    buildNextDayInput({
      ...stock,
      history,
      close,
      volume: latest?.volume || 0,
      ma5,
      ma20,
      ma60,
      rsi,
      macdHist: macd.hist,
    })
  );

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
    dayTrade,
  };
}


// =========================
// 隔日沖 / 短線強勢股模型
// =========================
function detectFakeBreakoutForNextDay(stock) {
  const open = cleanNumber(stock.open) || 0;
  const high = cleanNumber(stock.high) || 0;
  const close = cleanNumber(stock.close) || 0;
  const volume = cleanNumber(stock.volume) || 0;
  const avgVolume5 = cleanNumber(stock.avgVolume5) || 1;
  const highest5 = cleanNumber(stock.highest5) || 0;

  const upperShadow = high - Math.max(open, close);
  const body = Math.abs(close - open);
  const volumeRatio = avgVolume5 ? volume / avgVolume5 : 0;

  if (upperShadow > body * 1.5) return true;
  if (volumeRatio >= 2 && close < open) return true;
  if (close > highest5 && volumeRatio < 1.2) return true;

  return false;
}

function getNextDayRank(score) {
  if (score >= 160) return "S級強勢股";
  if (score >= 130) return "A級強勢股";
  if (score >= 100) return "B級觀察股";
  if (score >= 70) return "C級普通";
  return "弱勢";
}

function buildNextDayInput(stock, marketIndexChange = 0) {
  const history = stock.history || [];
  const latest = history.at(-1) || {};
  const prev = history.at(-2) || {};
  const highs = history.map((x) => x.high).filter((x) => Number.isFinite(x));
  const volumes = history.map((x) => x.volume || 0);

  const avgVolume5 =
    volumes.length >= 6
      ? volumes.slice(-6, -1).reduce((a, b) => a + b, 0) / 5
      : stock.volume || 1;

  return {
    open: latest.open,
    high: latest.high,
    low: latest.low,
    close: latest.close || stock.close,
    prevClose: prev.close,
    volume: latest.volume || stock.volume,
    avgVolume5,
    highest5: Math.max(...highs.slice(-6, -1), 0),
    highest20: Math.max(...highs.slice(-21, -1), 0),
    ma5: stock.ma5,
    ma20: stock.ma20,
    ma60: stock.ma60,
    rsi: stock.rsi,
    macd: stock.macdHist,
    macdSignal: 0,
    foreignBuy: stock.foreignBuy || 0,
    investmentBuy: stock.investmentBuy || 0,
    dealerBuy: stock.dealerBuy || 0,
    marketIndexChange,
  };
}

function calcGapUpProbability(stock) {
  const high = cleanNumber(stock.high) || 0;
  const low = cleanNumber(stock.low) || 0;
  const close = cleanNumber(stock.close) || 0;
  const volume = cleanNumber(stock.volume) || 0;
  const avgVolume5 = cleanNumber(stock.avgVolume5) || 1;
  const rsi = cleanNumber(stock.rsi) || 0;
  const marketIndexChange = cleanNumber(stock.marketIndexChange) || 0;
  const institutionalTotal =
    (cleanNumber(stock.foreignBuy) || 0) +
    (cleanNumber(stock.investmentBuy) || 0) +
    (cleanNumber(stock.dealerBuy) || 0);

  let probability = 0;
  const range = high - low;

  if (range > 0) {
    const closeStrength = (close - low) / range;
    probability += closeStrength * 30;
  }

  const volumeRatio = avgVolume5 ? volume / avgVolume5 : 0;
  probability += Math.min(volumeRatio * 10, 30);

  if (institutionalTotal > 0) probability += 15;
  if (marketIndexChange > 0) probability += 15;
  if (rsi > 60) probability += 10;

  return Math.min(Math.round(probability * 100) / 100, 100);
}

function calcNextDayScore(stock) {
  let score = 0;

  const close = cleanNumber(stock.close) || 0;
  const prevClose = cleanNumber(stock.prevClose) || 0;
  const high = cleanNumber(stock.high) || 0;
  const volume = cleanNumber(stock.volume) || 0;
  const avgVolume5 = cleanNumber(stock.avgVolume5) || 1;
  const highest5 = cleanNumber(stock.highest5) || 0;
  const highest20 = cleanNumber(stock.highest20) || 0;
  const ma5 = cleanNumber(stock.ma5) || 0;
  const ma20 = cleanNumber(stock.ma20) || 0;
  const ma60 = cleanNumber(stock.ma60) || 0;
  const rsi = cleanNumber(stock.rsi) || 0;
  const macd = cleanNumber(stock.macd) || 0;
  const macdSignal = cleanNumber(stock.macdSignal) || 0;
  const marketIndexChange = cleanNumber(stock.marketIndexChange) || 0;
  const institutionalTotal =
    (cleanNumber(stock.foreignBuy) || 0) +
    (cleanNumber(stock.investmentBuy) || 0) +
    (cleanNumber(stock.dealerBuy) || 0);

  const changePercent = prevClose ? ((close - prevClose) / prevClose) * 100 : 0;
  const volumeRatio = avgVolume5 ? volume / avgVolume5 : 0;
  const closeToHigh = close ? ((high - close) / close) * 100 : 999;

  if (changePercent >= 3) score += 15;
  if (changePercent >= 5) score += 25;

  if (volumeRatio >= 1.5) score += 15;
  if (volumeRatio >= 2) score += 25;
  if (volumeRatio >= 3) score += 35;

  if (closeToHigh <= 1) score += 20;
  if (closeToHigh <= 0.5) score += 30;

  if (close > highest5) score += 25;
  if (close > highest20) score += 40;

  if (ma5 > ma20 && ma20 > ma60) score += 30;
  if (rsi >= 55 && rsi <= 75) score += 15;
  if (macd > macdSignal) score += 15;
  if (institutionalTotal > 0) score += 20;
  if (marketIndexChange > -1) score += 10;

  if (detectFakeBreakoutForNextDay(stock)) score -= 50;

  return Math.max(0, Math.round(score));
}

function analyzeNextDayStrategy(stock) {
  const score = calcNextDayScore(stock);
  const gapUpProbability = calcGapUpProbability(stock);
  const rank = getNextDayRank(score);
  const fakeBreakout = detectFakeBreakoutForNextDay(stock);

  let signal = "觀望";
  let tone = "neutral";

  if (score >= 130 && gapUpProbability >= 65 && !fakeBreakout) {
    signal = "隔日沖候選";
    tone = "buy";
  } else if (score >= 100 && !fakeBreakout) {
    signal = "短線觀察";
    tone = "hold";
  } else if (fakeBreakout) {
    signal = "假突破風險";
    tone = "sell";
  }

  return {
    nextDayScore: score,
    gapUpProbability,
    nextDayRank: rank,
    fakeBreakout,
    nextDaySignal: signal,
    nextDayTone: tone,
  };
}

function TradingChart({ stock, showMA5, showMA20, showMA60, showBollinger, chartKey = "default" }) {
  const containerRef = useRef(null);
  const visibleRangeRef = useRef(null);
  const lastChartKeyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !stock?.history?.length) return;

    const currentChartKey = `${stock.symbol || ""}-${chartKey}`;
    const shouldRestoreRange =
      lastChartKeyRef.current === currentChartKey && visibleRangeRef.current;

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
      upColor: "#ef4444",
      downColor: "#22c55e",
      borderUpColor: "#ef4444",
      borderDownColor: "#22c55e",
      wickUpColor: "#ef4444",
      wickDownColor: "#22c55e",
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
      color: d.close >= d.open ? "rgba(239,68,68,.38)" : "rgba(34,197,94,.38)",
    }));

    candleSeries.setData(candles);
    ma5Series.setData(showMA5 ? buildMA(5) : []);
    ma20Series.setData(showMA20 ? buildMA(20) : []);
    ma60Series.setData(showMA60 ? buildMA(60) : []);
    bollUpperSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.upper })) : []);
    bollMidSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.mid })) : []);
    bollLowerSeries.setData(showBollinger ? boll.map((x) => ({ time: x.time, value: x.lower })) : []);
    volumeSeries.setData(volume);

    if (shouldRestoreRange) {
      chart.timeScale().setVisibleLogicalRange(visibleRangeRef.current);
    } else {
      chart.timeScale().fitContent();

      // 分K如果資料筆數太少，lightweight-charts 會把單根K棒放超大；
      // 這裡強制給一段可視範圍，避免當沖K線擠成一根巨棒。
      if (candles.length < 40) {
        chart.timeScale().applyOptions({
          barSpacing: 8,
          rightOffset: 20,
          minBarSpacing: 4,
        });
        chart.timeScale().setVisibleLogicalRange({
          from: -20,
          to: Math.max(40, candles.length + 20),
        });
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      visibleRangeRef.current = chart.timeScale().getVisibleLogicalRange();
      lastChartKeyRef.current = currentChartKey;
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [stock, showMA5, showMA20, showMA60, showBollinger, chartKey]);

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

const [watchText, setWatchText] = useState(() => {
  const savedWatchText = localStorage.getItem("stockRadarWatchText");

  if (savedWatchText && savedWatchText.trim()) {
    return savedWatchText;
  }

  try {
    const savedFavorites = JSON.parse(localStorage.getItem("stockRadarFavorites") || "[]");
    const symbols = savedFavorites
      .map((item) => item.symbol)
      .filter(Boolean);

    if (symbols.length) {
      return [...new Set(symbols)].join(",");
    }
  } catch {
    //
  }

  return "2330,2317,2454,2308,2382,0050,AAPL,NVDA,TSLA,SPY,QQQ";
 });

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
  const [intradayInterval, setIntradayInterval] = useState("1m");
  const [klineType, setKlineType] = useState("1d");
  const [intradayStock, setIntradayStock] = useState(null);
  const [dayTradeList, setDayTradeList] = useState([]);
  const [dayTradeLoading, setDayTradeLoading] = useState(false);
  const [showMA5, setShowMA5] = useState(true);
  const [showMA20, setShowMA20] = useState(true);
  const [showMA60, setShowMA60] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("stockRadarSearchHistory") || "[]");
    } catch {
      return [];
    }
  });
  const [realtimeDayTrade, setRealtimeDayTrade] = useState(false);
  const [systemStrongList, setSystemStrongList] = useState([]);
  const [systemStrongLoading, setSystemStrongLoading] = useState(false);
  const [strongCategory, setStrongCategory] = useState("全部");
  const [favoritePickerStock, setFavoritePickerStock] = useState(null);
  const [favoriteGroupFilter, setFavoriteGroupFilter] = useState("全部");
  const [nextDayList, setNextDayList] = useState([]);
  const [nextDayLoading, setNextDayLoading] = useState(false);
  const [nextDaySortMode, setNextDaySortMode] = useState("score");
  const [reportTab, setReportTab] = useState("overview");

  useEffect(() => {
    localStorage.setItem("stockRadarWatchText", watchText);
  }, [watchText]);

  useEffect(() => {
    localStorage.setItem("stockRadarFavorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("stockRadarSearchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  function rememberSearchKeyword(value) {
    const keyword = String(value || "").trim().toUpperCase();
    if (!keyword) return;
    setSearchHistory((prev) => {
      const next = [keyword, ...prev.filter((item) => item !== keyword)];
      return next.slice(0, 10);
    });
  }


  function getWatchSymbols(textValue = watchText) {
    return [
      ...new Set(
        String(textValue || "")
          .split(/[ ,，\n]+/)
          .map((x) => x.trim().toUpperCase())
          .filter(Boolean)
      ),
    ];
  }

  async function fetchAndUpsertWatchStock(symbol) {
    const target = String(symbol || "").trim().toUpperCase();
    if (!target) return null;

    try {
      const request = getKlineRequest(klineType, range);
      const data = await fetchYahooHistory(target, request.range, request.interval);
      const analyzed = analyzeStock(data);

      setWatchList((prev) => {
        const exists = prev.some((item) => item.symbol === analyzed.symbol);
        if (exists) {
          return prev.map((item) =>
            item.symbol === analyzed.symbol ? analyzed : item
          );
        }
        return [analyzed, ...prev];
      });

      if (!stock || stock.symbol === analyzed.symbol) {
        setStock(analyzed);
      }

      return analyzed;
    } catch (err) {
      console.warn("fetch watch stock failed", target, err);
      setError(err.message || `${target} 資料抓取失敗`);
      return null;
    }
  }

  function addFavorite(targetStock = stock, group = "選單1") {
    if (!targetStock?.symbol) {
      setFavoriteNotice("請先查詢股票，再加入收藏");
      return;
    }

    const targetSymbol = String(targetStock.symbol).toUpperCase();
    const targetGroup = group || "選單1";

    setFavorites((prev) => {
      const exists = prev.some(
        (item) => item.symbol === targetSymbol && (item.group || "選單1") === targetGroup
      );

      if (exists) {
        setFavoriteNotice(`${targetSymbol} 已在${targetGroup}`);
        return prev;
      }

      setFavoriteNotice(`已收藏 ${targetSymbol} 到${targetGroup}`);
      return [
        ...prev,
        {
          symbol: targetSymbol,
          name: targetStock.name,
          group: targetGroup,
        },
      ];
    });

    setWatchText((prev) => {
      const items = getWatchSymbols(prev);

      if (items.includes(targetSymbol)) return prev;
      return [...items, targetSymbol].join(",");
    });

    fetchAndUpsertWatchStock(targetSymbol);
    setFavoritePickerStock(null);
  }

  function removeFavorite(symbol, group = null) {
    setFavorites((prev) =>
      prev.filter((item) =>
        group ? !(item.symbol === symbol && (item.group || "選單1") === group) : item.symbol !== symbol
      )
    );
    setFavoriteNotice(`已移除 ${symbol}`);
  }

  function removeWatchSymbol(symbol) {
  const target = String(symbol).toUpperCase();

  setWatchText((prev) =>
    prev
      .split(/[ ,，\n]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)
      .filter((item) => item !== target)
      .join(",")
  );

  setWatchList((prev) =>
    prev.filter((item) => item.symbol.toUpperCase() !== target)
  );
}

  async function addWatchSymbol() {
    const value = newWatchSymbol.trim().toUpperCase();
    if (!value) return;

    const items = getWatchSymbols(watchText);

    if (!items.includes(value)) {
      setWatchText([...items, value].join(","));
    }

    setFavorites((prev) => {
      const exists = prev.some((item) => item.symbol === value);
      if (exists) return prev;

      return [
        ...prev,
        {
          symbol: value,
          name: value,
          group: favoriteGroupFilter === "全部" ? "選單1" : favoriteGroupFilter,
        },
      ];
    });

    setFavoriteNotice(`已加入 ${value}，正在更新資料`);
    setNewWatchSymbol("");
    setWatchMenuOpen(false);

    await fetchAndUpsertWatchStock(value);
  }

  function removeSelectedWatchSymbol() {
    const value = newWatchSymbol.trim().toUpperCase();
    if (!value) return;
    const items = watchText
      .split(/[ ,，\n]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)
      .filter((item) => item !== value);

    setWatchText(items.join(","));
    setNewWatchSymbol("");
    setWatchMenuOpen(false);
  }


  async function changeKlineType(nextType, target = query) {
    setKlineType(nextType);

    if (["1m", "5m", "30m"].includes(nextType)) {
      setIntradayInterval(nextType);
    }

    const symbolToLoad = String(target || stock?.symbol || query || "").trim();
    if (!symbolToLoad) return;

    setLoading(true);
    setError("");

    try {
      const request = getKlineRequest(nextType, range);
      const data = await fetchYahooHistory(symbolToLoad, request.range, request.interval);
      const analyzed = analyzeStock(data);

      setStock(analyzed);

      if (activeMenu === "daytrade") {
        setIntradayStock(analyzed);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "K線切換失敗");
    } finally {
      setLoading(false);
    }
  }

  async function searchOne(input = query) {
    const target = String(input || "").trim();
    if (!target) return;
    setQuery(target);
    rememberSearchKeyword(target);
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

  async function scanWatchList(options = {}) {
    const { silent = false } = options;

    if (!silent) setScanning(true);
    setError("");

    try {
      const items = getWatchSymbols(watchText).slice(0, 30);

      const result = (
        await Promise.all(
          items.map((item) =>
            fetchYahooHistory(item, range, "1d")
              .then((data) => analyzeStock(data))
              .catch((err) => {
                console.warn("watch scan failed", item, err);
                return null;
              })
          )
        )
      ).filter(Boolean);

      setWatchList(result);
      if (!stock && result[0]) setStock(result[0]);
      if (!silent) setActiveMenu("watchlist");
    } catch (err) {
      setError(err.message || "自選清單掃描失敗");
    } finally {
      if (!silent) setScanning(false);
    }
  }

  async function searchIntraday(input = query, silent = false) {
    const target = String(input || "").trim();
    if (!target) return;
    if (!silent) setDayTradeLoading(true);
    setError("");
    try {
      // Yahoo 分K用 5d 比 1d 穩定，避免台股只回傳單根K棒。
      const request = getKlineRequest(klineType, range);
      const data = await fetchYahooHistory(target, request.range, request.interval);
      const analyzed = analyzeStock(data);
      setIntradayStock(analyzed);
      setStock(analyzed);
      setQuery(target);
      rememberSearchKeyword(target);
    } catch (err) {
      console.error(err);
      if (!silent) setError(err.message || "分K資料抓取失敗");
    } finally {
      if (!silent) setDayTradeLoading(false);
    }
  }

  async function scanDayTradeList() {
    setDayTradeLoading(true);
    setError("");
    try {
      const items = watchText
        .split(/[ ,，\n]+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 30);

      const result = (
        await Promise.all(
          items.map((item) =>
            fetchYahooHistory(item, "5d", intradayInterval)
              .then((data) => analyzeStock(data))
              .catch((err) => {
                console.warn("daytrade scan failed", item, err);
                return null;
              })
          )
        )
      ).filter(Boolean);

      result.sort((a, b) => (b.dayTrade?.score || 0) - (a.dayTrade?.score || 0));
      setDayTradeList(result);
      if (result[0]) {
        setIntradayStock(result[0]);
        setStock(result[0]);
      }
    } catch (err) {
      setError(err.message || "當沖掃描失敗");
    } finally {
      setDayTradeLoading(false);
    }
  }

  async function scanSystemStrongStocks() {
    setSystemStrongLoading(true);
    setError("");

    try {
      const result = (
        await Promise.all(
          MARKET_STRONG_POOL.map((item) =>
            fetchYahooHistory(item.symbol, "5d", "1d")
              .then((data) => {
                const analyzed = analyzeStock(data);
                const recent = calcRecent3DayStrength(analyzed);

                return {
                  ...analyzed,
                  baseType: item.baseType,
                  strongType: classifyStrongStock({
                    ...analyzed,
                    baseType: item.baseType,
                  }),
                  ...recent,
                };
              })
              .catch((err) => {
                console.warn("system strong scan failed", item.symbol, err);
                return null;
              })
          )
        )
      )
        .filter(Boolean)
        .filter((item) => item.currency !== "USD")
        .sort((a, b) => {
          const aScore = (a.recent3DayScore || 0) * 0.65 + (a.score || 0) * 0.35;
          const bScore = (b.recent3DayScore || 0) * 0.65 + (b.score || 0) * 0.35;
          return bScore - aScore;
        })
        .slice(0, 50);

      setSystemStrongList(result);
      if (result[0]) setStock(result[0]);
    } catch (err) {
      setError(err.message || "系統強勢股掃描失敗");
    } finally {
      setSystemStrongLoading(false);
    }
  }


  async function scanNextDayList(options = {}) {
    const { silent = false } = options;

    if (!silent) setNextDayLoading(true);
    setError("");

    try {
      const items = MARKET_STRONG_POOL.map((item) => item.symbol).slice(0, 80);

      const result = (
        await Promise.all(
          items.map((item) =>
            fetchYahooHistory(item, range, "1d")
              .then((data) => analyzeStock(data))
              .catch((err) => {
                console.warn("next day scan failed", item, err);
                return null;
              })
          )
        )
      )
        .filter(Boolean)
        .sort((a, b) => {
          const aScore = a.nextDay?.nextDayScore || 0;
          const bScore = b.nextDay?.nextDayScore || 0;
          return bScore - aScore;
        });

      setNextDayList(result);
      if (!stock && result[0]) setStock(result[0]);
    } catch (err) {
      if (!silent) setError(err.message || "隔日沖選股失敗");
    } finally {
      if (!silent) setNextDayLoading(false);
    }
  }

  useEffect(() => {
    if (symbol) searchOne(symbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    const items = getWatchSymbols(watchText);
    if (!items.length) return;

    let cancelled = false;

    async function loadWatchListInBackground() {
      if (cancelled) return;
      await scanWatchList({ silent: true });
    }

    loadWatchListInBackground();

    const timer = setInterval(() => {
      loadWatchListInBackground();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchText, range]);

  useEffect(() => {
    let cancelled = false;

    async function loadNextDayInBackground() {
      if (cancelled) return;
      await scanNextDayList({ silent: true });
    }

    loadNextDayInBackground();

    const timer = setInterval(() => {
      loadNextDayInBackground();
    }, 90000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    if (!autoScan) return;
    scanWatchList();
    const timer = setInterval(scanWatchList, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan, watchText, range]);

  useEffect(() => {
    if (!realtimeDayTrade || activeMenu !== "daytrade") return;
    const target = query.trim();
    if (!target) return;

    const timer = setInterval(() => {
      searchIntraday(target, true);
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeDayTrade, activeMenu, query, klineType]);

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

  const displayedWatchList = useMemo(() => {
    if (favoriteGroupFilter === "全部") return sortedWatchList;

    const allowed = new Set(
      favorites
        .filter((item) => (item.group || "選單1") === favoriteGroupFilter)
        .map((item) => item.symbol)
    );

    return sortedWatchList.filter((item) => allowed.has(item.symbol));
  }, [sortedWatchList, favorites, favoriteGroupFilter]);


  const sortedDayTradeList = useMemo(() => {
    return [...dayTradeList].sort((a, b) => (b.dayTrade?.score || 0) - (a.dayTrade?.score || 0));
  }, [dayTradeList]);

  const sortedNextDayList = useMemo(() => {
    const list = [...nextDayList];

    const sorters = {
      score: (a, b) => (b.nextDay?.nextDayScore || 0) - (a.nextDay?.nextDayScore || 0),
      gap: (a, b) => (b.nextDay?.gapUpProbability || 0) - (a.nextDay?.gapUpProbability || 0),
      change: (a, b) => (b.changePct || 0) - (a.changePct || 0),
      volume: (a, b) => (b.volumeRatio || 0) - (a.volumeRatio || 0),
    };

    return list.sort(sorters[nextDaySortMode] || sorters.score);
  }, [nextDayList, nextDaySortMode]);


  const filteredSystemStrongList = useMemo(() => {
    const list = [...systemStrongList];
    const filtered =
      strongCategory === "全部"
        ? list
        : list.filter((item) => item.strongType === strongCategory || item.baseType === strongCategory);

    return filtered.sort((a, b) => b.score - a.score);
  }, [systemStrongList, strongCategory]);

  const strongCategoryOptions = useMemo(() => {
    const options = new Set(["全部"]);
    systemStrongList.forEach((item) => {
      if (item.strongType) options.add(item.strongType);
      if (item.baseType) options.add(item.baseType);
    });
    return [...options];
  }, [systemStrongList]);

  const marketStats = useMemo(() => {
    const up = watchList.filter((s) => s.changePct > 0).length;
    const down = watchList.filter((s) => s.changePct < 0).length;
    const avg = watchList.length
      ? watchList.reduce((sum, s) => sum + s.changePct, 0) / watchList.length
      : 0;

    return { up, down, avg };
  }, [watchList]);

  const todayWatchStocks = [...systemStrongList, ...watchList]
    .filter(Boolean)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);

  const dailyNews = [
    {
      title: "台股今日震盪整理，AI、半導體與高股息 ETF 仍是市場關注焦點",
      source: "市場觀察",
      impact: "偏多",
    },
    {
      title: "美股科技股走勢分歧，資金持續觀察 NVIDIA、Apple 與大型 ETF 表現",
      source: "美股觀察",
      impact: "中性",
    },
    {
      title: "美元與台幣匯率影響外資買賣超，短線需留意資金流向變化",
      source: "匯率觀察",
      impact: "中性偏空",
    },
    {
      title: "比特幣維持高波動，市場風險偏好仍會影響科技股與成長股",
      source: "加密市場",
      impact: "高波動",
    },
    {
      title: "成交量放大個股仍是短線主軸，但需小心爆量不漲與長上影線",
      source: "技術面觀察",
      impact: "短線觀察",
    },
  ];

  const bestDailyStock = todayWatchStocks[0];

  const dailyAiSummary = bestDailyStock
    ? `今日市場可先聚焦 ${bestDailyStock.symbol} ${
        bestDailyStock.name || ""
      }，AI 分數約 ${
        bestDailyStock.score ?? "--"
      } 分，訊號為 ${
        bestDailyStock.tradeSignal?.action || "觀望"
      }。短線操作上，優先觀察量能是否持續放大、RSI 是否過熱，以及 K 線是否出現長上影線。`
    : "目前尚未執行強勢掃描，建議先掃描市場強勢股或自選股後，再產生 AI 摘要。";

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
        button {border: 0;border-radius: 10px;padding: 8px 11px;background: #22d3ee;color: #06202a;font-weight: 900;cursor: pointer;font-size: 13px;
        transition:background .18s ease,filter .18s ease,transform .18s ease,border-color .18s ease;}
        button:hover {filter: brightness(1.12);transform: translateY(-1px);}
        button:active {transform: translateY(0);}
        button:disabled {opacity: .55;cursor: not-allowed;}
        button.ghost {background: #111827;color: #e5e7eb;border: 1px solid #334155;}
        button.ghost:hover {background: #1e293b;border-color: #64748b;}
        button.danger {background: #fb7185;color: #450a0a;}
        button.danger:hover {filter: brightness(1.08);}
        input, textarea, select { width: 100%; box-sizing: border-box; background: #020617; color: #e5e7eb; border: 1px solid #334155; border-radius: 10px; padding: 9px; outline: none; font-size: 13px; }
        label { display: block; color: #cbd5e1; margin: 9px 0 6px; font-size: 12px; }
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
        .top-title h1 { font-size: 24px; }
        .top-title p { color: #94a3b8; font-size: 13px; margin: 6px 0 0; }
        .top-stats { display: flex; gap: 12px; align-items: center; }
        .mini-stat { min-width: 82px; background: rgba(15,23,42,.86); border: 1px solid rgba(148,163,184,.18); border-radius: 12px; padding: 8px 10px; }
        .mini-stat span { color: #94a3b8; font-size: 11px; }
        .mini-stat b { display: block; font-size: 17px; margin-top: 3px; }
        .card { background: rgba(15,23,42,.84); border: 1px solid rgba(148,163,184,.18); border-radius: 14px; box-shadow: 0 14px 36px rgba(0,0,0,.28); padding: 12px; }
        .favorite-action { background: linear-gradient(135deg, #facc15, #fb923c); color: #1f1300; }
        .favorite-action.saved { background: #14532d; color: #bbf7d0; border: 1px solid rgba(34,197,94,.45); }
        .favorite-notice { margin-top: 8px; color: #facc15; font-size: 13px; }
        .favorite-picker { position: absolute; z-index: 50; min-width: 150px; background: #020617; border: 1px solid rgba(148,163,184,.28); border-radius: 14px; padding: 8px; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
        .favorite-picker button { width: 100%; margin-bottom: 6px; background: #111827; color: #e5e7eb; border: 1px solid #334155; }
        .favorite-picker button:last-child { margin-bottom: 0; }
        .watch-actions { position: relative; display: inline-block; }
        .watch-menu { position: absolute; right: 0; top: 44px; z-index: 20; width: 280px; background: #020617; border: 1px solid rgba(148,163,184,.25); border-radius: 16px; padding: 12px; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
        .chart-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .indicator-dropdown { position: relative; }
        .indicator-menu { position: absolute; right: 0; top: 42px; z-index: 30; width: 230px; background: #020617; border: 1px solid rgba(148,163,184,.25); border-radius: 14px; padding: 10px; box-shadow: 0 18px 50px rgba(0,0,0,.45); }
        .indicator-menu .toggle-card { margin-bottom: 8px; }
        .indicator-menu .toggle-card:last-child { margin-bottom: 0; }
        .summary-grid { display: grid; grid-template-columns: 1.1fr 1fr .8fr 1fr; gap: 10px; margin-bottom: 10px; }
        .analysis-layout { display: grid; grid-template-columns: 320px minmax(680px, 1fr) 370px; gap: 10px; align-items: start; }
        .center-stack { display: contents; }
        .combined-market-card { grid-column: 2; grid-row: 1; min-height: 210px; display: grid; grid-template-columns: 1fr 1.25fr; gap: 20px; align-items: center; }
        .chart-area-card { grid-column: 1 / span 2; grid-row: 2; }
        .selected-panel { text-align: center; }
        .selected-panel h2 { font-size: 25px; margin-bottom: 8px; }
        .selected-panel .price { text-align: center; margin-top: 12px; }
        .market-panel { border-left: 1px solid rgba(148,163,184,.22); padding-left: 20px; }
        .right-panel-card { grid-column: 3; grid-row: 1 / span 2; position: sticky; top: 16px; }

        .main-grid { display: grid; grid-template-columns: minmax(680px, 1fr) 370px; gap: 10px; align-items: start; }
        .section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .section-title h2 { font-size: 16px; }
        .muted { color: #94a3b8; font-size: 13px; }
        .btn-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .chips button { padding: 7px 9px; background: #172554; color: #bfdbfe; font-size: 12px; }
        .divider { height: 1px; background: rgba(148,163,184,.16); margin: 14px 0; }
        .market-card { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .market-box { background: #020617; border: 1px solid rgba(148,163,184,.14); border-radius: 14px; padding: 12px; }
        .market-box b { display: block; font-size: 22px; }
        .up { color: #fb7185; }
        .down { color: #34d399; }
        .neutral { color: #facc15; }
        .stock-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px; }
        .stock-title h1 { font-size: 21px; margin-bottom: 4px; }
        .price { font-size: 26px; font-weight: 900; text-align: right; }
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
        .report-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; border-bottom: 1px solid rgba(148,163,184,.14); padding-bottom: 10px; }
        .report-tabs button { background: #020617; color: #cbd5e1; border: 1px solid rgba(148,163,184,.22); }
        .report-tabs button.active { background: rgba(56,189,248,.22); color: #67e8f9; border-color: rgba(56,189,248,.55); }

        .score-main { background: linear-gradient(135deg, rgba(56,189,248,.22), rgba(37,99,235,.18)); border: 1px solid rgba(56,189,248,.28); border-radius: 18px; padding: 18px; text-align: center; margin-bottom: 12px; }
        .score-main b { display: block; font-size: 48px; line-height: 1; }
        .score-main span { color: #bfdbfe; font-size: 13px; }
        .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .metric-card { background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 12px; padding: 10px; }
        .metric-card b { display: block; font-size: 17px; margin-bottom: 3px; }
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
        .daytrade-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 12px; align-items: start; }
        .daytrade-score { background: linear-gradient(135deg, rgba(34,211,238,.18), rgba(34,197,94,.14)); border: 1px solid rgba(34,211,238,.28); border-radius: 18px; padding: 18px; text-align: center; }
        .daytrade-score b { display: block; font-size: 54px; line-height: 1; }
        .daytrade-score span { color: #bae6fd; font-weight: 900; }
        .entry-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
        .entry-box { background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 12px; text-align: center; }
        .entry-box b { display: block; font-size: 20px; margin-top: 4px; }
        .radar-alert { border-radius: 16px; padding: 14px; margin-bottom: 12px; border: 1px solid rgba(250,204,21,.35); background: rgba(113,63,18,.2); }
        .radar-alert.good { border-color: rgba(34,197,94,.45); background: rgba(20,83,45,.24); }
        .radar-alert.bad { border-color: rgba(248,113,113,.45); background: rgba(127,29,29,.2); }
        .instant-signal { border: 1px solid rgba(34,211,238,.35); background: rgba(8,47,73,.26); border-radius: 16px; padding: 14px; margin-bottom: 12px; }
        .instant-signal.buy { border-color: rgba(34,197,94,.55); background: rgba(20,83,45,.28); }
        .live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-right: 6px; box-shadow: 0 0 12px #22c55e; }
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
        @media (max-width: 1300px) { .summary-grid, .main-grid, .analysis-layout, .combined-market-card { grid-template-columns: 1fr; } .combined-market-card, .chart-area-card, .right-panel-card { grid-column: auto; grid-row: auto; } .center-stack { display: grid; gap: 10px; } .left-nav { width: 150px; } .content { margin-left: 150px; } .chart-tools { align-items: stretch; } .market-panel { border-left: 0; padding-left: 0; border-top: 1px solid rgba(148,163,184,.18); padding-top: 14px; } .right-panel-card { position: static; } }
        button {transition: background .18s ease, filter .18s ease, transform .18s ease, border-color .18s ease;}
        button:hover {filter: brightness(1.12);transform: translateY(-1px);}
        button.ghost:hover {background: #1e293b;border-color: #64748b;}
        button.danger:hover {filter: brightness(1.08);}
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
          <button className={`nav-btn ${activeMenu === "nextday" ? "active" : ""}`} onClick={() => setActiveMenu("nextday")}>🌙 隔日沖選股</button>
          <button className={`nav-btn ${activeMenu === "daytrade" ? "active" : ""}`} onClick={() => setActiveMenu("daytrade")}>⚡ 當沖模式</button>
          <button className={`nav-btn ${activeMenu === "report" ? "active" : ""}`} onClick={() => setActiveMenu("report")}>🧾 每日報告</button>
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
            <div className="analysis-layout">
              <div className="card">
                <div className="section-title"><h2>加入自選或搜尋</h2></div>
                <label>股票代碼或名稱</label>
                <input
                  list="stock-search-history"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="2330、00919、AAPL、SPY"
                  onKeyDown={(e) => e.key === "Enter" && searchOne()}
                />
                <datalist id="stock-search-history">
                  {searchHistory.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>

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
                  <button onClick={() => searchOne()} disabled={loading}>
                    {loading ? "查詢中..." : "查詢股票"}
                  </button>

                  <div style={{ position: "relative" }}>
                    <button
                      className={`favorite-action ${
                        stock && favorites.some((item) => item.symbol === stock.symbol) ? "saved" : ""
                      }`}
                      onClick={() => setFavoritePickerStock(stock)}
                    >
                      {stock && favorites.some((item) => item.symbol === stock.symbol) ? "已收藏" : "加入收藏"}
                    </button>

                    {favoritePickerStock?.symbol === stock?.symbol && (
                      <div className="favorite-picker">
                        {FAVORITE_GROUPS.map((group) => (
                          <button key={group} onClick={() => addFavorite(stock, group)}>
                            收藏到 {group}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {suggestion.length > 0 && (
                  <div className="chips">
                    {suggestion.map(([name, code]) => (
                      <button key={name} onClick={() => searchOne(code)}>
                        {code} {name}
                      </button>
                    ))}
                  </div>
                )}

                {favoriteNotice && <p className="favorite-notice">{favoriteNotice}</p>}
                {error && <p className="error">{error}</p>}
              </div>

              <div className="center-stack">
                <div className="card combined-market-card">
                  <div className="selected-panel">
                    <div className="section-title"><h2>目前選股 & 市場寬度</h2></div>
                    <h2>{stock?.symbol || query}</h2>
                    <p className="muted">{stock?.name || "尚未載入資料"}</p>
                    <div className={stock?.changePct >= 0 ? "price up" : "price down"}>
                      <span style={{ fontSize: 16, marginRight: 8, color: "#e5e7eb" }}>現價</span>
                      {stock?.close?.toFixed?.(2) ?? "--"}
                      <small>{stock?.changePct?.toFixed?.(2) ?? "--"}%</small>
                    </div>
                  </div>

                  <div className="market-panel">
                    <h3 style={{ marginBottom: 14 }}>市場寬度</h3>
                    <div className="market-card">
                      <div className="market-box">
                        <span className="muted">上漲家數</span>
                        <b className="up">{marketStats.up}</b>
                      </div>
                      <div className="market-box">
                        <span className="muted">下跌家數</span>
                        <b className="down">{marketStats.down}</b>
                      </div>
                      <div className="market-box">
                        <span className="muted">平均漲跌幅</span>
                        <b className={marketStats.avg >= 0 ? "up" : "down"}>
                          {marketStats.avg.toFixed(2)}%
                        </b>
                      </div>
                    </div>
                    <p className="muted" style={{ marginTop: 14 }}>
                      更新時間：{new Date().toLocaleString("zh-TW")}
                    </p>
                  </div>
                </div>

                <div className="card chart-area-card">
                  <div className="stock-head">
                    <div className="stock-title">
                      <h1>{stock ? `${stock.symbol} ${stock.name}` : "請搜尋股票"}</h1>
                      <p className="muted">互動 K 線、MA5 / MA20 / MA60、布林通道、成交量</p>
                    </div>
                    {stock && (
                      <div className={stock.changePct >= 0 ? "price up" : "price down"}>
                        <span style={{ fontSize: 16, marginRight: 8, color: "#e5e7eb" }}>現價</span>
                        {stock.close?.toFixed?.(2)}
                        <small>{stock.changePct.toFixed(2)}%</small>
                      </div>
                    )}
                  </div>

                  <div className="chart-tools">
                    <div className="muted">圖表指標</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select
                        value={klineType}
                        onChange={(e) => changeKlineType(e.target.value, stock?.symbol || query)}
                        style={{ width: 130 }}
                      >
                        <option value="1m">1分K</option>
                        <option value="5m">5分K</option>
                        <option value="30m">30分K</option>
                        <option value="1d">日K</option>
                        <option value="1wk">周K</option>
                        <option value="1mo">月K</option>
                      </select>
                    <div className="indicator-dropdown">
                      <button className="ghost" onClick={() => setIndicatorMenuOpen((v) => !v)}>
                        技術指標 ▾
                      </button>
                      {indicatorMenuOpen && (
                        <div className="indicator-menu">
                          <label className="toggle-card">
                            <input type="checkbox" checked={showMA5} onChange={(e) => setShowMA5(e.target.checked)} /> MA5 日線
                          </label>
                          <label className="toggle-card">
                            <input type="checkbox" checked={showMA20} onChange={(e) => setShowMA20(e.target.checked)} /> MA20 月線
                          </label>
                          <label className="toggle-card">
                            <input type="checkbox" checked={showMA60} onChange={(e) => setShowMA60(e.target.checked)} /> MA60 季線
                          </label>
                          <label className="toggle-card">
                            <input type="checkbox" checked={showBollinger} onChange={(e) => setShowBollinger(e.target.checked)} /> 布林通道
                          </label>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>

                  {stock ? (
                    <TradingChart
                      stock={stock}
                      showMA5={showMA5}
                      showMA20={showMA20}
                      showMA60={showMA60}
                      showBollinger={showBollinger}
                      chartKey={klineType}
                    />
                  ) : (
                    <p className="empty">請從上方搜尋股票，或使用網址 /stock/2330。</p>
                  )}

                  {stock && (
                    <div className="tag-row">
                      {stock.tags.length ? stock.tags.map((t) => <span key={t}>{t}</span>) : <span>暫無強勢訊號</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="card right-panel-card">
                <div className="view-tabs">
                  <button className={rightView === "ai" ? "active" : ""} onClick={() => setRightView("ai")}>AI</button>
                  <button className={rightView === "signals" ? "active" : ""} onClick={() => setRightView("signals")}>訊號</button>
                  <button className={rightView === "institution" ? "active" : ""} onClick={() => setRightView("institution")}>法人</button>
                </div>

                {rightView === "ai" && stock && (
                  <>
                    <div className={`trade-signal ${stock.tradeSignal.tone}`}>
                      <div className="signal-action">
                        <div>
                          <b>{stock.tradeSignal.action}</b>
                          <span>{stock.tradeSignal.label}</span>
                        </div>
                        <span className="badge">AI訊號</span>
                      </div>
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
                <button onClick={() => scanWatchList()} disabled={scanning}>{scanning ? "更新中..." : "立即刷新"}</button>
                <select value={favoriteGroupFilter} onChange={(e) => setFavoriteGroupFilter(e.target.value)} style={{ width: 150 }}>
                  <option value="全部">全部收藏</option>
                  {FAVORITE_GROUPS.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
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
                    {displayedWatchList.map((s) => (
                      <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}>
                        <td><b>{s.symbol}</b><br /><span className="muted">{s.name}</span></td>
                        <td><span className="badge">{s.currency === "USD" ? "美股" : "台股"}</span></td>
                        <td>{s.currency} {s.close?.toFixed?.(2)}</td>
                        <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct.toFixed(2)}%</td>
                        <td>{s.score}</td>
                        <td>{s.winRatePredict}%</td>
                        <td>{s.volumeRatio?.toFixed(2) ?? "--"}</td>
                        <td><span className="badge">{s.tradeSignal.action}</span></td>
                        <td>
                          <span style={{ position: "relative", display: "inline-block" }}>
                            <button className="ghost small" onClick={(e) => { e.stopPropagation(); setFavoritePickerStock(s); }}>收藏</button>
                            {favoritePickerStock?.symbol === s.symbol && (
                              <div className="favorite-picker" onClick={(e) => e.stopPropagation()}>
                                {FAVORITE_GROUPS.map((group) => (
                                  <button key={group} onClick={() => addFavorite(s, group)}>
                                    收藏到 {group}
                                  </button>
                                ))}
                              </div>
                            )}
                          </span>{" "}
                          <button className="danger small" onClick={(e) => { e.stopPropagation(); removeWatchSymbol(s.symbol); }}>刪除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === "signals" && (
            <div className="card">
              <div className="section-title">
                <h2>🚨 近3日台股強勢掃描</h2>
                <span className="muted">只掃描上市 / 上櫃台股，不抓自選與美股，依近3日漲幅、量能與AI分數取前50檔。</span>
              </div>

              <div className="btn-row" style={{ marginBottom: 12 }}>
                <button onClick={scanSystemStrongStocks} disabled={systemStrongLoading}>
                  {systemStrongLoading ? "掃描中..." : "掃描近3日台股強勢前50"}
                </button>

                <select
                  value={strongCategory}
                  onChange={(e) => setStrongCategory(e.target.value)}
                  style={{ width: 220 }}
                >
                  {strongCategoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <button className="ghost" onClick={scanSystemStrongStocks}>重新整理</button>
              </div>

              {filteredSystemStrongList.length === 0 ? (
                <p className="empty">按「掃描近3日台股強勢前50」後，會自動列出台股強勢股與分類。</p>
              ) : (
                <div className="watch-table-card table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>排名</th>
                        <th>股票</th>
                        <th>強勢分類</th>
                        <th>近3日強度</th>
                        <th>近3日漲幅</th>
                        <th>AI</th>
                        <th>勝率</th>
                        <th>量比</th>
                        <th>訊號</th>
                        <th>理由</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSystemStrongList.map((s, i) => (
                        <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}>
                          <td>{i + 1}</td>
                          <td><b>{s.symbol}</b><br /><span className="muted">{s.name}</span></td>
                          <td><span className="badge">{s.recent3DayType || s.strongType || s.baseType || "系統候選"}</span></td>
                          <td>{s.recent3DayScore ?? "--"}</td>
                          <td className={s.recent3DayChange >= 0 ? "up" : "down"}>{s.recent3DayChange?.toFixed?.(2) ?? "--"}%</td>
                          <td>{s.score}</td>
                          <td>{s.winRatePredict}%</td>
                          <td>{s.volumeRatio?.toFixed(2) ?? "--"}</td>
                          <td><span className="badge">{s.tradeSignal.action}</span></td>
                          <td>{s.tradeSignal.reasons.slice(0, 2).join("、")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}


          {activeMenu === "nextday" && (
            <div className="card">
              <div className="section-title">
                <div>
                  <h2>🌙 隔日沖選股</h2>
                  <p className="muted">依照漲幅、量能、收盤位置、均線、RSI、MACD 與假突破過濾器進行評分。</p>
                </div>
                <div className="btn-row" style={{ marginTop: 0 }}>
                  <button onClick={() => scanNextDayList()} disabled={nextDayLoading}>
                    {nextDayLoading ? "更新中..." : "立即刷新"}
                  </button>
                  <select
                    value={nextDaySortMode}
                    onChange={(e) => setNextDaySortMode(e.target.value)}
                    style={{ width: 170 }}
                  >
                    <option value="score">依隔日沖分數</option>
                    <option value="gap">依開高機率</option>
                    <option value="change">依漲幅</option>
                    <option value="volume">依量比</option>
                  </select>
                </div>
              </div>

              <div className="summary-grid">
                <div className="card">
                  <h3>📌 選股邏輯</h3>
                  <p className="muted">漲幅強、爆量、收近高點、突破 5/20 日高、均線多頭排列會加分。</p>
                </div>
                <div className="card">
                  <h3>🚫 假突破過濾</h3>
                  <p className="muted">長上影、爆量黑K、縮量突破會被判定為假突破風險。</p>
                </div>
                <div className="card">
                  <h3>📈 開高機率</h3>
                  <p className="muted">依收盤強度、量比、法人與大盤環境估算隔日開高機率。</p>
                </div>
                <div className="card">
                  <h3>🔥 目前候選</h3>
                  <b>{nextDayLoading ? "更新中" : sortedNextDayList.filter((s) => (s.nextDay?.nextDayScore || 0) >= 100 && !s.nextDay?.fakeBreakout).length}</b>
                  <p className="muted">分數達 B 級以上且未觸發假突破。</p>
                </div>
              </div>

              {sortedNextDayList.length === 0 ? (
                <p className="empty">{nextDayLoading ? "隔日沖名單更新中..." : "目前暫無隔日沖候選，系統會持續背景更新。"}</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>代號</th>
                        <th>名稱</th>
                        <th>隔日沖分數</th>
                        <th>等級</th>
                        <th>開高機率</th>
                        <th>訊號</th>
                        <th>漲跌</th>
                        <th>量比</th>
                        <th>假突破</th>
                        <th>觀察標籤</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedNextDayList.map((s) => (
                        <tr
                          key={s.symbol}
                          onClick={() => {
                            setStock(s);
                            setActiveMenu("analysis");
                          }}
                        >
                          <td><b>{s.symbol}</b></td>
                          <td>{s.name}</td>
                          <td><b>{s.nextDay?.nextDayScore ?? "--"}</b></td>
                          <td><span className="badge">{s.nextDay?.nextDayRank || "待觀察"}</span></td>
                          <td>{s.nextDay?.gapUpProbability ?? "--"}%</td>
                          <td>
                            <span className="badge">{s.nextDay?.nextDaySignal || "觀望"}</span>
                          </td>
                          <td className={s.changePct >= 0 ? "up" : "down"}>
                            {s.changePct?.toFixed?.(2) ?? "--"}%
                          </td>
                          <td>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                          <td className={s.nextDay?.fakeBreakout ? "down" : "up"}>
                            {s.nextDay?.fakeBreakout ? "有風險" : "通過"}
                          </td>
                          <td>{s.tags?.slice(0, 3).join("、") || s.volumeSignal?.title || "等待確認"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeMenu === "daytrade" && (
            <div className="card">
              <div className="section-title">
                <h2>⚡ 當沖模式</h2>
                <span className="muted">1秒刷新、1分鐘K、AI即時進場提示</span>
              </div>

              <div className="btn-row" style={{ marginBottom: 12 }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="輸入股票代碼，例如 2330、AAPL"
                  style={{ width: 220 }}
                  onKeyDown={(e) => e.key === "Enter" && searchIntraday(query)}
                />
                <select
                  value={klineType}
                  onChange={(e) => changeKlineType(e.target.value, query)}
                  style={{ width: 150 }}
                >
                  <option value="1m">1分K</option>
                  <option value="5m">5分K</option>
                  <option value="30m">30分K</option>
                  <option value="1d">日K</option>
                  <option value="1wk">周K</option>
                  <option value="1mo">月K</option>
                </select>
                <button onClick={() => searchIntraday(query)} disabled={dayTradeLoading}>
                  {dayTradeLoading ? "查詢中..." : "查詢分K"}
                </button>
                <button onClick={scanDayTradeList} disabled={dayTradeLoading} className="ghost">
                  掃描當沖排行榜
                </button>
                <button
                  className={realtimeDayTrade ? "danger" : "ghost"}
                  onClick={() => setRealtimeDayTrade((v) => !v)}
                >
                  {realtimeDayTrade ? "停止1秒刷新" : "啟動1秒刷新"}
                </button>
              </div>

              <div className="daytrade-grid">
                <div>
                  {intradayStock ? (
                    <>
                      <div className="stock-head">
                        <div className="stock-title">
                          <h1>{intradayStock.symbol} {intradayStock.name}</h1>
                          <p className="muted">目前使用 {klineLabel(klineType)}，資料來源為 Yahoo Finance K線（已加速輪詢，但 Yahoo 台股可能仍有延遲）。</p>
                        </div>
                        <div className={intradayStock.changePct >= 0 ? "price up" : "price down"}>
                          {intradayStock.close?.toFixed?.(2) ?? "--"}
                          <small>{intradayStock.changePct?.toFixed?.(2) ?? "--"}%</small>
                        </div>
                      </div>
                      <div className="chart-tools">
                        <div className="muted">K線週期：{klineLabel(klineType)}</div>
                        <select
                          value={klineType}
                          onChange={(e) => changeKlineType(e.target.value, intradayStock?.symbol || query)}
                          style={{ width: 130 }}
                        >
                          <option value="1m">1分K</option>
                          <option value="5m">5分K</option>
                          <option value="30m">30分K</option>
                          <option value="1d">日K</option>
                          <option value="1wk">周K</option>
                          <option value="1mo">月K</option>
                        </select>
                      </div>
                      <TradingChart
                        stock={intradayStock}
                        showMA5={showMA5}
                        showMA20={showMA20}
                        showMA60={showMA60}
                        showBollinger={showBollinger}
                        chartKey={klineType}
                      />
                    </>
                  ) : (
                    <p className="empty">請先輸入股票代碼並查詢分K，或掃描當沖排行榜。</p>
                  )}
                </div>

                <div>
                  {intradayStock?.dayTrade ? (
                    <>
                      <div className={`instant-signal ${intradayStock.dayTrade.tone}`}>
                        <b><span className="live-dot" />AI 即時進場提示</b>
                        <h2>{intradayStock.dayTrade.signal}</h2>
                        <p className="muted">分數 {intradayStock.dayTrade.score} / 100</p>
                      </div>
                      <div className="entry-grid">
                        <div className="entry-box"><span className="muted">進場參考</span><b>{intradayStock.dayTrade.entry?.toFixed?.(2)}</b></div>
                        <div className="entry-box"><span className="muted">停損 SL</span><b>{intradayStock.dayTrade.stopLoss?.toFixed?.(2)}</b></div>
                        <div className="entry-box"><span className="muted">停利 TP</span><b>{intradayStock.dayTrade.takeProfit?.toFixed?.(2)}</b></div>
                      </div>
                      <div className="signal-card">
                        <b>主要理由</b>
                        <ul className="signal-list">
                          {intradayStock.dayTrade.reasons.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                      <div className="signal-card">
                        <b>風險提醒</b>
                        <ul className="signal-list">
                          {intradayStock.dayTrade.risks.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <p className="empty">尚無當沖 AI 訊號。</p>
                  )}
                </div>
              </div>

              <div className="card watch-table-card">
                <div className="section-title"><h2>🔥 即時掃描當沖排行榜</h2></div>
                {sortedDayTradeList.length === 0 ? (
                  <p className="empty">按「掃描當沖排行榜」後會顯示結果。</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>排名</th><th>股票</th><th>當沖分數</th><th>漲跌</th><th>量比</th><th>提示</th></tr>
                      </thead>
                      <tbody>
                        {sortedDayTradeList.map((s, i) => (
                          <tr key={s.symbol} onClick={() => { setIntradayStock(s); setStock(s); }}>
                            <td>{i + 1}</td>
                            <td><b>{s.symbol}</b><br /><span className="muted">{s.name}</span></td>
                            <td>{s.dayTrade?.score ?? "--"}</td>
                            <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                            <td>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                            <td><span className="badge">{s.dayTrade?.signal || "觀察"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === "report" && (
            <div className="card">
              <div className="section-title">
                <h2>🧾 每日市場報告</h2>
                <span className="muted">更新 {new Date().toLocaleString("zh-TW")}</span>
              </div>

              <div className="report-tabs">
                <button className={reportTab === "overview" ? "active" : ""} onClick={() => setReportTab("overview")}>📊 今日市場簡介</button>
                <button className={reportTab === "news" ? "active" : ""} onClick={() => setReportTab("news")}>📰 重要財經新聞 5 則</button>
                <button className={reportTab === "ai" ? "active" : ""} onClick={() => setReportTab("ai")}>🤖 AI 摘要</button>
                <button className={reportTab === "watch" ? "active" : ""} onClick={() => setReportTab("watch")}>🔥 今日觀察股票</button>
              </div>

              {reportTab === "overview" && (
                <div className="summary-grid">
                  <div className="card">
                    <h3>📊 今日市場簡介</h3>
                    <p className="muted">
                      今日市場以台股、美股科技股、匯率與 BTC 作為觀察主軸。
                      短線重點放在成交量、AI分數、RSI、MACD 與 K 線型態。
                    </p>
                  </div>
                  <div className="card">
                    <h3>TW 台股</h3>
                    <p className="muted">半導體、AI伺服器、高股息ETF仍是主要觀察方向。</p>
                    <b>{marketStats.up} 檔上漲 / {marketStats.down} 檔下跌</b>
                  </div>
                  <div className="card">
                    <h3>US 美股</h3>
                    <p className="muted">觀察 AAPL、NVDA、TSLA、SPY、QQQ。</p>
                    <b>科技股與 ETF 為主要風向</b>
                  </div>
                  <div className="card">
                    <h3>💱 匯率 / BTC</h3>
                    <p className="muted">匯率影響外資，BTC 反映風險偏好。</p>
                    <b>偏向風險情緒指標</b>
                  </div>
                </div>
              )}

              {reportTab === "news" && (
                <div className="card">
                  <div className="section-title">
                    <h2>📰 重要財經新聞 5 則</h2>
                    <span className="muted">中文整理版</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>新聞標題</th><th>來源分類</th><th>影響判斷</th></tr>
                      </thead>
                      <tbody>
                        {dailyNews.map((news, index) => (
                          <tr key={index}>
                            <td>{news.title}</td>
                            <td>{news.source}</td>
                            <td><span className="badge">{news.impact}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {reportTab === "ai" && (
                <div className="card">
                  <div className="section-title">
                    <h2>🤖 AI 摘要</h2>
                    <span className="muted">依目前掃描結果整理</span>
                  </div>
                  <div className="signal-card">
                    <b>今日重點判斷</b>
                    <p>{dailyAiSummary}</p>
                  </div>
                </div>
              )}

              {reportTab === "watch" && (
                <div className="card">
                  <div className="section-title">
                    <h2>🔥 今日觀察股票</h2>
                    <span className="muted">依 AI 分數排序</span>
                  </div>
                  {todayWatchStocks.length === 0 ? (
                    <p className="empty">觀察名單更新中，系統會持續背景更新自選股與強勢股。</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr><th>代號</th><th>名稱</th><th>AI分數</th><th>漲跌</th><th>量比</th><th>訊號</th><th>觀察理由</th></tr>
                        </thead>
                        <tbody>
                          {todayWatchStocks.map((s) => (
                            <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}>
                              <td><b>{s.symbol}</b></td>
                              <td>{s.name}</td>
                              <td>{s.score ?? "--"}</td>
                              <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                              <td>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                              <td><span className="badge">{s.tradeSignal?.action || "觀望"}</span></td>
                              <td>{(s.tags && s.tags.length > 0) ? s.tags.slice(0, 3).join("、") : s.volumeSignal?.title || "等待確認"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}