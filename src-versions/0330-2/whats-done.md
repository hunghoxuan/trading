0330-2

Scope
- Unified HTF resolution so HTF candles, HTF data consumers, and local bias dashboards all derive from `KitCore.get_htf_pair()`.
- Added `60m` as a first-class fixed timeframe in `Kit - Core`.
- Switched Core HTF candle panel to dynamic swing-leg candle counts.

HTF Mapping
- `1m -> 15m, 1h`
- `5m -> 1h, 4h`
- `15m -> 4h, 1D`
- `1h -> 1D, 1W`
- Dashboard chain now renders `LTF, HTF1, HTF2, HTF3`, where `HTF3 = next higher level after HTF2`.

Changed Files
- `src/Kit - Core.pine`
- `src/Hung - Core.pine`
- `src/Hung - SMC.pine`
- `src/Hung - MSS.pine`

Main Changes
- `Kit - Core`
  - Added `b60/s60/m60/t60` and `dir60` to `ChartContext`.
  - Added HTF helper accessors by resolved TF name: bias, score, max, trend, factor texts.
  - Updated higher-TF ladder to include `60`.
  - Updated `get_htf_pair()` mapping to the new requested pairs.
  - Updated generic bias row renderer to use `LTF + HTF1 + HTF2 + HTF3`.
- `Hung - SMC`
  - Replaced hardcoded `15/240/1D/1W` HTF bias/trend lookups with `KitCore` TF-name helpers.
  - Updated local dashboard row to use `timeframe.period, htf1, htf2, next(htf2)`.
- `Hung - MSS`
  - Replaced hardcoded `15/240/1D/1W` HTF bias/trend lookups with `KitCore` TF-name helpers.
  - Updated local dashboard row to use `timeframe.period, htf1, htf2, next(htf2)`.
- `Hung - Core`
  - Replaced hardcoded `dir15/b15` and `dir240/b240` trade gating with resolved `htf1/htf2` helper lookups.
  - Enabled dynamic HTF candle layout.
  - Reordered HTF candle drawing to run after HTF swing ledgers are refreshed.
  - Derived HTF candle counts from latest HTF swing-leg anchors and reset slot arrays when count changes.

Notes
- No TradingView compile was run in this workspace, so this pass is source-level verified only.
