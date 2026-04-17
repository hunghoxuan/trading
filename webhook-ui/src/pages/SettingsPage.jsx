import { useState } from "react";
import { getRuntimeApiKey, setRuntimeApiKey } from "../api";
import { api } from "../api";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(getRuntimeApiKey());
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [msg, setMsg] = useState("");

  function save() {
    setRuntimeApiKey(apiKey);
    setMsg("API key saved.");
    window.setTimeout(() => setMsg(""), 1500);
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
