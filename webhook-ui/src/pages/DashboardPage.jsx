import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const RANGE_OPTIONS = ["today", "week", "month", "year"];
const PERIOD_KEYS = ["today", "week", "month", "year"];

function asMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function asMoneySigned(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0.00";
  if (n < 0) return `-$${asMoney(Math.abs(n))}`;
  return `$${asMoney(n)}`;
}

function asPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0%";
  return `${Math.ceil(n)}%`;
}

function asRR(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function moneyClass(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "money-neutral";
  return n > 0 ? "money-pos" : "money-neg";
}

function TableBlock({ title, rows, noun = "ITEMS" }) {
  const [sortKey, setSortKey] = useState("WR");
  const [sortDir, setSortDir] = useState("DESC");

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === "ASC" ? "DESC" : "ASC");
    } else {
      setSortKey(key);
      setSortDir("DESC");
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    let va, vb;
    if (sortKey === "Name") { va = String(a.key); vb = String(b.key); }
    else if (sortKey === "WR") { va = a.win_rate; vb = b.win_rate; }
    else if (sortKey === "PnL") { va = a.pnl_total; vb = b.pnl_total; }
    else if (sortKey === "RR") { va = a.rr_total; vb = b.rr_total; }
    else if (sortKey === "WL") { va = a.wins; vb = b.wins; }
    else return 0;

    if (va === vb) return 0;
    const res = va > vb ? 1 : -1;
    return sortDir === "DESC" ? -res : res;
  });

  const sortMarker = (key) => {
    if (sortKey !== key) return null;
    return sortDir === "ASC" ? " ↑" : " ↓";
  };

  return (
    <div className="panel fadeIn">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="panel-label" style={{ margin: 0 }}>{rows.length} {noun.toUpperCase()}</div>
      </div>
      {rows.length === 0 ? (
        <div className="minor-text">No operational data.</div>
      ) : (
        <div className="mini-table">
          <div className="mini-table-head wide" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '8px', background: 'transparent' }}>
            <span onClick={() => toggleSort("Name")} style={{ flex: '2', fontSize: '10px', fontWeight: 800, color: 'var(--muted)', cursor: 'pointer' }}>NAME{sortMarker("Name")}</span>
            <span onClick={() => toggleSort("WL")} style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted)', cursor: 'pointer' }}>W/L{sortMarker("WL")}</span>
            <span onClick={() => toggleSort("WR")} style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted)', cursor: 'pointer' }}>WR{sortMarker("WR")}</span>
            <span onClick={() => toggleSort("PnL")} style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted)', cursor: 'pointer' }}>PNL{sortMarker("PnL")}</span>
            <span onClick={() => toggleSort("RR")} style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted)', cursor: 'pointer' }}>RR{sortMarker("RR")}</span>
          </div>
          {sortedRows.map((r) => (
            <div className="mini-table-row wide" key={r.key} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="mini-name" style={{ flex: '2', whiteSpace: 'nowrap' }} title={r.key}>{r.key}</span>
              <span>{r.wins}/{r.losses}</span>
              <span>{asPct(r.win_rate)}</span>
              <span className={moneyClass(r.pnl_total)}>{asMoneySigned(r.pnl_total)}</span>
              <span>{asRR(r.rr_total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    user_id: "",
    symbol: "",
    strategy: "",
    range: "month",
  });
  const inFlightRef = useRef(false);

  async function load() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const resp = await api.dashboardAdvanced(filters);
      setData(resp);
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load dashboard");
    } finally {
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    load();
  }, [filters.user_id, filters.symbol, filters.strategy, filters.range]);

  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [filters.user_id, filters.symbol, filters.strategy, filters.range]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="loading">Loading dashboard...</div>;

  const m = data.metrics || {};
  const periodTotals = data.period_totals || {};
  const top = data.top_winrate || { symbols: [], entry_models: [], accounts: [] };
  const f = data.filters || {};

  return (
    <section className="stack-layout fadeIn">
      <div className="toolbar-panel">
        <select value={filters.user_id} onChange={(e) => setFilters((prev) => ({ ...prev, user_id: e.target.value }))}>
          <option value="">All accounts</option>
          {(f.accounts || []).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filters.symbol} onChange={(e) => setFilters((prev) => ({ ...prev, symbol: e.target.value }))}>
          <option value="">All symbols</option>
          {(f.symbols || []).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filters.strategy} onChange={(e) => setFilters((prev) => ({ ...prev, strategy: e.target.value }))}>
          <option value="">All strategies</option>
          {(f.strategies || []).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filters.range} onChange={(e) => setFilters((prev) => ({ ...prev, range: e.target.value }))}>
          {RANGE_OPTIONS.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>

      <div className="kpi-grid">
        <article className="kpi-card">
          <div className="panel-label">Total Trades / Signals</div>
          <div className="period-big-line">
            <span className="kpi-value">{m.total_trades || 0}</span>
          </div>
          <div className="minor-text" style={{ marginTop: '8px' }}>Signals: {m.total_signals || 0}</div>
        </article>
        <article className="kpi-card">
          <div className="panel-label">Wins / Losses</div>
          <div className="period-big-line">
            <span className="kpi-value">{m.wins || 0} / {m.losses || 0}</span>
          </div>
          <div className="minor-text" style={{ marginTop: '8px' }}>Winrate: {asPct(m.win_rate)}</div>
        </article>
        <article className="kpi-card">
          <div className="panel-label">Total PnL</div>
          <div className="period-big-line">
            <span className={`kpi-value ${moneyClass(m.total_pnl)}`}>{asMoneySigned(m.total_pnl || 0)}</span>
          </div>
          <div className="minor-text" style={{ marginTop: '8px' }}>
            Win: <span className={moneyClass(m.win_sum_pnl)}>{asMoneySigned(m.win_sum_pnl || 0)}</span> | 
            Lose: <span className={moneyClass(m.lose_sum_pnl)}>{asMoneySigned(m.lose_sum_pnl || 0)}</span>
          </div>
        </article>
      </div>

      <div className="period-box-grid">
        {PERIOD_KEYS.map((p) => {
          const v = periodTotals[p] || {};
          return (
            <article className="kpi-card" key={p}>
              <div className="panel-label">{p}</div>
              <div className="period-big-line">
                <span className={`kpi-value ${moneyClass(v.total_pnl)}`} style={{ fontSize: '24px' }}>
                  {asMoneySigned(v.total_pnl || 0)}
                </span>
              </div>
              <div className="minor-text" style={{ marginTop: '8px' }}>
                Trades {v.total_trades || 0} | 
                RR {asRR(v.total_rr || 0)}
              </div>
            </article>
          );
        })}
      </div>

      <div className="dashboard-grid tables">
        <TableBlock title="Symbols" noun="Symbols" rows={Array.isArray(top.symbols) ? top.symbols : []} />
        <TableBlock title="Entry Model" noun="Models" rows={Array.isArray(top.entry_models) ? top.entry_models : []} />
        <TableBlock title="Accounts" noun="Accounts" rows={Array.isArray(top.accounts) ? top.accounts : []} />
      </div>
    </section>
  );
}
