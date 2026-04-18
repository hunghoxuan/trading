import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import LogsPage from "./pages/LogsPage";
import DatabasePage from "./pages/DatabasePage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import SourcesPage from "./pages/SourcesPage";
import ExecutionV2Page from "./pages/ExecutionV2Page";
import AccountsV2Page from "./pages/AccountsV2Page";
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
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const location = useLocation();
  const canAccessSystemPages = String(authUser?.role || "").toLowerCase() === "system";
  const systemMenuActive = useMemo(() => {
    const p = String(location?.pathname || "");
    return p.startsWith("/accounts-v2")
      || p.startsWith("/sources")
      || p.startsWith("/logs")
      || p.startsWith("/db")
      || p.startsWith("/users");
  }, [location?.pathname]);

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
          <NavLink to="/trades" className={({ isActive }) => (isActive ? "active" : "")}>Trades</NavLink>
          <NavLink to="/signals" className={({ isActive }) => (isActive ? "active" : "")}>Signals</NavLink>

          <div style={{ flex: 1 }} />
          
          <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>Settings</NavLink>
          {canAccessSystemPages && (
            <div
              className="nav-dropdown"
              onMouseLeave={() => setSystemMenuOpen(false)}
            >
              <button
                type="button"
                className={`secondary-button nav-dropdown-trigger ${systemMenuActive ? "active" : ""}`}
                onClick={() => setSystemMenuOpen((v) => !v)}
              >
                System
              </button>
              {systemMenuOpen ? (
                <div className="nav-dropdown-menu">
                  <NavLink to="/accounts-v2" onClick={() => setSystemMenuOpen(false)}>Accounts</NavLink>
                  <NavLink to="/sources" onClick={() => setSystemMenuOpen(false)}>Sources</NavLink>
                  <NavLink to="/logs" onClick={() => setSystemMenuOpen(false)}>Logs</NavLink>
                  <NavLink to="/db" onClick={() => setSystemMenuOpen(false)}>DB</NavLink>
                  <NavLink to="/users" onClick={() => setSystemMenuOpen(false)}>Users</NavLink>
                </div>
              ) : null}
            </div>
          )}
          <button onClick={handleLogout} className="secondary-button" style={{ marginLeft: 8, padding: '4px 10px', fontSize: '11px' }}>Logout</button>
          <button 
             onClick={toggleTheme} 
             className="secondary-button"
             style={{ 
               padding: '4px 10px', 
               fontSize: '11px', 
               marginLeft: '10px',
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
          <Route path="/settings" element={<SettingsPage authUser={authUser} />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
