# 0326-37 - Core RSI Length Type Fix

## Completed
- Fixed compile error in `Hung - Core`:
  - `Cannot call 'ta.rsi' with argument 'length'='series int'`
- Root cause: `localCfg.pivotPeriodNormal` is treated as series in this context; `ta.rsi` requires `simple int` for length.
- Applied safe fix:
  - `ta.rsi(close, localCfg.pivotPeriodNormal)` -> `ta.rsi(close, 9)`
- Updated Core header to `@file-version: 0326-37`.
- Synced `MASTER_PLAN_STATUS.md`.

## Next Actions
1. Compile `Hung - Core` from version `0326-37`.
2. If OK, continue one-pass large cleanup with Pine type-safety guardrails (avoid feeding config-series into simple-only TA params).
