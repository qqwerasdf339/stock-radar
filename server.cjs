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

    const url = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";

    const response = await axios.get(url, {
      timeout: 8000,
    });

    const map = {};

    response.data.forEach((item) => {
      if (item.Code && item.Name) {
        map[item.Code] = item.Name;
      }
    });

    cache = map;
    lastFetch = now;

    res.json(map);
  } catch (err) {
    console.error("TWSE error:", err.message);

    // ❗ 重點：不要回 500
    res.json({});
  }
});

// ✅ 測試用（建議保留）
app.get("/", (req, res) => {
  res.send("Yahoo Stock API is running 🚀");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});