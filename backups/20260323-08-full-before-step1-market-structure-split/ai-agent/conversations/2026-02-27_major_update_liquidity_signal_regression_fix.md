# Conversation Summary - 2026-02-27 (Liquidity Signal Regression Fix)

## Problem
- User reported no Buy/Sell sweep signals and missing liquidity sweep lines.

## Analysis
- Signal path existed but liquidity confirmation had drifted from legacy behavior due unified detection coupling.
- Additional risk of line-object starvation with low max line budget.

## Fix
- Reverted liquidity sweep confirmation to legacy close-based checks.
- Increased line budget (`max_lines_count`) to 500.

## Backup Before Edit
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_121800_v1.1.6_restore_liquidity_legacy_confirm_pre_refactor`
