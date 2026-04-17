import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import UserDetailSection from "../components/UserDetailSection";

const ROLE_OPTIONS = ["System", "Admin", "User", "Guest"];
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const BULK_ACTIONS = ["", "Deactivate Selected User"];

function byCreatedAsc(a, b) {
  const ad = String(a?.created_at || "");
  const bd = String(b?.created_at || "");
  if (ad === bd) return String(a?.user_id || "").localeCompare(String(b?.user_id || ""));
  return ad.localeCompare(bd);
}

function fDate(v) {
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

export default function UsersPage({ authUser }) {
  const [users, setUsers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [bulkAction, setBulkAction] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailMode, setDetailMode] = useState("view");

  const [createUserForm, setCreateUserForm] = useState({ user_name: "", email: "", role: "User", password: "" });
  const [profileForm, setProfileForm] = useState({ user_name: "", email: "", role: "User", is_active: true, password: "" });
  const [accountForm, setAccountForm] = useState({ account_id: "", name: "", balance: "", status: "" });
  const [editingAccountId, setEditingAccountId] = useState("");
  const [apiKeyLabel, setApiKeyLabel] = useState("");

  const filteredUsers = useMemo(() => {
    const q = String(searchQuery || "").trim().toLowerCase();
    return [...users]
      .filter((u) => {
        if (roleFilter && String(u.role || "") !== roleFilter) return false;
        if (!q) return true;
        return (
          String(u.user_name || "").toLowerCase().includes(q) ||
          String(u.email || "").toLowerCase().includes(q) ||
          String(u.user_id || "").toLowerCase().includes(q)
        );
      })
      .sort(byCreatedAsc);
  }, [users, searchQuery, roleFilter]);

  const pages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.max(1, Math.min(page, pages));
  const pageRows = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedUser = useMemo(() => users.find((u) => String(u.user_id) === String(selectedUserId)) || null, [users, selectedUserId]);
  const isDefaultUser = String(selectedUser?.user_id || "") === "default";
  const isSelf = String(selectedUser?.user_id || "") === String(authUser?.user_id || "");

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const out = await api.listUsers();
      const rows = Array.isArray(out?.users) ? out.users : [];
      setUsers(rows);
      if (!selectedUserId && rows.length > 0) {
        setSelectedUserId(String(rows[0].user_id || ""));
      }
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadDetail(userId) {
    if (!userId) {
      setDetail(null);
      return;
    }
    try {
      setLoadingDetail(true);
      const out = await api.userDetail(userId);
      setDetail(out);
      const user = out?.user || {};
      setProfileForm({
        user_name: String(user.user_name || ""),
        email: String(user.email || ""),
        role: String(user.role || "User"),
        is_active: Boolean(user.is_active),
        password: "",
      });
      setEditingAccountId("");
      setAccountForm({ account_id: "", name: "", balance: "", status: "" });
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load user detail");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    if (detailMode === "create") return;
    if (selectedUserId) loadDetail(selectedUserId);
    else setDetail(null);
  }, [selectedUserId, detailMode]);
  useEffect(() => { setPage(1); }, [searchQuery, roleFilter, pageSize]);

  function openCreateMode() {
    setDetailMode("create");
    setSelectedUserId("");
    setDetail(null);
    setCreateUserForm({ user_name: "", email: "", role: "User", password: "" });
    setError("");
  }

  function openViewMode(userId) {
    setDetailMode("view");
    setSelectedUserId(String(userId || ""));
  }

  async function onCreateUser() {
    const payload = {
      user_name: String(createUserForm.user_name || "").trim(),
      email: String(createUserForm.email || "").trim(),
      role: String(createUserForm.role || "User"),
      password: String(createUserForm.password || ""),
    };
    if (!payload.user_name || !payload.email || !payload.password) {
      setError("Username, email and password are required.");
      return;
    }
    try {
      setSaving(true);
      const out = await api.createUser(payload);
      const createdUserId = String(out?.user?.user_id || "");
      setMsg("User created.");
      await loadUsers();
      if (createdUserId) openViewMode(createdUserId);
    } catch (e) {
      setError(e?.message || "Failed to create user");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(""), 1800);
    }
  }

  async function onSaveProfile() {
    if (!selectedUser) return;
    const payload = {
      user_name: String(profileForm.user_name || "").trim(),
      email: String(profileForm.email || "").trim(),
      role: String(profileForm.role || "User"),
      is_active: Boolean(profileForm.is_active),
    };
    if (profileForm.password) payload.password = String(profileForm.password || "");
    try {
      setSaving(true);
      await api.updateUser(selectedUser.user_id, payload);
      setMsg("User profile updated.");
      await loadUsers();
      await loadDetail(selectedUser.user_id);
    } catch (e) {
      setError(e?.message || "Failed to update user profile");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(""), 1800);
    }
  }

  async function onDeactivateUser() {
    if (!selectedUser) return;
    if (!window.confirm(`Deactivate ${selectedUser.user_name || selectedUser.user_id}?`)) return;
    try {
      setSaving(true);
      await api.deactivateUser(selectedUser.user_id);
      setMsg("User deactivated.");
      await loadUsers();
      await loadDetail(selectedUser.user_id);
    } catch (e) {
      setError(e?.message || "Failed to deactivate user");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(""), 1800);
    }
  }

  async function onApplyBulkAction() {
    if (!bulkAction) return;
    if (!selectedUser) {
      setError("Select a user first.");
      return;
    }
    if (bulkAction === "Deactivate Selected User") {
      await onDeactivateUser();
      setBulkAction("");
    }
  }

  async function onSaveAccount() {
    if (!selectedUser) return;
    const payload = {
      account_id: String(accountForm.account_id || "").trim(),
      name: String(accountForm.name || "").trim(),
      balance: accountForm.balance === "" ? null : Number(accountForm.balance),
      status: String(accountForm.status || "").trim(),
    };
    if (!payload.account_id || !payload.name) {
      setError("Account ID and account name are required.");
      return;
    }

    try {
      setSaving(true);
      if (editingAccountId) {
        await api.updateUserAccount(selectedUser.user_id, editingAccountId, payload);
        setMsg("Account updated.");
      } else {
        await api.createUserAccount(selectedUser.user_id, payload);
        setMsg("Account created.");
      }
      setEditingAccountId("");
      setAccountForm({ account_id: "", name: "", balance: "", status: "" });
      await loadDetail(selectedUser.user_id);
    } catch (e) {
      setError(e?.message || "Failed to save account");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(""), 1800);
    }
  }

  async function onDeactivateAccount(account) {
    if (!selectedUser || !account) return;
    if (!window.confirm(`Deactivate account ${account.account_id}?`)) return;
    try {
      setSaving(true);
      await api.updateUserAccount(selectedUser.user_id, account.account_id, {
        name: String(account.name || account.account_id || ""),
        balance: account.balance === null || account.balance === undefined ? null : Number(account.balance),
        status: "INACTIVE",
      });
      setMsg("Account deactivated.");
      await loadDetail(selectedUser.user_id);
    } catch (e) {
      setError(e?.message || "Failed to deactivate account");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(""), 1800);
    }
  }

  async function onCreateApiKey() {
    if (!selectedUser) return;
    const label = String(apiKeyLabel || "").trim();
    if (!label) {
      setError("API key label is required.");
      return;
    }
    try {
      setSaving(true);
      const out = await api.createUserApiKey(selectedUser.user_id, { label });
      setApiKeyLabel("");
      const masked = out?.api_key?.key_masked || "";
      setMsg(masked ? `API key created (${masked}).` : "API key created.");
      await loadDetail(selectedUser.user_id);
    } catch (e) {
      setError(e?.message || "Failed to create API key");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(""), 2200);
    }
  }

  async function onToggleApiKey(row) {
    if (!selectedUser || !row) return;
    try {
      setSaving(true);
      await api.updateUserApiKey(selectedUser.user_id, row.key_id, { is_active: !row.is_active });
      setMsg("API key updated.");
      await loadDetail(selectedUser.user_id);
    } catch (e) {
      setError(e?.message || "Failed to update API key");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(""), 1800);
    }
  }

  async function onDeleteApiKey(row) {
    if (!selectedUser || !row) return;
    if (!window.confirm(`Delete API key ${row.label}?`)) return;
    try {
      setSaving(true);
      await api.deleteUserApiKey(selectedUser.user_id, row.key_id);
      setMsg("API key deleted.");
      await loadDetail(selectedUser.user_id);
    } catch (e) {
      setError(e?.message || "Failed to delete API key");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(""), 1800);
    }
  }

  return (
    <div className="stack-layout fadeIn">
      <h2 className="page-title">Users</h2>

      <div className="toolbar-panel">
        <div className="toolbar-group toolbar-pagination">
          <div className="pager-mini">
            <button disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>PREV</button>
            <span className="minor-text">PAGE {safePage} / {pages}</span>
            <button disabled={safePage >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>NEXT</button>
          </div>
          <select className="minor-text" style={{ padding: "0 4px", height: "22px" }} value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>

        <div className="toolbar-group toolbar-search-filter">
          <input placeholder="SEARCH USER, EMAIL..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "220px" }} />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">ALL ROLES</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="toolbar-group toolbar-bulk-action">
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
            {BULK_ACTIONS.map((a) => <option key={a} value={a}>{a || "BULK ACTION..."}</option>)}
          </select>
          <button type="button" onClick={onApplyBulkAction} disabled={saving || !bulkAction}>APPLY</button>
        </div>

        <div className="toolbar-group toolbar-create">
          <button type="button" onClick={openCreateMode} disabled={saving}>CREATE</button>
        </div>
      </div>

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          {error ? <div className="error">{error}</div> : null}
          {msg ? <div className="loading" style={{ padding: 10 }}>{msg}</div> : null}
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>EMAIL</th>
                  <th>ROLE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td colSpan={4} className="loading">Loading users...</td></tr>
                ) : pageRows.map((u) => (
                  <tr
                    key={u.user_id}
                    className={String(u.user_id) === String(selectedUserId) && detailMode !== "create" ? "active" : ""}
                    onClick={() => openViewMode(u.user_id)}
                  >
                    <td>
                      <div className="cell-wrap">
                        <div className="cell-major">{u.user_name || u.user_id}</div>
                        <div className="cell-minor">{u.user_id}</div>
                      </div>
                    </td>
                    <td className="cell-minor">{u.email || "-"}</td>
                    <td><span className="badge">{u.role || "User"}</span></td>
                    <td className="cell-minor">{u.is_active ? "ACTIVE" : "INACTIVE"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="logs-detail-pane">
          {detailMode === "create" ? (
            <div className="stack-layout">
              <UserDetailSection
                title="CREATE USER"
                form={createUserForm}
                setForm={setCreateUserForm}
                roleOptions={ROLE_OPTIONS}
                showActive={false}
                passwordLabel="Password"
                primaryLabel="CREATE USER"
                onPrimary={onCreateUser}
                primaryDisabled={saving}
                secondaryLabel="CANCEL"
                onSecondary={() => {
                  if (users.length > 0) {
                    openViewMode(users[0].user_id);
                  } else {
                    setDetailMode("view");
                  }
                }}
                secondaryDisabled={saving}
              />
            </div>
          ) : !selectedUser ? (
            <div className="empty-state minor-text">SELECT A USER TO INSPECT DETAIL</div>
          ) : loadingDetail ? (
            <div className="loading">Loading user detail...</div>
          ) : (
            <div className="stack-layout">
              <UserDetailSection
                title="USER DETAIL"
                form={profileForm}
                setForm={setProfileForm}
                roleOptions={ROLE_OPTIONS}
                disableRole={isDefaultUser}
                disableActive={isDefaultUser || isSelf}
                primaryLabel="SAVE USER"
                onPrimary={onSaveProfile}
                primaryDisabled={saving}
                secondaryLabel="DEACTIVATE"
                onSecondary={onDeactivateUser}
                secondaryDisabled={saving || isDefaultUser || isSelf || !selectedUser.is_active}
                secondaryDanger
              />

              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-label">ACCOUNT MANAGEMENT</div>
                <div className="stack-layout" style={{ gap: 10 }}>
                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.1fr 1fr 1fr 1fr auto", alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="minor-text">Account ID</div>
                      <input placeholder="Ex: 52836789" value={accountForm.account_id} onChange={(e) => setAccountForm((p) => ({ ...p, account_id: e.target.value }))} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="minor-text">Name</div>
                      <input placeholder="Friendly Name" value={accountForm.name} onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="minor-text">Balance</div>
                      <input placeholder="0.00" value={accountForm.balance} onChange={(e) => setAccountForm((p) => ({ ...p, balance: e.target.value }))} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="minor-text">Status</div>
                      <input placeholder="ACTIVE" value={accountForm.status} onChange={(e) => setAccountForm((p) => ({ ...p, status: e.target.value }))} />
                    </label>
                    <button type="button" onClick={onSaveAccount} disabled={saving} style={{ padding: '8px 16px' }}>{editingAccountId ? "UPDATE" : "CREATE"}</button>
                  </div>

                  <div className="events-table-wrap" style={{ maxHeight: 220 }}>
                    <table className="events-table">
                      <thead>
                        <tr>
                          <th>ACCOUNT</th>
                          <th>BALANCE</th>
                          <th>STATUS</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail?.accounts || []).map((a) => (
                          <tr key={a.account_id}>
                            <td>
                              <div className="cell-wrap">
                                <div className="cell-major">{a.name || a.account_id}</div>
                                <div className="cell-minor">{a.account_id}</div>
                              </div>
                            </td>
                            <td className="cell-minor">{a.balance === null || a.balance === undefined ? "-" : Number(a.balance).toLocaleString()}</td>
                            <td className="cell-minor">{a.status || "-"}</td>
                            <td>
                              <button
                                type="button"
                                style={{ width: "auto", padding: "4px 10px" }}
                                onClick={() => {
                                  setEditingAccountId(String(a.account_id || ""));
                                  setAccountForm({
                                    account_id: String(a.account_id || ""),
                                    name: String(a.name || ""),
                                    balance: a.balance === null || a.balance === undefined ? "" : String(a.balance),
                                    status: String(a.status || ""),
                                  });
                                }}
                              >
                                EDIT
                              </button>
                              <button
                                type="button"
                                style={{ width: "auto", padding: "4px 10px", marginLeft: 6, background: "#7f1d1d", color: "#fee2e2" }}
                                onClick={() => onDeactivateAccount(a)}
                              >
                                DEACTIVATE
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(detail?.accounts || []).length === 0 ? (<tr><td colSpan={4} className="minor-text">No accounts yet.</td></tr>) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-label">API KEY MANAGEMENT</div>
                <div className="stack-layout" style={{ gap: 10 }}>
                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr auto", alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="minor-text">Key Label</div>
                      <input placeholder="Ex: TradingView Bridge" value={apiKeyLabel} onChange={(e) => setApiKeyLabel(e.target.value)} />
                    </label>
                    <button type="button" onClick={onCreateApiKey} disabled={saving} style={{ padding: '8px 16px' }}>CREATE KEY</button>
                  </div>
                  <div className="events-table-wrap" style={{ maxHeight: 220 }}>
                    <table className="events-table">
                      <thead>
                        <tr>
                          <th>LABEL</th>
                          <th>KEY</th>
                          <th>STATUS</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail?.api_keys || []).map((k) => (
                          <tr key={k.key_id}>
                            <td className="cell-major">{k.label}</td>
                            <td className="cell-minor">{k.key_masked || "-"}</td>
                            <td className="cell-minor">{k.is_active ? "ACTIVE" : "INACTIVE"}</td>
                            <td>
                              <button type="button" style={{ width: "auto", padding: "4px 10px" }} onClick={() => onToggleApiKey(k)}>
                                {k.is_active ? "DISABLE" : "ENABLE"}
                              </button>
                              <button
                                type="button"
                                style={{ width: "auto", padding: "4px 10px", marginLeft: 6, background: "#7f1d1d", color: "#fee2e2" }}
                                onClick={() => onDeleteApiKey(k)}
                              >
                                DELETE
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(detail?.api_keys || []).length === 0 ? (<tr><td colSpan={4} className="minor-text">No API keys yet.</td></tr>) : null}
                      </tbody>
                    </table>
                  </div>
                  <div className="minor-text">API keys are active for API auth when status is ACTIVE (sent via x-api-key).</div>
                </div>
              </div>

              <div className="minor-text">User created: {fDate(detail?.user?.created_at)} | updated: {fDate(detail?.user?.updated_at)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
