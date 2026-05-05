import { BrowserRouter, Routes, Route } from "react-router-dom";
import Stock from "./pages/Stock.jsx";
import Favorites from "./pages/Favorites.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Stock />} />
        <Route path="/stock/:symbol" element={<Stock />} />
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </BrowserRouter>
  );
}