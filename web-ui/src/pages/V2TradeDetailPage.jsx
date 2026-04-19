import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { TradeSignalChart } from "../components/TradeSignalChart";

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "FILLED") return { cls: "ACTIVE", label: "FILLED" };
  if (s === "OPEN") return { cls: "ACTIVE", label: "OPEN" };
  if (s === "CLOSED" || s === "CANCELLED") return { cls: "INACTIVE", label: s };
  if (s === "ERROR") return { cls: "FAIL", label: s };
  return { cls: "OTHER", label: s || "PENDING" };
}

function brokerTicketOf(t) {
  return String(t?.broker_trade_id || t?.ticket || "").trim() || "-";
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
        const evs = await api.v2TradeEvents(tradeId);
        setEvents(evs?.items || []);
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
  
  const asPrice = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  return (
    <section className="stack-layout" style={{ gap: 20 }}>
      <div>
        <Link to="/trades" className="minor-text">← BACK TO TRADES</Link>
      </div>

      <div className="panel trade-detail-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>
              <span className={t.action === 'BUY' ? 'side-buy' : 'side-sell'}>{t.action}</span> {t.symbol}
            </h1>
            <div className="minor-text" style={{ marginTop: 4 }}>ID: {t.trade_id}</div>
            <div className="minor-text" style={{ marginTop: 2 }}>Ticket: {brokerTicketOf(t)}</div>
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
            <div className="muted small">BROKER TICKET</div>
            <div style={{ fontWeight: 600 }}>{brokerTicketOf(t)}</div>
          </div>
          <div className="detail-item">
            <div className="muted small">ENTRY</div>
            <div style={{ fontWeight: 600 }}>{t.entry || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="muted small">SL / TP</div>
            <div style={{ fontWeight: 600 }}>{t.sl || '-'} / {t.tp || '-'}</div>
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
        <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Execution Context</div>
        <TradeSignalChart 
          symbol={t.symbol} 
          interval={t.signal_tf || t.chart_tf || "1h"} 
          live={true}
          entryPrice={asPrice(t.entry)}
          slPrice={asPrice(t.sl)}
          tpPrice={asPrice(t.tp)}
        />
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
