# AI Agent Onboarding Guide — Hung Bot

> **Read this entire file before touching any code.**
> This guide enables multiple AI agents (Antigravity, Gemini, Claude, Codex, etc.) to work on
> the same codebase without losing context or conflicting with each other.

---

## 1. What Is This Project?

**Hung Bot** is a TradingView Pine Script v5 trading system composed of:
- **3 shared KIT libraries** (`Kit - Core`, `Kit - UI`, `Kit - SMC`) published to TradingView
- **3 strategy indicator scripts** (`Hung - SMC`, `Hung - MSS`, `Hung - Core`) that import the KIT libs
- **1 combined script** (`Hung - All`) that merges all three strategies into one chart overlay

The system implements Smart Money Concepts (SMC) trading: Market Structure Shifts, PD Arrays (OBs, FVGs, SR zones), liquidity sweeps, and a prop firm risk management engine.

**Language:** Pine Script v5 — NOT JavaScript, NOT Python. Rules specific to this language apply.

---

## 2. Repository Layout

```
Hung Bot/
├── src/                        ← ALL active source code lives here (always latest)
│   ├── Kit - Core.pine         ← KIT: shared types, helpers, trade engine
│   ├── Kit - SMC.pine          ← KIT: Smart Money Concepts domain logic
│   ├── Kit - UI.pine           ← KIT: visual/UI helpers
│   ├── Hung - SMC.pine         ← Strategy: SMC PD Array entries
│   ├── Hung - MSS.pine         ← Strategy: Market Structure Shift entries
│   ├── Hung - Core.pine        ← Strategy: multi-model strategy engine
│   └── Hung - All.pine         ← Combined all-in-one overlay
├── backups/                    ← Physical backups (YYYYMMDD-index-note/)
│   └── 20260407-01-prop-risk/  ← Example backup before prop risk feature
├── src-versions/               ← Immutable snapshots for testing (MMdd-index/)
│   └── 0407-01/                ← Example version snapshot
├── indicators/                 ← Third-party reference indicators (read-only)
├── strategies/                 ← Third-party reference strategies (read-only)
├── .agents/                    ← THIS FOLDER: AI agent operating system
│   ├── SKILL.md                ← Antigravity entry point (YAML frontmatter + description)
│   ├── AGENT-ONBOARDING.md     ← THIS FILE
│   ├── 00-read-first.md        ← Startup checklist (always read before coding)
│   ├── INDEX.md                ← Index of all .agents files
│   ├── rules/                  ← Immutable technical rules
│   ├── workflows/              ← Step-by-step task workflows (slash commands)
│   ├── docs/                   ← Persistent knowledge base
│   │   ├── common-errors.md    ← Bug log — check before debugging
│   │   └── decisions/          ← Architecture decision records
│   ├── lexicon/                ← Project-specific terminology
│   ├── modes/                  ← Execution modes (one-pass, overnight, etc.)
│   ├── roadmap/                ← Active sprint and master plan
│   ├── output/                 ← Mode-specific output artifacts
│   ├── prompts/                ← Response style and planning control
│   └── templates/              ← Document templates per mode
```

---

## 3. The KIT Library System

KIT libraries are **published to TradingView** and imported by version number:
```pine
import hunghoxuan/KitUI/31      ← @lib-version: 31
import hunghoxuan/KitCore/65    ← @lib-version: 65
import hunghoxuan/KitSMC/65     ← @lib-version: 65
```

### Critical: KIT version management

| Situation | Action |
|-----------|--------|
| Adding/removing code in KIT | Increment `@lib-version` by 1 AND update all indicator `import` statements |
| Bug fix in KIT (no API change) | Do NOT bump version |
| KIT API signature changes | Confirm current version with user first (version mismatch risk) |

### KIT change policy (mandatory)

**Default: never edit KIT directly.** Always:
1. Copy the KIT method into the indicator file as a local clone
2. Name it `CORE_<method>`, `SMC_<method>`, or `UI_<method>`
3. Fix/test locally in the indicator
4. Only promote back to KIT after user confirms it works

**Exception:** User explicitly says "put it in KIT" → then direct edit is approved. Document this in your plan.

---

## 4. File Header Versioning

Every Pine source file has a version header on line 2:

```pine
//@version=5
// @lib-version: 65           ← KIT libraries use this format (integer, increments)
// @file-version: 0407-01     ← Strategy indicators use this format (MMDD-NN)
```

