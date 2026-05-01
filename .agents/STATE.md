# STATE (Compiled Snapshot)

Purpose: fast, current context for AI/human startup. Keep short.

## Current Sprint Focus
- Source: .agents/plans/sprint.md
# Active Sprint

## Sprint Goal
Achieve 100% synchronization reliability between MT5 and VPS to eliminate "Ghost Trades" and "LOCKED" deadlocks.

## Currently Doing
- [x] [2026-04-20 13:35] [Scripts/AI] [Author: Gemini] Task: Implement Multi-Model AI CLI Gateway. support `--project` and `--context`.
- [x] [2026-04-28 19:30] [Architecture/Cache] [Author: Gemini] Task: Migrating Cache Management Infrastructure & Intelligent Market Cache.
- [x] [2026-04-29 07:55] [Architecture/Cache] [Author: Gemini] Task: Stabilizing StateRepo Cache Infrastructure & Thundering Herd Protection.
- [ ] [2026-04-20 13:58] [Web-UI/AI] [Author: User] [DOING: Gemini] Task: AI Agent Hub Page. Implement template management and signal import.
- [ ] [2026-04-14 15:00] [Hung - Core] [Author: User] Task: Audit and reduce non-essential gate/score/limitation branches. (`P0`)

## Up Next
- [ ] [2026-04-15 12:25] [Infra/Deployment] Task: SSL/TLS and HTTPS Enforcement.
- [ ] [2026-04-15 16:30] [Architecture] Task: Dashboard Phase-2 (Account Balance/Equity Cards).
- [ ] [2026-04-17 21:12] [Architecture/DB/API/Web-UI] [Author: Codex] [TODO: Codex] Task: Plan and stage Execution Hub V2 migration.

## Active Blockers
- Source: .agents/plans/bugs.md + latest worklog
# Known Bugs

*(Format: `- [ ] [YYYY-MM-DD HH:MM] [SEV:P0/P1/P2] [STATUS:OPEN/IN_PROGRESS/BLOCKED/DONE] [Module] [Author: User|Gemini|Codex] Bug: description`)*

*(No active bugs reported at this time)*

## Latest Decisions
- Source: .agents/wiki/decisions/
20260325-gate-inventory-v1.md
20260325-signal-event-semantics-v1.md
20260326-trend-priority-entry-gate.md
20260326-ui-trade-model-notes.md
20260326-wave1-cut2-confluence.md

## Deploy / Version Status
- SERVER_VERSION: v2026.05.01 10:17 - 4fe585a
- EA_BUILD_VERSION: v2026.05.01 10:17 - 4fe585a

## Open Risks
- Check top open bugs and unresolved sprint TODOs.

## Last Build
- Timestamp: 2026-05-01 11:11:59 UTC
- Builder: scripts/build_state_snapshot.sh

## Recent Worklog Tail
  - Verify whether RTK is configured as an automatic hook.
  - Reduce token usage by enforcing repo-level token rules.
- **Work Accomplished**:
  - Confirmed `rtk` is installed and active (`/opt/homebrew/bin/rtk`, version `0.38.0`), with measured savings via `rtk gain`.
  - Confirmed no active git hook uses `rtk` (`.git/hooks` contains only sample hooks).
  - Added mandatory token rule file:
    - `/Users/macmini/Trade/Bot/trading/.agents/rules/token.md`
  - Updated rules index to include token rules:
    - `/Users/macmini/Trade/Bot/trading/.agents/rules.md`
- **Technical Decisions**:
  - Enforce token discipline through `.agents/rules` so all model entry files inherit same behavior through bootstrap routing.
- **Verification**:
  - `rtk which rtk`
  - `rtk --version`
  - `rtk gain`
  - `rtk ls -la .git/hooks`
- **Deploy Status**:
  - Not deployed.

# Session Log: 2026-05-01 12:52
- **Starting Task**:
  - Introduce additional CLI tools and installation flow that combine with RTK for token savings and higher AI/operator efficiency.
- **Work Accomplished**:
  - Added installer script: `/Users/macmini/Trade/Bot/trading/scripts/install_token_toolchain.sh`
  - Added toolchain guide: `/Users/macmini/Trade/Bot/trading/.agents/knowledge/token-efficient-toolchain.md`
  - Extended token rules in `/Users/macmini/Trade/Bot/trading/.agents/rules/token.md` with preferred command matrix (`rtk rg`, `rtk fd`, `rtk jq`, bounded reads, delta diff).
- **Technical Decisions**:
  - Use one install script for macOS/Linux package bootstrap.
  - Keep rule-level guidance short and detailed examples in knowledge docs.
- **Verification**:
  - `rtk bash -n scripts/install_token_toolchain.sh` ✅
  - File presence checks via `rtk ls -la` ✅
- **Deploy Status**:
  - Not deployed.

# Session Log: 2026-05-01 13:02
- **Starting Task**:
  - Reconstruct second-brain structure using Caveman + raw/wiki/rules model.
  - Rename `.agents/knowledge` to `.agents/wiki`.
  - Add state compiler file and script.
