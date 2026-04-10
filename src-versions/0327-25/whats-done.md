# 0327-25 — Debug first-working-bar columns by TF

## Completed
- Added debug vertical lines for working-start index in both indicators:
  - LTF line (existing working line)
  - HTF1 line (new)
  - HTF2 line (new)
- HTF working-first index uses ratio-based bars-back conversion:
  - `tfBarsBack = WORKING_MAX_BARS * tfSec / currSec`
  - draw at `bar_index - tfBarsBack`
- Applied to:
  - `Hung - SMC.pine`
  - `Hung - MSS.pine`
- Line colors:
  - HTF1: `THEME.COLOR_HTF1`
  - HTF2: `THEME.COLOR_HTF2`

## Purpose
- Visualize where detection windows begin for LTF/HTF1/HTF2 to debug PDArray/MSS/levels start boundaries.

## Files
- `src/Hung - SMC.pine` (`@file-version: 0327-25`)
- `src/Hung - MSS.pine` (`@file-version: 0327-25`)

## Test target
- Use files in: `src-versions/0327-25/`
