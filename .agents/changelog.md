# Changelog

*(A strict append-only log of what was completed, with dates, module, and author)*

## 2026-04-15
- [x] [11:25] [.agents] [Author: Gemini] Refactored legacy `roadmap.md` into segmented Sprint/Backlog/Bugs/Changelog system using Markdown Kanban SOPs.
- [x] [09:00] [.agents] [Author: Gemini] Restructured `.agents/` to a flat, 4-entry-file system with minimal supporting subdirectories. Archived unused folders.
- [x] [08:50] [rules.md] [Author: Gemini] Migrated global coding constraints strictly into a single `.agents/rules.md` file.
- [x] [08:30] [GEMINI.md] [Author: Gemini] Updated root `GEMINI.md` to point strictly to the single source of truth in `.agents/rules.md`.

## 2026-04-14
- [x] [18:00] [Performance] [Author: User] Core: strategy-meta per-bar cache + reduced duplicate target lookups.
- [x] [18:00] [Performance] [Author: User] MSS: reduced duplicate strategy-meta calls in Sweep->MSS->FVG path.
- [x] [18:00] [Performance] [Author: User] SMC: invariant extraction in add-entry loop.
- [x] [17:00] [EntryModel] [Author: User] Added shared-shape local dynamic config/checker methods in Core/SMC/MSS.
- [x] [17:00] [EntryModel] [Author: User] Wired model-level RR/risk/bias checks through config bridge from legacy Trade Config.
- [x] [16:00] [EntryModel] [Author: User] Replaced bridge defaults with per-model config maps (Core/SMC/MSS). Added tokenized `required_previous_events` parser + per-model lookback window.
- [x] [14:00] [EntryModel] [Author: User] Extended `EntryModelDef` with dynamic trade fields and moved defaults into model init entries. Replaced switch-based config with schema lookup.
- [x] [11:00] [Dashboard] [Author: User] Enabled SMC realtime intrabar execution (`calc_on_every_tick = true`) so dashboard updates do not wait for candle close.
