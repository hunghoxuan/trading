0331-19

- Dashboard stats update on open bar:
  - Added intrabar `process_data_trades()` pass in MSS and SMC when `calcOnClosedBar == false`.
  - This allows TP/SL state and dashboard metrics to update without waiting for bar close.
- Preserved closed-bar pipelines for structure/zone logic.
- Updated file versions:
  - `Hung - MSS`: `0331-19`
  - `Hung - SMC`: `0331-19`
