import { Link, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import TradeDetailPage from "./pages/TradeDetailPage";
import { getRuntimeApiBase, setRuntimeApiBase, setRuntimeApiKey } from "./api";
import { useState } from "react";

export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("tvbridge_api_key") || "");
  const [apiBase, setApiBase] = useState(getRuntimeApiBase());
  const [connMsg, setConnMsg] = useState("");

  async function testApi() {
    const base = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? (apiBase || getRuntimeApiBase())
      : window.location.origin;
    const key = String(apiKey || "").trim();
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), 12000);
    setConnMsg("Testing...");
    try {
      const res = await fetch(new URL("/mt5/dashboard/summary", `${base.replace(/\/+$/, "")}/`).toString(), {
        signal: ctrl.signal,
        headers: key ? { "x-api-key": key } : {},
      });
      const text = await res.text();
      if (res.ok) {
        setConnMsg("API test: OK");
      } else {
        setConnMsg(`API test: HTTP ${res.status} ${text.slice(0, 80)}`);
      }
    } catch (e) {
      if (e?.name === "AbortError") setConnMsg("API test: timeout 12s");
      else setConnMsg(`API test: ${e?.message || "failed"}`);
    } finally {
      window.clearTimeout(t);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">📈 Trading</div>
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
          <button onClick={testApi}>Test API</button>
        </div>
        {connMsg ? <div className="muted">{connMsg}</div> : null}
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
