# Entry Setups — ICT-SMC-PA All-in-one

> Detected automatically by the signal system. Each setup produces a **pending** signal first, then a **confirmed** signal if price validates.

## Visual Legend

| State | Look | Meaning |
|-------|------|---------|
| **Pending** | Border only, no fill (green/red text) | Zone touched, waiting for confirmation |
| **Confirmed** | Filled background (white text) | Price closed in expected direction |

---

### 1. Order Block (OB) Retest
**Direction:**
- **Buy:** Price drops into a **Bullish OB** (Demand Zone at Swing Low).
- **Sell:** Price rises into a **Bearish OB** (Supply Zone at Swing High).

**Logic:**
1.  **Zone Age:** Zone must be at least **3 bars old**.
2.  **Clean Approach:** Price must have been **outside** the zone for at least **3 consecutive bars** prior to entry.
3.  **Retest:** Current bar enters the zone (wick touch is sufficient).
4.  **No Duplicate:** No pending signal acting on this specific zone.

**Visuals:**
- **Pending:** `B` (Green) below bar or `S` (Red) above bar. Transparent background.
- **Confirmed:** Solid background.

### 2. Fair Value Gap (FVG) Retest
**Direction:**
- **Buy:** Price drops into a **Bullish FVG** (Gap Up).
- **Sell:** Price rises into a **Bearish FVG** (Gap Down).

**Logic:**
1.  **Gap Age:** Gap must be at least **3 bars old**.
2.  **Clean Approach:** Price must have been **outside** the gap for at least **3 consecutive bars** prior to entry.
3.  **Retest:** Current bar enters the gap.
4.  **No Duplicate:** No pending signal acting on this specific gap.

| Field | Buy | Sell |
|-------|-----|------|
| Trigger | `low <= FVG.top` | `high >= FVG.btm` |
| Confirm | `close > FVG.top` next bar | `close < FVG.btm` next bar |
| Invalidate | `close < FVG.btm - range` | `close > FVG.top + range` |
| Timeout | 20 bars | 20 bars |

## Setup 3: Breaker Block Retest

**Buy**: Broken bearish OB retested → now acts as support
**Sell**: Broken bullish OB retested → now acts as resistance

| Field | Buy | Sell |
|-------|-----|------|
| Trigger | `low <= BB.top` (broken bearish) | `high >= BB.btm` (broken bullish) |
| Confirm | `close > BB.top` next bar | `close < BB.btm` next bar |
| Invalidate | `close < BB.btm - range` | `close > BB.top + range` |
| Timeout | 20 bars | 20 bars |

## Setup 6: S&R Break (existing)

Direct confirmed signal on breakout — no pending stage.
- Support Break → Sell
- Resistance Break → Buy

---

## Confirmation Logic

Runs once per bar after all detectors:
1. **Confirmed**: price closes beyond zone edge → emit confirmed signal
2. **Invalidated**: price closes 1× zone-range beyond opposite edge → remove
3. **Timeout**: pending > 20 bars → remove
4. **Cleanup**: confirmed entries removed after 25 bars
