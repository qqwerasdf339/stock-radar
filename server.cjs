const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// 🔥 Yahoo API（核心）
app.get("/api/yahoo/chart/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.endsWith(".TW")
      ? req.params.symbol
      : `${req.params.symbol}.TW`;

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

    res.json(response.data);
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