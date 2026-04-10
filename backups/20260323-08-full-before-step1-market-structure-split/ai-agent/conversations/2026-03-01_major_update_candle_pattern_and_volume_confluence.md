# Major Update Summary (2026-03-01)

## Scope
- Added OB subtype lifecycle labels (`OB-O/D/X/M`) and mitigation relabeling.
- Added one-time zone touch-respected signal event.
- Added enum-style candle pattern confluence pipeline.
- Expanded candle pattern set and refined quality rules.
- Added compact candle-volume confluence bonus.

## Backups
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260301_110926_zone_touch_respect_detection`
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260301_113001_candle_pattern_confluence_pipeline`
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260301_124643_enhance_get_candle_pattern_wick_ratio`
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260301_131920_refine_added_patterns_mapping_and_quality`
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260301_133542_add_volume_confluence_compact`

## Current State
- `get_candle_pattern()` now supports extended pattern enums with safe wick/body ratios.
- Confluence score supplements apply to retest/sweep/respect/confirm events only.
- Relative volume (RV20) can add an extra bonus (`+ Vol`) on confluence events.
- Selected toggles were fixed to constants per user request.

## Docs Synced
- `/Users/macmini/Trade/Bot/Hung Bot/docs/schedule/ROADMAP.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/features/TRIGGERS_AND_DASHBOARD.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/features/CANDLE_PATTERN_CONFLUENCE.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/features/INDEX.md`
- `/Users/macmini/Trade/Bot/Hung Bot/docs/README.md`
- `/Users/macmini/Trade/Bot/Hung Bot/ai-agent/AI_AGENT_PROTOCOL.md`
