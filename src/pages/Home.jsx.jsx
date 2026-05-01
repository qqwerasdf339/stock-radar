import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  return (
    <div style={{ padding: 40 }}>
      <h1>📊 股票雷達</h1>

      <input
        placeholder="輸入股票代碼（2330 / AAPL）"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <br /><br />

      <button onClick={() => navigate(`/stock/${input}`)}>
        搜尋
      </button>

      <br /><br />

      <button onClick={() => navigate("/favorites")}>
        ⭐ 收藏
      </button>
    </div>
  );
}