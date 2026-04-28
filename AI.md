# AI Agent Boot Document

Before planning or coding, read these files in order:

1. [README.md](./README.md)
2. [.agents/README.md](./.agents/README.md)
3. [.agents/rules.md](./.agents/rules.md)

## Build Version Rule (Mandatory)

When changing code (backend, EA, UI, scripts), bump both versions before reporting done or deploying:

- `webhook/server.js` -> `SERVER_VERSION`
- `mql5/TVBridgeEA.mq5` -> `EA_BUILD_VERSION`

Version format must use date, hour/minute, and latest git commit/push identifier:

- `vY.M.d H:m - git`
- Apply the same version to VPS/server and EA client.
- Prefer deriving `git` from the latest pushed commit short SHA or agreed push/build number.

Use:

- `bash scripts/bump_build_versions.sh`

Deploy guard:

- `bash scripts/check_build_versions.sh origin/main`

## Planning & Confirmation Rule (Mandatory)

Before implementation, always provide a detailed design/plan and proposed solution covering relevant UI, layout, DB schema, technical approach, and tech stack choices.

Always ask confirmation questions and wait for approval before changing UI, layout, feature behavior, DB schema, tech stack, or architecture, unless the user explicitly asks for immediate execution or the task is read-only inspection.
