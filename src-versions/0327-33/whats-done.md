# 0327-33

## Done
- Fixed working-first debug-line semantics and visuals in both SMC and MSS.
- Enforced ordering guard for debug start times:
  - LTF must be nearest current bar.
  - HTF1 cannot be to the right of LTF.
  - HTF2 cannot be to the right of HTF1.
- Updated debug line style for all 3 lines (LTF/HTF1/HTF2):
  - style: dotted
  - width: 1px
- Updated LTF working line color to LTF color (`uiCfg.ltfColor`) instead of UI accent.
- File headers updated:
  - SMC -> `@file-version: 0327-33`
  - MSS -> `@file-version: 0327-31`

## Changed files
- Hung - SMC.pine
- Hung - MSS.pine
