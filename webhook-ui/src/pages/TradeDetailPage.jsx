import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import TradeLevelChart from "../components/TradeLevelChart";

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
      <p><Link to="/trades">Back to trades</Link></p>
      <h1>Trade Detail</h1>
      <div className="panel">
        <div className="trade-grid two-cols">
          <div>Signal ID: {t.signal_id}</div>
          <div>Status: <span className={`badge ${t.status}`}>{t.status}</span></div>
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

      <h2>Trade Visual (Levels)</h2>
      <TradeLevelChart trade={data.chart} />

      <h2>Event Timeline</h2>
      <div className="panel">
        {events.length === 0 ? (
          <div className="muted">No events yet.</div>
        ) : (
          <div className="trade-list">
            {events.map((ev) => (
              <article key={`${ev.id}-${ev.event_time}`} className="trade-card">
                <div className="trade-head">
                  <strong>{ev.event_type}</strong>
                  <span className="muted">{new Date(ev.event_time).toLocaleString()}</span>
                </div>
                <div className="muted">
                  {JSON.stringify(getEventPayloadForDisplay(ev) || {})}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
