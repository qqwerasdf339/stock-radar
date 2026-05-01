import { useNavigate } from "react-router-dom";

export default function Favorites() {
  const navigate = useNavigate();

  const favorites =
    JSON.parse(localStorage.getItem("stockRadarFavorites")) || [];

  return (
    <div style={{ padding: 40 }}>
      <button onClick={() => navigate(-1)}>← 返回</button>

      <h2>⭐ 收藏股票</h2>

      {favorites.length === 0 ? (
        <p>目前沒有收藏</p>
      ) : (
        favorites.map((item) => (
          <div key={item.symbol}>
            {item.symbol} {item.name}
            <button onClick={() => navigate(`/stock/${item.symbol}`)}>
              查看
            </button>
          </div>
        ))
      )}
    </div>
  );
}