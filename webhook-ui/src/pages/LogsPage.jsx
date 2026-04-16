import { useEffect, useState, useMemo } from "react";
import { api } from "../api";

function fmtDateTime(v) {
  if (!v) return "-";
  return new Date(v).toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export default function LogsPage() {
  const [events, setEvents] = useState([]);
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState({ q: "", type: "", symbol: "" });
  const limit = 50;

  const query = useMemo(() => ({ 
    q: filter.q, 
    type: filter.type, 
    symbol: filter.symbol,
    limit, 
    offset: page * limit 
  }), [filter, page]);

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

  async function onDeleteAll() {
    if (!window.confirm("CRITICAL: DELETE ALL EVENTS/LOGS? THIS CANNOT BE UNDONE.")) return;
    try {
      setLoading(true);
      const res = await api.deleteEvents();
      window.alert(`DELETED ${res.deleted || 0} EVENT(S).`);
      setPage(0);
      await loadEvents();
    } catch (err) {
      setError(err.message || "Failed to delete events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSymbols(); }, []);
  useEffect(() => { loadEvents(); }, [query]);

  return (
    <section className="logs-page-container">
      <div className="logs-top-bar">
        <div className="logs-top-left">
          <div className="muted small"><strong>{events.length}</strong> EVENTS</div>
          <div className="pager-mini">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>PREV</button>
            <span>PAGE {page + 1}</span>
            <button disabled={events.length < limit} onClick={() => setPage(p => p + 1)}>NEXT</button>
          </div>
        </div>
        
        <div className="logs-filters">
          <input 
            placeholder="SEARCH TICKET, ID, NOTE..." 
            value={filter.q}
            onChange={e => { setFilter(f => ({ ...f, q: e.target.value })); setPage(0); }}
            style={{ width: '220px' }}
          />
          <select value={filter.type} onChange={e => { setFilter(f => ({ ...f, type: e.target.value })); setPage(0); }}>
            <option value="">ALL TYPES</option>
            <option value="EA_SYNC_PUSH">EA_SYNC_PUSH</option>
            <option value="SIGNAL_NEW">SIGNAL_NEW</option>
            <option value="SIGNAL_ACK">SIGNAL_ACK</option>
            <option value="EA_PULLED">EA_PULLED</option>
            <option value="RECONCILE_START">RECONCILE_START</option>
          </select>
          <select value={filter.symbol} onChange={e => { setFilter(f => ({ ...f, symbol: e.target.value })); setPage(0); }}>
            <option value="">ALL SYMBOLS</option>
            {symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn-danger btn-xs" onClick={onDeleteAll}>DELETE ALL LOGS</button>
        </div>
      </div>

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          {error && <div className="error">{error}</div>}
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>TIME / CONTEXT</th>
                  <th>TYPE / ID</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr 
                    key={ev.id} 
                    className={selectedEvent?.id === ev.id ? "active" : ""}
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <td>
                      <div className="cell-wrap">
                        <div className="cell-major">{fmtDateTime(ev.event_time)}</div>
                        <div className="cell-minor">{ev.symbol || 'NO SYMBOL'} {ev.ack_ticket ? `(#${ev.ack_ticket})` : ''}</div>
                      </div>
                    </td>
                    <td>
                      <div className="cell-wrap">
                        <div className="cell-major"><span className="badge">{ev.event_type}</span></div>
                        <div className="cell-minor">{ev.signal_id}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="logs-detail-pane">
          {selectedEvent ? (
            <div className="event-detail-card">
              <div className="detail-header">
                <h3>EVENT DETAILS #{selectedEvent.id}</h3>
                <div className="muted small">{fmtDateTime(selectedEvent.event_time)}</div>
              </div>
              <div className="detail-body" style={{ marginTop: '20px' }}>
                <pre className="payload-box">
                  {JSON.stringify(selectedEvent.payload_json, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="empty-state muted">SELECT AN ENTRY TO INSPECT FULL PAYLOAD</div>
          )}
        </div>
      </div>
    </section>
  );
}
