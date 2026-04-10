# ICT, SMC, & Price Action: Concepts and Implementation Guide

This document defines the core concepts of Inner Circle Trader (ICT), Smart Money Concepts (SMC), and Price Action (PA) used in this indicator. It serves as the "source of truth" for definitions and explains how each is implemented computationally.

---

## 1. Market Structure

### **Break of Structure (BoS)**
- **Definition:** A **continuation** of the current trend. It occurs when price breaks above a previous Swing High (in an uptrend) or below a previous Swing Low (in a downtrend). Ideally, this should be a **body close**, confirming momentum.
- **Implementation:**
    - The indicator tracks a `paTrend` state (1 for Bullish, -1 for Bearish).
    - Used ZigZag swings to identify pivots.
    - If `paTrend` is Bullish and price breaks the *previous* Swing High $\to$ **BoS (Bullish)**.
    - If `paTrend` is Bearish and price breaks the *previous* Swing Low $\to$ **BoS (Bearish)**.

### **Change of Character (CHoCH)**
- **Definition:** The **first** signal of a potential trend reversal. It occurs when price breaks the most recent major Swing Low (in an uptrend) or Swing High (in a downtrend). This is often the initial step of a Market Structure Shift (MSS).
- **Implementation:**
    - If `paTrend` is Bullish and price breaks the *last* Swing Low $\to$ **CHoCH (Bearish)**.
    - If `paTrend` is Bearish and price breaks the *last* Swing High $\to$ **CHoCH (Bullish)**.
    - *Note:* The indicator updates the trend direction immediately upon a valid CHoCH.

---

## 2. Order Blocks (OB)

### **Standard Order Block (OB)**
- **Definition:** The specific candle (or series of candles) representing institutional buying or selling before a significant move that breaks structure (BoS/CHoCH).
    - **Bullish OB:** The last **down-close (bearish)** candle before the impulsive up-move that breaks structure.
    - **Bearish OB:** The last **up-close (bullish)** candle before the impulsive down-move.
- **Validity Criteria (Strict):**
    1.  **Imbalance:** The move away should ideally create an FVG.
    2.  **Break:** The move must break market structure.
    3.  **Freshness:** An OB is considered "Fresh" or "Unmitigated" if price has not returned to it.
    4.  **Invalidation:** If price returns and trades completely through it (Body Close), it is failed. If price touches it (Wick/Body) without breaking, it is **Mitigated** (used).
- **Implementation:**
    - **Creation:** Identified at Swing Points. `top` and `btm` of the source candle are stored.
    - **Filtering:** 
        - **Mitigated/Invalid:** If price subsequently touches the zone (Wick overlaps) but bounces, the OB is marked as "Mitigated" and **hidden** to reduce clutter (as of v1.1.1).
        - **Breaker:** If price closes *through* the OB, it converts to a Breaker Block.
    - **Labels:** Marked as `+OB` (Bullish) or `-OB` (Bearish).

### **Breaker Block (BB)**
- **Definition:** A **failed** Order Block. When price breaks through a valid OB with momentum (body close), that zone flips its role (Support $\leftrightarrow$ Resistance).
    - **Bullish Breaker:** A Bearish OB that failed (price broke up through it) and now acts as Support.
    - **Bearish Breaker:** A Bullish OB that failed (price broke down through it) and now acts as Resistance.
- **Implementation:**
    - Logic checks for a **Body Close** beyond the OB limits.
    - If confirmed, the box is NOT deleted but **extended** and recolored.
    - **Labels:** Marked as `+BB` or `-BB`.

---

## 3. Imbalances (Fair Value Gaps - FVG)

### **Fair Value Gap (FVG)**
- **Definition:** A price range where there was one-sided buying or selling efficiency, leaving a gap. It is defined by a 3-candle pattern.
    - **Bullish FVG (BIS I - Buyside Imbalance Sellside Inefficiency):** Gap between Candle 1's High and Candle 3's Low. (Condition: `Low[0] > High[2]`).
    - **Bearish FVG (SIBI - Sellside Imbalance Buyside Inefficiency):** Gap between Candle 1's Low and Candle 3's High. (Condition: `High[0] < Low[2]`).
- **Consequent Encroachment (CE):** The 50% midpoint of the FVG. Often acts as a precision entry or resistance level.
- **Implementation:**
    - **Detection:** Checks every bar against the bar 2 periods ago.
    - **Filtering:** Minimum size filter (ATR multiplier) to ignore insignificant gaps.
    - **Management:** 
        - Auto-extends until filled.
        - "Filled" means price has completely traded through the gap (closed beyond it).
        - Option to delete filled FVGs to keep chart clean.
    - **Labels:** `+FVG` / `-FVG`.

