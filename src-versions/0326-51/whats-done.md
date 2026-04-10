# Version 0326-51 - Core compile hotfix

## Completed
- Fixed Core compile error:
  - `Could not find method or method reference 'direction_matches_bias' for 'CORE'`
- Replaced `CORE.direction_matches_bias(...)` usage in `CORE_check_direction_by_mode(...)` with local direction-vs-sign check.
- No behavior-model expansion in this hotfix; only compile-fix scope.

## Files changed
- `src/Hung - Core.pine`
- `MASTER_PLAN_STATUS.md`

## Test now
- `src-versions/0326-51/Hung - Core.pine`
