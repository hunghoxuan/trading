---
description: Prevent backfill signals/trades; emit only from fresh chart point onward
---

Apply to indicators that generate events/trades (Core/SMC/MSS).

## Required Non-Breaking Contract

1. Keep zone/structure/trade lifecycle updates running as needed for visuals/state.
2. Use a 2-layer gate model:
   - Layer A (strategy processing gate) may allow realtime or confirmed bar processing.
   - Layer B (final webhook emitter gate) is authoritative for outbound alerts.
3. Final emitter gate MUST stay realtime-only for production paths:
   - `emit_trade_webhook_new_trade(..., realtimeOnly=true, ...)`
   - `canEmit = (not realtimeOnly) or barstate.isrealtime`
   - with `realtimeOnly=true`, webhook emit requires `barstate.isrealtime`.
4. Do not emit historical/backfill trades on load, TF switch, or symbol switch.
5. Keep gate logic centralized in emitter/runtime flow; avoid duplicate ad-hoc gates.

## Truth Table (Required)

- `barstate.isrealtime=true`, `barstate.isconfirmed=false` -> emit allowed.
- `barstate.isrealtime=true`, `barstate.isconfirmed=true` -> emit allowed.
- `barstate.isrealtime=false`, `barstate.isconfirmed=true` -> emit blocked.

## Refactor Guardrails

- Do not replace realtime-only final gate with confirmed-only gate.
- Do not change current call sites from `realtimeOnly=true` unless explicitly approved.
- If adding new emitters, they must follow the same final realtime gate.
