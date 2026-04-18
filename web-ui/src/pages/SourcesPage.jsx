import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const KIND_OPTIONS = ["", "tv", "api", "manual", "bot"];
const AUTH_OPTIONS = ["token", "api_key", "signature", "none"];
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const BULK_ACTIONS = ["", "Activate Selected", "Deactivate Selected", "Rotate Secret", "Revoke Secret"];

function slugId(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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

export default function SourcesPage() {
  const EMPTY_MSG = { type: "", text: "" };
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [msg, setMsg] = useState(EMPTY_MSG);

  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bulkAction, setBulkAction] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [sourceEvents, setSourceEvents] = useState([]);
  const [subscriptionRows, setSubscriptionRows] = useState([]);
  const [subscriptionMapByAccount, setSubscriptionMapByAccount] = useState({});
  const [rotatedSecret, setRotatedSecret] = useState("");

  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    source_id: "",
    name: "",
    kind: "api",
    auth_mode: "token",
    is_active: true,
  });

  const filtered = useMemo(() => {
    const needle = String(q || "").trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter && String(r.kind || "") !== kindFilter) return false;
      if (statusFilter) {
        const active = Boolean(r.is_active);
        if (statusFilter === "ACTIVE" && !active) return false;
        if (statusFilter === "INACTIVE" && active) return false;
      }
      if (!needle) return true;
      return (
        String(r.source_id || "").toLowerCase().includes(needle)
        || String(r.name || "").toLowerCase().includes(needle)
        || String(r.kind || "").toLowerCase().includes(needle)
        || String(r.auth_mode || "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, kindFilter, statusFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.max(1, Math.min(page, pages));
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedSource = useMemo(
    () => rows.find((r) => String(r.source_id) === String(selectedSourceId)) || null,
    [rows, selectedSourceId],
  );
  useEffect(() => {
    if (!selectedSource || editingId) return;
    setForm({
      source_id: String(selectedSource.source_id || ""),
      name: String(selectedSource.name || ""),
      kind: String(selectedSource.kind || "api"),
      auth_mode: String(selectedSource.auth_mode || "token"),
      is_active: Boolean(selectedSource.is_active),
    });
  }, [selectedSource, editingId]);

  async function loadBaseData() {
    setLoading(true);
    try {
      const [sOut, aOut] = await Promise.all([api.v2Sources(), api.v2Accounts()]);
      const srcItems = Array.isArray(sOut?.items) ? sOut.items : [];
      const accItems = Array.isArray(aOut?.items) ? aOut.items : [];
      setRows(srcItems);
      setAccounts(accItems);
      if (!selectedSourceId && srcItems.length > 0) {
        setSelectedSourceId(String(srcItems[0].source_id || ""));
      }
      setMsg(EMPTY_MSG);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to load sources" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBaseData(); }, []);
  useEffect(() => { setPage(1); }, [q, kindFilter, statusFilter, pageSize]);

  async function loadSourceDetail(sourceId, accountRows = accounts) {
    const sid = String(sourceId || "").trim();
    if (!sid) {
      setSourceEvents([]);
      setSubscriptionRows([]);
      setSubscriptionMapByAccount({});
      return;
    }
    setDetailLoading(true);
    try {
      const eventPromise = api.v2SourceEvents(sid, 50);
      const subResults = await Promise.all((accountRows || []).map(async (a) => {
        const accountId = String(a.account_id || "");
        const out = await api.v2GetSubscriptions(accountId);
        const sourceIds = new Set(
          (Array.isArray(out?.items) ? out.items : [])
            .map((x) => String(x.source_id || "").trim())
            .filter(Boolean),
        );
        return { accountId, sourceIds };
      }));
      const eOut = await eventPromise;
      setSourceEvents(Array.isArray(eOut?.items) ? eOut.items : []);

      const byAccount = {};
      subResults.forEach((x) => { byAccount[x.accountId] = x.sourceIds; });
      setSubscriptionMapByAccount(byAccount);

      const subRows = (accountRows || []).map((a) => {
        const accountId = String(a.account_id || "");
        const hasSource = byAccount[accountId] ? byAccount[accountId].has(sid) : false;
        return {
          account_id: accountId,
          account_name: String(a.name || accountId),
          account_status: String(a.status || ""),
          enabled: hasSource,
        };
      });
      setSubscriptionRows(subRows);
    } catch (e) {
      setSourceEvents([]);
      setSubscriptionRows([]);
      setSubscriptionMapByAccount({});
      setMsg({ type: "error", text: e?.message || "Failed to load source detail" });
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedSourceId) return;
    loadSourceDetail(selectedSourceId, accounts);
  }, [selectedSourceId, accounts]);

  function resetForm() {
    setEditingId("");
    setForm({ source_id: "", name: "", kind: "api", auth_mode: "token", is_active: true });
  }

  function onEditSource(row) {
    setEditingId(String(row.source_id || ""));
    setForm({
      source_id: String(row.source_id || ""),
      name: String(row.name || ""),
      kind: String(row.kind || "api"),
      auth_mode: String(row.auth_mode || "token"),
      is_active: Boolean(row.is_active),
    });
  }

  async function onSaveSource() {
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
        if (!sourceId) throw new Error("source_id is required or derivable from name");
        await api.v2CreateSource({
          source_id: sourceId,
          name,
          kind: String(form.kind || "api"),
          auth_mode: String(form.auth_mode || "token"),
          is_active: Boolean(form.is_active),
        });
        setSelectedSourceId(sourceId);
        setMsg({ type: "success", text: "Source created." });
      }
      setRotatedSecret("");
      await loadBaseData();
      resetForm();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to save source" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2200);
    }
  }

  async function onToggleSource(row, nextActive = !Boolean(row.is_active)) {
    setSaving(true);
    try {
      await api.v2UpdateSource(row.source_id, {
        name: row.name,
        kind: row.kind,
        auth_mode: row.auth_mode,
        is_active: nextActive,
      });
      setMsg({ type: "success", text: `Source ${nextActive ? "activated" : "deactivated"}.` });
      await loadBaseData();
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to update source" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2200);
    }
  }

  async function onRotateSecret(row) {
    if (!window.confirm(`Rotate auth secret for source ${row.source_id}?`)) return;
    setSaving(true);
    try {
      const out = await api.v2RotateSourceSecret(row.source_id);
      setSelectedSourceId(String(row.source_id || ""));
      setRotatedSecret(String(out?.source_secret_plaintext || ""));
      setMsg({ type: "warning", text: "Source secret rotated. Save this value now." });
      await loadBaseData();
      await loadSourceDetail(row.source_id, accounts);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to rotate source secret" });
    } finally {
      setSaving(false);
    }
  }

  async function onRevokeSecret(row) {
    if (!window.confirm(`Revoke auth secret for source ${row.source_id}?`)) return;
    setSaving(true);
    try {
      await api.v2RevokeSourceSecret(row.source_id);
      setSelectedSourceId(String(row.source_id || ""));
      setRotatedSecret("");
      setMsg({ type: "warning", text: "Source secret revoked." });
      await loadBaseData();
      await loadSourceDetail(row.source_id, accounts);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to revoke source secret" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2200);
    }
  }

  async function onApplyBulkAction() {
    if (!bulkAction || !selectedSource) return;
    if (bulkAction === "Activate Selected") {
      await onToggleSource(selectedSource, true);
    } else if (bulkAction === "Deactivate Selected") {
      await onToggleSource(selectedSource, false);
    } else if (bulkAction === "Rotate Secret") {
      await onRotateSecret(selectedSource);
    } else if (bulkAction === "Revoke Secret") {
      await onRevokeSecret(selectedSource);
    }
    setBulkAction("");
  }

  async function onSaveSubscriptions() {
    if (!selectedSourceId) return;
    setSaving(true);
    try {
      const changed = subscriptionRows.filter((r) => {
        const current = Boolean(subscriptionMapByAccount[r.account_id]?.has(selectedSourceId));
        return current !== Boolean(r.enabled);
      });

      await Promise.all(changed.map(async (r) => {
        const currentSet = new Set(subscriptionMapByAccount[r.account_id] ? Array.from(subscriptionMapByAccount[r.account_id]) : []);
        if (r.enabled) currentSet.add(selectedSourceId);
        else currentSet.delete(selectedSourceId);
        const items = Array.from(currentSet).map((sourceId) => ({ source_id: sourceId, is_active: true }));
        await api.v2PutSubscriptions(r.account_id, items);
      }));

      setMsg({ type: "success", text: "Subscriptions saved." });
      await loadSourceDetail(selectedSourceId, accounts);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to save subscriptions" });
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(EMPTY_MSG), 2200);
    }
  }

  return (
    <section className="logs-page-container stack-layout">
      <h2 className="page-title">Sources</h2>

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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search source id/name..." style={{ width: 200 }} />
          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
            {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k ? `KIND: ${k.toUpperCase()}` : "ALL KINDS"}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">ALL STATUS</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        <div className="toolbar-group toolbar-bulk-action">
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
            {BULK_ACTIONS.map((a) => <option key={a} value={a}>{a || "BULK ACTION..."}</option>)}
          </select>
          <button className="primary-button" onClick={onApplyBulkAction} disabled={!bulkAction || !selectedSource || saving}>APPLY</button>
          <button className="primary-button" onClick={resetForm} disabled={saving}>+ CREATE SOURCE</button>
        </div>
      </div>

      {msg?.text ? <div className={`form-message msg-${msg.type || "error"}`}>{msg.text}</div> : null}

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>SOURCE</th>
                  <th>KIND</th>
                  <th>AUTH</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="loading">Loading sources...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={5} className="empty-state">No sources found.</td></tr>
                ) : pageRows.map((row) => (
                  <tr
                    key={row.source_id}
                    className={selectedSourceId === row.source_id ? "active" : ""}
                    onClick={() => setSelectedSourceId(String(row.source_id || ""))}
                  >
                    <td>
                      <div className="cell-wrap">
                        <div className="cell-major">{row.name || row.source_id}</div>
                        <div className="cell-minor">{row.source_id}</div>
                      </div>
                    </td>
                    <td>{row.kind || "-"}</td>
                    <td>{row.auth_mode || "-"}</td>
                    <td><span className={`badge ${row.is_active ? "ACTIVE" : "INACTIVE"}`}>{row.is_active ? "ACTIVE" : "INACTIVE"}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <button className="secondary-button" onClick={(e) => { e.stopPropagation(); onEditSource(row); }} disabled={saving}>EDIT</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="logs-detail-pane">
          {!selectedSource ? (
            <div className="empty-state">SELECT A SOURCE TO INSPECT DETAILS</div>
          ) : (
            <div className="stack-layout" style={{ gap: 14 }}>
              <div className="panel-label" style={{ marginBottom: 0 }}>SOURCE DETAIL</div>

              {rotatedSecret ? (
                <div className="form-message msg-warning">New source secret (shown once): <code>{rotatedSecret}</code></div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="minor-text">Source ID</div>
                  <input
                    value={form.source_id || selectedSource.source_id || ""}
                    onChange={(e) => setForm((p) => ({ ...p, source_id: e.target.value }))}
                    disabled={Boolean(editingId)}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="minor-text">Name</div>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="minor-text">Kind</div>
                  <select value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
                    {KIND_OPTIONS.filter(Boolean).map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="minor-text">Auth Mode</div>
                  <select value={form.auth_mode} onChange={(e) => setForm((p) => ({ ...p, auth_mode: e.target.value }))}>
                    {AUTH_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
                  <input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
                  <span className="minor-text">Active</span>
                </label>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button className="primary-button" onClick={onSaveSource} disabled={saving || loading}>{editingId ? "UPDATE SOURCE" : "CREATE SOURCE"}</button>
                <button className="secondary-button" onClick={() => onToggleSource(selectedSource)} disabled={saving}>{selectedSource.is_active ? "DEACTIVATE" : "ACTIVATE"}</button>
                <button className="secondary-button" onClick={() => onRotateSecret(selectedSource)} disabled={saving}>ROTATE SECRET</button>
                <button className="danger-button" onClick={() => onRevokeSecret(selectedSource)} disabled={saving}>REVOKE SECRET</button>
              </div>

              <div className="panel" style={{ padding: 12 }}>
                <div className="panel-label" style={{ marginBottom: 8 }}>SUBSCRIPTIONS (MOVED FROM SUBS PAGE)</div>
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Enabled</th>
                        <th>Account</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailLoading ? (
                        <tr><td colSpan={3} className="minor-text">Loading subscriptions...</td></tr>
                      ) : subscriptionRows.length === 0 ? (
                        <tr><td colSpan={3} className="muted">No accounts found.</td></tr>
                      ) : subscriptionRows.map((r, idx) => (
                        <tr key={r.account_id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={Boolean(r.enabled)}
                              onChange={(e) => {
                                const next = [...subscriptionRows];
                                next[idx] = { ...next[idx], enabled: e.target.checked };
                                setSubscriptionRows(next);
                              }}
                            />
                          </td>
                          <td>
                            <div className="cell-wrap">
                              <div className="cell-major">{r.account_name}</div>
                              <div className="cell-minor">{r.account_id}</div>
                            </div>
                          </td>
                          <td><span className={`badge ${String(r.account_status || "").toUpperCase()}`}>{String(r.account_status || "-").toUpperCase()}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 10 }}>
                  <button className="primary-button" onClick={onSaveSubscriptions} disabled={saving || detailLoading || !selectedSourceId}>SAVE SUBSCRIPTIONS</button>
                </div>
              </div>

              <div className="panel" style={{ padding: 12 }}>
                <div className="panel-label" style={{ marginBottom: 8 }}>SOURCE EVENTS</div>
                <div style={{ maxHeight: 280, overflow: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Event</th>
                        <th>Payload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceEvents.length === 0 ? (
                        <tr><td colSpan={3} className="muted">No source events.</td></tr>
                      ) : sourceEvents.map((ev, idx) => (
                        <tr key={`${ev.event_id || idx}`}>
                          <td className="minor-text">{toDateTime(ev.event_time)}</td>
                          <td>{String(ev.event_type || "-")}</td>
                          <td><code>{JSON.stringify(ev.payload_json || {})}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
