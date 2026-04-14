import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import KpiCard from "../components/KpiCard";
import TradeCard from "../components/TradeCard";

function asMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);

  async function load() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const [summaryData, seriesData] = await Promise.all([
        api.dashboardSummary(),
        api.dashboardSeries("month"),
      ]);
      setSummary(summaryData);
      setSeries(Array.isArray(seriesData?.points) ? seriesData.points : []);
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load dashboard");
    } finally {
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!summary) return <div className="loading">Loading dashboard...</div>;

  const m = summary.metrics;
  const avgPnl = m.total_trades > 0 ? Number(m.pnl_money_realized || 0) / m.total_trades : 0;
  const maxAbs = Math.max(
    1,
    ...series.map((p) => Math.abs(Number(p?.y) || 0)),
  );

  const statusData = Array.isArray(summary.status_counts) ? summary.status_counts : [];
  const symbolData = Array.isArray(summary.top_symbols) ? summary.top_symbols : [];
  const orderTypeData = Array.isArray(summary.order_type_counts) ? summary.order_type_counts : [];
  const statusMax = Math.max(1, ...statusData.map((s) => Number(s.count) || 0));
  const symbolMax = Math.max(1, ...symbolData.map((s) => Number(s.count) || 0));

  return (
    <section>
      <h1>Dashboard</h1>
      <div className="kpi-grid">
        <KpiCard label="Total Trades" value={m.total_trades} />
        <KpiCard label="Closed" value={m.closed_trades} />
        <KpiCard label="Open" value={Math.max(0, m.total_trades - m.closed_trades)} />
        <KpiCard label="Wins / Losses" value={`${m.wins} / ${m.losses}`} />
        <KpiCard label="Win Rate" value={`${m.win_rate.toFixed(2)}%`} />
        <KpiCard label="PnL Total" value={asMoney(m.pnl_money_realized)} />
        <KpiCard label="Avg PnL / Trade" value={asMoney(avgPnl)} />
        <KpiCard label="Benefit Today" value={asMoney(summary.benefit.today)} />
        <KpiCard label="Benefit This Week" value={asMoney(summary.benefit.week)} />
        <KpiCard label="Benefit This Month" value={asMoney(summary.benefit.month)} />
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-head"><h2>PnL Trend (This Month)</h2></div>
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
          <div className="panel-head"><h2>Status Breakdown</h2></div>
          {statusData.length === 0 ? (
            <div className="muted">No statuses yet.</div>
          ) : (
            <div className="mini-bars">
              {statusData.map((row) => (
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
          <div className="chip-row">
            {orderTypeData.map((row) => (
              <span key={row.key} className="dash-chip">{row.key}: {row.count}</span>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Top Symbols</h2></div>
          {symbolData.length === 0 ? (
            <div className="muted">No symbols yet.</div>
          ) : (
            <div className="mini-bars">
              {symbolData.map((row) => (
                <div className="mini-row" key={row.key}>
                  <span className="mini-label">{row.key}</span>
                  <div className="mini-track">
                    <div className="mini-fill alt" style={{ width: `${Math.max(5, ((row.count || 0) / symbolMax) * 100)}%` }} />
                  </div>
                  <span className="mini-val">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <h2>Latest Unprocessed Trades</h2>
      <div className="trade-list">
        {summary.latest_unprocessed.length === 0 ? (
          <div className="muted">No NEW/LOCKED trades.</div>
        ) : (
          summary.latest_unprocessed.map((t) => <TradeCard key={t.signal_id} trade={t} />)
        )}
      </div>
    </section>
  );
}
