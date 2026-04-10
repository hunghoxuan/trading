# Major Update Summary (2026-02-27)

## Scope
- Restored missing OB/FVG retest signal flow in unified architecture.
- Kept unified detection methods and pending-confirmation pipeline.

## User Request
- Bring back other send signals (especially retest OB/FVG) by checking base logic and applying unified methods.

## Changes Implemented
1. Added `build_bias_note(...)` helper for consistent HTF-bias note formatting.
2. Extended `_controlZone(...)` signature to receive signal context:
- `_pending`
- `_useBias`
- `_biasVal`
- `_useObSignals`
- `_useFvgSignals`
3. In active zone stage (`not z.mitigated`), added OB/FVG retest pending signal emission:
- Uses unified helpers: `check_touch(...)`, `check_mitigation(...)`, `check_break(...)`.
- Uses base-style filters:
  - `wasAway` (3-bar context above/below zone)
  - `enters` (wick touch + directional close guard)
  - optional HTF bias filter.
- Emits pending signal via `addSignal(..., confirmed=false, ...)` + pushes into `pendingEntries`.
- Confirmation remains handled by existing shared `checkConfirmations(...)` pipeline.
4. Updated `_controlZone(...)` call site with new arguments.

## Backup
- Pre-change backup:
`/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_160744_v1.1.9_ob_fvg_retest_signals_pre_refactor`

## Files Changed
- `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/ROADMAP.md`
- `/Users/macmini/Trade/Bot/Hung Bot/ai-agent/conversations/2026-02-27_major_update_unified_ob_fvg_retest_signal_restore.md`
