import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import TradeDetailPage from "./pages/TradeDetailPage";
import LogsPage from "./pages/LogsPage";
import DatabasePage from "./pages/DatabasePage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
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
          <NavLink to="/trades" className={({ isActive }) => (isActive ? "active" : "")}>Trades</NavLink>
          {canAccessSystemPages ? <NavLink to="/logs" className={({ isActive }) => (isActive ? "active" : "")}>Logs</NavLink> : null}
          {canAccessSystemPages ? <NavLink to="/db" className={({ isActive }) => (isActive ? "active" : "")}>DB</NavLink> : null}
          {canAccessSystemPages ? <NavLink to="/users" className={({ isActive }) => (isActive ? "active" : "")}>Users</NavLink> : null}
          <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>My Account</NavLink>
          <button onClick={handleLogout} style={{ marginLeft: 8 }}>Logout</button>
          <button 
             onClick={toggleTheme} 
             style={{ 
               background: 'transparent', 
               border: '1px solid var(--border)', 
               color: 'var(--text)', 
               padding: '4px 10px', 
               borderRadius: '6px', 
               fontSize: '11px', 
               cursor: 'pointer',
               marginLeft: '20px'
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
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/trades/:signalId" element={<TradeDetailPage />} />
          <Route path="/logs" element={canAccessSystemPages ? <LogsPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/db" element={canAccessSystemPages ? <DatabasePage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/users" element={canAccessSystemPages ? <UsersPage authUser={authUser} /> : <Navigate to="/dashboard" replace />} />
          <Route path="/settings" element={<SettingsPage authUser={authUser} />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
