# Signal Visual Language

> **Last updated:** 2026-03-10
> **Applies to:** Hung - Indicators.pine, Hung - ICT SMC Zones.pine, Hung - Candle Patterns.pine

---

## Overview

All visual signals across the indicator suite follow a strict **3-tier hierarchy**.
Each tier has a distinct visual identity, purpose, and information density.

---

## Tier 1 — Context Marker (Informational)

> "*Something happened — be aware.*"

| Property | Value |
|----------|-------|
| Style | `label.style_none` (no background box) |
| Size | `size.tiny` |
| Color | Bullish teal / Bearish red / Neutral gray — text only |
| Background | Fully transparent |
| Tooltip | Rich tooltip on hover with full context |

**Used for:**
- Divergence arrows (⇑ ⇓ ↑ ↓)
- VWAP cross events
- RSI trend zone events
- Candle pattern ▲/▼ markers (when NOT promoted to Tier 2)
- HVB (High Volume Bar) markers

**Rule:** Tier-1 is **suppressed** when a Tier-2 signal fires on the same bar for the same pattern.
This prevents double-marking of the same candle pattern.

---

## Tier 2 — Strategy Signal (Actionable Alert)

> "*A strategy condition is met + bias aligned — worth acting on.*"

| Property | Value |
|----------|-------|
| Style | `label.style_label_up` / `label.style_label_down` (filled arrow shape) |
| Size | `size.tiny` |
| Color | Solid green fill (Buy) / Solid red fill (Sell), white text |
| Position | Below bar (Buy) / Above bar (Sell) |
| Tooltip | Setup name + reason + score |

**Short codes displayed in arrow:**

| Code | Strategy |
|------|----------|
| `✓` | Confluence (multiple strategies aligned) |
| `vwap` | VWAP + EMA Cross |
| `stoch` | EMA Pullback + Stochastic |
| `bb` | EMA200 + Bollinger Bands Squeeze |
| `ichi` | Ichimoku + MACD Flip |
| `fib` | Fibonacci Pullback |
| `div` | SMA200 + Divergence |
| `adx` | ADX + EMA Cross |
| `◈` (`THEME.SYM_DIAMOND`) | Candle Pattern bias alignment |
| `gdc` | Golden/Death Cross |
| `rsi` | TPG RSI Scalping |

**Icon choice rationale for Candle Pattern (`◈` = `THEME.SYM_DIAMOND`):**
- `◈` (diamond with inner dot) — visually represents "a specific pattern was detected inside this candle"
- Compact, unique, does not conflict with any other code
- Defined in `TradingKit.Theme` as `SYM_DIAMOND` — use `THEME.SYM_DIAMOND` in code, never hardcode the character

**Other available `THEME` symbols for future use:**

| Constant | Symbol | Suggested use |
|----------|--------|---------------|
| `THEME.SYM_DIAMOND` | `◈` | Candle pattern signal |
| `THEME.SYM_DIAMOND_SMALL` | `◇` | Weak/low-score pattern |
| `THEME.SYM_STAR` | `★` | Top-tier confluence |
| `THEME.SYM_STAR_SMALL` | `☆` | Watch list |
| `THEME.SYM_TARGET` | `🎯` | TP level reached |
| `THEME.SYM_STOPLOSS` | `🛑` | SL level hit |
| `THEME.SYM_VERTICAL_BAR` | `▮` | Candle/bar reference |
| `THEME.SYM_CIRCLE` | `⊙` | Zone retest / pivot |

**Rule:** Only fires on **confirmed bars** (`barstate.isconfirmed`).
The best signal per bar wins (highest score → highest effectiveness → first registered).

---

## Tier 3 — Trade Entry (Active Position)

> "*A zone confirmed — enter with defined risk.*"

| Property | Value |
|----------|-------|
| Style | Horizontal box (TP zone teal / SL zone red) + entry line |
| Size | Full-width from entry bar, extended N bars right |
| Color | Teal = TP zone, Red = SL zone |
| Labels | Buy/Sell text, RR value |
| Indicator | `Hung - ICT SMC Zones.pine` only |

**Used for:**
- ICT Order Block retests
- Breaker Block retests
- FVG fill entries
- Sweep + reclaim entries

**Rule:** Only drawn when a zone is actively retested **and** signal entry mode is enabled.
Lifecycle: `START` → `TP HIT` or `SL HIT`.

---

## Deduplication Logic

```
Same bar evaluation order:
  1. cp_detect() → cpPatScore, cpAggBias (computed early)
  2. process_bias_stack() → compositeBias (computed mid-file)
  3. cpTier2WillFire = cpPatScore >= 3 AND bias allows direction
  4. if cpTier2WillFire → only Tier-2 fires (◈ arrow)
     else               → Tier-1 fires (▲/▼ no-bg marker)
```

This ensures every candle pattern shows **exactly once** on the chart —
either as a lightweight context marker (weak/misaligned patterns),
or as a full strategy signal arrow (strong + bias-confirmed patterns).

---

## Design Principles

1. **One signal per bar, one tier wins** — no stacking of Tier-1 and Tier-2 on the same bar for the same source.
2. **Tiers escalate with confidence** — weak context → strong actionable → active trade.
3. **Tooltip is the detail layer** — labels stay minimal (icon/code only); all reasoning lives in the tooltip.
4. **Indicators own their tier** — Hung-Indicators owns Tier 1+2; Hung-ICT owns Tier 3 exclusively.
