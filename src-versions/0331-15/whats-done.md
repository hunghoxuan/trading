0331-15

- Set risk SL gap configuration to zero in all `Hung-*` strategy defs:
  - `risk_zone_pct = 0.0` for all entry models in Core/MSS/SMC.
- Set entry point mode to `edge` for all entry models in Core/MSS/SMC.
- Updated MSS/SMC trade-plan math to decouple TP risk from SL gap:
  - `slGap = zoneHeight * riskPct`
  - `takeprofit` now uses base risk from `abs(entry - slRaw) * RR`.
- Updated KitCore runtime behavior to resolve TP/SL without waiting next bar:
  - `ENTRY_REQUIRE_NEXT_BAR = false`.
- Bumped versions:
  - `Hung - Core`: `0331-15`
  - `Hung - MSS`: `0331-15`
  - `Hung - SMC`: `0331-15`
  - `Kit - Core`: `@kit-version: 16`
- Updated Core/MSS/SMC imports to `KitCore/16`.
