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
          <div>Status: <span className={`badge ${status.cls}`}>{status.label}</span></div>
          <div>Order Type: <span className="order-type-pill">{orderType}</span></div>
          <div>Symbol: {t.symbol}</div>
          <div>Action: {t.action}</div>
          <div>Volume: {t.volume}</div>
          <div>RR Planned: {t.rr_planned ?? "-"}</div>
          <div>Risk Money Planned: {t.risk_money_planned ?? "-"}</div>
          <div>PnL Realized: {t.pnl_money_realized ?? "-"}</div>
          <div>Created: {new Date(t.created_at).toLocaleString()}</div>
          <div>Note: {t.note || "-"}</div>
        </div>
      </div>

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
              const tType = String(ev.event_type || "");
              if (tType.startsWith("QUEUED_")) eventStatusTxt = "new";
              else if (tType === "EA_PULLED") eventStatusTxt = "ok";
              else if (tType.startsWith("EA_ACK_")) eventStatusTxt = tType.replace("EA_ACK_", "").toLowerCase();
              else if (tType === "MANUAL_CANCEL") eventStatusTxt = "canceled";
              else if (tType === "EA_REQUEUE_CONNECTION") eventStatusTxt = "new";
              
              const statusDisplay = eventStatusTxt ? ` [${eventStatusTxt}]` : "";
              
              return (
                <article key={`${ev.id}-${ev.event_time}`} className="trade-card">
                  <div className="trade-head">
                    <strong>
                      {ev.event_type}
                      <span style={{ color: "#4ade80", fontWeight: "normal", marginLeft: "4px" }}>{statusDisplay}</span>
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
