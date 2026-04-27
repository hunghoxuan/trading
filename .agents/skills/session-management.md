## 1. Updating the Worklog (Handoff)
At the end of every significant task or before a session reset (token clearing), the agent MUST update `.agents/worklog.md`.

**Equivalent Actions/Terms**:
- "Update the worklog for handoff" / "Handoff"
- "Save session context" / "Save context"
- "Summarize for reset"
- "End session"

### Format of `worklog.md`:
```markdown
# Session Log: [YYYY-MM-DD HH:MM]
- **Conversation ID**: [ID]
- **Work Accomplished**:
  - [Item 1]
  - [Item 2]
- **Pending Tasks / Backlog**:
  - [ ] [P0] [Task A]
  - [ ] [P1] [Task B]
- **Key Decisions/Changes**:
  - [Decision 1]
```

## 2. Resuming Context (Refresh)
When a new conversation starts, the agent MUST follow the sequence below.

**Equivalent Actions/Terms**:
- "Read the worklog and resume" / "Resume"
- "Refresh context"
- "What was I doing?" / "Pick up where we left off"

### Sequence:
1.  Read `.agents/README.md` to identify core files.
2.  Read `.agents/worklog.md` to see where the last session ended.
3.  Read `.agents/plans/sprint.md` or `.agents/plans/backlog.md` if the task is part of a larger plan.
4.  Confirm the starting point with the USER.

## 3. The `/rewind` Action
If the user says `/rewind` or "Undo last change":
- **Code**: Use `git checkout [file]` or `git revert` to undo the last committed change.
- **Context**: Re-read the worklog *before* the last entry to "forget" the current failed path.
- **Logic**: Acknowledge the rollback and propose a different approach.

## 4. Tool usage for Worklog
Always use `write_to_file` (for new log entries) or `replace_file_content` to keep the worklog clean and ordered by most recent first.
