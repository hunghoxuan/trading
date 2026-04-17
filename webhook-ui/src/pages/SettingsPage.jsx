import { useEffect, useState } from "react";
import { getRuntimeApiKey, setRuntimeApiKey, api } from "../api";
import UserDetailSection from "../components/UserDetailSection";

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
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="minor-text">API Key</div>
            <input
              type="password"
              placeholder="Enter API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="primary-button" onClick={saveApiKey} style={{ width: "auto" }}>Save API Key</button>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="minor-text">Current Password</div>
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="minor-text">New Password</div>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="minor-text">Confirm New Password</div>
            <input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="secondary-button" onClick={resetPassword} style={{ width: "auto" }} disabled={pwdLoading}>
              {pwdLoading ? "Updating..." : "Reset Password"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
