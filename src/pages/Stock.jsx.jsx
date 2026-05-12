import { getStockDisplayName, initStockNameMap } from "../utils/stockName";
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


const EXTRA_STOCK_CHINESE_NAMES = {
  "2301": "光寶科",
  "2353": "宏碁",
  "2354": "鴻準",
  "2395": "研華",
  "2406": "國碩",
  "2409": "友達",
  "2476": "鉅祥",
  "2489": "瑞軒",
  "2610": "華航",
  "2618": "長榮航",
  "2637": "慧洋-KY",
  "2801": "彰銀",
  "2890": "永豐金",
  "3035": "智原",
  "3045": "台灣大",
  "3324": "雙鴻",
  "3504": "揚明光",
  "4934": "太極",
  "4935": "茂林-KY",
  "4966": "譜瑞-KY",
  "5608": "四維航",
  "6116": "彩晶",
  "6213": "聯茂",
  "6415": "矽力*-KY",
  "6505": "台塑化",
  "006208": "富邦台50",
  "00881": "國泰台灣5G+",
  "00891": "中信關鍵半導體",
  "00892": "富邦台灣半導體",
  "00922": "國泰台灣領袖50",
  "00935": "野村臺灣新科技50",
  "00939": "統一台灣高息動能",
  "00952": "凱基台灣AI50",
};

function getLocalDisplayName(symbol, fallback = "") {
  const key = String(symbol || "").toUpperCase();
  const mapped = EXTRA_STOCK_CHINESE_NAMES[key];
  if (mapped) return mapped;

  const name = getStockDisplayName(symbol, fallback || symbol);
  const raw = String(name || "").trim();

  if (!raw || raw === key || raw === String(symbol || "").trim()) return mapped || raw || key;

  const looksEnglishOnly =
    /[A-Za-z]{4,}/.test(raw) &&
    !/[一-龥]/.test(raw);

  if (looksEnglishOnly && mapped) return mapped;
  return raw;
}


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
  { symbol: "6116", baseType: "上市面板" },
  { symbol: "2489", baseType: "上市面板" },
  { symbol: "3504", baseType: "上市光電" },
  { symbol: "4935", baseType: "上市光電" },
  { symbol: "2406", baseType: "上市面板" },
  { symbol: "2476", baseType: "上市面板零組件" },
  { symbol: "4934", baseType: "上市面板零組件" },

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

  // 補充：各產業常見相關股，讓產業點入後不只顯示一兩檔。
  { symbol: "3035", baseType: "IC設計" },
  { symbol: "4966", baseType: "IC設計" },
  { symbol: "6415", baseType: "IC設計" },
  { symbol: "3653", baseType: "散熱" },
  { symbol: "2421", baseType: "散熱" },
  { symbol: "3037", baseType: "電子零組件" },
  { symbol: "6213", baseType: "電子零組件" },
  { symbol: "2890", baseType: "金融" },
  { symbol: "2801", baseType: "金融" },
  { symbol: "006208", baseType: "ETF" },
  { symbol: "00939", baseType: "ETF" },
  { symbol: "00922", baseType: "ETF" },
  { symbol: "00881", baseType: "ETF" },
  { symbol: "00891", baseType: "ETF" },
  { symbol: "00892", baseType: "ETF" },
  { symbol: "00935", baseType: "ETF" },
  { symbol: "00952", baseType: "ETF" },
  { symbol: "2610", baseType: "航運" },
  { symbol: "2618", baseType: "航運" },
  { symbol: "2606", baseType: "航運" },
  { symbol: "2637", baseType: "航運" },
  { symbol: "5608", baseType: "航運" },
  { symbol: "1103", baseType: "水泥" },
  { symbol: "1104", baseType: "水泥" },
  { symbol: "1108", baseType: "水泥" },
  { symbol: "1109", baseType: "水泥" },
  { symbol: "1326", baseType: "塑化" },
  { symbol: "6505", baseType: "塑化" },
  { symbol: "1314", baseType: "塑化" },
  { symbol: "1312", baseType: "塑化" },
  { symbol: "1304", baseType: "塑化" },
  { symbol: "1305", baseType: "塑化" },
  { symbol: "2014", baseType: "鋼鐵" },
  { symbol: "2027", baseType: "鋼鐵" },
  { symbol: "2023", baseType: "鋼鐵" },
  { symbol: "2031", baseType: "鋼鐵" },
  { symbol: "9958", baseType: "鋼鐵" },
  { symbol: "3045", baseType: "電信" },
  { symbol: "4904", baseType: "電信" },
  { symbol: "1215", baseType: "食品" },
  { symbol: "1229", baseType: "食品" },
  { symbol: "1231", baseType: "食品" },
  { symbol: "1232", baseType: "食品" },
  { symbol: "1234", baseType: "食品" },
  { symbol: "1702", baseType: "食品" },
  { symbol: "2301", baseType: "電子" },
  { symbol: "2353", baseType: "電子" },
  { symbol: "2354", baseType: "電子" },
  { symbol: "2395", baseType: "電子" },
];


const STOCK_PROFILE_MAP = {
  "2330": { industry: "半導體 / 晶圓代工", business: "晶圓代工、先進製程、封裝測試、AI/HPC晶片製造" },
  "2317": { industry: "電子代工 / AI伺服器", business: "電子製造服務、伺服器、雲端設備、消費電子組裝" },
  "2454": { industry: "IC設計", business: "手機晶片、Wi-Fi、藍牙、電視晶片、車用與邊緣AI晶片" },
  "2308": { industry: "電源 / 工業自動化", business: "電源供應器、散熱、電動車電源、工業自動化與能源管理" },
  "2382": { industry: "AI伺服器 / 筆電代工", business: "筆電、雲端伺服器、AI伺服器、企業資料中心設備" },
  "2379": { industry: "IC設計 / 網通晶片", business: "乙太網路晶片、音效晶片、網通控制晶片" },
  "3034": { industry: "IC設計", business: "顯示驅動IC、影像處理晶片、車用與消費電子晶片" },
  "3443": { industry: "ASIC / IC設計服務", business: "ASIC設計服務、SoC設計、AI/HPC客製化晶片" },
  "3661": { industry: "高速運算IC設計", business: "高速傳輸晶片、ASIC設計、資料中心與AI應用晶片" },
  "6669": { industry: "AI伺服器", business: "雲端伺服器、AI伺服器、資料中心解決方案" },
  "3017": { industry: "散熱", business: "伺服器散熱、風扇、熱導管、液冷與散熱模組" },
  "3374": { industry: "半導體 / 封測", business: "晶圓測試、封裝測試、影像感測器與IC測試服務" },
  "6121": { industry: "電池模組 / 電子", business: "電池模組、電源管理、消費電子與工業應用電池" },
  "2881": { industry: "金融控股", business: "銀行、保險、證券、資產管理與金融服務" },
  "2891": { industry: "金融控股", business: "銀行、證券、保險、信用卡與金融投資服務" },
  "0050": { industry: "ETF", business: "追蹤台灣50大型權值股表現" },
  "0056": { industry: "ETF", business: "追蹤台灣高股息股票投資組合" },
  "00878": { industry: "ETF", business: "台灣ESG與高股息投資組合" },
  "00919": { industry: "ETF", business: "台灣精選高息股票投資組合" },
  "2409": { industry: "面板 / 顯示器", business: "TFT-LCD面板、顯示器面板、車用顯示、商用顯示與面板模組" },
  "3481": { industry: "面板 / 顯示器", business: "TFT-LCD面板、電視與顯示器面板、車用與工控顯示面板" },
  "6116": { industry: "面板 / 顯示器", business: "中小尺寸面板、顯示器面板、車用與工業應用顯示模組" },
  "2489": { industry: "面板零組件", business: "偏光板、光學膜、顯示器關鍵材料與面板零組件" },
  "3504": { industry: "背光模組 / 光電", business: "背光模組、顯示器模組、車用與工控顯示應用" },
  "4935": { industry: "面板模組 / 光電", business: "LCD顯示模組、觸控顯示模組、車用與工業顯示產品" },
  "2406": { industry: "面板 / 顯示器", business: "中小尺寸顯示面板、觸控面板與顯示模組" },
  "2476": { industry: "面板零組件", business: "背光模組、導光板、光學膜片與顯示器零組件" },
  "4934": { industry: "面板零組件", business: "觸控面板、保護玻璃、顯示器零組件與模組" },
};

function getStockProfile(stock) {
  const symbol = String(stock?.symbol || "").toUpperCase();
  const base = STOCK_PROFILE_MAP[symbol];
  const pool = MARKET_STRONG_POOL.find((item) => item.symbol === symbol);
  const industry = base?.industry || stock?.baseType || stock?.strongType || pool?.baseType || (stock?.currency === "USD" ? "美股 / ETF" : "未分類產業");
  const business = base?.business || (industry.includes("ETF") ? "ETF投資組合，主要追蹤指數或特定主題標的。" : "主要業務資料尚未完整建檔，可先依產業分類、K線、量價與法人籌碼綜合判斷。");
  return { industry, business };
}



const MARKET_GROUPS_FROM_EXCHANGE_VIEW = [
  "電零組", "紡織", "汽車", "化學生醫", "金融", "鋼鐵", "ETN",
  "航運", "電器電纜", "存託憑證", "水泥", "油電燃氣", "造紙", "營建",
  "數位雲端", "生技醫療", "資訊服務", "塑膠", "電腦週邊", "觀光", "化學",
  "受益證券", "居家生活", "ETF", "電子通路", "電機", "通信網路", "電子",
  "貿易百貨", "橡膠", "其它電子", "綠能環保", "光電", "塑化類", "食品",
  "其他", "半導體", "海外第一", "玻璃", "運動休閒",
  "農業科技業", "文創類", "半導體業", "電子通路業", "航運業", "鋼鐵工業",
  "其他電子業", "金融業", "電腦及週邊設備業", "通信網路業", "文化創意業",
  "綠能環保", "生技醫療業", "紡織纖維"
];

const GROUP_ALIAS_MAP = {
  "電零組": "電子零組件業",
  "電子零組件": "電子零組件業",
  "電子零組件業": "電子零組件業",
  "半導體": "半導體業",
  "半導體業": "半導體業",
  "金融": "金融保險業",
  "金融業": "金融保險業",
  "金融保險": "金融保險業",
  "金融保險業": "金融保險業",
  "電腦週邊": "電腦及週邊設備業",
  "電腦及週邊設備": "電腦及週邊設備業",
  "電腦及週邊設備業": "電腦及週邊設備業",
  "其它電子": "其他電子業",
  "其他電子": "其他電子業",
  "其他電子業": "其他電子業",
  "電子通路": "電子通路業",
  "電子通路業": "電子通路業",
  "通信網路": "通信網路業",
  "通信網路業": "通信網路業",
  "光電": "光電業",
  "光電業": "光電業",
  "航運": "航運業",
  "航運業": "航運業",
  "鋼鐵": "鋼鐵工業",
  "鋼鐵工業": "鋼鐵工業",
  "水泥": "水泥工業",
  "水泥工業": "水泥工業",
  "塑膠": "塑膠工業",
  "塑膠工業": "塑膠工業",
  "塑化類": "塑化",
  "塑化": "塑化",
  "化學": "化學工業",
  "化學工業": "化學工業",
  "化學生醫": "化學生醫",
  "生技醫療": "生技醫療業",
  "生技醫療業": "生技醫療業",
  "食品": "食品工業",
  "食品工業": "食品工業",
  "紡織": "紡織纖維",
  "紡織纖維": "紡織纖維",
  "汽車": "汽車工業",
  "汽車工業": "汽車工業",
  "電機": "電機機械",
  "電機機械": "電機機械",
  "電器電纜": "電器電纜",
  "油電燃氣": "油電燃氣業",
  "油電燃氣業": "油電燃氣業",
  "造紙": "造紙工業",
  "造紙工業": "造紙工業",
  "營建": "建材營造",
  "建材營造": "建材營造",
  "觀光": "觀光事業",
  "觀光事業": "觀光事業",
  "橡膠": "橡膠工業",
  "橡膠工業": "橡膠工業",
  "玻璃": "玻璃陶瓷",
  "玻璃陶瓷": "玻璃陶瓷",
  "資訊服務": "資訊服務業",
  "資訊服務業": "資訊服務業",
  "貿易百貨": "貿易百貨業",
  "貿易百貨業": "貿易百貨業",
  "居家生活": "居家生活",
  "運動休閒": "運動休閒",
  "數位雲端": "數位雲端",
  "綠能環保": "綠能環保",
  "農業科技業": "農業科技業",
  "文化創意業": "文化創意業",
  "文創類": "文化創意業",
  "海外第一": "海外第一",
  "電子": "電子",
  "其他": "其他"
};

function normalizeGroupName(groupName = "") {
  const raw = String(groupName || "").trim();
  return GROUP_ALIAS_MAP[raw] || raw.replace(/^上市/, "").replace(/^上櫃/, "") || raw;
}

const EXTRA_MARKET_GROUP_STOCKS = [
  // 電子零組件 / PCB / 被動元件
  { stockCode: "2327", stockName: "國巨", market: "上市", officialIndustry: "電子零組件業", subIndustry: "被動元件", themeTags: ["電零組", "被動元件"], isETF: false, isWarrant: false },
  { stockCode: "2383", stockName: "台光電", market: "上市", officialIndustry: "電子零組件業", subIndustry: "銅箔基板", themeTags: ["電零組", "PCB", "CCL", "AI"], isETF: false, isWarrant: false },
  { stockCode: "2368", stockName: "金像電", market: "上市", officialIndustry: "電子零組件業", subIndustry: "PCB", themeTags: ["電零組", "PCB", "AI"], isETF: false, isWarrant: false },
  { stockCode: "3189", stockName: "景碩", market: "上市", officialIndustry: "電子零組件業", subIndustry: "載板", themeTags: ["電零組", "PCB", "ABF"], isETF: false, isWarrant: false },
  { stockCode: "8358", stockName: "金居", market: "上櫃", officialIndustry: "電子零組件業", subIndustry: "銅箔", themeTags: ["電零組", "PCB", "CCL"], isETF: false, isWarrant: false },
  { stockCode: "4958", stockName: "臻鼎-KY", market: "上市", officialIndustry: "電子零組件業", subIndustry: "PCB", themeTags: ["電零組", "PCB"], isETF: false, isWarrant: false },

  // 電腦週邊 / 其他電子 / 通信網路 / 資訊服務
  { stockCode: "2357", stockName: "華碩", market: "上市", officialIndustry: "電腦及週邊設備業", subIndustry: "品牌電腦", themeTags: ["電腦週邊"], isETF: false, isWarrant: false },
  { stockCode: "2376", stockName: "技嘉", market: "上市", officialIndustry: "電腦及週邊設備業", subIndustry: "板卡", themeTags: ["電腦週邊", "AI"], isETF: false, isWarrant: false },
  { stockCode: "2377", stockName: "微星", market: "上市", officialIndustry: "電腦及週邊設備業", subIndustry: "板卡", themeTags: ["電腦週邊", "AI"], isETF: false, isWarrant: false },
  { stockCode: "2395", stockName: "研華", market: "上市", officialIndustry: "電腦及週邊設備業", subIndustry: "工業電腦", themeTags: ["電腦週邊", "AI"], isETF: false, isWarrant: false },
  { stockCode: "2404", stockName: "漢唐", market: "上市", officialIndustry: "其他電子業", subIndustry: "廠務工程", themeTags: ["其他電子", "半導體設備"], isETF: false, isWarrant: false },
  { stockCode: "6196", stockName: "帆宣", market: "上市", officialIndustry: "其他電子業", subIndustry: "廠務工程", themeTags: ["其他電子", "半導體設備"], isETF: false, isWarrant: false },
  { stockCode: "2345", stockName: "智邦", market: "上市", officialIndustry: "通信網路業", subIndustry: "網通設備", themeTags: ["通信網路", "AI", "CPO"], isETF: false, isWarrant: false },
  { stockCode: "3596", stockName: "智易", market: "上市", officialIndustry: "通信網路業", subIndustry: "網通設備", themeTags: ["通信網路"], isETF: false, isWarrant: false },
  { stockCode: "5388", stockName: "中磊", market: "上櫃", officialIndustry: "通信網路業", subIndustry: "網通設備", themeTags: ["通信網路"], isETF: false, isWarrant: false },
  { stockCode: "3029", stockName: "零壹", market: "上市", officialIndustry: "資訊服務業", subIndustry: "系統整合", themeTags: ["資訊服務", "數位雲端"], isETF: false, isWarrant: false },
  { stockCode: "5203", stockName: "訊連", market: "上櫃", officialIndustry: "資訊服務業", subIndustry: "軟體", themeTags: ["資訊服務", "AI"], isETF: false, isWarrant: false },

  // 傳產與金融
  { stockCode: "1476", stockName: "儒鴻", market: "上市", officialIndustry: "紡織纖維", subIndustry: "成衣", themeTags: ["紡織"], isETF: false, isWarrant: false },
  { stockCode: "1477", stockName: "聚陽", market: "上市", officialIndustry: "紡織纖維", subIndustry: "成衣", themeTags: ["紡織"], isETF: false, isWarrant: false },
  { stockCode: "2207", stockName: "和泰車", market: "上市", officialIndustry: "汽車工業", subIndustry: "汽車銷售", themeTags: ["汽車"], isETF: false, isWarrant: false },
  { stockCode: "2227", stockName: "裕日車", market: "上市", officialIndustry: "汽車工業", subIndustry: "汽車銷售", themeTags: ["汽車"], isETF: false, isWarrant: false },
  { stockCode: "1536", stockName: "和大", market: "上市", officialIndustry: "電機機械", subIndustry: "汽車零組件", themeTags: ["汽車", "電機"], isETF: false, isWarrant: false },
  { stockCode: "1707", stockName: "葡萄王", market: "上市", officialIndustry: "生技醫療業", subIndustry: "保健食品", themeTags: ["生技醫療"], isETF: false, isWarrant: false },
  { stockCode: "4105", stockName: "東洋", market: "上櫃", officialIndustry: "生技醫療業", subIndustry: "製藥", themeTags: ["生技醫療"], isETF: false, isWarrant: false },
  { stockCode: "1717", stockName: "長興", market: "上市", officialIndustry: "化學工業", subIndustry: "化工材料", themeTags: ["化學"], isETF: false, isWarrant: false },
  { stockCode: "1722", stockName: "台肥", market: "上市", officialIndustry: "化學工業", subIndustry: "肥料", themeTags: ["化學", "農業科技業"], isETF: false, isWarrant: false },
  { stockCode: "2912", stockName: "統一超", market: "上市", officialIndustry: "貿易百貨業", subIndustry: "零售通路", themeTags: ["貿易百貨", "居家生活"], isETF: false, isWarrant: false },
  { stockCode: "5904", stockName: "寶雅", market: "上櫃", officialIndustry: "貿易百貨業", subIndustry: "生活百貨", themeTags: ["貿易百貨", "居家生活"], isETF: false, isWarrant: false },
  { stockCode: "2105", stockName: "正新", market: "上市", officialIndustry: "橡膠工業", subIndustry: "輪胎", themeTags: ["橡膠"], isETF: false, isWarrant: false },
  { stockCode: "2106", stockName: "建大", market: "上市", officialIndustry: "橡膠工業", subIndustry: "輪胎", themeTags: ["橡膠"], isETF: false, isWarrant: false },
  { stockCode: "1802", stockName: "台玻", market: "上市", officialIndustry: "玻璃陶瓷", subIndustry: "玻璃", themeTags: ["玻璃"], isETF: false, isWarrant: false },
  { stockCode: "1904", stockName: "正隆", market: "上市", officialIndustry: "造紙工業", subIndustry: "工紙", themeTags: ["造紙"], isETF: false, isWarrant: false },
  { stockCode: "1907", stockName: "永豐餘", market: "上市", officialIndustry: "造紙工業", subIndustry: "造紙", themeTags: ["造紙"], isETF: false, isWarrant: false },
  { stockCode: "2542", stockName: "興富發", market: "上市", officialIndustry: "建材營造", subIndustry: "營建", themeTags: ["營建"], isETF: false, isWarrant: false },
  { stockCode: "2548", stockName: "華固", market: "上市", officialIndustry: "建材營造", subIndustry: "營建", themeTags: ["營建"], isETF: false, isWarrant: false },
  { stockCode: "5534", stockName: "長虹", market: "上市", officialIndustry: "建材營造", subIndustry: "營建", themeTags: ["營建"], isETF: false, isWarrant: false },
  { stockCode: "2707", stockName: "晶華", market: "上市", officialIndustry: "觀光事業", subIndustry: "飯店", themeTags: ["觀光"], isETF: false, isWarrant: false },
  { stockCode: "2727", stockName: "王品", market: "上市", officialIndustry: "觀光事業", subIndustry: "餐飲", themeTags: ["觀光"], isETF: false, isWarrant: false },
  { stockCode: "1103", stockName: "嘉泥", market: "上市", officialIndustry: "水泥工業", subIndustry: "水泥", themeTags: ["水泥"], isETF: false, isWarrant: false },
  { stockCode: "1104", stockName: "環泥", market: "上市", officialIndustry: "水泥工業", subIndustry: "水泥", themeTags: ["水泥"], isETF: false, isWarrant: false },
  { stockCode: "6505", stockName: "台塑化", market: "上市", officialIndustry: "油電燃氣業", subIndustry: "油品", themeTags: ["油電燃氣", "塑化"], isETF: false, isWarrant: false },
  { stockCode: "9937", stockName: "全國", market: "上市", officialIndustry: "油電燃氣業", subIndustry: "油品通路", themeTags: ["油電燃氣"], isETF: false, isWarrant: false },
  { stockCode: "1513", stockName: "中興電", market: "上市", officialIndustry: "電機機械", subIndustry: "重電", themeTags: ["電機", "重電", "電力設備"], isETF: false, isWarrant: false },
  { stockCode: "1514", stockName: "亞力", market: "上市", officialIndustry: "電機機械", subIndustry: "重電", themeTags: ["電機", "重電", "電力設備"], isETF: false, isWarrant: false },
  { stockCode: "1605", stockName: "華新", market: "上市", officialIndustry: "電器電纜", subIndustry: "電纜", themeTags: ["電器電纜", "重電"], isETF: false, isWarrant: false },
  { stockCode: "1609", stockName: "大亞", market: "上市", officialIndustry: "電器電纜", subIndustry: "電纜", themeTags: ["電器電纜", "重電"], isETF: false, isWarrant: false },
  { stockCode: "2704", stockName: "國賓", market: "上市", officialIndustry: "觀光事業", subIndustry: "飯店", themeTags: ["觀光"], isETF: false, isWarrant: false },
  { stockCode: "8926", stockName: "台汽電", market: "上櫃", officialIndustry: "油電燃氣業", subIndustry: "汽電共生", themeTags: ["油電燃氣", "綠能環保"], isETF: false, isWarrant: false },
  { stockCode: "6806", stockName: "森崴能源", market: "上市", officialIndustry: "綠能環保", subIndustry: "再生能源", themeTags: ["綠能環保", "重電"], isETF: false, isWarrant: false },
];

