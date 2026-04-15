# SOP: Context Refresh (Amnesia Recovery)

**Goal:** Provide a strict procedure for an AI agent to completely reload and synchronize its understanding of project rules, architecture, and current state when the human user commands "Refresh Context" or when the agent detects it is violating constraints.

## 1. Purge Assumptions
- Instantly drop any assumptions about how the trading bot works based on your initial pre-training. You are in a heavily custom, constraint-driven environment.

## 2. Walk the Boot Chain
You MUST read the following files sequentially to rebuild your context graph:
1. Read `.agents/README.md` (To understand where you are).
2. Read `.agents/rules.md` (To memorize the absolute coding logic laws, architectural boundaries, and SOP requirements).
3. Read `.agents/sprint.md` (To remember exactly what tasks are currently active and who owns them).
4. Read `.agents/sync/MAILBOX.md` (To see if you missed an incoming relay).

## 3. Reload Deep Knowledge
- If you were working on a specialized component (e.g., MT5 EA, React Dashboard, PineScript), use the `list_dir` tool or equivalent to check `.agents/knowledge/` and explicitly re-read any relevant markdown memos. NEVER assume you remember the MT5 or PineScript quirks.

## 4. Acknowledge the Sync
- Do NOT generate code immediately after a context refresh.
- Respond to the user stating: *"Context Refreshed. I have synchronized my session with the latest Project Rules and Sprint."* 
- Briefly list the 2 or 3 most critical constraints governing your active file to prove you actually read the rules.
