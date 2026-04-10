0330-10

Files:
- Strategy - MSS.pine
- Strategy - SMC.pine

Summary:
- Added configurable strategy risk sizing with default `1R = $100`.
- Stored the setting in `LocalCfg.riskPerRRUsd` and exposed it as TradingView input `Risk Per 1R ($)` under `0. Strategy Config`.
- Calculated order quantity from stop distance using `qty = riskUsd / (abs(entry - stoploss) * syminfo.pointvalue)`.
- Applied the calculated `qty` to all `strategy.entry(...)` calls in MSS and SMC.

Notes:
- This only changes Pine order sizing. It does not change whether a setup is generated.
- No TradingView compile was run locally in this workspace.
