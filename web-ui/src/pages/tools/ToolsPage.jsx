import { useState } from "react";
import { api } from "../../api";

export default function ToolsPage() {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function fire(overrides = {}) {
    try {
      setSending(true);
      setMsg("");
      setErr("");
      const res = await api.notificationTest(overrides);
      setMsg(`Sent: ${res.sent.event} — "${res.sent.message}"`);
      setTimeout(() => setMsg(""), 4000);
    } catch (e) {
      setErr(e?.message || "Failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="stack-layout fadeIn">
      <h2 className="page-title">🛠 TOOLS</h2>

      <div className="panel" style={{ padding: 20 }}>
        <div className="panel-label">NOTIFICATION TEST</div>
        <p className="minor-text" style={{ marginBottom: 16 }}>
          Fire test events to verify SSE stream and all notification channels.
        </p>

        {msg && <div className="badge FILLED" style={{ padding: "8px 14px", marginBottom: 12 }}>{msg}</div>}
        {err && <div className="badge SL" style={{ padding: "8px 14px", marginBottom: 12 }}>{err}</div>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button className="primary-button" disabled={sending} onClick={() => fire({
            event: "system_event",
            message: "🧪 All channels test — check ticker, console, toast",
            notification: true,
            console_log: true,
            ticker: true,
            sound: "NEW_SIGNAL",
          })}>
            🔔 ALL CHANNELS
          </button>

          <button className="secondary-button" disabled={sending} onClick={() => fire({
            event: "trade_added",
            message: "XAUUSD BUY signal received",
            notification: true,
            ticker: true,
            sound: "NEW_SIGNAL",
          })}>
            📈 TRADE ADDED
          </button>

          <button className="secondary-button" disabled={sending} onClick={() => fire({
            event: "trade_updated",
            message: "XAUUSD trade filled at 2650.50",
            ticker: true,
          })}>
            🔄 TRADE UPDATED
          </button>

          <button className="secondary-button" disabled={sending} onClick={() => fire({
            event: "broker_sync",
            message: "Broker sync completed — 42 positions",
            ticker: true,
          })}>
            🔁 BROKER SYNC
          </button>

          <button className="secondary-button" disabled={sending} onClick={() => fire({
            event: "news_alert",
            message: "NFP 10m warning — High impact",
            notification: true,
            ticker: true,
            sound: "NEWS_ALERT",
          })}>
            📰 NEWS ALERT
          </button>

          <button className="secondary-button" disabled={sending} onClick={() => fire({
            event: "error",
            message: "API timeout on TwelveData",
            type: "error",
            notification: true,
            console_log: true,
            ticker: true,
          })}>
            ❌ ERROR
          </button>

          <button className="danger-button" disabled={sending} onClick={() => fire({
            event: "page_refresh",
            message: "Config changed — refreshing...",
            page: "/tools",
            need_refresh: true,
          })}>
            🔄 PAGE REFRESH
          </button>
        </div>
      </div>
    </div>
  );
}
