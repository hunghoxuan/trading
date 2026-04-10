# HTF Bias And Candles

## Progress
- Status: Validated
- Last Updated: 2026-03-07

## Requirement
- Show higher timeframe candle context and multi-timeframe bias on current chart.

## Source Of Truth
- `/Users/macmini/Trade/Bot/Hung Bot/src/Hung - ICT SMC Zones.pine`

## Business Logic
- HTF candle target is auto-selected using `LIB.get_htf_pair()`.
- Bias is computed in the ICT file for current TF plus 2 higher TFs.
- Bias dashboard is rendered in the ICT file at bottom-right.
- HTF mini-candle panels are rendered in the ICT file using reusable `LIB.HTF_Data` stores.
- HTF zone projection is intentionally lighter than the current-TF zone engine:
  - HTF currently projects snapshot-based `OB` / `FVG` candidates
  - HTF does not yet run full zone classification or lifecycle control
  - projected HTF labels show family/type (for example `4h OB`), not local OB subtype labels like `OB-O` or `OB-D`

## Performance Notes
- Adding HTF OB subtype labels is relatively cheap.
- Adding HTF lifecycle control is much more expensive because it requires persistent HTF zone state and per-bar management.
- Adding HTF derived zones such as `BB` or `iFVG` is more expensive again because they depend on HTF break/lifecycle transitions, not only raw detection.
- Recommended order for future HTF expansion:
  1. HTF subtype/classification
  2. HTF1 lifecycle hints
  3. HTF1 derived zones
  4. only then consider HTF2 derived zones

## Test Conditions
- Compile script with `showBiasTable=true`.
- Verify HTF candles render only when target HTF is higher than chart TF.
- Verify bias table updates when changing `biasTf1/biasTf2/biasTf3`.
