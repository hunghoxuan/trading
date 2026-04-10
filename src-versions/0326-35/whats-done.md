# 0326-35 - Config Naming Harmonization (MSS/SMC)

## Completed
- Standardized local config builder naming across indicators:
  - `Hung - MSS`: `get_local_cfg()` -> `get_data_local_cfg()`
  - `Hung - SMC`: `get_local_cfg(...)` -> `get_data_local_cfg(...)`
- Updated all in-file call sites to new naming.
- Updated file headers:
  - `Hung - MSS` -> `@file-version: 0326-35`
  - `Hung - SMC` -> `@file-version: 0326-35`
- Synced heads in `MASTER_PLAN_STATUS.md`.

## Notes
- Behavior-neutral refactor (naming/structure only), no trade logic changes.

## Next Actions
1. Compile `Hung - MSS` and `Hung - SMC` on TradingView.
2. If compile/chart is stable, next one-pass will target final cleanup of duplicated micro-constants in `Hung - Core` and align to a single `LocalCfg` source where safe.
