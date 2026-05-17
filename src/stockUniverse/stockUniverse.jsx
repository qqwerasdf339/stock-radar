// src/data/stockUniverse.jsx
// 全台股 / ETF / 常見美股與 ETF 主資料表工具
// 用途：
// 1. 解決輸入股票代號只顯示代號、沒有中文名的問題
// 2. 將台股普通股、ETF、上櫃股票、美股、美股ETF統一成同一份 master
// 3. 優先即時抓官方資料，失敗時使用內建 fallback
//
// 建議放置位置：src/data/stockUniverse.jsx
//
// 在 Stock.jsx 使用：
// import {
//   fetchStockUniverse,
//   resolveStockInput,
//   getStockDisplayNameByCode,
//   mergeStockNameIntoQuote,
// } from "../data/stockUniverse";

const CACHE_KEY = "stock_universe_master_v1";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function now() {
  return Date.now();
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\.(TW|TWO)$/i, "")
    .replace(/[^0-9A-Z]/g, "");
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

function isTaiwanCommonStockCode(code) {
  return /^\d{4}$/.test(String(code));
}

function looksLikeTaiwanETF(code, name = "") {
  const c = String(code);
  const n = String(name);
  return /^00\d{2,}[A-Z]?$/.test(c) || /ETF|ETN|指數投資證券|基金|債|高股息|台灣50|臺灣50/i.test(n);
}

function isWarrantOrOddSecurity(code, name = "", type = "") {
  const c = String(code);
  const n = String(name);
  const t = String(type);
  return (
    /購|售|牛|熊|權證|認購|認售|牛證|熊證|受益證券|存託憑證|特別股|DR/i.test(n) ||
    /權證|牛證|熊證|受益證券|存託憑證|特別股/i.test(t) ||
    /^\d{5,6}[A-Z]?$/.test(c)
  );
}

function toStockRow(row) {
  const stockCode = normalizeCode(row.stockCode || row.code || row.Code || row["有價證券代號"] || row["證券代號"]);
  const stockName = cleanText(row.stockName || row.name || row.Name || row["有價證券名稱"] || row["證券名稱"]);
  const market = cleanText(row.market || row.Market || row["市場別"] || "");
  const officialIndustry = cleanText(row.officialIndustry || row.industry || row.Industry || row["產業別"] || row["產業類別"] || "");
  const securityType = cleanText(row.securityType || row.type || row.Type || row["有價證券種類"] || row["類別"] || "");

  if (!stockCode || !stockName) return null;

  const isETF = Boolean(row.isETF) || looksLikeTaiwanETF(stockCode, stockName) || /ETF|ETN/i.test(securityType);
  const isWarrant = Boolean(row.isWarrant) || isWarrantOrOddSecurity(stockCode, stockName, securityType);

  return {
    stockCode,
    stockName,
    market: market || (isETF ? "ETF" : "台股"),
    officialIndustry: isETF ? "ETF" : officialIndustry || "未分類產業",
    subIndustry: cleanText(row.subIndustry || ""),
    themeTags: Array.isArray(row.themeTags) ? row.themeTags : [],
    isETF,
    isWarrant,
    isTaiwan: true,
    isUS: false,
    yahooSymbol: isETF || market.includes("上市") ? `${stockCode}.TW` : `${stockCode}.TWO`,
    source: row.source || "fallback",
  };
}

function dedupeStocks(list) {
  const map = new Map();

  list.filter(Boolean).forEach((item) => {
    const code = normalizeCode(item.stockCode);
    if (!code) return;

    const prev = map.get(code);
    if (!prev) {
      map.set(code, item);
      return;
    }

    // 優先保留資訊較完整的資料
    const score = (x) =>
      (x.stockName && !/^\d+$/.test(x.stockName) ? 3 : 0) +
      (x.officialIndustry && x.officialIndustry !== "未分類產業" ? 2 : 0) +
      (x.market ? 1 : 0) +
      (x.source === "official" ? 3 : 0);

    if (score(item) >= score(prev)) map.set(code, { ...prev, ...item });
  });

  return [...map.values()].sort((a, b) => String(a.stockCode).localeCompare(String(b.stockCode), "zh-Hant"));
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (!cache?.updatedAt || !Array.isArray(cache?.data)) return null;
    if (now() - cache.updatedAt > CACHE_TTL) return null;
    return cache.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        updatedAt: now(),
        data,
      })
    );
  } catch {}
}

// ---------------------------------------------------------
// 官方 / 公開資料抓取
// ---------------------------------------------------------

