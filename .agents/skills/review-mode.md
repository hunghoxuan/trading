# Review Mode

Use this mode for code audits, quality control, and ensuring consistency with the project's Source of Truth.

## Request Template

```text
Mode: Review
Scope: (Files or PR link)
Risk Focus: (Security, Performance, Logic, or Styling)
Depth: quick (surface) / normal (logic) / deep (security/perf)
```

## Implementation Flow

1.  **Context Alignment**:
    - Read the corresponding Feature Doc in `.product/features/`.
    - Verify if the code matches the intended user flow and requirements.
2.  **Technical Audit**:
    - **Logic**: Check for race conditions, error handling, and edge cases (e.g., missing API keys).
    - **Consistency**: Ensure variable naming and architectural patterns match `server.js` standards.
    - **Security**: Look for leaked secrets, unprotected endpoints, or SQL injection risks.
3.  **Performance Analysis**:
    - Check for inefficient DB queries or excessive blocking operations.
    - Verify caching utilization (`StateRepo`).
4.  **Feedback Report**:
    - Group issues by "Critical", "Warning", and "Nitpick".
    - Provide exact code snippets for suggested improvements.

## Rules
- **Be Objective**: Judge against the established project rules in `.agents/rules/`.
- **Suggest, Don't Command**: Present improvements as "Recommended" unless they violate a mandatory Rule.
