import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import LogsPage from "./pages/LogsPage";
import TradeDetailPage from "./pages/TradeDetailPage";
import SettingsPage from "./pages/SettingsPage";
import { api } from "./api";

export default function App() {
  const [serverVersion, setServerVersion] = useState("");

  useEffect(() => {
    let mounted = true;
    api.health()
      .then((data) => {
        if (!mounted) return;
        setServerVersion(String(data?.version || ""));
      })
      .catch(() => {
        if (!mounted) return;
        setServerVersion("");
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>📈 Trading</span>
          {serverVersion ? <span className="brand-version">v{serverVersion}</span> : null}
        </div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/trades">Trades</Link>
          <Link to="/logs">Logs</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </header>
      <main className="page-wrap">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/trades/:signalId" element={<TradeDetailPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
