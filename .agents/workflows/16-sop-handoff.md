# SOP: Agent Handoff & Session Pause (MAILBOX PROTOCOL)

**Goal:** A strictly asynchronous procedure used when an AI agent needs to hand off execution to another specialized AI agent (e.g. Gemini passing to Codex), or hits a context limit.

## 1. Prepare Tracking Documents
- Ensure `.agents/sprint.md` correctly reflects what you've done.
- Unfinished tasks remain marked `[DOING]`.

## 2. Generate Mailbox Payload
- Open `.agents/sync/MAILBOX.md`.
- Completely replace its contents with a highly detailed prompt targeting the next assigned agent. It MUST contain:
  1. **Greeting/Context:** "Hello [TargetAgent]. Resume from [Date]. [SourceAgent] has completed X."
  2. **Active State:** List modified files, and what explicit APIs/logic were added that the target agent must utilize.
  3. **Directive:** Explicit instructions on what to code next (e.g., "Review your TODO in `.agents/sprint.md` Task ID FE-01 and implement it now").

## 3. Graceful Exit
- Output the `## ✅ Done` block to the human user.
- Explicitly tell the human user: *"I have placed your handoff instructions into the mailbox. Simply open the next AI window and send the prompt: 'Check the mailbox'."*
