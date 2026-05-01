import { useParams, useNavigate } from "react-router-dom";

export default function Stock() {
  const { symbol } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ padding: 40 }}>
      <button onClick={() => navigate(-1)}>← 返回</button>

      <h2>股票：{symbol}</h2>

      <p>👉 這裡之後放你的 K線 + AI 分析</p>
    </div>
  );
}