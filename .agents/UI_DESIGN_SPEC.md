# Institutional UI Design Specification (v1.0)

This document defines the core tokens, layout patterns, and component logic for the Trading Webhook-UI. Any future modifications or AI agents MUST adhere to these standards to ensure a unified, professional SMC (Smart Money Concept) aesthetic.

---

## 🎨 1. Theme Tokens (CSS Variables)

The UI supports **Dark Mode** (Default) and **SMC Light Mode**. 

| Token | Dark (Default) | Light | Usage |
| :--- | :--- | :--- | :--- |
| `--bg` | `#0b0f14` | `#ffffff` | Background of the page |
| `--surface` | `#121821` | `#f8fafc` | Main panel backgrounds |
| `--panel` | `#161c27` | `#f1f5f9` | Header/Footer components |
| `--border` | `#263244` | `#e2e8f0` | All borders and separators |
| `--text` | `#e6edf3` | `#0f172a` | Primary text |
| `--muted` | `#9fb0c4` | `#64748b` | Secondary/Meta text |
| `--accent` | `#22d3ee` | `#0284c7` | Institutional highlights (Cyan/Sky) |

---

## 🏗️ 2. Structural Layout Patterns

### A. The Page Container (`stack-layout`)
Every page MUST start with a wrapping `div` that enforces the institutional vertical rhythm.
```jsx
<div className="stack-layout fadeIn">
  {/* Header/Toolbar */}
  <div className="toolbar-panel">...</div>
  {/* Content */}
  <div className="logs-layout-split">...</div>
</div>
```

### B. High-Density Split Layout (`logs-layout-split`)
For data inspection (Trades, Logs, DB), use the three-tier split:
1.  **Toolbar (`toolbar-panel`)**: Filters on the left, primary actions on the right.
2.  **List Pane (`logs-list-pane`)**: 66% width. Scrollable table container.
3.  **Detail Pane (`logs-detail-pane`)**: 34% width. Granular telemetry inspection.

---

## 🧩 3. Component Standards

### A. Badges (Trade Status)
Use `.badge` with color modifiers.
- **TP / SUCCESS**: Green (`#10b981`)
- **SL / FAIL**: Red (`#ef4444`)
- **START / ACTIVE**: Blue (`#3b82f6`)
- **PLACED / PENDING**: Amber (`#f59e0b`)

### B. Typography
- **Major Text (`cell-major`)**: 14px. Institutional data.
- **Minor Text (`cell-minor`, `minor-text`)**: 12px. Technical IDs and secondary metadata. Always uses `--muted` color.

### C. Panels & Cards
All container boxes MUST use the standard `.panel` or `.kpi-card` classes. This enforces:
- `border-radius: 12px`
- `padding: 18px`
- Consistent border color (`--border`)

---

## 🧠 4. AI-Specific implementation Rules

1.  **No Placeholders**: Never use "lorem ipsum". Use `generate_image` or realistic SMC data.
2.  **Transition Sync**: Every UI state change (active row select, page change) MUST include `.fadeIn` class for smooth transitions.
3.  **Normalization**: Always pass timestamps through the `fDateTime` helper (standardized 2-digit format).
4.  **Error Handling**: Pages MUST include a top-level error banner inside the `stack-layout`.

---

*Last Updated: 2026-04-17*
