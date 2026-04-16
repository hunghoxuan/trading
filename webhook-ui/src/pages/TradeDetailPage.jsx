import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import TradeLevelChart from "../components/TradeLevelChart";

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "OK") return { cls: "OK", label: "PLACED" };
  if (s === "LOCKED") return { cls: "LOCKED", label: "LOCKED" };
  if (s === "START") return { cls: "START", label: "START" };
  if (s === "TP") return { cls: "TP", label: "TP" };
  if (s === "SL") return { cls: "SL", label: "SL" };
  return { cls: "OTHER", label: s || "UNKNOWN" };
}

export default function TradeDetailPage() {
  const { signalId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    api.trade(signalId)
      .then((res) => {
        if (!live) return;
        setData(res);
      })
      .catch((e) => {
        if (!live) return;
        setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [signalId]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="loading">Loading trade...</div>;

  const t = data.trade;
  const status = statusUi(t?.status);
  const orderTypeRaw = String(t?.raw_json?.order_type || t?.raw_json?.orderType || "limit").toUpperCase();
  const orderType = orderTypeRaw === "STOP" || orderTypeRaw === "MARKET" ? orderTypeRaw : "LIMIT";
  const events = Array.isArray(data.events) ? data.events : [];
  const getEventPayloadForDisplay = (ev) => {
    const payload = ev?.payload_json || {};
    const eventType = String(ev?.event_type || "");
    const isQueuedEvent = eventType.startsWith("QUEUED_");
    if (!isQueuedEvent) return payload;

    // Show original TradingView payload at the first NEW/queued event.
    return payload.raw_payload || t?.raw_json || payload;
  };
  return (
    <section>
      <p style={{ marginBottom: "1rem" }}><Link to="/trades">Back to trades</Link></p>
      <div className="panel">
        <div className="trade-grid two-cols">
          <div>Signal ID: {t.signal_id}</div>
          {t.ack_ticket && <div>Ticket: <strong>{t.ack_ticket}</strong></div>}
          <div>Status: <span className={`badge ${status.cls}`}>{status.label}</span></div>
          <div>Order Type: <span className="order-type-pill">{orderType}</span></div>
          <div>Symbol: {t.symbol}</div>
          <div>Action: {t.action}</div>
          <div>{t.volume} Lots { (t.risk_money_actual || t.risk_money_planned) ? `($${Number(t.risk_money_actual || t.risk_money_planned).toFixed(2)})` : ""}</div>
          <div>RR Planned: {t.rr_planned ?? "-"}</div>
          <div>Risk Planned: ${t.risk_money_planned ?? "-"}</div>
          <div>PnL Realized: <span style={{color: Number(t.pnl_money_realized) > 0 ? "#22c55e" : Number(t.pnl_money_realized) < 0 ? "#ef4444" : undefined}}>{t.pnl_money_realized != null ? `$${Number(t.pnl_money_realized).toFixed(2)}` : "-"}</span></div>
          <div>Created: {new Date(t.created_at).toLocaleString()}</div>
          <div>Note: {t.note || "-"}</div>
        </div>
      </div>

      {/* Broker Execution Telemetry — populated after EA ACK */}
      {(t.sl_pips || t.risk_money_actual) && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Execution Details</div>
          <div className="trade-grid two-cols" style={{ fontSize: "14px" }}>
            {t.volume != null && <div>Lots: <strong>{t.volume}</strong></div>}
            {t.pip_value_per_lot != null && <div>Pip Value / Lot: <strong>${Number(t.pip_value_per_lot).toFixed(4)}</strong></div>}
            {t.sl_pips != null && <div>SL Distance: <strong>{Number(t.sl_pips).toFixed(1)} pips</strong></div>}
            {t.tp_pips != null && <div>TP Distance: <strong>{Number(t.tp_pips).toFixed(1)} pips</strong></div>}
            {t.risk_money_actual != null && <div>Actual Risk: <strong style={{color:"#fb7185"}}>${Number(t.risk_money_actual).toFixed(2)}</strong></div>}
            {t.reward_money_planned != null && <div>Planned Reward: <strong style={{color:"#34d399"}}>${Number(t.reward_money_planned).toFixed(2)}</strong></div>}
            {t.risk_money_actual && t.reward_money_planned && (
              <div style={{gridColumn:"1/-1"}}>
                RR Actual: <strong>{(Number(t.reward_money_planned)/Number(t.risk_money_actual)).toFixed(2)}</strong>
                {" "}
                <span className="muted" style={{fontSize:"12px"}}>
                  (Risk ${Number(t.risk_money_actual).toFixed(2)} → Reward ${Number(t.reward_money_planned).toFixed(2)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <TradeLevelChart trade={data.chart} />

      <h2 style={{ marginTop: "2rem" }}>History</h2>
      <div style={{ marginTop: "1rem" }}>
        {events.length === 0 ? (
          <div className="muted">No events yet.</div>
        ) : (
          <div className="trade-list">
            {[...events].sort((a,b) => new Date(b.event_time) - new Date(a.event_time)).map((ev) => {
              const payload = getEventPayloadForDisplay(ev) || {};
              
              let eventStatusTxt = "";
              let eventStatusCls = "OTHER";
              const tType = String(ev.event_type || "");
              if (tType.startsWith("QUEUED_")) { eventStatusTxt = "NEW"; eventStatusCls = "OTHER"; }
              else if (tType === "EA_PULLED") { eventStatusTxt = "LOCKED"; eventStatusCls = "LOCKED"; }
              else if (tType.startsWith("EA_ACK_")) {
                 const rawStatus = tType.replace("EA_ACK_", "");
                 eventStatusTxt = rawStatus;
                 eventStatusCls = statusUi(rawStatus).cls;
              }
              else if (tType === "MANUAL_CANCEL") { eventStatusTxt = "CANCELED"; eventStatusCls = "OTHER"; }
              else if (tType === "EA_REQUEUE_CONNECTION") { eventStatusTxt = "NEW"; eventStatusCls = "OTHER"; }
              
              return (
                <article key={`${ev.id}-${ev.event_time}`} className="trade-card">
                  <div className="trade-head">
                    <strong style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {ev.event_type}
                      {eventStatusTxt && <span className={`badge ${eventStatusCls}`}>{eventStatusTxt}</span>}
                    </strong>
                    <span className="muted">{new Date(ev.event_time).toLocaleString()}</span>
                  </div>
                  <div className="json-table-wrapper" style={{ marginTop: '0.5rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', border: '1px solid #1e293b' }}>
                      <tbody>
                        {Object.entries(payload).map(([k, v]) => (
                          <tr key={k} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '4px 8px', color: '#94a3b8', width: '30%', borderRight: '1px solid #1e293b' }}>{k}</td>
                            <td style={{ padding: '4px 8px', wordBreak: 'break-all' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
