// src/stockUniverse/generateStockUniverse.js
// 產生全台股中文名稱 / 市場別 / 產業分類資料。
// 執行：node src/stockUniverse/generateStockUniverse.js
// 輸出：src/stockUniverse/stockUniverse.generated.js
//
// 網站平常只讀 generated 檔，不即時抓 TWSE / TPEx，所以不會 CORS / 黑屏。

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT = path.join(__dirname, "stockUniverse.generated.js");

const URLS = {
  listed: "https://isin.twse.com.tw/isin/C_public.jsp?strMode=2",
  otc: "https://isin.twse.com.tw/isin/C_public.jsp?strMode=4",
};

const CONCEPT_TAGS = {
  AI: ["2382", "3231", "2356", "3017", "3324", "6669", "2376", "2377", "2454", "3443", "3661", "2317", "2308"],
  ASIC: ["3661", "3443", "3035", "4966", "6531", "2379"],
  IC設計: ["2454", "3034", "6415", "2379", "3443", "5274", "3227", "4966", "6531", "8016", "2401"],
  電源管理: ["6415", "6435", "6651", "3317", "6138", "3588", "8261", "2454", "5299", "4952", "2436", "4923", "6693", "2308", "2301"],
  面板: ["2409", "3481", "6116", "2489", "5425"],
  PCB: ["3037", "8046", "3189", "2368", "2383", "6274", "8358"],
  散熱: ["3017", "3324", "2421", "6230", "3653"],
  重電: ["1504", "1513", "1514", "2308", "2371", "9958"],
  航運: ["2603", "2609", "2615", "2618"],
  金融: ["2881", "2882", "2883", "2884", "2885", "2886", "2890", "2891", "2892"],
};

const MANUAL_PATCH = {
  "2328": { stockName: "廣宇", themeTags: ["連接器", "電子零組件"] },
  "2464": { stockName: "盟立", themeTags: ["自動化", "機器人"] },
  "6207": { stockName: "雷科", themeTags: ["雷射設備"] },
  "6217": { stockName: "中探針", themeTags: ["探針", "半導體耗材"] },
  "6285": { stockName: "啟碁", themeTags: ["網通"] },
  "8422": { stockName: "可寧衛*", officialIndustry: "綠能環保" },
};

const COMMON_US = [
  ["AAPL", "蘋果", "Apple Inc.", "美股", "科技硬體", ["科技", "AI"]],
  ["MSFT", "微軟", "Microsoft Corporation", "美股", "軟體雲端", ["科技", "AI"]],
  ["NVDA", "輝達", "NVIDIA Corporation", "美股", "AI晶片", ["AI", "半導體"]],
  ["GOOGL", "Alphabet A股", "Alphabet Inc.", "美股", "網路服務", ["科技"]],
  ["GOOG", "Alphabet C股", "Alphabet Inc.", "美股", "網路服務", ["科技"]],
  ["AMZN", "亞馬遜", "Amazon.com Inc.", "美股", "電商雲端", ["科技", "雲端"]],
  ["META", "Meta", "Meta Platforms Inc.", "美股", "社群平台", ["科技", "AI"]],
  ["TSLA", "特斯拉", "Tesla Inc.", "美股", "電動車", ["電動車", "AI"]],
  ["AMD", "超微", "Advanced Micro Devices", "美股", "半導體", ["AI", "半導體"]],
  ["AVGO", "博通", "Broadcom Inc.", "美股", "半導體", ["半導體", "AI"]],
  ["SPY", "SPY標普500 ETF", "SPDR S&P 500 ETF", "美股ETF", "ETF", ["ETF"]],
  ["VOO", "VOO標普500 ETF", "Vanguard S&P 500 ETF", "美股ETF", "ETF", ["ETF"]],
  ["QQQ", "QQQ納斯達克100 ETF", "Invesco QQQ Trust", "美股ETF", "ETF", ["ETF", "科技"]],
  ["VTI", "VTI全美股市ETF", "Vanguard Total Stock Market ETF", "美股ETF", "ETF", ["ETF"]],
  ["SMH", "SMH半導體ETF", "VanEck Semiconductor ETF", "美股ETF", "ETF", ["ETF", "半導體"]],
  ["SOXX", "SOXX半導體ETF", "iShares Semiconductor ETF", "美股ETF", "ETF", ["ETF", "半導體"]],
  ["TLT", "TLT長天期美債ETF", "iShares 20+ Year Treasury Bond ETF", "美股ETF", "ETF", ["ETF", "美債"]],
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    }).on("error", reject);
  });
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isETF(code, name, type = "") {
  return /^00\d{2,}[A-Z]?$/.test(code) || /ETF|ETN|指數投資證券|基金|高股息|債/i.test(name + type);
}

