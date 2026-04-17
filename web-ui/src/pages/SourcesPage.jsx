import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const KIND_OPTIONS = ["tv", "api", "manual", "bot"];
const AUTH_OPTIONS = ["token", "api_key", "signature", "none"];

function slugId(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function SourcesPage() {
  const EMPTY_MSG = { type: "", text: "" };
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(EMPTY_MSG);
  const [q, setQ] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [sourceEvents, setSourceEvents] = useState([]);
  const [rotatedSecret, setRotatedSecret] = useState("");

  const [form, setForm] = useState({
    source_id: "",
    name: "",
    kind: "api",
    auth_mode: "token",
    is_active: true,
  });
  const [editingId, setEditingId] = useState("");

  const filtered = useMemo(() => {
    const needle = String(q || "").trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      String(r.source_id || "").toLowerCase().includes(needle)
      || String(r.name || "").toLowerCase().includes(needle)
      || String(r.kind || "").toLowerCase().includes(needle)
      || String(r.auth_mode || "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  async function loadData() {
    setLoading(true);
    try {
      const out = await api.v2Sources();
      const items = Array.isArray(out?.items) ? out.items : [];
      setRows(items);
      if (!selectedSourceId && items.length > 0) {
        setSelectedSourceId(String(items[0].source_id || ""));
      }
      setMsg(EMPTY_MSG);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to load sources" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function loadSourceEvents(sourceId) {
    const sid = String(sourceId || "").trim();
    if (!sid) {
      setSourceEvents([]);
      return;
    }
    try {
      const out = await api.v2SourceEvents(sid, 50);
      setSourceEvents(Array.isArray(out?.items) ? out.items : []);
    } catch {
      setSourceEvents([]);
    }
  }

  useEffect(() => {
    if (selectedSourceId) loadSourceEvents(selectedSourceId);
    else setSourceEvents([]);
  }, [selectedSourceId]);

  function resetForm() {
    setEditingId("");
    setForm({ source_id: "", name: "", kind: "api", auth_mode: "token", is_active: true });
  }

  function onEdit(row) {
    setEditingId(String(row.source_id || ""));
    setForm({
      source_id: String(row.source_id || ""),
      name: String(row.name || ""),
      kind: String(row.kind || "api"),
      auth_mode: String(row.auth_mode || "token"),
      is_active: Boolean(row.is_active),
    });
  }

  async function onSave() {
    const name = String(form.name || "").trim();
    if (!name) {
      setMsg({ type: "error", text: "Source name is required." });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.v2UpdateSource(editingId, {
          name,
          kind: String(form.kind || "api"),
          auth_mode: String(form.auth_mode || "token"),
          is_active: Boolean(form.is_active),
        });
        setMsg({ type: "success", text: "Source updated." });
      } else {
        const sourceId = String(form.source_id || "").trim() || slugId(name);
        if (!sourceId) {
          setMsg({ type: "error", text: "source_id is required or derivable from name." });
          setSaving(false);
          return;
        }
        await api.v2CreateSource({
          source_id: sourceId,
          name,
          kind: String(form.kind || "api"),
          auth_mode: String(form.auth_mode || "token"),
          is_active: Boolean(form.is_active),
        });
        setMsg({ type: "success", text: "Source created." });
      }
      await loadData();
      resetForm();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to save source" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2200);
    }
  }

  async function onToggleActive(row) {
    try {
      setSaving(true);
      await api.v2UpdateSource(row.source_id, {
        name: row.name,
        kind: row.kind,
        auth_mode: row.auth_mode,
        is_active: !Boolean(row.is_active),
      });
      setMsg({ type: "success", text: "Source state updated." });
      await loadData();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to update source" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2200);
    }
  }

  async function onRotateSecret(row) {
    if (!window.confirm(`Rotate auth secret for source ${row.source_id}?`)) return;
    try {
      setSaving(true);
      const out = await api.v2RotateSourceSecret(row.source_id);
      setRotatedSecret(String(out?.source_secret_plaintext || ""));
      setSelectedSourceId(String(row.source_id || ""));
      setMsg({ type: "warning", text: "Source secret rotated. Save this secret now." });
      await loadData();
      await loadSourceEvents(row.source_id);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to rotate source secret" });
    } finally {
      setSaving(false);
    }
  }

  async function onRevokeSecret(row) {
    if (!window.confirm(`Revoke auth secret for source ${row.source_id}?`)) return;
    try {
      setSaving(true);
      await api.v2RevokeSourceSecret(row.source_id);
      setRotatedSecret("");
      setSelectedSourceId(String(row.source_id || ""));
      setMsg({ type: "warning", text: "Source secret revoked." });
      await loadData();
      await loadSourceEvents(row.source_id);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to revoke source secret" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2200);
    }
  }

  return (
    <div className="stack-layout fadeIn">
      <h2 className="page-title">Sources</h2>

      <section className="panel">
        <div className="panel-label">CREATE / EDIT SOURCE</div>
        {msg?.text ? <div className={`form-message msg-${msg.type || "error"}`}>{msg.text}</div> : null}
        <div className="stack-layout" style={{ gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="minor-text">Source ID</div>
            <input
              value={form.source_id}
              onChange={(e) => setForm((p) => ({ ...p, source_id: e.target.value }))}
              placeholder="e.g. tradingview_main"
              disabled={Boolean(editingId)}
              style={{ maxWidth: 420 }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="minor-text">Name</div>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Display name"
              style={{ maxWidth: 420 }}
            />
          </label>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="minor-text">Kind</div>
              <select value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
                {KIND_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="minor-text">Auth Mode</div>
              <select value={form.auth_mode} onChange={(e) => setForm((p) => ({ ...p, auth_mode: e.target.value }))}>
                {AUTH_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              />
              <span className="minor-text">Active</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary-button" onClick={onSave} disabled={saving || loading}>
              {saving ? "SAVING..." : (editingId ? "UPDATE SOURCE" : "CREATE SOURCE")}
            </button>
            {editingId ? (
              <button className="secondary-button" onClick={resetForm} disabled={saving}>CANCEL EDIT</button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-label">SOURCE LIST</div>
        <div className="toolbar-group" style={{ marginBottom: 10 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search source id/name..."
            style={{ maxWidth: 320 }}
          />
        </div>

        {loading ? <div className="minor-text">Loading...</div> : null}

        {!loading ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source ID</th>
                  <th>Name</th>
                  <th>Kind</th>
                  <th>Auth</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.source_id} className={selectedSourceId === row.source_id ? "active" : ""}>
                    <td>{row.source_id}</td>
                    <td>{row.name || "-"}</td>
                    <td>{row.kind || "-"}</td>
                    <td>{row.auth_mode || "-"}</td>
                    <td>
                      <span className={`badge ${row.is_active ? "ACTIVE" : "INACTIVE"}`}>
                        {row.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button className="secondary-button" onClick={() => onEdit(row)} disabled={saving}>EDIT</button>
                      <button className="secondary-button" onClick={() => { setSelectedSourceId(String(row.source_id || "")); }} disabled={saving}>EVENTS</button>
                      <button className="secondary-button" onClick={() => onRotateSecret(row)} disabled={saving}>ROTATE SECRET</button>
                      <button className="danger-button" onClick={() => onRevokeSecret(row)} disabled={saving}>REVOKE SECRET</button>
                      <button className="secondary-button" onClick={() => onToggleActive(row)} disabled={saving}>
                        {row.is_active ? "DEACTIVATE" : "ACTIVATE"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">No sources found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-label">SOURCE AUTH & AUDIT</div>
        {rotatedSecret ? (
          <div className="form-message msg-warning" style={{ maxWidth: 1100 }}>
            New source secret (shown once): <code>{rotatedSecret}</code>
          </div>
        ) : null}
        <div className="minor-text" style={{ marginTop: 8 }}>
          Selected source: <strong>{selectedSourceId || "-"}</strong>
        </div>
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {sourceEvents.map((ev) => (
                <tr key={ev.event_id}>
                  <td>{String(ev.event_time || "-")}</td>
                  <td>{String(ev.event_type || "-")}</td>
                  <td><code>{JSON.stringify(ev.payload_json || {})}</code></td>
                </tr>
              ))}
              {sourceEvents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">No source events.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
