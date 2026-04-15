# SOP: Deploy

**Goal:** Safely ship code from the local development workspace to the production VPS without causing downtime.

## 1. Pre-Deployment Check
- Ensure all logic is fully coded and `SERVER_VERSION` / `EA_BUILD_VERSION` / `version` was bumped.
- Ensure all files are saved.

## 2. Commit to Git
- All deployment relies on Git. The VPS pulls from `origin/main`.
- Command: `git add . && git commit -m "chore: deployment sync" && git push origin main`

## 3. Execute Deploy Pipeline
- The VPS requires specific environment routing to automatically deploy the Webhook server.
- Command: `VPS_APP_DIR=/opt/trading bash scripts/deploy_webhook.sh`

## 4. Verification
- Wait for the bash script to return `[PM2] [webhook](X) ✓`.
- Ensure there are no cascading Node errors in the output logs.
- The deployment is only successful if the health check curl returns HTTP 200.
