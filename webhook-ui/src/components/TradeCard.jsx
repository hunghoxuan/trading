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

function compactAck(trade) {
  const status = String(trade?.ack_status || "").trim();
  const error = String(trade?.ack_error || "").trim();
  if (!error) return [status, trade?.ack_ticket].filter(Boolean).join(" | ") || "-";

  const retcode = (error.match(/retcode=\d+/i) || [])[0] || "";
  const msgMatch = error.match(/msg=([^|[\]]+)/i);
  const msg = msgMatch ? `msg=${msgMatch[1].trim()}` : "";
  const expired = error.includes("Expired signal ignored");
  const core = expired ? "msg=expired signal" : [retcode, msg].filter(Boolean).join(" ");
  return [status, core || error.split("|")[0].trim()].filter(Boolean).join(" | ");
}

export default function TradeCard({ trade, selected = false, onToggleSelect = null }) {
  const chartTf = trade?.chart_tf || trade?.raw_json?.chartTf || "-";
  const htf = trade?.source_tf || trade?.raw_json?.sourceTf || trade?.raw_json?.timeframe || "-";
  const plannedPrice = trade?.raw_json?.price;
  const displayPrice = trade?.entry_price_exec ?? plannedPrice ?? "-";
  const strategy =
    trade?.raw_json?.strategy
    || (String(trade.note || "").includes("|") ? String(trade.note || "").split("|")[0].trim() : "")
    || "-";
  const ackResultText = compactAck(trade);
  const pnlValue = trade.pnl_money_realized;
  const pnlNumber = Number(pnlValue);
  const hasPnl = pnlValue !== null && pnlValue !== undefined && pnlValue !== "" && Number.isFinite(pnlNumber);
  const pnlClass = Number.isFinite(pnlNumber) ? (pnlNumber > 0 ? "pnl-pos" : pnlNumber < 0 ? "pnl-neg" : "pnl-zero") : "";

  return (
    <article className="trade-card">
      <Link to={`/trades/${encodeURIComponent(trade.signal_id)}`} className="trade-link-content">
        <div className="trade-head">
          <div className="trade-title-row main-row">
            <span className="symbol">{trade.symbol}</span>
            <span className={sideClass(trade.action)}>{String(trade.action || "").toUpperCase() || "-"}</span>
            <span className="muted small blur">{trade.signal_id}</span>
            <span className="muted small blur">{new Date(trade.created_at).toLocaleString()}</span>
          </div>
          <div className="trade-status-col">
            <div className="trade-status-row">
              <span className={`badge ${trade.status}`}>{trade.status}</span>
              <input
                className="trade-select-input"
                type="checkbox"
                checked={selected}
                onChange={(e) => onToggleSelect && onToggleSelect(Boolean(e.target.checked))}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${trade.signal_id}`}
              />
            </div>
          </div>
        </div>

        <div className="trade-price-line tight">
          <span className="kv">Price: {displayPrice}</span>
          <span className="kv">TP: {trade.tp_exec ?? trade.tp ?? "-"}</span>
          <span className="kv">SL: {trade.sl_exec ?? trade.sl ?? "-"}</span>
          <span className="kv">RR: {trade.rr_planned ?? "-"}</span>
          <span className="kv">Volume: {trade.volume ?? "-"}</span>
          {hasPnl ? <span className={`pnl ${pnlClass}`}>PnL: {money(pnlValue)}</span> : null}
        </div>

        <div className="trade-bottom-line">
          <span><span className="muted small">ChartTF:</span> {chartTf}, <span className="muted small">HTF:</span> {htf}</span>
          <span><span className="muted small">Strategy:</span> {strategy}</span>
          <span><span className="muted small">Note:</span> <span className="muted blur">{trade.note || "-"}</span></span>
          <span className="ack-right"><span className="muted small">Ack Result:</span> {ackResultText || "-"}</span>
        </div>
      </Link>
    </article>
  );
}
