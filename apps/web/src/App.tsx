import { Link, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { StrategiesPage } from "./pages/StrategiesPage";
import { StrategyDetailPage } from "./pages/StrategyDetailPage";
import { PlayDetailPage } from "./pages/PlayDetailPage";

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>
            Investment Learning Lab
          </Link>
        </h1>
        <nav className="main-nav">
          <Link to="/">Home</Link>
          <Link to="/strategies">Strategies</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/strategies" element={<StrategiesPage />} />
        <Route path="/strategies/:strategyType" element={<StrategyDetailPage />} />
        <Route path="/plays/:id" element={<PlayDetailPage />} />
      </Routes>
    </div>
  );
}
