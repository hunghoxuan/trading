0330-4

Scope
- Fix compile error in HTF candle renderer from `0330-3`.
- Keep the “rebuild full visible HTF strip” behavior without using dynamic `ta.valuewhen(..., occurrence)`.

Root Cause
- `0330-3` used `ta.valuewhen(..., prevOcc)` with a runtime-calculated occurrence index.
- Pine requires `occurrence` to be a simple int, so the code could not compile.

Fix
- Replaced the dynamic-`occurrence` approach with a backward history scan over the HTF series.
- The renderer now gathers distinct HTF candles by detecting changes in the HTF open series, then paints the visible strip from oldest visible candle to current candle.

Changed Files
- `src/Kit - UI.pine`
- `src/Hung - Core.pine`
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`

Version Notes
- `Kit - UI` bumped to `17`
- `Hung - Core`, `Hung - SMC`, `Hung - MSS` bumped to `0330-4`

Notes
- No TradingView compile was run in this workspace, so this is source-level verified only.
