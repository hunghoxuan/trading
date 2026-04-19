#!/usr/bin/env bash
set -euo pipefail

# Local + VPS deploy helper for webhook server.
# Usage examples:
#   bash scripts/deploy_webhook.sh
#   PUSH_FIRST=0 VPS_APP_DIR=/opt/trading SERVICE_MODE=systemd SERVICE_NAME=webhook \
#     bash scripts/deploy_webhook.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BRANCH="${BRANCH:-main}"
PUSH_FIRST="${PUSH_FIRST:-1}"
VPS_HOST="${VPS_HOST:-root@139.59.211.192}"
VPS_APP_DIR="${VPS_APP_DIR:-/opt/trading}"
SERVICE_MODE="${SERVICE_MODE:-pm2}"      # pm2|systemd
SERVICE_NAME="${SERVICE_NAME:-webhook}"  # pm2 process name or systemd unit name
HEALTH_PORT="${HEALTH_PORT:-80}"

echo "[deploy] root=${ROOT_DIR}"
echo "[deploy] branch=${BRANCH} push_first=${PUSH_FIRST}"
echo "[deploy] vps_host=${VPS_HOST} app_dir=${VPS_APP_DIR} service_mode=${SERVICE_MODE} service_name=${SERVICE_NAME} health_port=${HEALTH_PORT}"

cd "${ROOT_DIR}"

echo "[deploy] enforcing build-version rule"
bash scripts/check_build_versions.sh "origin/${BRANCH}"

echo "[deploy] skipping local syntax check (node missing in path)"

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
# Ensure runtime deps for webhook are present (needed for MT5 postgres mode: pg).
npm --prefix webhook install --no-audit --no-fund
# Build UI if present
if [[ -d "web-ui" ]]; then
  echo "[vps] building web-ui"
  npm --prefix web-ui install --no-audit --no-fund
  npm --prefix web-ui run build
fi

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
# Wait for app to be ready and health endpoints to respond.
OK=0
for i in {1..20}; do
  if curl -fsS "http://127.0.0.1:${HEALTH_PORT}/health" >/dev/null \
     && curl -fsS "http://127.0.0.1:${HEALTH_PORT}/mt5/health" >/dev/null; then
    OK=1
    break
  fi
  sleep 2
done
if [[ "\${OK}" != "1" ]]; then
  echo "[vps] health check failed on port ${HEALTH_PORT}" >&2
  if [[ "${SERVICE_MODE}" == "pm2" ]]; then
    pm2 logs "${SERVICE_NAME}" --lines 120 --nostream || true
  elif [[ "${SERVICE_MODE}" == "systemd" ]]; then
    journalctl -u "${SERVICE_NAME}" -n 120 --no-pager || true
  fi
  exit 1
fi
echo "[vps] deploy success"
EOF
)

echo "[deploy] running remote deployment over ssh"
ssh "${VPS_HOST}" "${REMOTE_CMD}"
echo "[deploy] done"
