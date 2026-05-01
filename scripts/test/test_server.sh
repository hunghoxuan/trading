#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

API_KEY="$(sed -n 's/^SIGNAL_API_KEY=//p' webhook/.env | head -n 1)" \
BASE_URL="http://139.59.211.192" \
UI_URL="http://139.59.211.192:5174" \
EXPECT_STORAGE=postgres \
bash scripts/test/test_local_stack.sh
