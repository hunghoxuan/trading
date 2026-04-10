# Implementation Logs

## 2026-02-27
- User-confirmed working checkpoint:
  - `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_085000_v1.1.0_unified_detection_validated_working`
- Completed documentation migration:
  - `ai-agent/` for reusable agent assets
  - `docs/` for project logic/docs
- Moved indicator/strategy script references under:
  - `/Users/macmini/Trade/Bot/Hung Bot/docs/references/indicators`
  - `/Users/macmini/Trade/Bot/Hung Bot/docs/references/strategies`
- Added index/navigation files:
  - `/Users/macmini/Trade/Bot/Hung Bot/docs/features/INDEX.md`
  - `/Users/macmini/Trade/Bot/Hung Bot/docs/references/INDEX.md`
  - `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/INDEX.md`
- Added reusable agent index docs:
  - `/Users/macmini/Trade/Bot/Hung Bot/ai-agent/README.md`
  - `/Users/macmini/Trade/Bot/Hung Bot/ai-agent/errors/INDEX.md`

## 2026-02-26
- Restored BOS/MSS trigger semantics and visuals to baseline-compatible behavior.

## 2026-02-27 (Structure Debug Counters)
- Backup before change:
  - `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_120100_v1.1.2_structure_debug_counters_pre_refactor`
- Added optional structure debug table in source:
  - `showStructureDebug`
  - `structureDebugWindowBars`
  - major/minor BOS/MSS total + rolling-window counts.

## 2026-02-27 (Label Budget Priority Fix)
- Backup before change:
  - `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_121200_v1.1.3_label_budget_priority_fix_pre_refactor`
- Increased `max_labels_count` from 100 to 500.
- Added `showAuxiliaryIcons` toggle and gated non-structure labels/icons to preserve BOS/MSS visibility.

## 2026-02-27 (Input Group Cleanup)
- Backup before change:
  - `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_123200_v1.1.4_input_group_cleanup_pre_refactor`
- Removed structure debug counters/table and related inputs.
- Re-grouped inputs:
  - execution/auxiliary icon toggles -> `Settings`
  - EQH/EQL + Key Levels -> `ICT/SMC`

## 2026-02-27 (Signal Visibility Hotfix)
- Backup before change:
  - `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_121000_v1.1.5_restore_signal_labels_pre_refactor`
- Fixed accidental coupling where `addSignal(...)` depended on `showAuxiliaryIcons`.
- Buy/Sell signal labels now render based on signal condition + lookback gating only.

## 2026-02-27 (Liquidity Regression Fix)
- Backup before change:
  - `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_121800_v1.1.6_restore_liquidity_legacy_confirm_pre_refactor`
- Restored liquidity sweep confirmation to legacy close-based checks:
  - Sell sweep: `close < swept BSL level`
  - Buy sweep: `close > swept SSL level`
- Increased `max_lines_count` to 500 to reduce missing-liquidity-line issues.
