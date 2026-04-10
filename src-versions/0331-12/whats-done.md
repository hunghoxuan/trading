0331-12

- Added `Strategy` checkbox next to `Trades` in `Trade Config` for all 3 files:
  - `Hung - Core`
  - `Hung - MSS`
  - `Hung - SMC`
- Split responsibilities:
  - `Strategy`: controls `strategy.entry/strategy.exit/strategy.cancel` calls.
  - `Trades`: controls local `trades` array push/update and trade visuals.
- Decoupled signal engine enablement from trade-visual enablement:
  - engine now runs when either `Trades` or `Strategy` is enabled.
- Updated max-active checks to use local trade states when `Trades` is on, otherwise fallback to `strategy.opentrades`.
- Updated all three file versions to `0331-12`.
