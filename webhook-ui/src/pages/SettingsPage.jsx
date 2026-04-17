import { useEffect, useState } from "react";
import { getRuntimeApiKey, setRuntimeApiKey } from "../api";
import { api } from "../api";

export default function SettingsPage({ authUser }) {
  const [apiKey, setApiKey] = useState(getRuntimeApiKey());
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setUserName(String(authUser?.user_name || ""));
    setEmail(String(authUser?.email || ""));
    api.authProfile()
      .then((out) => {
        if (out?.user) {
          setUserName(String(out.user.user_name || ""));
          setEmail(String(out.user.email || ""));
        }
      })
      .catch(() => {});
  }, [authUser?.user_name, authUser?.email]);

  function save() {
    setRuntimeApiKey(apiKey);
    setMsg("API key saved.");
    window.setTimeout(() => setMsg(""), 1500);
  }

  async function saveProfile() {
    const name = String(userName || "").trim();
    const mail = String(email || "").trim();
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
      <section className="panel settings-page" style={{ maxWidth: '600px' }}>
      <h2>Settings</h2>
      <label>
        <div className="muted small">Username</div>
        <input
          type="text"
          placeholder="Display username"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
      </label>
      <label>
        <div className="muted small">Email</div>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        <div className="muted small">API Key</div>
        <input
            type="password"
            placeholder="Enter API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>
        <label>
          <div className="muted small">Current Password</div>
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label>
          <div className="muted small">New Password</div>
          <input
            type="password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label>
          <div className="muted small">Confirm New Password</div>
          <input
            type="password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={saveProfile} style={{ width: "auto" }} disabled={profileLoading}>
          {profileLoading ? "Saving..." : "Save Profile"}
        </button>
        <button onClick={save} style={{ width: "auto" }}>Save API Key</button>
        <button onClick={resetPassword} style={{ width: "auto" }} disabled={pwdLoading}>
          {pwdLoading ? "Updating..." : "Reset Password"}
          </button>
          {msg ? <span className="muted small">{msg}</span> : null}
        </div>
      </section>
    </div>
  );
}
