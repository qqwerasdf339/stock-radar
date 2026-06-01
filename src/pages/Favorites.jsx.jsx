import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Favorites() {
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState(() =>
    JSON.parse(localStorage.getItem("stockRadarFavorites") || "[]")
  );
  const [removing, setRemoving] = useState(null);

  function remove(symbol) {
    setRemoving(symbol);
    setTimeout(() => {
      const next = favorites.filter((item) => item.symbol !== symbol);
      localStorage.setItem("stockRadarFavorites", JSON.stringify(next));
      setFavorites(next);
      setRemoving(null);
    }, 280);
  }

  const tw = favorites.filter((f) => /^\d{4,6}(\.TW|\.TWO)?$/i.test(f.symbol));
  const us = favorites.filter((f) => !/^\d{4,6}(\.TW|\.TWO)?$/i.test(f.symbol));

  return (
    <>
      <style>{`
        .fav-root {
          min-height: 100svh;
          background: #060e1a;
          padding: 0 0 60px;
          box-sizing: border-box;
        }

        /* ── 頂部列 ── */
        .fav-topbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 24px 0;
        }
        .fav-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(14,165,233,.10);
          border: 1px solid rgba(14,165,233,.22);
          color: #38bdf8;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background .15s;
        }
        .fav-back-btn:hover { background: rgba(14,165,233,.20); }

        .fav-title-wrap { flex: 1; }
        .fav-title {
          font-size: 22px;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -.02em;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .fav-count {
          font-size: 13px;
          color: #6b8fa8;
          font-weight: 400;
          margin-top: 2px;
        }

        /* ── 主內容 ── */
        .fav-content {
          padding: 20px 24px 0;
          max-width: 860px;
          margin: 0 auto;
        }

        /* ── 分組標題 ── */
        .fav-group-label {
          font-size: 11px;
          font-weight: 700;
          color: #6b8fa8;
          letter-spacing: .08em;
          text-transform: uppercase;
          margin: 20px 0 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fav-group-label::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(14,165,233,.10);
        }

        /* ── 股票卡片 ── */
        .fav-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
          gap: 10px;
        }

        .fav-card {
          background: #0b1929;
          border: 1px solid rgba(14,165,233,.14);
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color .15s, transform .15s, opacity .28s;
          cursor: pointer;
        }
        .fav-card:hover {
          border-color: rgba(14,165,233,.38);
          transform: translateY(-1px);
        }
        .fav-card.removing {
          opacity: 0;
          transform: scale(.95);
        }

        .fav-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .fav-card-symbol {
          font-size: 20px;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -.02em;
          line-height: 1;
        }
        .fav-card-name {
          font-size: 12px;
          color: #6b8fa8;
          margin-top: 4px;
          line-height: 1.4;
          word-break: break-all;
        }

        .fav-star {
          color: #fbbf24;
          font-size: 16px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* ── 操作按鈕 ── */
        .fav-card-actions {
          display: flex;
          gap: 7px;
          margin-top: 2px;
        }
        .fav-btn-view {
          flex: 1;
          padding: 7px 0;
          background: rgba(14,165,233,.12);
          border: 1px solid rgba(14,165,233,.25);
          border-radius: 8px;
          color: #38bdf8;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background .12s;
        }
        .fav-btn-view:hover { background: rgba(14,165,233,.25); }

        .fav-btn-del {
          padding: 7px 12px;
          background: rgba(251,113,133,.08);
          border: 1px solid rgba(251,113,133,.18);
          border-radius: 8px;
          color: #fb7185;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background .12s;
        }
        .fav-btn-del:hover { background: rgba(251,113,133,.20); }

        /* ── 空狀態 ── */
        .fav-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          gap: 14px;
          text-align: center;
        }
        .fav-empty-icon {
          font-size: 52px;
          opacity: .4;
          line-height: 1;
        }
        .fav-empty-title {
          font-size: 18px;
          font-weight: 700;
          color: #b4cfe0;
          margin: 0;
        }
        .fav-empty-desc {
          font-size: 13px;
          color: #4b6880;
          max-width: 300px;
          line-height: 1.6;
          margin: 0;
        }
        .fav-empty-cta {
          margin-top: 6px;
          padding: 10px 24px;
          background: rgba(14,165,233,.12);
          border: 1px solid rgba(14,165,233,.25);
          border-radius: 10px;
          color: #38bdf8;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background .12s;
        }
        .fav-empty-cta:hover { background: rgba(14,165,233,.22); }

        @media (max-width: 600px) {
          .fav-topbar { padding: 14px 14px 0; }
          .fav-content { padding: 16px 14px 0; }
          .fav-title { font-size: 18px; }
        }
      `}</style>

      <div className="fav-root">
        {/* 頂部列 */}
        <div className="fav-topbar">
          <button className="fav-back-btn" onClick={() => navigate("/")}>
            ← 返回
          </button>
          <div className="fav-title-wrap">
            <h1 className="fav-title">⭐ 收藏股票</h1>
            {favorites.length > 0 && (
              <div className="fav-count">共 {favorites.length} 檔</div>
            )}
          </div>
        </div>

        {/* 主內容 */}
        <div className="fav-content">
          {favorites.length === 0 ? (
            <div className="fav-empty">
              <div className="fav-empty-icon">⭐</div>
              <p className="fav-empty-title">尚無收藏股票</p>
              <p className="fav-empty-desc">
                在股票分析頁面點擊星號，即可將個股加入收藏清單，方便下次快速查看。
              </p>
              <button className="fav-empty-cta" onClick={() => navigate("/")}>
                前往搜尋股票
              </button>
            </div>
          ) : (
            <>
              {tw.length > 0 && (
                <>
                  <div className="fav-group-label">🇹🇼 台股 · {tw.length} 檔</div>
                  <div className="fav-grid">
                    {tw.map((item) => (
                      <FavCard
                        key={item.symbol}
                        item={item}
                        removing={removing === item.symbol}
                        onView={() => navigate(`/stock/${item.symbol}`)}
                        onRemove={() => remove(item.symbol)}
                      />
                    ))}
                  </div>
                </>
              )}

              {us.length > 0 && (
                <>
                  <div className="fav-group-label">🇺🇸 美股 / ETF · {us.length} 檔</div>
                  <div className="fav-grid">
                    {us.map((item) => (
                      <FavCard
                        key={item.symbol}
                        item={item}
                        removing={removing === item.symbol}
                        onView={() => navigate(`/stock/${item.symbol}`)}
                        onRemove={() => remove(item.symbol)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function FavCard({ item, removing, onView, onRemove }) {
  const displaySymbol = String(item.symbol || "").replace(/\.(TW|TWO)$/i, "");

  return (
    <div
      className={`fav-card${removing ? " removing" : ""}`}
      onClick={onView}
    >
      <div className="fav-card-header">
        <div>
          <div className="fav-card-symbol">{displaySymbol}</div>
          {item.name && item.name !== displaySymbol && (
            <div className="fav-card-name">{item.name}</div>
          )}
        </div>
        <span className="fav-star">⭐</span>
      </div>

      <div className="fav-card-actions" onClick={(e) => e.stopPropagation()}>
        <button className="fav-btn-view" onClick={onView}>
          查看分析
        </button>
        <button className="fav-btn-del" onClick={onRemove}>
          移除
        </button>
      </div>
    </div>
  );
}
