# ZigZag MSS/BOS Regression Analysis (2026-02-27)

## Scope
- Baseline (known good): `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260224_221348`
- Compared refactor sample: `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_022500_restore_bos_mss_draw_location_original`

## Main Findings
1. BOS/MSS event **generation semantics changed** during refactor stages.
- Major/minor break checks were modified multiple times (crossover/crossunder vs close/wick/displacement style checks).
- This directly changes event frequency and can suppress labels if thresholds are stricter than legacy behavior.

2. BOS/MSS draw path was **decoupled** from detection in some versions.
- Original baseline draws BOS/MSS labels immediately in the same detection branch.
- Refactor versions introduced `update_structure_breaks(...)` + `draw_structure(...)` split and relied on one-bar event flags.
- Any flag reset/reorder/guard mismatch can produce "event detected but nothing drawn" symptoms.

3. ZigZag pivot-type refactor introduced a known fragility point.
- During integer pivot-code migration, `LH/HL` side mapping and related conditions were touched.
- If this mapping drifts, major/minor level promotion becomes wrong, causing BOS/MSS conditions to rarely trigger.

## Why labels disappeared in refactor path
Most probable combined mechanism:
- Structure levels were altered by pivot mapping or level-promotion drift.
- Break confirmation became stricter in some iterations.
- Draw stage was moved away from detection stage, so one-bar event flags became easier to miss.

## Safe Optimization Strategy (Preserve Features)
1. Keep legacy BOS/MSS trigger semantics as reference behavior:
- Major: `ta.crossover(close, Major_HighLevel)` / `ta.crossunder(close, Major_LowLevel)`
- Minor: `Minor_HighLevel < close` / `Minor_LowLevel > close`

2. Keep BOS/MSS label creation at the same logical point as detection unless a durable event queue is added.
- If split is required, draw from persisted event records (index + type), not transient booleans.

3. Restrict optimization to non-semantic areas first:
- Array caps/pruning
- Draw lookback gating
- Helper deduplication without changing thresholds/branching

4. Add regression guardrails before further refactor:
- Toggleable debug counters: major/minor BOS/MSS per N bars.
- Compare counts against baseline on the same chart/timeframe before accepting refactor.

## Recommendation
Use the currently restored baseline as the hard reference and only apply incremental, verifiable optimizations with behavior checks after each step.
