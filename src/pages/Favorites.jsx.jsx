import { useNavigate } from "react-router-dom";

export default function Favorites() {
  const navigate = useNavigate();

  const favorites = JSON.parse(
    localStorage.getItem("stockRadarFavorites") || "[]"
  );

  function remove(symbol) {
    const next = favorites.filter((item) => item.symbol !== symbol);
    localStorage.setItem("stockRadarFavorites", JSON.stringify(next));
    window.location.reload();
  }

  return (
    <div style={{ padding: 40 }}>
      <button onClick={() => navigate("/")}>← 返回首頁</button>

      <h1>⭐ 收藏股票</h1>

      {favorites.length === 0 ? (
        <p>目前沒有收藏</p>
      ) : (
        favorites.map((item) => (
          <div key={item.symbol} style={{ marginBottom: 12 }}>
            <b>{item.symbol}</b> {item.name}

            <button onClick={() => navigate(`/stock/${item.symbol}`)}>
              查看
            </button>

            <button onClick={() => remove(item.symbol)}>
              刪除
            </button>
          </div>
        ))
      )}
    </div>
  );
}