function normalizeIndustryName(name = "") {
  const raw = String(name || "其他").trim();
  const alias = normalizeGroupName(raw);

  if (GROUP_ALIAS_MAP[raw]) return GROUP_ALIAS_MAP[raw];
  if (alias !== raw) return alias;

  if (raw.includes("面板") || raw.includes("光電")) return "光電業";
  if (raw.includes("AI伺服器") || raw.includes("伺服器")) return "AI伺服器";
  if (raw.includes("IC設計")) return "IC設計";
  if (raw.includes("半導體") || raw.includes("晶圓") || raw.includes("封測")) return "半導體業";
  if (raw.includes("金融")) return "金融保險業";
  if (raw.includes("ETF")) return "ETF";
  if (raw.includes("ETN")) return "ETN";
  if (raw.includes("航運")) return "航運業";
  if (raw.includes("水泥")) return "水泥工業";
  if (raw.includes("塑化")) return "塑化";
  if (raw.includes("塑膠")) return "塑膠工業";
  if (raw.includes("鋼鐵")) return "鋼鐵工業";
  if (raw.includes("電子零組件") || raw.includes("電零組")) return "電子零組件業";
  if (raw.includes("電子通路")) return "電子通路業";
  if (raw.includes("通信網路")) return "通信網路業";
  if (raw.includes("電腦")) return "電腦及週邊設備業";
  if (raw.includes("其他電子") || raw.includes("其它電子")) return "其他電子業";
  if (raw.includes("生技")) return "生技醫療業";
  if (raw.includes("電信")) return "通信網路業";
  if (raw.includes("食品")) return "食品工業";

  return raw.replace(/^上市/, "").replace(/^上櫃/, "") || raw;
}



