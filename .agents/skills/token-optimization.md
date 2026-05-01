# Skill: Token Optimization

Use this skill to minimize token usage during agent interactions while maintaining high context accuracy.

## Operational Rules

1.  **Atomic Reads**: Only read the lines of a file that are relevant to the task (use `StartLine`/`EndLine`).
2.  **Cached Context**: Reference the `.agents/` docs instead of re-discovering system facts.
3.  **No Redundancy**: Avoid repeating large code blocks in responses.
4.  **RTK First**: Always use `rtk` wrapped commands to leverage token savings.

## Implementation Flow

1.  **Grep First**: Use `grep` or `rtk find` to locate exact code positions before reading files.
2.  **Minimal View**: Use `view_file` with narrow ranges (e.g., +/- 10 lines of the target).
3.  **Summary Mapping**: When summarizing, focus on "What changed" and "Why", not "How every line works".
4.  **State Management**: Update `STATE.md` to avoid re-investigating the same system state in the next turn.

## Verification Checklist
- [ ] `rtk gain` shows >60% savings.
- [ ] Response is concise and actionable.
- [ ] No redundant file reads performed.
