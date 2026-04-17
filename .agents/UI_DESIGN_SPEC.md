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

### B. The Standard Toolbar (`toolbar-panel`)
All data exploration pages (Trades, Logs, DB) MUST follow this functional grouping:

1.  **Toolbar Left (`toolbar-left`)**: 
    - **Header Label**: The `.kpi-label` identifying the component.
    - **Pagination**: The `.pager-mini` control group (Prev/PageInfo/Next) + `.pageSize` select. High-priority for immediate navigation.
2.  **Toolbar Right (`toolbar-right`)**:
    - **Search & Filters**: Keyword input + Contextual selects (Status, Symbols, Tables).
    - **Separator**: A `.toolbar-separator` to distinguish filters from actions.
    - **Bulk Actions**: A `.select` for action type + a `.button` (usually "OK" or "GO") to execute.

---

## 🧩 3. Component Standards

### A. High-Density List (`events-table`)
The list pane (`logs-list-pane`) MUST wrap the table in an `.events-table-wrap` for independently scrollable context.
- **Side Highlights**: Use `.side-buy` (Green) and `.side-sell` (Red) prefixes for action-oriented rows.
- **Cell Wrapping**: Use `.cell-wrap` to stack `.cell-major` (Label) and `.cell-minor` (Metadata).

### B. Detailed Inspection Pane (`logs-detail-pane`)
The right-side auditing pane MUST present data in a granular, structured hierarchy:
- **Header**: Standardized `<h2>` label.
- **Detail Grid**: Use a vertical stack of detail rows with `border-bottom` separators.
- **Sensitive Data**: AI Agents MUST blacklist and never render credential fields (hashes, keys, tokens).

---

## 🎨 4. Theme Tokens (CSS Variables)

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
