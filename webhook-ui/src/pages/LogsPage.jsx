import { useEffect, useState, useMemo } from "react";
import { api } from "../api";

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
    if (!window.confirm("CRITICAL: Delete ALL events/logs? This cannot be undone.")) return;
    try {
      setLoading(true);
      const res = await api.deleteEvents();
      window.alert(`Deleted ${res.deleted || 0} event(s).`);
      setPage(0);
      await loadEvents();
    } catch (err) {
      setError(err.message || "Failed to delete events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSymbols();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [query]);

  return (
    <section className="logs-page-container">
      <div className="logs-top-bar">
        <div className="logs-filters">
          <input 
            placeholder="Search Ticket, ID, Note..." 
            value={filter.q}
            onChange={e => { setFilter(f => ({ ...f, q: e.target.value })); setPage(0); }}
          />
          <select 
            value={filter.type}
            onChange={e => { setFilter(f => ({ ...f, type: e.target.value })); setPage(0); }}
          >
            <option value="">All Types</option>
            <option value="EA_SYNC_PUSH">EA_SYNC_PUSH</option>
            <option value="SIGNAL_NEW">SIGNAL_NEW</option>
            <option value="SIGNAL_ACK">SIGNAL_ACK</option>
            <option value="SIGNAL_UPDATE">SIGNAL_UPDATE</option>
            <option value="EA_PULLED">EA_PULLED</option>
            <option value="RECONCILE_START">RECONCILE_START</option>
            <option value="RECONCILE_PLACED">RECONCILE_PLACED</option>
          </select>
          <select 
            value={filter.symbol}
            onChange={e => { setFilter(f => ({ ...f, symbol: e.target.value })); setPage(0); }}
          >
            <option value="">All Symbols</option>
            {symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn-danger btn-xs" onClick={onDeleteAll}>Delete All Logs</button>
      </div>

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          <div className="panel-head">
            <h3>Event List</h3>
            <div className="pager-mini">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span>Page {page + 1}</span>
              <button disabled={events.length < limit} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
          
          {error && <div className="error">{error}</div>}
          {loading && <div className="loading">Syncing data...</div>}
          
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Context</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr 
                    key={ev.id} 
                    className={selectedEvent?.id === ev.id ? "active" : ""}
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <td className="small">{new Date(ev.event_time).toLocaleTimeString()}</td>
                    <td><span className={`badge-event ${ev.event_type}`}>{ev.event_type}</span></td>
                    <td className="small">
                      {ev.symbol || ev.signal_id}
                      {ev.ack_ticket ? <span className="ticket-tag">#{ev.ack_ticket}</span> : null}
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
                <h4>Event Details #{selectedEvent.id}</h4>
                <div className="muted small">{new Date(selectedEvent.event_time).toLocaleString()}</div>
              </div>
              <div className="detail-body">
                <div className="field">
                  <label>Type:</label>
                  <span>{selectedEvent.event_type}</span>
                </div>
                <div className="field">
                  <label>Signal ID:</label>
                  <span>{selectedEvent.signal_id}</span>
                </div>
                {selectedEvent.ack_ticket && (
                  <div className="field">
                    <label>Ticket:</label>
                    <span className="accent">#{selectedEvent.ack_ticket}</span>
                  </div>
                )}
                <div className="field">
                  <label>Symbol:</label>
                  <span>{selectedEvent.symbol || "N/A"}</span>
                </div>
                <div className="field-block">
                  <label>Payload (Full telemetry):</label>
                  <pre className="payload-box">
                    {JSON.stringify(selectedEvent.payload_json, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state muted">Select an entry to inspect full payload</div>
          )}
        </div>
      </div>
    </section>
  );
}
