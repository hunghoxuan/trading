import { useEffect, useMemo, useState } from "react";
import { getRuntimeApiKey, setRuntimeApiKey, api } from "../api";
import UserDetailSection from "../components/UserDetailSection";

const ROUTE_OPTIONS = [
  { value: "ea", label: "EA Client (MT5)" },
  { value: "v2", label: "v2 Broker Executor" },
  { value: "ctrader", label: "cTrader Bridge" },
];

const CTRADER_MODE_OPTIONS = [
  { value: "demo", label: "demo" },
  { value: "live", label: "live" },
];

function isSystemRole(user) {
  return String(user?.role || "").trim().toLowerCase() === "system";
}

export default function SettingsPage({ authUser }) {
  const [apiKey, setApiKey] = useState(getRuntimeApiKey());
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [profileForm, setProfileForm] = useState({
    user_name: "",
    email: "",
    role: "User",
    is_active: true,
    password: "",
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canManageExecution = isSystemRole(authUser);
  const [execLoading, setExecLoading] = useState(false);
  const [execMsg, setExecMsg] = useState("");
  const [execProfiles, setExecProfiles] = useState([]);
  const [execAccounts, setExecAccounts] = useState([]);
  const [execForm, setExecForm] = useState({
    profile_id: "default",
    profile_name: "default",
    route: "ea",
    account_id: "",
    source_ids_csv: "signal,tradingview",
    ctrader_mode: "demo",
    ctrader_account_id: "",
  });

  const selectedAccount = useMemo(
    () => (execAccounts || []).find((a) => String(a?.account_id || "") === String(execForm.account_id || "")) || null,
    [execAccounts, execForm.account_id],
  );

  async function loadExecutionSettings() {
    if (!canManageExecution) return;
    try {
      const out = await api.v2ExecutionProfiles();
      const accounts = Array.isArray(out?.accounts) ? out.accounts : [];
      const items = Array.isArray(out?.items) ? out.items : [];
      const active = out?.active_profile || items.find((x) => x?.is_active) || null;
      setExecAccounts(accounts);
      setExecProfiles(items);
      if (active) {
        const sourceIds = Array.isArray(active?.source_ids) ? active.source_ids : [];
        setExecForm({
          profile_id: String(active.profile_id || "default"),
          profile_name: String(active.profile_name || "default"),
          route: String(active.route || "ea"),
          account_id: String(active.account_id || accounts?.[0]?.account_id || ""),
          source_ids_csv: sourceIds.length ? sourceIds.join(",") : "signal,tradingview",
          ctrader_mode: String(active.ctrader_mode || "demo"),
          ctrader_account_id: String(active.ctrader_account_id || ""),
        });
      } else if (accounts.length > 0) {
        setExecForm((prev) => ({ ...prev, account_id: prev.account_id || String(accounts[0].account_id || "") }));
      }
    } catch (error) {
      setExecMsg(error?.message || "Failed to load execution profiles");
    }
  }

  useEffect(() => {
    setProfileForm((prev) => ({
      ...prev,
      user_name: String(authUser?.user_name || ""),
      email: String(authUser?.email || ""),
      role: String(authUser?.role || "User"),
      is_active: Boolean(authUser?.is_active),
      password: "",
    }));

    api.authProfile()
      .then((out) => {
        if (!out?.user) return;
        setProfileForm((prev) => ({
          ...prev,
          user_name: String(out.user.user_name || ""),
          email: String(out.user.email || ""),
          role: String(out.user.role || prev.role || "User"),
          is_active: Boolean(out.user.is_active),
          password: "",
        }));
      })
      .catch(() => {});

    loadExecutionSettings();
  }, [authUser?.user_name, authUser?.email, authUser?.role, authUser?.is_active]);

  function saveApiKey() {
    setRuntimeApiKey(apiKey);
    setMsg("API key saved.");
    window.setTimeout(() => setMsg(""), 1500);
  }

  async function saveMyAccount() {
    const name = String(profileForm.user_name || "").trim();
    const mail = String(profileForm.email || "").trim();
    if (!name || !mail) {
      setMsg("Username and email are required.");
      return;
    }
    setProfileLoading(true);
    try {
      await api.updateAuthProfile(name, mail);
      if (profileForm.password) {
        await api.changePassword(currentPassword, profileForm.password);
        setCurrentPassword("");
        setProfileForm((prev) => ({ ...prev, password: "" }));
      }
      setMsg("My Account updated.");
    } catch (err) {
      setMsg(err?.message || "Failed to update My Account.");
    } finally {
      setProfileLoading(false);
      window.setTimeout(() => setMsg(""), 2500);
    }
  }

  async function resetPassword() {
    if (!currentPassword || !newPassword) {
      setMsg("Enter current and new password.");
      return;
    }
    if (newPassword.length < 8) {
      setMsg("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg("New password and confirm password do not match.");
      return;
    }
    setPwdLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMsg("Password updated.");
    } catch (err) {
      setMsg(err?.message || "Failed to update password.");
    } finally {
      setPwdLoading(false);
      window.setTimeout(() => setMsg(""), 2500);
    }
  }

  async function applyExecutionProfile() {
    const route = String(execForm.route || "").trim().toLowerCase();
    const accountId = String(execForm.account_id || "").trim();
    if (!["ea", "v2", "ctrader"].includes(route)) {
      setExecMsg("Route must be ea, v2, or ctrader.");
      return;
    }
    if (!accountId) {
      setExecMsg("Select an account.");
      return;
    }
    const sourceIds = String(execForm.source_ids_csv || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    setExecLoading(true);
    try {
      await api.v2ApplyExecutionProfile({
        profile_id: String(execForm.profile_id || "default").trim() || "default",
        profile_name: String(execForm.profile_name || "default").trim() || "default",
        route,
        account_id: accountId,
        source_ids: sourceIds,
        ctrader_mode: route === "ctrader" ? String(execForm.ctrader_mode || "demo") : "",
        ctrader_account_id: route === "ctrader" ? String(execForm.ctrader_account_id || "").trim() : "",
      });
      setExecMsg("Execution profile applied. Signal fanout routed to selected account.");
      await loadExecutionSettings();
    } catch (error) {
      setExecMsg(error?.message || "Failed to apply execution profile");
    } finally {
      setExecLoading(false);
      window.setTimeout(() => setExecMsg(""), 4000);
    }
  }

  return (
    <div className="stack-layout fadeIn">
      <h2 className="page-title">My Account</h2>

      <UserDetailSection
        title="MY ACCOUNT"
        form={profileForm}
        setForm={setProfileForm}
        roleOptions={[String(profileForm.role || "User")]}
        showRole={false}
        showActive={false}
        passwordLabel="New Password (optional)"
        primaryLabel={profileLoading ? "SAVING..." : "SAVE ACCOUNT"}
        onPrimary={saveMyAccount}
        primaryDisabled={profileLoading}
        footer={msg ? <span className="minor-text">{msg}</span> : null}
      />

      <section className="panel settings-page" style={{ maxWidth: "700px" }}>
        <div className="panel-label">API ACCESS & PASSWORD</div>
        <div className="stack-layout" style={{ gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div className="minor-text">API Key</div>
            <input
              type="password"
              placeholder="Enter API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ width: "100%", maxWidth: "400px" }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="primary-button" onClick={saveApiKey} style={{ width: "auto" }}>SAVE API KEY</button>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div className="minor-text">Current Password</div>
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: "100%", maxWidth: "400px" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div className="minor-text">New Password</div>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: "100%", maxWidth: "400px" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div className="minor-text">Confirm New Password</div>
            <input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: "100%", maxWidth: "400px" }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="secondary-button" onClick={resetPassword} style={{ width: "auto" }} disabled={pwdLoading}>
              {pwdLoading ? "UPDATING..." : "RESET PASSWORD"}
            </button>
          </div>
        </div>
      </section>

      {canManageExecution ? (
        <section className="panel settings-page">
          <div className="panel-label">EXECUTION PROFILE</div>
          <div className="form-grid">
            <label>
              Profile ID
              <input value={execForm.profile_id} onChange={(e) => setExecForm((p) => ({ ...p, profile_id: e.target.value }))} />
            </label>
            <label>
              Profile Name
              <input value={execForm.profile_name} onChange={(e) => setExecForm((p) => ({ ...p, profile_name: e.target.value }))} />
            </label>
            <label>
              Route
              <select value={execForm.route} onChange={(e) => setExecForm((p) => ({ ...p, route: e.target.value }))}>
                {ROUTE_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </label>
            <label>
              Account
              <select value={execForm.account_id} onChange={(e) => setExecForm((p) => ({ ...p, account_id: e.target.value }))}>
                <option value="">Select account</option>
                {(execAccounts || []).map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.name || a.account_id} ({a.account_id})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sources (CSV)
              <input
                value={execForm.source_ids_csv}
                onChange={(e) => setExecForm((p) => ({ ...p, source_ids_csv: e.target.value }))}
                placeholder="signal,tradingview"
              />
            </label>
            <label>
              cTrader Mode
              <select value={execForm.ctrader_mode} onChange={(e) => setExecForm((p) => ({ ...p, ctrader_mode: e.target.value }))}>
                {CTRADER_MODE_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </label>
            <label>
              cTrader Account ID
              <input
                value={execForm.ctrader_account_id}
                onChange={(e) => setExecForm((p) => ({ ...p, ctrader_account_id: e.target.value }))}
                placeholder="45899489"
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            <button className="primary-button" onClick={applyExecutionProfile} disabled={execLoading}>
              {execLoading ? "APPLYING..." : "APPLY EXECUTION PROFILE"}
            </button>
            {selectedAccount ? (
              <span className="minor-text">Selected account key last4: ****{String(selectedAccount.api_key_last4 || "----")}</span>
            ) : null}
          </div>
          {execMsg ? <div className="minor-text" style={{ marginTop: 8 }}>{execMsg}</div> : null}

          <div style={{ marginTop: 16 }}>
            <div className="panel-label">Saved Profiles</div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Route</th>
                    <th>Account</th>
                    <th>cTrader</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(execProfiles || []).map((p) => (
                    <tr key={p.profile_id}>
                      <td>{p.profile_name || p.profile_id}</td>
                      <td>{String(p.route || "-").toUpperCase()}</td>
                      <td>{p.account_id || "-"}</td>
                      <td>{p.ctrader_mode ? `${p.ctrader_mode} / ${p.ctrader_account_id || "-"}` : "-"}</td>
                      <td><span className={`status-badge ${p.is_active ? "ACTIVE" : "INACTIVE"}`}>{p.is_active ? "ACTIVE" : "INACTIVE"}</span></td>
                    </tr>
                  ))}
                  {execProfiles.length === 0 ? (
                    <tr><td colSpan={5} className="muted">No profiles yet.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
