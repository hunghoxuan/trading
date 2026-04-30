# UI Playbook

Use after reading `rules/ui.md`.

Skeleton:
```jsx
<div className="stack-layout fadeIn">
  <div className="toolbar-panel">...</div>
  <div className="logs-layout-split">...</div>
</div>
```

Toolbar:
- left: `.toolbar-pagination`
- right: `.toolbar-search-filter`, `.toolbar-bulk-action`, `.toolbar-create`

Tables:
- sortable headers
- show counts in section headers

Dashboard:
- wins = positive PnL trades
- losses = negative PnL trades
- aggregate by symbol unless asked otherwise

Tokens:
- `--bg`, `--surface`, `--border`, `--text`, `--muted`, `--accent`

Time:
- use `showDateTime`
- 24h clock
- no seconds
- no AM/PM
