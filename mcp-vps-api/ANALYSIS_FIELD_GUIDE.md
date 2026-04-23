# 🛡️ Trading Analysis Field Guide (Claude AI)

Use this guide to ensure high-quality analysis when using the `trading-vps-api`.

## 1. Market Structure (HTF - 1D/4H)
- **Trend**: Is it Bullish (Higher Highs) or Bearish (Lower Lows)?
- **Key Levels**: Identify the nearest Institutional Supply/Demand zones.
- **Bias**: Determine if we are looking for Buys (at discount) or Sells (at premium).

## 2. Execution Setup (LTF - 15m)
- **PD Array**: Look for Fair Value Gaps (FVG), Order Blocks, or Liquidity Sweeps.
- **Confirmation**: Wait for a Market Structure Shift (MSS) on the 15m chart.
- **Quality**: Rate the setup 1-10 based on alignment with the HTF bias.

## 3. Risk Management
- **Entry**: Point of interest or limit at FVG/OB.
- **Stop Loss (SL)**: 1 ATR beyond the swing point or structural high/low.
- **Take Profit (TP)**: 
  - TP1: 1:2 RR (Risk/Reward)
  - TP2: Next major HTF liquidity pool.

## 4. Signal Emission Rules
- **DO NOT** add a signal if the RR is less than 1.5.
- **DO NOT** add a signal if the spread or volatility is extreme.
- **ALWAYS** include a `note` explaining the technical rationale.

---

# 📝 Analysis Prompt Template

Copy and paste this when you want to start a new analysis:

```text
/analyze BTCUSD

1. Capture snapshots (15m, 4h, 1D).
2. Use the "Trading Analysis Field Guide" to perform a multi-timeframe review.
3. If a high-quality setup exists (Score > 7), calculate SL/TP and call vps_add_signal.
4. Summarize your findings in 3 bullet points.
```
