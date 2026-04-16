# SOP: Execute Code

Goal: implement approved tasks safely and keep tracker/version discipline.

## Preconditions

- Task has approved spec from `11-sop-plan-feature.md`.
- Task is present in `.agents/sprint.md` as `[DOING]`.

## Steps

1. Read target files before editing.
2. Implement minimum complete change (avoid unrelated edits).
3. If logic changed, bump hardcoded version variable in affected code:
- MQL5: `EA_BUILD_VERSION`
- Node backend: `SERVER_VERSION`
- Pine libs/indicators: `@lib-version` / `@file-version`
- package metadata when applicable: `package.json version`
4. Run relevant checks/tests.
5. If required, deploy via `13-sop-deploy.md`.
6. Update trackers:
- Remove item from sprint.
- Append completion to `.agents/changelog.md`.

## Output Contract

- Final report must include:
  - `## ✅ Done`
  - `## 🔜 Remaining`
  - `## 📄 Build Versions` (real hardcoded values only)
  - `## 🧪 Test / Deploy`
