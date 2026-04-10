# Version 0326-24 - Reclass Label Update + $ Marker

## Done
- Updated `src/Hung - MSS.pine` to `@file-version: 0326-24`.
- BOS/MSS reclass behavior updated:
  - Keep reclass logic as-is (same trigger/timeout).
  - Do not overwrite old text to `xxx`.
  - Append ` x` to existing event text on invalidation (example: `BOS ↑ x`).
  - Add marker signal `X` on the reclaim candle at the invalidated level.
- Liquidity label text updated globally:
  - `$$$` -> `$` (both creation and runtime update paths).
- Updated `MASTER_PLAN_STATUS.md` current MSS head to `0326-24`.

## Notes
- Performance impact remains low:
  - Existing O(1) reclass tracker unchanged.
  - Adds 1 label object only when invalidation event occurs.

## Next Actions
1. Compile and test `src-versions/0326-24/Hung - MSS.pine`.
2. Verify chart behavior:
   - Invalidation appends ` x` (no forced rename to `xxx`).
   - `X` marker appears exactly on invalidation candle.
   - All non-LTF liquidity labels now display `$` instead of `$$$`.
3. If needed, next pass can add a toggle to enable/disable `X` marker only (logic unchanged).
