#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="$ROOT_DIR/.agents/STATE.md"
SPRINT_FILE="$ROOT_DIR/.agents/plans/sprint.md"
BUGS_FILE="$ROOT_DIR/.agents/plans/bugs.md"
WORKLOG_FILE="$ROOT_DIR/.agents/worklog.md"
DECISIONS_DIR="$ROOT_DIR/.agents/wiki/decisions"

now_utc="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"

server_ver="$(rg -n 'SERVER_VERSION' "$ROOT_DIR/webhook/server.js" | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/' || true)"
ea_ver="$(rg -n 'EA_BUILD_VERSION' "$ROOT_DIR/mql5/TVBridgeEA.mq5" | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/' || true)"

sprint_top="$(sed -n '1,30p' "$SPRINT_FILE" 2>/dev/null || echo 'n/a')"
bugs_top="$(sed -n '1,20p' "$BUGS_FILE" 2>/dev/null || echo 'n/a')"
worklog_tail="$(tail -n 40 "$WORKLOG_FILE" 2>/dev/null || echo 'n/a')"
recent_decisions="$(ls -1 "$DECISIONS_DIR" 2>/dev/null | tail -n 5 || true)"

cat > "$STATE_FILE" <<EOF2
# STATE (Compiled Snapshot)

Purpose: fast, current context for AI/human startup. Keep short.

## Current Sprint Focus
- Source: .agents/plans/sprint.md
${sprint_top}

## Active Blockers
- Source: .agents/plans/bugs.md + latest worklog
${bugs_top}

## Latest Decisions
- Source: .agents/wiki/decisions/
${recent_decisions:-n/a}

## Deploy / Version Status
- SERVER_VERSION: ${server_ver:-n/a}
- EA_BUILD_VERSION: ${ea_ver:-n/a}

## Open Risks
- Check top open bugs and unresolved sprint TODOs.

## Last Build
- Timestamp: ${now_utc}
- Builder: scripts/build_state_snapshot.sh

## Recent Worklog Tail
${worklog_tail}
EOF2

echo "[state] wrote $STATE_FILE"
