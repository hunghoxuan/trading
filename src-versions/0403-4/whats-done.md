# What’s Done

- Refined the SMC HTF `request.security()` fix by removing the remaining UDT field access and object-construction path from the security expression.
- Hoisted all zone-quality config fields into local primitive variables before the HTF `request.security()` calls.
- Bumped `Hung - SMC.pine` to `@file-version: 0331-26`.

## Test Target
- TradingView compile check:
  - `src/Hung - SMC.pine`
