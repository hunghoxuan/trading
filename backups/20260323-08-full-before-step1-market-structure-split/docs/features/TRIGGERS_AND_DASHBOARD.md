# Triggers And Dashboard

## Progress
- Status: Validated logic, pending latest TradingView compile verification
- Last Updated: 2026-03-15

## Source Of Truth
- `/Users/macmini/Trade/Bot/Hung Bot/src/Hung - ICT SMC Zones.pine`

## Requirement
- Detect ICT/SMC setup events clearly.
- Separate setup detection from actual entries.
- Keep outcome stats based on real entries only.

## Core Types
1. `Event`
- Unified setup event queue object.
- One queue (`eventsQueue`) holds:
  - zone retest confirmation candidates
  - sweep-reclaim candidates
  - break-retest candidates
- Event mode is inferred from event fields (`type`, `barBreak`, etc.), not from separate arrays.

2. `Entry`
- Actual trade lifecycle object.
- Created only when entry mode allows it.
- Fields include `entry`, `stoploss`, `takeprofit`, `rrValue`, `barCreated`, `barClosed`, `state`.
- States: `START`, `TP`, `SL`.

## Settings
1. `Add Entry Event`
- `NO ENTRY`: detect and queue setup signals only. No `Entry` is created.
- `LIMIT`: create `Entry` immediately when a valid zone retest setup appears.
- `AFTER RETEST`: queue `Event` first, then create `Entry` only after directional close confirmation.

2. `Show Entries`
- Controls chart drawing for actual entries only.

3. `Show TP` / `Show SL`
- Separate visibility toggles for resolved winning and losing entries.
- Unresolved entries remain controlled by `Show Entries`.

4. `RR`
- Risk/reward multiple used to project take-profit from computed stop distance.

## Entry Visual Modes
1. Unresolved entry
- Drawn with the standard RR plan, but slightly blurrier than the earlier implementation.

2. Resolved entry
- Controlled by a code constant, not an input yet.
- `FULL_BLUR`: keep full resolved RR box from start bar to close bar, but blur it and remove visible borders.
- `RESULT_LINES`: hide full resolved box and show only two short horizontal result lines on the start bar:
  - TP line in green
  - SL line in red
  - hit side is clearer than the non-hit side

## Runtime Cycle
1. `_controlZone(activeZones, commonAtr, activeBias)`
- Detects zone mitigation, respect, and break.
- Calls `register_zone_retest_signal(...)` for eligible zone retest setups.
- Registers break-retest events after a valid break.

2. `register_zone_retest_signal(...)`
- If `Add Entry Event = LIMIT`, creates `Entry` immediately with `add_entry(...)`.
- Otherwise queues `Event` with `add_signal(...)`.

3. `check_signal_confirm(eventsQueue)`
- Only used for queued setup events that represent zone retest confirmation flow.
- Buy confirms on `close > zoneTop`.
- Sell confirms on `close < zoneBtm`.
- If mode is `AFTER RETEST`, confirmation creates `Entry`.
- Expired setup events are removed after `ENTRY_SIGNAL_MAX_BARS`.

4. `process_sweep_reclaim_confirmations(...)`
- Direct-confirm path.
- Requires sweep touch + reclaim close-back.
- Creates `Entry` directly when mode is not `NO ENTRY`.

5. `process_break_retest_confirmations(...)`
- Direct-confirm path.
- Requires broken zone retest touch + directional close.
- Creates `Entry` directly when mode is not `NO ENTRY`.

6. `process_entries()`
- Manages only real entries.
- Checks TP/SL.
- Updates `Entry.state`.
- Updates entry stats matrix and totals.
- Refreshes entry visuals.

## Business Logic
### Setup Signals
- Setup signals are not trades.
- They exist to queue or visualize possible entries before confirmation.
- They are prevented from duplicating by `has_pending_entry_signal(...)`.

### Entries
- Entries are the only objects counted in TP/SL/WR/+R dashboard stats.
- Duplicate active entries for the same direction and zone are prevented by `find_entry_idx(...)`.

### Dashboard
- Top-right table now counts entry outcomes only.
- Columns: `OB`, `BB`, `FVG`, `SWP`, `Total`
- Rows: `TP`, `SL`, `WR %`, `+ R`
- No `Potential` column remains.
- A real entry is counted once only:
  - `TP` increments only when `Entry.state` changes from `START` to `TP`
  - `SL` increments only when `Entry.state` changes from `START` to `SL`
  - `Total` is the sum of entry outcomes across all entry types
