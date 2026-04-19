#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BASE_REF="${1:-origin/main}"

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "[build-version-check] base ref not found: $BASE_REF (skipping)"
  exit 0
fi

CHANGED="$(git diff --name-only "$BASE_REF...HEAD" --)"
if [[ -z "$CHANGED" ]]; then
  echo "[build-version-check] no changes between $BASE_REF and HEAD"
  exit 0
fi

CODE_CHANGED="$(echo "$CHANGED" | rg -v '^(docs/|\.agents/|AI\.md$|.*\.md$|test-results/|web-ui/playwright-report/|web-ui/test-results/)' || true)"
if [[ -z "$CODE_CHANGED" ]]; then
  echo "[build-version-check] only docs/artifacts changed; version bump not required"
  exit 0
fi

SERVER_BUMP="$(git diff -U0 "$BASE_REF...HEAD" -- webhook/server.js | rg '^\+const SERVER_VERSION = envStr\(process\.env\.WEBHOOK_SERVER_VERSION, \"' || true)"
EA_BUMP="$(git diff -U0 "$BASE_REF...HEAD" -- mql5/TVBridgeEA.mq5 | rg '^\+string EA_BUILD_VERSION = \"' || true)"

if [[ -z "$SERVER_BUMP" || -z "$EA_BUMP" ]]; then
  echo "[build-version-check] FAILED"
  echo "[build-version-check] Rule: Any code change must bump BOTH versions:"
  echo "  - webhook/server.js :: SERVER_VERSION"
  echo "  - mql5/TVBridgeEA.mq5 :: EA_BUILD_VERSION"
  echo "[build-version-check] Fix: run scripts/bump_build_versions.sh and commit the version lines."
  exit 1
fi

echo "[build-version-check] OK (both version bumps detected vs $BASE_REF)"
