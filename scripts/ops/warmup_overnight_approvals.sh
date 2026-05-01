#!/usr/bin/env bash
set -e
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WITH_GIT_WRITE="${WITH_GIT_WRITE:-0}"
WITH_DEPLOY="${WITH_DEPLOY:-0}"

print_help() {
  cat <<'EOF'
Warm up command approvals for overnight runs.

Usage:
  bash scripts/ops/warmup_overnight_approvals.sh [--with-git-write] [--with-deploy]

Options:
  --with-git-write   Include git add/commit/push warm-up commands (creates a real commit).
  --with-deploy      Include deploy and production health/UI checks.
  -h, --help         Show help.

Env overrides:
  WITH_GIT_WRITE=1
  WITH_DEPLOY=1

Notes:
  - Approve prompts with "Allow and remember" to save prefixes.
  - Default mode is non-destructive and does not push/deploy.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --with-git-write) WITH_GIT_WRITE=1 ;;
    --with-deploy) WITH_DEPLOY=1 ;;
    -h|--help) print_help; exit 0 ;;
    *)
      echo "[warmup] unknown argument: $arg"
      print_help
      exit 1
      ;;
  esac
done

cd "${ROOT_DIR}"
echo "[warmup] repo root: ${ROOT_DIR}"
echo "[warmup] step 1: read-only/context commands"
rtk git status
rtk eza --tree --level=3 .agents
rtk rg -n "TODO|FIXME" web-ui webhook

echo "[warmup] step 2: local validation commands"
rtk node --check webhook/server.js
rtk npm --prefix web-ui run build

if [[ "${WITH_GIT_WRITE}" == "1" ]]; then
  echo "[warmup] step 3: git write/push commands (real commit)"
  rtk git add .agents/worklog.md
  rtk git commit -m "chore: warmup approval test"
  rtk git push origin main
else
  echo "[warmup] step 3 skipped (set --with-git-write to enable)"
fi

if [[ "${WITH_DEPLOY}" == "1" ]]; then
  echo "[warmup] step 4: deploy + production verification commands"
  rtk /bin/zsh -lc "cd ${ROOT_DIR} && PUSH_FIRST=0 VPS_APP_DIR=/opt/trading bash scripts/deploy/deploy_webhook.sh"
  rtk /bin/zsh -lc "curl -sS --max-time 20 https://trade.mozasolution.com/health | sed -n '1,120p'"
  rtk /bin/zsh -lc "curl -sS --max-time 20 https://trade.mozasolution.com/ui/ | sed -n '1,80p'"
else
  echo "[warmup] step 4 skipped (set --with-deploy to enable)"
fi

echo "[warmup] done"
