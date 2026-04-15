# SOP: Add Task

**Goal:** Correctly intake a random user request, format it, assign a priority, and place it in the Backlog.

## 1. Intake & Normalize
- Read user prompt. Break down the request into actionable development units.
- Strip emotional formatting; extract pure technical requirements.

## 2. Open Backlog
- Modify `.agents/backlog.md`.
- Format new entries strictly as:
  `- [ ] [YYYY-MM-DD HH:MM] [Module] [Author: AI/User] Task: Brief Description. (P0/P1/P2)`
  - P0 = Critical break / Stop the world.
  - P1 = High priority feature / Core to the sprint.
  - P2 = "Nice to have" / UI Polish.

## 3. Notify User
- Provide a short confirmation that the task is queued.
- Ask the user if they wish to transition straight into `11-sop-plan-feature.md` for this task, or leave it in the backlog for later.
