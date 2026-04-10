# Major Update Summary (2026-02-28)

## Scope
- Implement requested zone ranking/cap to keep strongest zones and reduce clutter.
- Target file: `/Users/macmini/Trade/Bot/Hung Bot/src/ict_smc [hung].pine`.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_183403_pre_zone_ranking_caps`

## Implemented
1. Added retention settings:
   - `Max Zones Per Bucket`
   - `Max Zones Total`
2. Extended zone data model:
   - Added `qualityPct` field into `SMC_Zone`.
3. Added reusable ranking/prune helpers:
   - `delete_zone_drawings(...)`
   - `prune_zone_bucket_weakest(...)`
   - `add_active_zone(...)`
4. Replaced FIFO retention in OB/FVG/RJB creation:
   - New zones now carry quality score.
   - Weakest zones in same bucket (`type + isBullish`) are removed first when over cap.
   - Global total cap still enforced.

## Trace
- Header bumped to `3.4.0`.
