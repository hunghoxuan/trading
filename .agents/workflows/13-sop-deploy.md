# SOP: Deploy

Goal: deploy webhook/webhook-ui safely to VPS with reproducible commands.

## Steps

1. Pre-check
- Confirm approved code is committed.
- Confirm required build version constants are bumped.

2. Git push (non-interactive, explicit)
- `git add <changed-files>`
- `git commit -m "<message>"`
- `git push origin main`

3. Deploy webhook stack
- `PUSH_FIRST=0 VPS_APP_DIR=/opt/trading bash scripts/deploy_webhook.sh`

4. Verify
- PM2 processes online (`webhook`, `webhook-ui`).
- Health endpoints return success.
- UI loads expected bundle/version.

## Required verification commands

- `ssh root@139.59.211.192 "pm2 ls"`
- `ssh root@139.59.211.192 "curl -sS http://127.0.0.1:80/health && echo"`
- `ssh root@139.59.211.192 "curl -sS http://127.0.0.1:80/mt5/health && echo"`
