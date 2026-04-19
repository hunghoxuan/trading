# AI Agent Boot Document

Welcome to the Trading Bot workspace. 
Before making any plans or executing code, YOU MUST load and read the core system dependencies located in:

`.agents/README.md`

This file will route you to the Active Sprint, the Architecture Rules, and the inter-agent MAILBOX. Failure to read the `.agents/README.md` file will result in context hallucinations.

## Build Version Rule (Mandatory)

When changing code (backend, EA, UI, scripts), always bump both build versions before reporting done or deploying:

- `webhook/server.js` -> `SERVER_VERSION`
- `mql5/TVBridgeEA.mq5` -> `EA_BUILD_VERSION`

Use:

- `bash scripts/bump_build_versions.sh`

Deployment guard:

- `bash scripts/check_build_versions.sh origin/main`

`scripts/deploy_webhook.sh` runs this guard automatically and must fail if either version was not bumped.
