# Major Update Summary (2026-02-28)

## Scope
- Continue implementation by improving HTF projected zones with score-aware filtering.
- Target file: `/Users/macmini/Trade/Bot/Hung Bot/src/ict_smc [hung].pine`.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_161533_pre_htf_quality_threshold`

## Implemented
1. Added HTF projection controls:
   - `HTF Min Quality %`
   - `Show HTF Quality %`
2. Reused shared quality model for HTF projection:
   - Added `get_zone_quality_pct(...)`.
   - Extended `get_htf_zone_snapshot(...)` to include OB/FVG quality % payload.
3. Applied quality gate to HTF projected boxes:
   - HTF OB/FVG boxes render only when quality % >= threshold.
4. Added optional score text on HTF box labels:
   - Example: `HTF OB 71%`, `HTF FVG 57%`.

## Trace
- Header bumped to `3.0.0` with latest backup reference.

## Notes
- Keeps strict fixed object budget (4 reusable HTF boxes).
