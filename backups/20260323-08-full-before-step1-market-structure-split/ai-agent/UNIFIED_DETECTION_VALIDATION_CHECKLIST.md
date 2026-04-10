# Unified Detection Validation Checklist

Purpose: validate the new unified detection framework without breaking old behavior.
Target file: `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`

## A) Compile Gate
1. Open script in TradingView and compile.
2. Confirm: no syntax/undeclared/type errors.
3. If any error appears, capture exact line + message.

## B) Baseline Parity (Default Settings)
Use defaults:
- `Detection Method = 0 (State)`
- `Detection Sensitivity Basis = Wick`
- `Detection Sensitivity Impulse Filter = false`

Check visually against known-good baseline behavior:
1. OB/FVG/RJB mitigation still occurs when expected.
2. Mitigated zones remain visible/faded until broken.
3. Broken zones are removed correctly.
4. Liquidity sweeps still mark reversal signals similarly.
5. EQH/EQL broken marking still updates labels/lines similarly.

Pass criteria:
- No obvious reduction of expected signals due to defaults.

## C) Method Toggle Test (`0` vs `1`)
1. Switch `Detection Method` from `0` to `1`.
2. Observe event timing changes:
- Cross mode should trigger only on transition bars.
- State mode can remain true over multiple bars.
3. Confirm no runtime errors when toggling live.

## D) Basis Sensitivity Test (`Wick`, `Close`, `Body`)
1. Keep method fixed; switch basis one-by-one.
2. Validate expected strictness order:
- Wick: most sensitive
- Close: medium
- Body: strictest (for break acceptance)
3. Confirm mitigation/break behavior remains logically consistent per basis.

## E) Impulse Filter Test
1. Enable impulse filter.
2. Test ATR multipliers: `0.3`, `0.5`, `0.8`.
3. Confirm fewer low-quality breaks and no dead behavior.

## F) Regression Guard (Must Not Break)
1. MSS/BOS labels still appear (major + minor) as before.
2. No heavy lag spikes introduced by new checks.
3. No object explosion or immediate zone deletion anomalies.

## G) Decision Output Template
Use this report format after manual check:

- Compile: PASS/FAIL
- Default parity: PASS/FAIL
- Cross mode behavior: PASS/FAIL
- Basis sensitivity behavior: PASS/FAIL
- Impulse filter behavior: PASS/FAIL
- MSS/BOS regression: PASS/FAIL
- Notes (symbol/timeframe/session): ...

If any FAIL: do not continue optimization; fix that issue first.
