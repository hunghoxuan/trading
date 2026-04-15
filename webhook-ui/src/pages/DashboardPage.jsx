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

function TableBlock({ title, rows }) {
  const [orderBy, setOrderBy] = useState("WR");

  const sortedRows = [...rows].sort((a, b) => {
    if (orderBy === "Name") return a.key < b.key ? -1 : 1;
    if (orderBy === "WR") return b.win_rate - a.win_rate || b.trades - a.trades;
    if (orderBy === "PnL") return b.pnl_total - a.pnl_total;
    if (orderBy === "RR") return b.rr_total - a.rr_total;
    if (orderBy === "W") return b.wins - a.wins;
    if (orderBy === "L") return b.losses - a.losses;
    return 0;
  });

  return (
    <div className="panel">
      <div className="panel-head" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div className="kpi-label period-title" style={{margin: 0, textTransform: 'capitalize'}}>{title}</div>
        <select className="kpi-label period-title" style={{margin: 0, padding: 0, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', textAlign: 'right'}} value={orderBy} onChange={(e) => setOrderBy(e.target.value)}>
          <option value="Name">Sort Name</option>
          <option value="WR">Sort WR</option>
          <option value="PnL">Sort PnL</option>
          <option value="RR">Sort RR</option>
          <option value="W">Sort Wins</option>
          <option value="L">Sort Losses</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <div className="muted">No data.</div>
      ) : (
        <div className="mini-table">
          <div className="mini-table-head wide" style={{ color: '#94a3b8', fontWeight: 400 }}>
            <span style={{ flex: '2' }}>Name</span>
            <span>W/L</span>
            <span>WR</span>
            <span>PnL</span>
            <span>RR</span>
          </div>
          {sortedRows.map((r) => (
            <div className="mini-table-row wide" key={r.key}>
              <span className="mini-name" style={{ flex: '2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.key}>{r.key}</span>
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
    <section className="stack-layout">
      <div className="panel">
        <div className="dashboard-filters no-metric-toggle">
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
      </div>

      <div className="kpi-grid three">
        <article className="kpi-card">
          <div className="kpi-label">Total Trades / Signals</div>
          <div className="kpi-value">{m.total_trades || 0}</div>
          <div className="kpi-hint">Signals: {m.total_signals || 0}</div>
        </article>
        <article className="kpi-card">
          <div className="kpi-label">Wins / Losses</div>
          <div className="kpi-value">{m.wins || 0} / {m.losses || 0}</div>
          <div className="kpi-hint">Winrate: {asPct(m.win_rate)}</div>
        </article>
        <article className="kpi-card">
          <div className="kpi-label">Total PnL</div>
          <div className={`kpi-value ${moneyClass(m.total_pnl)}`}>{asMoneySigned(m.total_pnl || 0)}</div>
          <div className="kpi-hint">
            Buy: <span className={moneyClass(m.buy_pnl)}>{asMoneySigned(m.buy_pnl || 0)}</span> | 
            Sell: <span className={moneyClass(m.sell_pnl)}>{asMoneySigned(m.sell_pnl || 0)}</span>
          </div>
        </article>
      </div>

      <div className="period-box-grid">
        {PERIOD_KEYS.map((p) => {
          const v = periodTotals[p] || {};
          return (
            <article className="kpi-card period-box" key={p}>
              <div className="kpi-label period-title">{p[0].toUpperCase() + p.slice(1)}</div>
              <div className="period-big-line">
                <span className={moneyClass(v.total_pnl)}>{asMoneySigned(v.total_pnl || 0)}</span>
              </div>
              <div className="kpi-hint">
                Trades {v.total_trades || 0} | Wins {v.total_wins || 0} | Losses {v.total_losses || 0} | RR {asRR(v.total_rr || 0)}
              </div>
            </article>
          );
        })}
      </div>

      <div className="dashboard-grid tables">
        <TableBlock title="Top Symbols" rows={Array.isArray(top.symbols) ? top.symbols : []} />
        <TableBlock title="Top Entry Model" rows={Array.isArray(top.entry_models) ? top.entry_models : []} />
        <TableBlock title="Top Accounts" rows={Array.isArray(top.accounts) ? top.accounts : []} />
      </div>
    </section>
  );
}
