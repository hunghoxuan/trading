import { useEffect, useState } from "react";
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
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const data = await api.dashboardSummary();
      setSummary(data);
    } catch (e) {
      setError(e.message);
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
  return (
    <section>
      <h1>Dashboard</h1>
      <div className="kpi-grid">
        <KpiCard label="Total Trades" value={m.total_trades} />
        <KpiCard label="Closed" value={m.closed_trades} />
        <KpiCard label="Win Rate" value={`${m.win_rate.toFixed(2)}%`} />
        <KpiCard label="PnL Total" value={asMoney(m.pnl_money_realized)} />
        <KpiCard label="Benefit Today" value={asMoney(summary.benefit.today)} />
        <KpiCard label="Benefit This Week" value={asMoney(summary.benefit.week)} />
        <KpiCard label="Benefit This Month" value={asMoney(summary.benefit.month)} />
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
