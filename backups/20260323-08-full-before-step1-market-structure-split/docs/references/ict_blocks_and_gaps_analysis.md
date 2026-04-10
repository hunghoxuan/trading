# ICT Blocks & Gaps: Analysis, Priority, and Implementation Strategy
> **Generated:** 2026-02-21 (updated)  
> **Goal:** Comprehensive list of ICT/SMC concepts, status in current codebase, and priority for trading/reaction.

---

## 📊 Summary Table

| Concept | Status | Priority (Strength) | Reaction / Purpose |
| :--- | :---: | :---: | :--- |
| **Order Block (OB)** | ✅ Implemented (v2.1) | **High** | Origin of move. Strong reaction if fresh. Port of `Super OBs FVGs BOS.pine`. |
| **Breaker Block (BB)** | ✅ Implemented | **High** | Reversal after Liquidity Sweep (Stop Hunt). Supports trend shift. |
| **Fair Value Gap (FVG)** | ✅ Implemented (v2.1) | **High** | Magnet for price rebalancing. Port of `Super OBs FVGs BOS.pine`. |
| **Mitigation Block (MB)** | ❌ Missing | **Medium** | Continuation pattern (Failure Swing). Similar to BB but no liquidity sweep first. |
| **Rejection Block (RB)** | ❌ Missing | **Medium/High** | Liquidity below/above wicks. Price often wicks into this zone and reverses. |
| **Volume Imbalance (VI)** | ❌ Missing | **Medium** | Real gap between Close and Open. Immediate magnetic draw. |
| **Inversion FVG (IFVG)** | ❌ Missing | **High** | Failed FVG that flips polarity (Res $\to$ Supp). Strong continuation signal. |
| **Propulsion Block** | ❌ Missing | **Low/Medium** | Candle inside an OB that propels price higher. Trend acceleration. |
| **Vacuum Block** | ❌ Missing | **Low** | Gap caused by news/event. Usually filled completely later. |
| **Liquidity Void** | (Covered by FVG) | **High** | Large range of one-sided price action. |

---

## 🔍 Detailed Analysis & Implementation Suggestions

### 1. Mitigation Block (MB)
- **Concept:** A "failed" Order Block similar to a Breaker, but with a key difference: **Mitigation Blocks occur after a Failure Swing (Lower High)**.
    - *Breaker:* Price takes liquidity (Higher High) $\to$ Breaks Low. (Stop Hunt).
    - *Mitigation:* Price fails to take liquidity (Lower High) $\to$ Breaks Low. (Weakness).
- **Reaction:** Price returns to the broken block to "mitigate" losses and continues lower.
- **Implementation Suggestion:**
    - Enhance the `manage_...` logic for LuxAlgo OBs.
    - When an OB is broken (Close < Bottom), check the *Swing High* that preceded the break.
    - If `Preceding Swing High` > `OB Swing High` $\to$ **Breaker Block** (Current logic).
    - If `Preceding Swing High` < `OB Swing High` $\to$ **Mitigation Block**.
    - **Visual:** Differentiate with label `-MB` / `+MB` and potentially a different color (e.g., Purple vs Red).

### 2. Rejection Block (RB)
- **Concept:** When a Swing High/Low has a long wick, the "Rejection Block" is the area between the **High** and the **Highest Body Close** (for Bearish) or **Low** and **Lowest Body Close** (for Bullish).
- **Reaction:** Smart money often runs stops just above the bodies but respects the wick high.
- **Implementation Suggestion:**
    - Detect Swing Highs logic.
    - Identify the Highest Candle in the swing.
    - Draw Box from `High` to `Max(Close, Open)`.
    - Filter: Wick must be at least X% of the total candle range (e.g., > 50%) to be significant.

### 3. Volume Imbalance (VI)
- **Concept:** A gap between the **Close of Candle A** and the **Open of Candle B**. (Do not confuse with FVG which involves Candle A and C).
- **Reaction:** Price often treats this small gap as immediate support/resistance.
- **Implementation Suggestion:**
    - Loop through candles.
    - `Bullish VI`: `Open > Close[1]`. Gap is `[Close[1], Open]`.
    - `Bearish VI`: `Open < Close[1]`. Gap is `[Open, Close[1]]`.
    - Draw small box or horizontal ray.

### 4. Inversion Fair Value Gap (IFVG)
- **Concept:** A valid FVG that price closed through (failed). Instead of disappearing, it flips polarity.
    - *Bearish FVG* broken by Body Close UP → Becomes *Bullish Inversion FVG* (Support).
- **Reaction:** Very high probability for entry after a CHoCH.
- **Implementation Suggestion** *(now easier with new architecture)*:
    - In `_controlZone`, when a `Bear_FVG` hits **Stage 2 (broken)** due to `close > boxHigh`:
        - Instead of deleting, change `z.type` to `"Bull_IFVG"`, flip color to green, keep extended.
    - Similarly, `Bull_FVG` broken bearishly → `"Bear_IFVG"`.
    - This is a minimal change to `_controlZone` since broken detection is already implemented.

### 5. Propulsion Block
- **Concept:** An Order Block that forms *inside* or *touching* a previous Order Block. It shows highly aggressive reinvestment.
- **Implementation Suggestion:**
    - Check if a new OB is created while price is inside an existing OB.
    - Sensitivity: High.

---

## 🚀 Recommendation for Next Steps

1.  **High Value:** Implement **Mitigation Blocks**. Since we already track Swings for OBs, adding the "Failure Swing" check is straightforward and adds significant analytical depth distinguishing "Stop Hunts" (Breakers) from "Trend Weakness" (Mitigation).
2.  **High Value:** Implement **Inversion FVGs**. This essentially doubles the utility of the existing FVG logic with minimal code changes (just a state flip instead of delete).
3.  **Visual Depth:** Add **Rejection Blocks** as an optional toggle for users focusing on wick entries.
