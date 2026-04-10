# 0326-43 - Dashboard Quick UX Fix

## Completed
- Bias row label is now injected from caller (per indicator):
  - Core -> `CORE`
  - SMC -> `SMC`
  - MSS -> `MSS`
- No-trade dashboard behavior updated:
  - Hide stats header/Total block when no trades.
  - Show only bias row.
  - Bias row moved to top (`row 0`) when no trades.
- Trade-present behavior unchanged:
  - Keep stats table.
  - Bias row stays at bottom (`row 23`).

## File versions
- `Hung - Core.pine` -> `@file-version: 0326-43`
- `Hung - SMC.pine` -> `@file-version: 0326-43`
- `Hung - MSS.pine` -> `@file-version: 0326-43`

## Next Actions
1. Compile 3 indicators from `src-versions/0326-43`.
2. Validate 2 states per indicator:
   - has trades: header/total + bias row bottom.
   - no trades: no header/total, bias row top.
