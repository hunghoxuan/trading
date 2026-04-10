# Master Plan Status

## Phase A - Performance Stabilization
- Status: DONE
- Goal: Reduce intrabar recomputation without changing trade logic.
- Latest checkpoints:
  - MSS: `0326-13`
  - SMC: `0326-12`

## Phase B - Score/Limitation Simplification
- Status: DONE
- Goal: Remove low-value soft confluence scoring while keeping hard-risk and trade-score gates.
- Latest checkpoint:
  - SMC: `0326-15`
- Note:
  - MSS reviewed in pass-3; no behavior-neutral soft-confluence branch found to remove safely.

## Phase C - Settings/Dead-Field Cleanup
- Status: DONE
- Goal: Remove dead fields/branches and keep backward-safe behavior.
- Latest checkpoint:
  - SMC: `0326-17`
  - MSS: `0326-18`
- Closeout:
  - Dead fields/branches removed in SMC and MSS with behavior-neutral constraint.
  - Phase frozen after final sweep.

## Current src heads
- `src/Hung - MSS.pine` -> `@file-version: 0326-43`
- `src/Hung - SMC.pine` -> `@file-version: 0326-43`
- `src/Hung - Core.pine` -> `@file-version: 0326-43`

## Phase D - Risk/Entry Simplification
- Status: DONE
- Order executed: D3 -> D1 -> D2
- D3:
  - Continued settings cleanup by removing unreachable config paths in MSS.
- D1:
  - Risk model simplified to `% of zone height` in SMC and MSS (`Risk% Zone`).
  - Removed dependency on multi-parameter gap/score risk gates in SMC entry builder.
- D2:
  - Reduced noise defaults:
    - SMC `SW Sweep` default -> `false`
    - MSS `SW>MS>FVG` default -> `false`

## Phase E - Bias Dashboard Local Semantics
- Status: DONE
- Requirements locked (2026-03-26):
  - Bias Dashboard background must follow MSS Trend direction (source of truth).
  - Bias Dashboard arrow symbol must represent short-term bias from local method `get_bias_data()` in each indicator.
  - `get_bias_data()` can share the same name but logic is indicator-local:
    - Core: legacy-style bias formula (RSI + CP + VWAP blend).
    - SMC: structure-oriented local bias (signal memory + trend/bias fallback).
    - MSS: BOS/MSS/Sweep-nearest oriented bias (signal memory + sweep recency + trend/bias fallback).
- Delivery (0326-42):
  - Replaced shared bias-row drawer usage with local draw methods in Core/SMC/MSS.
  - Dashboard cell background is trend-derived (`ctx.dir*`) as source of truth.
  - Dashboard arrow symbol is now local short-bias per indicator (`get_bias_data()` local logic).
  - Added explicit tooltip semantics: `BG:MSS Trend | Arrow:<Local Bias>`.
