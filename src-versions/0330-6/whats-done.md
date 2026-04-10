0330-6

Scope
- Split the mixed Core script into separate indicator and strategy files.

What Changed
- Restored `src/Hung - Core.pine` to indicator mode.
- Created `src/Strategy - Core.pine` from the strategy-enabled Core code.

File Roles
- `src/Hung - Core.pine`
  - Uses `indicator(...)`
  - Keeps the original custom trade visualization/lifecycle only
  - Does not contain Pine `strategy.entry/exit/cancel` order state
- `src/Strategy - Core.pine`
  - Uses `strategy(...)`
  - Keeps the parallel Pine strategy order wiring (`strategy.entry`, `strategy.exit`, `strategy.cancel`)
  - Preserves the custom trade engine plus strategy-order sync from the earlier conversion pass

Version Notes
- `Hung - Core` bumped to `0330-6`
- `Strategy - Core` created at `0330-6`

Changed Files
- `src/Hung - Core.pine`
- `src/Strategy - Core.pine`

Notes
- No TradingView compile was run in this workspace, so this is source-level verified only.
