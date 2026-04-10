0331-6

- Unified all three `Hung-*` strategy files around `Trade Config`.
- Moved `Trades` out of `UI Config` and into `Trade Config` in every file.
- `Trades` and `1R ($)` now share the same line in every file.
- `Min Trade size` became `Min size`; `0` now means disabled.
- `Max Active Trades` became `Trades`; `0` now means disabled.
- `Trades` now controls both strategy trade generation and the trade dashboard/trade visuals.
- Removed the old `STRATEGY_ENABLE_VISUALS` / trade-visual global switch pattern from MSS and SMC.
- Restored non-trade visuals so structure/zones/levels stay under normal UI controls.
- Added repo rule: never delete existing features without explicit user confirmation.
