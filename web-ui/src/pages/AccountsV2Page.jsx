import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const BULK_ACTIONS = ["", "Archive Selected", "Rotate API Key", "Toggle Active"];

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

function toDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString(undefined, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AccountsV2Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [msg, setMsg] = useState(EMPTY_MSG);
  const [bulkAction, setBulkAction] = useState("");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [subs, setSubs] = useState([]);
  const [trades, setTrades] = useState([]);

  const [editingId, setEditingId] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [rotatedKey, setRotatedKey] = useState("");
  const [form, setForm] = useState({
    account_id: "",
    user_id: "default",
    name: "",
    status: "ACTIVE",
    balance: "",
    metadata_json: "{}",
  });

  const filtered = useMemo(() => {
    const needle = String(q || "").trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && String(r.status || "").toUpperCase() !== statusFilter) return false;
      if (userFilter && String(r.user_id || "") !== userFilter) return false;
      if (!needle) return true;
      return (
        String(r.account_id || "").toLowerCase().includes(needle)
        || String(r.user_id || "").toLowerCase().includes(needle)
        || String(r.name || "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, statusFilter, userFilter]);

  const userOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => String(r.user_id || "")).filter(Boolean))).sort();
  }, [rows]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.max(1, Math.min(page, pages));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedAccount = useMemo(
    () => rows.find((r) => String(r.account_id) === String(selectedAccountId)) || null,
    [rows, selectedAccountId],
  );
  useEffect(() => {
    if (!selectedAccount || editingId) return;
    setForm({
      account_id: String(selectedAccount.account_id || ""),
      user_id: String(selectedAccount.user_id || "default"),
      name: String(selectedAccount.name || ""),
      status: String(selectedAccount.status || "ACTIVE"),
      balance: selectedAccount.balance === null || selectedAccount.balance === undefined ? "" : String(selectedAccount.balance),
      metadata_json: prettyMetadata(selectedAccount.metadata || {}),
    });
  }, [selectedAccount, editingId]);

  async function loadAccounts() {
    setLoading(true);
    try {
      const out = await api.v2Accounts();
      const items = Array.isArray(out?.items) ? out.items : [];
      setRows(items);
      if (!selectedAccountId && items.length > 0) {
        setSelectedAccountId(String(items[0].account_id || ""));
      }
      setMsg(EMPTY_MSG);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to load accounts" });
    } finally {
      setLoading(false);
    }
  }

  async function loadAccountDetail(accountId) {
    const aid = String(accountId || "").trim();
    if (!aid) {
      setSubs([]);
      setTrades([]);
      return;
    }
    setDetailLoading(true);
    try {
      const [sData, tData] = await Promise.all([
        api.v2GetSubscriptions(aid),
        api.v2Trades({ account_id: aid, pageSize: 10, page: 1 }),
      ]);
      setSubs(Array.isArray(sData?.items) ? sData.items : []);
      setTrades(Array.isArray(tData?.items) ? tData.items : []);
    } catch {
      setSubs([]);
      setTrades([]);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { setPage(1); }, [q, statusFilter, userFilter, pageSize]);
  useEffect(() => {
    if (!selectedAccountId) return;
    loadAccountDetail(selectedAccountId);
  }, [selectedAccountId]);

  function parseMetadataInput(raw) {
    const txt = String(raw || "").trim();
    if (!txt) return {};
    const parsed = JSON.parse(txt);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("metadata must be a JSON object");
    }
    return parsed;
  }

  function resetForm() {
    setEditingId("");
    setCreatedKey("");
    setForm({ account_id: "", user_id: "default", name: "", status: "ACTIVE", balance: "", metadata_json: "{}" });
  }

  function onEdit(row) {
    setEditingId(String(row.account_id || ""));
    setCreatedKey("");
    setForm({
      account_id: String(row.account_id || ""),
      user_id: String(row.user_id || "default"),
      name: String(row.name || ""),
      status: String(row.status || "ACTIVE"),
      balance: row.balance === null || row.balance === undefined ? "" : String(row.balance),
      metadata_json: prettyMetadata(row.metadata || {}),
    });
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
        balance: String(form.balance || "").trim() === "" ? null : Number(form.balance),
        metadata: parseMetadataInput(form.metadata_json),
      };

      if (editingId) {
        await api.v2UpdateAccount(editingId, payload);
        setMsg({ type: "success", text: "Account updated." });
      } else {
        const out = await api.v2CreateAccount(payload);
        setSelectedAccountId(accountId);
        setCreatedKey(String(out?.api_key_plaintext || ""));
        setMsg({ type: "success", text: "Account created." });
      }

      setRotatedKey("");
      await loadAccounts();
      await loadAccountDetail(accountId);
      if (editingId) resetForm();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to save account" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2200);
    }
  }

  async function onRotateApiKey(row) {
    if (!window.confirm(`Rotate API key for account ${row.account_id}?`)) return;
    setSaving(true);
    try {
      const out = await api.v2RotateAccountApiKey(row.account_id);
      setCreatedKey("");
      setRotatedKey(String(out?.api_key_plaintext || ""));
      setMsg({ type: "warning", text: "API key rotated. Save this value now." });
      await loadAccounts();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to rotate API key" });
    } finally {
      setSaving(false);
    }
  }

  async function onToggleStatus(row, nextStatus = String(row.status || "").toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE") {
    setSaving(true);
    try {
      await api.v2UpdateAccount(row.account_id, {
        user_id: row.user_id,
        name: row.name,
        status: nextStatus,
        balance: row.balance,
        metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
      });
      setMsg({ type: "success", text: `Account ${nextStatus}.` });
      await loadAccounts();
      await loadAccountDetail(row.account_id);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to update account status" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2200);
    }
  }

  async function onArchiveAccount(row) {
    if (!window.confirm(`Archive account ${row.account_id}?`)) return;
    setSaving(true);
    try {
      await api.v2ArchiveAccount(row.account_id);
      setMsg({ type: "success", text: "Account archived." });
      setCreatedKey("");
      setRotatedKey("");
      await loadAccounts();
      await loadAccountDetail(row.account_id);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to archive account" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2200);
    }
  }

  async function onApplyBulk() {
    if (!bulkAction || !selectedAccount) return;
    if (bulkAction === "Archive Selected") {
      await onArchiveAccount(selectedAccount);
    } else if (bulkAction === "Rotate API Key") {
      await onRotateApiKey(selectedAccount);
    } else if (bulkAction === "Toggle Active") {
      await onToggleStatus(selectedAccount);
    }
    setBulkAction("");
  }

  return (
    <section className="logs-page-container stack-layout">
      <h2 className="page-title">Accounts</h2>

      <div className="toolbar-panel">
        <div className="toolbar-group toolbar-pagination">
          <div className="pager-area">
            <strong>{filtered.length}</strong> RESULTS
            {pages > 1 ? (
              <div className="pager-mini">
                <button className="secondary-button" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>PREV</button>
                <span className="minor-text">PAGE {safePage} / {pages}</span>
                <button className="secondary-button" disabled={safePage >= pages} onClick={() => setPage((p) => p + 1)}>NEXT</button>
              </div>
            ) : null}
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        </div>

        <div className="toolbar-group toolbar-search-filter" style={{ flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search account/user/name..." style={{ width: 220 }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">ALL STATUS</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
            <option value="">ALL USERS</option>
            {userOptions.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="toolbar-group toolbar-bulk-action">
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
            {BULK_ACTIONS.map((a) => <option key={a} value={a}>{a || "BULK ACTION..."}</option>)}
          </select>
          <button className="primary-button" onClick={onApplyBulk} disabled={!bulkAction || !selectedAccount || saving}>APPLY</button>
          <button className="primary-button" onClick={resetForm} disabled={saving}>+ CREATE ACCOUNT</button>
        </div>
      </div>

      {msg?.text ? <div className={`form-message msg-${msg.type || "error"}`}>{msg.text}</div> : null}
      {createdKey ? <div className="form-message msg-warning">New API key (shown once): <code>{createdKey}</code></div> : null}
      {rotatedKey ? <div className="form-message msg-warning">Rotated API key (shown once): <code>{rotatedKey}</code></div> : null}

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>ACCOUNT</th>
                  <th>USER</th>
                  <th>STATUS</th>
                  <th>API</th>
                  <th style={{ textAlign: "right" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="loading">Loading accounts...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={5} className="empty-state">No accounts found.</td></tr>
                ) : pageRows.map((row) => (
                  <tr
                    key={row.account_id}
                    className={selectedAccountId === row.account_id ? "active" : ""}
                    onClick={() => setSelectedAccountId(String(row.account_id || ""))}
                  >
                    <td>
                      <div className="cell-wrap">
                        <div className="cell-major">{row.name || row.account_id}</div>
                        <div className="cell-minor">{row.account_id}</div>
                      </div>
                    </td>
                    <td>{row.user_id || "-"}</td>
                    <td><span className={`badge ${String(row.status || "").toUpperCase()}`}>{String(row.status || "-").toUpperCase()}</span></td>
                    <td>{row.api_key_last4 ? `****${row.api_key_last4}` : "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="secondary-button" onClick={(e) => { e.stopPropagation(); onEdit(row); }} disabled={saving}>EDIT</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="logs-detail-pane">
          {!selectedAccount ? (
            <div className="empty-state">SELECT AN ACCOUNT TO INSPECT DETAILS</div>
          ) : (
            <div className="stack-layout" style={{ gap: 14 }}>
              <div className="panel-label" style={{ marginBottom: 0 }}>ACCOUNT DETAIL</div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="minor-text">Account ID</div>
                  <input value={form.account_id || selectedAccount.account_id || ""} onChange={(e) => setForm((p) => ({ ...p, account_id: e.target.value }))} disabled={Boolean(editingId)} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="minor-text">User ID</div>
                  <input value={form.user_id} onChange={(e) => setForm((p) => ({ ...p, user_id: e.target.value }))} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="minor-text">Name</div>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="minor-text">Status</div>
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="minor-text">Balance</div>
                  <input value={form.balance} onChange={(e) => setForm((p) => ({ ...p, balance: e.target.value }))} placeholder="optional number" />
                </label>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="minor-text">Metadata JSON</div>
                <textarea value={form.metadata_json} onChange={(e) => setForm((p) => ({ ...p, metadata_json: e.target.value }))} rows={4} />
              </label>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button className="primary-button" onClick={onSave} disabled={saving || loading}>{editingId ? "UPDATE ACCOUNT" : "CREATE ACCOUNT"}</button>
                <button className="secondary-button" onClick={() => onToggleStatus(selectedAccount)} disabled={saving}>{String(selectedAccount.status || "").toUpperCase() === "ACTIVE" ? "DEACTIVATE" : "ACTIVATE"}</button>
                <button className="secondary-button" onClick={() => onRotateApiKey(selectedAccount)} disabled={saving}>ROTATE API KEY</button>
                <button className="danger-button" onClick={() => onArchiveAccount(selectedAccount)} disabled={saving || String(selectedAccount.status || "").toUpperCase() === "ARCHIVED"}>ARCHIVE</button>
              </div>

              <div className="panel" style={{ padding: 12 }}>
                <div className="panel-label" style={{ marginBottom: 8 }}>SUBSCRIPTIONS</div>
                {detailLoading ? <div className="minor-text">Loading subscriptions...</div> : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Source ID</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subs.length === 0 ? (
                          <tr><td colSpan={2} className="muted">No active subscriptions.</td></tr>
                        ) : subs.map((s) => (
                          <tr key={s.source_id}>
                            <td>{s.source_id}</td>
                            <td><span className={`badge ${s.is_active ? "ACTIVE" : "INACTIVE"}`}>{s.is_active ? "ACTIVE" : "INACTIVE"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="panel" style={{ padding: 12 }}>
                <div className="panel-label" style={{ marginBottom: 8 }}>RECENT EXECUTIONS</div>
                {detailLoading ? <div className="minor-text">Loading trades...</div> : (
                  <div style={{ maxHeight: 260, overflow: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Trade</th>
                          <th>Symbol</th>
                          <th>Status</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.length === 0 ? (
                          <tr><td colSpan={4} className="muted">No recent trades.</td></tr>
                        ) : trades.map((t) => (
                          <tr key={t.trade_id}>
                            <td className="minor-text">{String(t.trade_id || "").slice(-8)}</td>
                            <td>{t.symbol || "-"}</td>
                            <td><span className={`badge ${String(t.execution_status || "").toUpperCase()}`}>{String(t.execution_status || "-").toUpperCase()}</span></td>
                            <td className="minor-text">{toDateTime(t.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
