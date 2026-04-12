import { Link, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import TradeDetailPage from "./pages/TradeDetailPage";
import { setRuntimeApiKey } from "./api";
import { useState } from "react";

export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("tvbridge_api_key") || "");

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">TVBridge Control</div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/trades">Trades</Link>
        </nav>
        <div className="keybar">
          <input
            type="password"
            placeholder="API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button
            onClick={() => {
              setRuntimeApiKey(apiKey);
              window.location.reload();
            }}
          >
            Save Key
          </button>
        </div>
      </header>
      <main className="page-wrap">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/trades/:signalId" element={<TradeDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
