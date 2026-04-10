---
description: Shared data ownership for indicators
---

Use `ChartContext` as single source of truth for shared runtime arrays:
- `zones`
- `levels`
- `events`
- `signalHist`

Rules:
1. Do not create duplicate global arrays for the same role.
2. Pass `chartCtx.*` arrays into `get_data_context(...)`.
3. Keep `trades` outside `ChartContext` by default.
4. Use `RuntimeContext` (KIT Core) for chart lifecycle flags and non-backfill trade gate.
5. Compute `canEmitSignals` from runtime gate + bar confirmation, then feed into entry/event pipelines.
6. For detailed implementation, follow `workflows/05-signal-emission-gate.md`.
