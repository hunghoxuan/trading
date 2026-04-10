# Mode: Continue Previous Conversation

Goal: resume unresolved work from a prior chat with minimal re-explanation.

Rules:
1. Rebuild context first, then code.
2. Read latest snapshots before making changes:
   - `src-versions/` (latest `MMDD-{index}` folders)
   - latest `whats-done.md`
   - `.agents/roadmap/ACTIVE_SPRINT.md`
   - `.agents/roadmap/MASTER_PLAN.md`
3. Produce a short resume brief at:
   - `.agents/output/continue-context/resume-YYYYMMDD-HHMM.md`
4. Resume execution in one-pass style:
   - implement
   - verify/compile
   - snapshot new version
5. After each pass, report:
   - Completed
   - Next actions
   - Exact file(s) to test
6. Do not add new settings/config fields/constants unless user explicitly approves.
