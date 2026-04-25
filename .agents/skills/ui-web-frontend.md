## 🏗️ 2. Structural Layout Patterns

### A. The Page Container (`stack-layout`)
Every page MUST start with a wrapping `div` that enforces the institutional vertical rhythm. It MUST include the `.fadeIn` utility for a premium, non-jarring transition.
```jsx
<div className="stack-layout fadeIn">
  {/* Header/Toolbar Section */}
  <div className="toolbar-panel">...</div>
  
  {/* Primary Data Section */}
  <div className="logs-layout-split">...</div>
</div>
```

1.  **Toolbar Left (`toolbar-pagination`)**: 
    - **Pagination**: The `.pager-mini` control group.
        - **Adaptive Visibility**: If `totalPages <= 1`, HIDE the navigation buttons (PREV/NEXT).
        - **Persistent Data**: ALWAYS show the total record count (e.g., "Showing 18 RESULTS").
2.  **Toolbar Right Alignment**:
    - **Search & Filters (`toolbar-search-filter`)**: Keyword input + Contextual selects. This group MUST use `margin-left: auto` to align consistently to the right/end.
    - **Bulk Actions (`toolbar-bulk-action`)**: Contextual actions.
    - **Primary Actions (`toolbar-create`)**: The tail-end action button (e.g., CREATE).

---

## 🧩 3. Component Standards

### A. Button Hierarchy
Every interactive action MUST use one of the three established semantic tiers:
- **Primary (`primary-button`)**: Used for Creative, Submission, or Strategic actions (e.g., CREATE, APPLY, SAVE). Solid background (`--accent`).
- **Secondary (`secondary-button`)**: Used for Navigation or Auxiliary system actions (e.g., PREV/NEXT, LOGIN, LOGOUT, THEME TOGGLE). Transparent background, white/muted border.
- **Danger (`danger-button`)**: Used for Destructive or Sensitive actions (e.g., DELETE, REMOVE, DEACTIVATE). Transparent background, red border.

### A. High-Density List (`events-table`)
- **Sortable Headers**: Grid headers MUST be interactive, supporting both ascending and descending sorts. Remove legacy "Sort" combo boxes from the toolbar if header sorting is available.
- **Dynamic Summaries**: Section headers (e.g., in the Dashboard) MUST show the total count (e.g., "18 SYMBOLS") instead of generic "Top" labels.

### B. Form Design (`settings-page`, `login-page`)
- **Consistency**: Labels and Inputs MUST follow a strict vertical stack.
- **Labels**: MUST use the `.minor-text` style (12px, `--muted`, uppercase) to match grid aesthetics.
- **Inputs**: MUST occupy a generous width (at least 320px for singular inputs, or `100%` of container) to ensure high-grade data entry.

### C. Detailed Inspection Pane (`logs-detail-pane`)
- **Telemetry Audit**: Present data in a granular, structured hierarchy with `border-bottom` separators.
- **Sensitive Data**: AI Agents MUST blacklist and never render credential fields (hashes, keys, tokens).

### D. Form UX and Action States (Mandatory)
- **Group Alignment Rule**: Inputs, selects, and buttons that belong to the same meaning or workflow step MUST be placed in the same row/group and visually aligned.
- **Alignment Rule**: Form grids and action rows MUST maintain clean horizontal/vertical alignment across breakpoints (no overlap, no uneven baselines).
- **Processing Button Rule**: On click while processing, action button MUST:
  - become disabled
  - show a spinner icon inside the button
  - prevent duplicate submits
- **Validation/Feedback Placement Rule**: Validation error, error, warning, and success feedback for a form MUST be rendered directly below that form’s input/action group only (not in unrelated areas).
- **Dirty-Form Rule**: `Save`/`Add`/`Submit` action buttons are disabled by default and only enabled when the form becomes dirty (user has changed at least one value from initial state) and passes basic required validation.

---

## 📊 4. Financial Logic (Dashboard)

- **Win/Lose Calculation**: "Win" MUST be the sum of all positive PnL trades. "Lose" MUST be the sum of all negative PnL trades. Do not use trade direction (Buy/Sell) or trade counts for financial performance cards.
- **Symbol Aggregation**: Do not separate performance by direction (Buy/Sell) in summary lists unless explicitly requested. Always show the combined total per Symbol/Strategy.

---

## 🎨 5. Theme Tokens (CSS Variables)

| Token | Dark (Default) | Light | Usage |
| :--- | :--- | :--- | :--- |
| `--bg` | `#0b0f14` | `#ffffff` | Page background |
| `--surface` | `#121821` | `#f8fafc` | Component background |
| `--border` | `#263244` | `#e2e8f0` | Structured borders |
| `--text` | `#e6edf3` | `#0f172a` | Content text |
| `--muted` | `#9fb0c4` | `#64748b` | Metadata text (12px) |
| `--accent` | `#22d3ee` | `#0284c7` | Global highlights |

---

## 🕒 6. Date & Time Representation
All timestamps across the platform MUST follow these standardized rules (use `showDateTime` utility):
1. **Recent Dates**: 
   - If time is < 30 mins ago: Show `"xxx mins ago"` (or `"Just now"` if < 1 min).
   - If date is Today: Show `"Today HH:mm"`.
   - If date is Yesterday: Show `"Yesterday HH:mm"`.
2. **Older Dates**: Show format `DD/MM/YYYY HH:mm`.
3. **Format constraints**: 
   - ALWAYS use 24-hour clock (`HH:mm`).
   - NEVER show seconds.
   - NEVER show `"AM"` or `"PM"`.
   - Use the shared `showDateTime` utility in `web-ui/src/utils/format.js` for all UI rendering.

---

*Last Updated: 2026-04-24*
