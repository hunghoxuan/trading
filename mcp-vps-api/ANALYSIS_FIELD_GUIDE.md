# Trading Analysis Field Guide (ICT + Price Action + Market Structure)

Use this guide for snapshot-based AI analysis and signal creation.

## 1. Base Config
- Symbol: prefer `UK100` unless snapshot symbol is clearly different.
- Strategy stack: `ICT + Price Action + Market Structure`.
- Min RR: `2.0`.
- Max risk per trade: `1%`.
- Daily ADR filter: enabled (avoid unrealistic TP beyond ADR context).

## 2. Phase 1: Primary Filters
- Killzones only: London (`02:00-05:00 EST`) and New York (`07:00-10:00 EST`).
- Draw on Liquidity (DOL): map current HTF target (`PDH/PDL`, `EQH/EQL`).
- Premium vs Discount: buys in discount, sells in premium.
- SMT divergence: mark `Confirmed` or `None`.

## 3. Phase 2: Arrays and Key Levels
- PD arrays: `OB`, `FVG`, `Breaker`, `Mitigation`, `Liquidity Void`.
- Key levels: `PDH`, `PDL`, `Weekly Open`, `Midnight Open`, `ADR_High`, `ADR_Low`.
- Status labels: `active`, `tested`, `broken`.
- Include `bar_start_unix` (or `bar_start`) when available.

## 4. Phase 3: Pattern and Risk Logic
- Pattern set: `V-Shape`, `Quasimodo`, `Flag`, `Triangle`, `Pin Bar`, `Inside Bar`, `Fakey`.
- Dynamic risk guide:
  - High confluence (>85%): `1.0%`
  - Standard: `0.5%`
  - High risk: `0.25%`
- If setup quality is poor or RR < 2.0, return empty `trade_plan`.

## 5. Output Rules
- Strict JSON only.
- Keep compatibility fields used by app (`market_analysis`, `trade_plan`, `entry/sl/tp`, `rr`, `confidence_pct`).
- Prefer `trade_plan` array and rank by confidence.
