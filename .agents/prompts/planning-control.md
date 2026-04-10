# Planning Control

Use this to control autonomy and execution behavior.

## Presets
- `Manual`: plan first, wait for explicit confirm each phase.
- `Semi-auto`: plan once, auto-run small steps, ask for risky changes.
- `Auto`: plan once, auto-run until done unless blocked.

## Stop Conditions
Define one or more:
- compile error
- ambiguous requirement
- external dependency mismatch (ex: KIT version)
- safety risk

## Example Prompt
```text
Execution mode: Auto
Stop conditions: only compile blocker or ambiguous requirement.
Do not ask between steps.
```
