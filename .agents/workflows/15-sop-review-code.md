# SOP: Review Code

Goal: perform mandatory pre-ship review before claiming completion.

## Checklist

1. Scope correctness
- Change matches approved spec only.
- No unrelated edits.

2. Build version discipline
- Hardcoded version vars bumped when logic changed.
- Versions reported in final response are exact in-file values.

3. Syntax & safety
- Run syntax/build checks for touched runtimes.
- Confirm no missing braces/imports/undefined references.

4. Rules compliance
- `.agents/rules.md` constraints respected.
- Tracker files updated (sprint/changelog/bugs/backlog as needed).

5. Deploy readiness
- Explicit test/deploy commands prepared.
- Rollback path understood for risky infra/backend changes.
