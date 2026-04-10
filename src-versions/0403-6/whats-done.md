# 0403-6

## SMC model refresh
- Backed up the current SMC baseline before edits.
- Reworked SMC trade model settings to use checkbox-as-trade-toggle semantics.
- Added per-model `Entry` combo support with `PDArray` and `BOS/MSS`.
- Added per-model `RR` and `SL Gap` inputs with MSS2-style risk handling.
- Added cached first-PDArray lookup for PDArray entry mode.
- Added nearest swing TP fallback when `RR = 0`.
