import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import KpiCard from "../components/KpiCard";

const RANGE_OPTIONS = ["today", "week", "month", "year"];

function asMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function asPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00%";
  return `${n.toFixed(2)}%`;
}

function asRR(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(2);
}

function TableBlock({ title, rows }) {
  return (
    <div className="panel">
      <div className="panel-head"><h2>{title}</h2></div>
      {rows.length === 0 ? (
        <div className="muted">No data.</div>
      ) : (
        <div className="mini-table">
          <div className="mini-table-head">
            <span>Name</span>
            <span>W</span>
            <span>L</span>
            <span>Win%</span>
            <span>R</span>
          </div>
          {rows.map((r) => (
            <div className="mini-table-row" key={r.key}>
              <span className="mini-name" title={r.key}>{r.key}</span>
              <span>{r.wins}</span>
              <span>{r.losses}</span>
              <span>{asPct(r.win_rate)}</span>
              <span>{asRR(r.r_multiple_avg)}</span>
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
    metric: "total",
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
  }, [filters.user_id, filters.symbol, filters.strategy, filters.range, filters.metric]);

  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [filters.user_id, filters.symbol, filters.strategy, filters.range, filters.metric]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="loading">Loading dashboard...</div>;

  const m = data.metrics || {};
  const tierRows = Array.isArray(data.tiers) ? data.tiers : [];
  const statusRows = Array.isArray(data.status_counts) ? data.status_counts : [];
  const periodTotals = data.period_totals || {};
  const series = Array.isArray(data.pnl_series) ? data.pnl_series : [];
  const top = data.top_winrate || { symbols: [], entry_models: [], accounts: [] };
  const f = data.filters || {};
  const maxAbs = Math.max(1, ...series.map((p) => Math.abs(Number(p?.y) || 0)));
  const statusMax = Math.max(1, ...statusRows.map((s) => Number(s.count) || 0));

  const metricKey = filters.metric === "avg" ? "avg_pnl_per_trade" : "total_pnl";
  const metricLabel = filters.metric === "avg" ? "Avg PnL/Trade" : "Total PnL";

  return (
    <section className="stack-layout">
      <div className="panel">
        <div className="dashboard-filters">
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
          <div className="metric-toggle">
            <button
              type="button"
              className={filters.metric === "total" ? "active" : ""}
              onClick={() => setFilters((prev) => ({ ...prev, metric: "total" }))}
            >
              Total PnL
            </button>
            <button
              type="button"
              className={filters.metric === "avg" ? "active" : ""}
              onClick={() => setFilters((prev) => ({ ...prev, metric: "avg" }))}
            >
              Avg PnL/Trade
            </button>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Total Trades" value={m.total_trades || 0} />
        <KpiCard label="Closed Trades" value={m.closed_trades || 0} />
        <KpiCard label="Wins / Losses" value={`${m.wins || 0} / ${m.losses || 0}`} />
        <KpiCard label="Win Rate" value={asPct(m.win_rate || 0)} />
        <KpiCard label={metricLabel} value={asMoney(filters.metric === "avg" ? ((m.total_trades || 0) > 0 ? (Number(m.pnl_money_realized || 0) / Number(m.total_trades || 1)) : 0) : m.pnl_money_realized || 0)} />
      </div>

      <div className="kpi-grid period-grid">
        <KpiCard label={`${metricLabel} Today`} value={asMoney(periodTotals.today?.[metricKey] || 0)} hint={`${periodTotals.today?.trades || 0} trades`} />
        <KpiCard label={`${metricLabel} Week`} value={asMoney(periodTotals.week?.[metricKey] || 0)} hint={`${periodTotals.week?.trades || 0} trades`} />
        <KpiCard label={`${metricLabel} Month`} value={asMoney(periodTotals.month?.[metricKey] || 0)} hint={`${periodTotals.month?.trades || 0} trades`} />
        <KpiCard label={`${metricLabel} Year`} value={asMoney(periodTotals.year?.[metricKey] || 0)} hint={`${periodTotals.year?.trades || 0} trades`} />
      </div>

      <div className="dashboard-grid advanced">
        <div className="panel">
          <div className="panel-head"><h2>PnL Trend</h2></div>
          {series.length === 0 ? (
            <div className="muted">No closed PnL points yet.</div>
          ) : (
            <div className="spark-wrap" aria-label="PnL trend bars">
              {series.map((p) => {
                const y = Number(p?.y) || 0;
                const h = Math.max(6, Math.round((Math.abs(y) / maxAbs) * 68));
                return (
                  <div
                    key={`${p.x}`}
                    className={`spark-bar ${y >= 0 ? "pos" : "neg"}`}
                    title={`${p.x}: ${asMoney(y)}`}
                    style={{ height: `${h}px` }}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Summary Tiers</h2></div>
          <div className="tier-grid">
            {tierRows.map((row) => (
              <article className="tier-card" key={row.key}>
                <div className="tier-key">{row.key}</div>
                <div className="tier-count">{row.count}</div>
                <div className="tier-pnl">{asMoney(row.pnl)}</div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Status Breakdown</h2></div>
          {statusRows.length === 0 ? (
            <div className="muted">No statuses yet.</div>
          ) : (
            <div className="mini-bars">
              {statusRows.map((row) => (
                <div className="mini-row" key={row.key}>
                  <span className="mini-label">{row.key}</span>
                  <div className="mini-track">
                    <div className="mini-fill" style={{ width: `${Math.max(5, ((row.count || 0) / statusMax) * 100)}%` }} />
                  </div>
                  <span className="mini-val">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid tables">
        <TableBlock title="Top Winrate by Symbol" rows={Array.isArray(top.symbols) ? top.symbols : []} />
        <TableBlock title="Top Winrate by Entry Model" rows={Array.isArray(top.entry_models) ? top.entry_models : []} />
        <TableBlock title="Top Winrate by Account" rows={Array.isArray(top.accounts) ? top.accounts : []} />
      </div>
    </section>
  );
}
