# SOP: Handoff & Session Pause

**Goal:** A critical procedure used when the AI hits a token limit, gets stuck in a loop, or needs to cleanly end the session so a subsequent AI or the human can resume flawlessly.

## 1. Assessment
- Identify exactly what was completed in the current phase.
- Identify exactly what line of code or logic remains blocked.

## 2. Update Worklog
- Open `.agents/worklog.md`.
- Add a new timestamp block describing the exact technical threshold reached.
  - Example: *Stopped halfway through `TVBridgeEA` order update. Successfully caught `ORDER_ADD` but need to finish `ORDER_DELETE` state mappings.*

## 3. Prepare the Prompt
- Output a compact paragraph inside the chat that the User can simply copy/paste to the next AI agent or into the new chat window.
- The prompt MUST say: *"Resume work from session YYYY-MM-DD. Read `.agents/worklog.md` to see where we left off. The current priority is to finish X."*

## 4. Graceful Exit
- Output the `## ✅ Done` and `## 🔜 Remaining` blocks, clearly stating that context limits have been reached and a handoff is required.
