# Deploy Rules

- For backend, EA, UI, or script changes, bump both:
  - `webhook/server.js` -> `SERVER_VERSION`
  - `mql5/TVBridgeEA.mq5` -> `EA_BUILD_VERSION`
- Version format:
  - `vY.M.d H:m - git`
- Server and EA versions must match.
- Use:
  - `bash scripts/bump_build_versions.sh`
- Deploy guard:
  - `bash scripts/check_build_versions.sh origin/main`
- Preferred deploy:
  - `bash scripts/deploy_webhook.sh`
- After deploy, verify health and core route smoke tests.