- The dashboard does not count queued `Event` objects.
- A queued setup signal that later becomes an entry is not double-counted because `Event` and `Entry` are separate arrays and only `Entry` feeds outcome stats.
- The bottom-right bias dashboard is also owned by the ICT file:
  - current TF tile shows current score and direction
  - HTF1/HTF2 tiles show bias direction and score summary

## Dashboard Semantics
1. `OB`
- Counts only actual OB-family entries.
- This includes entries created from:
  - direct `LIMIT` mode on an OB retest setup
  - `AFTER RETEST` confirmation of an OB setup signal
  - OB-family break-retest entries

2. `BB`
- Counts only actual breaker-block entries.

3. `FVG`
- Counts only actual FVG/iFVG-family entries.

4. `SWP`
- Counts only actual liquidity sweep reclaim entries.

5. `Total`
- `TP`: sum of all type TP counts
- `SL`: sum of all type SL counts
- `WR %`: recalculated from total TP and total SL, not summed from child columns
- `+ R`: sum of all realized R outcomes

## Why Two Objects Exist
1. `Event`
- Represents setup/event detection only.
- Can expire without ever becoming an entry.
- Covers retest, sweep-reclaim, and break-retest in one queue.

2. `Entry`
- Represents an actual trade plan/lifecycle.
- Owns entry, stoploss, takeprofit, state, and visuals.
- Is the only object that can hit `TP` or `SL`.

## Entry Scenarios
1. Zone retest setup
- Triggered when a zone is mitigated or respected and passes bias/min-score filters.
- Depending on mode, either queues `Event` or creates `Entry`.

2. Reverse + retest confirm
- `check_signal_confirm(...)`
- Confirms queued zone retest setup on directional close reclaim/reject.

3. Sweep reclaim confirm
- `process_sweep_reclaim_confirmations(...)`
- Confirms liquidity sweep only after reclaim close-back.

4. Break + retest confirm
- `process_break_retest_confirmations(...)`
- Confirms continuation after retest of a broken zone and directional close.

## OB Retest Detailed Flow
1. First mitigation / first retest into OB
- OB must still be active and not yet mitigated.
- `_controlZone(...)` uses `check_mitigation(...)` to detect first valid entry into the OB.
- If valid:
  - zone is marked mitigated
  - mitigated styling is applied
  - `register_zone_retest_signal(...)` is called
- Then:
  - `LIMIT` creates `Entry` immediately
  - `AFTER RETEST` queues `Event`
  - `NO ENTRY` keeps detection only

2. Respected touch after mitigation
- Applies only after the OB was already mitigated.
- `_controlZone(...)` uses `check_zone_respect(...)` to detect a later touch that holds.
- If valid:
  - `register_zone_retest_signal(...)` is called again with an OB-respect reason/setup label
  - same entry-mode routing applies:
    - `LIMIT` -> immediate `Entry`
    - `AFTER RETEST` -> queued `Event`
- In `AFTER RETEST`, `check_signal_confirm(...)` confirms only on directional close:
  - Buy: `close > zoneTop`
  - Sell: `close < zoneBtm`

3. Later break-retest from that OB
- Applies after the mitigated OB fails.
- `_controlZone(...)` uses `check_break(...)` on the OB failure side.
- If broken:
  - a break-retest event is registered
  - the original OB is removed
  - breaker-logic may spawn a `BB`
- Later `process_break_retest_confirmations(...)` requires:
  - retest touch of the broken zone
  - directional close confirmation
  - no invalidation close through the opposite side
- If valid and entry mode is not `NO ENTRY`, it creates `Entry` directly.

## Test Conditions
1. `NO ENTRY`
- Setup events can still appear.
- Dashboard TP/SL remains unchanged because no entries are created.

2. `LIMIT`
- Zone retest setups should create entries immediately.
- Dashboard updates only when those entries later hit TP or SL.

3. `AFTER RETEST`
- Zone retest setups should first queue only setup signals.
- Entry should appear only after close reclaim/reject confirmation.

4. Sweep and break-retest
- Should still create entries directly in `LIMIT` and `AFTER RETEST`.
- Should create no entries in `NO ENTRY`.
