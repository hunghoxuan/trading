import { Link, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import TradeDetailPage from "./pages/TradeDetailPage";
import { getRuntimeApiBase, setRuntimeApiBase, setRuntimeApiKey } from "./api";
import { useState } from "react";

export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("tvbridge_api_key") || "");
  const [apiBase, setApiBase] = useState(getRuntimeApiBase());

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
            type="text"
            placeholder="API URL (e.g. http://139.59.211.192)"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
          />
          <input
            type="password"
            placeholder="API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button
            onClick={() => {
              setRuntimeApiBase(apiBase);
              setRuntimeApiKey(apiKey);
              window.location.reload();
            }}
          >
            Save
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
