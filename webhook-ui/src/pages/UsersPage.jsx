import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const ROLE_OPTIONS = ["System", "Admin", "User", "Guest"];
const PAGE_SIZE_OPTIONS = [20, 50, 100];

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

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [createUserForm, setCreateUserForm] = useState({ user_name: "", email: "", role: "User", password: "" });
  const [profileForm, setProfileForm] = useState({ user_name: "", email: "", role: "User", is_active: true, password: "" });
  const [accountForm, setAccountForm] = useState({ account_id: "", name: "", balance: "", status: "" });
  const [apiKeyLabel, setApiKeyLabel] = useState("");

  const filteredUsers = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
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
  }, [users, query, roleFilter]);

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
      if (!selectedUserId && rows.length > 0) setSelectedUserId(String(rows[0].user_id || ""));
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
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load user detail");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { if (selectedUserId) loadDetail(selectedUserId); else setDetail(null); }, [selectedUserId]);
  useEffect(() => { setPage(1); }, [query, roleFilter, pageSize]);

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
      await api.createUser(payload);
      setCreateUserForm({ user_name: "", email: "", role: "User", password: "" });
      setMsg("User created.");
      await loadUsers();
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
      await api.createUserAccount(selectedUser.user_id, payload);
      setAccountForm({ account_id: "", name: "", balance: "", status: "" });
      setMsg("Account saved.");
      await loadDetail(selectedUser.user_id);
    } catch (e) {
      setError(e?.message || "Failed to save account");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMsg(""), 1800);
    }
  }

  async function onDeleteAccount(accountId) {
    if (!selectedUser) return;
    if (!window.confirm(`Delete account ${accountId}?`)) return;
    try {
      setSaving(true);
      await api.deleteUserAccount(selectedUser.user_id, accountId);
      setMsg("Account deleted.");
      await loadDetail(selectedUser.user_id);
    } catch (e) {
      setError(e?.message || "Failed to delete account");
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
      <div className="toolbar-panel">
        <div className="toolbar-left">
          <div className="kpi-label">USER MANAGEMENT</div>
          <div className="toolbar-separator" />
          <div className="pager-mini">
            <button disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>PREV</button>
            <span className="minor-text">PAGE {safePage} / {pages}</span>
            <button disabled={safePage >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>NEXT</button>
          </div>
          <select
            className="minor-text"
            style={{ padding: "0 4px", height: "22px", marginLeft: "10px" }}
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>

        <div className="toolbar-right">
          <input
            placeholder="SEARCH USER, EMAIL..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "220px" }}
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">ALL ROLES</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input
            placeholder="NEW USER NAME"
            value={createUserForm.user_name}
            onChange={(e) => setCreateUserForm((p) => ({ ...p, user_name: e.target.value }))}
            style={{ width: "160px" }}
          />
          <input
            placeholder="NEW USER EMAIL"
            value={createUserForm.email}
            onChange={(e) => setCreateUserForm((p) => ({ ...p, email: e.target.value }))}
            style={{ width: "180px" }}
          />
          <select value={createUserForm.role} onChange={(e) => setCreateUserForm((p) => ({ ...p, role: e.target.value }))}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input
            type="password"
            placeholder="PASSWORD"
            value={createUserForm.password}
            onChange={(e) => setCreateUserForm((p) => ({ ...p, password: e.target.value }))}
            style={{ width: "150px" }}
          />
          <button type="button" onClick={onCreateUser} disabled={saving}>CREATE</button>
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
                    className={String(u.user_id) === String(selectedUserId) ? "active" : ""}
                    onClick={() => setSelectedUserId(String(u.user_id || ""))}
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
          {!selectedUser ? (
            <div className="empty-state minor-text">SELECT A USER TO INSPECT DETAIL</div>
          ) : loadingDetail ? (
            <div className="loading">Loading user detail...</div>
          ) : (
            <div className="stack-layout">
              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-label">USER DETAIL</div>
                <div className="stack-layout" style={{ gap: 10 }}>
                  <label>
                    <div className="muted small">Username</div>
                    <input value={profileForm.user_name} onChange={(e) => setProfileForm((p) => ({ ...p, user_name: e.target.value }))} />
                  </label>
                  <label>
                    <div className="muted small">Email</div>
                    <input value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
                  </label>
                  <label>
                    <div className="muted small">Role</div>
                    <select
                      value={profileForm.role}
                      onChange={(e) => setProfileForm((p) => ({ ...p, role: e.target.value }))}
                      disabled={isDefaultUser}
                    >
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <label>
                    <div className="muted small">New Password (optional)</div>
                    <input
                      type="password"
                      value={profileForm.password}
                      onChange={(e) => setProfileForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Leave empty to keep current"
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(profileForm.is_active)}
                      onChange={(e) => setProfileForm((p) => ({ ...p, is_active: e.target.checked }))}
                      disabled={isDefaultUser || isSelf}
                    />
                    <span className="minor-text">Active</span>
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={onSaveProfile} disabled={saving}>SAVE USER</button>
                    <button
                      type="button"
                      onClick={onDeactivateUser}
                      disabled={saving || isDefaultUser || isSelf || !selectedUser.is_active}
                      style={{ background: "#7f1d1d", color: "#fee2e2" }}
                    >
                      DEACTIVATE
                    </button>
                  </div>
                </div>
              </div>

              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-label">ACCOUNT MANAGEMENT</div>
                <div className="stack-layout" style={{ gap: 10 }}>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1.1fr 1fr 1fr 1fr auto" }}>
                    <input
                      placeholder="Account ID"
                      value={accountForm.account_id}
                      onChange={(e) => setAccountForm((p) => ({ ...p, account_id: e.target.value }))}
                    />
                    <input
                      placeholder="Name"
                      value={accountForm.name}
                      onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))}
                    />
                    <input
                      placeholder="Balance"
                      value={accountForm.balance}
                      onChange={(e) => setAccountForm((p) => ({ ...p, balance: e.target.value }))}
                    />
                    <input
                      placeholder="Status"
                      value={accountForm.status}
                      onChange={(e) => setAccountForm((p) => ({ ...p, status: e.target.value }))}
                    />
                    <button type="button" onClick={onSaveAccount} disabled={saving}>SAVE</button>
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
                                onClick={() => setAccountForm({
                                  account_id: String(a.account_id || ""),
                                  name: String(a.name || ""),
                                  balance: a.balance === null || a.balance === undefined ? "" : String(a.balance),
                                  status: String(a.status || ""),
                                })}
                              >
                                EDIT
                              </button>
                              <button
                                type="button"
                                style={{ width: "auto", padding: "4px 10px", marginLeft: 6, background: "#7f1d1d", color: "#fee2e2" }}
                                onClick={() => onDeleteAccount(a.account_id)}
                              >
                                DELETE
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(detail?.accounts || []).length === 0 ? (
                          <tr><td colSpan={4} className="minor-text">No accounts yet.</td></tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="panel" style={{ margin: 0 }}>
                <div className="panel-label">API KEY MANAGEMENT</div>
                <div className="stack-layout" style={{ gap: 10 }}>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto" }}>
                    <input
                      placeholder="API key label"
                      value={apiKeyLabel}
                      onChange={(e) => setApiKeyLabel(e.target.value)}
                    />
                    <button type="button" onClick={onCreateApiKey} disabled={saving}>CREATE KEY</button>
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
                              <button
                                type="button"
                                style={{ width: "auto", padding: "4px 10px" }}
                                onClick={() => onToggleApiKey(k)}
                              >
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
                        {(detail?.api_keys || []).length === 0 ? (
                          <tr><td colSpan={4} className="minor-text">No API keys yet.</td></tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  <div className="minor-text">API keys are masked for security.</div>
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
