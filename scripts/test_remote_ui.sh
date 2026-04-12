#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UI_DIR="${ROOT_DIR}/webhook-ui"
ENV_FILE="${ROOT_DIR}/webhook/.env"
REPORT_DIR="${ROOT_DIR}/test-results"
mkdir -p "${REPORT_DIR}"

API_KEY="${API_KEY:-$(sed -n 's/^SIGNAL_API_KEY=//p' "${ENV_FILE}" | head -n 1)}"
BASE_URL="${BASE_URL:-http://139.59.211.192}"
UI_URL="${UI_URL:-http://139.59.211.192/ui}"

if [[ -z "${API_KEY}" ]]; then
  echo "[ui-test] API_KEY is required (or SIGNAL_API_KEY in webhook/.env)"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT_FILE="${REPORT_DIR}/remote-ui-${STAMP}.log"

(
  cd "${UI_DIR}"
  UI_URL="${UI_URL}" BASE_URL="${BASE_URL}" API_KEY="${API_KEY}" npx playwright test
) 2>&1 | tee "${REPORT_FILE}"

cp "${REPORT_FILE}" "${REPORT_DIR}/remote-ui-latest.log"
echo "[ui-test] latest=${REPORT_DIR}/remote-ui-latest.log"
