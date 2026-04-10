0331-18

- Fixed MSS compile error: initial trade sync call moved to a top-level location after function declarations.
- One-time initial trade sync behavior is preserved:
  - On first run: call `process_data_trades()` once.
  - Subsequent runs: keep normal closed-bar process flow.
- Updated `Hung - MSS` file version to `0331-18`.
