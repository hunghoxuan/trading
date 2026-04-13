import { Link } from "react-router-dom";

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sideClass(action) {
  const a = String(action || "").toUpperCase();
  if (a === "BUY") return "side BUY";
  if (a === "SELL") return "side SELL";
  return "side";
}

export default function TradeCard({ trade }) {
  const strategy = trade?.raw_json?.strategy || "-";
  const ackResultText = [trade.ack_status, trade.ack_ticket, trade.ack_error].filter(Boolean).join(" | ");

  return (
    <Link to={`/trades/${encodeURIComponent(trade.signal_id)}`} className="trade-card">
      <div className="trade-head">
        <div className="trade-title-row">
          <strong>{trade.symbol}</strong>
          <span className={sideClass(trade.action)}>{String(trade.action || "").toUpperCase() || "-"}</span>
          <span className="muted">{trade.signal_id}</span>
          <span className="muted">{new Date(trade.created_at).toLocaleString()}</span>
        </div>
        <div className="trade-title-row">
          <span className={`badge ${trade.status}`}>{trade.status}</span>
          <span className={`badge ${trade.ack_status || ""}`}>{trade.ack_status || "-"}</span>
        </div>
      </div>

      <div className="trade-meta-line">
        <span>Price: {trade.entry_price_exec ?? "-"}</span>
        <span>TP: {trade.tp_exec ?? trade.tp ?? "-"}</span>
        <span>SL: {trade.sl_exec ?? trade.sl ?? "-"}</span>
        <span>RR: {trade.rr_planned ?? "-"}</span>
        <span>Volume: {trade.volume ?? "-"}</span>
      </div>

      <div className="trade-grid-three">
        <div>Strategy: {strategy}<br />Note: {trade.note || "-"}</div>
        <div>Ack Result: {ackResultText || "-"}</div>
        <div>PnL: {money(trade.pnl_money_realized)}</div>
      </div>
    </Link>
  );
}
