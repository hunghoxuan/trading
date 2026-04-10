---
description: Coding standards for file header versioning, naming, and section order
---

Apply these standards whenever adding or refactoring code in this project.

## 1) Version Header Consistency

1. Keep header version/trace markers consistent across related source files.
2. When one file header version marker is updated, update all target files in the same change set to the same version marker format.
3. Do not leave mixed version header styles across KIT and indicator files.

## 2) Naming Convention

1. Feature method naming:
- `get_data_xxx` for data gathering/computation inputs.
- `draw_data_xxx` for rendering and visual updates.
- `process_data_xxx` for orchestration/state mutation pipeline.

2. Helper naming:
- Use `local_` prefix for indicator-local helpers.
- Exception: KIT-clone temporary helpers must follow KIT policy naming `{CORE/SMC/UI}_{method_name}`.

3. Prefer clear domain names:
- Use `trade` naming for trade concepts.
- Use `pd_array` naming for PD array concepts.
- Use `event` naming for trigger/event queue concepts (prefer `events` over `triggers`).
- Do not run broad rename migrations unless explicitly requested for the task.

## 3) Code Section Order in File

When adding new code, keep this order:
1. UAT blocks / runtime toggles (if any)
2. Constants
3. Global vars (`var`)
4. Local/common helpers
5. Feature methods grouped by pipeline:
- `get_data_xxx`
- `draw_data_xxx`
- `process_data_xxx`

Keep this order stable to reduce merge conflicts and speed up debugging.

## 4) ChartContext Ownership

Use `ChartContext` as the shared data container across indicators.

1. Shared arrays must live in `ChartContext`:
- `zones`
- `levels`
- `events`
- `signalHist`

2. Do not introduce parallel global arrays with the same role in indicators.

3. Keep `trades` outside `ChartContext` unless explicitly requested.

4. When calling shared context builders (for example `get_data_context`), pass `chartCtx` arrays directly instead of local shadow arrays.

## 5) Runtime Context

Use `RuntimeContext` for chart lifecycle/runtime gates:
- `chartIsNew`
- `symbolChanged`
- `tfChanged`
- `tradeScanEnabled`

Do not duplicate this logic per indicator when shared helper exists in KIT.

## 6) Docs Freshness

Whenever logic/pipeline changes materially:
1. Update `.agents/rules` or `.agents/workflows` in the same task.
2. Remove or rewrite outdated instructions.
3. Keep docs concise and aligned with current code behavior.
4. For new feature requests, record `do-now` vs `backlog` decision in `.agents/roadmap/`.

## 7) Pine Error Safety

Before major Pine refactors, apply:
- `.agents/rules/pine-error-prevention.md`

## 8) Execution Discipline

1. Always provide one master plan before edits.
2. Small/mechanical tasks must be executed one-pass (no unnecessary micro-steps).
3. Do not expand scope mid-run unless user explicitly approves.
4. Every phase must include a clear done condition.

## 9) Feature Preservation

1. Never delete, remove, or silently downgrade an existing user-facing feature without explicit user confirmation.
2. If token/compile limits force tradeoffs, pause and ask before cutting an existing feature.
3. When a feature is temporarily disabled for debugging, call that out clearly and restore it before wrap-up unless the user approves the removal.
