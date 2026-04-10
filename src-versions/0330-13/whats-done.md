0330-13

Files:
- Strategy - MSS.pine
- Strategy - SMC.pine

Summary:
- Fixed Pine compile error caused by passing `input.*` values into `strategy(...)` parameters that require compile-time constants.
- Restored valid constant defaults for:
  - `process_orders_on_close`
  - `calc_on_order_fills`
  - `calc_on_every_tick`
  - `use_bar_magnifier`
  - `commission_value`
  - `slippage`
  - `backtest_fill_limits_assumption`

Notes:
- These realism settings now use code defaults.
- If you want to change them, do it from TradingView Strategy Properties, not from `input.*`.
