# Major Update Summary

- Date: 2026-02-27
- Area: Pine token-budget mitigation (dashboard plumbing)
- Backup before change: `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_231645_v2.6.3_backup_and_continue`

## What changed
- Refactored `create_dashboard_bias(...)` to remove very large argument list and consume already-computed global bias/timeframe series (`b0..b3`, `s0..s3`, `f0..f3`, factor values per TF).
- Kept only compact signal-confluence inputs in `create_dashboard_bias(...)`.
- Simplified `get_bias_tooltip_detailed(...)` signature by removing unused parameters.
- Updated dashboard callsite accordingly.
- Updated source trace header to `@version: 2.6.1` with latest backup reference.
- Updated roadmap tracking with a dedicated completed step for this refactor.

## Why
- TradingView compile token limit exceeded (`80484 > 80000`).
- This change targets token-heavy parameter plumbing first while keeping logic and chart behavior stable.

## Next
- Re-test compile token count in TradingView.
- If still above limit, apply next reductions on repeated tooltip text construction and non-critical legacy branches.
