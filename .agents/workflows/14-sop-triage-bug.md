# SOP: Triage Bug

**Goal:** Correctly intake, document, and prepare a plan for any user-reported or AI-discovered insect/bug before writing a single line of code.

## 1. Reproduce Mentally
- Review the user's report or the stack trace.
- Immediately identify which module (Postgres, Webhook, MT5 EA, PineScript) is failing.
- Check `webhook/README.md` or `.agents/architecture.md` if you are unsure of the data flow.

## 2. Document the Bug
- Open `.agents/bugs.md`.
- Prepend the new bug to the `## Open Bugs` section.
- Format: `- [ ] [SEV:P0|P1|P2] [STATUS:OPEN] [Module] Bug description. [Author: ...]`.

## 3. Plan the Fix
- Isolate the single file generating the issue.
- Propose the exact line/block fix to the user, identifying if it's a logic error, syntax error, or environment mismatch.
- DO NOT start replacing file contents until you understand exactly why the current system failed.

## 4. Move to Execution
- Once the plan is approved, follow `12-sop-execute-code.md`.
