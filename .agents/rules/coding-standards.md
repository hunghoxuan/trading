---
description: Coding standards for file header versioning, naming, and section order
---

Apply these standards whenever adding or refactoring code in this project.

## 1) Version Header Consistency

1. KIT library files use `@lib-version: N` header.
2. Indicator files use `@file-version: MMDD-NN` header.
3. **When adding or removing code (not a bug fix):** increment `@lib-version` by 1 in the KIT file AND update all indicator `import` statements to point to the new version number.
4. **Bug fixes only:** do not bump `@lib-version` unless the fix changes the public API surface.
5. Do not leave mixed version header styles across KIT and indicator files.

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

Every Pine file must follow this section order exactly:

```
// ==================== global vars, state, singletons ====================
// ==================== types, consts ====================
// ==================== input settings ====================
// ==================== local helpers ====================
// ==================== main logic ====================
```

When adding new code, place it in the correct section — never append at end of file.
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

## 10) Token & Code Optimization

1. Always write the most concise correct code — no redundant variables, no intermediate assignments that serve no purpose.
2. Prefer ternary expressions over multi-line if/else when result fits on one readable line.
3. Combine related operations in one pass; avoid separate loops over the same array.
4. Do not add comments that restate what the code already clearly says.
5. New KIT functions must be as short as possible while remaining correct and readable.

## 11) Bug Doc Update

When fixing a bug:
1. After confirming the fix works, add a record to `.agents/docs/common-errors.md`.
2. Format: `## [ErrorType] Short title` → cause → fix → prevention.
3. This prevents the same bug from being diagnosed again in future sessions.