**Rules:**
- KIT files: `@lib-version: N`
- Strategy/indicator files: `@file-version: MMDD-NN`
- Bump appropriate header in EVERY file changed in the same task

---

## 5. Pine Script v5 — Must-Know Rules

Pine Script has unique constraints that cause silent bugs or compile errors:

### 5a. Mandatory: typed `na` for typed args
```pine
// WRONG:
some_func(na, na)
// CORRECT:
some_func(int(na), float(na))
```

### 5b. Empty if/else branches must use `bool(na)`
```pine
if condition
    do_something()
else
    bool(na)   // ← required no-op, never leave empty
```

### 5c. Array iteration rules
```pine
// Always guard before iterating:
if array.size(myArr) > 0
    for i = 0 to array.size(myArr) - 1
        // ...

// When DELETING items during iteration, go BACKWARD:
for i = array.size(myArr) - 1 to 0
    if should_remove(i)
        array.remove(myArr, i)
```

### 5d. Cannot mutate global vars inside functions
```pine
// WRONG — Pine rejects this:
my_func() =>
    globalVar := 42   // compile error if globalVar is declared outside

// CORRECT — return values and assign at call site
my_func() =>
    42
globalVar := my_func()
```

### 5e. Exported lib functions cannot use `request.*()` with arg dependencies
```pine
// WRONG in a library export:
export my_fn(string tf) =>
    request.security(syminfo.tickerid, tf, close)  // depends on arg → error

// CORRECT: keep request.* at indicator level, pass resolved values into lib
```

### 5f. Dynamic array access is NOT bounds-safe
Always compute and validate index before `array.get()`:
```pine
int n = array.size(myArr)
if n > 0
    float last = array.get(myArr, n - 1)  // safe
```

---

## 6. File Section Order (Mandatory)

All Pine files must follow this section order:

```pine
// ==================== global vars, state, singletons ====================
var THEME = KitCore.Theme.new()
var array<KitCore.Trade> trades = array.new<KitCore.Trade>()

// ==================== types, consts ====================
type LocalCfg
    float riskPerRRUsd = 100.0
TRIGGER_TYPE_TRADE = "Trade"

// ==================== input settings ====================
tradeRiskValue = input.float(1.0, "1R", ...)
propPreset = input.string("None", "Trade Rules", ...)

// ==================== local helpers ====================
get_data_local_cfg(...) => ...
process_data_add_entry(...) => ...

// ==================== main logic ====================
localCfg.riskPerRRUsd := KitCore.get_trade_risk_usd(...)
if barstate.isfirst
    ...
```

**When adding code:** always place it in the correct section. Never append at end of file.

---

## 7. Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Data gathering | `get_data_xxx` | `get_data_local_cfg()` |
| Rendering/visuals | `draw_data_xxx` | `draw_data_zone_box()` |
| Orchestration/mutation | `process_data_xxx` | `process_data_add_entry()` |
| Local helpers | `local_xxx` | `local_compute_sl()` |
| KIT local clones | `CORE_xxx`, `SMC_xxx`, `UI_xxx` | `CORE_get_trade_order_qty()` |

---

## 8. Shared Data Architecture

```
ChartContext (KitCore.ChartContext)
    ├── zones[]        ← PD Array zones (OB, FVG, SD...)
    ├── levels[]       ← SR/liquidity levels
    ├── events[]       ← pending signal/trade events
    └── signalHist[]   ← recent signal memory

RuntimeContext (KitCore.RuntimeContext)
    ├── chartIsNew     ← symbol/TF changed flag
    └── tradeScanEnabled ← entry gate (non-backfill guard)

trades[]     ← outside ChartContext (indicator-local)
tradeModelIds[] ← parallel array aligned with trades[]
```

**Rule:** Never create duplicate global arrays with the same semantic role. Always use `ChartContext` for shared data.

---

## 9. Backup and Versioning Policy

### Backup (before risky changes)
```bash
mkdir -p "backups/YYYYMMDD-01-description"
cp -R "src" "backups/YYYYMMDD-01-description/"
```
- Directory: `backups/` (NOT `src-versions/`)
- Naming: `YYYYMMDD-index-short-description`

### Version snapshot (after completing a feature)
```bash
mkdir -p "src-versions/MMdd-01"
cp src/changed-file.pine "src-versions/MMdd-01/"
# Also create: src-versions/MMdd-01/whats-done.md
```
- Every snapshot needs `whats-done.md` with a list of changes

