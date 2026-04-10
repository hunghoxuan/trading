# 0403-7

## Tick Dashboard Refresh
- Backed up `Hung - SMC` and `Hung - Core` before edits.
- Enabled `calc_on_every_tick = true` in `Hung - SMC` so dashboard/trades update intrabar.
- Kept dashboard rendering after trade processing in `Hung - Core` (explicit comment for ordering intent).
