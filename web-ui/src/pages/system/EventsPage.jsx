import { useEffect, useState } from "react";
import { api } from "../../api";

const EVENT_LABELS = {
  trade_added: "Trade Added", trade_updated: "Trade Updated",
  signal_added: "Signal Added", broker_sync: "Broker Sync",
  news_alert: "News Alert", system_event: "System Event",
  page_refresh: "Page Refresh", component_refresh: "Component Refresh",
  error: "Error",
};

const SOUNDS = [
  { v: "", l: "Mute" }, { v: "NEW_SIGNAL", l: "New Signal" },
  { v: "TRADE_FILLED", l: "Trade Filled" }, { v: "TRADE_CLOSED", l: "Trade Closed" },
  { v: "NEWS_ALERT", l: "News Alert" }, { v: "SESSION_START", l: "Session Start" },
];

function useNotificationState() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testErr, setTestErr] = useState("");

  async function fire(overrides = {}) {
    try { setTestMsg(""); setTestErr(""); const res = await api.notificationTest(overrides); setTestMsg(`Sent: ${res.sent.event}`); setTimeout(() => setTestMsg(""), 3000); } catch (e) { setTestErr(e?.message || "Failed"); }
  }

  async function load() {
    try { setLoading(true); const data = await api.notificationEvents(); setEvents(data.events || []); } catch (e) { setError(e?.message); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    try { setSaving(true); const s = {}; events.forEach(ev => { s[ev.event] = { notification: ev.notification, console_log: ev.console_log, ticker: ev.ticker, refresh: ev.refresh, comp_refresh: ev.comp_refresh, sound: ev.sound, position: ev.position }; }); await api.notificationSaveSettings(s); setMsg("Saved."); setTimeout(() => setMsg(""), 3000); } catch (e) { setError(e?.message); } finally { setSaving(false); }
  }

  function toggle(idx, key) { setEvents(p => { const n = [...p]; n[idx] = { ...n[idx], [key]: !n[idx][key] }; return n; }); }
  function setField(idx, key, val) { setEvents(p => { const n = [...p]; n[idx] = { ...n[idx], [key]: val }; return n; }); }

  return { events, loading, saving, msg, error, testMsg, testErr, fire, load, save, toggle, setField };
}

function NotificationTable({ state }) {
  const { events, loading, saving, msg, error, testMsg, testErr, fire, load, save, toggle, setField } = state;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 12 }}>
        {msg && <span className="badge FILLED" style={{ padding: "4px 10px", fontSize: 11 }}>{msg}</span>}
        {error && <span className="badge SL" style={{ padding: "4px 10px", fontSize: 11 }}>{error}</span>}
        <button className="secondary-button" onClick={load} disabled={loading} style={{ fontSize: 11 }}>{loading ? "..." : "REFRESH"}</button>
        <button className="primary-button" onClick={save} disabled={saving} style={{ fontSize: 11 }}>{saving ? "..." : "💾 SAVE"}</button>
      </div>
      <div className="panel" style={{ padding: 0 }}>
        <table className="events-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>EVENT</th>
              <th style={{ width: 50, textAlign: "center" }}>TOAST</th>
              <th style={{ width: 50, textAlign: "center" }}>LOG</th>
              <th style={{ width: 50, textAlign: "center" }}>TICKER</th>
              <th style={{ width: 50, textAlign: "center" }}>REFR</th>
              <th style={{ width: 50, textAlign: "center" }}>C-REF</th>
              <th style={{ width: 110 }}>SOUND</th>
              <th style={{ width: 100 }}>POSITION</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} style={{ textAlign: "center", padding: 30 }} className="muted">Loading...</td></tr>}
            {!loading && events.map((ev, idx) => (
              <tr key={ev.event}>
                <td><span style={{ fontWeight: 700, fontSize: 12 }}>{EVENT_LABELS[ev.event] || ev.event}</span></td>
                <td style={{ textAlign: "center" }}><input type="checkbox" checked={ev.notification} onChange={() => toggle(idx, "notification")} /></td>
                <td style={{ textAlign: "center" }}><input type="checkbox" checked={ev.console_log} onChange={() => toggle(idx, "console_log")} /></td>
                <td style={{ textAlign: "center" }}><input type="checkbox" checked={ev.ticker} onChange={() => toggle(idx, "ticker")} /></td>
                <td style={{ textAlign: "center" }}><input type="checkbox" checked={ev.refresh} onChange={() => toggle(idx, "refresh")} /></td>
                <td style={{ textAlign: "center" }}><input type="checkbox" checked={ev.comp_refresh} onChange={() => toggle(idx, "comp_refresh")} /></td>
                <td><select value={ev.sound || ""} onChange={e => setField(idx, "sound", e.target.value || null)} style={{ fontSize: 10, width: "100%" }}>{SOUNDS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}</select></td>
                <td><select value={ev.position || "bottom-right"} onChange={e => setField(idx, "position", e.target.value)} style={{ fontSize: 10, width: "100%" }}><option value="bottom-right">Bottom-R</option><option value="bottom-left">Bottom-L</option><option value="top-right">Top-R</option><option value="top-left">Top-L</option></select></td>
                <td style={{ textAlign: "center" }}><button className="secondary-button" style={{ fontSize: 10, padding: "2px 5px" }} title="Test" onClick={() => fire({ event: ev.event, message: `Test: ${EVENT_LABELS[ev.event]}`, notification: ev.notification, console_log: ev.console_log, ticker: ev.ticker, comp_refresh: ev.comp_refresh, sound: ev.sound || undefined, position: ev.position })}>▶</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {testMsg && <div className="badge FILLED" style={{ padding: "4px 10px", margin: "6px 16px", fontSize: 11 }}>{testMsg}</div>}
        {testErr && <div className="badge SL" style={{ padding: "4px 10px", margin: "6px 16px", fontSize: 11 }}>{testErr}</div>}
      </div>
    </div>
  );
}

export default function EventsPage() {
  const state = useNotificationState();
  return (
    <div className="stack-layout fadeIn">
      <h2 className="page-title" style={{ marginBottom: 16 }}>NOTIFICATION</h2>
      <NotificationTable state={state} />
    </div>
  );
}

export function EventsPageContent() {
  const state = useNotificationState();
  return <NotificationTable state={state} />;
}
