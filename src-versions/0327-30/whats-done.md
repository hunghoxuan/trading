# 0327-30

## Done
- Fixed SMC compile error at line ~762: removed early-scope dependency on runtime `htf1/htf2` in `add_htf_pdarray_if_valid()`.
- Proactively fixed same early-scope pattern in `draw_data_htf_pdarray_set()` (line ~1641).
- Both places now resolve TF names via local `CORE.get_htf_pair()`.
- Updated SMC header to `@file-version: 0327-30`.

## Changed files
- Hung - SMC.pine
