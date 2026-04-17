import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const EMPTY_MSG = { type: "", text: "" };

/**
 * Modern Brokers Management Page for high-density institutional data auditing.
 */
export default function BrokersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(EMPTY_MSG);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = String(q || "").trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      String(r.broker_id || "").toLowerCase().includes(needle)
      || String(r.name || "").toLowerCase().includes(needle)
      || String(r.broker_type || "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  async function loadData() {
    setLoading(true);
    try {
      const [bOut, aOut] = await Promise.all([
        api.v2Brokers(),
        api.v2Accounts()
      ]);
      const brokers = Array.isArray(bOut?.items) ? bOut.items : [];
      const accounts = Array.isArray(aOut?.items) ? aOut.items : [];
      
      const enriched = brokers.map(b => ({
        ...b,
        bound_accounts: accounts.filter(acc => acc.broker_id === b.broker_id)
      }));

      setRows(enriched);
      setMsg(EMPTY_MSG);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to load brokers" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function formatTime(iso) {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString([], {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  }

  function isOnline(lastSeen) {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 65000; // Heartbeat expect < 60s
  }

  return (
    <div className="stack-layout fadeIn">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="page-title">Broker Registry</h2>
        <button className="primary-button" onClick={loadData} disabled={loading}>REFRESH</button>
      </div>

      <section className="panel">
        <div className="panel-label">ACTIVE BROKERS / EXECUTORS</div>
        {msg?.text ? <div className={`form-message msg-${msg.type || "error"}`}>{msg.text}</div> : null}

        <div className="toolbar-group" style={{ marginBottom: 15 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search broker id, name, or type..."
            style={{ maxWidth: 400 }}
          />
        </div>

        {loading ? <div className="minor-text">Loading executors...</div> : null}

        {!loading ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Broker ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Bound Accounts</th>
                  <th>Last Seen</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.broker_id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className={`status-dot ${isOnline(row.last_seen_at) ? "online" : "offline"}`} />
                        <span className="minor-text" style={{ fontSize: '10px' }}>{isOnline(row.last_seen_at) ? "ONLINE" : "OFFLINE"}</span>
                      </div>
                    </td>
                    <td><code style={{ fontSize: "0.80rem" }}>{row.broker_id}</code></td>
                    <td><strong style={{ color: "var(--color-ui-fg)" }}>{row.name}</strong></td>
                    <td><span className="badge NEUTRAL">{row.broker_type || "MT5_EA"}</span></td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {row.bound_accounts?.map(acc => (
                          <span key={acc.account_id} className="acc-tag">{acc.account_id}</span>
                        )) || "-"}
                        {(!row.bound_accounts || row.bound_accounts.length === 0) && <span className="muted">-</span>}
                      </div>
                    </td>
                    <td className="minor-text monospace">{formatTime(row.last_seen_at)}</td>
                    <td className="minor-text monospace">{formatTime(row.created_at)}</td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted" style={{ textAlign: "center", padding: "40px 0" }}>
                      No brokers registered. Brokers appear here after their first heartbeat.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.online { background: #00e5b0; box-shadow: 0 0 8px rgba(0, 229, 176, 0.4); }
        .status-dot.offline { background: #666; }
        .acc-tag { background: rgba(0, 150, 255, 0.1); color: #0096ff; border: 1px solid rgba(0, 150, 255, 0.2); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-family: monospace; }
      `}} />
    </div>
  );
}
