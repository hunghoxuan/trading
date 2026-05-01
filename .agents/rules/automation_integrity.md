# Rule: Automation & Skill Mining

## Constraint
Repetitive manual effort is a system failure. Automate patterns into Skills.

## Requirements
- **The Power of Two**: If a specific task, workflow, or complex command is asked for a second time, you MUST automatically create a new Skill file in `.agents/skills/` to codify that process.
- **Skill Discovery**: Actively look for patterns in the current session history that could benefit from a step-by-step playbook.
- **Atomic Steps**: Skills must be written as clear, step-by-step "How-To" playbooks to ensure consistent execution in future sessions.
