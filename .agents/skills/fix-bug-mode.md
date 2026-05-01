# Fix-Bug Mode

Use this mode for rapid troubleshooting, root cause analysis, and surgical hotfixes.

## Request Template

```text
Mode: Fix-Bug
Symptom/error: (Paste error log or describe behavior)
Repro steps: (How can I see it happening?)
Expected vs actual:
Suspected files:
Urgency: low/med/high/CRITICAL
Can refactor? yes/no
```

## Operational Rules

1.  **Reproduce First**: Never fix a bug without first reproducing it or finding the exact line in the logs.
2.  **Surgical Fixes**: Minimize changes. Avoid unrelated refactoring unless "Can refactor" is yes.
3.  **Check the Source**: Always check the `logs` table in PostgreSQL for the full context of failures.
4.  **No New Regressions**: Run existing checks on all touched modules.

## Implementation Flow

1.  **Investigation**: 
    - Search `.agents/.product/` to understand the intended behavior.
    - Check `logs` table: `SELECT * FROM logs WHERE ... ORDER BY created_at DESC`.
    - Grep codebase for the error string or failed function.
2.  **Reproduction**:
    - Create a minimal reproduction script in `scratch/repro_<issue>.js`.
    - Run it to confirm the bug exists locally.
3.  **The Fix**:
    - Apply the fix to the identified files.
    - If UI bug: Verify styles and responsiveness.
    - If API bug: Verify payload structures and status codes.
4.  **Validation**:
    - Run the reproduction script again.
    - Run `node --check webhook/server.js` (backend) or `npm run build` (UI).
5.  **Documentation**:
    - Update `.agents/worklog.md` with the fix details.
    - If a feature's behavior changed permanently, update the Feature Doc in `.product/features/`.

## Critical Logs to Check
- **Backend**: `pm2 logs webhook` or search the `logs` table for `error` severity.
- **Database**: `logs` table (System Events), `trades` table (Execution Failures).
- **Network**: Check the `/health` endpoint of the service.
