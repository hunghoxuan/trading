import { showDateTime } from "./format";

export function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formatDetailDateTime(v) {
  return showDateTime(v);
}

export function shouldShowPnl(statusRaw, pnlRaw) {
  const status = String(statusRaw || "").toUpperCase();
  const pnl = asNum(pnlRaw);
  if (pnl == null) return false;
  if (Math.abs(pnl) > 0.000001) return true;
  return status === "CLOSED" || status === "CANCELLED" || status === "TP" || status === "SL";
}

export function buildRrVolRiskText({ rrRaw, volumeRaw, riskSizeRaw, riskPctRaw, rewardSizeRaw, plannedVolRaw }) {
  const rr = asNum(rrRaw);
  const vol = asNum(volumeRaw);
  const plannedVol = asNum(plannedVolRaw);
  const risk = asNum(riskSizeRaw);
  const riskPct = asNum(riskPctRaw);
  const rewardRaw = asNum(rewardSizeRaw);
  const loss = risk != null ? Math.abs(risk) : null;
  const reward = rewardRaw != null
    ? Math.abs(rewardRaw)
    : (loss != null && rr != null ? loss * rr : null);
  const volText = plannedVol != null
    ? `${Number(plannedVol.toFixed(3))} vol`
    : (riskPct != null ? `${Number(riskPct.toFixed(2))}% vol` : "- vol");
  const lotsText = vol != null ? `${Number(vol.toFixed(3))} lots` : "- lots";
  const rrText = rr != null ? `${rr.toFixed(2)} rr` : "- rr";
  const wlText = (reward != null || loss != null)
    ? `W/L ${reward != null ? `+$${reward.toFixed(2)}` : "+$-"} ${loss != null ? `-$${loss.toFixed(2)}` : "-$-"}`
    : "W/L +$- -$-";
  return `${rrText} ${volText} | ${lotsText} ${wlText}`;
}

export function buildHeaderMeta({
  statusRaw,
  pnlRaw,
  rrRaw,
  volumeRaw,
  plannedVolRaw,
  riskSizeRaw,
  riskPctRaw,
  rewardSizeRaw,
  updatedAtRaw,
  statusUi,
}) {
  const pnl = asNum(pnlRaw);
  const showPnl = shouldShowPnl(statusRaw, pnl);
  const status = typeof statusUi === "function"
    ? statusUi(statusRaw)
    : { cls: "OTHER", label: String(statusRaw || "PENDING").toUpperCase() };
  return {
    showPnl,
    pnlText: `$${pnl != null ? pnl.toFixed(2) : "0.00"}`,
    pnlClassName: pnl != null && pnl < 0 ? "money-neg" : "money-pos",
    dateText: formatDetailDateTime(updatedAtRaw),
    statsText: buildRrVolRiskText({ rrRaw, volumeRaw, plannedVolRaw, riskSizeRaw, riskPctRaw, rewardSizeRaw }),
    statusNode: <span className={`badge ${status.cls}`}>{status.label}</span>,
  };
}

export function historyPayload(item) {
  const payload = item?.payload_json || item?.metadata || item?.payload || {};
  return payload && typeof payload === "object" ? payload : {};
}

export function historyType(item, payload) {
  return String(item?.event_type || item?.type || payload?.event || payload?.event_type || "EVENT");
}

export function historyWhen(item, formatDateTime) {
  const dt = item?.event_time || item?.created_at;
  return typeof formatDateTime === "function" ? formatDateTime(dt) : formatDetailDateTime(dt);
}

export function renderHistoryItem(item, idx, opts = {}) {
  const payload = historyPayload(item);
  const type = historyType(item, payload);
  const when = historyWhen(item, opts.formatDateTime);
  const ticket = opts.includeTicket
    ? String(
        payload?.ticket ||
        payload?.broker_trade_id ||
        payload?.brokerTradeId ||
        payload?.order_ticket ||
        "",
      ).trim()
    : "";
  const statusBadge = typeof opts.statusFromType === "function" ? opts.statusFromType(type) : null;

  return (
    <div key={`${item?.id || item?.event_id || item?.log_id || idx}`} style={{ margin: "0 0 10px 0", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="panel-label" style={{ margin: 0 }}>{type}</span>
          {statusBadge ? <span className={`badge ${statusBadge.cls}`}>{statusBadge.label}</span> : null}
        </div>
        <span className="minor-text">{when}</span>
      </div>
      {ticket ? <div className="minor-text" style={{ marginBottom: 8 }}>Ticket: <strong>{ticket}</strong></div> : null}
      <div className="json-table-wrapper">
        <pre className="minor-text" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {JSON.stringify(payload || {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}