async function fetchJsonCandidates(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.data)) return json.data;
      if (Array.isArray(json?.result)) return json.result;
    } catch (err) {
      console.warn("stock universe json candidate failed:", url, err);
    }
  }

  return [];
}

async function fetchTextCandidates(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.length > 100) return text;
    } catch (err) {
      console.warn("stock universe text candidate failed:", url, err);
    }
  }

  return "";
}

function parseIsinHtml(html, marketLabel) {
  if (!html) return [];

  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = [...doc.querySelectorAll("tr")];

  return rows
    .map((tr) => {
      const cols = [...tr.querySelectorAll("td")].map((td) => cleanText(td.textContent));
      if (cols.length < 5) return null;

      // ISIN 頁面常見欄位：
      // 0: 有價證券代號及名稱，例如 "2330　台積電"
      // 3: 市場別
      // 4: 產業別
      const first = cols[0] || "";
      const match = first.match(/^([0-9A-Z]{4,6})\s+(.+)$/i);
      if (!match) return null;

      const code = normalizeCode(match[1]);
      const name = cleanText(match[2]);
      const securityType = cols[2] || "";
      const market = cols[3] || marketLabel;
      const industry = cols[4] || "";

      if (!code || !name) return null;
      if (isWarrantOrOddSecurity(code, name, securityType)) return null;

      return toStockRow({
        stockCode: code,
        stockName: name,
        market: market || marketLabel,
        officialIndustry: industry,
        securityType,
        source: "official",
      });
    })
    .filter(Boolean);
}

async function fetchTaiwanListedFromIsin() {
  // strMode=2: 上市
  // strMode=4: 上櫃
  // 這個來源通常包含股票、ETF、ETN等，因此下面會再清理權證與特殊商品。
  const listedHtml = await fetchTextCandidates([
    "https://isin.twse.com.tw/isin/C_public.jsp?strMode=2",
  ]);

  const otcHtml = await fetchTextCandidates([
    "https://isin.twse.com.tw/isin/C_public.jsp?strMode=4",
  ]);

  return [
    ...parseIsinHtml(listedHtml, "上市"),
    ...parseIsinHtml(otcHtml, "上櫃"),
  ];
}

async function fetchTaiwanFromOpenApi() {
  // TWSE / TPEx OpenAPI 名稱偶爾會調整，因此保留多個候選。
  // 抓不到時會自動 fallback 到 ISIN / 內建資料。
  const twseRows = await fetchJsonCandidates([
    "https://openapi.twse.com.tw/v1/opendata/t187ap03_L",
    "https://openapi.twse.com.tw/v1/opendata/t187ap03_L_json",
  ]);

  const tpexRows = await fetchJsonCandidates([
    "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_company",
    "https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O",
  ]);

  const normalizeOfficialRows = (rows, market) =>
    rows
      .map((row) =>
        toStockRow({
          stockCode: row["公司代號"] || row["股票代號"] || row["有價證券代號"] || row.Code || row.code,
          stockName: row["公司名稱"] || row["公司簡稱"] || row["有價證券名稱"] || row.Name || row.name,
          market,
          officialIndustry: row["產業別"] || row["產業類別"] || row.Industry || row.industry,
          source: "official",
        })
      )
      .filter(Boolean);

  return [
    ...normalizeOfficialRows(twseRows, "上市"),
    ...normalizeOfficialRows(tpexRows, "上櫃"),
  ];
}

// ---------------------------------------------------------
// 內建 fallback：常用台股 / ETF / 美股
// 目的：官方來源暫時抓不到時，網站仍可正常顯示常用標的中文名。
// ---------------------------------------------------------

