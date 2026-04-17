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

function positiveOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "ACTIVE" || s === "TRUE") return { cls: "ACTIVE", label: "ACTIVE" };
  if (s === "INACTIVE" || s === "FALSE" || s === "DISABLE" || s === "DISABLED") return { cls: "INACTIVE", label: "INACTIVE" };
  if (s === "OK") return { cls: "OK", label: "PLACED" };
  if (s === "LOCKED") return { cls: "LOCKED", label: "LOCKED" };
  if (s === "START") return { cls: "START", label: "START" };
  if (s === "TP") return { cls: "TP", label: "TP" };
  if (s === "SL") return { cls: "SL", label: "SL" };
  return { cls: "OTHER", label: s || "UNKNOWN" };
}

function fmt(v) {
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function fmtPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(2)}%`;
}

export default function TradeCard({ trade, selected = false, onToggleSelect = null }) {
  const orderTypeRaw = String(trade?.raw_json?.order_type || trade?.raw_json?.orderType || "limit").toUpperCase();
  const orderType = orderTypeRaw === "STOP" || orderTypeRaw === "MARKET" ? orderTypeRaw : "LIMIT";
  const chartTf = trade?.chart_tf || trade?.raw_json?.chartTf || "-";
  const htf = trade?.source_tf || trade?.raw_json?.sourceTf || trade?.raw_json?.timeframe || "-";
  const plannedPrice = positiveOrNull(trade?.raw_json?.price);
  const execPrice = positiveOrNull(trade?.entry_price_exec);
  const displayPrice = execPrice ?? plannedPrice ?? "-";
  const strategy =
    trade?.raw_json?.strategy
    || (String(trade.note || "").includes("|") ? String(trade.note || "").split("|")[0].trim() : "")
    || "-";
  const pnlValue = trade.pnl_money_realized;
  const pnlNumber = Number(pnlValue);
  const hasPnl = pnlValue !== null && pnlValue !== undefined && pnlValue !== "" && Number.isFinite(pnlNumber);
  const pnlClass = Number.isFinite(pnlNumber) ? (pnlNumber > 0 ? "pnl-pos" : pnlNumber < 0 ? "pnl-neg" : "pnl-zero") : "";
  const status = statusUi(trade?.status);
  const tpText = fmt(trade.tp_exec ?? trade.tp ?? "-");
  const slText = fmt(trade.sl_exec ?? trade.sl ?? "-");
  const rrText = fmt(trade.rr_planned ?? "-");
  const pnlText = hasPnl ? `$${money(pnlValue)}` : "-";

  // Broker execution telemetry (populated after EA ACK)
  const lotsActual = positiveOrNull(trade?.volume);
  const slPips = positiveOrNull(trade?.sl_pips);
  const tpPips = positiveOrNull(trade?.tp_pips);
  const riskActual = positiveOrNull(trade?.risk_money_actual);
  const rewardPlanned = positiveOrNull(trade?.reward_money_planned);
  const riskRaw = positiveOrNull(trade?.raw_json?.risk_money || trade?.raw_json?.risk);

  // Volume line: ONLY show real broker facts after placement (ignore TV planned volume)
  let volText = null;
  
  if (lotsActual) {
    const riskDollar = riskActual ?? positiveOrNull(trade?.risk_money_planned) ?? riskRaw;
    const riskStr = riskDollar ? ` ($${money(riskDollar)})` : "";
    volText = `${lotsActual} Lots${riskStr}`;
    if (slPips) {
      const rewardStr = rewardPlanned ? ` → $${money(rewardPlanned)}` : "";
      volText += ` | ${slPips.toFixed(1)}p SL | Risk $${money(riskDollar)}${rewardStr}`;
    }
  }

  return (
    <article className="trade-card">
      <Link to={`/trades/${encodeURIComponent(trade.signal_id)}`} className="trade-link-content">
        <div className="trade-head">
          <div className="trade-title-row main-row">
            <span className="symbol">{trade.symbol}</span>
            <span className={sideClass(trade.action)}>{String(trade.action || "").toUpperCase() || "-"}</span>
            <span className="order-type-pill">{orderType}</span>
            <span className="muted small blur">{trade.signal_id}</span>
            <span className="muted small blur">{new Date(trade.created_at).toLocaleString()}</span>
            {trade.ack_ticket && <span className="muted small blur">Ticket: {trade.ack_ticket}</span>}
          </div>
          <div className="trade-status-col">
            <div className="trade-status-row">
              <span className={`badge ${status.cls}`}>{status.label}</span>
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

        <div className="trade-metrics-row">
          <span className="kv">Price: {fmt(displayPrice)}</span>
          <span className="kv">TP: {tpText}{tpPips ? <span className="muted small"> ({tpPips.toFixed(1)}p)</span> : null}</span>
          <span className="kv">SL: {slText}{slPips ? <span className="muted small"> ({slPips.toFixed(1)}p)</span> : null}</span>
          <span className="kv">RR: {rrText}</span>
          {volText && <span className="kv">{volText}</span>}
          <span className={`pnl ${pnlClass}`}>{pnlText}</span>
        </div>

        <div className="trade-bottom-line">
          <span><span className="muted small">ChartTF:</span> {chartTf}, <span className="muted small">HTF:</span> {htf}</span>
          <span><span className="muted small">Strategy:</span> {strategy}</span>
          <span><span className="muted small">Note:</span> <span className="muted blur">{trade.note || "-"}</span></span>
        </div>
      </Link>
    </article>
  );
}
