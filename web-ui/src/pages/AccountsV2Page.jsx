import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const EMPTY_MSG = { type: "", text: "" };

function slugId(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function prettyMetadata(v) {
  try {
    return JSON.stringify(v || {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function AccountsV2Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(EMPTY_MSG);
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [rotatedKey, setRotatedKey] = useState("");
  const [form, setForm] = useState({
    account_id: "",
    user_id: "default",
    name: "",
    status: "ACTIVE",
    broker_id: "",
    balance: "",
    metadata_json: "{}",
  });

  const filtered = useMemo(() => {
    const needle = String(q || "").trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      String(r.account_id || "").toLowerCase().includes(needle)
      || String(r.user_id || "").toLowerCase().includes(needle)
      || String(r.name || "").toLowerCase().includes(needle)
      || String(r.broker_id || "").toLowerCase().includes(needle)
      || String(r.status || "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  async function loadData() {
    setLoading(true);
    try {
      const out = await api.v2Accounts();
      setRows(Array.isArray(out?.items) ? out.items : []);
      setMsg(EMPTY_MSG);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to load accounts" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setEditingId("");
    setCreatedKey("");
    setForm({
      account_id: "",
      user_id: "default",
      name: "",
      status: "ACTIVE",
      broker_id: "",
      balance: "",
      metadata_json: "{}",
    });
  }

  function onEdit(row) {
    setEditingId(String(row.account_id || ""));
    setCreatedKey("");
    setForm({
      account_id: String(row.account_id || ""),
      user_id: String(row.user_id || "default"),
      name: String(row.name || ""),
      status: String(row.status || "ACTIVE"),
      broker_id: String(row.broker_id || ""),
      balance: row.balance === null || row.balance === undefined ? "" : String(row.balance),
      metadata_json: prettyMetadata(row.metadata || {}),
    });
  }

  function parseMetadataInput(raw) {
    const txt = String(raw || "").trim();
    if (!txt) return {};
    try {
      const parsed = JSON.parse(txt);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("metadata must be a JSON object");
      }
      return parsed;
    } catch (e) {
      throw new Error(e?.message || "invalid metadata json");
    }
  }

  async function onSave() {
    setSaving(true);
    try {
      const accountId = String(form.account_id || "").trim() || slugId(form.name);
      if (!accountId) throw new Error("account_id is required");
      const payload = {
        account_id: accountId,
        user_id: String(form.user_id || "default").trim() || "default",
        name: String(form.name || "").trim() || accountId,
        status: String(form.status || "ACTIVE").trim() || "ACTIVE",
        broker_id: String(form.broker_id || "").trim() || null,
        balance: String(form.balance || "").trim() === "" ? null : Number(form.balance),
        metadata: parseMetadataInput(form.metadata_json),
      };

      if (editingId) {
        await api.v2UpdateAccount(editingId, payload);
        setMsg({ type: "success", text: "Account updated." });
      } else {
        const out = await api.v2CreateAccount(payload);
        setCreatedKey(String(out?.api_key_plaintext || ""));
        setMsg({ type: "success", text: "Account created." });
      }
      setRotatedKey("");
      await loadData();
      if (editingId) resetForm();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to save account" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2500);
    }
  }

  async function onToggleStatus(row) {
    try {
      setSaving(true);
      const nextStatus = String(row.status || "").toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await api.v2UpdateAccount(row.account_id, {
        user_id: row.user_id,
        name: row.name,
        status: nextStatus,
        broker_id: row.broker_id || null,
        balance: row.balance,
        metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
      });
      setMsg({ type: "success", text: `Account ${nextStatus}.` });
      await loadData();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to update account status" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2000);
    }
  }

  async function onRotateApiKey(row) {
    if (!window.confirm(`Rotate API key for account ${row.account_id}?`)) return;
    try {
      setSaving(true);
      const out = await api.v2RotateAccountApiKey(row.account_id);
      setRotatedKey(String(out?.api_key_plaintext || ""));
      setCreatedKey("");
      setMsg({ type: "warning", text: "API key rotated. Save this new key now." });
      await loadData();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to rotate API key" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack-layout fadeIn">
      <h2 className="page-title">Accounts V2</h2>

      <section className="panel">
        <div className="panel-label">CREATE / EDIT ACCOUNT</div>
        {msg?.text ? <div className={`form-message msg-${msg.type || "error"}`}>{msg.text}</div> : null}
        {createdKey ? <div className="form-message msg-warning">New API key (shown once): <code>{createdKey}</code></div> : null}
        {rotatedKey ? <div className="form-message msg-warning">Rotated API key (shown once): <code>{rotatedKey}</code></div> : null}

        <div className="stack-layout" style={{ gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="minor-text">Account ID</div>
              <input
                value={form.account_id}
                onChange={(e) => setForm((p) => ({ ...p, account_id: e.target.value }))}
                placeholder="e.g. icm_52836789"
                disabled={Boolean(editingId)}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="minor-text">User ID</div>
              <input value={form.user_id} onChange={(e) => setForm((p) => ({ ...p, user_id: e.target.value }))} placeholder="default" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="minor-text">Name</div>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Display name" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="minor-text">Status</div>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="PAUSED">PAUSED</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="minor-text">Broker ID</div>
              <input value={form.broker_id} onChange={(e) => setForm((p) => ({ ...p, broker_id: e.target.value }))} placeholder="optional" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="minor-text">Balance</div>
              <input value={form.balance} onChange={(e) => setForm((p) => ({ ...p, balance: e.target.value }))} placeholder="optional number" />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="minor-text">Metadata JSON</div>
            <textarea
              value={form.metadata_json}
              onChange={(e) => setForm((p) => ({ ...p, metadata_json: e.target.value }))}
              rows={4}
              placeholder='{"server":"ICM","group":"demo"}'
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="primary-button" onClick={onSave} disabled={saving || loading}>
              {saving ? "SAVING..." : (editingId ? "UPDATE ACCOUNT" : "CREATE ACCOUNT")}
            </button>
            {editingId ? <button className="secondary-button" onClick={resetForm} disabled={saving}>CANCEL EDIT</button> : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-label">ACCOUNT LIST</div>
        <div className="toolbar-group" style={{ marginBottom: 10 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search account/user/name..." style={{ maxWidth: 320 }} />
        </div>

        {loading ? <div className="minor-text">Loading...</div> : null}

        {!loading ? (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account ID</th>
                  <th>User</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Broker</th>
                  <th>Balance</th>
                  <th>API</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.account_id}>
                    <td>{row.account_id}</td>
                    <td>{row.user_id || "-"}</td>
                    <td>{row.name || "-"}</td>
                    <td><span className={`badge ${String(row.status || "").toUpperCase()}`}>{String(row.status || "-").toUpperCase()}</span></td>
                    <td>{row.broker_id || "-"}</td>
                    <td>{row.balance ?? "-"}</td>
                    <td>{row.api_key_last4 ? `****${row.api_key_last4}` : "-"}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button className="secondary-button" onClick={() => onEdit(row)} disabled={saving}>EDIT</button>
                      <button className="secondary-button" onClick={() => onRotateApiKey(row)} disabled={saving}>ROTATE KEY</button>
                      <button className="secondary-button" onClick={() => onToggleStatus(row)} disabled={saving}>
                        {String(row.status || "").toUpperCase() === "ACTIVE" ? "DEACTIVATE" : "ACTIVATE"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="muted">No accounts found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
