# 0327-20 — One-pass: Entry Engine On/Off setting (all files)

## Completed
- Added setting `Entry Engine` (default `true`) in **4. Trade Display** for all indicators:
  - Core (`inline = en1`)
  - SMC (`inline = en3`)
  - MSS (`inline = v0`)
- Behavior when `Entry Engine = ON`:
  - Detect + emit + draw entries/trades as normal.
- Behavior when `Entry Engine = OFF`:
  - No entry detect/emit and no trade draw.

## Wiring by file
- `Hung - Core.pine`
  - `canEmitSignals` now requires `entryEngineEnabled`.
  - Strategy detection call gated by `entryEngineEnabled`.
  - Trade lifecycle draw/update call gated by `entryEngineEnabled`.
  - Trades dashboard draw gated by `entryEngineEnabled`.
- `Hung - SMC.pine`
  - `canEmitSignals` now requires `entryEngineEnabled`.
  - `process_data_entries(...)` signature extended with `entryEngineOn` and gates `process_data_trades()`.
  - Dashboard draw gated by `entryEngineEnabled`.
- `Hung - MSS.pine`
  - `canEmitSignals` now requires `entryEngineEnabled`.
  - `process_data_entries(...)` signature extended with `entryEngineOn` and gates `process_data_trades()`.
  - Dashboard draw gated by `entryEngineEnabled`.

## Versions
- Core: `@file-version: 0327-20`
- SMC: `@file-version: 0327-20`
- MSS: `@file-version: 0327-20`

## Test target
- Use files in: `src-versions/0327-20/`
