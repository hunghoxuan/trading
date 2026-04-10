# Liquidity And EQ

## Progress
- Status: Validated
- Last Updated: 2026-03-15

## Requirement
- Detect liquidity sweeps and EQH/EQL levels with reliable break/sweep state.

## Business Logic
- Liquidity levels are seeded from TFData swings (`HTF2`, `HTF1`, optional base TF) and updated each bar.
- Sweep detection marks levels as mitigated and can register sweep-reclaim entries in the signal pipeline.
- EQH/EQL uses ATR tolerance + candle-quality filter + invalidation scan (pair-based detection), stored as `PriceZone` family `EQH` / `EQL`.
- SR/Liquidity/EQ now share one unified level store: `array<PriceZone> levels`.
- Shared lifecycle/update path is `update_horizontal_levels(...)` with per-kind behavior (`LIQ`, `EQ`, `SR`) and shared pruning/state updates.
- Rendering is persistent: line/label objects are reused and updated by setters; new guards reduce redundant `set_*` calls in hot loops.

## Test Conditions
- Verify BSL/SSL sweep signals appear with reversal confirmation.
- Verify EQH/EQL lines/labels create and mark broken states.
- Toggle detection method/basis and ensure behavior changes as expected.
