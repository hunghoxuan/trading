# Major Update Summary (2026-02-28)

## Scope
- Continue next queued improvement after zone-quality scoring.
- File changed: `/Users/macmini/Trade/Bot/Hung Bot/src/ict_smc [hung].pine`.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_152948_pre_htf_zone_projection`

## Implemented
1. Added HTF projection settings:
   - `HTF Zones` toggle
   - `OB` toggle
   - `FVG` toggle
   - `HTF Projection Span Bars`
2. Added HTF snapshot function:
   - `get_htf_zone_snapshot()` returns latest HTF OB/FVG bounds.
3. Added reusable fixed-budget renderer:
   - `update_projected_box(...)` reuses existing boxes instead of creating unbounded objects.
4. Added projection execution with strict cap:
   - Max 4 boxes total (`Bull/Bear OB`, `Bull/Bear FVG`) updated in place.

## Trace
- Header updated to `2.8.0` with new backup reference.

## Notes
- Designed to keep object growth bounded and avoid chart clutter/performance drift.
