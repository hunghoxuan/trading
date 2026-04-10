# 0326-38 - MSS Dashboard Bias Row

## Completed
- Added bias row rendering to MSS dashboard:
  - `UI.draw_bias_row_under_trades(signalStatsTableBottomCenter, 23, chartCtx, THEME, SETTINGS, CONST)`
- Expanded MSS dashboard table rows to reserve bias row space:
  - `table.new(..., 5, 24, ...)`
- Updated MSS header to `@file-version: 0326-38`.
- Synced `MASTER_PLAN_STATUS.md` MSS head to `0326-38`.

## Confirmed Mapping (UI kit)
- Background color: bias strength (`ctx.b* / ctx.s*`), fallback to MS trend color when bias is neutral.
- Arrow/symbol text: MS trend direction (`ctx.dir*`), not bias direction.

## Next Actions
1. Compile `Hung - MSS` from version `0326-38`.
2. Visual check: bias row appears at bottom with proper background and arrow.
3. If bạn muốn arrow = bias thay vì trend, pass tiếp theo mình tách option trong UI kit.
