# Major Update Summary (2026-02-28)

## Scope
Reduce Pine compiled-token pressure while keeping core behavior stable.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_231651_pre_aggressive_token_trim`

## Applied Trims in `src/ict_smc [hung].pine`
- Removed optional bias-factor branches from engine/tooltips/dashboard:
  - EMA cross
  - MACD zero
  - BB walk
  - Heikin
- Kept core bias factors:
  - Structure, VWAP, EMA50, RSI, ADX, RSI impulse, Supertrend, Donchian.
- Removed webhook JSON runtime path:
  - deleted webhook dispatch from `addSignal(...)`
  - removed webhook toggle input.
- Kept signal pipeline + `alertcondition(...)` events intact.
- Converted HTF panel counts from settings inputs to constants:
  - Base=16, Bias1=12, Bias2=7, Bias3=3.
- Simplified dashboard data arrays and `get_bias_*` signatures to core factors only.

## Notes
- This pass targets token reduction first; functional logic remains centered on existing core modules.
