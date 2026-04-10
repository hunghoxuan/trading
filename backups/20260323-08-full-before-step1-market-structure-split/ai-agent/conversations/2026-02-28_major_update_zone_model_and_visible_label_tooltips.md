# Major Update Summary (2026-02-28)

## Scope
- Improve current zone UX and simplify zone semantic model before next feature.
- Target file: `/Users/macmini/Trade/Bot/Hung Bot/src/ict_smc [hung].pine`.

## Backup
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_155028_pre_zone_type_simplify_and_label_tooltip_refactor`

## Implemented
1. Zone semantic model refactor:
   - Added `SMC_Zone.isBullish`.
   - Added `SMC_Zone.labelText`.
   - Normalized zone types to base values (`OB`, `FVG`, `RJB`) instead of `Bull_*`/`Bear_*`.
2. Simplified zone checks:
   - Mitigation and extension logic now uses `type` + `isBullish`.
   - OB de-dup check now uses `z.type == "OB" and z.isBullish == isBull`.
3. Tooltip ownership moved to visible labels:
   - Removed invisible anchor-label usage for OB/FVG/RJB.
   - Tooltips now attached to visible zone labels.
4. Label placement rules applied:
   - OB/RJB bullish: top-right.
   - OB/RJB bearish: bottom-right.
   - FVG bullish/bearish: middle-right.
5. Zone background visual cleanup:
   - OB/FVG/RJB fill changed to neutral (`ZONE_BG_COLOR`) while keeping directional label/border colors.

## Trace
- Header bumped to `2.9.0` with latest backup reference.
