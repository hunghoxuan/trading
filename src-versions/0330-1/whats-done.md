## 0330-1

- Inlined `required_previous_events` values directly inside `process_data_init_strategy_defs()` for:
  - `Hung - SMC`
  - `Hung - MSS`
- Removed the local `get_data_required_events_preset()` helper from both files.
- Normalized touched file headers to `@file-version: 0330-1`.
- No logic change intended beyond config placement cleanup.

## Test Target

- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`