function isBadSecurity(code, name, type = "") {
  return /權證|認購|認售|牛證|熊證|特別股|受益證券|存託憑證/i.test(name + type) || /^\d{5,6}[A-Z]?$/.test(code);
}

function getThemeTags(code) {
  const tags = [];
  for (const [tag, codes] of Object.entries(CONCEPT_TAGS)) {
    if (codes.includes(code)) tags.push(tag);
  }
  return tags;
}

function parseIsinTable(html, fallbackMarket) {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  return rows.map((tr) => {
    const cols = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripHtml(m[1]));
    if (cols.length < 5) return null;

    const match = cols[0].match(/^([0-9A-Z]{4,6})\s+(.+)$/i);
    if (!match) return null;

    const stockCode = match[1].trim();
    const stockName = match[2].trim();
    const securityType = cols[2] || "";
    const market = cols[3] || fallbackMarket;
    const officialIndustry = cols[4] || "";

    if (!stockCode || !stockName) return null;
    if (isBadSecurity(stockCode, stockName, securityType)) return null;

    const etf = isETF(stockCode, stockName, securityType);

    return {
      stockCode,
      stockName,
      market: etf ? "ETF" : market,
      officialIndustry: etf ? "ETF" : officialIndustry || "未分類產業",
      subIndustry: "",
      themeTags: getThemeTags(stockCode),
      isETF: etf,
      isWarrant: false,
      isTaiwan: true,
      isUS: false,
      yahooSymbol: `${stockCode}.${market.includes("上櫃") ? "TWO" : "TW"}`,
      source: "generated",
    };
  }).filter(Boolean);
}

function applyManualPatch(rows) {
  const map = new Map(rows.map((row) => [row.stockCode, row]));

  for (const [code, patch] of Object.entries(MANUAL_PATCH)) {
    const old = map.get(code) || {
      stockCode: code,
      stockName: patch.stockName || code,
      market: "上市",
      officialIndustry: patch.officialIndustry || "未分類產業",
      subIndustry: "",
      themeTags: [],
      isETF: false,
      isWarrant: false,
      isTaiwan: true,
      isUS: false,
      yahooSymbol: `${code}.TW`,
      source: "manual",
    };

    map.set(code, {
      ...old,
      ...patch,
      themeTags: [...new Set([...(old.themeTags || []), ...(patch.themeTags || []), ...getThemeTags(code)])],
    });
  }

  return [...map.values()];
}

function addCommonUs(rows) {
  return [
    ...rows,
    ...COMMON_US.map(([stockCode, stockName, englishName, market, officialIndustry, themeTags]) => ({
      stockCode, stockName, englishName, market, officialIndustry,
      subIndustry: "", themeTags,
      isETF: market.includes("ETF") || officialIndustry === "ETF",
      isWarrant: false, isTaiwan: false, isUS: true,
      yahooSymbol: stockCode,
      source: "manual-us",
    })),
  ];
}

function toJs(rows) {
  const generatedAt = new Date().toISOString();
  return `// src/stockUniverse/stockUniverse.generated.js
// 自動產生檔案，請勿手動修改。
// 更新方式：node src/stockUniverse/generateStockUniverse.js
// generatedAt: ${generatedAt}

export const STOCK_UNIVERSE_GENERATED_AT = ${JSON.stringify(generatedAt)};

export const STOCK_UNIVERSE = ${JSON.stringify(rows, null, 2)};

export default STOCK_UNIVERSE;
`;
}

async function main() {
  console.log("Downloading TWSE / TPEx ISIN lists...");
  const [listedHtml, otcHtml] = await Promise.all([fetchText(URLS.listed), fetchText(URLS.otc)]);

  let rows = [
    ...parseIsinTable(listedHtml, "上市"),
    ...parseIsinTable(otcHtml, "上櫃"),
  ];

  rows = applyManualPatch(rows);
  rows = addCommonUs(rows);
  rows = [...new Map(rows.map((row) => [row.stockCode, row])).values()]
    .sort((a, b) => String(a.stockCode).localeCompare(String(b.stockCode), "zh-Hant"));

  fs.writeFileSync(OUTPUT, toJs(rows), "utf8");
  console.log(`Done. Generated ${rows.length} rows: ${OUTPUT}`);
  console.log("若中文名稱出現亂碼，代表 ISIN 頁面需要 Big5 解碼，可再改用 iconv-lite。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
