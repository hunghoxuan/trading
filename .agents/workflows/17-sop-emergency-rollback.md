# SOP: Emergency Rollback

**Goal:** Quickly recover the trading cluster when a recently shipped code package crashes the Webhook, UI, or MT5 logic.

## 1. Acknowledge Breakage
- If `pm2 restart` fails, or if the user reports "system is down immediately after your change", immediately cease all feature work.
- DO NOT attempt to write a complex fix blindly.

## 2. Revert Git (Safest for Webhook/Scripts)
- Find the previous safe commit using `git log --oneline -n 5`.
- Revert the files: `git checkout <PREVIOUS_SAFE_COMMIT> -- webhook/server.js`
- Commit the revert locally: `git commit -am "fix: Revert to previous safe state"`

## 3. Deploy Revert
- Trigger `VPS_APP_DIR=/opt/trading bash scripts/deploy_webhook.sh` immediately.

## 4. MT5 EA Specific
- If MQL5 is broken, revert `TVBridgeEA.mq5` leveraging Git. 
- Ask the user to explicitly re-compile the EA in their MetaEditor immediately.

## 5. Post-Mortem
- Once stable, analyze *why* the breakage occurred before trying to re-implement.
