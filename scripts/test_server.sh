#!/usr/bin/env bash
set -euo pipefail

cd /Users/macmini/Trade/Bot/trading

API_KEY="$(sed -n 's/^SIGNAL_API_KEY=//p' webhook/.env | head -n 1)" \
BASE_URL="http://139.59.211.192" \
UI_URL="http://139.59.211.192:5174" \
EXPECT_STORAGE=postgres \
bash scripts/test_local_stack.sh
