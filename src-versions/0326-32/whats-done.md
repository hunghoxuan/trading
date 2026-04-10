# Version 0326-32 - MSS UI One-pass Bundle

## Done
- Updated `src/Hung - MSS.pine` to `@file-version: 0326-32`.

### A) `$` position controls (complete)
- Existing:
  - `$ X`: `Left|Middle|Right`
  - `Y`: `Above|Center|Below`
- Added:
  - `$ Y ticks`: numeric offset in ticks (fine-tune vertical spacing).

### B) Overlap controls (complete)
- Existing:
  - `TF Priority` toggle.
- Added:
  - `Overlap ATR`: overlap tolerance as ATR multiplier.
  - `Overlap Scope`: `Dollar Only` or `All LIQ`.
- Priority rule remains `HTF2 > HTF1 > LTF`.

### C) Invalid marker controls (complete)
- Added `X mode`: choose `Marker` or `Event` for invalidation marker display.
- Keep icon mapping:
  - bullish invalidation marker: `X↑` below-bar
  - bearish invalidation marker: `X`

### D) Kept behavior
- No inline `x` appended on BOS/MSS text.
- Marker is the invalidation signal.

### Files updated
- `src/Hung - MSS.pine`
- `MASTER_PLAN_STATUS.md` (MSS head -> `0326-32`)

## Next Actions
1. Compile and test `src-versions/0326-32/Hung - MSS.pine`.
2. Validate quickly in one run:
   - `$` X/Y + `$ Y ticks` response.
   - overlap behavior under both scopes.
   - `X mode` Marker/Event visual.
3. If stable, next one-pass is Core config unification (to complete full codebase pattern).
