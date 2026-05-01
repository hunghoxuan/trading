# Safe Auto-Approval Policy

Goal: speed up execution without granting dangerous global access.

## Principle

1. Prefer scoped prefix allowlist.
2. Avoid global full access.
3. Keep destructive commands manual.
4. Review and prune allowlist regularly.

## 3-Tier Approval Model

## Tier 1: Auto-Approve (Safe, Repeatable)
- Read-only checks
- Fixed deploy scripts you own
- Fixed health verification commands

Examples:
- `rtk git status`
- `rtk npm --prefix web-ui run build`
- `rtk /bin/zsh -lc "curl -sS --max-time 20 https://trade.mozasolution.com/health | sed -n '1,120p'"`
- `rtk /bin/zsh -lc "cd /Users/macmini/Trade/Bot/trading && PUSH_FIRST=0 VPS_APP_DIR=/opt/trading bash scripts/deploy/deploy_webhook.sh"`

## Tier 2: Conditional Approve (Context Required)
- `git push`
- `ssh` to known host with bounded command
- `scp` to known path

Rule: approve if target host/path matches your known production pipeline.

## Tier 3: Always Manual
- `rm -rf`
- `git reset --hard`
- ad-hoc shell strings with unknown side effects
- commands touching unknown directories/hosts

## Prefix Design Rules

1. Keep prefix narrow and explicit.
2. Include stable path/flags where possible.
3. Do not approve generic interpreters broadly (`python`, `bash -c` arbitrary).
4. Separate deploy prefixes from debug prefixes.

## Monthly Hygiene

1. Remove prefixes you no longer use.
2. Replace broad prefixes with narrower ones.
3. Re-check hostnames/paths for production commands.
