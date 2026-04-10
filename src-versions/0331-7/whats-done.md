0331-7

- Removed the unapproved `HTF Zones` input from `Hung - SMC`.
- Kept HTF projected zones behavior without a separate new toggle.
- Decoupled the dashboard from the `Trades` toggle in all three `Hung-*` files.
- `Trades` now controls only trade generation and trade visuals, not the bias dashboard.
- Dashboard now always renders on the last bar, even when the trades array is empty.
