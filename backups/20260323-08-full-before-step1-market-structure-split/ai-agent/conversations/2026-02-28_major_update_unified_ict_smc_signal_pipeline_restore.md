# Major Update Summary (2026-02-28)

## Scope
Restore Buy/Sell potential + confirmation pipeline from legacy `_1` into current unified ICT/SMC core, while keeping split boundaries (non-SMC factors remain in `all-indicators [hung].pine`).

## Implemented
- Added unified signal state UDT:
  - `type entrySignal` and global `pendingEntries` queue.
- Added reusable signal methods:
  - `addSignal(...)`
  - `hasPendingFor(...)`
  - `checkConfirmations(...)`
  - `register_zone_retest_signal(...)`
  - helper methods for per-type enablement, bias validity, reason text, and score mapping.
- Added ICT/SMC signal settings:
  - `Signal Potential`, `Confirmed`, `Signal Min Score`
  - reused existing per-type toggles (`Signal OB/FVG/RJB/BB/iFVG`) + `Use HTF Bias Filter`.
- Wired signal generation into unified zone lifecycle:
  - On first mitigation touch in `_controlZone(...)`, now emit pending signals for OB/FVG/RJB/BB/iFVG (not only BB/iFVG).
  - Per-bar confirmation run via `checkConfirmations(pendingEntries)`.

## Design Notes
- Confluence score is ICT/SMC-only:
  - base score by zone type + optional HTF bias bonus.
- Bias filter logic:
  - bullish zone requires `compositeBias >= 0` when enabled.
  - bearish zone requires `compositeBias <= 0` when enabled.

## Files Updated
- `/Users/macmini/Trade/Bot/Hung Bot/src/ict_smc [hung].pine`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/ROADMAP.md`

## Traceability
- Source header updated to:
  - `@version: 3.7.0`
  - latest `@trace_update/@trace_features/@trace_last_backup`
