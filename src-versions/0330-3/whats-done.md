0330-3

Scope
- Fix HTF candle panel showing only 1 visible candle after dynamic-count reset.

Root Cause
- The HTF panel reset recreated empty candle slots.
- `KitUI.render_htf_view()` only repopulated the live candle immediately.
- Older visible HTF candles were only restored incrementally on future HTF open changes.
- Result: after reset or count change, the panel could show just 1 candle.

Fix
- Reworked `KitUI.render_htf_view()` to reconstruct the full visible HTF strip each bar:
  - current HTF candle comes from the live HTF OHLC stream
  - previous HTF candles come from distinct prior HTF candles using `ta.valuewhen(ta.change(o_p), ... )`
- This makes the panel fill the requested candle count immediately after reset instead of waiting for future HTF candle rolls.

Changed Files
- `src/Kit - UI.pine`
- `src/Hung - Core.pine`
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`

Version Notes
- `Kit - UI` bumped to `16`
- `Hung - Core`, `Hung - SMC`, `Hung - MSS` bumped to `0330-3`

Notes
- No TradingView compile was run in this workspace, so this is source-level verified only.
