# Major Update Summary (2026-02-28)

## Scope
- Continue after HTF extension fix.
- Add extension controls in settings and improve mitigated zone visual distinction.

## Backups
- `/Users/macmini/Trade/Bot/Hung Bot/backups/ict_smc [hung].pine.bak_20260228_175331_pre_extension_inputs_and_mitigated_visuals`

## Implemented
1. Extension model became user-configurable via settings:
   - `Ext HTF`
   - `OB/RJB`
   - `HTF > Local`
   - `Power Low %`, `High %`, `Max`
2. Added zone background controls:
   - `Zone BG Normal`
   - `Mitigated`
3. Replaced hardcoded extension constants with input-driven values in:
   - `get_zone_type_extend_bonus(...)`
   - `get_zone_power_extend(...)`
   - `get_zone_extend_bars(...)`
4. Mitigated zone state styling updated:
   - darker neutral background
   - neutral border color
   - neutral label text color
5. Safety guard:
   - power thresholds are normalized internally (`min/max`) if user inputs are swapped.

## Trace
- Header bumped to `3.3.0`.
