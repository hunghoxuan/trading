import { useEffect, useState } from "react";
import { api } from "../../api";

const EVENT_LABELS = {
  trade_added: "Trade Added",
  trade_updated: "Trade Updated",
  signal_added: "Signal Added",
  broker_sync: "Broker Sync",
  news_alert: "News Alert",
  system_event: "System Event",
  page_refresh: "Page Refresh",
  component_refresh: "Component Refresh",
  error: "Error",
};

const SOUNDS = [
  { v: "", l: "Mute" },
  { v: "NEW_SIGNAL", l: "New Signal" },
  { v: "TRADE_FILLED", l: "Trade Filled" },
  { v: "TRADE_CLOSED", l: "Trade Closed" },
  { v: "NEWS_ALERT", l: "News Alert" },
  { v: "SESSION_START", l: "Session Start" },
];

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      const data = await api.notificationEvents();
      setEvents(data.events || []);
    } catch (e) {
      setError(e?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    try {
      setSaving(true);
      const settings = {};
      events.forEach((ev) => {
        settings[ev.event] = {
          notification: ev.notification,
          console_log: ev.console_log,
          ticker: ev.ticker,
          refresh: ev.refresh,
          comp_refresh: ev.comp_refresh,
          sound: ev.sound,
          position: ev.position,
        };
      });
      await api.notificationSaveSettings(settings);
      setMsg("Settings saved.");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function toggle(idx, key) {
    setEvents((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: !next[idx][key] };
      return next;
    });
  }

  function setField(idx, key, val) {
    setEvents((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  return (
    <div className="stack-layout fadeIn">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="page-title" style={{ margin: 0 }}>NOTIFICATION TOOLS</h2>
        <div style={{ display: "flex", gap: 10 }}>
          {msg && <span className="badge FILLED" style={{ padding: "6px 12px" }}>{msg}</span>}
          {error && <span className="badge SL" style={{ padding: "6px 12px" }}>{error}</span>}
          <button className="secondary-button" onClick={load} disabled={loading}>
            {loading ? "LOADING..." : "REFRESH"}
          </button>
          <button className="primary-button" onClick={save} disabled={saving}>
            {saving ? "SAVING..." : "💾 SAVE"}
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <table className="events-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>EVENT</th>
              <th style={{ width: 60, textAlign: "center" }}>TOAST</th>
              <th style={{ width: 60, textAlign: "center" }}>LOG</th>
              <th style={{ width: 60, textAlign: "center" }}>TICKER</th>
              <th style={{ width: 60, textAlign: "center" }}>REFRESH</th>
              <th style={{ width: 60, textAlign: "center" }}>C-REFRESH</th>
              <th style={{ width: 120 }}>SOUND</th>
              <th style={{ width: 110 }}>POSITION</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 40 }} className="muted">Loading...</td></tr>
            )}
            {!loading && events.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 40 }} className="muted">No events configured</td></tr>
            )}
            {!loading && events.map((ev, idx) => (
              <tr key={ev.event}>
                <td>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>
                    {EVENT_LABELS[ev.event] || ev.event}
                  </span>
                  <div className="minor-text" style={{ fontSize: 9 }}>
                    {ev.event}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" checked={ev.notification} onChange={() => toggle(idx, "notification")} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" checked={ev.console_log} onChange={() => toggle(idx, "console_log")} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" checked={ev.ticker} onChange={() => toggle(idx, "ticker")} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" checked={ev.refresh} onChange={() => toggle(idx, "refresh")} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" checked={ev.comp_refresh} onChange={() => toggle(idx, "comp_refresh")} />
                </td>
                <td>
                  <select
                    value={ev.sound || ""}
                    onChange={(e) => setField(idx, "sound", e.target.value || null)}
                    style={{ fontSize: 11, width: "100%" }}
                  >
                    {SOUNDS.map((s) => (
                      <option key={s.v} value={s.v}>{s.l}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={ev.position || "bottom-right"}
                    onChange={(e) => setField(idx, "position", e.target.value)}
                    style={{ fontSize: 11, width: "100%" }}
                  >
                    <option value="bottom-right">Bottom-Right</option>
                    <option value="bottom-left">Bottom-Left</option>
                    <option value="top-right">Top-Right</option>
                    <option value="top-left">Top-Left</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
