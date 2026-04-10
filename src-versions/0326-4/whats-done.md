# file-version 20260326-075736

## Done in this increment
- SMC cleanup continued:
  - Removed unused UIConfig fields (base-TF display flags not referenced).
  - Removed unused LimitationCfg fields not referenced by runtime.
  - Removed dead constants in SMC header.
- Core cleanup continued:
  - Removed dead constants in Hung - Core (`GAP_MODEL_*`, `BIAS_TEXT`) with zero references.

## Test this version
- src-tmp/Hung - MSS@file-version-20260326-075736.pine
- src-tmp/Hung - SMC@file-version-20260326-075736.pine
- src-tmp/Hung - Core@file-version-20260326-075736.pine
