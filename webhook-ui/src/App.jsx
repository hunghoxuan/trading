import { Link, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import TradeDetailPage from "./pages/TradeDetailPage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">TVBridge Control</div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/trades">Trades</Link>
        </nav>
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
