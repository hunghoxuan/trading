import { Link } from "react-router-dom";

function money(v) {
  if (v === null || v === undefined || v === "") return "-";
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
  const strategy =
    trade?.raw_json?.strategy
    || (String(trade.note || "").includes("|") ? String(trade.note || "").split("|")[0].trim() : "")
    || "-";
  const ackResultText = [trade.ack_status, trade.ack_ticket, trade.ack_error].filter(Boolean).join(" | ");
  const pnlValue = trade.pnl_money_realized;
  const pnlNumber = Number(pnlValue);
  const pnlClass = Number.isFinite(pnlNumber) ? (pnlNumber > 0 ? "pnl-pos" : pnlNumber < 0 ? "pnl-neg" : "pnl-zero") : "";

  return (
    <Link to={`/trades/${encodeURIComponent(trade.signal_id)}`} className="trade-card">
      <div className="trade-head">
        <div className="trade-title-row main-row">
          <strong className="symbol">{trade.symbol}</strong>
          <span className={sideClass(trade.action)}>{String(trade.action || "").toUpperCase() || "-"}</span>
          <span className="muted small blur">{trade.signal_id}</span>
          <span className="muted small blur">{new Date(trade.created_at).toLocaleString()}</span>
        </div>
        <div className="trade-status-col">
          <span className={`badge ${trade.status}`}>{trade.status}</span>
          <span className={`pnl ${pnlClass}`}>PnL: {money(pnlValue)}</span>
        </div>
      </div>

      <div className="trade-price-line">
        <span className="kv big">Price: {trade.entry_price_exec ?? "-"}</span>
        <span className="kv big">TP: {trade.tp_exec ?? trade.tp ?? "-"}</span>
        <span className="kv big">SL: {trade.sl_exec ?? trade.sl ?? "-"}</span>
        <span className="kv">RR: {trade.rr_planned ?? "-"}</span>
        <span className="kv">Volume: {trade.volume ?? "-"}</span>
      </div>

      <div className="trade-grid-three">
        <div>
          <span className="muted small">Strategy:</span> {strategy}<br />
          <span className="muted small">Note:</span> <span className="muted blur">{trade.note || "-"}</span>
        </div>
        <div>
          <span className="muted small">Ack Result:</span> {ackResultText || "-"}
        </div>
      </div>
    </Link>
  );
}
