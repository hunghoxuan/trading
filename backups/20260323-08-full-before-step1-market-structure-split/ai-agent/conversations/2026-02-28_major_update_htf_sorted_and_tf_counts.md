# Major Update Summary (2026-02-28)

## Scope
Adjust HTF mini-chart panels to display unique timeframes sorted low->high and make candle count configurable per timeframe class.

## Implemented
- Added new settings under `Settings`:
  - `HTF 4h` (default 12)
  - `D` (default 7)
  - `W` (default 3)
  - `Other` (default 16)
- HTF panel source set now built from:
  - `globalHtfString` (HTF Candles)
  - `biasTf1`, `biasTf2`, `biasTf3`
- Dedupe applied (duplicates removed).
- Sorting applied by timeframe size ascending (low -> high).
- Render/label now uses sorted slots.
- Added slot reset guards when slot timeframe or candle count changes to avoid stale panel artifacts.

## Result Example
- Current TF `1h`, with `HTF Candles=1D`, `Bias1=4h`, `Bias2=1D`, `Bias3=1W`
- Panels render as: `4h -> 1D -> 1W`.
