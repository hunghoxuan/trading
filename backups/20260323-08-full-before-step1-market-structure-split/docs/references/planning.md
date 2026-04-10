# Project Planning

## Current Status
- **Order Blocks:** LuxAlgo logic implemented (Support/Demand). 
- **High Volume S&R:** ChartPrime logic implemented (Dotted Lines for Support).
- **Liquidity:** LuxAlgo logic implemented (Buyside/Sellside/Voids).
- **FVG:** Basic FVG implemented.
- **Market Structure:** ZigZag/ChoCH implemented.

## Roadmap & Improvements

### 1. Inversion Fair Value Gaps (IFVG) - **RECOMMENDED**
- **Concept:** When price closes through an FVG, it flips polarity (Support becomes Resistance).
- **Value:** High-probability entry model for continuations.
- **Implementation:** Modify FVG logic to track "broken" gaps and redraw them as Inversion Zones instead of deleting them.

### 2. Code Consolidation (Merged OB Logic) - **COMPLETED**
- **Issue:** Previous versions had two separate Order Block implementations.
- **Action:** Merged UAlgo detection logic into LuxAlgo structure.
    - Unified `ob` object structure.
    - Added `mitigated` state to track visited OBs without breaking them.
    - Implemented `add_ob_safe` to prevent overlapping OBs.
    - Removed redundant global arrays.

### 3. Liquidity Breadcrumbs (Sweep Markers)
- **Concept:** Leave a visual marker (e.g. "x") where a Liquidity Box was swept/broken.
- **Value:** Helps visualize past "Stop Runs" or SFP signals.

### 4. Trendline Liquidity
- **Concept:** Identify 3+ touch trendlines that generate liquidity.
- **Value:** Anticipate explosive moves through these lines.

### 5. Silver Bullet Zones
- **Concept:** Highlight specific time windows (10-11 AM, 2-3 PM NY).

## Next Step
I recommend implementing **Inversion FVGs** and removing the **Redundant OB Code**.
