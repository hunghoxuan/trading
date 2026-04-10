# Signal Icon & Symbol Summary

This document provides a quick reference for all icons and symbols used in the `ICT-SMC-PA All-in-one` indicator, explaining their meaning, associated colors, and educational rationale.

---

## 1. Market Structure
*Used to define trend direction and pivotal structural shifts.*

| Symbol / Text | Meaning | Recommended Color | Educational Context |
| :--- | :--- | :--- | :--- |
| **BOS** | Break of Structure | `BULLISH_COLOR` (if Up) | Price continues the existing bullish trend. |
| **BOS** | Break of Structure | `BEARISH_COLOR` (if Down)| Price continues the existing bearish trend. |
| **MSS** | Market Structure Shift | `BULLISH_COLOR` (Upward) | Reversal: Bearish to Bullish shift. |
| **MSS** | Market Structure Shift | `BEARISH_COLOR` (Downward)| Reversal: Bullish to Bearish shift. |
| **●** (Dot) | Major HH/LL Dot | Bull/Bear Color | High-visibility marker at Major swing Highs/Lows. |
| **·** (Small Dot)| Minor Structure Dot | Bull/Bear Color | Discreet marker for local internal market structure. |

---

## 2. Divergence Signals
*Identified on the trigger candle; lines are removed for chart clarity.*

| Icon | Type | Color | Meaning |
| :---: | :--- | :--- | :--- |
| **⇑** | Regular Bullish | `BULLISH_COLOR` | Potential Reversal from Down to Up. |
| **⇓** | Regular Bearish | `BEARISH_COLOR` | Potential Reversal from Up to Down. |
| **↑** | Hidden Bullish | `BULLISH_COLOR` | Bullish Trend Continuation (Stronger low). |
| **↓** | Hidden Bearish | `BEARISH_COLOR` | Bearish Trend Continuation (Lower high). |

---

## 3. High Confluence & Institutional Events
*Signals combining multiple institutional triggers (Liquidity + Zones).*

| Icon | Signal | Color | Meaning |
| :---: | :--- | :--- | :--- |
| **✹** | PPDD (Sweep + OB) | Bullish/Bearish | High probability "Price Displacement" trap & reversal. |
| **◆** | Stacked Zone | Bullish/Bearish | Overlap of an Order Block and Fair Value Gap. |
| **★** | High Volume (HVB) | Bullish/Bearish | Significant institutional volume spike on the candle. |

---

## 4. Liquidity & Zones
*Visual markers for resting orders and engineered liquidity.*

| Label Text | Level Type | Icon (Hidden) | Educational Value |
| :--- | :--- | :---: | :--- |
| **EQH / EQL** | Equal High/Low | ⬗ | Engineered liquidity pooling; price magnet. |
| **PDH / PDL** | Previous Day H/L | ✓ | Major liquidity levels for intraday bias. |
| **PWH / PWL** | Previous Week H/L| ✓ | Critical levels for medium-term bias. |
| **BSL / SSL** | Buy/Sell Liquidity| x | Stop-loss clusters located above/below swings. |

---

## 5. Design Principles
1. **Resultant Coloring**: All MSS and Structural signals are colored according to the *target* trend they suggest, not the previous trend.
2. **Transparent Tooltips**: For objects like Boxes and Lines (which don't support tooltips in Pine Script), a standard `style_none` label is used at the anchor point to provide educational hover data.
3. **Double vs Single Arrows**: Reversals are denoted with "Impact" icons (⇑/⇓) while continuations use standard arrows (↑/↓).
