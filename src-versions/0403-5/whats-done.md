# What’s Done

- Adjusted the SMC HTF snapshot helper again to remove `barstate`/`last_bar_index` gating from the `request.security()`-fed expression.
- Kept the HTF snapshot path history-only with `not na(close[2 + zoneFormationLockBars])`.
- Bumped `Hung - SMC.pine` to `@file-version: 0331-27`.

## Test Target
- TradingView compile check:
  - `src/Hung - SMC.pine`
