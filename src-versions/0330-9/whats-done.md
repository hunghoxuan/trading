0330-9

Files:
- Strategy - MSS.pine
- Strategy - SMC.pine

Summary:
- Added explicit `3. Gate Debug` settings to both strategy files so entry blockers can be toggled on/off in TradingView.
- Split the combined dynamic entry gate into separate switches for bias/trend alignment, memory direction, bias side restriction, and required previous events.
- Added switches for entry-direction gate, max-active gate, entry-mode gate, retest confirm, retest invalidation, trade-plan RR/size validation, and pre-touch pending-order cancel.
- Added SMC-only switch for the PDArray trade filter.

Notes:
- Default behavior is unchanged because all new gate toggles default to `true`.
- This pass is for diagnosis only; no TradingView compile was run locally in this workspace.
