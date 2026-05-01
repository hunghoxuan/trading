# Brainstorm Mode

Use this mode for open-ended ideation, exploring technical alternatives, and assessing feasibility.

## Request Template

```text
Mode: Brainstorm
Problem: (The challenge we are trying to solve)
Constraints: (Tech stack, time, budget, or logic limits)
Goal: (Optimize for speed/quality/simplicity)
Output: (Comparison table / Recommendation / Sketch)
```

## Implementation Flow

1.  **Divergent Thinking**:
    - List at least 3 distinct technical approaches (e.g., Simple vs. Scalable vs. Experimental).
    - Look for inspiration in existing repo patterns (check `.agents/.product/architecture/`).
2.  **Feasibility Check**:
    - For each option, check if the required libraries or APIs (e.g., TwelveData, MT5) support it.
    - Analyze performance impact (e.g., event loop blocking in `server.js`).
3.  **Comparison**:
    - Create a "Pros vs. Cons" or "Trade-offs" table.
    - Evaluate complexity vs. maintenance cost.
4.  **Recommendation**:
    - Select the best path based on the user's "Goal".
    - Outline a "Quick Win" vs. "Long Term" path if applicable.

## Rules
- **No Coding Yet**: Focus on architectural logic and data flow.
- **Cross-Model Logic**: If helpful, simulate how different LLMs (Gemini vs. Claude) might handle the logic.
