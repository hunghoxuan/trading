#!/usr/bin/env bash
set -euo pipefail

# Local + VPS deploy helper for webhook server.
# Usage examples:
#   bash scripts/deploy_webhook.sh
#   PUSH_FIRST=0 VPS_APP_DIR=/root/trading/webhook SERVICE_MODE=systemd SERVICE_NAME=webhook \
#     bash scripts/deploy_webhook.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BRANCH="${BRANCH:-main}"
PUSH_FIRST="${PUSH_FIRST:-1}"
VPS_HOST="${VPS_HOST:-root@139.59.211.192}"
VPS_APP_DIR="${VPS_APP_DIR:-/root/trading/webhook}"
SERVICE_MODE="${SERVICE_MODE:-pm2}"      # pm2|systemd
SERVICE_NAME="${SERVICE_NAME:-webhook}"  # pm2 process name or systemd unit name

echo "[deploy] root=${ROOT_DIR}"
echo "[deploy] branch=${BRANCH} push_first=${PUSH_FIRST}"
echo "[deploy] vps_host=${VPS_HOST} app_dir=${VPS_APP_DIR} service_mode=${SERVICE_MODE} service_name=${SERVICE_NAME}"

cd "${ROOT_DIR}"

echo "[deploy] local syntax check"
node --check webhook/server.js

if [[ "${PUSH_FIRST}" == "1" ]]; then
  echo "[deploy] pushing local branch to origin/${BRANCH}"
  git push origin "${BRANCH}"
fi

REMOTE_CMD=$(cat <<EOF
set -euo pipefail
cd "${VPS_APP_DIR}"
echo "[vps] cwd=\$(pwd)"
git fetch --all --prune
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"
node --check webhook/server.js
if [[ "${SERVICE_MODE}" == "pm2" ]]; then
  pm2 restart "${SERVICE_NAME}"
  pm2 logs "${SERVICE_NAME}" --lines 80 --nostream || true
elif [[ "${SERVICE_MODE}" == "systemd" ]]; then
  sudo systemctl restart "${SERVICE_NAME}"
  sudo systemctl status "${SERVICE_NAME}" --no-pager || true
  journalctl -u "${SERVICE_NAME}" -n 80 --no-pager || true
else
  echo "Unsupported SERVICE_MODE=${SERVICE_MODE} (use pm2 or systemd)" >&2
  exit 1
fi
curl -fsS "http://127.0.0.1:80/health" >/dev/null
curl -fsS "http://127.0.0.1:80/mt5/health" >/dev/null
echo "[vps] deploy success"
EOF
)

echo "[deploy] running remote deployment over ssh"
ssh "${VPS_HOST}" "${REMOTE_CMD}"
echo "[deploy] done"

