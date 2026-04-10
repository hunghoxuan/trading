1. VWAP bias + EMA momentum cross (1m scalp): bias is price above/below VWAP; enter when EMA(9) crosses EMA(21) in the bias direction.
2. EMA trend + pullback mean reversion (5m day): bias from EMA(50) slope; enter on pullback to EMA(21) plus Stoch cross from oversold (<20) / overbought (>80) in bias direction.
3. EMA200 regime + volatility breakout (1h intra): bias is price vs EMA(200) and RSI vs 50; enter after BB squeeze then a candle close outside the bands in bias direction.
4. Ichimoku regime + MACD momentum flip (4h swing): bias is price above/below Kumo; enter when MACD histogram flips (red->green for buy / green->red for sell) while price is outside the cloud.
5. Macro trend + fib pullback (Daily): bias from 50/200 cross plus swing structure; enter on pullback to 0.618 (golden pocket) after trend confirmation.
6. SMA200 macro anchor + divergence reversal (Weekly): bias from SMA(200) slope; enter on RSI divergence at/near SMA(200) contact.
7. ADX + EMA crossover trend system (any TF, best 5m-1h): enter when EMA(20) crosses EMA(50) and ADX crosses above 25; exit on reverse EMA cross or ADX falling below 25.
8. Break and retest confirmation (any TF): after a clear break of support/resistance, wait for a return touch of the level within ~5-10 bars before entering in the break direction.
9. Volume spike breakout confirmation (any TF): only take breakout/continuation entries when volume is above its baseline (example: volume > SMA(volume, 20)).
10. Macro MA alignment confirmation (HTF, Daily+): use 50/200 MA relationship (golden/death cross) as a trend filter; only take entries aligned with the macro MA direction.
11. S/R rejection reversal (any TF): when price fails to break a major level and prints rejection, take reversal in the opposite direction with the level as risk reference.
12. TPG RSI scalping (any TF): RSI OB/OS context plus engulfing/hammer-shooting/two-bar price action confirmation for short-term reversal entries.

Current implementation snapshot (Hung - Indicators):
- Implemented strategy IDs in code: 1, 2, 3, 4, 5, 6, 7, 10, 11, 12 + 90 (Confluence VRHS helper strategy).
- Implemented TF routing: 1m (ID1), 5m (ID2), 15m-1h (ID3), 4h (ID4), 1D (ID5), 1W (ID6), Any (ID7/11/90), 1D-1W (ID10).
- Strategy toggles exist in Settings -> Strategies and gate processing/display for each strategy.

Not yet implemented as standalone strategy logic:
- 8. Break and retest confirmation.
- 9. Volume spike breakout confirmation (currently only partially represented inside confluence via HVB).

Known behavior notes:
- Only one winning strategy marker is shown per bar (best score, then effectiveness tie-break), so other valid candidates are hidden.
- Low-TF signals (1m/5m) can still look sparse because most strategies are strict event-style triggers.
- Marker now supports short strategy code and optional debug tooltip with candidate summary.

Future tuning backlog (when resuming):
1. Add strictness mode (Strict/Normal/Loose) for low-TF trigger sensitivity.
2. Add N-bar confirmation window for multi-factor alignment (instead of same-bar only where applicable).
3. Implement strategy 8 (break + retest) explicitly.
4. Implement strategy 9 (volume spike breakout) explicitly with dedicated volume baseline settings.
5. Optional debug mode to show top 2 candidates instead of only winner.

Test checklist for strategy selection:
1. Test per timeframe with only one strategy enabled at a time.
2. Validate marker short-code matches expected strategy family.
3. Compare tooltip candidate summary vs expected conditions.
4. Record hit-rate and false-positive notes before tuning thresholds.

Entry lifecycle (Hung - Indicators, Entry display mode):
- Entry is created only when a strategy signal is emitted and that strategy display mode is `Entry`.
- SL is strategy-specific (structure-aware where possible), then TP is computed from RR.
- RR source: Settings -> Strategies -> `RR`.

Strategy SL model (current):
- 1 VWAP+EMA: SL around `min/max(EMA21, VWAP)` with tick buffer.
- 2 EMA+Stoch pullback: SL at recent 8-bar swing.
- 3 EMA200+BB breakout: SL around `BB basis` / `EMA200`.
- 4 Ichimoku+MACD: SL around `Kijun` / cloud edge.
- 5 Fib pullback: SL at 55-bar swing extreme.
- 6 SMA200+Divergence: SL around `SMA200` plus 20-bar swing extreme.
- 7 ADX+EMA cross: SL around `EMA50` plus 10-bar swing extreme.
- 9 Candle pattern: SL at current/previous candle extreme.
- 10 Golden/Death cross: SL around `EMA200` with ATR cushion.
- 12 TPG RSI scalp: SL at recent 3-bar swing.
- 90 Confluence: ATR fallback stop.

Safety guards:
- If SL is invalid (wrong side / too close / `na`), fallback ATR stop is used.
- TP is always recomputed from final SL distance and RR.
- Invalid plan entries are not created.

Entry stats dashboard:
- Position: bottom-right (to avoid conflict with other top-corner panels).
- Columns: `S | TP | SL | WR | +R`.
- Rows: `ALL` + per-strategy buckets (`VWAP, STOCH, BB, ICHI, FIB, DIV, ADX, CP, GDC, TPG, CONF`).