export const TAIWAN_STOCK_FALLBACK = [
  ["0050","元大台灣50","ETF","ETF"],["0056","元大高股息","ETF","ETF"],["006208","富邦台50","ETF","ETF"],["00878","國泰永續高股息","ETF","ETF"],["00919","群益台灣精選高息","ETF","ETF"],["00929","復華台灣科技優息","ETF","ETF"],["00939","統一台灣高息動能","ETF","ETF"],["00940","元大台灣價值高息","ETF","ETF"],

  ["1101","台泥","上市","水泥工業"],["1102","亞泥","上市","水泥工業"],["1216","統一","上市","食品工業"],["1301","台塑","上市","塑膠工業"],["1303","南亞","上市","塑膠工業"],["1326","台化","上市","塑膠工業"],
  ["1476","儒鴻","上市","紡織纖維"],["1477","聚陽","上市","紡織纖維"],["1504","東元","上市","電機機械"],["1513","中興電","上市","電機機械"],["1514","亞力","上市","電機機械"],["1605","華新","上市","電器電纜"],
  ["1707","葡萄王","上市","生技醫療"],["1722","台肥","上市","化學工業"],["1802","台玻","上市","玻璃陶瓷"],["2002","中鋼","上市","鋼鐵工業"],["2014","中鴻","上市","鋼鐵工業"],["2027","大成鋼","上市","鋼鐵工業"],
  ["2105","正新","上市","橡膠工業"],["2207","和泰車","上市","汽車工業"],

  ["2301","光寶科","上市","電子零組件業"],["2303","聯電","上市","半導體業"],["2308","台達電","上市","電子零組件業"],["2317","鴻海","上市","其他電子業"],["2324","仁寶","上市","電腦及週邊設備業"],["2327","國巨","上市","電子零組件業"],["2330","台積電","上市","半導體業"],
  ["2344","華邦電","上市","半導體業"],["2345","智邦","上市","通信網路業"],["2353","宏碁","上市","電腦及週邊設備業"],["2354","鴻準","上市","其他電子業"],["2356","英業達","上市","電腦及週邊設備業"],["2357","華碩","上市","電腦及週邊設備業"],["2368","金像電","上市","電子零組件業"],
  ["2371","大同","上市","電機機械"],["2376","技嘉","上市","電腦及週邊設備業"],["2377","微星","上市","電腦及週邊設備業"],["2379","瑞昱","上市","半導體業"],["2382","廣達","上市","電腦及週邊設備業"],["2383","台光電","上市","電子零組件業"],["2395","研華","上市","電腦及週邊設備業"],
  ["2408","南亞科","上市","半導體業"],["2409","友達","上市","光電業"],["2412","中華電","上市","通信網路業"],["2419","仲琦","上市","通信網路業"],["2421","建準","上市","電子零組件業"],["2454","聯發科","上市","半導體業"],["2474","可成","上市","其他電子業"],
  ["2498","宏達電","上市","通信網路業"],["2603","長榮","上市","航運業"],["2609","陽明","上市","航運業"],["2615","萬海","上市","航運業"],["2618","長榮航","上市","航運業"],
  ["2881","富邦金","上市","金融保險業"],["2882","國泰金","上市","金融保險業"],["2883","開發金","上市","金融保險業"],["2884","玉山金","上市","金融保險業"],["2885","元大金","上市","金融保險業"],["2886","兆豐金","上市","金融保險業"],["2891","中信金","上市","金融保險業"],["2892","第一金","上市","金融保險業"],
  ["2912","統一超","上市","貿易百貨"],["3017","奇鋐","上市","其他電子業"],["3034","聯詠","上市","半導體業"],["3035","智原","上市","半導體業"],["3037","欣興","上市","電子零組件業"],["3045","台灣大","上市","通信網路業"],["3231","緯創","上市","電腦及週邊設備業"],
  ["3324","雙鴻","上櫃","其他電子業"],["3374","精材","上櫃","半導體業"],["3443","創意","上市","半導體業"],["3481","群創","上市","光電業"],["3504","揚明光","上市","光電業"],["3661","世芯-KY","上市","半導體業"],["3711","日月光投控","上市","半導體業"],
  ["4938","和碩","上市","電腦及週邊設備業"],["4958","臻鼎-KY","上市","電子零組件業"],["4966","譜瑞-KY","上市","半導體業"],["5269","祥碩","上市","半導體業"],["5274","信驊","上櫃","半導體業"],["5347","世界","上櫃","半導體業"],["5483","中美晶","上櫃","半導體業"],
  ["5871","中租-KY","上市","其他業"],["5876","上海商銀","上市","金融保險業"],["5880","合庫金","上市","金融保險業"],["6116","彩晶","上市","光電業"],["6147","頎邦","上櫃","半導體業"],["6207","雷科","上櫃","電子零組件業"],["6217","中探針","上櫃","電子零組件業"],
  ["6239","力成","上市","半導體業"],["6274","台燿","上市","電子零組件業"],["6285","啟碁","上市","通信網路業"],["6415","矽力*-KY","上市","半導體業"],["6488","環球晶","上櫃","半導體業"],["6505","台塑化","上市","油電燃氣業"],["6531","愛普*","上市","半導體業"],
  ["6669","緯穎","上市","電腦及週邊設備業"],["8069","元太","上櫃","光電業"],["8046","南電","上市","電子零組件業"],["8299","群聯","上櫃","半導體業"],["8422","可寧衛*","上櫃","綠能環保"],["9933","中鼎","上市","其他業"],["9958","世紀鋼","上市","鋼鐵工業"]
].map(([stockCode, stockName, market, officialIndustry]) =>
  toStockRow({
    stockCode,
    stockName,
    market,
    officialIndustry,
    source: "fallback",
  })
);