---

## 10. Execution Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **One-Pass** | Small/mechanical task | Execute entirely, no checkpoints |
| **Planning** | Complex feature | Plan first, confirm, then execute |
| **BIG-PASS** | `Mode: BIG-PASS` | Auto-continue package to package |
| **Fix-Bug** | Regression/error | Check `docs/common-errors.md` first |
| **Review** | Code quality | Read before commenting |

**Default rule:** Publish one plan before any edit. Plan must include: goal, scope, phases, done criteria, stop condition.

---

## 11. Workflow Slash Commands

These workflows live in `.agents/workflows/` with YAML frontmatter:

| Command | When to use |
|---------|-------------|
| `/01-backup-workflow` | Before any refactor or risky edit |
| `/02-kit-change-policy` | When touching KIT library methods |
| `/03-context-ownership` | When dealing with shared ChartContext data |
| `/04-doc-sync` | After any behavior change — keep docs aligned |
| `/05-signal-emission-gate` | Signal/trade emission timing issues |
| `/06-execution-discipline` | Planning and execution rules |
| `/07-conversation-resume` | Resuming from a previous conversation |

---

## 12. Bug Fix Protocol

1. **Read `docs/common-errors.md` first** — the bug may already be diagnosed
2. Fix the bug
3. Confirm fix works (user says "compile ok" or test passes)
4. **Append to `docs/common-errors.md`:**
```markdown
## [Category] Short title
**Date:** YYYY-MM-DD
**Cause:** What caused it.
**Fix:** What fixed it.
**Prevention:** How to avoid in future.
```

---

## 13. Multi-Agent Collaboration Rules

When multiple agents work on the same codebase:

### ✅ Safe to do independently
- Read any file in `src/`
- Read any file in `.agents/`
- Work on a **different** indicator file than another agent
- Read `backups/` and `src-versions/` for context

### ⚠️ Requires coordination
- Editing KIT files (`Kit - Core`, `Kit - SMC`, `Kit - UI`) — one agent at a time
- Bumping `@lib-version` — must sync with all agents to update imports
- Editing `LocalCfg` types — verify other agents aren't modifying same fields

### ❌ Never do
- Edit `src/` files while another agent is mid-task on same file
- Bump KIT version without also updating ALL indicator imports
- Silently remove Settings/inputs visible to user
- Delete or overwrite `backups/` content

### Context handoff pattern
When finishing a session, always output:
```
## Handoff State
- Changed files: [list]
- Current @lib-version: N
- Pending: [list of unfinished items]
- Next step: [exact first action for next agent]
- Known issues: [any open compile/runtime issues]
```

---

## 14. Quick Reference — Prop Firm Risk System

The most recently integrated system (2026-04-07). Key facts for future agents:

**Location:** `Kit - Core.pine` — `PropRiskGuard` type + 5 helper functions  
**Runtime state:** Each indicator has `var array<float> propDayState = array.from(na, 0.0, -1.0)`  
**Fields:** `[dayStartEquity, dailyRiskUsed, lastDayNum]` — resets each calendar day

**Preset values (50% buffer applied intentionally):**
| Preset | Official Daily Limit | Internal Daily Cap | Per-Trade Cap |
|--------|--------------------|--------------------|---------------|
| FTMO 2-Step | 5% | 2.5% | 0.5% |
| FTMO 1-Step | 3% | 1.5% | 0.5% |
| The5ers HS | 5% | 2.5% | 0.5% |
| The5ers HG | 3% | 1.5% | 0.5% |
| None | — | disabled | disabled |

**1R input:** Dual-mode — `%` of equity (dynamic) or `$` fixed.  
**Gate:** `prop_entry_allowed()` called before every entry. `prop_register_trade()` called after entry confirmed.

---

## 15. How to Start a New Task

```
1. Read this file (AGENT-ONBOARDING.md)
2. Read .agents/00-read-first.md
3. Read .agents/workflows/00-collaboration-rules.md
4. Read .agents/docs/common-errors.md (if debugging)
5. Identify changed files from last session (check src-versions/ or backups/)
6. Check @lib-version in KitCore (current: 65 as of 2026-04-07)
7. Publish your plan before writing any code
8. Backup before risky changes
9. Execute one-pass
10. Update docs + version headers + whats-done.md
```

---

*Last updated: 2026-04-07 | Maintained by: AI agents in collaboration with @hunghoxuan*
