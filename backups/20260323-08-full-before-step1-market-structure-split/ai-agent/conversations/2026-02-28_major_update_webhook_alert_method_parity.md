# Major Update Summary (2026-02-28)

## Scope
Introduce shared `webhook_alert()` naming/signature and wire optional JSON webhook alerts in ICT/SMC signals while keeping method parity across split files.

## Backups
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_212917_pre_webhook_alert_method`
- `/Users/macmini/Trade/Bot/Hung Bot/backups/all-indicators [hung].pine.bak_20260228_213031_pre_header_backup_trace_fix`

## Implemented
- Added common method (same signature/body) in both files:
  - `webhook_alert(string eventType, string direction, int scoreVal, float priceVal, string setupType, string reason, bool confirmed)`
- In `ict_smc [hung].pine`:
  - Added toggle: `Use Webhook JSON` under `BUY/SELL SIGNALS`.
  - Extended `addSignal(...)` with optional `setupType` arg and webhook dispatch path.
  - Webhook dispatch respects existing alert switches (`Enable Alerts` + Potential/Confirmed/Sweep toggles).
  - Passed `setupType` through pending-confirm and sweep call paths.
- In `all-indicators [hung].pine`:
  - Added the same `webhook_alert(...)` method for common-method consistency.

## Notes
- Existing `alertcondition(...)` workflow remains unchanged.
- JSON payload includes event, direction, setup, confirmed, score, price, ticker, exchange, timeframe, epoch time, reason.
