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

const API_KEY_NAME_OPTIONS = [
  { value: "GEMINI_API_KEY", label: "Gemini API Key" },
  { value: "OPENAI_API_KEY", label: "OpenAI API Key" },
  { value: "DEEPSEEK_API_KEY", label: "DeepSeek API Key" },
  { value: "CLAUDE_API_KEY", label: "Claude API Key" },
  { value: "TWELVE_DATA_API_KEY", label: "Twelve Data API Key" },
];

function isSystemRole(user) {
  return String(user?.role || "").trim().toLowerCase() === "system";
}

export default function SettingsPage({ authUser, mode = "settings" }) {
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    role: "User",
    is_active: true,
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [settings, setSettings] = useState([]);
  const [activeSettingKey, setActiveSettingKey] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");
  const [newSettingForm, setNewSettingForm] = useState({ type: "api_key", name: "GEMINI_API_KEY", value: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [jsonDetailText, setJsonDetailText] = useState("");
  const [symbolsDetailText, setSymbolsDetailText] = useState("");

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
    ctrader_account_id: "",
  });
  const [logConfig, setLogConfig] = useState([]);
  const [logBusy, setLogBusy] = useState(false);
  const LOG_GROUPS = ["TRADE_", "SIGNAL_", "ACCOUNT_", "AI_", "SYSTEM_"];

  const getSettingKey = (s) => `${String(s?.type || "")}::${String(s?.name || "")}`;

  async function loadData() {
    try {
      const [prof, exec, sets] = await Promise.all([
        api.authProfile(),
        canManageExecution ? api.v2ExecutionProfiles() : Promise.resolve(null),
        api.getSettings(),
      ]);

      if (prof?.user) {
        setProfileForm({
          name: String(prof.user.name || ""),
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
        const list = Array.isArray(sets.settings) ? sets.settings : [];
        setSettings(list);
        setActiveSettingKey((prev) => {
          if (!list.length) return null;
          if (prev && list.some((x) => getSettingKey(x) === prev)) return prev;
          return getSettingKey(list[0]);
        });
        const logSet = list.find((x) => x?.type === "system_config" && x?.name === "enabled_log_prefixes");
        setLogConfig(Array.isArray(logSet?.value) ? logSet.value : []);
      }
      setMsg(""); // Clear potential "Not found" or error from previous load
    } catch (err) {
      console.error(err);
      if (err.message !== "Not found") setMsg(err.message);
    }
  }

  useEffect(() => {
    loadData();
  }, [authUser?.user_id]);

  async function saveMyAccount() {
    const name = String(profileForm.name || "").trim();
    const mail = String(profileForm.email || "").trim();
    if (!name || !mail) {
      setMsg("Name and email are required.");
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

  async function updateSetting(settingKey, field, value) {
    const s = settings.find(x => getSettingKey(x) === settingKey);
    if (!s) return;
    const nextData = { ...s.data, [field]: value };
    setSettings(prev => prev.map(x => getSettingKey(x) === settingKey ? { ...x, data: nextData } : x));
  }

  async function saveSetting(settingKey) {
    const s = settings.find(x => getSettingKey(x) === settingKey);
    if (!s) return;
    setSettingsLoading(true);
    setSettingsMsg("");
    try {
      await api.upsertSetting({ type: s.type, name: s.name, data: s.data, status: s.status });
      setSettingsMsg(`Settings for ${s.type}/${s.name} saved.`);
      await loadData();
    } catch (err) {
      setSettingsMsg(err.message);
    } finally {
      setSettingsLoading(false);
      window.setTimeout(() => setSettingsMsg(""), 3000);
    }
  }

  async function deleteSetting(type, name) {
    if (!window.confirm(`Delete setting ${type}?`)) return;
    setSettingsLoading(true);
    try {
      await api.deleteSetting(type, name || type);
      setSettingsMsg(`Setting ${type} deleted.`);
      setActiveSettingKey(null);
      await loadData();
    } catch (err) {
      setSettingsMsg(err.message);
    } finally {
      setSettingsLoading(false);
      window.setTimeout(() => setSettingsMsg(""), 3000);
    }
  }

  async function createSetting() {
    const { type, name, value } = newSettingForm;
    if (!type || !name) {
      setSettingsMsg("Type and Name are required.");
      return;
    }
    setSettingsLoading(true);
    try {
      let data = { value: String(value || "") };
      if (String(type).toLowerCase() === "symbols") {
        const symbols = String(value || "")
          .split(/[\n,]/)
          .map((x) => String(x || "").trim().toUpperCase())
          .filter(Boolean);
        data = { symbols: [...new Set(symbols)] };
      } else if (String(type).toLowerCase() !== "api_key") {
        const parsed = JSON.parse(String(value || "{}"));
        data = parsed && typeof parsed === "object" ? parsed : {};
      }
      await api.upsertSetting({ type, name, data, status: "active" });
      setSettingsMsg(`Setting ${type} created.`);
      setShowAddForm(false);
      setNewSettingForm({ type: "api_key", name: "GEMINI_API_KEY", value: "" });
      setActiveSettingKey(`${type}::${name}`);
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
      setExecMsg("Profile applied.");
      await loadData();
    } catch (error) {
      setExecMsg(error?.message || "Failed to apply profile");
    } finally {
      setExecLoading(false);
      window.setTimeout(() => setExecMsg(""), 4000);
    }
  }

  async function saveLoggingConfig(next) {
    setLogBusy(true);
    try {
      await api.upsertSetting({
        type: "system_config",
        name: "enabled_log_prefixes",
        value: next,
        status: "active",
      });
      setLogConfig(next);
      setMsg("Logging configuration updated.");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLogBusy(false);
      window.setTimeout(() => setMsg(""), 3000);
    }
  }

  const selectedSetting = useMemo(
    () => settings.find((s) => getSettingKey(s) === activeSettingKey),
    [settings, activeSettingKey],
  );
  const isProfileMode = String(mode || "").toLowerCase() === "profile";

  useEffect(() => {
    if (!selectedSetting) {
      setJsonDetailText("");
      setSymbolsDetailText("");
      return;
    }
    const type = String(selectedSetting.type || "").toLowerCase();
    if (type === "symbols") {
      const arr = Array.isArray(selectedSetting?.data?.symbols) ? selectedSetting.data.symbols : [];
      setSymbolsDetailText(arr.map((x) => String(x || "").trim()).filter(Boolean).join("\n"));
      setJsonDetailText("");
      return;
    }
    if (type === "api_key") {
      setJsonDetailText("");
      setSymbolsDetailText("");
      return;
    }
    try {
      setJsonDetailText(JSON.stringify(selectedSetting?.data || {}, null, 2));
    } catch {
      setJsonDetailText("{}");
    }
    setSymbolsDetailText("");
  }, [activeSettingKey, selectedSetting?.type, selectedSetting?.name]);

  return (
    <div className="stack-layout fadeIn" style={{ paddingBottom: 40 }}>
      <h2 className="page-title">{isProfileMode ? "Profile" : "Settings"}</h2>

      {/* Top Grid: Profile, Password, Execution */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "start" }}>
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

        <section className="panel" style={{ height: "100%" }}>
          <div className="panel-label">UPDATE PASSWORD</div>
          <div className="stack-layout" style={{ gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="minor-text">Current Password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current pwd"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="minor-text">New Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New pwd"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="minor-text">Confirm</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat"
              />
            </label>
            <div style={{ marginTop: 8 }}>
              <button className="primary-button" onClick={resetPassword} disabled={pwdLoading}>
                {pwdLoading ? "UPDATING..." : "UPDATE"}
              </button>
            </div>
            {pwdLoading ? <div className="minor-text" style={{ marginTop: 4 }}>Updating...</div> : null}
          </div>
        </section>

        {canManageExecution && (
          <section className="panel" style={{ height: "100%" }}>
            <div className="panel-label">EXECUTION PROFILE</div>
            <div className="stack-layout" style={{ gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="minor-text">Account</span>
                <select value={execForm.account_id} onChange={(e) => setExecForm((p) => ({ ...p, account_id: e.target.value }))}>
                  <option value="">Select account</option>
                  {execAccounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.name || a.account_id}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                 <span className="minor-text">Route</span>
                 <select value={execForm.route} onChange={(e) => setExecForm((p) => ({ ...p, route: e.target.value }))}>
                   {ROUTE_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                 </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                 <span className="minor-text">Sources (CSV)</span>
                 <input value={execForm.source_ids_csv} onChange={(e) => setExecForm((p) => ({ ...p, source_ids_csv: e.target.value }))} />
              </label>
              <div style={{ marginTop: 8 }}>
                <button className="primary-button" onClick={applyExecutionProfile} disabled={execLoading}>
                  {execLoading ? "APPLYING..." : "APPLY PROFILE"}
                </button>
              </div>
              {execMsg && <div className="minor-text" style={{ marginTop: 4 }}>{execMsg}</div>}
            </div>
          </section>
        )}

        <section className="panel" style={{ height: "100%" }}>
          <div className="panel-label">UI PREFERENCES</div>
          <div className="stack-layout" style={{ gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="minor-text">Auto Refresh Interval</span>
              <select 
                value={localStorage.getItem("tvbridge_refresh_ms") || "10000"} 
                onChange={(e) => {
                  localStorage.setItem("tvbridge_refresh_ms", e.target.value);
                  setMsg("Refresh interval updated.");
                  window.setTimeout(() => setMsg(""), 2000);
                  // Force a re-render if needed, but localStorage is usually enough for the other pages
                  setProfileForm(f => ({ ...f })); 
                }}
              >
                <option value="5000">5 seconds</option>
                <option value="10000">10 seconds</option>
                <option value="15000">15 seconds</option>
                <option value="30000">30 seconds</option>
                <option value="60000">1 minute</option>
                <option value="120000">2 minutes</option>
              </select>
            </label>
            <div className="minor-text" style={{ marginTop: 4 }}>
              Controls how often the Dashboard, Trades, and Signals pages update automatically.
            </div>
          </div>
        </section>

        <section className="panel" style={{ height: "100%" }}>
          <div className="panel-label">LOGGING CONFIGURATION</div>
          <div className="stack-layout" style={{ gap: 12 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
              <button 
                className="secondary-button" 
                style={{ padding: "4px 8px", fontSize: 10 }}
                onClick={() => saveLoggingConfig(LOG_GROUPS)}
              >
                CHECK ALL
              </button>
              <button 
                className="secondary-button" 
                style={{ padding: "4px 8px", fontSize: 10 }}
                onClick={() => saveLoggingConfig([])}
              >
                UNCHECK ALL
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {LOG_GROUPS.map(prefix => {
                const checked = logConfig.includes(prefix);
                return (
                  <label key={prefix} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={checked} 
                      onChange={(e) => {
                        const next = e.target.checked 
                          ? [...logConfig, prefix]
                          : logConfig.filter(x => x !== prefix);
                        saveLoggingConfig(next);
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{prefix}*</span>
                  </label>
                );
              })}
            </div>
            {logBusy && <div className="minor-text" style={{ marginTop: 4 }}>Saving...</div>}
            <div className="minor-text" style={{ marginTop: 8, fontSize: 10 }}>
              Enable/disable database logging for different event groups. Uncheck all for maximum performance.
            </div>
          </div>
        </section>
      </div>

      {!isProfileMode && (
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, marginTop: 24 }}>
        {/* Left: Sidebar */}
        <section className="panel" style={{ margin: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="panel-label" style={{ margin: 0 }}>SETTINGS LIST</div>
            <button className="secondary-button" style={{ padding: "4px 8px" }} onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showAddForm && (
            <div className="stack-layout fadeIn" style={{ gap: 10, paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
               <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="minor-text" style={{ fontSize: 10 }}>Category (Type)</span>
                  <select 
                    style={{ width: "100%" }}
                    value={newSettingForm.type} 
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setNewSettingForm((p) => ({
                        ...p,
                        type: nextType,
                        name: nextType === "api_key" ? (p.name || "GEMINI_API_KEY") : p.name,
                      }));
                    }}
                  >
                    <option value="api_key">api_key</option>
                    <option value="symbols">symbols</option>
                    <option value="ai_template">ai_template</option>
                    <option value="note">note</option>
                  </select>
               </label>
               <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="minor-text" style={{ fontSize: 10 }}>Entry Name (e.g. Gemini)</span>
                  {newSettingForm.type === "api_key" ? (
                    <select
                      value={newSettingForm.name}
                      onChange={(e) => setNewSettingForm((p) => ({ ...p, name: e.target.value }))}
                    >
                      {API_KEY_NAME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : newSettingForm.type === "symbols" ? (
                    <input
                      placeholder="WATCHLIST"
                      value={newSettingForm.name}
                      onChange={e => setNewSettingForm(p => ({ ...p, name: e.target.value }))}
                    />
                  ) : (
                    <input 
                      placeholder="name (e.g. Gemini API)" 
                      value={newSettingForm.name} 
                      onChange={e => setNewSettingForm(p => ({ ...p, name: e.target.value }))} 
                    />
                  )}
               </label>
               <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="minor-text" style={{ fontSize: 10 }}>Value</span>
                  <textarea
                    rows={newSettingForm.type === "api_key" ? 3 : 10}
                    placeholder={newSettingForm.type === "api_key" ? "Value" : "JSON object"}
                    value={newSettingForm.value}
                    onChange={e => setNewSettingForm(p => ({ ...p, value: e.target.value }))}
                  />
               </label>
               <button className="primary-button" onClick={createSetting} disabled={settingsLoading}>CREATE</button>
            </div>
          )}

          <div className="stack-layout" style={{ gap: 2 }}>
            {settings.map(s => (
              <div 
                key={getSettingKey(s)}
                className={`sidebar-item ${activeSettingKey === getSettingKey(s) ? "active" : ""}`}
                style={{ 
                  padding: "10px 14px", 
                  borderRadius: 6, 
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: activeSettingKey === getSettingKey(s) ? "var(--selection)" : "transparent",
                  color: activeSettingKey === getSettingKey(s) ? "var(--primary-bright)" : "inherit"
                }}
                onClick={() => setActiveSettingKey(getSettingKey(s))}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                   <span style={{ fontWeight: 500, fontSize: 13 }}>{s.name || s.type}</span>
                   <span className="minor-text" style={{ fontSize: 10 }}>{s.type}</span>
                </div>
                <span className={`status-badge ${s.status}`} style={{ fontSize: 9 }}>{s.status}</span>
              </div>
            ))}
            {settings.length === 0 && <div className="minor-text">No settings found.</div>}
          </div>
        </section>

        {/* Right: Detail */}
        <section className="panel" style={{ margin: 0 }}>
           {selectedSetting ? (
             <div className="fadeIn">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                   <div>
                      <h3 style={{ margin: 0, textTransform: "uppercase" }}>{selectedSetting.name}</h3>
                      <div className="minor-text" style={{ marginTop: 4 }}>Internal Type: {selectedSetting.type}</div>
                   </div>
                   <div style={{ display: "flex", gap: 12 }}>
                      <button className="primary-button" onClick={() => saveSetting(getSettingKey(selectedSetting))} disabled={settingsLoading}>SAVE CHANGES</button>
                      <button className="danger-button" onClick={() => deleteSetting(selectedSetting.type, selectedSetting.name)} disabled={settingsLoading}>DELETE</button>
                   </div>
                </div>

                {selectedSetting.type === 'api_key' ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {Object.entries(selectedSetting.data || {}).map(([key, val]) => (
                      <label key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span className="minor-text" style={{ fontSize: 11 }}>{key}</span>
                        <input 
                          type="password" 
                          value={val || ""} 
                          placeholder={`Enter ${key}`}
                          onChange={(e) => updateSetting(getSettingKey(selectedSetting), key, e.target.value)} 
                        />
                      </label>
                    ))}
                  </div>
                ) : String(selectedSetting.type || "").toLowerCase() === "symbols" ? (
                  <div className="stack-layout" style={{ gap: 10 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="minor-text" style={{ fontSize: 11 }}>symbols (one per line)</span>
                      <textarea
                        rows={12}
                        value={symbolsDetailText}
                        onChange={(e) => {
                          const text = e.target.value;
                          setSymbolsDetailText(text);
                          const arr = text.split(/[\n,]/).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean);
                          setSettings(prev => prev.map(x => getSettingKey(x) === getSettingKey(selectedSetting) ? { ...x, data: { ...(x.data || {}), symbols: [...new Set(arr)] } } : x));
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="stack-layout" style={{ gap: 20 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="minor-text" style={{ fontSize: 11 }}>JSON Data</span>
                      <textarea rows={18} value={jsonDetailText} onChange={(e) => setJsonDetailText(e.target.value)} />
                    </label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(String(jsonDetailText || "{}"));
                            setSettings(prev => prev.map(x => getSettingKey(x) === getSettingKey(selectedSetting) ? { ...x, data: parsed } : x));
                            setSettingsMsg("JSON updated. Click SAVE CHANGES to persist.");
                          } catch (err) {
                            setSettingsMsg(`Invalid JSON: ${err?.message || "parse error"}`);
                          }
                        }}
                      >
                        APPLY JSON
                      </button>
                      <span className="minor-text">Default JSON editor mode</span>
                    </div>
                  </div>
                )}
                
                {settingsMsg && <div className="minor-text" style={{ marginTop: 16, color: "var(--success)" }}>{settingsMsg}</div>}
             </div>
           ) : (
             <div className="empty-state" style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
                Select a setting from the list to view and edit details.
             </div>
           )}
        </section>
      </div>
      )}

      {canManageExecution && execProfiles.length > 0 && (
         <section className="panel" style={{ marginTop: 24 }}>
            <div className="panel-label">EXECUTION STATUS</div>
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
         </section>
      )}
    </div>
  );
}