export const US_STOCK_AND_ETF_MASTER = [
  ["AAPL","Apple Inc.","蘋果","美股","科技硬體"],["MSFT","Microsoft Corporation","微軟","美股","軟體雲端"],["NVDA","NVIDIA Corporation","輝達","美股","AI晶片"],["GOOGL","Alphabet Inc.","Alphabet A股","美股","網路服務"],["GOOG","Alphabet Inc.","Alphabet C股","美股","網路服務"],
  ["AMZN","Amazon.com Inc.","亞馬遜","美股","電商雲端"],["META","Meta Platforms Inc.","Meta","美股","社群平台"],["TSLA","Tesla Inc.","特斯拉","美股","電動車"],["AMD","Advanced Micro Devices","超微","美股","半導體"],["AVGO","Broadcom Inc.","博通","美股","半導體"],
  ["INTC","Intel Corporation","英特爾","美股","半導體"],["QCOM","Qualcomm Incorporated","高通","美股","半導體"],["MU","Micron Technology","美光","美股","記憶體"],["ARM","Arm Holdings","安謀","美股","半導體"],["TSM","Taiwan Semiconductor Manufacturing","台積電ADR","美股","半導體"],
  ["NFLX","Netflix Inc.","Netflix","美股","串流媒體"],["ADBE","Adobe Inc.","Adobe","美股","軟體"],["CRM","Salesforce Inc.","Salesforce","美股","軟體"],["ORCL","Oracle Corporation","甲骨文","美股","軟體"],["NOW","ServiceNow Inc.","ServiceNow","美股","軟體"],
  ["JPM","JPMorgan Chase","摩根大通","美股","金融"],["BAC","Bank of America","美國銀行","美股","金融"],["BRK.B","Berkshire Hathaway","波克夏B股","美股","控股"],["V","Visa Inc.","Visa","美股","支付"],["MA","Mastercard Inc.","Mastercard","美股","支付"],
  ["UNH","UnitedHealth Group","聯合健康","美股","醫療保險"],["LLY","Eli Lilly","禮來","美股","製藥"],["JNJ","Johnson & Johnson","嬌生","美股","醫療"],["XOM","Exxon Mobil","艾克森美孚","美股","能源"],["COST","Costco Wholesale","好市多","美股","零售"],
  ["SPY","SPDR S&P 500 ETF","SPY標普500 ETF","美股ETF","ETF"],["VOO","Vanguard S&P 500 ETF","VOO標普500 ETF","美股ETF","ETF"],["IVV","iShares Core S&P 500 ETF","IVV標普500 ETF","美股ETF","ETF"],["QQQ","Invesco QQQ Trust","QQQ納斯達克100 ETF","美股ETF","ETF"],["VTI","Vanguard Total Stock Market ETF","VTI全美股市 ETF","美股ETF","ETF"],
  ["DIA","SPDR Dow Jones Industrial Average ETF","DIA道瓊ETF","美股ETF","ETF"],["IWM","iShares Russell 2000 ETF","IWM羅素2000 ETF","美股ETF","ETF"],["SMH","VanEck Semiconductor ETF","SMH半導體ETF","美股ETF","ETF"],["SOXX","iShares Semiconductor ETF","SOXX半導體ETF","美股ETF","ETF"],["ARKK","ARK Innovation ETF","ARKK創新ETF","美股ETF","ETF"],
  ["TLT","iShares 20+ Year Treasury Bond ETF","TLT長天期美債ETF","美股ETF","ETF"],["IEF","iShares 7-10 Year Treasury Bond ETF","IEF中期美債ETF","美股ETF","ETF"],["HYG","iShares High Yield Corporate Bond ETF","HYG高收益債ETF","美股ETF","ETF"],["GLD","SPDR Gold Shares","GLD黃金ETF","美股ETF","ETF"],["SLV","iShares Silver Trust","SLV白銀ETF","美股ETF","ETF"],
  ["USO","United States Oil Fund","USO原油ETF","美股ETF","ETF"],["XLF","Financial Select Sector SPDR Fund","XLF金融ETF","美股ETF","ETF"],["XLK","Technology Select Sector SPDR Fund","XLK科技ETF","美股ETF","ETF"],["XLE","Energy Select Sector SPDR Fund","XLE能源ETF","美股ETF","ETF"],["XLV","Health Care Select Sector SPDR Fund","XLV醫療ETF","美股ETF","ETF"]
].map(([stockCode, englishName, stockName, market, officialIndustry]) => ({
  stockCode,
  stockName,
  englishName,
  market,
  officialIndustry,
  subIndustry: "",
  themeTags: officialIndustry === "ETF" ? ["ETF"] : [],
  isETF: market.includes("ETF"),
  isWarrant: false,
  isTaiwan: false,
  isUS: true,
  yahooSymbol: stockCode,
  source: "fallback",
}));

