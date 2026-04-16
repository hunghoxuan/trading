import { useState } from "react";
import { getRuntimeApiKey, setRuntimeApiKey } from "../api";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(getRuntimeApiKey());
  const [email, setEmail] = useState(localStorage.getItem("tvbridge_email") || "");
  const [password, setPassword] = useState(localStorage.getItem("tvbridge_password") || "");
  const [msg, setMsg] = useState("");

  function save() {
    setRuntimeApiKey(apiKey);
    localStorage.setItem("tvbridge_email", String(email || "").trim());
    localStorage.setItem("tvbridge_password", String(password || ""));
    setMsg("Saved.");
    window.setTimeout(() => setMsg(""), 1500);
  }

  return (
    <section className="panel stack-layout settings-page">
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
        <div className="muted small">Email</div>
        <input
          type="email"
          placeholder="Optional email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        <div className="muted small">Password</div>
        <input
          type="password"
          placeholder="Optional password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={save} style={{ width: "auto" }}>Save</button>
        {msg ? <span className="muted small">{msg}</span> : null}
      </div>
    </section>
  );
}
