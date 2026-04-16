import { useEffect, useState, useMemo } from "react";
import { api } from "../api";

function fDateTime(v) {
  if (!v) return "-";
  return new Date(v).toLocaleString(undefined, {
    year: '2-digit', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

const PAGE_SIZE_OPTIONS = [50, 100, 200];
const BULK_ACTIONS = ["", "Delete All Log"];

export default function LogsPage() {
  const [events, setEvents] = useState([]);
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [bulkAction, setBulkAction] = useState("");
  const [filter, setFilter] = useState({ q: "", type: "", symbol: "" });

  const query = useMemo(() => ({ 
    q: filter.q, 
    type: filter.type, 
    symbol: filter.symbol,
    limit: pageSize, 
    offset: page * pageSize 
  }), [filter, page, pageSize]);

  async function loadSymbols() {
    try {
      const data = await api.symbols();
      setSymbols(data.symbols || []);
    } catch { /* ignore */ }
  }

  async function loadEvents() {
    try {
      setLoading(true);
      const data = await api.events(query);
      setEvents(data.events || []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  async function onBulkOk() {
    if (bulkAction === "Delete All Log") {
       if (!window.confirm("CRITICAL: DELETE ALL EVENTS/LOGS?")) return;
       try {
         setLoading(true);
         await api.deleteEvents();
         setPage(0);
         await loadEvents();
       } catch (err) {
         setError(err.message);
       } finally {
         setLoading(false);
       }
    }
  }

  useEffect(() => { loadSymbols(); }, []);
  useEffect(() => { loadEvents(); }, [query]);

  return (
    <section className="logs-page-container">
      <div className="logs-top-bar">
        <div className="logs-top-left">
          <div className="pager-area">
            <strong>{events.length}</strong> RESULTS
            <div className="pager-mini">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>PREV</button>
              <span className="minor-text">PAGE {page + 1}</span>
              <button disabled={events.length < pageSize} onClick={() => setPage(p => p + 1)}>NEXT</button>
            </div>
            <select 
              className="minor-text" 
              style={{ padding: '0 4px', height: '22px', marginLeft: '10px' }}
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        </div>
        
        <div className="logs-filters">
          <input 
            placeholder="SEARCH TICKET, ID..." 
            value={filter.q}
            onChange={e => { setFilter(f => ({ ...f, q: e.target.value })); setPage(0); }}
            style={{ width: '180px' }}
          />
          <select value={filter.symbol} onChange={e => { setFilter(f => ({ ...f, symbol: e.target.value })); setPage(0); }}>
            <option value="">ALL SYMBOLS</option>
            {symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
            {BULK_ACTIONS.map(a => <option key={a} value={a}>{a || "BULK ACTION..."}</option>)}
          </select>
          <button type="button" onClick={onBulkOk} disabled={loading || !bulkAction}>OK</button>
        </div>
      </div>

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          {error && <div className="error">{error}</div>}
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>SYMBOL</th>
                  <th>EVENT TYPE</th>
                  <th>ID | TICKET</th>
                  <th>DATE TIME</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr 
                    key={ev.id} 
                    className={selectedEvent?.id === ev.id ? "active" : ""}
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <td><strong className="minor-text" style={{ color: 'var(--text)' }}>{ev.symbol || 'N/A'}</strong></td>
                    <td><span className="badge">{ev.event_type}</span></td>
                    <td>
                       <div className="cell-wrap">
                         <div className="minor-text">{ev.signal_id}</div>
                          {ev.ack_ticket && <div className="minor-text" style={{ color: 'var(--accent)' }}># {ev.ack_ticket}</div>}
                       </div>
                    </td>
                    <td><span className="minor-text">{fDateTime(ev.event_time)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="logs-detail-pane">
          {selectedEvent ? (
            <div className="event-detail-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div className="panel-label" style={{ margin: 0 }}>EVENT DETAILS #{selectedEvent.id}</div>
                <div className="minor-text">{fDateTime(selectedEvent.event_time)}</div>
              </div>
              <div className="json-table-wrapper" style={{ marginTop: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(selectedEvent.payload_json || {}).map(([k, v]) => (
                      <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="minor-text" style={{ padding: '8px 0', width: '30%', fontWeight: 700, color: 'var(--muted)' }}>{k}</td>
                        <td className="minor-text" style={{ padding: '8px 0', color: 'var(--text)' }}>
                          {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state minor-text">SELECT AN ENTRY TO INSPECT FULL PAYLOAD</div>
          )}
        </div>
      </div>
    </section>
  );
}
