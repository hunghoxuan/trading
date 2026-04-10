# Key Levels

## Progress
- Status: Validated
- Last Updated: 2026-03-18

## Requirement
- Plot key reference levels for prior day/week highs/lows.

## Business Logic
- PDH/PDL displayed on intraday charts.
- PWH/PWL displayed on intraday and daily charts.
- Levels extend to the right with configurable style/size.
- PDH/PDL/PWH/PWL and activeTradingHigh/Low drawings are implemented as persistent objects updated via setters (no delete/new per bar).
- Horizontal key-level families are being normalized toward shared structures instead of separate bullish/bearish or high/low arrays.
- Structural S/R (live):
- Pivot-based S/R candidates are clustered by price proximity (ATR tolerance).
- Touch count increases level strength; labels show `R#` / `S#`.
- Broken levels are kept but restyled (dashed + faded) for context.
- Old/weak levels are pruned by lookback and strength caps.
- Active trading area concept:
  - Use strong top/bottom anchors to bound the currently relevant trading space.
  - Top/bottom anchor must be far enough from current price and strong enough to cause meaningful reaction.
  - Preferred anchor candidates: HTF OB/BB/SD, PWH/PWL, HTF EQH/EQL, HTF swing high/low, PDH/PDL, HTF FVG/iFVG.
  - If the current top or bottom anchor is closed/broken/consumed, shift to the next strongest key level in that direction.
- This active area can later be used to filter local SR detection and rendering so only relevant levels are kept.

## Unified Family Direction
The current runtime model is:
1. One unified horizontal-level store:
- `levels: array<PriceZone>`
- Contains SR, LIQ, EQH, EQL.

2. Family/type stays in `PriceZone.type`:
- `SR`, `LIQ`, `EQH`, `EQL`.
- Side and lifecycle are still tracked per level.

3. Selector helper type:
- `SMC.KeyLevel` is used as a transient candidate object for active-area ranking only.
- It is not the persistent storage for on-chart levels.

## Why This Matters
- Fewer loops
- Fewer duplicated methods
- Cleaner future `activeTradingAreaTop/Bottom` selection
- Easier scoring across different key-level families

## Active Trading Area (Current Implementation)
- Current implementation applies to:
  - SR registration/pruning gate
- `activeTradingHigh`:
  - nearest HTF1 confirmed swing high above current `close`
- `activeTradingLow`:
  - nearest HTF1 confirmed swing low below current `close`
- no mixed-source scoring/ranking in current runtime path
- new SR candidates outside `[activeTradingLow, activeTradingHigh]` are not registered
- existing SR levels outside `[activeTradingLow, activeTradingHigh]` are pruned
- chart visualization is limited to 2 key-level guides:
  - `activeTradingHigh`
  - `activeTradingLow`
  - both are drawn as yellow dashed lines
  - labels use `ATH` and `ATL`

## Active Trading Area Selection Notes
- `activeTradingHigh` and `activeTradingLow` should not be too close to current price.
- A candidate anchor is accepted only if its distance from current price is large enough to matter structurally.
- If the current anchor is consumed/closed, the model should step to the next strong key level in that direction.
- Current ranking priority is:
  - strongest `PriceZone` first (`OB/BB/SD`, then `FVG/iFVG`, then `RJB`)
  - projected HTF zones
  - `KeyLevel` families (`liquidity`, `EQ`, `SR`)
  - prior-week levels
  - prior-day levels

## Selector State Filters
- Active-area candidate scoring now applies lifecycle-sensitive penalties:
  - mitigated `OB`:
    - default: excluded (`ACTIVE_AREA_SKIP_MITIGATED_OB = true`)
    - optional fallback: include with heavy penalty (`ACTIVE_AREA_MULT_MITIGATED_OB`)
  - mitigated derived zones (`BB`, `iFVG`): penalized
  - mitigated non-OB zones (`FVG`, `RJB`, `SD`): penalized
  - mitigated key-level families (`LIQ`, `EQ`, `SR`): penalized
  - weak-quality candidates (`qualityPct` below threshold): penalized
  - broken candidates: excluded

## Why Horizontal Key Levels First
- Horizontal key levels benefit immediately from:
  - fewer candidate pivots/lines kept
  - fewer merge/prune loops
  - less chart clutter
- This is the cleanest first use of active area before applying the same model to more complex zone families.

## Planned Zone Types (Detection Logic)
1. Key Levels (Session/Month/Quarter)
- Purpose: Add objective, time-based reference levels beyond PDH/PDL/PWH/PWL.
- Logic:
- Session levels: Asian/London/NY high-low from fixed session windows.
- Monthly/Quarterly levels: PMH/PML, PQH/PQL via `request.security` on `1M/3M`.
- Keep only nearest N above and N below current price.
- Worth: High.
- Complexity: Low.

2. Support/Resistance (Structural)
- Purpose: Add horizontal reaction zones from repeated swing rejections.
- Logic:
- Build candidate levels from confirmed swing highs/lows.
- Cluster nearby pivots inside ATR-based tolerance.
- Promote to S/R only if touches >= minTouchCount and spacing >= minBarsBetweenTouches.
- Mark as broken only on close-break (or configured break mode).
- Worth: High.
- Complexity: Medium.

3. Supply/Demand Zones (Rally-Base-Drop / Drop-Base-Rally)
- Purpose: Institutional-style zones for continuation/reversal entries.
- Logic:
- Detect impulse-leg + base structure:
- Supply: Rally -> Base -> Drop.
- Demand: Drop -> Base -> Rally.
- Base quality filters: narrow base candles, imbalance/impulse out, relative volume threshold.
- Zone bounds = base high/low; lifecycle = active -> mitigated -> broken (reuse `_controlZone` model).
- Worth: High.
- Complexity: Medium-High.

## Unification Rules (Recommended)
- Reuse one zone type struct (`type`, `isBullish`, `top`, `bottom`, `qualityPct`, lifecycle fields).
- Reuse existing helpers:
- `check_touch`, `check_mitigation`, `check_break`, `check_zone_respect`.
- Keep event pipeline unified:
- potential -> pending -> confirmed, plus break-retest and sweep-reclaim queues.
- Keep detection constants centralized and avoid per-feature duplicate thresholds.

## Test Conditions
- Verify PDH/PDL update at day boundary.
- Verify PWH/PWL update at week boundary.
- Confirm labels and line styling match settings.
- Verify S/R lines appear only after minimum touches.
- Verify resistance breaks when close moves above level; support breaks when close moves below level.
- Verify S/R count stays within max-level cap and old levels are pruned.
- Verify nearest-level filtering (N above/N below) removes distant clutter.
- Verify S/R clusters hold across re-tests and invalidate on configured break rule.
- Verify Supply/Demand zones follow same mitigation/break lifecycle as OB/FVG/BB/iFVG.
