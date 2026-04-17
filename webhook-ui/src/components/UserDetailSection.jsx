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
  primaryLabel = "💾 SAVE",
  onPrimary,
  primaryDisabled = false,
  secondaryLabel = "",
  onSecondary,
  secondaryDisabled = false,
  secondaryDanger = false,
  fieldErrors = {},
  formMessage = null,
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
          {fieldErrors.user_name ? <div className="field-validation msg-error">{fieldErrors.user_name}</div> : null}
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="minor-text">Email</div>
          <input 
            value={form.email || ""} 
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} 
            style={{ width: '100%', maxWidth: '400px' }}
          />
          {fieldErrors.email ? <div className="field-validation msg-error">{fieldErrors.email}</div> : null}
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
          {fieldErrors.password ? <div className="field-validation msg-error">{fieldErrors.password}</div> : null}
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

        {formMessage?.text ? <div className={`form-message msg-${formMessage.type || "error"}`}>{formMessage.text}</div> : null}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="primary-button" onClick={onPrimary} disabled={primaryDisabled}>{primaryLabel}</button>
          {secondaryLabel ? (
            <button
              type="button"
              className={secondaryDanger ? "danger-button" : "secondary-button"}
              onClick={onSecondary}
              disabled={secondaryDisabled}
              style={secondaryDanger ? undefined : undefined}
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