export async function fetchStockUniverse({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached?.length) return cached;
  }

  let officialRows = [];

  try {
    officialRows = await fetchTaiwanFromOpenApi();
  } catch (err) {
    console.warn("TWSE/TPEx OpenAPI fetch failed:", err);
  }

  if (!officialRows.length) {
    try {
      officialRows = await fetchTaiwanListedFromIsin();
    } catch (err) {
      console.warn("TWSE ISIN fetch failed:", err);
    }
  }

  const universe = dedupeStocks([
    ...officialRows,
    ...TAIWAN_STOCK_FALLBACK,
    ...US_STOCK_AND_ETF_MASTER,
  ]);

  writeCache(universe);
  return universe;
}

export function getFallbackStockUniverse() {
  return dedupeStocks([...TAIWAN_STOCK_FALLBACK, ...US_STOCK_AND_ETF_MASTER]);
}

export function getStockDisplayNameByCode(code, universe = getFallbackStockUniverse()) {
  const key = normalizeCode(code);
  const found = universe.find((item) => normalizeCode(item.stockCode) === key);
  return found?.stockName || key;
}

export function getStockInfoByCode(code, universe = getFallbackStockUniverse()) {
  const key = normalizeCode(code);
  return universe.find((item) => normalizeCode(item.stockCode) === key) || null;
}

export function resolveStockInput(input, universe = getFallbackStockUniverse()) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const rawKey = normalizeNameKey(raw);
  const codeKey = normalizeCode(raw);

  // 代號直接查
  const byCode = universe.find((item) => normalizeCode(item.stockCode) === codeKey);
  if (byCode) return byCode;

  // Yahoo格式，例如 2330.TW / 006208.TW
  const yahooCode = raw.toUpperCase().match(/^([0-9A-Z.]+)\.(TW|TWO)$/)?.[1];
  if (yahooCode) {
    const byYahooCode = universe.find((item) => normalizeCode(item.stockCode) === normalizeCode(yahooCode));
    if (byYahooCode) return byYahooCode;
  }

  // 中文名 / 英文名完全比對
  const exact = universe.find((item) => {
    return (
      normalizeNameKey(item.stockName) === rawKey ||
      normalizeNameKey(item.englishName) === rawKey
    );
  });
  if (exact) return exact;

  // 中文名模糊比對，例如輸入「台積」「矽力」
  if (/[\u4e00-\u9fff]/.test(raw)) {
    const partial = universe.find((item) => normalizeNameKey(item.stockName).includes(rawKey));
    if (partial) return partial;
  }

  // 美股 symbol
  const us = universe.find((item) => item.isUS && normalizeCode(item.stockCode) === codeKey);
  if (us) return us;

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
  const universe = await fetchStockUniverse();
  return resolveStockInput(input, universe);
}

export function mergeStockNameIntoQuote(quote, universe = getFallbackStockUniverse()) {
  if (!quote) return quote;

  const code = quote.symbol || quote.stockCode || quote.code;
  const info = getStockInfoByCode(code, universe);

  if (!info) return quote;

  return {
    ...quote,
    symbol: quote.symbol || info.stockCode,
    stockCode: quote.stockCode || info.stockCode,
    name: info.stockName,
    stockName: info.stockName,
    englishName: info.englishName || quote.englishName,
    baseType: quote.baseType || info.officialIndustry,
    officialIndustry: quote.officialIndustry || info.officialIndustry,
    market: quote.market || info.market,
    isETF: info.isETF,
    isWarrant: info.isWarrant,
  };
}

export function buildStockNameMap(universe = getFallbackStockUniverse()) {
  const map = {};
  universe.forEach((item) => {
    map[item.stockCode] = item.stockName;
  });
  return map;
}

export function buildStockSearchOptions(universe = getFallbackStockUniverse()) {
  return universe.map((item) => ({
    value: item.stockName,
    label: `${item.stockName} ${item.stockCode}`,
    code: item.stockCode,
    name: item.stockName,
    market: item.market,
    industry: item.officialIndustry,
  }));
}

export function clearStockUniverseCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

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
  TAIWAN_STOCK_FALLBACK,
  US_STOCK_AND_ETF_MASTER,
};
