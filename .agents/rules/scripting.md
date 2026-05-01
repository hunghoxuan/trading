# Scripting & Test Creation Rules

When creating new scripts or tests in this project, you must follow these standards:

## 1. Bash Scripts
- Must include `set -e` (exit on error) and `set -u` (exit on undefined variables).
- Must be idempotent (safe to run multiple times without breaking state).
- Must print clear, caveman-style `echo` statements explaining each step.
- Never hardcode absolute local paths; use relative paths from the project root.
- Always resolve repo root dynamically and use root-virtual paths:
  - `ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"` (adjust depth by folder)
  - then run files as `"${ROOT_DIR}/scripts/..."`
  - do not use machine-specific paths like `/Users/...`.

## 2. Node/JS Scripts
- Safely handle database connections. Always call `pool.end()` or gracefully close connections so the script doesn't hang.
- Use environment variables for secrets and URLs. Never hardcode credentials.
- Use explicit error handling (try/catch) to prevent silent failures.

## 3. Writing Tests (`tests/`)
- Tests must be stateless. Always clean up the database or state you create after the test runs.
- Remote API testing must rely on `curl` and strictly validate HTTP status codes.
- Tests should output clear `[PASS]` or `[FAIL]` markers.
