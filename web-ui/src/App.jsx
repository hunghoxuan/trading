import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import TradeDetailPage from "./pages/TradeDetailPage";
import LogsPage from "./pages/LogsPage";
import DatabasePage from "./pages/DatabasePage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import SourcesPage from "./pages/SourcesPage";
import ExecutionV2Page from "./pages/ExecutionV2Page";
import AccountsV2Page from "./pages/AccountsV2Page";
import BrokersPage from "./pages/BrokersPage";
import SignalsPage from "./pages/SignalsPage";
import SignalDetailPage from "./pages/SignalDetailPage";
import V2TradeDetailPage from "./pages/V2TradeDetailPage";
import { api } from "./api";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const [serverVersion, setServerVersion] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("ui_theme") || "dark");
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const canAccessSystemPages = String(authUser?.role || "").toLowerCase() === "system";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ui_theme", theme);
  }, [theme]);

  useEffect(() => {
    Promise.allSettled([api.health(), api.authMe()])
      .then(([healthRes, meRes]) => {
        if (healthRes.status === "fulfilled") {
          setServerVersion(String(healthRes.value?.version || ""));
        } else {
          setServerVersion("");
        }
        if (meRes.status === "fulfilled" && meRes.value?.user) {
          setAuthUser(meRes.value.user);
        } else {
          setAuthUser(null);
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");
  const handleLogin = (user) => setAuthUser(user || null);
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // noop
    }
    setAuthUser(null);
  };

  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!authUser) {
    return (
      <div className="app-shell">
        <main className="page-wrap">
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>📈 Trading</span>
          {serverVersion ? <span className="brand-version">v{serverVersion}</span> : null}
        </div>
        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>
          <NavLink to="/signals" className={({ isActive }) => (isActive ? "active" : "")}>Signals</NavLink>
          <NavLink to="/trades" className={({ isActive }) => (isActive ? "active" : "")}>Trades</NavLink>
          {canAccessSystemPages ? <NavLink to="/logs" className={({ isActive }) => (isActive ? "active" : "")}>Logs</NavLink> : null}
          {canAccessSystemPages ? <NavLink to="/db" className={({ isActive }) => (isActive ? "active" : "")}>DB</NavLink> : null}
          {canAccessSystemPages ? <NavLink to="/users" className={({ isActive }) => (isActive ? "active" : "")}>Users</NavLink> : null}
          {canAccessSystemPages ? <NavLink to="/accounts-v2" className={({ isActive }) => (isActive ? "active" : "")}>Accounts V2</NavLink> : null}
          {canAccessSystemPages ? <NavLink to="/sources" className={({ isActive }) => (isActive ? "active" : "")}>Sources</NavLink> : null}
          {canAccessSystemPages ? <NavLink to="/subscriptions" className={({ isActive }) => (isActive ? "active" : "")}>Subscriptions</NavLink> : null}
          {canAccessSystemPages ? <NavLink to="/execution-v2" className={({ isActive }) => (isActive ? "active" : "")}>Execution V2</NavLink> : null}
          {canAccessSystemPages ? <NavLink to="/brokers" className={({ isActive }) => (isActive ? "active" : "")}>Brokers</NavLink> : null}
          <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>My Account</NavLink>
          <button onClick={handleLogout} className="secondary-button" style={{ marginLeft: 8, padding: '4px 10px', fontSize: '11px' }}>Logout</button>
          <button 
             onClick={toggleTheme} 
             className="secondary-button"
             style={{ 
               padding: '4px 10px', 
               fontSize: '11px', 
               marginLeft: '20px',
               width: '80px'
             }}
          >
            {theme === "dark" ? "☀️ LIGHT" : "🌙 DARK"}
          </button>
        </nav>
      </header>
      <main className="page-wrap">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/signals" element={<SignalsPage />} />
          <Route path="/signals/:signalId" element={<SignalDetailPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/trades/:tradeId" element={<V2TradeDetailPage />} />
          <Route path="/logs" element={canAccessSystemPages ? <LogsPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/db" element={canAccessSystemPages ? <DatabasePage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/users" element={canAccessSystemPages ? <UsersPage authUser={authUser} /> : <Navigate to="/dashboard" replace />} />
          <Route path="/accounts-v2" element={canAccessSystemPages ? <AccountsV2Page /> : <Navigate to="/dashboard" replace />} />
          <Route path="/sources" element={canAccessSystemPages ? <SourcesPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/subscriptions" element={canAccessSystemPages ? <SubscriptionsPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/execution-v2" element={canAccessSystemPages ? <ExecutionV2Page /> : <Navigate to="/dashboard" replace />} />
          <Route path="/brokers" element={canAccessSystemPages ? <BrokersPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/settings" element={<SettingsPage authUser={authUser} />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
