# Line Inventory

> Update this when line styles change.

## Killzones & Structure

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 1 | KZ Top border | #5c7cfa 80% | dotted | 1 |
| 2 | KZ Bottom border | #5c7cfa 80% | dotted | 1 |
| 3 | KZ Box border | #5c7cfa 80% | dotted | 1 |

## HTF Candles

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 4 | Wick up | wickCol | solid | var |
| 5 | Wick down | wickCol | solid | var |

## Market Structure

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 6 | ZigZag | param | param | var |
| 7 | CHoCH/BoS bear | downColor 50% | dotted | 1 |
| 8 | CHoCH/BoS bull | upColor 50% | dotted | 1 |

## Liquidity (Pivot-based)

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 9 | Bearish liq | downColor | dotted | 1 |
| 10 | Bullish liq | upColor | dotted | 1 |

## Liquidity (LuxAlgo BSL/SSL)

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 11 | BSL main | _cLIQ_B | dashed | 1 |
| 12 | BSL extension | _cLIQ_B | dotted | 1 |
| 13 | SSL main | _cLIQ_S | dashed | 1 |
| 14 | SSL extension | _cLIQ_S | dotted | 1 |

## Equal Highs/Lows

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 15 | EQH connect | #f23645 red | dotted | 2 |
| 16 | EQL connect | #4caf50 green | dotted | 2 |

## FVG

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 17 | ~~FVG midline~~ | — | — | — |

> Disabled (`fvgMidlineShow = false`)

## Fibonacci

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 18 | Fibo ZZ main | up/dn col | solid | 1 |
| 19 | Fibo ZZ prev | up/dn col | dotted | 1 |
| 20 | Fibo ratios | varies | dotted | 1 |

## Trendlines

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 21 | Bearish TL | teal 35% | solid | 2 |
| 22 | Bullish TL | teal 35% | solid | 2 |

## Key Levels

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 23 | PDH | white | solid | 1 |
| 24 | PDL | white | solid | 1 |
| 25 | PWH | yellow | solid | 2 |
| 26 | PWL | yellow | solid | 2 |
| 27 | Midnight Open | orange | dotted | 1 |
| 28 | 8:30 Open | white | dotted | 1 |

## Divergence

| # | Feature | Color | Style | W |
|---|---------|-------|-------|---|
| 29 | Regular bullish | #4caf50 green | dashed | 1 |
| 30 | Regular bearish | #f23645 red | dashed | 1 |
| 31 | Hidden bullish | #4caf50 green | dotted | 1 |
| 32 | Hidden bearish | #f23645 red | dotted | 1 |

---

## Style Convention

| Style | Usage |
|-------|-------|
| solid | Primary: wicks, trendlines, PDH/PWH |
| dashed | Active levels: BSL/SSL, regular div |
| dotted | Secondary: KZ, CHoCH/BoS, extensions |
