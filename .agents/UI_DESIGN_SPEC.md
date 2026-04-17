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

### C. The Standard Toolbar (`toolbar-panel`)
All data exploration pages (Trades, Logs, DB) MUST follow this functional grouping:

1.  **Toolbar Left (`toolbar-left`)**: 
    - **Header Label**: The `.kpi-label` identifying the component.
    - **Pagination**: The `.pager-mini` control group.
        - **Adaptive Visibility**: If `totalPages <= 1`, HIDE the navigation buttons (PREV/NEXT).
        - **Persistent Data**: ALWAYS show the total record count (e.g., "Showing 10 of 18") or current page info.
2.  **Toolbar Right (`toolbar-right`)**:
    - **Search & Filters**: Keyword input + Contextual selects.
    - **Separator**: A `.toolbar-separator` to distinguish filters from actions.
    - **Bulk Actions**: A `.select` for action type + a `.button` (usually "OK" or "GO") to execute.

---

## 🧩 3. Component Standards

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

*Last Updated: 2026-04-17*
