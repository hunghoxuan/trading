#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STAMP_UTC="$(date -u +%Y%m%d%H%M)"
SERVER_VER="$(date -u +%Y.%m.%d)-${STAMP_UTC:8:4}"
EA_VER="$(date -u +%Y-%m-%d).${STAMP_UTC:8:4}"

perl -0777 -i -pe "s/const SERVER_VERSION = envStr\(process\.env\.WEBHOOK_SERVER_VERSION, \"[^\"]+\"\);/const SERVER_VERSION = envStr(process.env.WEBHOOK_SERVER_VERSION, \"${SERVER_VER}\");/g" webhook/server.js
perl -0777 -i -pe "s/string EA_BUILD_VERSION = \"[^\"]+\";/string EA_BUILD_VERSION = \"${EA_VER}\";/g" mql5/TVBridgeEA.mq5

echo "[build-version] server=${SERVER_VER}"
echo "[build-version] ea=${EA_VER}"
