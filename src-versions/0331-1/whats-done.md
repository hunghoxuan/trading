Snapshot `0331-1`

- Turned `Hung - Core`, `Hung - MSS`, and `Hung - SMC` into Pine `strategy(...)` scripts.
- Set strategy engine defaults to `process_orders_on_close = false`, `calc_on_order_fills = true`, `calc_on_every_tick = false`, and `use_bar_magnifier = true`.
- Merged strategy-only order execution back into the `Hung-*` files and removed the old parallel `Strategy-*` files from `src/`.
- Standardized `UI Config` as the first settings group and added display profiles: `All`, `Less`, `Normal`, `Extreme`, `None`.
- Added per-model RR inputs to `Hung - Core` so all three `Hung-*` files now expose RR inside `Trade Models`.
- Replaced the old gate-debug layout with `Trades Config` in MSS/SMC and added `1R ($)`, `Min Trade size`, and `Max Active Trades`.
- `Display = None` now disables new trade generation in all three `Hung-*` files.
- Trimmed the `Hung - SMC` dashboard/table path to get back under Pine's compiled token limit without touching the trade engine.
