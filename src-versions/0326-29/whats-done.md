# Version 0326-29 - MSS Liquidity Label Position + Overlap Priority + X Marker Tuning

## Done
- Updated `src/Hung - MSS.pine` to `@file-version: 0326-29`.

### 1) `$` label position options
- Added UI options (group `1. UI Config`):
  - `$ X`: `Left | Middle | Right`
  - `Y`: `Above | Center | Below`
- Applied to non-LTF liquidity label (`$`) at runtime.

### 2) Overlap handling with TF priority
- Added toggle: `TF Priority` (default `true`).
- If multiple nearby LIQ labels overlap, lower-TF `$` label is hidden when a higher-TF LIQ exists nearby.
- Priority rule: `HTF2 > HTF1 > LTF`.

### 3) X marker behavior
- Keep UI-kit marker method (`UI.draw_strategy_marker`).
- Green invalidation marker now uses `X↑` icon and remains below-bar (Buy-direction marker).
- Red marker behavior unchanged.

### 4) Additional fix
- Removed leftover `$$$`-based positioning logic path and unified around `$` logic.

### Files updated
- `src/Hung - MSS.pine`
- `MASTER_PLAN_STATUS.md` (MSS head -> `0326-29`)

## Next Actions
1. Compile and test `src-versions/0326-29/Hung - MSS.pine`.
2. Validate:
   - `$` placement changes correctly with X/Y options.
   - Overlap suppression hides lower-TF `$` when HTF overlaps.
   - Green invalidation shows `X↑` below candle; red remains OK.
3. If needed, next pass can add separate Y offset (ticks) input for `$` to fine-tune spacing.
