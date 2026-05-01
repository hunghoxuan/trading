# Prefix Allowlist Template (Customize)

Copy this file to your own ops note and keep it updated.

## Project Root
- `/Users/macmini/Trade/Bot/trading`

## Tier 1 Auto-Approve

### Read/Inspect
- `["rtk","git","status"]`
- `["rtk","rg"]`
- `["rtk","sed","-n"]`
- `["rtk","eza","--tree","--level=3"]`

### Local Validation
- `["rtk","node","--check","webhook/server.js"]`
- `["rtk","npm","--prefix","web-ui","run","build"]`

### Deploy + Verify (Known Script/Endpoint)
- `["rtk","/bin/zsh","-lc","cd /Users/macmini/Trade/Bot/trading && PUSH_FIRST=0 VPS_APP_DIR=/opt/trading bash scripts/deploy/deploy_webhook.sh"]`
- `["rtk","/bin/zsh","-lc","curl -sS --max-time 20 https://trade.mozasolution.com/health | sed -n '1,120p'"]`
- `["rtk","/bin/zsh","-lc","curl -sS --max-time 20 https://trade.mozasolution.com/ui/ | sed -n '1,80p'"]`

## Tier 2 Conditional Approve

### Source Control
- `["rtk","git","push","origin","main"]`

### Remote Ops
- `["rtk","ssh","root@139.59.211.192"]`
- `["rtk","scp","webhook/server.js","root@139.59.211.192:/opt/trading/webhook/server.js"]`

Condition checklist:
1. Host is expected.
2. Destination path is expected.
3. Change is tied to active ticket.

## Tier 3 Always Manual

- Any `rm -rf`
- Any `git reset --hard`
- Any unknown host `ssh/scp`
- Any broad interpreter execution not tied to known script

## Change Log

- Date:
- Added prefix:
- Reason:
- Approved by:
