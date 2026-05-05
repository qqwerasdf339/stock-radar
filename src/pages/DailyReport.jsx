import { useEffect, useState } from "react";
import axios from "axios";

export default function DailyReport() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    const res = await axios.get("/api/daily-report");
    setData(res.data);
  }

  if (!data) return <div style={{ padding: 20 }}>載入中...</div>;

  // 🔥 AI 模擬摘要
  const summary = `
市場今日呈現震盪格局，台股表現偏強，美股分歧。
比特幣維持強勢，資金仍偏風險資產。
建議關注成交量放大個股與突破型態。
`;

  return (
    <div style={{ padding: 20, color: "#e5e7eb" }}>
      <h2>🧾 每日市場報告</h2>

      {/* 市場概況 */}
      <div style={{ marginBottom: 20 }}>
        <h3>📊 市場概況</h3>
        <p>台股：{data.market.tw}</p>
        <p>美股：{data.market.us}</p>
        <p>匯率：{data.market.fx}</p>
        <p>BTC：{data.market.btc}</p>
      </div>

      {/* 新聞 */}
      <div style={{ marginBottom: 20 }}>
        <h3>📰 重要財經新聞</h3>
        {data.news.map((n, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <a href={n.url} target="_blank">
              {n.title}
            </a>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {n.source}
            </div>
          </div>
        ))}
      </div>

      {/* AI摘要 */}
      <div style={{ marginBottom: 20 }}>
        <h3>🤖 AI 摘要</h3>
        <p>{summary}</p>
      </div>

      {/* 觀察股 */}
      <div>
        <h3>🔥 今日觀察股票</h3>
        <p>2330 / NVDA / TSLA / BTC</p>
      </div>
    </div>
  );
}