# Conversation Summary - 2026-02-27 (Signal Visibility Hotfix)

## Problem
- User reported missing Buy/Sell sweep signals.

## Root Cause
- `addSignal(...)` was incorrectly gated by `showAuxiliaryIcons` during label-budget cleanup.

## Fix
- Removed `showAuxiliaryIcons` dependency from `addSignal(...)`.
- Signals now follow only signal conditions and lookback gating.

## Backup Before Edit
- `/Users/macmini/Trade/Bot/Hung Bot/backups/_2_ICT-SMC-PA All-in-one2.pine.bak_20260227_121000_v1.1.5_restore_signal_labels_pre_refactor`
