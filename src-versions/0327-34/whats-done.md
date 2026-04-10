# 0327-34

## Done
- Fixed missing debug working lines (SMC/MSS) by switching to robust per-bar line recreation.
- Working lines now use `xloc.bar_index` for all TF debug lines (LTF/HTF1/HTF2), mapped via `CORE.closest_bar_index_from_time()` for HTFs.
- Updated both line update helpers to delete old line and recreate each bar, preventing line-object aging/purge issues.
- Kept required style: dotted, 1px; LTF line keeps LTF color.
- Header versions:
  - SMC `@file-version: 0327-34`
  - MSS `@file-version: 0327-32`

## Changed files
- Hung - SMC.pine
- Hung - MSS.pine
