# Security Auth Upgrade (Simple + Realistic)

## 1) Context

Current behavior includes passing `api_key` in request payload/query for machine-to-machine traffic (TradingView, EA, scripts).  
This is not ideal because payload data is easier to leak in logs/debug traces and harder to standardize.

Goal: improve security with minimal implementation cost and low migration risk.

## 2) Scope

In scope:
- TradingView -> Server webhook authentication.
- EA/UI/scripts -> Server API authentication.
- Key lifecycle basics (create, disable/revoke, rotate).
- Backward-compatible migration.

Out of scope (for this phase):
- Full HMAC request signing.
- Nonce/replay cryptographic protocol.
- OAuth2/OpenID enterprise identity fabric.

## 3) Requirements

### Functional Requirements
- FR-01: Remove dependency on `api_key` inside payload body.
- FR-02: TradingView webhook auth must use secret URL token path:
  - `POST /signal/<tv_webhook_token>`
- FR-03: EA/UI/scripts must authenticate via header:
  - `x-api-key: <token>` (or `Authorization: Bearer <token>`)
- FR-04: System must support multiple keys per account/principal.
- FR-05: System must support immediate key revoke (disable key).
- FR-06: Support safe key rotation with overlap window (old + new active).

### Non-Functional Requirements
- NFR-01: Minimal code churn in existing flow.
- NFR-02: No breaking migration for existing TradingView alerts on day 1.
- NFR-03: Keep runtime overhead low and compatible with current infra.

## 4) Proposed Solution

### 4.1 Auth Modes
- TradingView:
  - Validate `<tv_webhook_token>` from URL path.
  - Keep token long-lived and stable by default.
  - Rotate rarely (on leak or scheduled maintenance) using overlap period.
- EA/UI/scripts:
  - Validate API key from request header.
  - Reject payload `api_key` after migration completion.

### 4.2 Data Model (Simple)
- Add (or normalize) key store table with:
  - `id`
  - `account_id` (nullable for TV global key if needed)
  - `client_type` (`tv`, `ea`, `ui`, `script`)
  - `label` (human-friendly name)
  - `token_hash` (never store raw token)
  - `status` (`active`, `revoked`)
  - `created_at`, `last_used_at`, `revoked_at`

Notes:
- Verify request token by hashing input and matching `token_hash`.
- Allow many active keys per account for operational flexibility.

### 4.3 Middleware Behavior
- Route-level auth policy:
  - `/signal/:tv_webhook_token` -> TV token validator
  - `/mt5/*` and protected APIs -> header key validator
- Compatibility mode (temporary):
  - Accept old payload/query `api_key` for a grace period.
  - Emit warning logs for legacy usage.
- Enforcement mode:
  - Deny payload/query key usage with clear error response.

## 5) Migration Plan

### Phase A: Prepare (non-breaking)
- Introduce DB key metadata schema.
- Implement auth middleware for path/header.
- Keep legacy payload key support enabled.
- Add warnings/metrics for legacy usage count.

### Phase B: Client Cutover
- Update EA client to send header key only.
- Update UI/scripts/curl docs to header key only.
- Keep TradingView alerts unchanged if token path already stable.

### Phase C: Enforce
- Disable payload/query `api_key` acceptance.
- Keep revoke/rotation operational playbook.

## 6) Operational Checklist

### Pre-Deploy
- [ ] Backup DB schema.
- [ ] Confirm HTTPS is active for public endpoint.
- [ ] Create at least one active key per required client.
- [ ] Prepare rollback flag to re-enable legacy auth quickly.

### Deploy
- [ ] Apply schema migration.
- [ ] Deploy middleware changes.
- [ ] Run smoke tests for TV webhook + EA pull/ack + dashboard APIs.

### Post-Deploy
- [ ] Verify `last_used_at` updates for real traffic.
- [ ] Check warning logs for remaining legacy key usage.
- [ ] Revoke one test key and confirm access is denied immediately.

## 7) Acceptance Criteria

- AC-01: TV webhook works via `/signal/<tv_webhook_token>` without payload key.
- AC-02: EA calls succeed with header key and fail without/invalid key.
- AC-03: One account can hold multiple active keys.
- AC-04: Revoked key is denied immediately.
- AC-05: Legacy payload key can be disabled without breaking migrated clients.

## 8) Risks and Mitigations

- Risk: Token leakage via copied webhook URL.
  - Mitigation: long random token, restricted access, periodic rotation.
- Risk: Breaking existing alerts during rotation.
  - Mitigation: dual-token overlap window and phased migration.
- Risk: Logging sensitive values.
  - Mitigation: redact token in logs; never log full key/token.

## 9) Login System (Email/Password and SSO) — Realism Check

### Short Answer
Email/password is realistic as a next step.  
SSO is possible but not "simple" if done correctly.

### Recommended Path
- Step 1 (simple, realistic): Email/password local auth for dashboard admin users.
  - Store password hashes using Argon2/Bcrypt.
  - Session cookie (HttpOnly + Secure) or short JWT + refresh.
  - Basic roles (`admin`, `viewer`) if needed.
- Step 2 (later): Add one SSO provider (Google or GitHub) only after local auth is stable.

### Why
- You already have machine auth work in progress; adding full SSO now increases scope (callback handling, identity linking, token/session hardening, account mapping, lifecycle edge cases).
- Local auth first gives immediate practical value with lower effort and lower risk.

## 10) Suggested Priority

1. Complete simple API-key auth upgrade first (this document).
2. Add local email/password login.
3. Add SSO only when multi-user/admin workflows need it.

