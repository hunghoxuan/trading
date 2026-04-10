0331-16

- Reverted `ENTRY_REQUIRE_NEXT_BAR` back to `true` in `Kit - Core`.
- Restored `KitCore` import/version alignment to `KitCore/15` in all three `Hung-*` files.
- Kept only requested strategy-def configuration changes:
  - `risk_zone_pct = 0.0`
  - `entry_point = "edge"`
  in Core, MSS, and SMC entry models.
