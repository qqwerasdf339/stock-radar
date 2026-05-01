const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 3001;

app.use(cors());

app.get("/api/twse/all", async (req, res) => {
  try {
    const url = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "TWSE ALL 失敗" });
  }
});

app.get("/api/twse/history/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { date } = req.query;

    const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${symbol}`;
    const response = await axios.get(url);

    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "TWSE HISTORY 失敗" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running: http://localhost:${PORT}`);
});