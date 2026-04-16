# SOP: Smoke Test

Goal: run minimal, high-signal checks after changes/deploy.

## Local checks

1. Syntax/compile:
- `node --check webhook/server.js`
- UI build if changed: `npm --prefix webhook-ui run build`
2. API/UI smoke:
- `bash scripts/test_server.sh`
- `bash scripts/test_remote_api_default.sh`
- `bash scripts/test_remote_ui.sh`

## VPS checks

1. Process health:
- `ssh root@139.59.211.192 "pm2 ls"`
2. Endpoint health:
- `ssh root@139.59.211.192 "curl -sS http://127.0.0.1:80/health && echo"`
- `ssh root@139.59.211.192 "curl -sS http://127.0.0.1:80/mt5/health && echo"`

## Pass criteria

- No syntax errors.
- Health endpoints respond with `ok:true`.
- Core API/UI endpoints reachable.
