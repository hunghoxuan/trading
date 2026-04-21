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
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [profileForm, setProfileForm] = useState({
    user_name: "",
    email: "",
    role: "User",
    is_active: true,
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [settings, setSettings] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

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

  async function loadData() {
    try {
      const [prof, exec, sets] = await Promise.all([
        api.authProfile(),
        canManageExecution ? api.v2ExecutionProfiles() : Promise.resolve(null),
        api.getSettings(),
      ]);

      if (prof?.user) {
        setProfileForm({
          user_name: String(prof.user.user_name || ""),
          email: String(prof.user.email || ""),
          role: String(prof.user.role || "User"),
          is_active: Boolean(prof.user.is_active),
        });
      }

      if (exec) {
        const accounts = Array.isArray(exec.accounts) ? exec.accounts : [];
        const items = Array.isArray(exec.items) ? exec.items : [];
        const active = exec.active_profile || items.find((x) => x?.is_active) || null;
        setExecAccounts(accounts);
        setExecProfiles(items);
        if (active) {
          const sourceIds = Array.isArray(active.source_ids) ? active.source_ids : [];
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
          setExecForm((prev) => ({ ...prev, account_id: String(accounts[0].account_id || "") }));
        }
      }

      if (sets?.settings) {
        setSettings(sets.settings);
      }
    } catch (err) {
      setMsg(err.message);
    }
  }

  useEffect(() => {
    loadData();
  }, [authUser?.user_id]);

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
      setMsg("Profile updated.");
    } catch (err) {
      setMsg(err?.message || "Failed to update profile.");
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
    if (newPassword.length < 4) {
      setMsg("New password must be at least 4 characters.");
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

  async function updateSetting(type, field, value) {
    const s = settings.find(x => x.type === type);
    if (!s) return;
    const nextData = { ...s.data, [field]: value };
    setSettings(prev => prev.map(x => x.type === type ? { ...x, data: nextData } : x));
  }

  async function saveSetting(type) {
    const s = settings.find(x => x.type === type);
    if (!s) return;
    setSettingsLoading(true);
    setSettingsMsg("");
    try {
      await api.upsertSetting({ type, name: s.name, data: s.data, status: s.status });
      setSettingsMsg(`Settings for ${type} saved.`);
      await loadData();
    } catch (err) {
      setSettingsMsg(err.message);
    } finally {
      setSettingsLoading(false);
      window.setTimeout(() => setSettingsMsg(""), 3000);
    }
  }

  async function applyExecutionProfile() {
    const route = String(execForm.route || "").trim().toLowerCase();
    const accountId = String(execForm.account_id || "").trim();
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
      setExecMsg("Execution profile applied.");
      await loadData();
    } catch (error) {
      setExecMsg(error?.message || "Failed to apply profile");
    } finally {
      setExecLoading(false);
      window.setTimeout(() => setExecMsg(""), 4000);
    }
  }

  return (
    <div className="stack-layout fadeIn" style={{ paddingBottom: 40 }}>
      <h2 className="page-title">Settings</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Card 1: Update Profile */}
        <UserDetailSection
          title="UPDATE PROFILE"
          form={profileForm}
          setForm={setProfileForm}
          roleOptions={[String(profileForm.role || "User")]}
          showRole={false}
          showActive={false}
          showPassword={false}
          primaryLabel={profileLoading ? "SAVING..." : "SAVE PROFILE"}
          onPrimary={saveMyAccount}
          primaryDisabled={profileLoading}
          footer={msg && !pwdLoading ? <span className="minor-text">{msg}</span> : null}
        />

        {/* Card 2: Update Password */}
        <section className="panel">
          <div className="panel-label">UPDATE PASSWORD</div>
          <div className="stack-layout" style={{ gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="minor-text">Current Password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required to set new password"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="minor-text">New Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 4 characters"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="minor-text">Confirm New Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </label>
            <div style={{ marginTop: 8 }}>
              <button className="primary-button" onClick={resetPassword} disabled={pwdLoading}>
                {pwdLoading ? "UPDATING..." : "UPDATE PASSWORD"}
              </button>
            </div>
            {pwdLoading || msg ? <div className="minor-text" style={{ marginTop: 4 }}>{msg}</div> : null}
          </div>
        </section>
      </div>

      {/* Card 3: Manage Settings (Dynamic) */}
      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-label">MANAGE SYSTEM SETTINGS</div>
        {settings.length === 0 && <div className="minor-text">No custom settings configured.</div>}
        
        <div className="stack-layout" style={{ gap: 24 }}>
          {settings.map((s) => (
            <div key={s.type} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                 <h4 style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.name || s.type}</h4>
                 <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span className={`status-badge ${s.status}`}>{s.status}</span>
                    <button className="secondary-button" style={{ padding: "4px 12px" }} onClick={() => saveSetting(s.type)} disabled={settingsLoading}>
                       {settingsLoading ? "Saving..." : "Save Changes"}
                    </button>
                 </div>
              </div>

              {s.type === 'api_key' ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {Object.entries(s.data || {}).map(([key, val]) => (
                    <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span className="minor-text" style={{ fontSize: 10 }}>{key}</span>
                      <input 
                        type="password" 
                        value={val || ""} 
                        placeholder={`Enter ${key}`}
                        onChange={(e) => updateSetting(s.type, key, e.target.value)} 
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="form-grid">
                  {Object.entries(s.data || {}).map(([key, val]) => (
                    <label key={key}>
                      {key}
                      <input 
                        type="text" 
                        value={typeof val === 'object' ? JSON.stringify(val) : (val || "")} 
                        onChange={(e) => updateSetting(s.type, key, e.target.value)} 
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          {settingsMsg && <div className="minor-text" style={{ color: "var(--success)" }}>{settingsMsg}</div>}
        </div>
      </section>

      {canManageExecution && (
        <section className="panel" style={{ marginTop: 24 }}>
          <div className="panel-label">SYSTEM EXECUTION PROFILE</div>
          <div className="form-grid">
            <label>
              Account
              <select value={execForm.account_id} onChange={(e) => setExecForm((p) => ({ ...p, account_id: e.target.value }))}>
                <option value="">Select account</option>
                {execAccounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.name || a.account_id} ({a.account_id})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Route
              <select value={execForm.route} onChange={(e) => setExecForm((p) => ({ ...p, route: e.target.value }))}>
                {ROUTE_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </label>
            <label>
              Sources (CSV)
              <input value={execForm.source_ids_csv} onChange={(e) => setExecForm((p) => ({ ...p, source_ids_csv: e.target.value }))} />
            </label>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button className="primary-button" onClick={applyExecutionProfile} disabled={execLoading}>
              {execLoading ? "APPLYING..." : "APPLY PROFILE"}
            </button>
            {execMsg && <span className="minor-text">{execMsg}</span>}
          </div>
          
          <div style={{ marginTop: 20 }}>
            <div className="panel-label">Active Profiles</div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr><th>Profile</th><th>Route</th><th>Account</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {execProfiles.map((p) => (
                    <tr key={p.profile_id}>
                      <td>{p.profile_name || p.profile_id}</td>
                      <td>{String(p.route || "").toUpperCase()}</td>
                      <td>{p.account_id}</td>
                      <td><span className={`status-badge ${p.is_active ? "ACTIVE" : "INACTIVE"}`}>{p.is_active ? "ACTIVE" : "INACTIVE"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
