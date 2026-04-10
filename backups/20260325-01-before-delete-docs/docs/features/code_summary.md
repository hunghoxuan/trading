# Code Summary: `_2_ICT-SMC-PA All-in-one2.pine`

- Source: `/Users/macmini/Trade/Bot/Hung Bot/src/_2_ICT-SMC-PA All-in-one2.pine`
- Script version tag in file: `2.2.0`
- Last reviewed: 2026-02-27

## Purpose
Single overlay indicator combining ICT/SMC structure, zones, liquidity concepts, bias scoring, and confluence triggers.

## Active Core Modules
1. HTF candle overlay and HTF bias matrix.
2. Killzones (Asia/London/NY sessions).
3. ZigZag market structure with major/minor BOS/MSS labels.
4. SMC zones: OB, FVG, RJB.
5. Unified detection framework for break/mitigation sensitivity.
6. Liquidity sweeps (BSL/SSL) and EQH/EQL lifecycle.
7. Key levels: PDH/PDL and PWH/PWL.
8. Trend lines, divergence, HVB/PPDD markers.
9. VWAP/RSI trigger icons and bias checklist dashboard.

## Important Current Design Notes
- `SMC_Zone` is the active universal zone UDT in current code.
- BOS/MSS visualization uses legacy-preserved trigger semantics to keep label visibility.
- Unified detection settings were added and are currently integrated in zone, liquidity, and EQ checks.
- Pending-entry framework exists but is not the primary signal pipeline today.

## Known Practical Constraints
- TradingView runtime behavior still requires manual chart validation after logic edits.
- Structure logic is sensitive to pivot-type and trigger semantics; refactors must be incremental.

## Recommended Guardrails
1. Preserve baseline BOS/MSS semantics unless explicitly changing behavior.
2. Validate changes with a short checklist before proceeding to next batch.
3. Keep backups only for confirmed-working checkpoints.
