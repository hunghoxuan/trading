---
description: Durable architecture principles extracted from project evolution and verified against current code
---

Use these principles for refactor decisions across Core/SMC/MSS/UI.

1. Preserve behavior first, optimize second.
2. Stop expansion and fix compile/runtime errors before new features.
3. Keep object growth bounded (reuse objects, cap arrays, avoid per-bar explosion).
4. Separate shared data context from runtime/trade arrays:
   - `ChartContext`: shared data (`zones`, `levels`, `events`, `signalHist`, bias/trend data).
   - `trades`: keep outside `ChartContext` by default.
5. Use `RuntimeContext` for chart lifecycle gates (reload/tf/symbol changes), not ad-hoc per-file flags.
6. Prefer shared helper methods in KIT for repeated mapping/gating logic; avoid duplicated branch chains.
7. Event pipeline must support both trigger types:
   - `Signal`: marker/event only.
   - `Trade`: converted to entries/trades by model gate.
8. Signal eligibility must not depend on UI visibility toggles (show/hide flags).
9. TradingView compile + behavior validation is required for Pine logic changes; if not validated yet, mark status as pending validation.
10. Keep docs and rules synchronized with code in the same task when behavior changes.