---

## 4. Liquidity

### **Buy-Side Liquidity (BSL) / Sell-Side Liquidity (SSL)**
- **Definition:** Resting Stop Losses (stops) and Buy Stop/Sell Stop orders located above Swing Highs (BSL) or below Swing Lows (SSL).
- **Implementation:**
    - Drawn as lines extending from Swing Highs/Lows.

### **Liquidity Sweep (Stop Hunt / Grab)**
- **Definition:** Price moves beyond a key liquidity level (taking the stops) but fails to close beyond it, effectively "sweeping" the liquidity and reversing. This is a strong reversal signal.
- **Implementation:**
    - Indicator tracks active Swing High/Low lines.
    - If Price High > Line Level AND Close < Line Level $\to$ **Bearish Sweep**.
    - If Price Low < Line Level AND Close > Line Level $\to$ **Bullish Sweep**.
    - Marker: Labeled with `x`.

### **Equal Highs (EQH) / Equal Lows (EQL)**
- **Definition:** Two or more swing points at roughly the same price level. These are highly attractive "Liquidity Pools" because many traders place stops just beyond them.
    - **EQH:** "Double Top" area $\to$ Magnet for price to go UP and sweep.
    - **EQL:** "Double Bottom" area $\to$ Magnet for price to go DOWN and sweep.
- **Implementation:**
    - **Tolerance:** Uses ATR to determine if two points are "equal" (e.g., within 0.1 ATR).
    - **Strict Validation:** The space *between* the two points must generally respect the level (no significant price action crossing the line).
    - **Status:**
        - **Active:** Dotted line connecting points. Labeled `EQH` / `EQL`.
        - **Swept:** When price eventually breaks this level, it is marked as `EQH ✓` / `EQL ✓` and dashed.

---

## 5. Time & Price (ICT Killzones)

### **Concept**
ICT emphasizes that *when* you trade is as important as *where*. Volatility injections occur at specific times of day.

### **Sessions**
1.  **Asian Range:** (Usually 20:00 - 00:00 NYC). Often consolidation. The High/Low of this range sets liquidity targets for the London session.
2.  **London Open (Judas Swing):** (02:00 - 05:00 NYC). Often creates the "Low of the Day" (in a Bullish day) or "High of the Day" (in a Bearish day) by sweeping Asian liquidity.
3.  **New York AM:** (07:00 - 10:00 NYC). Continuation or Reversal of London.
4.  **New York PM:** (Often ~13:00 NYC). Late session moves.

- **Implementation:**
    - Uses `time()` function with specific session strings.
    - Draws boxes highlighting the High/Low of these specific time windows.
    - UTC-5 (New York time) conversion logic is built-in.

---

## 6. Premium & Discount

### **Concept**
Market moves in impulsive swings. 
- **Premium:** The upper 50% of a dealing range. Smart Money **sells** here.
- **Discount:** The lower 50% of a dealing range. Smart Money **buys** here.
- **Equilibrium:** The exact 50% level.

### **Implementation (Planned)**
- Identification of the current defined Dealing Range (Swing High to Swing Low).
- Fibonacci levels 0, 0.5, 1.
- Color coding the background to visually separate Premium (Expensive) vs Discount (Cheap).

---

## 7. ICT Silver Bullet

### **Concept**
The "Silver Bullet" is a specific 60-minute window of high-probability price delivery. ICT teaches that during these times, the algorithm seeks liquidity or rebalances inefficiencies (FVGs) with high displacement.

### **Trading Windows (New York Local Time)**
1.  **AM Silver Bullet:** 10:00 AM - 11:00 AM
    -   Often continues the trend established at the 09:30 open or reverses it after a "Judas Swing".
2.  **PM Silver Bullet:** 02:00 PM - 03:00 PM (14:00 - 15:00)
    -   Often sets up the afternoon trend into the market close.

### **Why we draw these zones?**
1.  **Focus:** These windows allow traders to ignore the noise of the rest of the day and focus their attention on arguably the most reliable hours.
2.  **The Setup:** A classic Silver Bullet setup involves:
    -   A **Liquidity Sweep** (Stop Hunt) of a previous high/low.
    -   A **Market Structure Shift (MSS)** indicating a reversal.
    -   A **Fair Value Gap (FVG)** forming *within* the 60-minute window.
    -   Entry is taken inside the FVG.
3.  **Visual Aid:** The indicator highlights the background of these hours (Silver color) to alert the trader: "Pay attention now, a setup is likely forming."
