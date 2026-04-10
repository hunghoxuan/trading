# Major Update Summary (2026-02-28)

## Scope
Add alertcondition support to unified ICT/SMC Buy/Sell signal pipeline without changing zone detection logic.

## Implemented
- Backup created before change:
  - `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_212036_pre_alertcondition_signals`
- Source trace header updated to `@version: 3.8.0`.
- Added BUY/SELL SIGNALS alert inputs:
  - `Enable Alerts`
  - `Potential`, `Confirmed`, `Sweep`
- Added per-bar signal event flags:
  - `evtPotentialBuy/Sell`
  - `evtConfirmedBuy/Sell`
  - `evtSweepBuy/Sell`
- Wired flags in `addSignal(...)` based on signal state and reason text.
- Added per-bar event reset at bar open (`barstate.isnew`).
- Added `alertcondition(...)` outputs:
  - Potential Buy/Sell
  - Confirmed Buy/Sell
  - Sweep Buy/Sell

## Notes
- This update only adds event/alert hooks and does not alter signal eligibility rules.
- Future optional step: add structured JSON `alert()` dispatch for webhook automation.
