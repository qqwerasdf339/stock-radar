// src/stockUniverse/stockUniverse.jsx
// 股票中文名稱 / 產業 / 概念資料層：只負責名稱與分類，不抓 K線 / 股價 / 成交量。

import STOCK_UNIVERSE, { STOCK_UNIVERSE_GENERATED_AT } from "./stockUniverse.generated";

function cleanText(value) {
  return String(value ?? "").replace(/\u3000/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCode(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\.(TW|TWO)$/i, "").replace(/[^0-9A-Z.]/g, "");
}

function normalizeNameKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[＊*]/g, "")
    .replace(/[－—–]/g, "-")
    .replace(/\.TW$/i, "")
    .replace(/\.TWO$/i, "")
    .toUpperCase();
}

export function getFallbackStockUniverse() {
  return STOCK_UNIVERSE;
}

export async function fetchStockUniverse() {
  return STOCK_UNIVERSE;
}

export function getStockInfoByCode(code, universe = STOCK_UNIVERSE) {
  const key = normalizeCode(code);
  return universe.find((item) => normalizeCode(item.stockCode) === key) || null;
}

export function getStockDisplayNameByCode(code, universe = STOCK_UNIVERSE) {
  const found = getStockInfoByCode(code, universe);
  return found?.stockName || normalizeCode(code);
}

export function resolveStockInput(input, universe = STOCK_UNIVERSE) {
  const raw = cleanText(input);
  if (!raw) return null;

  const rawKey = normalizeNameKey(raw);
  const codeKey = normalizeCode(raw);

  const byCode = getStockInfoByCode(codeKey, universe);
  if (byCode) return byCode;

  const yahooCode = raw.toUpperCase().match(/^([0-9A-Z.]+)\.(TW|TWO)$/)?.[1];
  if (yahooCode) {
    const byYahooCode = getStockInfoByCode(yahooCode, universe);
    if (byYahooCode) return byYahooCode;
  }

  const exact = universe.find((item) =>
    normalizeNameKey(item.stockName) === rawKey ||
    normalizeNameKey(item.englishName) === rawKey
  );
  if (exact) return exact;

  if (/[\u4e00-\u9fff]/.test(raw)) {
    const partial = universe.find((item) => normalizeNameKey(item.stockName).includes(rawKey));
    if (partial) return partial;
  }

  return {
    stockCode: codeKey || raw.toUpperCase(),
    stockName: raw,
    market: /^[A-Z.]+$/.test(raw.toUpperCase()) ? "美股" : "未知",
    officialIndustry: "未分類產業",
    subIndustry: "",
    themeTags: [],
    isETF: false,
    isWarrant: false,
    isTaiwan: /^\d/.test(codeKey),
    isUS: /^[A-Z.]+$/.test(raw.toUpperCase()),
    yahooSymbol: raw.toUpperCase(),
    source: "unknown",
  };
}

export async function resolveStockInputAsync(input) {
  return resolveStockInput(input, STOCK_UNIVERSE);
}

export function mergeStockNameIntoQuote(quote, universe = STOCK_UNIVERSE) {
  if (!quote) return quote;
  const code = normalizeCode(quote.symbol || quote.stockCode || quote.code);
  const info = getStockInfoByCode(code, universe);
  if (!info) return quote;

  return {
    ...quote,
    symbol: code,
    stockCode: code,
    name: info.stockName,
    stockName: info.stockName,
    englishName: info.englishName || quote.englishName,
    baseType: quote.baseType || info.officialIndustry,
    officialIndustry: quote.officialIndustry || info.officialIndustry,
    market: quote.market || info.market,
    isETF: info.isETF,
    isWarrant: info.isWarrant,
    themeTags: info.themeTags || [],
  };
}

export function buildStockNameMap(universe = STOCK_UNIVERSE) {
  const map = {};
  universe.forEach((item) => {
    map[item.stockCode] = item.stockName;
  });
  return map;
}

export function buildStockSearchOptions(universe = STOCK_UNIVERSE) {
  return universe.map((item) => ({
    value: item.stockName,
    label: `${item.stockName} ${item.stockCode}`,
    code: item.stockCode,
    name: item.stockName,
    market: item.market,
    industry: item.officialIndustry,
  }));
}

export function clearStockUniverseCache() {}

export { STOCK_UNIVERSE, STOCK_UNIVERSE_GENERATED_AT };

export default {
  fetchStockUniverse,
  getFallbackStockUniverse,
  resolveStockInput,
  resolveStockInputAsync,
  getStockDisplayNameByCode,
  getStockInfoByCode,
  mergeStockNameIntoQuote,
  buildStockNameMap,
  buildStockSearchOptions,
  clearStockUniverseCache,
  STOCK_UNIVERSE,
  STOCK_UNIVERSE_GENERATED_AT,
};
