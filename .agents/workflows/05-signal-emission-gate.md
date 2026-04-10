---
description: Prevent backfill signals/trades; emit only from fresh chart point onward
---

Apply to indicators that generate events/trades (Core/SMC/MSS).

1. Keep zone/structure/trade lifecycle updates running as needed for visuals/state.
2. Gate new signal/event/trade emission with:
   - `runtimeCtx := CORE.update_runtime_context(runtimeCtx)`
   - `canEmitSignals = barstate.isconfirmed and runtimeCtx.tradeScanEnabled`
3. On chart reload / TF change / symbol change:
   - runtime gate resets scan start to current chart end.
   - do not backfill historical trade candidates.
4. In event-processing paths:
   - short-circuit early when `canEmitSignals` is false.
   - avoid pushing new events/signals/trades before gate is open.
5. Keep this gate reusable and centralized (no duplicated lifecycle detection per indicator).
