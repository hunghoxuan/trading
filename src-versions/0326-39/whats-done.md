# 0326-39 - Phase E Bias Dashboard Local Semantics

## Completed
- Wrote new requirement into roadmap status:
  - `MASTER_PLAN_STATUS.md` -> `Phase E - Bias Dashboard Local Semantics`.
- Implemented local `get_bias_data()` in each indicator with different logic:
  - Core: RSI + CP + VWAP blend.
  - SMC: signal-memory first, then trend/bias fallback.
  - MSS: signal-memory first, then nearest Sweep-MSS recency, then trend/bias fallback.
- Replaced shared bias-row renderer usage with local dashboard row renderer in each file:
  - Background color now always follows MSS trend direction (`ctx.dir*`).
  - Arrow symbol now follows local short-bias (`get_bias_data()`).

## Updated heads
- Hung - Core: `@file-version: 0326-39`
- Hung - SMC: `@file-version: 0326-39`
- Hung - MSS: `@file-version: 0326-39`

## Notes
- No change to trade entry/exit logic.
- Scope is dashboard semantics and roadmap alignment only.

## Next Actions
1. Compile all 3 files on TradingView:
   - `Hung - Core`
   - `Hung - SMC`
   - `Hung - MSS`
2. Visual validate dashboard row:
   - BG must track MSS trend.
   - Arrow must track local short-bias per file.
3. If needed, next pass can tune each `get_bias_data()` formula weight/priority without touching dashboard renderer.
