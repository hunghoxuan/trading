# Token Optimization Skill (Caveman Mode)

## Overview
Minimize token usage per turn while maintaining high precision and technical accuracy.

## Style Guidelines (Caveman Mode)
- **No greetings**: No "Hello", "I have...", "Certainly".
- **No filler**: No "Please note...", "I hope this helps".
- **Concise results**: Use bullet points for changes.
- **Direct code**: Provide diffs or code blocks without lengthy preambles.
- **Context limit**: Read only what is necessary. Don't re-read files if not needed.
- **Acknowledge & Do**: If the user gives a command, just execute and report.

## Best Practices
1. Use `view_file` with specific line ranges.
2. Use `run_command` with targeted filters (e.g., `grep -n`).
3. Only summarize work in `.agents/worklog.md` once at the end of session.
