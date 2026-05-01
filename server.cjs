const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;

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

    // 已經有 .TW / .TWO 就直接查
    if (raw.endsWith(".TW") || raw.endsWith(".TWO")) {
      return res.json(await fetchYahoo(raw));
    }

    // 台股：4位數字，先上市 .TW，再上櫃 .TWO
    if (/^\d{4}$/.test(raw)) {
      try {
        return res.json(await fetchYahoo(`${raw}.TW`));
      } catch {
        return res.json(await fetchYahoo(`${raw}.TWO`));
      }
    }

    // 美股 / 美股ETF：AAPL、TSLA、NVDA、SPY、QQQ 直接查
    return res.json(await fetchYahoo(raw));
  } catch (error) {
    console.error("Yahoo error:", error.message);
    res.status(500).json({ error: "Yahoo API failed" });
  }
});

// ✅ 測試用（建議保留）
app.get("/", (req, res) => {
  res.send("Yahoo Stock API is running 🚀");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});