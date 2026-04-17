import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "FILLED" || s === "OPEN") return { cls: "ACTIVE", label: s };
  if (s === "CLOSED" || s === "CANCELLED") return { cls: "INACTIVE", label: s };
  if (s === "ERROR") return { cls: "FAIL", label: s };
  return { cls: "OTHER", label: s || "PENDING" };
}

function fDateTime(v) {
  if (!v) return "-";
  return new Date(v).toLocaleString(undefined, {
    year: '2-digit', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export default function TradeDetailPage() {
  const { tradeId } = useParams();
  const [trade, setTrade] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // We lack a direct api.v2Trade(tradeId) so we fetch from the list or events
        // Actually api.v2TradeEvents(tradeId) is available.
        const evs = await api.v2TradeEvents(tradeId);
        setEvents(evs || []);
        
        // Find the trade object from the first event payload or fetch list
        // For now, if no direct getter, we might need one or find it in list.
        // I'll assume server.js has /v2/trades/:id but if not I'll just show events.
        const data = await api.v2Trades({ q: tradeId });
        if (data.items?.length > 0) {
          setTrade(data.items[0]);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tradeId]);

  if (loading) return <div className="loading">Loading trade {tradeId}...</div>;
  if (error) return <div className="error">{error}</div>;

  const t = trade || {};
  const status = statusUi(t.execution_status);

  return (
    <section className="stack-layout" style={{ gap: 20 }}>
      <div>
        <Link to="/trades" className="minor-text">← BACK TO TRADES</Link>
      </div>

      <div className="panel trade-detail-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>
              <span className={t.side === 'BUY' ? 'side-buy' : 'side-sell'}>{t.side}</span> {t.symbol}
            </h1>
            <div className="minor-text" style={{ marginTop: 4 }}>ID: {t.trade_id}</div>
          </div>
          <div className={`badge ${status.cls}`} style={{ padding: '8px 16px', fontSize: '14px' }}>
            {status.label}
          </div>
        </div>

        <div className="trade-grid three-cols" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div className="detail-item">
            <div className="muted small">ACCOUNT</div>
            <div style={{ fontWeight: 600 }}>{t.account_id}</div>
          </div>
          <div className="detail-item">
            <div className="muted small">SOURCE</div>
            <div style={{ fontWeight: 600 }}>{t.source_id}</div>
          </div>
          <div className="detail-item">
            <div className="muted small">INTENT</div>
            <div style={{ fontWeight: 600 }}>{t.intent_entry || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="muted small">SL / TP</div>
            <div style={{ fontWeight: 600 }}>{t.intent_sl || '-'} / {t.intent_tp || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="muted small">PNL</div>
            <div className={Number(t.pnl_realized) >= 0 ? 'money-pos' : 'money-neg'} style={{ fontWeight: 800 }}>
              {t.pnl_realized != null ? `$${Number(t.pnl_realized).toFixed(2)}` : '-'}
            </div>
          </div>
          <div className="detail-item">
            <div className="muted small">CREATED</div>
            <div className="minor-text">{fDateTime(t.created_at)}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-label">EXECUTION LOGS</div>
        {events.length === 0 ? (
          <div className="empty-state minor-text">No execution events recorded.</div>
        ) : (
          <div className="stack-layout" style={{ gap: 10, marginTop: 10 }}>
            {events.map((ev) => (
              <div key={ev.event_id} className="panel" style={{ margin: 0, padding: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="panel-label" style={{ margin: 0 }}>{ev.event_type}</span>
                  <span className="minor-text">{fDateTime(ev.event_time)}</span>
                </div>
                <div className="json-table-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {Object.entries(ev.payload_json || {}).map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="minor-text" style={{ padding: '6px 0', width: '30%', fontWeight: 700 }}>{k.toUpperCase()}</td>
                          <td className="minor-text" style={{ padding: '6px 0' }}>
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
