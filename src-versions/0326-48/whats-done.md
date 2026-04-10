# 0326-48 - Prefix Rule Applied (Local methods)

## Completed
- Applied prefix naming rule for local methods copied/derived from UI/engine behavior:

### Core
- `CORE_get_bias_data(...)`
- `UI_get_bias_bg_from_trend(...)`
- `UI_get_bias_symbol(...)`
- `UI_draw_bias_row_under_trades(...)`

### SMC
- `SMC_get_bias_data(...)`
- `UI_get_bias_bg_from_trend(...)`
- `UI_get_bias_symbol(...)`
- `UI_draw_bias_row_under_trades(...)`

### MSS
- `SMC_get_bias_data(...)` (SMC-engine style logic in MSS)
- `UI_get_bias_bg_from_trend(...)`
- `UI_get_bias_symbol(...)`
- `UI_draw_bias_row_under_trades(...)`

- Updated all call sites consistently.
- No Kit API migration; local-first rule preserved.

## Versions
- `Hung - Core.pine` -> `@file-version: 0326-48`
- `Hung - SMC.pine` -> `@file-version: 0326-48`
- `Hung - MSS.pine` -> `@file-version: 0326-48`

## Next Actions
1. Compile Core/SMC/MSS from `src-versions/0326-48`.
2. Quick check: no unresolved old method names remain.
