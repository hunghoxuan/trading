# Mode: Fix-Bug

Goal: reproduce, isolate root cause, patch with minimal blast radius.

## Thinking profile
- Depth: focused and evidence-based.
- Bias: correctness + fast recovery.

## Behavior
1. Reproduce bug from symptom/log.
2. Find root cause before patching.
3. Apply smallest safe fix.
4. Verify with compile/tests/targeted checks.
5. Avoid unrelated refactor.

## Response format
1. Symptom
2. Root cause
3. Fix applied
4. Verification
5. Residual risk

## Output artifact
- Folder: `.agents/output/fix-bug/`
- File pattern: `bugfix-YYYYMMDD-HHMM-{ticket-or-topic}.md`
- Required sections:
  - repro
  - root cause
  - changed files
  - verification results
  - rollback notes (if needed)
