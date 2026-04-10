0331-17

- Added one-time initial trade-state sync in `Hung - MSS` and `Hung - SMC`:
  - On first script run, call `process_data_trades()` once before closed-bar pipeline.
  - After that first pass, normal processing remains closed-bar driven as before.
- Kept `ENTRY_REQUIRE_NEXT_BAR = true` and preserved prior risk/edge config changes.
- Updated file versions:
  - `Hung - MSS`: `0331-17`
  - `Hung - SMC`: `0331-17`
