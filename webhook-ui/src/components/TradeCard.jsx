import { Link } from "react-router-dom";

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TradeCard({ trade }) {
  return (
    <Link to={`/trades/${encodeURIComponent(trade.signal_id)}`} className="trade-card">
      <div className="trade-head">
        <strong>{trade.symbol}</strong>
        <span className={`badge ${trade.status}`}>{trade.status}</span>
      </div>
      <div className="trade-grid">
        <div>ID: {trade.signal_id}</div>
        <div>Action: {trade.action}</div>
        <div>Volume: {trade.volume}</div>
        <div>RR: {trade.rr_planned ?? "-"}</div>
        <div>PnL: {money(trade.pnl_money_realized)}</div>
        <div>Created: {new Date(trade.created_at).toLocaleString()}</div>
      </div>
    </Link>
  );
}
