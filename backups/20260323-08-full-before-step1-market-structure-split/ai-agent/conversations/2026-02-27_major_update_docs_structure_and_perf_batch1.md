# Conversation Summary - 2026-02-27 (Major Update)

## Scope
- Finalized docs structure split:
  - project docs in `/docs`
  - reusable agent assets in `/ai-agent`
- Normalized references naming and added index files.
- Implemented coding step: safe performance optimization batch #1.

## Key Decisions
1. Keep behavior stability as top priority; non-semantic changes first.
2. Use `backups/` only for working/approved snapshots.
3. Add source-file trace header for rollback tracing.

## Code Changes (Perf Batch #1)
- Added `perfLookbackBars` input and lookback helper functions.
- Gated high-frequency label/icon creation (signals/divergence/PPDD/stack/VWAP/RSI/trendline tooltip labels).
- Preserved BOS/MSS structural semantics.

## Backup Used Before Perf Batch
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_114638_v1.1.1_perf_batch1_draw_lookback_pre_refactor`

## New Rule Added
- Source files must keep one latest trace header comment (timestamp, brief update, features changed, last backup path).
- Save conversation summaries only for major updates.
