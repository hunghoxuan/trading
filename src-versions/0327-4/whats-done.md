# Version 0327-4 - Bias Tooltip State Clarity

## Done
1. Updated file headers:
- Hung - Core.pine -> @file-version: 0327-4
- Hung - SMC.pine -> @file-version: 0327-4
- Hung - MSS.pine -> @file-version: 0327-4

2. Tooltip state classification added in Bias row (Core/SMC/MSS):
- Continuation: trend and short-bias align.
- Pullback: trend and short-bias oppose.
- Neutral: one side is neutral.

3. Preserved semantics:
- BG color source remains trend (`ctx.dir*`).
- Symbol/arrow source remains short-bias (`ctx.b*`).
- Arrow color-by-direction from 0327-3 kept unchanged.

4. Status sync:
- Updated `MASTER_PLAN_STATUS.md` with one-pass `0327-4` and current src heads.

## Why
- Make trend-vs-bias relation explicit in tooltip with zero extra chart objects and minimal runtime overhead.

## Test focus
1. Compile Core/SMC/MSS.
2. Hover BIAS cells and verify State text changes correctly among Continuation/Pullback/Neutral.
3. Confirm BG and symbol behavior unchanged from 0327-3.
