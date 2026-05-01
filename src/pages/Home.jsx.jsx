import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  function search() {
    if (!input.trim()) return;
    navigate(`/stock/${input.trim()}`);
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>🤖 AI 股票雷達</h1>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && search()}
        placeholder="輸入 2330 / AAPL / SPY"
      />

      <br /><br />

      <button onClick={search}>搜尋股票</button>

      <br /><br />

      <button onClick={() => navigate("/favorites")}>
        ⭐ 我的收藏
      </button>
    </div>
  );
}