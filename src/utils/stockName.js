// src/utils/stockName.js
import {
  getTwStockNameSync,
  fetchTwStockNamesFromOpenApi,
  normalizeStockCode,
  TW_STOCK_NAMES_FALLBACK,
} from "../data/twStockNames";
import { US_STOCK_NAMES } from "../data/usStockNames";
import { ETF_NAMES } from "../data/etfNames";

let runtimeTwStockNames = {};

export function normalizeSymbolForName(symbol = "") {
  return String(symbol).trim().toUpperCase();
}

export function getStockDisplayName(symbol, fallbackName = "") {
  const raw = normalizeSymbolForName(symbol);
  const twCode = normalizeStockCode(raw);

  // 台股 / 台股 ETF
  if (/^\d{4,6}[A-Z]?$/.test(twCode)) {
    return (
      runtimeTwStockNames[twCode] ||
      getTwStockNameSync(twCode, fallbackName) ||
      fallbackName ||
      raw
    );
  }

  // Yahoo 台股格式
  if (raw.endsWith(".TW") || raw.endsWith(".TWO")) {
    return (
      runtimeTwStockNames[twCode] ||
      getTwStockNameSync(twCode, fallbackName) ||
      fallbackName ||
      raw
    );
  }

  // 美股 ETF
  if (ETF_NAMES[raw]) return ETF_NAMES[raw];

  // 美股個股
  if (US_STOCK_NAMES[raw]) return US_STOCK_NAMES[raw];

  // Yahoo 加密貨幣
  if (raw === "BTC-USD") return "比特幣";
  if (raw === "ETH-USD") return "以太幣";
  if (raw === "SOL-USD") return "Solana";
  if (raw === "DOGE-USD") return "狗狗幣";

  return fallbackName || raw;
}

export async function initStockNameMap() {
  runtimeTwStockNames = await fetchTwStockNamesFromOpenApi();
  return runtimeTwStockNames;
}

export function getStockNameMapSnapshot() {
  return {
    tw: {
      ...TW_STOCK_NAMES_FALLBACK,
      ...runtimeTwStockNames,
    },
    us: US_STOCK_NAMES,
    etf: ETF_NAMES,
  };
}
