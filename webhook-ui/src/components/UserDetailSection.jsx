import React from "react";

export default function UserDetailSection({
  title,
  form,
  setForm,
  roleOptions = [],
  showRole = true,
  showActive = true,
  disableRole = false,
  disableActive = false,
  passwordLabel = "New Password (optional)",
  primaryLabel = "SAVE",
  onPrimary,
  primaryDisabled = false,
  secondaryLabel = "",
  onSecondary,
  secondaryDisabled = false,
  secondaryDanger = false,
  footer = null,
}) {
  return (
    <div className="panel" style={{ margin: 0 }}>
      <div className="panel-label">{title}</div>
      <div className="stack-layout" style={{ gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="minor-text">Username</div>
          <input 
            value={form.user_name || ""} 
            onChange={(e) => setForm((p) => ({ ...p, user_name: e.target.value }))} 
            style={{ width: '100%', maxWidth: '400px' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="minor-text">Email</div>
          <input 
            value={form.email || ""} 
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} 
            style={{ width: '100%', maxWidth: '400px' }}
          />
        </label>

        {showRole ? (
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="minor-text">Role</div>
            <select 
              value={form.role || "User"} 
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} 
              disabled={disableRole}
              style={{ width: '100%', maxWidth: '400px' }}
            >
              {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        ) : null}

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="minor-text">{passwordLabel}</div>
          <input
            type="password"
            value={form.password || ""}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="Leave empty to keep current"
            style={{ width: '100%', maxWidth: '400px' }}
          />
        </label>

        {showActive ? (
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={Boolean(form.is_active)}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              disabled={disableActive}
            />
            <span className="minor-text">Active Account</span>
          </label>
        ) : null}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onPrimary} disabled={primaryDisabled}>{primaryLabel}</button>
          {secondaryLabel ? (
            <button
              type="button"
              onClick={onSecondary}
              disabled={secondaryDisabled}
              style={secondaryDanger ? { background: "#7f1d1d", color: "#fee2e2" } : undefined}
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>

        {footer}
      </div>
    </div>
  );
}
