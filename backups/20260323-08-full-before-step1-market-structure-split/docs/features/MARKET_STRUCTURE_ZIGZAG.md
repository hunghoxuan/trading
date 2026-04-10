# Market Structure ZigZag

## Progress
- Status: Validated
- Last Updated: 2026-03-17

## Requirement
- Detect structure on current TF and mimic-HTF directly on the LTF chart.
- Filter noisy pivots so only theory-aligned swings drive BOS/MSS, zigzag, and fib.

## Source Of Truth
- `/Users/macmini/Trade/Bot/Hung Bot/src/Hung - ICT SMC Zones.pine`

## Business Logic
- Current TF swings use fixed context pivot length (`PIVOT_LEN_BASE`, default `10`).
- HTF1/HTF2 mimic swings use relative dynamic pivot:
  - `get_dynamic_pivot_length(currentTf, targetTf)`
  - higher TF-distance returns higher pivot length.
- Structure visual/process lookback window is widened by `STRUCTURE_LOOKBACK_MULT` (currently `2.0`) on top of `effectiveCurrLookbackBars` to show more BOS/MSS, swings, and zigzag legs while keeping limits.
- Refactor pass-1 introduces TF-scoped structure containers:
  - `TFConfig` for per-TF visual config (swings/zigzag visibility, colors, styles, widths)
  - `TFData` for per-TF runtime zigzag/swing draw state
  - active instances: `ltfCfg/htf1Cfg/htf2Cfg` and `ltfData/htf1Data/htf2Data`.
- Refactor pass-3 extends `TFData` to own per-TF swing ledgers:
  - `swingHighPrices/swingHighTimes`
  - `swingLowPrices/swingLowTimes`
  - these ledgers now store confirmed swings only.
- `TFData` also holds one pending candidate per side:
  - `candHighPrice/candHighTime/candHighIndex`
  - `candLowPrice/candLowTime/candLowIndex`
  - raw pivots update candidate state, not confirmed ledgers directly.
- Refactor pass-4 unifies per-TF structure flow through helpers:
  - `process_tf_armed_state(...)`
  - `process_tf_structure_state(...)`
  - LTF/HTF1/HTF2 share the same candidate -> confirmed -> BOS/MSS path.
- Refactor pass-4b unifies per-TF visual flow through helpers:
  - `process_tf_swing_markers(...)`
  - `process_tf_zigzag_from_pivots(...)`
  - all TF visuals now read confirmed swings from `TFData`, not raw pivots.
- Visibility controls are per-TF and per-visual:
  - `showCurrSwings`, `showCurrZigzag`
  - `showHtf1Swings`, `showHtf1Zigzag`
  - `showHtf2Swings`, `showHtf2Zigzag`
- `process_structure_from_ledger(...)` is the live structure engine:
  - uses pending candidates plus last confirmed opposite swing
  - confirms a swing only when the resulting leg breaks the previous confirmed opposite swing
  - applies optional impulse filter before confirmation
  - emits `BOS` / `MSS` labels from confirmed structure only
  - updates per-timeframe structure bias in `TFData.msBias`
- Candidate behavior:
  - pivot = candidate, not confirmed swing
  - each side keeps only the latest candidate pivot
  - on confirmed break, candidates are cleared and rebuilt from later pivots
- Visual behavior:
  - current TF and HTF swing markers all use the same marker path
  - zigzag lines connect confirmed swings only
  - live tail is a separate realtime leg from the latest confirmed swing to the current extreme
  - fib uses confirmed-leg logic first and only uses live leg when the live tail is valid and strong enough
- Labels emitted:
  - current TF: `bos ↑`, `mss ↑`, `bos ↓`, `mss ↓`
  - HTF mimic TFs: uppercase equivalents

## Test Conditions
- Verify BOS/MSS labels anchor from confirmed swing levels, not from raw pivots or floating points.
- Verify current TF, HTF1, and HTF2 all show swing markers and zigzag from the same confirmed-swing logic.
- Verify a new pivot does not immediately become a confirmed swing until a break confirms it.
- Verify live tail remains separate from confirmed zigzag and never replaces confirmed structure without a later confirmation.
- Toggle each TF swing/zigzag control and verify only the selected visuals are drawn.
- Check per-timeframe structure bias transitions remain stable after swings break.
