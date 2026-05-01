import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Stock from "./pages/Stock";
import Favorites from "./pages/Favorites";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stock/:symbol" element={<Stock />} />
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </BrowserRouter>
  );
}