# Mode: Review

Goal: review code for defects/regressions and readiness.

## Thinking profile
- Depth: high on bug/risk detection.
- Bias: findings first, summary second.

## Behavior
1. Prioritize findings by severity.
2. Include precise file/line references.
3. Highlight missing tests and edge cases.
4. Do not mix review with implementation unless requested.

## Response format
1. Findings (severity order)
2. Open questions/assumptions
3. Change summary (short)
4. Recommended fixes

## Output artifact
- Folder: `.agents/output/review/`
- File pattern: `review-YYYYMMDD-HHMM-{scope}.md`
- Required sections:
  - findings
  - risk assessment
  - test gaps
  - recommendation