const STOCK_MASTER = [
  // 半導體 / IC設計
  { stockCode: "2330", stockName: "台積電", market: "上市", officialIndustry: "半導體業", subIndustry: "晶圓代工", themeTags: ["半導體", "AI", "先進製程"], isETF: false, isWarrant: false },
  { stockCode: "2303", stockName: "聯電", market: "上市", officialIndustry: "半導體業", subIndustry: "晶圓代工", themeTags: ["半導體"], isETF: false, isWarrant: false },
  { stockCode: "2454", stockName: "聯發科", market: "上市", officialIndustry: "半導體業", subIndustry: "IC設計", themeTags: ["IC設計", "手機晶片"], isETF: false, isWarrant: false },
  { stockCode: "2379", stockName: "瑞昱", market: "上市", officialIndustry: "半導體業", subIndustry: "IC設計", themeTags: ["IC設計", "網通晶片"], isETF: false, isWarrant: false },
  { stockCode: "3034", stockName: "聯詠", market: "上市", officialIndustry: "半導體業", subIndustry: "IC設計", themeTags: ["IC設計", "面板驅動IC"], isETF: false, isWarrant: false },
  { stockCode: "3443", stockName: "創意", market: "上市", officialIndustry: "半導體業", subIndustry: "ASIC", themeTags: ["IC設計", "ASIC", "AI"], isETF: false, isWarrant: false },
  { stockCode: "3661", stockName: "世芯-KY", market: "上市", officialIndustry: "半導體業", subIndustry: "ASIC", themeTags: ["IC設計", "ASIC", "AI"], isETF: false, isWarrant: false },
  { stockCode: "3035", stockName: "智原", market: "上市", officialIndustry: "半導體業", subIndustry: "ASIC", themeTags: ["IC設計", "ASIC"], isETF: false, isWarrant: false },
  { stockCode: "4966", stockName: "譜瑞-KY", market: "上市", officialIndustry: "半導體業", subIndustry: "高速傳輸IC", themeTags: ["IC設計", "高速傳輸"], isETF: false, isWarrant: false },
  { stockCode: "6415", stockName: "矽力*-KY", market: "上市", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["IC設計", "電源管理"], isETF: false, isWarrant: false },
  { stockCode: "3227", stockName: "原相", market: "上櫃", officialIndustry: "半導體業", subIndustry: "感測IC", themeTags: ["IC設計", "感測器"], isETF: false, isWarrant: false },
  { stockCode: "3264", stockName: "欣銓", market: "上櫃", officialIndustry: "半導體業", subIndustry: "IC測試", themeTags: ["半導體", "封測"], isETF: false, isWarrant: false },
  { stockCode: "5274", stockName: "信驊", market: "上櫃", officialIndustry: "半導體業", subIndustry: "伺服器管理晶片", themeTags: ["IC設計", "AI伺服器"], isETF: false, isWarrant: false },
  { stockCode: "8299", stockName: "群聯", market: "上櫃", officialIndustry: "半導體業", subIndustry: "儲存控制IC", themeTags: ["IC設計", "儲存"], isETF: false, isWarrant: false },

  // AI伺服器 / 散熱 / 電子零組件
  { stockCode: "2382", stockName: "廣達", market: "上市", officialIndustry: "電腦及週邊設備業", subIndustry: "伺服器代工", themeTags: ["AI伺服器", "伺服器"], isETF: false, isWarrant: false },
  { stockCode: "3231", stockName: "緯創", market: "上市", officialIndustry: "電腦及週邊設備業", subIndustry: "伺服器代工", themeTags: ["AI伺服器", "伺服器"], isETF: false, isWarrant: false },
  { stockCode: "6669", stockName: "緯穎", market: "上市", officialIndustry: "電腦及週邊設備業", subIndustry: "雲端伺服器", themeTags: ["AI伺服器", "雲端"], isETF: false, isWarrant: false },
  { stockCode: "2356", stockName: "英業達", market: "上市", officialIndustry: "電腦及週邊設備業", subIndustry: "伺服器代工", themeTags: ["AI伺服器", "伺服器"], isETF: false, isWarrant: false },
  { stockCode: "2317", stockName: "鴻海", market: "上市", officialIndustry: "其他電子業", subIndustry: "EMS", themeTags: ["AI伺服器", "電子代工"], isETF: false, isWarrant: false },
  { stockCode: "3017", stockName: "奇鋐", market: "上市", officialIndustry: "電腦及週邊設備業", subIndustry: "散熱", themeTags: ["散熱", "AI"], isETF: false, isWarrant: false },
  { stockCode: "3324", stockName: "雙鴻", market: "上櫃", officialIndustry: "電腦及週邊設備業", subIndustry: "散熱", themeTags: ["散熱", "AI"], isETF: false, isWarrant: false },
  { stockCode: "3653", stockName: "健策", market: "上市", officialIndustry: "電子零組件業", subIndustry: "散熱 / 均熱片", themeTags: ["散熱", "AI"], isETF: false, isWarrant: false },
  { stockCode: "6230", stockName: "尼得科超眾", market: "上市", officialIndustry: "電腦及週邊設備業", subIndustry: "散熱", themeTags: ["散熱"], isETF: false, isWarrant: false },
  { stockCode: "2327", stockName: "國巨", market: "上市", officialIndustry: "電子零組件業", subIndustry: "被動元件", themeTags: ["被動元件"], isETF: false, isWarrant: false },
  { stockCode: "3037", stockName: "欣興", market: "上市", officialIndustry: "電子零組件業", subIndustry: "PCB", themeTags: ["PCB", "ABF"], isETF: false, isWarrant: false },
  { stockCode: "8046", stockName: "南電", market: "上市", officialIndustry: "電子零組件業", subIndustry: "載板", themeTags: ["PCB", "ABF"], isETF: false, isWarrant: false },
  { stockCode: "6213", stockName: "聯茂", market: "上市", officialIndustry: "電子零組件業", subIndustry: "銅箔基板", themeTags: ["PCB", "CCL"], isETF: false, isWarrant: false },

  // 面板 / 光電
  { stockCode: "2409", stockName: "友達", market: "上市", officialIndustry: "光電業", subIndustry: "面板", themeTags: ["面板"], isETF: false, isWarrant: false },
  { stockCode: "3481", stockName: "群創", market: "上市", officialIndustry: "光電業", subIndustry: "面板", themeTags: ["面板"], isETF: false, isWarrant: false },
  { stockCode: "6116", stockName: "彩晶", market: "上市", officialIndustry: "光電業", subIndustry: "面板", themeTags: ["面板"], isETF: false, isWarrant: false },
  { stockCode: "2489", stockName: "瑞軒", market: "上市", officialIndustry: "光電業", subIndustry: "顯示器", themeTags: ["面板", "顯示器"], isETF: false, isWarrant: false },
  { stockCode: "3504", stockName: "揚明光", market: "上市", officialIndustry: "光電業", subIndustry: "光學元件", themeTags: ["光電"], isETF: false, isWarrant: false },
  { stockCode: "4935", stockName: "茂林-KY", market: "上市", officialIndustry: "光電業", subIndustry: "背光模組", themeTags: ["面板", "背光模組"], isETF: false, isWarrant: false },
  { stockCode: "5425", stockName: "台半", market: "上櫃", officialIndustry: "半導體業", subIndustry: "二極體", themeTags: ["半導體"], isETF: false, isWarrant: false },

  // 傳產 / 金融
  { stockCode: "2603", stockName: "長榮", market: "上市", officialIndustry: "航運業", subIndustry: "貨櫃航運", themeTags: ["航運"], isETF: false, isWarrant: false },
  { stockCode: "2609", stockName: "陽明", market: "上市", officialIndustry: "航運業", subIndustry: "貨櫃航運", themeTags: ["航運"], isETF: false, isWarrant: false },
  { stockCode: "2615", stockName: "萬海", market: "上市", officialIndustry: "航運業", subIndustry: "貨櫃航運", themeTags: ["航運"], isETF: false, isWarrant: false },
  { stockCode: "2610", stockName: "華航", market: "上市", officialIndustry: "航運業", subIndustry: "航空", themeTags: ["航運", "航空"], isETF: false, isWarrant: false },
  { stockCode: "2618", stockName: "長榮航", market: "上市", officialIndustry: "航運業", subIndustry: "航空", themeTags: ["航運", "航空"], isETF: false, isWarrant: false },
  { stockCode: "1101", stockName: "台泥", market: "上市", officialIndustry: "水泥工業", subIndustry: "水泥", themeTags: ["水泥"], isETF: false, isWarrant: false },
  { stockCode: "1102", stockName: "亞泥", market: "上市", officialIndustry: "水泥工業", subIndustry: "水泥", themeTags: ["水泥"], isETF: false, isWarrant: false },
  { stockCode: "1301", stockName: "台塑", market: "上市", officialIndustry: "塑膠工業", subIndustry: "塑化", themeTags: ["塑化"], isETF: false, isWarrant: false },
  { stockCode: "1303", stockName: "南亞", market: "上市", officialIndustry: "塑膠工業", subIndustry: "塑化", themeTags: ["塑化"], isETF: false, isWarrant: false },
  { stockCode: "1326", stockName: "台化", market: "上市", officialIndustry: "塑膠工業", subIndustry: "塑化", themeTags: ["塑化"], isETF: false, isWarrant: false },
  { stockCode: "2002", stockName: "中鋼", market: "上市", officialIndustry: "鋼鐵工業", subIndustry: "鋼鐵", themeTags: ["鋼鐵"], isETF: false, isWarrant: false },
  { stockCode: "2881", stockName: "富邦金", market: "上市", officialIndustry: "金融保險業", subIndustry: "金控", themeTags: ["金融"], isETF: false, isWarrant: false },
  { stockCode: "2882", stockName: "國泰金", market: "上市", officialIndustry: "金融保險業", subIndustry: "金控", themeTags: ["金融"], isETF: false, isWarrant: false },
  { stockCode: "2886", stockName: "兆豐金", market: "上市", officialIndustry: "金融保險業", subIndustry: "金控", themeTags: ["金融"], isETF: false, isWarrant: false },
  { stockCode: "2891", stockName: "中信金", market: "上市", officialIndustry: "金融保險業", subIndustry: "金控", themeTags: ["金融"], isETF: false, isWarrant: false },
  { stockCode: "1216", stockName: "統一", market: "上市", officialIndustry: "食品工業", subIndustry: "食品", themeTags: ["食品"], isETF: false, isWarrant: false },
  { stockCode: "2412", stockName: "中華電", market: "上市", officialIndustry: "通信網路業", subIndustry: "電信", themeTags: ["電信"], isETF: false, isWarrant: false },

  // 補充：概念族群 stockMaster 成分股（官方產業仍維持官方分類，概念放 themeTags）
  { stockCode: "6435", stockName: "大中", market: "上櫃", officialIndustry: "半導體業", subIndustry: "MOSFET / 電源元件", themeTags: ["電源管理", "MOSFET", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "6651", stockName: "全宇昕", market: "上櫃", officialIndustry: "半導體業", subIndustry: "功率半導體", themeTags: ["電源管理", "功率元件"], isETF: false, isWarrant: false },
  { stockCode: "3317", stockName: "尼克森", market: "上櫃", officialIndustry: "半導體業", subIndustry: "MOSFET", themeTags: ["電源管理", "MOSFET"], isETF: false, isWarrant: false },
  { stockCode: "6138", stockName: "茂達", market: "上櫃", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["電源管理", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "3588", stockName: "通嘉", market: "上市", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["電源管理", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "8261", stockName: "富鼎", market: "上櫃", officialIndustry: "半導體業", subIndustry: "MOSFET / 電源元件", themeTags: ["電源管理", "MOSFET"], isETF: false, isWarrant: false },
  { stockCode: "5299", stockName: "杰力", market: "上櫃", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["電源管理", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "4952", stockName: "凌通", market: "上市", officialIndustry: "半導體業", subIndustry: "MCU / 消費IC", themeTags: ["IC設計", "手機晶片"], isETF: false, isWarrant: false },
  { stockCode: "2436", stockName: "偉詮電", market: "上市", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["電源管理", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "4923", stockName: "力士", market: "上櫃", officialIndustry: "半導體業", subIndustry: "功率半導體", themeTags: ["電源管理", "功率元件"], isETF: false, isWarrant: false },
  { stockCode: "6693", stockName: "廣閎科", market: "上櫃", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["電源管理", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "6531", stockName: "愛普*", market: "上市", officialIndustry: "半導體業", subIndustry: "記憶體 / IP", themeTags: ["ASIC", "高速傳輸", "IC設計", "AI"], isETF: false, isWarrant: false },
  { stockCode: "8016", stockName: "矽創", market: "上市", officialIndustry: "半導體業", subIndustry: "驅動IC", themeTags: ["IC設計", "面板驅動IC"], isETF: false, isWarrant: false },
  { stockCode: "2401", stockName: "凌陽", market: "上市", officialIndustry: "半導體業", subIndustry: "多媒體IC", themeTags: ["IC設計", "消費IC"], isETF: false, isWarrant: false },
  { stockCode: "5269", stockName: "祥碩", market: "上市", officialIndustry: "半導體業", subIndustry: "高速傳輸IC", themeTags: ["高速傳輸", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "3260", stockName: "威剛", market: "上市", officialIndustry: "電子通路業", subIndustry: "記憶體模組", themeTags: ["儲存", "記憶體"], isETF: false, isWarrant: false },
  { stockCode: "8088", stockName: "品安", market: "上櫃", officialIndustry: "半導體業", subIndustry: "記憶體模組", themeTags: ["儲存", "記憶體"], isETF: false, isWarrant: false },
];


const conceptMap = {
  "電源管理": [
    "6415", "6435", "6651", "3317", "6138", "3588",
    "8261", "2454", "5299", "4952", "2436", "4923", "6693"
  ],
  "IC設計": [
    "2454", "3034", "6415", "2379", "3443", "5274",
    "3227", "4966", "6531", "8016", "2401"
  ],
  "ASIC": [
    "3661", "3443", "3035", "4966", "6531"
  ],
  "AI": [
    "2382", "3231", "2356", "3017", "3324", "6669",
    "2376", "2377", "2454", "3443", "3661"
  ],
  "高速傳輸": [
    "3443", "3661", "5269", "4966", "6531", "2379"
  ],
  "手機晶片": [
    "2454", "3034", "3443", "6415", "2379"
  ],
  "儲存": [
    "2408", "2344", "3260", "8299", "6488", "8088"
  ]

  ,
  "ABF": ["3037", "8046", "3189", "8358", "6153", "2383", "2368", "4958"],
  "PCB": ["3037", "8046", "3189", "8358", "6153", "2383", "2368", "4958", "6213"],
  "電子零組件業": ["2327", "2383", "4938", "3037", "8046", "6274", "6231", "6187", "3217", "6213", "3189", "8358", "6153"],
  "通路": ["8069", "3702", "2347", "3036", "3209", "3260"],
  "重電": ["1513", "1514", "1609", "1605", "1504", "2371"],
  "配電盤": ["1513", "1514", "2371"],
  "電力設備": ["1513", "1514", "1609", "1605", "1504", "2371"],
  "面板": ["2409", "3481", "6116", "2489", "3504", "4935", "2406", "2476", "4934"],
  "光電": ["2409", "3481", "6116", "2489", "3504", "4935", "2406", "2476", "4934", "8069"],
  "散熱": ["3017", "3324", "3653", "6230"],
  "AI伺服器": ["2382", "3231", "6669", "2356", "2317", "3017", "3324", "3653"],
  "航運": ["2603", "2609", "2615", "2610", "2618"],
  "金融": ["2881", "2882", "2886", "2891"],
  "半導體業": ["2330", "2303", "2454", "2379", "3034", "3443", "3661", "3035", "4966", "6415", "3227", "3264", "5274", "8299", "6435", "6651", "3317", "6138", "3588", "8261", "5299", "2436", "4923", "6693"]

  ,
  "電零組": ["2327", "2383", "2368", "3037", "8046", "3189", "8358", "4958", "6213"],
  "紡織": ["1476", "1477", "1402"],
  "紡織纖維": ["1476", "1477", "1402"],
  "汽車": ["2207", "2227", "1536"],
  "汽車工業": ["2207", "2227", "1536"],
  "化學生醫": ["1717", "1722", "1707", "4105"],
  "金融保險業": ["2881", "2882", "2886", "2891"],
  "鋼鐵工業": ["2002"],
  "航運業": ["2603", "2609", "2615", "2610", "2618"],
  "電器電纜": ["1605", "1609"],
  "水泥工業": ["1101", "1102", "1103", "1104"],
  "油電燃氣業": ["6505", "9937", "8926"],
  "造紙工業": ["1904", "1907"],
  "營建": ["2542", "2548", "5534"],
  "建材營造": ["2542", "2548", "5534"],
  "數位雲端": ["3029", "5203"],
  "生技醫療業": ["1707", "4105"],
  "資訊服務業": ["3029", "5203"],
  "塑膠工業": ["1301", "1303", "1326"],
  "電腦及週邊設備業": ["2382", "3231", "2356", "2357", "2376", "2377", "2395"],
  "觀光事業": ["2707", "2727", "2704"],
  "化學工業": ["1717", "1722"],
  "居家生活": ["2912", "5904"],
  "電子通路業": ["3702", "2347", "3036", "3209", "3260"],
  "電機機械": ["1513", "1514", "1504", "1536"],
  "通信網路業": ["2412", "3045", "4904", "2345", "3596", "5388"],
  "電子": ["2330", "2454", "2382", "2327", "2317", "2345"],
  "貿易百貨業": ["2912", "5904"],
  "橡膠工業": ["2105", "2106"],
  "其他電子業": ["2317", "2404", "6196"],
  "綠能環保": ["6806", "8926"],
  "光電業": ["2409", "3481", "6116", "2489", "3504", "4935", "8069"],
  "食品工業": ["1216"],
  "海外第一": [],
  "玻璃陶瓷": ["1802"],
  "運動休閒": [],
  "農業科技業": ["1722"],
  "文化創意業": [],
  "文創類": []
};

function getStocksByGroup(groupName) {
  const rawKey = String(groupName || "").trim();
  const key = normalizeGroupName(rawKey);

  return STOCK_MASTER_ALL.filter((stock) => {
    if (!isCommonTaiwanStock(stock)) return false;

    return (
      stock.officialIndustry === key ||
      stock.officialIndustry === rawKey ||
      normalizeGroupName(stock.officialIndustry) === key ||
      stock.subIndustry === key ||
      stock.subIndustry === rawKey ||
      stock.themeTags?.includes(key) ||
      stock.themeTags?.includes(rawKey)
    );
  });
}

function resolveGroupStocks(groupName) {
  const rawKey = String(groupName || "").trim();
  const key = normalizeGroupName(rawKey);
  const conceptCodes = conceptMap[rawKey] || conceptMap[key];

  if (conceptCodes) {
    const codeSet = new Set(conceptCodes.filter((code) => /^\d{4}$/.test(String(code))));
    const result = STOCK_MASTER_ALL.filter((stock) => {
      return isCommonTaiwanStock(stock) && codeSet.has(stock.stockCode);
    });

    if (result.length < 5 && conceptCodes.length >= 5) {
      console.warn("此分類可能被誤判為 officialIndustry，請檢查 themeTags 或 conceptMap。", rawKey, result);
    }

    return result;
  }

  const result = getStocksByGroup(key);

  if (result.length < 5) {
    console.warn("此分類可能被誤判為 officialIndustry，請檢查 themeTags 或 conceptMap。", rawKey, result);
  }

  return result;
}

/*
後端 API 建議：
GET /api/industry-groups
  回傳 sourceA 產業強弱資料。

GET /api/groups/:groupName/stocks
  const masters = resolveGroupStocks(req.params.groupName)
  const quotes = await getRealtimeQuotes(masters.map(s => s.stockCode))
  res.json(masters.map(master => mergeRealtimeQuote(master, new Map(quotes.map(q => [q.symbol, q])))))

SQL schema:
CREATE TABLE stock_master (
  stock_code VARCHAR(4) PRIMARY KEY,
  stock_name TEXT NOT NULL,
  market TEXT NOT NULL,
  official_industry TEXT NOT NULL,
  theme_tags JSON NOT NULL,
  is_etf BOOLEAN DEFAULT FALSE,
  is_warrant BOOLEAN DEFAULT FALSE
);
*/
function mergeRealtimeQuote(master, quoteMap) {
  const quote = quoteMap?.get?.(master.stockCode);

  if (!quote) {
    return {
      symbol: master.stockCode,
      name: master.stockName,
      officialIndustry: master.officialIndustry,
      subIndustry: master.subIndustry,
      themeTags: master.themeTags,
      score: null,
      changePct: null,
      volume: null,
      volumeRatio: null,
      tradeSignal: {
        action: "待更新",
        reasons: ["stockMaster 成分股，等待即時行情資料"],
      },
    };
  }

  return {
    ...quote,
    symbol: master.stockCode,
    name: master.stockName,
    officialIndustry: master.officialIndustry,
    subIndustry: master.subIndustry,
    themeTags: master.themeTags,
  };
}


const EXTRA_STOCK_MASTER = [
  // ABF / PCB / 電子零組件
  { stockCode: "3189", stockName: "景碩", market: "上市", officialIndustry: "電子零組件業", subIndustry: "載板", themeTags: ["PCB", "ABF"], isETF: false, isWarrant: false },
  { stockCode: "8358", stockName: "金居", market: "上櫃", officialIndustry: "電子零組件業", subIndustry: "銅箔", themeTags: ["PCB", "CCL"], isETF: false, isWarrant: false },
  { stockCode: "6153", stockName: "嘉聯益", market: "上市", officialIndustry: "電子零組件業", subIndustry: "軟板", themeTags: ["PCB"], isETF: false, isWarrant: false },
  { stockCode: "2383", stockName: "台光電", market: "上市", officialIndustry: "電子零組件業", subIndustry: "銅箔基板", themeTags: ["PCB", "CCL", "AI"], isETF: false, isWarrant: false },
  { stockCode: "2368", stockName: "金像電", market: "上市", officialIndustry: "電子零組件業", subIndustry: "PCB", themeTags: ["PCB", "AI"], isETF: false, isWarrant: false },
  { stockCode: "4958", stockName: "臻鼎-KY", market: "上市", officialIndustry: "電子零組件業", subIndustry: "PCB", themeTags: ["PCB"], isETF: false, isWarrant: false },

  // 通路 / 記憶體通路
  { stockCode: "8069", stockName: "元太", market: "上櫃", officialIndustry: "光電業", subIndustry: "電子紙", themeTags: ["電子紙", "通路"], isETF: false, isWarrant: false },
  { stockCode: "3702", stockName: "大聯大", market: "上市", officialIndustry: "電子通路業", subIndustry: "電子零組件通路", themeTags: ["通路"], isETF: false, isWarrant: false },
  { stockCode: "2347", stockName: "聯強", market: "上市", officialIndustry: "電子通路業", subIndustry: "資訊通路", themeTags: ["通路"], isETF: false, isWarrant: false },
  { stockCode: "3036", stockName: "文曄", market: "上市", officialIndustry: "電子通路業", subIndustry: "半導體通路", themeTags: ["通路", "半導體"], isETF: false, isWarrant: false },
  { stockCode: "3209", stockName: "全科", market: "上市", officialIndustry: "電子通路業", subIndustry: "電子零組件通路", themeTags: ["通路"], isETF: false, isWarrant: false },

  // 重電 / 配電盤 / 電力設備
  { stockCode: "1513", stockName: "中興電", market: "上市", officialIndustry: "電機機械", subIndustry: "重電", themeTags: ["重電", "配電盤", "電力設備"], isETF: false, isWarrant: false },
  { stockCode: "1514", stockName: "亞力", market: "上市", officialIndustry: "電機機械", subIndustry: "重電", themeTags: ["重電", "配電盤", "電力設備"], isETF: false, isWarrant: false },
  { stockCode: "1609", stockName: "大亞", market: "上市", officialIndustry: "電器電纜", subIndustry: "電纜", themeTags: ["重電", "電力設備", "電纜"], isETF: false, isWarrant: false },
  { stockCode: "1605", stockName: "華新", market: "上市", officialIndustry: "電器電纜", subIndustry: "電纜", themeTags: ["重電", "電纜"], isETF: false, isWarrant: false },
  { stockCode: "1504", stockName: "東元", market: "上市", officialIndustry: "電機機械", subIndustry: "馬達", themeTags: ["重電", "電力設備"], isETF: false, isWarrant: false },
  { stockCode: "2371", stockName: "大同", market: "上市", officialIndustry: "電機機械", subIndustry: "重電", themeTags: ["重電", "電力設備"], isETF: false, isWarrant: false },

  // 電源管理 / PMIC
  { stockCode: "6435", stockName: "大中", market: "上櫃", officialIndustry: "半導體業", subIndustry: "MOSFET / 電源元件", themeTags: ["電源管理", "MOSFET", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "6651", stockName: "全宇昕", market: "上櫃", officialIndustry: "半導體業", subIndustry: "功率半導體", themeTags: ["電源管理", "功率元件"], isETF: false, isWarrant: false },
  { stockCode: "3317", stockName: "尼克森", market: "上櫃", officialIndustry: "半導體業", subIndustry: "MOSFET", themeTags: ["電源管理", "MOSFET"], isETF: false, isWarrant: false },
  { stockCode: "6138", stockName: "茂達", market: "上櫃", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["電源管理", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "3588", stockName: "通嘉", market: "上市", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["電源管理", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "8261", stockName: "富鼎", market: "上櫃", officialIndustry: "半導體業", subIndustry: "MOSFET / 電源元件", themeTags: ["電源管理", "MOSFET"], isETF: false, isWarrant: false },
  { stockCode: "5299", stockName: "杰力", market: "上櫃", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["電源管理", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "4952", stockName: "凌通", market: "上市", officialIndustry: "半導體業", subIndustry: "MCU / 消費IC", themeTags: ["IC設計", "手機晶片"], isETF: false, isWarrant: false },
  { stockCode: "2436", stockName: "偉詮電", market: "上市", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["電源管理", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "4923", stockName: "力士", market: "上櫃", officialIndustry: "半導體業", subIndustry: "功率半導體", themeTags: ["電源管理", "功率元件"], isETF: false, isWarrant: false },
  { stockCode: "6693", stockName: "廣閎科", market: "上櫃", officialIndustry: "半導體業", subIndustry: "電源管理IC", themeTags: ["電源管理", "IC設計"], isETF: false, isWarrant: false },

  // ASIC / 高速傳輸 / 儲存
  { stockCode: "6531", stockName: "愛普*", market: "上市", officialIndustry: "半導體業", subIndustry: "記憶體 / IP", themeTags: ["ASIC", "高速傳輸", "IC設計", "AI"], isETF: false, isWarrant: false },
  { stockCode: "5269", stockName: "祥碩", market: "上市", officialIndustry: "半導體業", subIndustry: "高速傳輸IC", themeTags: ["高速傳輸", "IC設計"], isETF: false, isWarrant: false },
  { stockCode: "3260", stockName: "威剛", market: "上市", officialIndustry: "電子通路業", subIndustry: "記憶體模組", themeTags: ["儲存", "記憶體"], isETF: false, isWarrant: false },
  { stockCode: "8088", stockName: "品安", market: "上櫃", officialIndustry: "半導體業", subIndustry: "記憶體模組", themeTags: ["儲存", "記憶體"], isETF: false, isWarrant: false },
];

const STOCK_MASTER_ALL = [
  ...STOCK_MASTER,
  ...EXTRA_STOCK_MASTER.filter((extra) => !STOCK_MASTER.some((base) => base.stockCode === extra.stockCode)),
  ...EXTRA_MARKET_GROUP_STOCKS.filter((extra) => {
    return !STOCK_MASTER.some((base) => base.stockCode === extra.stockCode) &&
      !EXTRA_STOCK_MASTER.some((base) => base.stockCode === extra.stockCode);
  }),
];

function isCommonTaiwanStock(master) {
  return (
    master &&
    /^\d{4}$/.test(master.stockCode) &&
    !master.isETF &&
    !master.isWarrant &&
    master.stockName &&
    /[一-龥]/.test(master.stockName) &&
    !/^[A-Za-z0-9\s.-]+$/.test(master.stockName)
  );
}

function getMasterByCode(code) {
  const key = String(code || "").replace(/\D/g, "").slice(0, 4);
  return STOCK_MASTER_ALL.find((item) => item.stockCode === key);
}

function getIndustryKeyFromMaster(master) {
  if (!master) return "其他";

  const priorityConcepts = [
    "電源管理", "ASIC", "AI", "高速傳輸", "手機晶片", "儲存",
    "ABF", "PCB", "面板", "AI伺服器", "散熱", "IC設計",
    "電零組", "紡織", "汽車", "化學生醫", "金融", "鋼鐵",
    "航運", "電器電纜", "水泥", "油電燃氣", "造紙", "營建",
    "數位雲端", "生技醫療", "資訊服務", "塑膠", "電腦週邊",
    "觀光", "化學", "居家生活", "電子通路", "電機", "通信網路",
    "電子", "貿易百貨", "橡膠", "其他電子", "綠能環保", "光電",
    "食品", "玻璃", "運動休閒", "農業科技業", "文化創意業"
  ];
  const matchedConcept = priorityConcepts.find((tag) => master.themeTags?.includes(tag));

  return matchedConcept || master.officialIndustry;
}

function getIndustryMembers(industryName) {
  return resolveGroupStocks(industryName);
}

const INDUSTRY_RELATED_STOCKS = {
  "上市面板 / 光電": [
    "2409", "3481", "6116", "2489", "3504", "4935", "2406", "2476", "4934"
  ],
  "IC設計": [
    "2454", "2379", "3034", "3443", "3661", "3035", "4966", "3227", "3264", "5274", "8299", "6415"
  ],
  "半導體": [
    "2330", "2303", "3711", "2408", "2344", "2379", "3034", "3443", "3661", "5274", "5347", "5483", "6488", "3105", "3264"
  ],
  "AI伺服器": [
    "2382", "3231", "6669", "2356", "2317", "2357", "2376", "2377", "3017", "3324", "3653", "6274", "6231"
  ],
  "散熱": [
    "3017", "3324", "3653", "2421", "3338", "6275", "6230"
  ],
  "電子零組件": [
    "2327", "2383", "4938", "3037", "8046", "6274", "6231", "6187", "3217", "6213"
  ],
  "金融": [
    "2881", "2882", "2883", "2884", "2885", "2886", "2887", "2890", "2891", "2892", "2801", "5871", "5880"
  ],
  "ETF": [
    "0050", "0056", "006208", "00878", "00919", "00929", "00940", "00939", "00922", "00881", "00891", "00892", "00935", "00952"
  ],
  "航運": [
    "2603", "2609", "2615", "2610", "2618", "2606", "2637", "5608"
  ],
  "水泥": [
    "1101", "1102", "1103", "1104", "1108", "1109"
  ],
  "塑化": [
    "1301", "1303", "1326", "6505", "1314", "1312", "1304", "1305"
  ],
  "鋼鐵": [
    "2002", "2014", "2027", "2023", "2031", "9958", "5009"
  ],
  "電信": [
    "2412", "3045", "4904"
  ],
  "食品": [
    "1216", "1215", "1229", "1231", "1232", "1234", "1702"
  ],
  "電子": [
    "2301", "2353", "2354", "2356", "2357", "2395", "2324", "4938", "2382"
  ],
};

function getRelatedSymbolsForIndustry(industryName = "") {
  const normalized = normalizeIndustryName(industryName);
  if (INDUSTRY_RELATED_STOCKS[normalized]) return INDUSTRY_RELATED_STOCKS[normalized];

  const foundKey = Object.keys(INDUSTRY_RELATED_STOCKS).find((key) => {
    return normalized.includes(key) || key.includes(normalized);
  });

  return foundKey ? INDUSTRY_RELATED_STOCKS[foundKey] : [];
}

function buildInstitutionalFlow(stock) {
  const symbol = String(stock?.symbol || "0000");
  const volume = Number(stock?.volume || stock?.history?.at?.(-1)?.volume || 0);
  const seed = [...symbol].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const unit = volume > 0 ? Math.max(1, Math.round(volume / 1000)) : 1000;

  const foreignBuy = Math.round(unit * (0.32 + (seed % 17) / 100));
  const foreignSell = Math.round(unit * (0.30 + (seed % 13) / 100));
  const trustBuy = Math.round(unit * (0.08 + (seed % 7) / 100));
  const trustSell = Math.round(unit * (0.07 + (seed % 5) / 100));
  const dealerBuy = Math.round(unit * (0.06 + (seed % 6) / 100));
  const dealerSell = Math.round(unit * (0.055 + (seed % 4) / 100));

  const rows = [
    { name: "外資", buy: foreignBuy, sell: foreignSell },
    { name: "投信", buy: trustBuy, sell: trustSell },
    { name: "自營商", buy: dealerBuy, sell: dealerSell },
  ].map((row) => ({ ...row, net: row.buy - row.sell }));

  const totalNet = rows.reduce((sum, row) => sum + row.net, 0);

  return {
    rows,
    totalNet,
    tone: totalNet > 0 ? "偏多" : totalNet < 0 ? "偏空" : "中性",
    source: "暫用量能估算模型；若需正式法人資料，後續可接 TWSE / TPEx 三大法人 API。",
  };
}


function classifyStrongStock(stock) {
  if (!stock) return "待觀察";
  if ((stock.volumeRatio || 0) >= 1.5 && stock.changePct > 0) return "爆量上漲";
  if (stock.score >= 80) return "AI強勢";
  if (stock.changePct >= 2) return "漲幅強勢";
  if ((stock.volumeRatio || 0) >= 1.3) return "量能強勢";
  if (stock.tradeSignal?.action === "BUY") return "買進訊號";
  return stock.baseType || "系統候選";
}




function klineSma(values, period, endIndex = values.length - 1) {
  if (!values?.length || endIndex < period - 1) return null;
  const slice = values.slice(endIndex - period + 1, endIndex + 1);
  if (slice.length < period || slice.some((v) => !Number.isFinite(v))) return null;
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

function klineSignal(signalName, direction, strength, riskLevel, description, triggered) {
  return {
    signalName,
    direction,
    strength: Math.max(0, Math.min(100, Math.round(strength || 0))),
    riskLevel,
    description,
    triggered: Boolean(triggered),
  };
}

function enrichKlineContext(rawCandles = []) {
  const candles = rawCandles
    .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .map((c) => ({ ...c, volume: Number(c.volume || 0) }));

  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);

  return candles.map((c, i) => {
    const ma5 = klineSma(closes, 5, i);
    const ma10 = klineSma(closes, 10, i);
    const ma20 = klineSma(closes, 20, i);
    const ma60 = klineSma(closes, 60, i);
    const volumeMA5 = klineSma(volumes, 5, i);
    const volumeMA20 = klineSma(volumes, 20, i);
    const prevHigh = i > 0 ? Math.max(...highs.slice(Math.max(0, i - 20), i)) : null;
    const prevLow = i > 0 ? Math.min(...lows.slice(Math.max(0, i - 20), i)) : null;
    const high20 = Math.max(...highs.slice(Math.max(0, i - 19), i + 1));
    const low20 = Math.min(...lows.slice(Math.max(0, i - 19), i + 1));
    const range20 = high20 - low20 || 1;
    const positionRatio = (c.close - low20) / range20;
    const trend20 = i >= 20 ? ((c.close - candles[i - 20].close) / candles[i - 20].close) * 100 : 0;

    return {
      ...c,
      ma5,
      ma10,
      ma20,
      ma60,
      volumeMA5,
      volumeMA20,
      prevHigh,
      prevLow,
      high20,
      low20,
      positionRatio,
      trend20,
      body: Math.abs(c.close - c.open),
      upperShadow: c.high - Math.max(c.open, c.close),
      lowerShadow: Math.min(c.open, c.close) - c.low,
      range: Math.max(0.0001, c.high - c.low),
      isRed: c.close > c.open,
      isBlack: c.close < c.open,
      volumeRatio20: volumeMA20 ? c.volume / volumeMA20 : 0,
    };
  });
}

function getTrendPosition(candles) {
  const c = candles.at(-1);
  if (!c) return "middle";
  if (c.positionRatio <= 0.33 || (c.trend20 <= -8 && c.close <= (c.ma20 || c.close) * 1.03)) return "low";
  if (c.positionRatio >= 0.67 || (c.trend20 >= 10 && c.close >= (c.ma20 || c.close) * 0.98)) return "high";
  return "middle";
}

function detectHammer(candles) {
  const c = candles.at(-1);
  const pos = getTrendPosition(candles);
  const triggered = c && c.lowerShadow >= c.body * 2.2 && c.upperShadow <= c.range * 0.22 && c.body <= c.range * 0.36 && pos === "low";
  return klineSignal("錘子線 Hammer", "bullish", 70, "medium", "低檔長下影，代表下方買盤承接。", triggered);
}

function detectHangingMan(candles) {
  const c = candles.at(-1);
  const pos = getTrendPosition(candles);
  const triggered = c && c.lowerShadow >= c.body * 2.1 && c.body <= c.range * 0.38 && pos === "high";
  return klineSignal("懸掛人 Hanging Man", "bearish", 68, "high", "高檔長下影但實體小，可能代表買盤開始不穩。", triggered);
}

function detectShootingStar(candles) {
  const c = candles.at(-1);
  const pos = getTrendPosition(candles);
  const triggered = c && c.upperShadow >= c.body * 2.2 && c.lowerShadow <= c.range * 0.18 && c.body <= c.range * 0.36 && pos === "high";
  return klineSignal("射擊星 Shooting Star", "bearish", 72, "high", "高檔長上影，代表上方賣壓明顯。", triggered);
}

function detectMorningStar(candles) {
  if (candles.length < 3) return klineSignal("晨星 Morning Star", "bullish", 0, "medium", "", false);
  const [a, b, c] = candles.slice(-3);
  const triggered = a.isBlack && a.body > a.range * 0.48 && b.body < b.range * 0.32 && c.isRed && c.close > (a.open + a.close) / 2 && getTrendPosition(candles.slice(0, -2)) === "low";
  return klineSignal("晨星 Morning Star", "bullish", 82, "low", "低檔三日反轉型態，空方動能轉弱後紅K確認。", triggered);
}

function detectEveningStar(candles) {
  if (candles.length < 3) return klineSignal("傍晚之星 Evening Star", "bearish", 0, "high", "", false);
  const [a, b, c] = candles.slice(-3);
  const triggered = a.isRed && a.body > a.range * 0.45 && b.body < b.range * 0.32 && c.isBlack && c.close < (a.open + a.close) / 2 && getTrendPosition(candles.slice(0, -2)) === "high";
  return klineSignal("傍晚之星 Evening Star", "bearish", 82, "high", "高檔三日反轉型態，多方動能轉弱後黑K確認。", triggered);
}

function detectBullishEngulfing(candles) {
  if (candles.length < 2) return klineSignal("看漲吞噬 Bullish Engulfing", "bullish", 0, "medium", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = p.isBlack && c.isRed && c.open <= p.close && c.close >= p.open && getTrendPosition(candles.slice(0, -1)) !== "high";
  return klineSignal("看漲吞噬 Bullish Engulfing", "bullish", 76, "medium", "紅K吞噬前一根黑K，買盤反攻。", triggered);
}

function detectBearishEngulfing(candles) {
  if (candles.length < 2) return klineSignal("看跌吞噬 Bearish Engulfing", "bearish", 0, "high", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = p.isRed && c.isBlack && c.open >= p.close && c.close <= p.open && getTrendPosition(candles.slice(0, -1)) !== "low";
  return klineSignal("看跌吞噬 Bearish Engulfing", "bearish", 76, "high", "黑K吞噬前一根紅K，賣壓反轉。", triggered);
}

function detectPiercingLine(candles) {
  if (candles.length < 2) return klineSignal("刺透線 Piercing Line", "bullish", 0, "medium", "", false);
  const [p, c] = candles.slice(-2);
  const midpoint = (p.open + p.close) / 2;
  const triggered = p.isBlack && c.isRed && c.open < p.close && c.close > midpoint && c.close < p.open && getTrendPosition(candles.slice(0, -1)) === "low";
  return klineSignal("刺透線 Piercing Line", "bullish", 70, "medium", "低檔開低走高並收回前黑K一半以上。", triggered);
}

function detectDarkCloudCover(candles) {
  if (candles.length < 2) return klineSignal("烏雲罩頂 Dark Cloud Cover", "bearish", 0, "high", "", false);
  const [p, c] = candles.slice(-2);
  const midpoint = (p.open + p.close) / 2;
  const triggered = p.isRed && c.isBlack && c.open > p.close && c.close < midpoint && c.close > p.open && getTrendPosition(candles.slice(0, -1)) === "high";
  return klineSignal("烏雲罩頂 Dark Cloud Cover", "bearish", 70, "high", "高檔開高走低並跌破前紅K中線。", triggered);
}

function detectThreeWhiteSoldiers(candles) {
  if (candles.length < 3) return klineSignal("紅三兵 Three White Soldiers", "bullish", 0, "medium", "", false);
  const last = candles.slice(-3);
  const triggered = last.every((c) => c.isRed && c.body > c.range * 0.45) && last[0].close < last[1].close && last[1].close < last[2].close;
  return klineSignal("紅三兵 Three White Soldiers", "bullish", 78, "medium", "連續三根強勢紅K，買盤延續。", triggered);
}

function detectThreeBlackCrows(candles) {
  if (candles.length < 3) return klineSignal("黑三兵 Three Black Crows", "bearish", 0, "high", "", false);
  const last = candles.slice(-3);
  const triggered = last.every((c) => c.isBlack && c.body > c.range * 0.45) && last[0].close > last[1].close && last[1].close > last[2].close;
  return klineSignal("黑三兵 Three Black Crows", "bearish", 78, "high", "連續三根強勢黑K，賣壓延續。", triggered);
}

function detectThreeOutsideDown(candles) {
  if (candles.length < 3) return klineSignal("三外面朝下 Three Outside Down", "bearish", 0, "high", "", false);
  const [a, b, c] = candles.slice(-3);
  const engulf = a.isRed && b.isBlack && b.open >= a.close && b.close <= a.open;
  const triggered = engulf && c.isBlack && c.close < b.close;
  return klineSignal("三外面朝下 Three Outside Down", "bearish", 80, "high", "看跌吞噬後續跌確認。", triggered);
}

function detectBullishBreakout(candles) {
  const c = candles.at(-1);
  const triggered = c && c.prevHigh && c.close > c.prevHigh && c.isRed;
  return klineSignal("看漲突破 Bullish Breakout", "bullish", 86, "medium", "收盤突破近20日前高，動能轉強。", triggered);
}

function detectGapUpBreakout(candles) {
  if (candles.length < 2) return klineSignal("跳空突破 Gap Up Breakout", "bullish", 0, "medium", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = c.open > p.high * 1.005 && c.close > (c.prevHigh || p.high);
  return klineSignal("跳空突破 Gap Up Breakout", "bullish", 82, "medium", "跳空開高並突破前高，資金急速進場。", triggered);
}

function detectLongRedPlatformBreakout(candles) {
  const c = candles.at(-1);
  if (!c || candles.length < 25) return klineSignal("長紅突破平台", "bullish", 0, "medium", "", false);
  const prev = candles.slice(-25, -1);
  const platformHigh = Math.max(...prev.map((x) => x.high));
  const platformLow = Math.min(...prev.map((x) => x.low));
  const platformNarrow = (platformHigh - platformLow) / platformLow < 0.16;
  const triggered = platformNarrow && c.isRed && c.body > c.range * 0.55 && c.close > platformHigh;
  return klineSignal("長紅突破平台", "bullish", 88, "medium", "平台整理後以長紅K突破，主升段機率提升。", triggered);
}

function detectWBottomBreakout(candles) {
  if (candles.length < 45) return klineSignal("W底突破", "bullish", 0, "medium", "", false);
  const recent = candles.slice(-45);
  const lows = recent.map((c, i) => ({ i, low: c.low }));
  const sorted = lows.sort((a, b) => a.low - b.low).slice(0, 5).sort((a, b) => a.i - b.i);
  const c = candles.at(-1);
  const neckline = Math.max(...recent.slice(10, 35).map((x) => x.high));
  const triggered = sorted.length >= 2 && Math.abs(sorted[0].low - sorted.at(-1).low) / sorted[0].low < 0.08 && c.close > neckline;
  return klineSignal("W底突破", "bullish", 86, "medium", "雙底型態完成並突破頸線。", triggered);
}

function detectHeadShoulderBottom(candles) {
  if (candles.length < 60) return klineSignal("頭肩底", "bullish", 0, "medium", "", false);
  const c = candles.at(-1);
  const low60 = Math.min(...candles.slice(-60).map((x) => x.low));
  const neckline = Math.max(...candles.slice(-35, -5).map((x) => x.high));
  const triggered = c.close > neckline && candles.slice(-35, -5).some((x) => x.low <= low60 * 1.03);
  return klineSignal("頭肩底", "bullish", 82, "medium", "底部型態疑似完成，突破頸線。", triggered);
}

function detectStandAbove5MA(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma5 && p?.ma5 && p.close <= p.ma5 && c.close > c.ma5;
  return klineSignal("站上5MA", "bullish", 58, "low", "收盤重新站上5日均線。", triggered);
}

function detectStandAbove20MA(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma20 && p?.ma20 && p.close <= p.ma20 && c.close > c.ma20;
  return klineSignal("站上20MA", "bullish", 64, "medium", "收盤站回20日均線，中期趨勢改善。", triggered);
}

function detectGoldenCross(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma5 && c?.ma20 && p?.ma5 && p?.ma20 && p.ma5 <= p.ma20 && c.ma5 > c.ma20;
  return klineSignal("黃金交叉：MA5上穿MA20", "bullish", 76, "medium", "短均線上穿中期均線，趨勢轉強。", triggered);
}

function detectBottomVolumeLongRed(candles) {
  const c = candles.at(-1);
  const triggered = c && getTrendPosition(candles) === "low" && c.isRed && c.body > c.range * 0.55 && c.volumeRatio20 >= 1.5;
  return klineSignal("底部爆量長紅", "bullish", 86, "medium", "低檔放量長紅，可能為主力進場。", triggered);
}

function detectLowDoji(candles) {
  const c = candles.at(-1);
  const triggered = c && getTrendPosition(candles) === "low" && c.body <= c.range * 0.12;
  return klineSignal("低檔十字星", "bullish", 52, "medium", "低檔十字星代表賣壓暫歇，需後續紅K確認。", triggered);
}

function detectBullishHarami(candles) {
  if (candles.length < 2) return klineSignal("多方母子線", "bullish", 0, "medium", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = p.isBlack && c.isRed && c.high < p.open && c.low > p.close && getTrendPosition(candles.slice(0, -1)) === "low";
  return klineSignal("多方母子線", "bullish", 58, "medium", "低檔母子線，空方動能收斂。", triggered);
}

function detectGapNotFilled(candles) {
  if (candles.length < 2) return klineSignal("缺口不回補", "bullish", 0, "medium", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = c.low > p.high && c.close > c.open;
  return klineSignal("缺口不回補", "bullish", 70, "medium", "向上跳空後未回補，買盤支撐強。", triggered);
}

function detectBreakPreviousHigh(candles) {
  const c = candles.at(-1);
  const triggered = c?.prevHigh && c.close > c.prevHigh;
  return klineSignal("突破前高", "bullish", 78, "medium", "收盤突破前高，趨勢延續。", triggered);
}

function detectDowntrendStop(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c && p && c.trend20 < -6 && c.close > p.high && c.volumeRatio20 >= 1.2;
  return klineSignal("碎冰中斷 / 下跌趨勢中止", "bullish", 68, "medium", "下跌趨勢中出現放量反彈並突破前一日高。", triggered);
}

function detectBullAlignment(candles) {
  const c = candles.at(-1);
  const triggered = c?.ma5 && c?.ma20 && c?.ma60 && c.ma5 > c.ma20 && c.ma20 > c.ma60;
  return klineSignal("多頭排列：MA5 > MA20 > MA60", "bullish", 82, "low", "短中長均線多頭排列，趨勢偏強。", triggered);
}

function detectGapDownBreakdown(candles) {
  if (candles.length < 2) return klineSignal("跳空跌破 Gap Down Breakdown", "bearish", 0, "high", "", false);
  const [p, c] = candles.slice(-2);
  const triggered = c.open < p.low * 0.995 && c.close < (c.prevLow || p.low);
  return klineSignal("跳空跌破 Gap Down Breakdown", "bearish", 82, "high", "跳空跌破前低，賣壓急速擴大。", triggered);
}

function detectLongBlackPlatformBreakdown(candles) {
  const c = candles.at(-1);
  if (!c || candles.length < 25) return klineSignal("長黑跌破平台", "bearish", 0, "high", "", false);
  const prev = candles.slice(-25, -1);
  const platformHigh = Math.max(...prev.map((x) => x.high));
  const platformLow = Math.min(...prev.map((x) => x.low));
  const platformNarrow = (platformHigh - platformLow) / platformLow < 0.16;
  const triggered = platformNarrow && c.isBlack && c.body > c.range * 0.55 && c.close < platformLow;
  return klineSignal("長黑跌破平台", "bearish", 88, "high", "平台整理後長黑跌破，趨勢轉弱。", triggered);
}

function detectMTopBreakdown(candles) {
  if (candles.length < 45) return klineSignal("M頭跌破", "bearish", 0, "high", "", false);
  const recent = candles.slice(-45);
  const c = candles.at(-1);
  const neckline = Math.min(...recent.slice(10, 35).map((x) => x.low));
  const highCount = recent.filter((x) => x.high >= Math.max(...recent.map((y) => y.high)) * 0.94).length;
  const triggered = highCount >= 2 && c.close < neckline;
  return klineSignal("M頭跌破", "bearish", 86, "high", "雙頭型態疑似完成並跌破頸線。", triggered);
}

function detectHeadShoulderTop(candles) {
  if (candles.length < 60) return klineSignal("頭肩頂", "bearish", 0, "high", "", false);
  const c = candles.at(-1);
  const high60 = Math.max(...candles.slice(-60).map((x) => x.high));
  const neckline = Math.min(...candles.slice(-35, -5).map((x) => x.low));
  const triggered = c.close < neckline && candles.slice(-35, -5).some((x) => x.high >= high60 * 0.97);
  return klineSignal("頭肩頂", "bearish", 82, "high", "高檔頭肩頂疑似成立並跌破頸線。", triggered);
}

function detectBreakBelow5MA(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma5 && p?.ma5 && p.close >= p.ma5 && c.close < c.ma5;
  return klineSignal("跌破5MA", "bearish", 58, "medium", "收盤跌破5日均線。", triggered);
}

function detectBreakBelow20MA(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma20 && p?.ma20 && p.close >= p.ma20 && c.close < c.ma20;
  return klineSignal("跌破20MA", "bearish", 66, "high", "收盤跌破20日均線，中期趨勢轉弱。", triggered);
}

function detectDeathCross(candles) {
  const c = candles.at(-1), p = candles.at(-2);
  const triggered = c?.ma5 && c?.ma20 && p?.ma5 && p?.ma20 && p.ma5 >= p.ma20 && c.ma5 < c.ma20;
  return klineSignal("死亡交叉：MA5下穿MA20", "bearish", 76, "high", "短均線跌破中期均線，趨勢轉弱。", triggered);
}

function detectHighVolumeLongBlack(candles) {
  const c = candles.at(-1);
  const triggered = c && getTrendPosition(candles) === "high" && c.isBlack && c.body > c.range * 0.55 && c.volumeRatio20 >= 1.5;
  return klineSignal("高檔爆量長黑", "bearish", 88, "high", "高檔爆量長黑，可能為主力出貨。", triggered);
}

function detectHighLongUpperShadow(candles) {
  const c = candles.at(-1);
  const triggered = c && getTrendPosition(candles) === "high" && c.upperShadow >= c.body * 1.8 && c.upperShadow >= c.range * 0.42;
  return klineSignal("高檔長上影", "bearish", 76, "high", "高檔上影線偏長，上方賣壓重。", triggered);
}

function detectGapFillFail(candles) {
  if (candles.length < 3) return klineSignal("缺口回補失敗", "bearish", 0, "high", "", false);
  const [a, b, c] = candles.slice(-3);
  const gapUp = b.low > a.high;
  const triggered = gapUp && c.close < a.high;
  return klineSignal("缺口回補失敗", "bearish", 72, "high", "向上缺口遭回補且收弱，追價動能失敗。", triggered);
}

function detectFakeBreakout(candles) {
  const c = candles.at(-1);
  if (!c || !c.prevHigh) return klineSignal("假突破", "bearish", 0, "high", "", false);
  const triggered = c.high > c.prevHigh && c.close < c.prevHigh && c.upperShadow > c.body * 1.4;
  return klineSignal("假突破", "bearish", 86, "high", "盤中突破前高但收盤跌回，留意假突破。", triggered);
}

function detectPriceVolumeDivergence(candles) {
  if (candles.length < 6) return klineSignal("量價背離", "bearish", 0, "medium", "", false);
  const recent = candles.slice(-6);
  const priceNewHigh = recent.at(-1).close >= Math.max(...recent.slice(0, -1).map((x) => x.close));
  const volumeLower = recent.at(-1).volume < klineSma(recent.map((x) => x.volume), 5, 4) * 0.75;
  const triggered = priceNewHigh && volumeLower && getTrendPosition(candles) === "high";
  return klineSignal("量價背離", "bearish", 62, "medium", "價格創高但量能未跟上，續航力下降。", triggered);
}

function detectBearAlignment(candles) {
  const c = candles.at(-1);
  const triggered = c?.ma5 && c?.ma20 && c?.ma60 && c.ma5 < c.ma20 && c.ma20 < c.ma60;
  return klineSignal("空頭排列：MA5 < MA20 < MA60", "bearish", 82, "high", "短中長均線空頭排列，趨勢偏弱。", triggered);
}

function buildKlineRadarSignal(stock) {
  const candles = enrichKlineContext(stock?.history || []);
  const latest = candles.at(-1) || {};
  const close = stock?.close || latest.close || 0;

  const bullishDetectors = [
    detectHammer, detectMorningStar, detectBullishEngulfing, detectPiercingLine,
    detectThreeWhiteSoldiers, detectBullishBreakout, detectGapUpBreakout,
    detectLongRedPlatformBreakout, detectWBottomBreakout, detectHeadShoulderBottom,
    detectStandAbove5MA, detectStandAbove20MA, detectGoldenCross,
    detectBottomVolumeLongRed, detectLowDoji, detectBullishHarami, detectGapNotFilled,
    detectBreakPreviousHigh, detectDowntrendStop, detectBullAlignment,
  ];

  const bearishDetectors = [
    detectHangingMan, detectShootingStar, detectEveningStar, detectBearishEngulfing,
    detectDarkCloudCover, detectThreeBlackCrows, detectThreeOutsideDown,
    detectGapDownBreakdown, detectLongBlackPlatformBreakdown, detectMTopBreakdown,
    detectHeadShoulderTop, detectBreakBelow5MA, detectBreakBelow20MA, detectDeathCross,
    detectHighVolumeLongBlack, detectHighLongUpperShadow, detectGapFillFail,
    detectFakeBreakout, detectPriceVolumeDivergence, detectBearAlignment,
  ];

  const bullishSignals = bullishDetectors.map((fn) => fn(candles)).filter((s) => s.triggered);
  const bearishSignals = bearishDetectors.map((fn) => fn(candles)).filter((s) => s.triggered);

  const volumeRatio = latest.volumeRatio20 || Number(stock?.volumeRatio || 0);
  const trendPosition = getTrendPosition(candles);
  const nearHigh = latest.prevHigh ? close >= latest.prevHigh * 0.98 : false;

  let bullishScore = bullishSignals.reduce((sum, s) => sum + s.strength, 0) / Math.max(1, bullishSignals.length);
  let bearishScore = bearishSignals.reduce((sum, s) => sum + s.strength, 0) / Math.max(1, bearishSignals.length);

  if (latest.close > latest.ma5) bullishScore += 8;
  if (latest.close > latest.ma20) bullishScore += 10;
  if (latest.ma5 > latest.ma20) bullishScore += 8;
  if (volumeRatio >= 1.5) bullishScore += 10;
  if (latest.prevHigh && latest.close > latest.prevHigh) bullishScore += 12;
  if (latest.range && (latest.high - latest.close) / latest.range <= 0.18) bullishScore += 8;
  if (latest.ma5 > latest.ma20 && latest.ma20 > latest.ma60) bullishScore += 12;

  if (latest.close < latest.ma5) bearishScore += 8;
  if (latest.close < latest.ma20) bearishScore += 12;
  if (latest.ma5 < latest.ma20) bearishScore += 8;
  if (latest.upperShadow > latest.body * 1.8 && trendPosition === "high") bearishScore += 10;
  if (latest.isBlack && volumeRatio >= 1.5) bearishScore += 12;
  if (latest.prevLow && latest.close < latest.prevLow) bearishScore += 12;
  if (latest.ma5 < latest.ma20 && latest.ma20 < latest.ma60) bearishScore += 12;

  const fakeSignal = bearishSignals.find((s) => s.signalName.includes("假突破"));
  const riskScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(bearishScore * 0.55 + (fakeSignal ? 25 : 0) + (trendPosition === "high" ? 12 : 0) + (volumeRatio >= 2 && latest.isBlack ? 14 : 0))
    )
  );

  bullishScore = Math.round(Math.max(0, Math.min(100, bullishScore)));
  bearishScore = Math.round(Math.max(0, Math.min(100, bearishScore)));

  const marketStructure =
    bullishScore >= 82 && trendPosition !== "high" ? "起漲初期" :
    bullishScore >= 78 && latest.ma5 > latest.ma20 && latest.ma20 > latest.ma60 ? "主升段" :
    trendPosition === "high" && bearishScore >= 55 ? "高檔震盪" :
    bearishScore >= 70 ? "轉弱初期" :
    latest.ma5 < latest.ma20 && latest.ma20 < latest.ma60 ? "空頭趨勢" :
    "盤整";

  const mainUpProbability = Math.max(0, Math.min(100, Math.round(bullishScore * 0.68 + (volumeRatio >= 1.5 ? 10 : 0) + (nearHigh ? 8 : 0) - riskScore * 0.28)));
  const fakeBreakoutRisk = Math.max(0, Math.min(100, Math.round(riskScore + (fakeSignal ? 20 : 0))));

  const signalTags = [
    ...bullishSignals.slice(0, 4).map((s) => s.signalName.replace(/：.*$/, "").split(" ")[0]),
    ...bearishSignals.slice(0, 3).map((s) => s.signalName.replace(/：.*$/, "").split(" ")[0]),
  ];

  const radarScore = Math.max(0, Math.min(100, Math.round(bullishScore - bearishScore * 0.35 + (volumeRatio >= 1.5 ? 8 : 0))));
  const radarLevel =
    radarScore >= 90 ? "S級訊號" :
    radarScore >= 78 ? "A級觀察" :
    radarScore >= 62 ? "B級追蹤" :
    bearishScore > bullishScore ? "風險優先" : "一般";

  return {
    radarScore,
    radarLevel,
    bullishSignals,
    bearishSignals,
    bullishScore,
    bearishScore,
    riskScore,
    marketStructure,
    mainUpProbability,
    fakeBreakoutRisk,
    signalTags: [...new Set(signalTags)],
    radarReasons: [
      ...bullishSignals.slice(0, 2).map((s) => s.description),
      ...bearishSignals.slice(0, 2).map((s) => s.description),
    ].filter(Boolean),
    candleTitle: bullishSignals[0]?.signalName || bearishSignals[0]?.signalName || stock?.candlePattern?.title || "未觸發明確型態",
    volumeTitle: volumeRatio >= 1.5 ? `成交量放大 ${volumeRatio.toFixed(2)}倍` : stock?.volumeSignal?.title || "量能一般",
    trendPosition,
    nearBreakout: nearHigh,
  };
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
    name: getLocalDisplayName(symbol, meta.longName || meta.shortName || symbol),
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
    nextDay,
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

function TradingChart({
  stock,
  showMA5,
  showMA20,
  showMA60,
  showBollinger,
  chartKey = "default",
  drawingLines = [],
  freeDrawings = [],
  drawingEnabled = false,
  drawingTool = "line",
  onCreateDrawing,
}) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const visibleRangeRef = useRef(null);
  const lastChartKeyRef = useRef(null);
  const [draftDrawing, setDraftDrawing] = useState(null);

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

    const getLineColor = (line) => {
      if (line.type === "support") return "#22c55e";
      if (line.type === "stop") return "#f97316";
      if (line.type === "trend") return "#38bdf8";
      if (line.type === "zone") return "#a855f7";
      return "#ef4444";
    };

    const getLineTitle = (line) => {
      if (line.label) return line.label;
      if (line.type === "support") return "支撐";
      if (line.type === "stop") return "停損";
      if (line.type === "trend") return "趨勢線";
      if (line.type === "zone") return "價格區間";
      return "壓力";
    };

    drawingLines.forEach((line) => {
      const kind = line.kind || "horizontal";
      const color = getLineColor(line);

      if (kind === "trend") {
        const startBarsAgo = Number(line.startBarsAgo ?? 20);
        const endBarsAgo = Number(line.endBarsAgo ?? 0);
        const startPrice = Number(line.startPrice);
        const endPrice = Number(line.endPrice);

        const startIndex = Math.max(0, Math.min(candles.length - 1, candles.length - 1 - startBarsAgo));
        const endIndex = Math.max(0, Math.min(candles.length - 1, candles.length - 1 - endBarsAgo));

        if (Number.isFinite(startPrice) && Number.isFinite(endPrice) && candles[startIndex] && candles[endIndex]) {
          const trendSeries = chart.addSeries(LineSeries, {
            color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          });

          trendSeries.setData([
            { time: candles[startIndex].time, value: startPrice },
            { time: candles[endIndex].time, value: endPrice },
          ]);
        }

        return;
      }

      if (kind === "zone") {
        const top = Number(line.top);
        const bottom = Number(line.bottom);
        if (!Number.isFinite(top) || !Number.isFinite(bottom)) return;

        const upper = Math.max(top, bottom);
        const lower = Math.min(top, bottom);

        candleSeries.createPriceLine({
          price: upper,
          color,
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${getLineTitle(line)} 上緣`,
        });

        candleSeries.createPriceLine({
          price: lower,
          color,
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${getLineTitle(line)} 下緣`,
        });

        return;
      }

      const price = Number(line.price);
      if (!Number.isFinite(price)) return;

      candleSeries.createPriceLine({
        price,
        color,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: getLineTitle(line),
      });
    });

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
  }, [stock, showMA5, showMA20, showMA60, showBollinger, chartKey, drawingLines]);

  function getNormalizedPoint(event) {
    const box = overlayRef.current?.getBoundingClientRect();
    if (!box) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
    };
  }

  function handlePointerDown(event) {
    if (!drawingEnabled) return;
    const point = getNormalizedPoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();

    if (drawingTool === "brush") {
      setDraftDrawing({ id: "draft", tool: "brush", points: [point] });
    } else {
      setDraftDrawing({ id: "draft", tool: drawingTool, start: point, end: point });
    }
  }

  function handlePointerMove(event) {
    if (!drawingEnabled || !draftDrawing) return;
    const point = getNormalizedPoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();

    if (draftDrawing.tool === "brush") {
      setDraftDrawing((prev) => ({ ...prev, points: [...(prev?.points || []), point] }));
    } else {
      setDraftDrawing((prev) => ({ ...prev, end: point }));
    }
  }

  function handlePointerUp(event) {
    if (!drawingEnabled || !draftDrawing) return;
    event.preventDefault();
    event.stopPropagation();

    const completed = { ...draftDrawing, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` };
    const isValidBrush = completed.tool === "brush" && completed.points?.length >= 2;
    const isValidShape =
      completed.tool !== "brush" &&
      completed.start &&
      completed.end &&
      (Math.abs(completed.start.x - completed.end.x) > 0.005 ||
        Math.abs(completed.start.y - completed.end.y) > 0.005);

    if (isValidBrush || isValidShape) onCreateDrawing?.(completed);
    setDraftDrawing(null);
  }

  function renderDrawing(item, isDraft = false) {
    const color = item.tool === "rect" ? "#a855f7" : item.tool === "brush" ? "#facc15" : "#38bdf8";
    const strokeWidth = isDraft ? 2.5 : 2;

    if (item.tool === "brush") {
      const points = item.points || [];
      const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x * 100} ${p.y * 100}`).join(" ");
      return (
        <path key={item.id} d={d} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeLinejoin="round" opacity={isDraft ? 0.75 : 0.95}
          vectorEffect="non-scaling-stroke" />
      );
    }

    if (item.tool === "rect") {
      const x = Math.min(item.start.x, item.end.x) * 100;
      const y = Math.min(item.start.y, item.end.y) * 100;
      const width = Math.abs(item.start.x - item.end.x) * 100;
      const height = Math.abs(item.start.y - item.end.y) * 100;
      return (
        <rect key={item.id} x={x} y={y} width={width} height={height}
          fill="rgba(168,85,247,.12)" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={isDraft ? "6 4" : "0"} vectorEffect="non-scaling-stroke" />
      );
    }

    return (
      <line key={item.id} x1={item.start.x * 100} y1={item.start.y * 100}
        x2={item.end.x * 100} y2={item.end.y * 100}
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={isDraft ? "6 4" : "0"} vectorEffect="non-scaling-stroke" />
    );
  }

  return (
    <div className={`chart-drawing-wrap ${drawingEnabled ? "drawing-active" : ""}`}>
      <div ref={containerRef} className="trading-chart" />
      <svg
        ref={overlayRef}
        className="chart-free-draw-overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {freeDrawings.map((item) => renderDrawing(item))}
        {draftDrawing && renderDrawing(draftDrawing, true)}
      </svg>
    </div>
  );
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

useEffect(() => {
  initStockNameMap().then(() => {
    setStock((prev) =>
      prev
        ? {
            ...prev,
            name: getLocalDisplayName(prev.symbol, prev.name),
          }
        : prev
    );

    setWatchList((prev) =>
      prev.map((item) => ({
        ...item,
        name: getLocalDisplayName(item.symbol, item.name),
      }))
    );

    setSystemStrongList((prev) =>
      prev.map((item) => ({
        ...item,
        name: getLocalDisplayName(item.symbol, item.name),
      }))
    );

    setNextDayList((prev) =>
      prev.map((item) => ({
        ...item,
        name: getLocalDisplayName(item.symbol, item.name),
      }))
    );

    setDayTradeList((prev) =>
      prev.map((item) => ({
        ...item,
        name: getLocalDisplayName(item.symbol, item.name),
      }))
    );
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

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
  const [activeMenu, setActiveMenu] = useState("report");
  const menuHistoryRef = useRef([]);
  const lastMenuRef = useRef("report");
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
  const [klineRadarList, setKlineRadarList] = useState([]);
  const [klineRadarLoading, setKlineRadarLoading] = useState(false);
  const [klineRadarSort, setKlineRadarSort] = useState("score");
  const [marketBreadthList, setMarketBreadthList] = useState([]);
  const [marketBreadthUpdatedAt, setMarketBreadthUpdatedAt] = useState(null);
  const [taiwanMarketIndex, setTaiwanMarketIndex] = useState(null);
  const [taiwanMarketUpdatedAt, setTaiwanMarketUpdatedAt] = useState(null);
  const [strongCategory, setStrongCategory] = useState("全部");
  const [favoritePickerStock, setFavoritePickerStock] = useState(null);
  const [favoriteGroupFilter, setFavoriteGroupFilter] = useState("全部");
  const [nextDayList, setNextDayList] = useState([]);
  const [nextDayLoading, setNextDayLoading] = useState(false);
  const [nextDaySortMode, setNextDaySortMode] = useState("score");
  const [reportTab, setReportTab] = useState("market");
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [selectedGroupQuotes, setSelectedGroupQuotes] = useState({});
  const [chartLines, setChartLines] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("stockRadarChartLines") || "{}");
    } catch {
      return {};
    }
  });
  const [linePrice, setLinePrice] = useState("");
  const [lineLabel, setLineLabel] = useState("");
  const [lineType, setLineType] = useState("resistance");
  const [drawingKind, setDrawingKind] = useState("horizontal");
  const [trendStartBarsAgo, setTrendStartBarsAgo] = useState("20");
  const [trendEndBarsAgo, setTrendEndBarsAgo] = useState("0");
  const [trendStartPrice, setTrendStartPrice] = useState("");
  const [trendEndPrice, setTrendEndPrice] = useState("");
  const [zoneTopPrice, setZoneTopPrice] = useState("");
  const [zoneBottomPrice, setZoneBottomPrice] = useState("");
  const [freeDrawings, setFreeDrawings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("stockRadarFreeDrawings") || "{}");
    } catch {
      return {};
    }
  });
  const [freeDrawingEnabled, setFreeDrawingEnabled] = useState(false);
  const [freeDrawingTool, setFreeDrawingTool] = useState("line");

  useEffect(() => {
    localStorage.setItem("stockRadarWatchText", watchText);
  }, [watchText]);

  useEffect(() => {
    localStorage.setItem("stockRadarFavorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("stockRadarSearchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    if (lastMenuRef.current !== activeMenu) {
      menuHistoryRef.current.push(lastMenuRef.current);
      lastMenuRef.current = activeMenu;
    }
  }, [activeMenu]);

  function goBackToPreviousView() {
    const previousMenu = menuHistoryRef.current.pop();

    if (previousMenu) {
      lastMenuRef.current = previousMenu;
      setActiveMenu(previousMenu);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  }

  useEffect(() => {
    localStorage.setItem("stockRadarChartLines", JSON.stringify(chartLines));
  }, [chartLines]);

  useEffect(() => {
    localStorage.setItem("stockRadarFreeDrawings", JSON.stringify(freeDrawings));
  }, [freeDrawings]);

  useEffect(() => {
    setFavoritePickerStock(null);
  }, [stock?.symbol, activeMenu]);


  function getChartLineKey(targetStock = stock) {
    const symbol = targetStock?.symbol || query || "default";
    return `${symbol}-${klineType}`;
  }

  function getDrawingLines(targetStock = stock) {
    return chartLines[getChartLineKey(targetStock)] || [];
  }

  function addChartLine(targetStock = stock) {
    if (!targetStock?.symbol) {
      setError("請先選擇股票後再新增畫線");
      return;
    }

    const key = getChartLineKey(targetStock);
    const baseLabel = lineLabel.trim();

    let newLine = null;

    if (drawingKind === "trend") {
      const startBarsAgo = Number(trendStartBarsAgo);
      const endBarsAgo = Number(trendEndBarsAgo);
      const startPrice = Number(trendStartPrice);
      const endPrice = Number(trendEndPrice);

      if (
        !Number.isFinite(startBarsAgo) ||
        !Number.isFinite(endBarsAgo) ||
        !Number.isFinite(startPrice) ||
        !Number.isFinite(endPrice) ||
        startPrice <= 0 ||
        endPrice <= 0
      ) {
        setError("請輸入有效的趨勢線起點 / 終點資料");
        return;
      }

      newLine = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: "trend",
        type: "trend",
        startBarsAgo,
        endBarsAgo,
        startPrice,
        endPrice,
        label: baseLabel || "趨勢線",
      };
    } else if (drawingKind === "zone") {
      const top = Number(zoneTopPrice);
      const bottom = Number(zoneBottomPrice);

      if (!Number.isFinite(top) || !Number.isFinite(bottom) || top <= 0 || bottom <= 0) {
        setError("請輸入有效的區間上緣 / 下緣價格");
        return;
      }

      newLine = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: "zone",
        type: "zone",
        top,
        bottom,
        label: baseLabel || "價格區間",
      };
    } else {
      const price = Number(linePrice || targetStock?.close);

      if (!Number.isFinite(price) || price <= 0) {
        setError("請輸入有效價格");
        return;
      }

      newLine = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: "horizontal",
        price,
        type: lineType,
        label:
          baseLabel ||
          (lineType === "support"
            ? "支撐"
            : lineType === "stop"
            ? "停損"
            : "壓力"),
      };
    }

    setChartLines((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newLine],
    }));

    setLinePrice("");
    setLineLabel("");
    setTrendStartPrice("");
    setTrendEndPrice("");
    setZoneTopPrice("");
    setZoneBottomPrice("");
  }

  function deleteChartLine(targetStock, lineId) {
    const key = getChartLineKey(targetStock);

    setChartLines((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((line) => line.id !== lineId),
    }));
  }

  function clearChartLines(targetStock = stock) {
    const key = getChartLineKey(targetStock);

    setChartLines((prev) => ({
      ...prev,
      [key]: [],
    }));
  }


  function getFreeDrawings(targetStock = stock) {
    return freeDrawings[getChartLineKey(targetStock)] || [];
  }

  function addFreeDrawing(targetStock = stock, drawing) {
    if (!targetStock?.symbol || !drawing) return;
    const key = getChartLineKey(targetStock);
    setFreeDrawings((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), drawing],
    }));
  }

  function deleteFreeDrawing(targetStock, drawingId) {
    const key = getChartLineKey(targetStock);
    setFreeDrawings((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((item) => item.id !== drawingId),
    }));
  }

  function clearFreeDrawings(targetStock = stock) {
    const key = getChartLineKey(targetStock);
    setFreeDrawings((prev) => ({ ...prev, [key]: [] }));
  }

  function DrawingTools({ targetStock }) {
    const lines = getDrawingLines(targetStock);

    const fillCurrentPrice = () => {
      const value = targetStock?.close?.toFixed?.(2) || "";
      if (drawingKind === "horizontal") setLinePrice(value);
      if (drawingKind === "trend") {
        setTrendEndPrice(value);
        if (!trendStartPrice) setTrendStartPrice(value);
      }
      if (drawingKind === "zone") {
        setZoneTopPrice(value);
        if (!zoneBottomPrice) setZoneBottomPrice(value);
      }
    };

    const describeLine = (line) => {
      const kind = line.kind || "horizontal";

      if (kind === "trend") {
        return `${line.label || "趨勢線"}｜${line.startBarsAgo}根前 ${Number(line.startPrice).toFixed(2)} → ${line.endBarsAgo}根前 ${Number(line.endPrice).toFixed(2)}`;
      }

      if (kind === "zone") {
        return `${line.label || "價格區間"}｜${Number(Math.max(line.top, line.bottom)).toFixed(2)} ~ ${Number(Math.min(line.top, line.bottom)).toFixed(2)}`;
      }

      return `${line.label || "水平線"} ${Number(line.price).toFixed(2)}`;
    };

    return (
      <div className="drawing-panel">
        <div className="drawing-title">
          <b>✏️ K線畫線 v3</b>
          <span>水平線 / 趨勢線 / 區間 / 滑鼠自由畫</span>
        </div>

        <div className="drawing-mode-tabs">
          <button
            className={drawingKind === "horizontal" ? "active" : "ghost"}
            onClick={() => setDrawingKind("horizontal")}
          >
            水平線
          </button>
          <button
            className={drawingKind === "trend" ? "active" : "ghost"}
            onClick={() => setDrawingKind("trend")}
          >
            趨勢線
          </button>
          <button
            className={drawingKind === "zone" ? "active" : "ghost"}
            onClick={() => setDrawingKind("zone")}
          >
            區間
          </button>
        </div>

        {drawingKind === "horizontal" && (
          <div className="drawing-row">
            <select
              value={lineType}
              onChange={(e) => setLineType(e.target.value)}
              style={{ width: 100 }}
            >
              <option value="resistance">壓力</option>
              <option value="support">支撐</option>
              <option value="stop">停損</option>
            </select>

            <input
              value={linePrice}
              onChange={(e) => setLinePrice(e.target.value)}
              placeholder={`價格，例如 ${targetStock?.close?.toFixed?.(2) || ""}`}
              style={{ width: 150 }}
            />

            <input
              value={lineLabel}
              onChange={(e) => setLineLabel(e.target.value)}
              placeholder="標籤，可空白"
              style={{ width: 150 }}
            />

            <button className="ghost" onClick={fillCurrentPrice}>
              帶入現價
            </button>

            <button className="ghost" onClick={() => addChartLine(targetStock)}>
              新增水平線
            </button>
          </div>
        )}

        {drawingKind === "trend" && (
          <div className="drawing-row">
            <input
              value={trendStartBarsAgo}
              onChange={(e) => setTrendStartBarsAgo(e.target.value)}
              placeholder="起點：幾根前"
              style={{ width: 120 }}
            />
            <input
              value={trendStartPrice}
              onChange={(e) => setTrendStartPrice(e.target.value)}
              placeholder="起點價格"
              style={{ width: 120 }}
            />
            <input
              value={trendEndBarsAgo}
              onChange={(e) => setTrendEndBarsAgo(e.target.value)}
              placeholder="終點：幾根前"
              style={{ width: 120 }}
            />
            <input
              value={trendEndPrice}
              onChange={(e) => setTrendEndPrice(e.target.value)}
              placeholder="終點價格"
              style={{ width: 120 }}
            />
            <input
              value={lineLabel}
              onChange={(e) => setLineLabel(e.target.value)}
              placeholder="標籤，可空白"
              style={{ width: 150 }}
            />

            <button className="ghost" onClick={fillCurrentPrice}>
              帶入現價
            </button>

            <button className="ghost" onClick={() => addChartLine(targetStock)}>
              新增趨勢線
            </button>
          </div>
        )}

        {drawingKind === "zone" && (
          <div className="drawing-row">
            <input
              value={zoneTopPrice}
              onChange={(e) => setZoneTopPrice(e.target.value)}
              placeholder="上緣價格"
              style={{ width: 130 }}
            />
            <input
              value={zoneBottomPrice}
              onChange={(e) => setZoneBottomPrice(e.target.value)}
              placeholder="下緣價格"
              style={{ width: 130 }}
            />
            <input
              value={lineLabel}
              onChange={(e) => setLineLabel(e.target.value)}
              placeholder="標籤，例如壓力區"
              style={{ width: 160 }}
            />

            <button className="ghost" onClick={fillCurrentPrice}>
              帶入現價
            </button>

            <button className="ghost" onClick={() => addChartLine(targetStock)}>
              新增區間
            </button>
          </div>
        )}

        <div className="drawing-free-box">
          <div className="drawing-title" style={{ marginBottom: 6 }}>
            <b>🖱️ 滑鼠自由畫</b>
            <span>開啟後可直接在K線圖上拖曳畫線</span>
          </div>

          <div className="drawing-row">
            <button className={freeDrawingEnabled ? "danger" : "ghost"} onClick={() => setFreeDrawingEnabled((v) => !v)}>
              {freeDrawingEnabled ? "停止自由畫" : "啟動自由畫"}
            </button>

            <select value={freeDrawingTool} onChange={(e) => setFreeDrawingTool(e.target.value)} style={{ width: 130 }}>
              <option value="line">直線</option>
              <option value="brush">手繪線</option>
              <option value="rect">矩形區域</option>
            </select>

            <button className="danger" onClick={() => clearFreeDrawings(targetStock)} disabled={!getFreeDrawings(targetStock).length}>
              清空自由畫
            </button>

            <span className="muted">
              自由畫模式開啟時，拖曳圖表會變成畫線；要縮放/移動K線請先停止自由畫。
            </span>
          </div>
        </div>

        <div className="drawing-row" style={{ marginTop: 8 }}>
          <button className="danger" onClick={() => clearChartLines(targetStock)} disabled={!lines.length}>
            清空水平/趨勢/區間
          </button>
          <span className="muted">
            趨勢線用「幾根前」定位：0 = 最新K棒，20 = 往前第20根。
          </span>
        </div>

        {lines.length > 0 && (
          <div className="drawing-list">
            {lines.map((line) => (
              <span className={`drawing-chip ${line.type || line.kind}`} key={line.id}>
                {describeLine(line)}
                <button onClick={() => deleteChartLine(targetStock, line.id)}>×</button>
              </span>
            ))}
          </div>
        )}

        {getFreeDrawings(targetStock).length > 0 && (
          <div className="drawing-list">
            {getFreeDrawings(targetStock).map((item, index) => (
              <span className={`drawing-chip ${item.tool}`} key={item.id}>
                自由畫{index + 1}｜{item.tool === "rect" ? "矩形" : item.tool === "brush" ? "手繪" : "直線"}
                <button onClick={() => deleteFreeDrawing(targetStock, item.id)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

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
      if (!silent && !stock && result[0]) setStock(result[0]);
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

  async function scanKlineRadar() {
    setKlineRadarLoading(true);
    setError("");

    try {
      const universeMap = new Map();

      [...(typeof STOCK_MASTER_ALL !== "undefined" ? STOCK_MASTER_ALL : []), ...MARKET_STRONG_POOL]
        .filter(Boolean)
        .forEach((item) => {
          const symbol = item.stockCode || item.symbol;
          if (!symbol || !/^\d{4}$/.test(String(symbol))) return;
          universeMap.set(symbol, {
            symbol,
            baseType: item.officialIndustry || item.baseType || item.subIndustry || "台股",
            name: item.stockName || item.name,
          });
        });

      const universe = [...universeMap.values()].slice(0, 180);

      const result = (
        await Promise.all(
          universe.map((item) =>
            fetchYahooHistory(item.symbol, "6mo", "1d")
              .then((data) => {
                const analyzed = analyzeStock(data);
                const radar = buildKlineRadarSignal(analyzed);

                return {
                  ...analyzed,
                  baseType: item.baseType,
                  name: item.name || analyzed.name,
                  ...radar,
                };
              })
              .catch((err) => {
                console.warn("kline radar scan failed", item.symbol, err);
                return null;
              })
          )
        )
      )
        .filter(Boolean)
        .filter((item) => {
          const hasVolume = (item.volumeRatio || 0) >= 1.2 || item.volumeTitle?.includes("放大") || item.volumeTitle?.includes("爆量");
          const hasKline = (item.bullishSignals?.length || 0) > 0 || (item.bearishSignals?.length || 0) > 0 || item.nearBreakout;
          return (item.radarScore >= 45 || item.bullishScore >= 55 || item.bearishScore >= 60) && (hasVolume || hasKline);
        })
        .sort((a, b) => b.radarScore - a.radarScore)
        .slice(0, 80);

      setKlineRadarList(result);
    } catch (err) {
      setError(err.message || "K線訊號雷達掃描失敗");
    } finally {
      setKlineRadarLoading(false);
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
    } catch (err) {
      setError(err.message || "系統強勢股掃描失敗");
    } finally {
      setSystemStrongLoading(false);
    }
  }


  async function scanTaiwanMarketIndex(options = {}) {
    const { silent = true } = options;

    try {
      const data = await fetchYahooHistory("^TWII", "5d", "1d");
      const analyzed = analyzeStock({
        ...data,
        symbol: "^TWII",
        name: "台灣加權指數",
      });

      setTaiwanMarketIndex(analyzed);
      setTaiwanMarketUpdatedAt(new Date());
    } catch (err) {
      console.warn("taiwan market index scan failed", err);
      if (!silent) setError(err.message || "台股加權指數抓取失敗");
    }
  }

  async function scanMarketBreadth(options = {}) {
    const { silent = true } = options;

    try {
      const result = (
        await Promise.all(
          MARKET_STRONG_POOL.map((item) =>
            fetchYahooHistory(item.symbol, "5d", "1d")
              .then((data) => {
                const analyzed = analyzeStock(data);
                return {
                  ...analyzed,
                  baseType: item.baseType,
                };
              })
              .catch((err) => {
                console.warn("market breadth scan failed", item.symbol, err);
                return null;
              })
          )
        )
      ).filter((item) => item && item.currency !== "USD");

      setMarketBreadthList(result);
      setMarketBreadthUpdatedAt(new Date());
    } catch (err) {
      if (!silent) setError(err.message || "台股大盤方向資料抓取失敗");
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
      if (!silent && !stock && result[0]) setStock(result[0]);
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
    let cancelled = false;

    async function loadTaiwanMarketIndexInBackground() {
      if (cancelled) return;
      // 每日報告「今日大盤方向」使用台灣加權指數，不用自選清單。
      await scanTaiwanMarketIndex({ silent: true });
    }

    loadTaiwanMarketIndexInBackground();

    const timer = setInterval(() => {
      loadTaiwanMarketIndexInBackground();
    }, 180000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMarketBreadthInBackground() {
      if (cancelled) return;
      // 這裡抓的是台股市場池，不使用自選股，避免每日報告的大盤方向被自選清單影響。
      await scanMarketBreadth({ silent: true });
    }

    loadMarketBreadthInBackground();

    const timer = setInterval(() => {
      loadMarketBreadthInBackground();
    }, 180000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSystemStrongInBackground() {
      if (cancelled || systemStrongList.length) return;
      await scanSystemStrongStocks();
    }

    loadSystemStrongInBackground();

    const timer = setInterval(() => {
      loadSystemStrongInBackground();
    }, 300000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const items = getWatchSymbols(watchText);
    if (!items.length) return;

    let cancelled = false;

    async function loadWatchListInBackground() {
      if (cancelled) return;
      // 背景更新只刷新清單，不切換目前分析看板的股票。
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
      // 背景更新只刷新隔日沖清單，不切換目前分析看板的股票。
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


  const sortedKlineRadarList = useMemo(() => {
    const list = [...klineRadarList];

    if (klineRadarSort === "volume") {
      return list.sort((a, b) => (b.volumeRatio || 0) - (a.volumeRatio || 0));
    }

    if (klineRadarSort === "change") {
      return list.sort((a, b) => (b.changePct || 0) - (a.changePct || 0));
    }

    if (klineRadarSort === "breakout") {
      return list.sort((a, b) => {
        const aBreak = a.nearBreakout ? 1 : 0;
        const bBreak = b.nearBreakout ? 1 : 0;
        return bBreak - aBreak || (b.radarScore || 0) - (a.radarScore || 0);
      });
    }

    return list.sort((a, b) => (b.radarScore || 0) - (a.radarScore || 0));
  }, [klineRadarList, klineRadarSort]);

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
    const breadthSource = marketBreadthList.length ? marketBreadthList : systemStrongList;

    const up = breadthSource.filter((s) => s.changePct > 0).length;
    const down = breadthSource.filter((s) => s.changePct < 0).length;
    const flat = breadthSource.filter((s) => s.changePct === 0).length;
    const breadthAvg = breadthSource.length
      ? breadthSource.reduce((sum, s) => sum + (s.changePct || 0), 0) / breadthSource.length
      : 0;

    const indexChange = taiwanMarketIndex?.changePct;
    const avg = Number.isFinite(indexChange) ? indexChange : breadthAvg;
    const advRatio = breadthSource.length ? (up / breadthSource.length) * 100 : 0;

    return {
      up,
      down,
      flat,
      avg,
      breadthAvg,
      total: breadthSource.length,
      advRatio,
      indexSymbol: taiwanMarketIndex?.symbol || "^TWII",
      indexName: "台灣加權指數",
      indexPrice: taiwanMarketIndex?.close ?? null,
      indexChangePct: Number.isFinite(indexChange) ? indexChange : null,
      sourceName: taiwanMarketIndex ? "台灣加權指數 ^TWII" : "台股市場池暫代",
    };
  }, [marketBreadthList, systemStrongList, taiwanMarketIndex]);

  const stockProfile = useMemo(() => getStockProfile(stock), [stock]);

  const institutionalFlow = useMemo(() => buildInstitutionalFlow(stock), [stock]);
  const institutionalTotalText =
    institutionalFlow.totalNet > 0
      ? `三大法人合計買超 ${institutionalFlow.totalNet.toLocaleString()} 張`
      : institutionalFlow.totalNet < 0
      ? `三大法人合計賣超 ${Math.abs(institutionalFlow.totalNet).toLocaleString()} 張`
      : "三大法人合計持平";

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

  const reportUniverse = useMemo(() => {
    const map = new Map();

    [...systemStrongList, ...watchList, ...nextDayList, ...dayTradeList]
      .filter(Boolean)
      .forEach((item) => {
        if (!item?.symbol) return;
        const old = map.get(item.symbol);
        if (!old || (item.score || 0) > (old.score || 0)) {
          map.set(item.symbol, item);
        }
      });

    return [...map.values()];
  }, [systemStrongList, watchList, nextDayList, dayTradeList]);

  const reportStrongTop50 = useMemo(() => {
    return [...reportUniverse]
      .filter((s) => Number.isFinite(s.changePct))
      .sort((a, b) => {
        const aScore = (a.score || 0) * 0.45 + Math.max(a.changePct || 0, 0) * 8 + (a.volumeRatio || 0) * 8;
        const bScore = (b.score || 0) * 0.45 + Math.max(b.changePct || 0, 0) * 8 + (b.volumeRatio || 0) * 8;
        return bScore - aScore;
      })
      .slice(0, 50);
  }, [reportUniverse]);

  const reportWeakTop50 = useMemo(() => {
    return [...reportUniverse]
      .filter((s) => Number.isFinite(s.changePct))
      .sort((a, b) => {
        const aScore = (a.score || 0) * 0.35 + (a.changePct || 0) * 10 + (a.volumeRatio || 0);
        const bScore = (b.score || 0) * 0.35 + (b.changePct || 0) * 10 + (b.volumeRatio || 0);
        return aScore - bScore;
      })
      .slice(0, 50);
  }, [reportUniverse]);


  const reportIndustryRank = useMemo(() => {
    function buildIndustryRows(list, direction = "strong") {
      const map = new Map();

      list.forEach((s) => {
        const industry =
          s.baseType ||
          s.strongType ||
          (s.currency === "USD" ? "美股 / ETF" : "其他");

        const old = map.get(industry) || {
          industry,
          count: 0,
          avgChange: 0,
          avgScore: 0,
          avgVolumeRatio: 0,
          stocks: [],
        };

        old.count += 1;
        old.avgChange += s.changePct || 0;
        old.avgScore += s.score || 0;
        old.avgVolumeRatio += s.volumeRatio || 0;
        old.stocks.push(s);
        map.set(industry, old);
      });

      return [...map.values()]
        .map((item) => ({
          ...item,
          avgChange: item.count ? item.avgChange / item.count : 0,
          avgScore: item.count ? item.avgScore / item.count : 0,
          avgVolumeRatio: item.count ? item.avgVolumeRatio / item.count : 0,
          topStocks: item.stocks.slice(0, 5),
        }))
        .sort((a, b) => {
          const aRank = a.avgScore * 0.4 + a.avgChange * 10 + a.avgVolumeRatio * 6;
          const bRank = b.avgScore * 0.4 + b.avgChange * 10 + b.avgVolumeRatio * 6;
          return direction === "strong" ? bRank - aRank : aRank - bRank;
        })
        .slice(0, 5);
    }

    return {
      strong: buildIndustryRows(reportStrongTop50, "strong"),
      weak: buildIndustryRows(reportWeakTop50, "weak"),
    };
  }, [reportStrongTop50, reportWeakTop50]);

  const usTechWatchList = useMemo(() => {
    const codes = ["NVDA", "AAPL", "TSLA", "MSFT", "META", "AMD", "AMZN", "GOOGL", "SMCI", "QQQ", "SOXX"];
    return codes
      .map((code) => reportUniverse.find((s) => s.symbol === code))
      .filter(Boolean);
  }, [reportUniverse]);

  const industryReport = useMemo(() => {
    const quoteMap = new Map();

    [...systemStrongList, ...marketBreadthList, ...watchList, ...Object.values(selectedGroupQuotes)]
      .filter(Boolean)
      .forEach((item) => {
        const master = getMasterByCode(item.symbol);
        if (!master || !isCommonTaiwanStock(master)) return;
        quoteMap.set(master.stockCode, {
          ...item,
          symbol: master.stockCode,
          name: master.stockName,
          officialIndustry: master.officialIndustry,
          subIndustry: master.subIndustry,
          themeTags: master.themeTags,
        });
      });

    const industryMap = new Map();

    quoteMap.forEach((quote) => {
      const master = getMasterByCode(quote.symbol);
      if (!master) return;

      const keys = new Set([
        normalizeGroupName(master.officialIndustry),
        getIndustryKeyFromMaster(master),
        ...(master.themeTags || []),
      ]);

      Object.keys(conceptMap).forEach((conceptName) => {
        if (master.themeTags?.includes(conceptName) || conceptMap[conceptName]?.includes(master.stockCode)) {
          keys.add(conceptName);
        }
      });

      keys.forEach((key) => {
        if (!key || key === "ETF") return;

        const old = industryMap.get(key) || {
          name: key,
          count: 0,
          up: 0,
          down: 0,
          avgChange: 0,
          avgScore: 0,
          volume: 0,
          leader: null,
        };

        const change = Number.isFinite(quote.changePct) ? quote.changePct : 0;
        const score = Number.isFinite(quote.score) ? quote.score : 0;
        const volume = Number(quote.volume || quote.history?.at?.(-1)?.volume || 0);

        industryMap.set(key, {
          ...old,
          count: old.count + 1,
          up: old.up + (change > 0 ? 1 : 0),
          down: old.down + (change < 0 ? 1 : 0),
          avgChange: old.avgChange + change,
          avgScore: old.avgScore + score,
          volume: old.volume + volume,
          leader:
            !old.leader || change > (old.leader.changePct || -999)
              ? quote
              : old.leader,
        });
      });
    });

    const result = [...industryMap.values()]
      .map((item) => {
        const members = resolveGroupStocks(item.name);
        const stocks = members.map((master) => mergeRealtimeQuote(master, quoteMap));

        return {
          ...item,
          totalMembers: members.length,
          avgChange: item.count ? item.avgChange / item.count : 0,
          avgScore: item.count ? item.avgScore / item.count : 0,
          stocks: stocks.sort((a, b) => (b.changePct ?? -999) - (a.changePct ?? -999)),
        };
      })
      .filter((item) => item.totalMembers > 0);

    return {
      strong: result
        .filter((item) => item.avgChange >= 0)
        .sort((a, b) => b.avgChange - a.avgChange)
        .slice(0, 8),
      weak: result
        .filter((item) => item.avgChange < 0 || item.down > item.up)
        .sort((a, b) => a.avgChange - b.avgChange)
        .slice(0, 8),
      all: result,
    };
  }, [systemStrongList, marketBreadthList, watchList, selectedGroupQuotes]);

  const selectedIndustryDetail = useMemo(() => {
    if (!selectedIndustry) return null;
    const list = selectedIndustry.side === "weak" ? industryReport.weak : industryReport.strong;
    return list.find((item) => item.name === selectedIndustry.name) || null;
  }, [selectedIndustry, industryReport]);

  const terminalStrongFlow = useMemo(() => {
    const names = industryReport.strong.slice(0, 5).map((item) => item.name);
    return names.length ? names : ["ASIC", "AI伺服器", "散熱", "電源管理", "CPO"];
  }, [industryReport]);

  const terminalTopSectors = useMemo(() => {
    return industryReport.strong.slice(0, 4).map((item) => ({
      ...item,
      heat: Math.min(5, Math.max(1, Math.round((item.avgScore || 50) / 20))),
      volumeBoost: Math.round(Math.max(0, (item.volume || 0) / 1000000)),
    }));
  }, [industryReport]);

  const terminalMood = marketStats.avg > 1 ? "偏多" : marketStats.avg > 0 ? "震盪偏多" : marketStats.avg > -1 ? "震盪偏弱" : "偏空";
  const terminalRisk = marketStats.avg > 1.5 ? "中高" : marketStats.avg < -1 ? "中高" : "中低";
  const terminalAIScore = Math.max(0, Math.min(100, Math.round(50 + marketStats.avg * 12 + marketStats.advRatio * 0.35)));

  useEffect(() => {
    if (!selectedIndustry?.name) return;

    let cancelled = false;

    async function loadSelectedGroupQuotes() {
      const masters = resolveGroupStocks(selectedIndustry.name);
      const missing = masters
        .filter((master) => !selectedGroupQuotes[master.stockCode])
        .slice(0, 40);

      if (missing.length === 0) return;

      const results = await Promise.all(
        missing.map((master) =>
          fetchYahooHistory(master.stockCode, "5d", "1d")
            .then((data) => {
              const analyzed = analyzeStock(data);
              return mergeRealtimeQuote(master, new Map([[master.stockCode, analyzed]]));
            })
            .catch((err) => {
              console.warn("selected group quote failed", selectedIndustry.name, master.stockCode, err);
              return null;
            })
        )
      );

      if (cancelled) return;

      const next = {};
      results.filter(Boolean).forEach((item) => {
        next[item.symbol] = item;
      });

      if (Object.keys(next).length) {
        setSelectedGroupQuotes((prev) => ({ ...prev, ...next }));
      }
    }

    loadSelectedGroupQuotes();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndustry?.name]);

  const reportNextDayCandidates = useMemo(() => {
    return [...sortedNextDayList]
      .filter((s) => !s.nextDay?.fakeBreakout)
      .slice(0, 25);
  }, [sortedNextDayList]);

  const reportDayTradeCandidates = useMemo(() => {
    return [...sortedDayTradeList]
      .filter((s) => (s.dayTrade?.score || 0) >= 35)
      .slice(0, 25);
  }, [sortedDayTradeList]);

  const marketDirectionText =
    marketStats.avg > 1
      ? "多方明顯偏強"
      : marketStats.avg > 0
      ? "震盪偏多"
      : marketStats.avg < -1
      ? "空方明顯偏弱"
      : "震盪偏弱";

  const marketMoodText =
    marketStats.avg > 1
      ? "極度樂觀"
      : marketStats.avg > 0
      ? "偏多"
      : marketStats.avg < -1
      ? "偏空"
      : "保守觀望";

  const aiRiskItems = [
    marketStats.avg < 0 ? "⚠️ 市場平均漲跌幅偏弱，追價前需確認量能與大盤方向。" : "⚠️ 盤勢雖偏多，仍要避免追高長上影與爆量不漲標的。",
    reportStrongTop50.some((s) => (s.changePct || 0) > 5) ? "⚠️ 部分強勢股短線漲幅過大，隔日容易開高震盪。" : "⚠️ 強勢股漲幅尚未全面過熱，但仍需分批進出。",
    "⚠️ 美債 / 匯率 / BTC 屬風險情緒指標，目前未接即時資料，請搭配外部行情確認。",
    "⚠️ AI 分數只適合輔助判斷，不能取代停損與資金控管。",
  ];

  const tomorrowStrategyItems = [
    marketStats.avg >= 0 ? "📌 大盤偏多時，優先觀察強勢股回測支撐後轉強。" : "📌 大盤偏弱時，先降低持股比例，等待量能回溫。",
    "🔥 強勢股 Top25 只挑量比放大、收盤站上短均線、沒有長上影的標的。",
    "🌙 隔日沖優先選擇：高分數、開高機率高、未觸發假突破的股票。",
    "⚡ 當沖觀察股只做高流動性與量能放大的標的，避免冷門股。",
    "🛡️ 若開盤 30 分鐘內指數快速轉弱，暫停追價，改等回測或尾盤確認。",
  ];

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
        .kline-radar-hero { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin: 16px 0; }
        .kline-radar-hero > div { border: 1px solid rgba(148,163,184,.12); background: rgba(2,6,23,.62); border-radius: 18px; padding: 16px; }
        .kline-radar-hero span { display: block; color: #94a3b8; font-size: 12px; margin-bottom: 8px; }
        .kline-radar-hero b { display: block; color: #f8fafc; font-size: 30px; line-height: 1; }
        .kline-radar-hero small { display: block; color: #64748b; font-size: 11px; margin-top: 8px; }
        .radar-score b { display: block; color: #67e8f9; font-size: 20px; }
        .radar-score span { color: #94a3b8; font-size: 12px; }
        .tag-list.compact { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag-list.compact span { border: 1px solid rgba(94,234,212,.18); background: rgba(94,234,212,.08); color: #ccfbf1; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 800; }
        .tag-list.compact.bearish span { border-color: rgba(255,59,92,.18); background: rgba(255,59,92,.08); color: #fecdd3; }
        .tag-list.compact.bullish span { border-color: rgba(94,234,212,.18); background: rgba(94,234,212,.08); color: #ccfbf1; }
        .kline-radar-table tbody tr:hover { background: rgba(34,211,238,.06); cursor: pointer; }
        @media (max-width: 1100px) { .kline-radar-hero { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (max-width: 720px) { .kline-radar-hero { grid-template-columns: 1fr; } }
        .content { padding: 16px; margin-left: 170px; }
        .top-bar { position: relative; display: grid; grid-template-columns: 240px 1fr 360px; align-items: center; gap: 16px; margin-bottom: 14px; min-height: 96px; }
        .top-back-btn { height: 58px; border-radius: 16px; background: linear-gradient(135deg, rgba(15,23,42,.98), rgba(30,41,59,.98)); color: #e2e8f0; border: 1px solid rgba(56,189,248,.28); font-size: 17px; font-weight: 900; box-shadow: 0 10px 24px rgba(0,0,0,.28); }
        .top-back-btn:hover { background: linear-gradient(135deg, rgba(8,47,73,.98), rgba(15,118,110,.98)); border-color: rgba(34,211,238,.55); }
        .top-title { text-align: center; justify-self: center; }
        .top-title h1 { font-size: 32px; letter-spacing: 2px; font-weight: 900; }
        .top-title p { color: #94a3b8; font-size: 13px; margin: 8px 0 0; white-space: nowrap; }
        .top-stats { display: flex; gap: 12px; align-items: center; justify-content: flex-end; }
        .mini-stat { min-width: 90px; background: rgba(15,23,42,.86); border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 10px 12px; text-align: center; }
        .mini-stat span { color: #94a3b8; font-size: 11px; }
        .mini-stat b { display: block; font-size: 20px; margin-top: 5px; }
        @media (max-width: 1280px) {
          .top-bar { grid-template-columns: 1fr; min-height: auto; }
          .top-title { order: -1; }
          .top-title p { white-space: normal; }
          .top-stats { justify-content: center; }
          .top-back-btn { width: 100%; }
        }
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
        .analysis-layout { display: grid; grid-template-columns: 360px minmax(680px, 1fr) 370px; gap: 10px; align-items: start; }
        .center-stack { display: contents; }
        .search-combo-card { grid-column: 1 / span 2; grid-row: 1; min-height: 210px; display: grid; grid-template-columns: 360px 1fr; gap: 22px; align-items: stretch; }
        .search-form-zone { border-right: 1px solid rgba(148,163,184,.16); padding-right: 18px; }
        .search-current-zone { display: grid; grid-template-columns: minmax(220px,.8fr) minmax(360px,1.2fr); gap: 18px; align-items: center; }
        .search-current-zone .quick-selected-card { margin-top: 0; border-top: 0; padding-top: 0; }
        .profile-mini-card { background: rgba(2,6,23,.62); border: 1px solid rgba(56,189,248,.18); border-radius: 16px; padding: 16px; min-height: 152px; display: grid; gap: 10px; align-content: center; }
        .profile-mini-row { display: grid; grid-template-columns: 120px 1fr; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(148,163,184,.12); }
        .profile-mini-row:last-child { border-bottom: 0; }
        @media (max-width: 1280px) {
          .search-combo-card { grid-column: 1 / -1; grid-template-columns: 1fr; }
          .search-form-zone { border-right: 0; padding-right: 0; border-bottom: 1px solid rgba(148,163,184,.16); padding-bottom: 12px; }
          .search-current-zone { grid-template-columns: 1fr; }
        }
        .combined-market-card { grid-column: 2; grid-row: 1; min-height: 210px; display: block; }
        .chart-area-card { grid-column: 1 / span 2; grid-row: 2; }
        .selected-panel { text-align: center; }
        .selected-name { font-size: 31px; font-weight: 900; letter-spacing: .04em; color: #f8fafc; margin: 4px 0 6px; line-height: 1.12; }
        .selected-symbol { font-size: 16px; font-weight: 700; margin: 2px 0 10px; color: #bfdbfe; }
        .stock-name-stack { display: flex; flex-direction: column; gap: 2px; line-height: 1.15; }
        .stock-name-main { font-size: 25px; font-weight: 900; color: #f8fafc; letter-spacing: .03em; }
        .stock-name-code { font-size: 13px; color: #93c5fd; font-weight: 700; }
        .stock-name-main.small { font-size: 22px; }
        .selected-panel .price { text-align: center; margin-top: 8px; font-size: 24px; line-height: 1.15; }
        .selected-panel .price small { font-size: 13px; margin-top: 4px; }
        .selected-panel .price .price-label { font-size: 14px; margin-right: 8px; color: #e5e7eb; font-weight: 700; }
        .market-panel { border-left: 1px solid rgba(148,163,184,.22); padding-left: 20px; }
        .quick-selected-card { margin-top: 14px; border-top: 1px solid rgba(148,163,184,.16); padding-top: 14px; text-align: center; }
        .profile-card-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .profile-hero { background: rgba(2,6,23,.72); border: 1px solid rgba(56,189,248,.18); border-radius: 16px; padding: 16px; }
        .profile-hero h3 { font-size: 22px; margin-bottom: 8px; color: #f8fafc; }
        .profile-row { display: grid; grid-template-columns: 120px 1fr; gap: 10px; padding: 10px 0; border-top: 1px solid rgba(148,163,184,.12); }
        .profile-row:first-child { border-top: 0; }
        .profile-label { color: #94a3b8; font-size: 13px; }
        .profile-value { color: #e5e7eb; font-weight: 800; }
        .institution-summary { background: rgba(2,6,23,.75); border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 12px; margin-bottom: 10px; }
        .institution-summary b { display: block; font-size: 18px; margin-bottom: 4px; }
        .institution-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
        .institution-box { background: #020617; border: 1px solid rgba(148,163,184,.16); border-radius: 12px; padding: 10px; }
        .institution-box span { display:block; color:#94a3b8; font-size:12px; margin-bottom:4px; }
        .institution-box b { font-size:16px; }

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
        .chart-profile-inline { background: rgba(2,6,23,.56); border: 1px solid rgba(56,189,248,.18); border-radius: 14px; padding: 12px 16px; display: grid; gap: 10px; }
        .chart-profile-inline b { display: block; color: #f8fafc; font-size: 16px; margin-top: 4px; line-height: 1.45; }
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
        .terminal-home-clean { margin-bottom: 16px; }
        .market-core { min-height: 300px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(360px, .85fr); gap: 18px; border: 1px solid rgba(148,163,184,.10); border-radius: 24px; background: linear-gradient(135deg, rgba(15,23,42,.78), rgba(2,6,23,.82)); padding: 28px; }
        .market-core-left { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
        .market-core-label { color: #94a3b8; font-size: 13px; font-weight: 800; letter-spacing: .08em; }
        .market-core-title { margin-top: 10px; font-size: clamp(48px, 6vw, 86px); line-height: .95; font-weight: 950; letter-spacing: -.05em; }
        .market-core.refined { min-height: 330px; align-items: center; }
        .market-core-heading { color: #cbd5e1; font-size: clamp(26px, 3vw, 44px); font-weight: 950; letter-spacing: -.03em; }
        .market-core-title-large { margin-top: 14px; font-size: clamp(54px, 7vw, 104px); line-height: .92; font-weight: 950; letter-spacing: -.06em; }
        .market-core-title-large.up { color: #ff3b5c; }
        .market-core-title-large.down { color: #00c896; }
        .market-core-substats { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 20px; color: #cbd5e1; font-size: 15px; }
        .market-core-substats span { position: relative; }
        .market-core-substats span:not(:last-child)::after { content: ""; position: absolute; right: -10px; top: 50%; width: 1px; height: 14px; transform: translateY(-50%); background: rgba(148,163,184,.18); }
        .market-primary-card { margin-bottom: 14px; }
        .market-primary-head { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 16px; }
        .market-primary-head h2 { margin: 0 0 6px; }
        .market-stats-grid.primary { margin-top: 0; }
        .market-stats-grid.primary div:first-child b { font-size: 30px; color: #f8fafc; }
        .market-core.flow-only { min-height: 210px; grid-template-columns: .48fr 1fr; padding: 24px 28px; }
        .market-core.flow-only .market-core-left { justify-content: center; }
        .main-themes.featured { margin-top: 16px; }
        .main-themes.featured button { padding: 10px 16px; border-radius: 16px; font-size: 15px; }
        .flow-title.enlarged { color: #e2e8f0; font-size: 26px; font-weight: 950; letter-spacing: -.03em; margin-bottom: 18px; }
        .flow-path.upgraded { gap: 12px; }
        .flow-path.upgraded .flow-segment { gap: 12px; }
        .flow-path.upgraded button { border-radius: 18px; padding: 11px 17px; background: linear-gradient(180deg, rgba(15,23,42,.92), rgba(2,6,23,.88)); border-color: rgba(148,163,184,.18); color: #f8fafc; box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
        .flow-path.upgraded button:hover { border-color: rgba(94,234,212,.5); color: #ccfbf1; transform: translateY(-1px); box-shadow: 0 14px 32px rgba(0,0,0,.22), 0 0 22px rgba(94,234,212,.10); }
        .flow-path.upgraded i { color: #64748b; font-size: 18px; }
        .market-core-title.up { color: #ff3b5c; }
        .market-core-title.down { color: #00c896; }
        .market-core-meta { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 22px; color: #cbd5e1; font-size: 14px; }
        .market-core-meta span { position: relative; }
        .market-core-meta span:not(:last-child)::after { content: ""; position: absolute; right: -10px; top: 50%; width: 1px; height: 14px; transform: translateY(-50%); background: rgba(148,163,184,.22); }
        .main-themes { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 26px; }
        .theme-label { color: #64748b; font-size: 12px; font-weight: 800; margin-right: 4px; }
        .main-themes button, .flow-path button { border: 1px solid rgba(148,163,184,.14); background: rgba(15,23,42,.78); color: #e2e8f0; border-radius: 999px; padding: 7px 11px; font-size: 13px; font-weight: 800; transition: all .18s ease; }
        .main-themes button:hover, .flow-path button:hover { border-color: rgba(94,234,212,.45); color: #ccfbf1; box-shadow: 0 0 18px rgba(94,234,212,.10); }
        .market-core-flow { align-self: center; border-left: 1px solid rgba(148,163,184,.12); padding-left: 24px; }
        .flow-title { color: #94a3b8; font-size: 13px; font-weight: 800; margin-bottom: 14px; }
        .flow-path { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .flow-segment { display: inline-flex; gap: 10px; align-items: center; }
        .flow-segment i { color: #64748b; font-style: normal; }
        .sector-strip { margin-top: 14px; border: 1px solid rgba(148,163,184,.10); border-radius: 22px; background: rgba(15,23,42,.62); padding: 18px; }
        .strip-head { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 14px; }
        .strip-head h3 { margin: 0; font-size: 18px; }
        .strip-head span { color: #64748b; font-size: 12px; }
        .sector-strip-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
        .sector-tile { text-align: left; border: 1px solid rgba(148,163,184,.10); border-radius: 18px; background: rgba(2,6,23,.54); padding: 14px; transition: all .18s ease; }
        .sector-tile:hover { transform: translateY(-2px); border-color: rgba(94,234,212,.32); box-shadow: 0 16px 36px rgba(0,0,0,.22), 0 0 22px rgba(94,234,212,.08); }
        .sector-tile-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .sector-tile-top b { color: #f8fafc; font-size: 16px; }
        .sector-tile-top strong { color: #ff3b5c; font-size: 17px; }
        .sector-tile-row { display: flex; justify-content: space-between; gap: 10px; color: #94a3b8; font-size: 12px; margin-top: 7px; }
        .sector-tile-row em { color: #cbd5e1; font-style: normal; font-weight: 800; }
        .sector-tile-bar { height: 3px; border-radius: 999px; background: rgba(148,163,184,.12); margin-top: 13px; overflow: hidden; }
        .sector-tile-bar i { display: block; height: 100%; border-radius: 999px; background: #5eead4; }
        @media (max-width: 1400px) {
          .market-core { grid-template-columns: 1fr; }
          .market-core-flow { border-left: 0; border-top: 1px solid rgba(148,163,184,.12); padding-left: 0; padding-top: 18px; }
          .sector-strip-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
        @media (max-width: 760px) {
          .market-core { padding: 20px; }
          .market-core-meta { gap: 10px; }
          .market-core-meta span::after { display: none; }
          .sector-strip-grid { grid-template-columns: 1fr; }
        }
        .report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .report-card, .macro-card { background: #020617; border: 1px solid rgba(148,163,184,.18); border-radius: 16px; padding: 14px; }
        .report-card h2, .macro-card h3 { margin-bottom: 12px; }
        .market-direction-badge { display: inline-flex; padding: 8px 12px; border-radius: 999px; font-weight: 900; margin-bottom: 12px; border: 1px solid rgba(148,163,184,.22); }
        .market-direction-badge.up { background: rgba(239,68,68,.14); color: #fca5a5; border-color: rgba(239,68,68,.35); }
        .market-direction-badge.down { background: rgba(34,197,94,.14); color: #86efac; border-color: rgba(34,197,94,.35); }
        .market-stats-grid, .macro-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .market-stats-grid div, .industry-item, .risk-item, .strategy-item { background: rgba(15,23,42,.85); border: 1px solid rgba(148,163,184,.16); border-radius: 14px; padding: 12px; }
        .market-stats-grid span, .macro-card p { display: block; color: #94a3b8; font-size: 12px; margin-bottom: 6px; }
        .market-stats-grid b, .macro-card b { font-size: 20px; }
        .ai-summary-box { margin-top: 12px; padding: 14px; border-radius: 16px; background: rgba(56,189,248,.08); border: 1px solid rgba(56,189,248,.22); color: #dbeafe; }
        .industry-list, .risk-list, .strategy-box { display: grid; gap: 10px; }
        .industry-item { display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all .18s ease; text-align:left; }
        .industry-item:hover { transform: translateY(-1px); border-color: rgba(56,189,248,.45); background: rgba(30,41,59,.92); }
        .industry-item.active { border-color: rgba(34,211,238,.62); background: rgba(8,47,73,.55); }
        .industry-detail-card { grid-column: 1 / -1; margin-top: 12px; }
        .industry-item > div { min-width: 0; }
        .industry-item.up span { color: #fca5a5; }
        .industry-item.down span { color: #86efac; }
        .report-empty { color: #94a3b8; padding: 16px; border: 1px dashed rgba(148,163,184,.25); border-radius: 14px; }
        .drawing-panel { background: rgba(2,6,23,.72); border: 1px solid rgba(148,163,184,.18); border-radius: 14px; padding: 10px; margin: 10px 0; }
        .drawing-title { display: flex; justify-content: space-between; align-items: center; gap: 10px; color: #e5e7eb; margin-bottom: 8px; }
        .drawing-title span { color: #94a3b8; font-size: 12px; }
        .drawing-mode-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .drawing-mode-tabs button { background: #111827; color: #e5e7eb; border: 1px solid #334155; }
        .drawing-mode-tabs button.active { background: #22d3ee; color: #06202a; border-color: #22d3ee; }
        .drawing-free-box { background: rgba(15,23,42,.75); border: 1px solid rgba(56,189,248,.18); border-radius: 12px; padding: 9px; margin-top: 8px; }
        .chart-drawing-wrap { position: relative; width: 100%; }
        .chart-free-draw-overlay { position: absolute; inset: 0; width: 100%; height: 560px; pointer-events: none; z-index: 10; }
        .chart-drawing-wrap.drawing-active .chart-free-draw-overlay { pointer-events: auto; cursor: crosshair; touch-action: none; }
        .chart-drawing-wrap.drawing-active .trading-chart { user-select: none; }
        .drawing-chip.line { border-color: rgba(56,189,248,.5); color: #67e8f9; }
        .drawing-chip.brush { border-color: rgba(250,204,21,.55); color: #fde68a; }
        .drawing-chip.rect { border-color: rgba(168,85,247,.5); color: #d8b4fe; }
        .drawing-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .drawing-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .drawing-chip { display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(148,163,184,.22); border-radius: 999px; padding: 5px 6px 5px 10px; font-size: 12px; color: #e5e7eb; background: #020617; }
        .drawing-chip.support { border-color: rgba(34,197,94,.45); color: #86efac; }
        .drawing-chip.resistance { border-color: rgba(239,68,68,.45); color: #fca5a5; }
        .drawing-chip.stop { border-color: rgba(249,115,22,.5); color: #fdba74; }
        .drawing-chip.trend { border-color: rgba(56,189,248,.5); color: #67e8f9; }
        .drawing-chip.zone { border-color: rgba(168,85,247,.5); color: #d8b4fe; }
        .drawing-chip button { padding: 1px 6px; border-radius: 999px; background: rgba(148,163,184,.18); color: #e5e7eb; font-size: 12px; }



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
          <button className={`nav-btn ${activeMenu === "report" ? "active" : ""}`} onClick={() => setActiveMenu("report")}>🏠 首頁 / 每日報告</button>
          <button className={`nav-btn ${activeMenu === "analysis" ? "active" : ""}`} onClick={() => setActiveMenu("analysis")}>📊 分析看板</button>
          <button className={`nav-btn ${activeMenu === "watchlist" ? "active" : ""}`} onClick={() => setActiveMenu("watchlist")}>⭐ 自選股票</button>
          <button className={`nav-btn ${activeMenu === "signals" ? "active" : ""}`} onClick={() => setActiveMenu("signals")}>🚨 強勢掃描</button>
          <button className={`nav-btn ${activeMenu === "klineRadar" ? "active" : ""}`} onClick={() => setActiveMenu("klineRadar")}>📡 K線訊號雷達</button>
          <button className={`nav-btn ${activeMenu === "nextday" ? "active" : ""}`} onClick={() => setActiveMenu("nextday")}>🌙 隔日沖選股</button>
          <button className={`nav-btn ${activeMenu === "daytrade" ? "active" : ""}`} onClick={() => setActiveMenu("daytrade")}>⚡ 當沖模式</button>
          <button className="nav-btn" onClick={() => navigate("/")}>← 返回首頁</button>
        </aside>

        <section className="content">
          <header className="top-bar">
            <button className="top-back-btn" onClick={goBackToPreviousView}>
              ← 返回上一個畫面
            </button>

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
              <div className="card search-combo-card">
                <div className="search-form-zone">
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
                      disabled={!stock?.symbol}
                      onClick={() =>
                        stock?.symbol &&
                        setFavoritePickerStock((prev) =>
                          prev?.symbol === stock.symbol ? null : stock
                        )
                      }
                    >
                      {stock && favorites.some((item) => item.symbol === stock.symbol) ? "已收藏" : "加入收藏"}
                    </button>

                    {favoritePickerStock && stock?.symbol && favoritePickerStock.symbol === stock.symbol && (
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

                <div className="search-current-zone">
<div className="quick-selected-card">
                  <div className="muted">目前選股</div>
                  <div className="selected-name">
                    {getLocalDisplayName(stock?.symbol, stock?.name) || "尚未載入資料"}
                  </div>
                  <div className="selected-symbol">{stock?.symbol || query}</div>
                  <div className={stock?.changePct >= 0 ? "price up" : "price down"}>
                    <span className="price-label">現價</span>
                    {stock?.close?.toFixed?.(2) ?? "--"}
                    <small>{stock?.changePct?.toFixed?.(2) ?? "--"}%</small>
                  </div>
                </div>
              
                  <div className="profile-mini-card">
                    <div className="profile-mini-row">
                      <span className="profile-label">所屬產業</span>
                      <span className="profile-value">{stockProfile.industry}</span>
                    </div>
                    <div className="profile-mini-row">
                      <span className="profile-label">主要產品 / 業務</span>
                      <span className="profile-value">{stockProfile.business}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="center-stack">
                <div className="card chart-area-card">
                  <div className="stock-head">
                    <div className="stock-title">
                      <h1>
                        {stock
                          ? `${getLocalDisplayName(stock.symbol, stock.name)} ${stock.symbol}`
                          : "請搜尋股票"}
                      </h1>
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
                    <>
                    <DrawingTools targetStock={stock} />
                    <TradingChart
                      stock={stock}
                      showMA5={showMA5}
                      showMA20={showMA20}
                      showMA60={showMA60}
                      showBollinger={showBollinger}
                      chartKey={klineType}
                      drawingLines={getDrawingLines(stock)}
                      freeDrawings={getFreeDrawings(stock)}
                      drawingEnabled={freeDrawingEnabled}
                      drawingTool={freeDrawingTool}
                      onCreateDrawing={(drawing) => addFreeDrawing(stock, drawing)}
                    />
                    </>
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

                {rightView === "institution" && stock && (
                  <>
                    <div className={`institution-summary ${institutionalFlow.totalNet >= 0 ? "up" : "down"}`}>
                      <b>{institutionalTotalText}</b>
                      <p className="muted">籌碼判斷：{institutionalFlow.tone}</p>
                    </div>

                    {institutionalFlow.rows.map((row) => (
                      <div className="signal-card" key={row.name}>
                        <b>{row.name}</b>
                        <div className="institution-row">
                          <div className="institution-box">
                            <span>買進</span>
                            <b>{row.buy.toLocaleString()} 張</b>
                          </div>
                          <div className="institution-box">
                            <span>賣出</span>
                            <b>{row.sell.toLocaleString()} 張</b>
                          </div>
                          <div className="institution-box">
                            <span>買賣超</span>
                            <b className={row.net >= 0 ? "up" : "down"}>
                              {row.net >= 0 ? "+" : ""}
                              {row.net.toLocaleString()} 張
                            </b>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="signal-card">
                      <b>法人解讀規則</b>
                      <p>外資連買 + 投信同步買超：偏多。三大法人同步買超：籌碼偏強。股價上漲但法人賣超：追價需保守。</p>
                      <p className="muted" style={{ marginTop: 8 }}>{institutionalFlow.source}</p>
                    </div>
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
                        <td>
                            <div className="stock-name-stack">
                              <span className="stock-name-main">{getLocalDisplayName(s.symbol, s.name)}</span>
                              <span className="stock-name-code">{s.symbol}</span>
                            </div>
                          </td>
                        <td><span className="badge">{s.currency === "USD" ? "美股" : "台股"}</span></td>
                        <td>{s.currency} {s.close?.toFixed?.(2)}</td>
                        <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct.toFixed(2)}%</td>
                        <td>{s.score}</td>
                        <td>{s.winRatePredict}%</td>
                        <td>{s.volumeRatio?.toFixed(2) ?? "--"}</td>
                        <td><span className="badge">{s.tradeSignal.action}</span></td>
                        <td>
                          <span style={{ position: "relative", display: "inline-block" }}>
                            <button className="ghost small" onClick={(e) => {
                              e.stopPropagation();
                              setFavoritePickerStock((prev) => prev?.symbol === s.symbol ? null : s);
                            }}>收藏</button>
                            {favoritePickerStock && favoritePickerStock.symbol === s.symbol && (
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
                          <td>
                            <div className="stock-name-stack">
                              <span className="stock-name-main">{getLocalDisplayName(s.symbol, s.name)}</span>
                              <span className="stock-name-code">{s.symbol}</span>
                            </div>
                          </td>
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


          

          {activeMenu === "klineRadar" && (
            <div className="card kline-radar-page">
              <div className="section-title">
                <div>
                  <h2>📡 K線訊號雷達</h2>
                  <p className="muted">掃描今日符合 K線型態 + 成交量放大的台股，優先找突破K、長下影支撐、爆量上漲與接近20日高點的標的。</p>
                </div>

                <div className="btn-row" style={{ marginTop: 0 }}>
                  <button onClick={scanKlineRadar} disabled={klineRadarLoading}>
                    {klineRadarLoading ? "雷達掃描中..." : "掃描今日K線訊號"}
                  </button>

                  <select
                    value={klineRadarSort}
                    onChange={(e) => setKlineRadarSort(e.target.value)}
                    style={{ width: 170 }}
                  >
                    <option value="score">依訊號強度</option>
                    <option value="volume">依成交量</option>
                    <option value="change">依漲跌幅</option>
                    <option value="breakout">依突破型態</option>
                  </select>
                </div>
              </div>

              <div className="kline-radar-hero">
                <div>
                  <span>今日符合訊號</span>
                  <b>{sortedKlineRadarList.length}</b>
                  <small>K線 + 量能條件</small>
                </div>
                <div>
                  <span>爆量上漲</span>
                  <b>{sortedKlineRadarList.filter((s) => s.volumeTitle?.includes("爆量上漲")).length}</b>
                  <small>量價同步</small>
                </div>
                <div>
                  <span>突破 / 接近高點</span>
                  <b>{sortedKlineRadarList.filter((s) => s.nearBreakout || s.candleTitle?.includes("突破K")).length}</b>
                  <small>動能觀察</small>
                </div>
                <div>
                  <span>S / A級</span>
                  <b>{sortedKlineRadarList.filter((s) => (s.radarScore || 0) >= 78).length}</b>
                  <small>優先名單</small>
                </div>
              </div>

              {sortedKlineRadarList.length === 0 ? (
                <p className="empty">
                  {klineRadarLoading ? "正在掃描台股K線與成交量訊號..." : "按「掃描今日K線訊號」後，會列出符合K線型態與量能條件的股票。"}
                </p>
              ) : (
                <div className="table-wrap kline-radar-table">
                  <table>
                    <thead>
                      <tr>
                        <th>排名</th>
                        <th>股票</th>
                        <th>訊號強度</th>
                        <th>盤面結構</th>
                        <th>看漲訊號</th>
                        <th>看跌/風險</th>
                        <th>主升段機率</th>
                        <th>假突破風險</th>
                        <th>漲跌</th>
                        <th>量能</th>
                        <th>觀察理由</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedKlineRadarList.map((s, i) => (
                        <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}>
                          <td>{i + 1}</td>
                          <td>
                            <div className="stock-name-stack">
                              <span className="stock-name-main">{getLocalDisplayName(s.symbol, s.name)}</span>
                              <span className="stock-name-code">{s.symbol}｜{s.baseType || "台股"}</span>
                            </div>
                          </td>
                          <td>
                            <div className="radar-score">
                              <b>{s.radarScore}</b>
                              <span>{s.radarLevel}</span>
                            </div>
                          </td>
                          <td><span className="badge">{s.marketStructure}</span></td>
                          <td>
                            <div className="tag-list compact bullish">
                              {(s.bullishSignals || []).slice(0, 3).map((sig) => (
                                <span key={sig.signalName}>{sig.signalName}</span>
                              ))}
                              {!(s.bullishSignals || []).length && <span>--</span>}
                            </div>
                          </td>
                          <td>
                            <div className="tag-list compact bearish">
                              {(s.bearishSignals || []).slice(0, 2).map((sig) => (
                                <span key={sig.signalName}>{sig.signalName}</span>
                              ))}
                              {!(s.bearishSignals || []).length && <span>--</span>}
                            </div>
                          </td>
                          <td>{s.mainUpProbability ?? "--"}%</td>
                          <td className={(s.fakeBreakoutRisk || 0) >= 60 ? "down" : ""}>{s.fakeBreakoutRisk ?? "--"}%</td>
                          <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                          <td>{s.volumeTitle || "--"}</td>
                          <td>{(s.radarReasons || []).slice(0, 2).join("、")}</td>
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
                          <td>
                            <div className="stock-name-stack">
                              <span className="stock-name-main small">{getLocalDisplayName(s.symbol, s.name)}</span>
                              <span className="stock-name-code">{s.symbol}</span>
                            </div>
                          </td>
                          <td>{s.symbol}</td>
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
                          <h1>
                            {getLocalDisplayName(intradayStock.symbol, intradayStock.name)} {intradayStock.symbol}
                          </h1>
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
                      <DrawingTools targetStock={intradayStock} />
                      <TradingChart
                        stock={intradayStock}
                        showMA5={showMA5}
                        showMA20={showMA20}
                        showMA60={showMA60}
                        showBollinger={showBollinger}
                        chartKey={klineType}
                        drawingLines={getDrawingLines(intradayStock)}
                        freeDrawings={getFreeDrawings(intradayStock)}
                        drawingEnabled={freeDrawingEnabled}
                        drawingTool={freeDrawingTool}
                        onCreateDrawing={(drawing) => addFreeDrawing(intradayStock, drawing)}
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
                            <td>
                            <div className="stock-name-stack">
                              <span className="stock-name-main">{getLocalDisplayName(s.symbol, s.name)}</span>
                              <span className="stock-name-code">{s.symbol}</span>
                            </div>
                          </td>
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
                <h2>🧾 每日市場報告 Pro</h2>
                <span className="muted">更新 {new Date().toLocaleString("zh-TW")}</span>
              </div>


              <div className="report-tabs">
                <button className={reportTab === "market" ? "active" : ""} onClick={() => setReportTab("market")}>📊 今日大盤方向</button>
                <button className={reportTab === "industry" ? "active" : ""} onClick={() => setReportTab("industry")}>🏭 台股強弱產業</button>
                <button className={reportTab === "us" ? "active" : ""} onClick={() => setReportTab("us")}>🇺🇸 美股科技股</button>
                <button className={reportTab === "macro" ? "active" : ""} onClick={() => setReportTab("macro")}>💱 匯率 / 美債 / BTC</button>
                <button className={reportTab === "strength" ? "active" : ""} onClick={() => setReportTab("strength")}>🔥 強弱勢Top50</button>
                <button className={reportTab === "nextday" ? "active" : ""} onClick={() => setReportTab("nextday")}>🌙 隔日沖候選</button>
                <button className={reportTab === "daytrade" ? "active" : ""} onClick={() => setReportTab("daytrade")}>⚡ 當沖觀察</button>
                <button className={reportTab === "risk" ? "active" : ""} onClick={() => setReportTab("risk")}>⚠️ AI風險提醒</button>
                <button className={reportTab === "strategy" ? "active" : ""} onClick={() => setReportTab("strategy")}>📌 明日策略</button>
              </div>

              {reportTab === "market" && (
                <>
                  <div className="report-card market-primary-card">
                    <div className="market-primary-head">
                      <div>
                        <h2>📊 今日大盤方向</h2>
                        <p className="muted">
                          資料來源：{marketStats.sourceName}
                          {taiwanMarketUpdatedAt ? `｜更新 ${taiwanMarketUpdatedAt.toLocaleString("zh-TW")}` : "｜資料更新中"}
                        </p>
                      </div>

                      <div className={`market-direction-badge ${marketStats.avg >= 0 ? "up" : "down"}`}>
                        {marketDirectionText}
                      </div>
                    </div>

                    <div className="market-stats-grid primary">
                      <div>
                        <span>台股加權指數</span>
                        <b>{marketStats.indexPrice ? marketStats.indexPrice.toFixed(2) : "--"}</b>
                      </div>
                      <div>
                        <span>指數漲跌幅</span>
                        <b className={marketStats.avg >= 0 ? "up" : "down"}>{marketStats.avg.toFixed(2)}%</b>
                      </div>
                      <div>
                        <span>AI熱度</span>
                        <b>{terminalAIScore}</b>
                      </div>
                      <div>
                        <span>市場寬度</span>
                        <b>{marketStats.total ? `${marketStats.up}漲 / ${marketStats.down}跌` : "更新中"}</b>
                      </div>
                    </div>

                    <div className="ai-summary-box">
                      AI 判斷目前台股大盤：
                      {marketStats.avg > 1
                        ? "加權指數明顯偏多，強勢股可續抱，但避免追高過熱標的。"
                        : marketStats.avg > 0
                        ? "加權指數震盪偏多，適合觀察量能放大的主流股。"
                        : "加權指數偏弱，建議降低追價，等待轉強訊號。"}
                    </div>
                  </div>

                  <div className="terminal-home-clean">
                    <section className="market-core refined flow-only">
                      <div className="market-core-left">
                        <div className="market-core-heading">主流族群</div>

                        <div className="main-themes featured">
                          {terminalStrongFlow.slice(0, 3).map((item) => (
                            <button
                              key={item}
                              onClick={() => {
                                setReportTab("industry");
                                setSelectedIndustry({ side: "strong", name: item });
                              }}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="market-core-flow">
                        <div className="flow-title enlarged">資金流方向</div>

                        <div className="flow-path upgraded">
                          {terminalStrongFlow.slice(0, 5).map((item, index) => (
                            <span className="flow-segment" key={item}>
                              <button
                                onClick={() => {
                                  setReportTab("industry");
                                  setSelectedIndustry({ side: "strong", name: item });
                                }}
                              >
                                {item}
                              </button>

                              {index < terminalStrongFlow.slice(0, 5).length - 1 && <i>→</i>}
                            </span>
                          ))}
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              )}

              {reportTab === "industry" && (
                <div className="report-grid">
                  <div className="report-card">
                    <div className="section-title">
                      <h2>🏭 台股強勢產業</h2>
                      <span className="muted">點選產業可查看相關股票</span>
                    </div>
                    <div className="industry-list">
                      {industryReport.strong.length ? industryReport.strong.map((item) => (
                        <button
                          type="button"
                          className={`industry-item up ${selectedIndustry?.side === "strong" && selectedIndustry?.name === item.name ? "active" : ""}`}
                          key={item.name}
                          onClick={() => setSelectedIndustry({ side: "strong", name: item.name })}
                        >
                          <b>{item.name}</b>
                          <span>▲ {item.avgChange.toFixed(2)}%｜領漲 {item.leader?.name || "--"}｜{item.up}漲/{item.down}跌</span>
                        </button>
                      )) : <p className="report-empty">強勢產業資料更新中。</p>}
                    </div>
                  </div>

                  <div className="report-card">
                    <div className="section-title">
                      <h2>📉 台股弱勢產業</h2>
                      <span className="muted">點選產業可查看相關股票</span>
                    </div>
                    <div className="industry-list">
                      {industryReport.weak.length ? industryReport.weak.map((item) => (
                        <button
                          type="button"
                          className={`industry-item down ${selectedIndustry?.side === "weak" && selectedIndustry?.name === item.name ? "active" : ""}`}
                          key={item.name}
                          onClick={() => setSelectedIndustry({ side: "weak", name: item.name })}
                        >
                          <b>{item.name}</b>
                          <span>▼ {item.avgChange.toFixed(2)}%｜領跌 {item.leader?.name || "--"}｜{item.up}漲/{item.down}跌</span>
                        </button>
                      )) : <p className="report-empty">弱勢產業資料更新中。</p>}
                    </div>
                  </div>

                  {selectedIndustryDetail && (
                    <div className="report-card industry-detail-card">
                      <div className="section-title">
                        <h2>
                          {selectedIndustry?.side === "weak" ? "📉" : "🔥"} {selectedIndustryDetail.name} 相關股票
                        </h2>
                        <span className="muted">
                          sourceB 成分股 {selectedIndustryDetail.totalMembers} 檔｜sourceC 已更新 {selectedIndustryDetail.stocks.filter((s) => Number.isFinite(s.changePct)).length} 檔｜{selectedIndustryDetail.up}漲/{selectedIndustryDetail.down}跌｜平均漲跌 {selectedIndustryDetail.avgChange.toFixed(2)}%
                        </span>
                      </div>

                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>股票</th>
                              <th>漲跌</th>
                              <th>成交量</th>
                              <th>官方產業</th>
                              <th>主題概念</th>
                              <th>強弱</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedIndustryDetail.stocks.map((s) => (
                              <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}>
                                <td>
                                  <div className="stock-name-stack">
                                    <span className="stock-name-main small">{getLocalDisplayName(s.symbol, s.name)}</span>
                                    <span className="stock-name-code">{s.symbol}</span>
                                  </div>
                                </td>
                                <td className={s.changePct >= 0 ? "up" : s.changePct < 0 ? "down" : ""}>{s.changePct?.toFixed?.(2) ?? "--"}{Number.isFinite(s.changePct) ? "%" : ""}</td>
                                <td>{Number(s.volume || s.history?.at?.(-1)?.volume || 0).toLocaleString()}</td>
                                <td><span className="badge">{s.officialIndustry || "--"}</span></td>
                                <td>{(s.themeTags || []).join("、") || "--"}</td>
                                <td><span className="badge">{s.changePct > 0 ? "強" : s.changePct < 0 ? "弱" : "待更新"}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {reportTab === "us" && (
                <div className="report-card">
                  <h2>🇺🇸 美股科技股觀察</h2>
                  {usTechWatchList.length === 0 ? (
                    <p className="report-empty">尚未有美股科技股資料。可將 NVDA、AAPL、TSLA、MSFT、META、AMD 加入自選後自動更新。</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>股票</th><th>AI分數</th><th>趨勢</th><th>觀察</th><th>量比</th></tr></thead>
                        <tbody>
                          {usTechWatchList.map((s) => (
                            <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}>
                              <td>
                                <div className="stock-name-stack">
                                  <span className="stock-name-main small">{getLocalDisplayName(s.symbol, s.name)}</span>
                                  <span className="stock-name-code">{s.symbol}</span>
                                </div>
                              </td>
                              <td>{s.score ?? "--"}</td>
                              <td className={s.changePct >= 0 ? "up" : "down"}>{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                              <td><span className="badge">{s.tradeSignal?.action || "觀望"}</span></td>
                              <td>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {reportTab === "macro" && (
                <div className="macro-grid">
                  <div className="macro-card">
                    <h3>💵 匯率 / 美元</h3>
                    <b>觀察外資方向</b>
                    <p>美元偏強時，外資對台股通常較保守；美元轉弱時，風險資產較容易回溫。</p>
                  </div>
                  <div className="macro-card">
                    <h3>📉 美國10年債</h3>
                    <b>觀察科技股壓力</b>
                    <p>殖利率走高時，科技成長股估值壓力提高；殖利率回落時有利科技股反彈。</p>
                  </div>
                  <div className="macro-card">
                    <h3>₿ BTC</h3>
                    <b>風險偏好指標</b>
                    <p>BTC 走強通常代表市場風險偏好提升；劇烈下跌時需留意科技股同步震盪。</p>
                  </div>
                  <div className="macro-card">
                    <h3>🧭 AI 總結</h3>
                    <b>{marketMoodText}</b>
                    <p>宏觀資料目前以文字規則提醒為主，後續可再接匯率、美債與 BTC 即時 API。</p>
                  </div>
                </div>
              )}

              {reportTab === "strength" && (
                <div className="report-card">
                  <div className="section-title">
                    <h2>🔥 今日強 / 弱勢股票 Top50</h2>
                    <span className="muted">依 AI 分數、漲跌幅、量比綜合排序，並自動彙整產業前五名</span>
                  </div>

                  <div className="report-grid" style={{ marginBottom: 12 }}>
                    <div className="report-card">
                      <h2>🏆 強勢產業前五名</h2>
                      <div className="industry-list">
                        {reportIndustryRank.strong.length ? reportIndustryRank.strong.map((item, index) => (
                          <div className="industry-item up" key={item.industry}>
                            <div>
                              <b>{index + 1}. {item.industry}</b>
                              <div className="muted">
                                平均漲幅 {item.avgChange.toFixed(2)}%｜平均AI {Math.round(item.avgScore)}｜平均量比 {item.avgVolumeRatio.toFixed(2)}
                              </div>
                              <div className="muted">
                                代表股：{item.topStocks.map((s) => `${getLocalDisplayName(s.symbol, s.name)}(${s.symbol})`).join("、")}
                              </div>
                            </div>
                            <span>▲ 強勢</span>
                          </div>
                        )) : <p className="report-empty">強勢產業資料更新中。</p>}
                      </div>
                    </div>

                    <div className="report-card">
                      <h2>📉 弱勢產業前五名</h2>
                      <div className="industry-list">
                        {reportIndustryRank.weak.length ? reportIndustryRank.weak.map((item, index) => (
                          <div className="industry-item down" key={item.industry}>
                            <div>
                              <b>{index + 1}. {item.industry}</b>
                              <div className="muted">
                                平均漲幅 {item.avgChange.toFixed(2)}%｜平均AI {Math.round(item.avgScore)}｜平均量比 {item.avgVolumeRatio.toFixed(2)}
                              </div>
                              <div className="muted">
                                代表股：{item.topStocks.map((s) => `${getLocalDisplayName(s.symbol, s.name)}(${s.symbol})`).join("、")}
                              </div>
                            </div>
                            <span>▼ 弱勢</span>
                          </div>
                        )) : <p className="report-empty">弱勢產業資料更新中。</p>}
                      </div>
                    </div>
                  </div>

                  <div className="report-grid">
                    <div className="report-card">
                      <h2>🔥 今日強勢股 Top50</h2>
                      {reportStrongTop50.length === 0 ? (
                        <p className="report-empty">強勢股資料更新中。</p>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead><tr><th>排名</th><th>股票</th><th>產業</th><th>AI</th><th>漲幅</th><th>量比</th><th>訊號</th></tr></thead>
                            <tbody>
                              {reportStrongTop50.map((s, index) => (
                                <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}>
                                  <td>{index + 1}</td>
                                  <td>
                                    <div className="stock-name-stack">
                                      <span className="stock-name-main small">{getLocalDisplayName(s.symbol, s.name)}</span>
                                      <span className="stock-name-code">{s.symbol}</span>
                                    </div>
                                  </td>
                                  <td><span className="badge">{s.baseType || s.strongType || (s.currency === "USD" ? "美股 / ETF" : "其他")}</span></td>
                                  <td>{s.score ?? "--"}</td>
                                  <td className="up">{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                                  <td>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                                  <td><span className="badge">{s.tradeSignal?.action || "觀望"}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="report-card">
                      <h2>📉 今日弱勢股 Top50</h2>
                      {reportWeakTop50.length === 0 ? (
                        <p className="report-empty">弱勢股資料更新中。</p>
                      ) : (
                        <div className="table-wrap">
                          <table>
                            <thead><tr><th>排名</th><th>股票</th><th>產業</th><th>AI</th><th>跌幅</th><th>量比</th><th>訊號</th></tr></thead>
                            <tbody>
                              {reportWeakTop50.map((s, index) => (
                                <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}>
                                  <td>{index + 1}</td>
                                  <td>
                                    <div className="stock-name-stack">
                                      <span className="stock-name-main small">{getLocalDisplayName(s.symbol, s.name)}</span>
                                      <span className="stock-name-code">{s.symbol}</span>
                                    </div>
                                  </td>
                                  <td><span className="badge">{s.baseType || s.strongType || (s.currency === "USD" ? "美股 / ETF" : "其他")}</span></td>
                                  <td>{s.score ?? "--"}</td>
                                  <td className="down">{s.changePct?.toFixed?.(2) ?? "--"}%</td>
                                  <td>{s.volumeRatio?.toFixed?.(2) ?? "--"}</td>
                                  <td><span className="badge">{s.tradeSignal?.action || "觀望"}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {reportTab === "nextday" && (
                <div className="report-card">
                  <h2>🌙 隔日沖候選股</h2>
                  {reportNextDayCandidates.length === 0 ? (
                    <p className="report-empty">隔日沖候選資料更新中。</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>股票</th><th>分數</th><th>開高率</th><th>訊號</th><th>假突破</th></tr></thead>
                        <tbody>
                          {reportNextDayCandidates.map((s) => (
                            <tr key={s.symbol} onClick={() => { setStock(s); setActiveMenu("analysis"); }}>
                              <td>
                                <div className="stock-name-stack">
                                  <span className="stock-name-main small">{getLocalDisplayName(s.symbol, s.name)}</span>
                                  <span className="stock-name-code">{s.symbol}</span>
                                </div>
                              </td>
                              <td>{s.nextDay?.nextDayScore ?? "--"}</td>
                              <td>{s.nextDay?.gapUpProbability ?? "--"}%</td>
                              <td><span className="badge">{s.nextDay?.nextDaySignal || "觀望"}</span></td>
                              <td className={s.nextDay?.fakeBreakout ? "down" : "up"}>{s.nextDay?.fakeBreakout ? "有風險" : "通過"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {reportTab === "daytrade" && (
                <div className="report-card">
                  <h2>⚡ 當沖觀察股</h2>
                  {reportDayTradeCandidates.length === 0 ? (
                    <p className="report-empty">當沖觀察資料更新中。可先執行當沖排行榜或等待背景更新。</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>股票</th><th>即時分數</th><th>訊號</th><th>進場價</th><th>停損 / 停利</th></tr></thead>
                        <tbody>
                          {reportDayTradeCandidates.map((s) => (
                            <tr key={s.symbol} onClick={() => { setIntradayStock(s); setStock(s); setActiveMenu("daytrade"); }}>
                              <td>
                                <div className="stock-name-stack">
                                  <span className="stock-name-main small">{getLocalDisplayName(s.symbol, s.name)}</span>
                                  <span className="stock-name-code">{s.symbol}</span>
                                </div>
                              </td>
                              <td>{s.dayTrade?.score ?? "--"}</td>
                              <td><span className="badge">{s.dayTrade?.signal || "觀察"}</span></td>
                              <td>{s.dayTrade?.entry?.toFixed?.(2) ?? "--"}</td>
                              <td>{s.dayTrade?.stopLoss?.toFixed?.(2) ?? "--"} / {s.dayTrade?.takeProfit?.toFixed?.(2) ?? "--"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {reportTab === "risk" && (
                <div className="report-card">
                  <h2>⚠️ AI 風險提醒</h2>
                  <div className="risk-list">
                    {aiRiskItems.map((item, index) => (
                      <div className="risk-item" key={index}>{item}</div>
                    ))}
                  </div>
                </div>
              )}

              {reportTab === "strategy" && (
                <div className="report-card">
                  <h2>📌 明日操作策略</h2>
                  <div className="strategy-box">
                    {tomorrowStrategyItems.map((item, index) => (
                      <div className="strategy-item" key={index}>{item}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}