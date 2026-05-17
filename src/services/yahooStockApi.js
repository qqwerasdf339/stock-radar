// src/services/yahooStockApi.js
// Yahoo 行情資料層：只負責 K線 / 股價 / 成交量，不處理中文名。

const API_BASE = "https://stock-radar-api-os48.onrender.com";

function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeYahooSymbol(input) {
  return String(input || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function buildYahooSymbolCandidates(input) {
  const raw = normalizeYahooSymbol(input);
  const noSuffix = raw.replace(/\.(TW|TWO)$/i, "");
  const list = [];

  if (raw) list.push(raw);

  if (/^\d{4,6}$/.test(noSuffix)) {
    list.push(`${noSuffix}.TW`);
    list.push(`${noSuffix}.TWO`);
  }

  return [...new Set(list.filter(Boolean))];
}

async function fetchYahooChartResult(symbol, range = "6mo", interval = "1d") {
  const url = `${API_BASE}/api/yahoo/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&_=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  return result ? { result, symbol } : null;
}

export async function fetchYahooHistory(input, range = "6mo", interval = "1d") {
  const candidates = buildYahooSymbolCandidates(input);
  if (!candidates.length) throw new Error("請輸入股票代號或名稱");

  let payload = null;
  let lastTried = "";

  for (const candidate of candidates) {
    lastTried = candidate;
    payload = await fetchYahooChartResult(candidate, range, interval);
    if (payload?.result) break;
  }

  if (!payload?.result) throw new Error(`Yahoo 資料抓取失敗：${lastTried || input}`);

  const { result, symbol } = payload;
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const meta = result.meta || {};

  const history = timestamps
    .map((t, i) => {
      const dt = new Date(t * 1000);
      return {
        time: interval === "1d" ? dt.toISOString().slice(0, 10) : t,
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

  if (!history.length) throw new Error(`找不到有效 K 線資料：${symbol}`);

  return {
    symbol: String(symbol || "").replace(/\.(TW|TWO)$/i, ""),
    yahooSymbol: symbol,
    yahooName: meta.longName || meta.shortName || symbol,
    currency: meta.currency || "TWD",
    regularMarketPrice: meta.regularMarketPrice || history.at(-1)?.close || null,
    history,
  };
}

export default { fetchYahooHistory, buildYahooSymbolCandidates, normalizeYahooSymbol };
