import { useEffect, useState } from "react";
import { api } from "../api";

export default function LogsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [page, setPage] = useState(0);
  const limit = 50;

  async function loadEvents() {
    try {
      setLoading(true);
      const data = await api.events({ limit, offset: page * limit });
      setEvents(data.events || []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [page]);

  return (
    <section className="logs-page-container">
      <div className="logs-layout">
        <div className="logs-list-pane">
          <div className="panel-head">
            <h3>System & Signal Events</h3>
            <div className="pager-mini">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
              <span>Page {page + 1}</span>
              <button disabled={events.length < limit} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
          
          {error && <div className="error">{error}</div>}
          {loading && <div className="loading">Loading logs...</div>}
          
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Signal / Symbol</th>
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
                    <td className="small">{ev.signal_id} <span className="muted">({ev.symbol || "-"})</span></td>
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
                <div className="field">
                  <label>Symbol:</label>
                  <span>{selectedEvent.symbol || "N/A"}</span>
                </div>
                <div className="field-block">
                  <label>Payload:</label>
                  <pre className="payload-box">
                    {JSON.stringify(selectedEvent.payload_json, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state muted">Select an event to view details</div>
          )}
        </div>
      </div>
    </section>
  );
}
