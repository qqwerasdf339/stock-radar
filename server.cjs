const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;

let cache = null;
let lastFetch = 0;

app.use(cors());

// 🔥 Yahoo API（核心）
app.get("/api/yahoo/chart/:symbol", async (req, res) => {
  try {
    const raw = String(req.params.symbol).trim().toUpperCase();

    const fetchYahoo = async (symbol) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

      const response = await axios.get(url, {
        params: {
          range: req.query.range || "6mo",
          interval: req.query.interval || "1d",
        },
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });

      const result = response.data?.chart?.result?.[0];
      if (!result) throw new Error(`No data for ${symbol}`);

      return response.data;
    };

    // 已經完整輸入：2330.TW / 00981A.TW / 5483.TWO / AAPL
    if (raw.includes(".")) {
      return res.json(await fetchYahoo(raw));
    }

    // 全市場自動嘗試順序
    const candidates = [
      `${raw}.TW`,    // 台股上市、ETF
      `${raw}.TWO`,   // 台股上櫃
      raw,            // 美股、美股ETF、指數代碼
    ];

    let lastError = null;

    for (const symbol of candidates) {
      try {
        const data = await fetchYahoo(symbol);
        return res.json(data);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error(`No data for ${raw}`);
  } catch (error) {
    console.error("Yahoo error:", error.message);
    res.status(500).json({ error: "Yahoo API failed" });
  }
});

app.get("/api/twse/list", async (req, res) => {
  try {
    const now = Date.now();

    if (cache && now - lastFetch < 3600000) {
      return res.json(cache);
    }

    const map = {};

    // 來源1：TWSE 上市股票（含ETF）—— 用公司基本資料，全天都有效
    try {
      const r1 = await axios.get("https://openapi.twse.com.tw/v1/opendata/t187ap03_L", { timeout: 8000 });
      (r1.data || []).forEach((item) => {
        const code = item["公司代號"] || item.Code || "";
        const name = item["公司簡稱"] || item.Name || "";
        if (code && name) map[code] = name;
      });
    } catch (e) { console.warn("TWSE listed failed:", e.message); }

    // 來源2：TPEx 上櫃股票
    try {
      const r2 = await axios.get("https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O", { timeout: 8000 });
      (r2.data || []).forEach((item) => {
        const code = item["公司代號"] || item.SecuritiesCompanyCode || "";
        const name = item["公司簡稱"] || item.CompanyName || "";
        if (code && name) map[code] = name;
      });
    } catch (e) { console.warn("TPEx OTC failed:", e.message); }

    // 來源3：TWSE 每日交易（盤後補充，可能為空但沒關係）
    try {
      const r3 = await axios.get("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", { timeout: 8000 });
      (r3.data || []).forEach((item) => {
        if (item.Code && item.Name && !map[item.Code]) map[item.Code] = item.Name;
      });
    } catch (e) { console.warn("TWSE day all failed:", e.message); }

    if (Object.keys(map).length > 0) {
      cache = map;
      lastFetch = now;
    }

    res.json(cache || map);
  } catch (err) {
    console.error("TWSE error:", err.message);
    res.json({});
  }
});

// 📛 Yahoo Quote：取得股票名稱（台股回傳中文名）
// 用法：/api/yahoo/name/6698 或 /api/yahoo/name/6698.TW
const nameCache = {};
app.get("/api/yahoo/name/:symbol", async (req, res) => {
  try {
    const raw = String(req.params.symbol).trim().toUpperCase().replace(/\.(TW|TWO)$/i, "");

    // 先查後端 nameCache
    if (nameCache[raw]) return res.json({ symbol: raw, name: nameCache[raw] });

    // 同時試上市(.TW)和上櫃(.TWO)
    const candidates = [`${raw}.TW`, `${raw}.TWO`, raw];
    let name = "";

    for (const sym of candidates) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=1d&interval=1d`;
        const r = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 6000 });
        const meta = r.data?.chart?.result?.[0]?.meta || {};
        const candidate = meta.shortName || meta.longName || "";
        // 優先取有中文的名稱
        if (/[\u4e00-\u9fff]/.test(candidate)) {
          name = candidate.replace(/股份有限公司/g, "").replace(/有限公司/g, "").trim();
          break;
        } else if (candidate && !name) {
          name = candidate; // 暫存英文名，繼續找看有沒有中文的
        }
      } catch {}
    }

    if (name) nameCache[raw] = name;
    res.json({ symbol: raw, name: name || raw });
  } catch (err) {
    console.error("Yahoo name error:", err.message);
    res.json({ symbol: req.params.symbol, name: req.params.symbol });
  }
});

// ✅ 測試用（建議保留）
app.get("/", (req, res) => {
  res.send("Yahoo Stock API is running 🚀");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});