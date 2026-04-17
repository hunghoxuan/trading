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
        <label>
          <div className="muted small">Username</div>
          <input value={form.user_name || ""} onChange={(e) => setForm((p) => ({ ...p, user_name: e.target.value }))} />
        </label>

        <label>
          <div className="muted small">Email</div>
          <input value={form.email || ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </label>

        {showRole ? (
          <label>
            <div className="muted small">Role</div>
            <select value={form.role || "User"} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} disabled={disableRole}>
              {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        ) : null}

        <label>
          <div className="muted small">{passwordLabel}</div>
          <input
            type="password"
            value={form.password || ""}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="Leave empty to keep current"
          />
        </label>

        {showActive ? (
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              disabled={disableActive}
            />
            <span className="minor-text">Active</span>
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
