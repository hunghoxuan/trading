# Conversation Summary - 2026-02-27 (Label Budget Priority Fix)

## Problem
- BOS/MSS labels disappeared despite structure logic being intact.

## Likely Cause
- Label budget starvation (`max_labels_count` + many auxiliary labels/icons).

## Fix Applied
- Increased `max_labels_count` to 500.
- Added `showAuxiliaryIcons` toggle.
- Gated non-structure labels/icons (tooltip labels, PPDD/stack, VWAP/RSI icons, divergence labels, trendline tooltip labels).

## Backup Before Edit
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_121200_v1.1.3_label_budget_priority_fix_pre_refactor`
