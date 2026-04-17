"use strict";

const crypto = require("crypto");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL, URLSearchParams } = require("url");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function asBool(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const raw = String(value).trim();
  if (raw === "") {
    return fallback;
  }
  const v = raw.toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function asNum(value, fallback = NaN) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseKeySet(value) {
  return new Set(envStr(value).split(",").map((s) => s.trim()).filter(Boolean));
}

function envStr(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const s = String(value).trim();
  return s === "" ? fallback : s;
}

function normalizeIsoTimestamp(value, fallback = new Date().toISOString()) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? new Date(ms).toISOString() : fallback;
  }
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return fallback;
  return new Date(ms).toISOString();
}

loadEnvFile();

const SERVER_VERSION = envStr(process.env.WEBHOOK_SERVER_VERSION, "2026.04.17-46");

const CFG = {
  port: asNum(process.env.PORT, 80),
  httpsEnabled: asBool(process.env.HTTPS_ENABLED, false),
  httpsPort: asNum(process.env.HTTPS_PORT, 443),
  httpsKeyPath: envStr(process.env.HTTPS_KEY_PATH),
  httpsCertPath: envStr(process.env.HTTPS_CERT_PATH),
  httpsCaPath: envStr(process.env.HTTPS_CA_PATH),
  httpsRedirectHttp: asBool(process.env.HTTPS_REDIRECT_HTTP, true),
  signalApiKey: envStr(process.env.SIGNAL_API_KEY),

  telegramBotToken: envStr(process.env.TELEGRAM_BOT_TOKEN),
  telegramChatId: envStr(process.env.TELEGRAM_CHAT_ID),

  allowSymbols: envStr(process.env.ALLOW_SYMBOLS).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),

  binanceMode: envStr(process.env.BINANCE_MODE).toLowerCase(),
  binanceProduct: envStr(process.env.BINANCE_PRODUCT, "spot").toLowerCase(),
  binanceApiKey: envStr(process.env.BINANCE_API_KEY),
  binanceApiSecret: envStr(process.env.BINANCE_API_SECRET),
  binanceRecvWindow: asNum(process.env.BINANCE_RECV_WINDOW, 5000),
  binanceDefaultQty: asNum(process.env.BINANCE_DEFAULT_QTY, NaN),
  binanceDefaultQuoteQty: asNum(process.env.BINANCE_DEFAULT_QUOTE_QTY, NaN),

  ctraderMode: envStr(process.env.CTRADER_MODE).toLowerCase(),
  ctraderExecutorUrl: envStr(process.env.CTRADER_EXECUTOR_URL),
  ctraderExecutorApiKey: envStr(process.env.CTRADER_EXECUTOR_API_KEY),

  maxRiskPct: asNum(process.env.MAX_RISK_PCT, NaN),

  // MT5 bridge (merged into this same server.js)
  mt5Enabled: asBool(process.env.MT5_ENABLED, true),
  mt5Storage: envStr(process.env.MT5_STORAGE, "sqlite").toLowerCase(),
  mt5TvAlertApiKeys: parseKeySet(process.env.MT5_TV_ALERT_API_KEYS),
  mt5TvWebhookTokens: parseKeySet(process.env.MT5_TV_WEBHOOK_TOKENS || process.env.TV_WEBHOOK_TOKENS),
  mt5EaApiKeys: parseKeySet(process.env.MT5_EA_API_KEYS),
  mt5AuthAllowLegacyPayloadKey: asBool(process.env.MT5_AUTH_ALLOW_LEGACY_PAYLOAD_KEY, true),
  mt5AuthAllowLegacyQueryKey: asBool(process.env.MT5_AUTH_ALLOW_LEGACY_QUERY_KEY, true),
  mt5DefaultLot: asNum(process.env.MT5_DEFAULT_LOT, 0.01),
  mt5DefaultUserId: envStr(process.env.MT5_DEFAULT_USER_ID, "default"),
  mt5PruneEnabled: asBool(process.env.MT5_PRUNE_ENABLED, true),
  mt5PruneDays: asNum(process.env.MT5_PRUNE_DAYS, 14),
  mt5PruneIntervalMinutes: asNum(process.env.MT5_PRUNE_INTERVAL_MINUTES, 60),
  mt5DbPath: path.resolve(
    __dirname,
    envStr(process.env.MT5_DB_PATH) ||
      ((envStr(process.env.MT5_STORAGE, "sqlite").toLowerCase() === "json")
        ? "./mt5-signals.json"
        : "./mt5-signals.db"),
  ),
  mt5PostgresUrl: envStr(process.env.MT5_POSTGRES_URL) || envStr(process.env.POSTGRES_URL) || envStr(process.env.POSTGRE_URL),
  uiDistPath: path.resolve(__dirname, envStr(process.env.WEB_UI_DIST_PATH || process.env.WEBHOOK_UI_DIST_PATH, "../web-ui/dist")),
  landingDistPath: path.resolve(__dirname, envStr(process.env.WEB_LANDING_DIST_PATH, "../web")),
  uiAuthEnabled: asBool(process.env.UI_AUTH_ENABLED, true),
  uiBootstrapEmail: envStr(process.env.UI_BOOTSTRAP_EMAIL, "hung.hoxuan@gmail.com").toLowerCase(),
  uiBootstrapPassword: envStr(process.env.UI_BOOTSTRAP_PASSWORD, "BceTzkUuznrX7WDLTODBh077"),
  uiSessionTtlSeconds: asNum(process.env.UI_SESSION_TTL_SECONDS, 60 * 60 * 24 * 7),
  uiAuthStatePath: path.resolve(__dirname, envStr(process.env.UI_AUTH_STATE_PATH, "./ui-auth.json")),
};

CFG.binanceEnabled = ["paper", "live"].includes(CFG.binanceMode);
CFG.ctraderEnabled = ["demo", "live"].includes(CFG.ctraderMode);

// Convenience fallback: if MT5 keys are not set, reuse SIGNAL_API_KEY.
if (CFG.signalApiKey) {
  if (CFG.mt5TvAlertApiKeys.size === 0) {
    CFG.mt5TvAlertApiKeys = new Set([CFG.signalApiKey]);
  }
  if (CFG.mt5EaApiKeys.size === 0) {
    CFG.mt5EaApiKeys = new Set([CFG.signalApiKey]);
  }
  if (CFG.mt5TvWebhookTokens.size === 0) {
    CFG.mt5TvWebhookTokens = new Set([CFG.signalApiKey]);
  }
}

function json(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const UI_SESSIONS = new Map();
const UI_ROLE_SYSTEM = "System";

function nowUnixSec() {
  return Math.floor(Date.now() / 1000);
}

function normalizeEmail(emailRaw) {
  return String(emailRaw || "").trim().toLowerCase();
}

function normalizeUserRole(roleRaw) {
  const role = String(roleRaw || "").trim().toLowerCase();
  if (role === "system") return "System";
  if (role === "admin") return "Admin";
  if (role === "user") return "User";
  if (role === "guest") return "Guest";
  return "User";
}

function normalizeUserActive(activeRaw, fallback = true) {
  if (typeof activeRaw === "boolean") return activeRaw;
  if (activeRaw === 1 || activeRaw === "1" || String(activeRaw || "").toLowerCase() === "true") return true;
  if (activeRaw === 0 || activeRaw === "0" || String(activeRaw || "").toLowerCase() === "false") return false;
  return Boolean(fallback);
}

function isSystemRole(roleRaw) {
  return normalizeUserRole(roleRaw) === UI_ROLE_SYSTEM;
}

function isValidEmail(emailRaw) {
  const email = normalizeEmail(emailRaw);
  return Boolean(email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
}

function uiPublicUserView(user) {
  return {
    user_id: String(user?.user_id || ""),
    user_name: String(user?.user_name || ""),
    email: normalizeEmail(user?.email),
    role: normalizeUserRole(user?.role),
    is_active: normalizeUserActive(user?.is_active, true),
    updated_at: String(user?.updated_at || ""),
    created_at: String(user?.created_at || ""),
  };
}

function maskApiKey(raw) {
  const val = String(raw || "");
  if (!val) return "";
  if (val.length <= 8) return `${val.slice(0, 2)}***${val.slice(-1)}`;
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
}

function uiPublicApiKeyView(row) {
  const keyValue = String(row?.key_value || row?.api_key || "");
  return {
    key_id: String(row?.key_id || ""),
    label: String(row?.label || ""),
    key_masked: maskApiKey(keyValue),
    is_active: normalizeUserActive(row?.is_active, true),
    created_at: String(row?.created_at || ""),
    updated_at: String(row?.updated_at || ""),
    last_used_at: String(row?.last_used_at || ""),
  };
}

function uiPublicAccountView(row) {
  return {
    account_id: String(row?.account_id || ""),
    user_id: String(row?.user_id || ""),
    name: String(row?.name || ""),
    balance: row?.balance === null || row?.balance === undefined ? null : Number(row.balance),
    status: String(row?.status || ""),
    metadata: row?.metadata && typeof row.metadata === "object" ? row.metadata : (row?.metadata ? row.metadata : null),
    created_at: String(row?.created_at || ""),
    updated_at: String(row?.updated_at || ""),
  };
}

function fallbackUserNameFromEmail(emailRaw) {
  const email = normalizeEmail(emailRaw);
  if (!email) return "System";
  return String(email.split("@")[0] || "System");
}

function makeSaltHex() {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(passwordRaw, saltHex) {
  return crypto.scryptSync(String(passwordRaw || ""), saltHex, 64).toString("hex");
}

function timingSafeEqHex(aHex, bHex) {
  try {
    const a = Buffer.from(String(aHex || ""), "hex");
    const b = Buffer.from(String(bHex || ""), "hex");
    if (a.length === 0 || b.length === 0 || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function uiDefaultAuthState(emailOverride = "") {
  const salt = makeSaltHex();
  const email = normalizeEmail(emailOverride || CFG.uiBootstrapEmail);
  return {
    email,
    user_name: fallbackUserNameFromEmail(email),
    role: UI_ROLE_SYSTEM,
    is_active: true,
    password_salt: salt,
    password_hash: hashPassword(CFG.uiBootstrapPassword, salt),
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

function parseLegacyUiAuthStateFromFile() {
  if (!fs.existsSync(CFG.uiAuthStatePath)) return null;
  try {
    const raw = fs.readFileSync(CFG.uiAuthStatePath, "utf8");
    const parsed = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object") return null;
    const email = normalizeEmail(parsed.email || CFG.uiBootstrapEmail);
    const passwordSalt = String(parsed.password_salt || "");
    const passwordHash = String(parsed.password_hash || "");
    if (!email || !passwordSalt || !passwordHash) return null;
    return {
      email,
      user_name: fallbackUserNameFromEmail(email),
      role: UI_ROLE_SYSTEM,
      is_active: true,
      password_salt: passwordSalt,
      password_hash: passwordHash,
      updated_at: parsed.updated_at || new Date().toISOString(),
      created_at: parsed.created_at || parsed.updated_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function uiReadAuthStateByEmail(emailRaw) {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;
  const b = await mt5Backend();
  if (!b.getUiAuthUser) return null;
  const row = await b.getUiAuthUser(email);
  if (!row) return null;
  return {
    user_id: String(row.user_id || CFG.mt5DefaultUserId),
    email: normalizeEmail(row.email),
    user_name: String(row.user_name || ""),
    role: normalizeUserRole(row.role || UI_ROLE_SYSTEM),
    is_active: normalizeUserActive(row.is_active, true),
    password_salt: String(row.password_salt || ""),
    password_hash: String(row.password_hash || ""),
    updated_at: normalizeIsoTimestamp(row.updated_at, new Date().toISOString()),
    created_at: normalizeIsoTimestamp(row.created_at, mt5NowIso()),
  };
}

async function uiReadAuthStateByUserId(userIdRaw) {
  const userId = String(userIdRaw || "").trim();
  if (!userId) return null;
  const b = await mt5Backend();
  if (!b.getUiAuthUserById) return null;
  const row = await b.getUiAuthUserById(userId);
  if (!row) return null;
  return {
    user_id: String(row.user_id || CFG.mt5DefaultUserId),
    email: normalizeEmail(row.email),
    user_name: String(row.user_name || ""),
    role: normalizeUserRole(row.role || UI_ROLE_SYSTEM),
    is_active: normalizeUserActive(row.is_active, true),
    password_salt: String(row.password_salt || ""),
    password_hash: String(row.password_hash || ""),
    updated_at: normalizeIsoTimestamp(row.updated_at, new Date().toISOString()),
    created_at: normalizeIsoTimestamp(row.created_at, mt5NowIso()),
  };
}

async function uiWriteAuthState(nextState) {
  const b = await mt5Backend();
  if (!b.upsertUiAuthUser) throw new Error("UI auth storage is not supported by the current backend");
  await b.upsertUiAuthUser({
    user_id: String(nextState.user_id || CFG.mt5DefaultUserId),
    email: normalizeEmail(nextState.email),
    user_name: String(nextState.user_name || fallbackUserNameFromEmail(nextState.email)),
    role: normalizeUserRole(nextState.role || UI_ROLE_SYSTEM),
    is_active: normalizeUserActive(nextState.is_active, true),
    password_salt: String(nextState.password_salt || ""),
    password_hash: String(nextState.password_hash || ""),
    updated_at: normalizeIsoTimestamp(nextState.updated_at, new Date().toISOString()),
    created_at: normalizeIsoTimestamp(nextState.created_at, mt5NowIso()),
  });
}

async function uiAuthUpdateProfile(sess, patch = {}) {
  const state = await uiReadAuthStateByUserId(sess.user_id) || await uiReadAuthStateByEmail(sess.email);
  if (!state) return { ok: false, error: "User not found" };
  const nextName = String((patch.user_name ?? patch.userName ?? state.user_name ?? "")).trim();
  const nextEmail = normalizeEmail(patch.email ?? state.email);
  if (!nextName) return { ok: false, error: "Username is required" };
  if (!isValidEmail(nextEmail)) return { ok: false, error: "Valid email is required" };

  const duplicate = await uiReadAuthStateByEmail(nextEmail);
  if (duplicate && String(duplicate.user_id || "") !== String(state.user_id || "")) {
    return { ok: false, error: "Email is already used by another user" };
  }

  const next = {
    user_id: String(state.user_id || CFG.mt5DefaultUserId),
    user_name: nextName,
    email: nextEmail,
    role: normalizeUserRole(state.role || UI_ROLE_SYSTEM),
    is_active: normalizeUserActive(state.is_active, true),
    password_salt: String(state.password_salt || ""),
    password_hash: String(state.password_hash || ""),
    updated_at: new Date().toISOString(),
    created_at: String(state.created_at || mt5NowIso()),
  };
  await uiWriteAuthState(next);
  return { ok: true, user: uiPublicUserView(next) };
}

async function uiListUsers() {
  const b = await mt5Backend();
  if (!b.listUiUsers) throw new Error("User listing is not supported by the current backend");
  const rows = await b.listUiUsers();
  return (Array.isArray(rows) ? rows : []).map(uiPublicUserView);
}

async function uiCreateUser(payload = {}) {
  const userName = String(payload.user_name ?? payload.userName ?? "").trim();
  const email = normalizeEmail(payload.email);
  const role = normalizeUserRole(payload.role || "User");
  const password = String(payload.password || "");
  if (!userName) return { ok: false, error: "Username is required" };
  if (!isValidEmail(email)) return { ok: false, error: "Valid email is required" };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
  const duplicate = await uiReadAuthStateByEmail(email);
  if (duplicate) return { ok: false, error: "Email is already used by another user" };
  const userId = String(payload.user_id || crypto.randomUUID()).trim();
  const salt = makeSaltHex();
  const now = mt5NowIso();
  await uiWriteAuthState({
    user_id: userId,
    user_name: userName,
    email,
    role,
    is_active: true,
    password_salt: salt,
    password_hash: hashPassword(password, salt),
    updated_at: now,
    created_at: now,
  });
  return {
    ok: true,
    user: uiPublicUserView({ user_id: userId, user_name: userName, email, role, is_active: true, updated_at: now, created_at: now }),
  };
}

async function uiUpdateUserById(userIdRaw, payload = {}) {
  const userId = String(userIdRaw || "").trim();
  if (!userId) return { ok: false, error: "user_id is required" };
  const current = await uiReadAuthStateByUserId(userId);
  if (!current) return { ok: false, error: "User not found" };
  const nextName = String((payload.user_name ?? payload.userName ?? current.user_name ?? "")).trim();
  const nextEmail = normalizeEmail(payload.email ?? current.email);
  const nextRole = normalizeUserRole(payload.role ?? current.role);
  const nextActive = normalizeUserActive(payload.is_active ?? payload.isActive ?? current.is_active, true);
  if (!nextName) return { ok: false, error: "Username is required" };
  if (!isValidEmail(nextEmail)) return { ok: false, error: "Valid email is required" };
  const duplicate = await uiReadAuthStateByEmail(nextEmail);
  if (duplicate && String(duplicate.user_id || "") !== userId) {
    return { ok: false, error: "Email is already used by another user" };
  }
  const isDefaultUser = userId === String(CFG.mt5DefaultUserId);
  const password = payload.password === undefined ? "" : String(payload.password || "");
  if (payload.password !== undefined && password && password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }
  const salt = payload.password ? makeSaltHex() : String(current.password_salt || "");
  const hash = payload.password ? hashPassword(password, salt) : String(current.password_hash || "");
  const next = {
    user_id: userId,
    user_name: nextName,
    email: nextEmail,
    role: isDefaultUser ? UI_ROLE_SYSTEM : nextRole,
    is_active: isDefaultUser ? true : nextActive,
    password_salt: salt,
    password_hash: hash,
    updated_at: mt5NowIso(),
    created_at: String(current.created_at || mt5NowIso()),
  };
  await uiWriteAuthState(next);
  return { ok: true, user: uiPublicUserView(next) };
}

async function uiGetUserDetail(userIdRaw) {
  const userId = String(userIdRaw || "").trim();
  if (!userId) return { ok: false, error: "user_id is required" };
  const user = await uiReadAuthStateByUserId(userId);
  if (!user) return { ok: false, error: "User not found" };
  const b = await mt5Backend();
  const accounts = b.listUserAccounts ? await b.listUserAccounts(userId) : [];
  const apiKeys = b.listUserApiKeys ? await b.listUserApiKeys(userId) : [];
  return {
    ok: true,
    user: uiPublicUserView(user),
    accounts: (accounts || []).map(uiPublicAccountView),
    api_keys: (apiKeys || []).map(uiPublicApiKeyView),
  };
}

async function uiUpsertUserAccount(userIdRaw, payload = {}) {
  const userId = String(userIdRaw || "").trim();
  if (!userId) return { ok: false, error: "user_id is required" };
  const user = await uiReadAuthStateByUserId(userId);
  if (!user) return { ok: false, error: "User not found" };
  const accountId = String(payload.account_id || payload.accountId || crypto.randomUUID()).trim();
  const name = String(payload.name || "").trim();
  if (!accountId) return { ok: false, error: "account_id is required" };
  if (!name) return { ok: false, error: "Account name is required" };
  const b = await mt5Backend();
  if (!b.upsertUserAccount) return { ok: false, error: "Account management is not supported by this backend" };
  const row = await b.upsertUserAccount(userId, {
    account_id: accountId,
    name,
    balance: payload.balance === null || payload.balance === undefined || payload.balance === "" ? null : Number(payload.balance),
    status: String(payload.status || ""),
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : null,
  });
  return { ok: true, account: uiPublicAccountView(row || { account_id: accountId, user_id: userId, name }) };
}

async function uiDeleteUserAccount(userIdRaw, accountIdRaw) {
  const userId = String(userIdRaw || "").trim();
  const accountId = String(accountIdRaw || "").trim();
  if (!userId || !accountId) return { ok: false, error: "user_id and account_id are required" };
  const b = await mt5Backend();
  if (!b.deleteUserAccount) return { ok: false, error: "Account management is not supported by this backend" };
  await b.deleteUserAccount(userId, accountId);
  return { ok: true };
}

async function uiCreateUserApiKey(userIdRaw, payload = {}) {
  const userId = String(userIdRaw || "").trim();
  if (!userId) return { ok: false, error: "user_id is required" };
  const user = await uiReadAuthStateByUserId(userId);
  if (!user) return { ok: false, error: "User not found" };
  const label = String(payload.label || "").trim();
  if (!label) return { ok: false, error: "Key label is required" };
  const b = await mt5Backend();
  if (!b.createUserApiKey) return { ok: false, error: "API key management is not supported by this backend" };
  const keyValue = `tk_${crypto.randomBytes(24).toString("hex")}`;
  const created = await b.createUserApiKey(userId, { label, key_value: keyValue, is_active: true });
  return {
    ok: true,
    api_key: uiPublicApiKeyView(created || { key_id: "", label, key_value: keyValue, is_active: true }),
    key_value: keyValue,
  };
}

async function uiUpdateUserApiKey(userIdRaw, keyIdRaw, payload = {}) {
  const userId = String(userIdRaw || "").trim();
  const keyId = String(keyIdRaw || "").trim();
  if (!userId || !keyId) return { ok: false, error: "user_id and key_id are required" };
  const b = await mt5Backend();
  if (!b.updateUserApiKey) return { ok: false, error: "API key management is not supported by this backend" };
  const row = await b.updateUserApiKey(userId, keyId, {
    label: payload.label === undefined ? undefined : String(payload.label || "").trim(),
    is_active: payload.is_active === undefined ? undefined : normalizeUserActive(payload.is_active, true),
  });
  if (!row) return { ok: false, error: "API key not found" };
  return { ok: true, api_key: uiPublicApiKeyView(row) };
}

async function uiDeleteUserApiKey(userIdRaw, keyIdRaw) {
  const userId = String(userIdRaw || "").trim();
  const keyId = String(keyIdRaw || "").trim();
  if (!userId || !keyId) return { ok: false, error: "user_id and key_id are required" };
  const b = await mt5Backend();
  if (!b.deleteUserApiKey) return { ok: false, error: "API key management is not supported by this backend" };
  await b.deleteUserApiKey(userId, keyId);
  return { ok: true };
}

async function uiEnsureAuthBootstrap() {
  const targetEmail = normalizeEmail(CFG.uiBootstrapEmail);
  const existing = await uiReadAuthStateByEmail(targetEmail);
  if (existing && existing.password_salt && existing.password_hash) return existing;

  const legacy = parseLegacyUiAuthStateFromFile();
  const seed = legacy || uiDefaultAuthState(targetEmail);
  seed.user_id = String(seed.user_id || CFG.mt5DefaultUserId);
  seed.user_name = String(seed.user_name || fallbackUserNameFromEmail(seed.email));
  seed.role = normalizeUserRole(seed.role || UI_ROLE_SYSTEM);
  seed.is_active = normalizeUserActive(seed.is_active, true);
  seed.created_at = String(seed.created_at || seed.updated_at || mt5NowIso());
  await uiWriteAuthState(seed);
  return seed;
}

function parseCookies(req) {
  const raw = String(req.headers.cookie || "");
  const out = {};
  if (!raw) return out;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function setUiSessionCookie(res, token) {
  const ttl = Math.max(300, Number.isFinite(CFG.uiSessionTtlSeconds) ? CFG.uiSessionTtlSeconds : 60 * 60 * 24 * 7);
  res.setHeader("Set-Cookie", `tvb_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}`);
}

function clearUiSessionCookie(res) {
  res.setHeader("Set-Cookie", "tvb_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function createUiSession(user) {
  const ttl = Math.max(300, Number.isFinite(CFG.uiSessionTtlSeconds) ? CFG.uiSessionTtlSeconds : 60 * 60 * 24 * 7);
  const token = crypto.randomBytes(32).toString("hex");
  const email = normalizeEmail(user?.email || "");
  const userId = String(user?.user_id || CFG.mt5DefaultUserId);
  const userName = String(user?.user_name || fallbackUserNameFromEmail(email));
  const role = normalizeUserRole(user?.role || UI_ROLE_SYSTEM);
  const isActive = normalizeUserActive(user?.is_active, true);
  UI_SESSIONS.set(token, {
    email,
    user_id: userId,
    user_name: userName,
    role,
    is_active: isActive,
    created_at: nowUnixSec(),
    expires_at: nowUnixSec() + ttl,
  });
  return token;
}

function getUiSessionFromReq(req) {
  if (!CFG.uiAuthEnabled) {
    return {
      ok: true,
      token: "",
      email: normalizeEmail(CFG.uiBootstrapEmail),
      user_id: CFG.mt5DefaultUserId,
      user_name: fallbackUserNameFromEmail(CFG.uiBootstrapEmail),
      role: UI_ROLE_SYSTEM,
      is_active: true,
    };
  }
  const cookies = parseCookies(req);
  const token = String(cookies.tvb_session || "");
  if (!token) return { ok: false, email: "", token: "", user_id: "", user_name: "", role: "", is_active: false };
  const sess = UI_SESSIONS.get(token);
  if (!sess) return { ok: false, email: "", token, user_id: "", user_name: "", role: "", is_active: false };
  if (Number(sess.expires_at || 0) <= nowUnixSec()) {
    UI_SESSIONS.delete(token);
    return { ok: false, email: "", token, user_id: "", user_name: "", role: "", is_active: false };
  }
  if (!normalizeUserActive(sess.is_active, true)) {
    UI_SESSIONS.delete(token);
    return { ok: false, email: "", token, user_id: "", user_name: "", role: "", is_active: false };
  }
  return {
    ok: true,
    token,
    email: normalizeEmail(sess.email),
    user_id: String(sess.user_id || CFG.mt5DefaultUserId),
    user_name: String(sess.user_name || fallbackUserNameFromEmail(sess.email)),
    role: normalizeUserRole(sess.role || UI_ROLE_SYSTEM),
    is_active: true,
  };
}

async function uiAuthGetVerifiedUser(emailRaw, passwordRaw) {
  const email = normalizeEmail(emailRaw);
  const state = await uiReadAuthStateByEmail(email);
  if (!state) return null;
  if (!normalizeUserActive(state.is_active, true)) return null;
  if (!email || email !== normalizeEmail(state.email)) return null;
  const actualHash = hashPassword(String(passwordRaw || ""), state.password_salt);
  if (!timingSafeEqHex(actualHash, state.password_hash)) return null;
  return {
    user_id: String(state.user_id || CFG.mt5DefaultUserId),
    user_name: String(state.user_name || fallbackUserNameFromEmail(state.email)),
    email: normalizeEmail(state.email),
    role: normalizeUserRole(state.role || UI_ROLE_SYSTEM),
    is_active: normalizeUserActive(state.is_active, true),
  };
}

async function uiAuthChangePassword(emailRaw, currentPassword, newPassword) {
  const state = await uiReadAuthStateByEmail(emailRaw);
  if (!state) return { ok: false, error: "User not found" };
  const currentHash = hashPassword(String(currentPassword || ""), state.password_salt);
  if (!timingSafeEqHex(currentHash, state.password_hash)) return { ok: false, error: "Current password is incorrect" };
  if (String(newPassword || "").length < 8) return { ok: false, error: "New password must be at least 8 characters" };
  const nextSalt = makeSaltHex();
  const next = {
    user_id: String(state.user_id || CFG.mt5DefaultUserId),
    email: state.email,
    user_name: String(state.user_name || fallbackUserNameFromEmail(state.email)),
    role: normalizeUserRole(state.role || UI_ROLE_SYSTEM),
    is_active: normalizeUserActive(state.is_active, true),
    password_salt: nextSalt,
    password_hash: hashPassword(String(newPassword || ""), nextSalt),
    updated_at: new Date().toISOString(),
    created_at: String(state.created_at || mt5NowIso()),
  };
  await uiWriteAuthState(next);
  return { ok: true };
}

function contentTypeByExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    case ".map":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function serveUiFile(res, filePath, method = "GET") {
  const body = fs.readFileSync(filePath);
  const headers = {
    "Content-Type": contentTypeByExt(filePath),
    "Content-Length": body.length,
    "Cache-Control": filePath.endsWith(".html") ? "no-store" : "public, max-age=86400",
  };
  res.writeHead(200, headers);
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(body);
}

function normalizeHostHeader(hostRaw) {
  return String(hostRaw || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

function isTradeHost(hostname) {
  return hostname === "trade.mozasolution.com";
}

function isLandingHost(hostname) {
  return hostname === "mozasolution.com" || hostname === "www.mozasolution.com";
}

function isApiPath(pathname) {
  const p = String(pathname || "");
  return (
    p === "/health" ||
    p === "/mt5/health" ||
    p === "/csv" ||
    p === "/auth" ||
    p.startsWith("/auth/") ||
    p === "/signal" ||
    p.startsWith("/signal/") ||
    p.startsWith("/mt5/") ||
    p.startsWith("/webhook")
  );
}

function stripWebhookPrefix(pathname) {
  const p = String(pathname || "");
  if (p === "/webhook") return "/";
  if (p.startsWith("/webhook/")) return p.slice("/webhook".length) || "/";
  return p;
}

function tryServeLanding(url, req, res, hostname) {
  if (!["GET", "HEAD"].includes(req.method)) return false;
  if (!isLandingHost(hostname)) return false;
  if (!fs.existsSync(CFG.landingDistPath)) {
    return json(res, 404, { ok: false, error: `Landing dist folder not found: ${CFG.landingDistPath}` });
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    const indexPath = path.join(CFG.landingDistPath, "index.html");
    if (fs.existsSync(indexPath)) {
      serveUiFile(res, indexPath, req.method);
      return true;
    }
    return json(res, 404, { ok: false, error: `Landing entry not found: ${indexPath}` });
  }

  if (!url.pathname.startsWith("/landing-assets/")) return false;
  const rel = url.pathname.replace(/^\/landing-assets\/+/, "");
  if (!rel || rel.includes("..")) return json(res, 400, { ok: false, error: "Invalid landing asset path" });
  const requested = path.join(CFG.landingDistPath, "assets", rel);
  if (!fs.existsSync(requested) || !fs.statSync(requested).isFile()) {
    return json(res, 404, { ok: false, error: "Landing asset not found" });
  }
  serveUiFile(res, requested, req.method);
  return true;
}

function tryServeUi(url, req, res, hostname) {
  if (!["GET", "HEAD"].includes(req.method)) return false;
  const isTradeRootUiPath = isTradeHost(hostname) && !isApiPath(url.pathname);
  const isUiPath = url.pathname.startsWith("/ui") || isTradeRootUiPath;
  const isUiAssetPath = url.pathname.startsWith("/assets/");
  if (!isUiPath && !isUiAssetPath) return false;
  if (!fs.existsSync(CFG.uiDistPath)) {
    return json(res, 404, { ok: false, error: `UI dist folder not found: ${CFG.uiDistPath}` });
  }

  let rel;
  if (isUiAssetPath) {
    rel = url.pathname;
  } else if (isTradeRootUiPath) {
    rel = url.pathname;
    if (!rel || rel === "/") rel = "/index.html";
  } else {
    rel = url.pathname.slice("/ui".length);
    if (!rel || rel === "/") rel = "/index.html";
  }
  if (rel.includes("..")) {
    return json(res, 400, { ok: false, error: "Invalid UI path" });
  }

  const normalizedRel = rel.replace(/^\/+/, "");
  const requested = path.join(CFG.uiDistPath, normalizedRel);
  if (fs.existsSync(requested) && fs.statSync(requested).isFile()) {
    serveUiFile(res, requested, req.method);
    return true;
  }

  if (isUiAssetPath) {
    return json(res, 404, { ok: false, error: "UI asset not found" });
  }

  // SPA fallback
  const indexPath = path.join(CFG.uiDistPath, "index.html");
  if (fs.existsSync(indexPath)) {
    serveUiFile(res, indexPath, req.method);
    return true;
  }
  return json(res, 404, { ok: false, error: `UI entry not found: ${indexPath}` });
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function normalizeSide(sideRaw) {
  const s = String(sideRaw || "").toUpperCase();
  if (s === "BUY" || s === "LONG") return "BUY";
  if (s === "SELL" || s === "SHORT") return "SELL";
  throw new Error("Invalid side");
}

function normalizeSignal(payload) {
  const strategy = String(payload.strategy || payload.system || "UnknownStrategy");
  const symbol = String(payload.symbol || payload.ticker || "").toUpperCase();
  const side = normalizeSide(payload.side || payload.action);
  const tradeId = envStr(payload.signal_id ?? payload.id ?? payload.trade_id ?? payload.tradeId);
  const timeframe = String(payload.timeframe || payload.tf || "n/a");
  const price = asNum(payload.price ?? payload.entry, NaN);
  const sl = asNum(payload.stop_loss ?? payload.sl, NaN);
  const tp = asNum(payload.take_profit ?? payload.tp, NaN);
  const note = String(payload.note || payload.comment || "");
  const signalTime = payload.time || payload.timestamp || new Date().toISOString();
  const quantity = asNum(payload.quantity ?? payload.qty, NaN);
  const userId = envStr(payload.user_id ?? payload.userId ?? payload.user ?? CFG.mt5DefaultUserId, CFG.mt5DefaultUserId);
  const rrPlanned = asNum(payload.rr ?? payload.risk_reward, NaN);
  const riskMoneyPlanned = asNum(payload.risk_money ?? payload.money_risk ?? payload.riskMoney, NaN);
  const entryModel = String(payload.entry_model ?? payload.entryModel ?? "");

  if (!symbol) throw new Error("Missing symbol");
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid price");

  return {
    strategy,
    symbol,
    side,
    trade_id: tradeId || "-",
    timeframe,
    price,
    sl: Number.isFinite(sl) ? sl : null,
    tp: Number.isFinite(tp) ? tp : null,
    note,
    signalTime,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    user_id: userId,
    entry_model: entryModel || null,
    rr_planned: Number.isFinite(rrPlanned) ? rrPlanned : null,
    risk_money_planned: Number.isFinite(riskMoneyPlanned) ? riskMoneyPlanned : null,
    raw: payload,
  };
}

function enforceRiskAndPolicy(signal) {
  if (CFG.allowSymbols.length > 0 && !CFG.allowSymbols.includes(signal.symbol)) {
    throw new Error(`Symbol ${signal.symbol} is not in ALLOW_SYMBOLS`);
  }

  if (Number.isFinite(CFG.maxRiskPct) && signal.sl !== null) {
    const risk = Math.abs(signal.price - signal.sl);
    const riskPct = signal.price > 0 ? (risk / signal.price) * 100 : 0;
    if (riskPct > CFG.maxRiskPct) {
      throw new Error(`Risk ${riskPct.toFixed(2)}% exceeds MAX_RISK_PCT ${CFG.maxRiskPct}%`);
    }
  }
}

function formatSignal(signal) {
  return [
    `${signal.symbol} | ${signal.side} | ${signal.trade_id || "-"} | ${signal.timeframe || "n/a"}`,
    `Entry:${signal.price} SL:${signal.sl ?? "n/a"} TP:${signal.tp ?? "n/a"} | ${signal.strategy || "-"} | ${signal.note || "-"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendTelegram(text) {
  if (!CFG.telegramBotToken || !CFG.telegramChatId) {
    return { ok: false, skipped: true, reason: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID" };
  }
  const endpoint = `https://api.telegram.org/bot${CFG.telegramBotToken}/sendMessage`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CFG.telegramChatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }
  return data;
}

function binanceBaseUrl() {
  if (CFG.binanceProduct === "um_futures") {
    return CFG.binanceMode === "live"
      ? "https://fapi.binance.com"
      : "https://testnet.binancefuture.com";
  }
  return CFG.binanceMode === "live"
    ? "https://api.binance.com"
    : "https://testnet.binance.vision";
}

function signQuery(query, secret) {
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

async function binanceSignedRequest(method, route, params) {
  const timestamp = Date.now();
  const allParams = {
    ...params,
    recvWindow: CFG.binanceRecvWindow,
    timestamp,
  };
  const query = new URLSearchParams(allParams).toString();
  const signature = signQuery(query, CFG.binanceApiSecret);
  const url = `${binanceBaseUrl()}${route}?${query}&signature=${signature}`;

  const res = await fetch(url, {
    method,
    headers: { "X-MBX-APIKEY": CFG.binanceApiKey },
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Binance ${route} failed ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function resolveBinanceSizing(signal) {
  if (signal.quantity && signal.quantity > 0) {
    return { quantity: String(signal.quantity) };
  }
  if (Number.isFinite(CFG.binanceDefaultQty) && CFG.binanceDefaultQty > 0) {
    return { quantity: String(CFG.binanceDefaultQty) };
  }
  if (
    CFG.binanceProduct === "spot" &&
    signal.side === "BUY" &&
    Number.isFinite(CFG.binanceDefaultQuoteQty) &&
    CFG.binanceDefaultQuoteQty > 0
  ) {
    return { quoteOrderQty: String(CFG.binanceDefaultQuoteQty) };
  }
  throw new Error("No valid quantity. Provide signal.quantity or BINANCE_DEFAULT_QTY (or BINANCE_DEFAULT_QUOTE_QTY for spot BUY)");
}

async function executeBinance(signal) {
  if (!CFG.binanceEnabled) {
    const reason = CFG.binanceMode
      ? "BINANCE_MODE invalid (use paper|live, or empty to disable)"
      : "BINANCE_MODE empty (disabled)";
    return { broker: "binance", status: "skipped", reason };
  }
  if (!CFG.binanceApiKey || !CFG.binanceApiSecret) {
    return { broker: "binance", status: "skipped", reason: "Missing BINANCE_API_KEY/SECRET" };
  }
  if (!["spot", "um_futures"].includes(CFG.binanceProduct)) {
    throw new Error("BINANCE_PRODUCT must be spot|um_futures");
  }

  const clientOrderId = `tv_${signal.strategy}_${signal.symbol}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 36);
  const sizing = resolveBinanceSizing(signal);


  if (CFG.binanceProduct === "spot") {
    const order = await binanceSignedRequest("POST", "/api/v3/order", {
      symbol: signal.symbol,
      side: signal.side,
      type: "MARKET",
      newClientOrderId: clientOrderId,
      ...sizing,
    });

    return {
      broker: "binance",
      status: "submitted",
      product: "spot",
      orderId: order.orderId,
      clientOrderId,
    };
  }

  const entry = await binanceSignedRequest("POST", "/fapi/v1/order", {
    symbol: signal.symbol,
    side: signal.side,
    type: "MARKET",
    newClientOrderId: clientOrderId,
    quantity: sizing.quantity,
  });

  const protective = [];
  const closeSide = signal.side === "BUY" ? "SELL" : "BUY";

  if (signal.sl !== null) {
    const slRes = await binanceSignedRequest("POST", "/fapi/v1/order", {
      symbol: signal.symbol,
      side: closeSide,
      type: "STOP_MARKET",
      stopPrice: String(signal.sl),
      closePosition: "true",
      reduceOnly: "true",
      workingType: "MARK_PRICE",
    });
    protective.push({ type: "SL", orderId: slRes.orderId });
  }

  if (signal.tp !== null) {
    const tpRes = await binanceSignedRequest("POST", "/fapi/v1/order", {
      symbol: signal.symbol,
      side: closeSide,
      type: "TAKE_PROFIT_MARKET",
      stopPrice: String(signal.tp),
      closePosition: "true",
      reduceOnly: "true",
      workingType: "MARK_PRICE",
    });
    protective.push({ type: "TP", orderId: tpRes.orderId });
  }

  return {
    broker: "binance",
    status: "submitted",
    product: "um_futures",
    orderId: entry.orderId,
    clientOrderId,
    protective,
  };
}

async function executeCTrader(signal) {
  if (!CFG.ctraderEnabled) {
    const reason = CFG.ctraderMode
      ? "CTRADER_MODE invalid (use demo|live, or empty to disable)"
      : "CTRADER_MODE empty (disabled)";
    return { broker: "ctrader", status: "skipped", reason };
  }
  if (!CFG.ctraderExecutorUrl) {
    return { broker: "ctrader", status: "skipped", reason: "Set CTRADER_EXECUTOR_URL" };
  }


  const headers = { "Content-Type": "application/json" };
  if (CFG.ctraderExecutorApiKey) {
    headers["x-api-key"] = CFG.ctraderExecutorApiKey;
  }

  const res = await fetch(CFG.ctraderExecutorUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mode: CFG.ctraderMode,
      signal,
    }),
  });

  const bodyText = await res.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = { raw: bodyText };
  }

  if (!res.ok) {
    throw new Error(`cTrader executor failed ${res.status}: ${JSON.stringify(body)}`);
  }

  return {
    broker: "ctrader",
    status: "submitted",
    mode: CFG.ctraderMode,
    response: body,
  };
}

function buildExecSummary(execResults) {
  return execResults
    .map((r) => {
      const broker = r.broker || "broker";
      const status = r.status || "unknown";
      const detail = r.reason ? `(${r.reason})` : r.orderId ? `(#${r.orderId})` : "";
      return `${broker}:${status}${detail ? " " + detail : ""}`;
    })
    .join(" | ");
}

async function handleSignal(payload) {
  const signal = normalizeSignal(payload);
  enforceRiskAndPolicy(signal);

  const execResults = [];
  const mt5Res = await executeMt5(signal);
  execResults.push(mt5Res);

  const binanceRes = await executeBinance(signal);
  execResults.push(binanceRes);

  const ctraderRes = await executeCTrader(signal);
  execResults.push(ctraderRes);

  const text = formatSignal(signal);
  const telegram = await sendTelegram(text);

  return {
    ok: true,
    signal,
    execution: execResults,
    telegram,
  };
}

// ==================== MT5 bridge (merged routes) ====================
function mt5NowIso() {
  return new Date().toISOString();
}

function mt5RenewSignalIdBase(oldId = "") {
  const raw = String(oldId || "").trim();
  if (!raw) return "renewed";
  return raw.replace(/\.\d+$/, "");
}

function mt5RenewSignalIdFromExisting(baseId, existingIds) {
  const base = mt5RenewSignalIdBase(baseId);
  let max = 0;
  const ids = Array.isArray(existingIds) ? existingIds : [];
  for (const idRaw of ids) {
    const id = String(idRaw || "");
    if (id === base) {
      max = Math.max(max, 0);
      continue;
    }
    const match = id.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(\\d+)$`));
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${base}.${max + 1}`;
}

let MT5_BACKEND = null;

function mt5LegacyJsonPath() {
  return path.join(path.dirname(CFG.mt5DbPath), "mt5-signals.json");
}

function mt5NormalizeStorage(storageRaw) {
  const s = String(storageRaw || "").trim().toLowerCase();
  if (!s) return "sqlite";
  if (["json", "sqlite", "postgres"].includes(s)) return s;
  throw new Error(`Invalid MT5_STORAGE=${storageRaw}. Use json|sqlite|postgres`);
}

function mt5EnsureJsonDbFile() {
  if (!fs.existsSync(CFG.mt5DbPath)) {
    fs.writeFileSync(CFG.mt5DbPath, JSON.stringify({ users: [], accounts: [], user_api_keys: [], signals: [], signal_events: [] }, null, 2));
  }
}

function mt5EnsureJsonDefaultUser(db) {
  if (!Array.isArray(db.users)) db.users = [];
  const defaultUserId = String(CFG.mt5DefaultUserId || "default");
  const now = mt5NowIso();
  let defaultUser = db.users.find((u) => String(u.user_id || "") === defaultUserId);
  if (!defaultUser) {
    defaultUser = {
      user_id: defaultUserId,
      user_name: "System",
      email: "",
      role: UI_ROLE_SYSTEM,
      is_active: true,
      password_salt: "",
      password_hash: "",
      updated_at: now,
      created_at: now,
    };
    db.users.push(defaultUser);
  } else {
    defaultUser.user_name = String(defaultUser.user_name || "System");
    defaultUser.email = normalizeEmail(defaultUser.email);
    defaultUser.role = normalizeUserRole(defaultUser.role || UI_ROLE_SYSTEM);
    defaultUser.is_active = normalizeUserActive(defaultUser.is_active, true);
    defaultUser.password_salt = String(defaultUser.password_salt || "");
    defaultUser.password_hash = String(defaultUser.password_hash || "");
    defaultUser.updated_at = String(defaultUser.updated_at || now);
    defaultUser.created_at = String(defaultUser.created_at || now);
  }
  return defaultUser;
}

function mt5ReadJsonDb() {
  mt5EnsureJsonDbFile();
  const db = JSON.parse(fs.readFileSync(CFG.mt5DbPath, "utf8"));
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.accounts)) db.accounts = [];
  if (!Array.isArray(db.user_api_keys)) db.user_api_keys = [];
  if (!Array.isArray(db.signals)) db.signals = [];
  if (!Array.isArray(db.signal_events)) db.signal_events = [];
  if (!Array.isArray(db.ui_auth_users)) db.ui_auth_users = [];
  const defaultUser = mt5EnsureJsonDefaultUser(db);
  if ((!defaultUser.password_hash || !defaultUser.password_salt || !defaultUser.email) && db.ui_auth_users.length > 0) {
    const legacyEmail = normalizeEmail(CFG.uiBootstrapEmail);
    const legacy = db.ui_auth_users.find((u) => normalizeEmail(u.email) === legacyEmail) || db.ui_auth_users[0];
    if (legacy) {
      const legacyMail = normalizeEmail(legacy.email || legacyEmail);
      defaultUser.user_name = String(defaultUser.user_name || fallbackUserNameFromEmail(legacyMail));
      defaultUser.email = legacyMail;
      defaultUser.role = UI_ROLE_SYSTEM;
      defaultUser.is_active = true;
      defaultUser.password_salt = String(legacy.password_salt || "");
      defaultUser.password_hash = String(legacy.password_hash || "");
      defaultUser.updated_at = String(legacy.updated_at || mt5NowIso());
    }
  }
  return db;
}

function mt5WriteJsonDb(db) {
  fs.writeFileSync(CFG.mt5DbPath, JSON.stringify(db, null, 2));
}

function mt5MapDbRow(row) {
  if (!row) return null;
  const rawInput = row.raw_json || {};
  const raw = typeof rawInput === "object" && rawInput !== null ? { ...rawInput } : {};
  const rawPrice = Number(raw.price);
  if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
    raw.price = null;
  }
  const rawEntry = Number(raw.entry);
  if (!Number.isFinite(rawEntry) || rawEntry <= 0) {
    raw.entry = null;
  }
  const execEntry = row.entry_price_exec === null || row.entry_price_exec === undefined ? null : Number(row.entry_price_exec);
  const execSl = row.sl_exec === null || row.sl_exec === undefined ? null : Number(row.sl_exec);
  const execTp = row.tp_exec === null || row.tp_exec === undefined ? null : Number(row.tp_exec);
  return {
    signal_id: String(row.signal_id),
    created_at: String(row.created_at),
    user_id: String(row.user_id || CFG.mt5DefaultUserId || "default"),
    source: String(row.source || ""),
    action: String(row.action || ""),
    symbol: String(row.symbol || ""),
    volume: Number(row.volume),
    sl: row.sl === null || row.sl === undefined ? null : Number(row.sl),
    tp: row.tp === null || row.tp === undefined ? null : Number(row.tp),
    rr_planned: row.rr_planned === null || row.rr_planned === undefined ? null : Number(row.rr_planned),
    risk_money_planned: row.risk_money_planned === null || row.risk_money_planned === undefined ? null : Number(row.risk_money_planned),
    pnl_money_realized: row.pnl_money_realized === null || row.pnl_money_realized === undefined ? null : Number(row.pnl_money_realized),
    entry_price_exec: Number.isFinite(execEntry) && execEntry > 0 ? execEntry : null,
    sl_exec: Number.isFinite(execSl) && execSl > 0 ? execSl : null,
    tp_exec: Number.isFinite(execTp) && execTp > 0 ? execTp : null,
    note: String(row.note || ""),
    raw_json: raw,
    signal_tf: String(row.signal_tf || raw.signal_tf || raw.signalTf || raw.sourceTf || raw.timeframe || ""),
    chart_tf: String(row.chart_tf || raw.chart_tf || raw.chartTf || ""),
    status: String(row.status || ""),
    locked_at: row.locked_at ?? null,
    ack_at: row.ack_at ?? null,
    opened_at: row.opened_at ?? null,
    closed_at: row.closed_at ?? null,
    ack_status: row.ack_status ?? null,
    ack_ticket: row.ack_ticket ?? null,
    ack_error: row.ack_error ?? null,
  };
}

function mt5GetLegacyRows() {
  const legacyPath = mt5LegacyJsonPath();
  if (!fs.existsSync(legacyPath)) return [];
  const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
  return Array.isArray(legacy?.signals) ? legacy.signals : [];
}

async function mt5InitBackend() {
  if (MT5_BACKEND) return MT5_BACKEND;
  const storage = mt5NormalizeStorage(CFG.mt5Storage);

  if (storage === "json") {
    MT5_BACKEND = {
      storage,
      info: { path: CFG.mt5DbPath },
      async upsertSignal(signal) {
        const db = mt5ReadJsonDb();
        const idx = db.signals.findIndex((s) => s.signal_id === signal.signal_id);
        if (idx >= 0) db.signals[idx] = signal;
        else db.signals.push(signal);
        mt5WriteJsonDb(db);
      },
      async pullAndLockNextSignal() {
        const db = mt5ReadJsonDb();
        const arr = db.signals
          .filter((s) => s.status === "NEW")
          .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
        if (!arr.length) return null;
        const signal = arr[0];
        signal.status = "LOCKED";
        signal.locked_at = mt5NowIso();
        mt5WriteJsonDb(db);
        return signal;
      },
      async pullAndLockSignalById(signalId) {
        const db = mt5ReadJsonDb();
        const sig = db.signals.find((s) => String(s.signal_id) === String(signalId) && s.status === "NEW");
        if (!sig) return null;
        sig.status = "LOCKED";
        sig.locked_at = mt5NowIso();
        mt5WriteJsonDb(db);
        return sig;
      },
      async findSignalById(signalId) {
        const db = mt5ReadJsonDb();
        return db.signals.find((s) => s.signal_id === signalId) || null;
      },
      async ackSignal(signalId, status, ticket, error) {
        const db = mt5ReadJsonDb();
        const sig = db.signals.find((s) => s.signal_id === signalId);
        if (!sig) return { changes: 0 };
        const retryable = mt5IsRetryableConnectivityFail(status, error);
        const internalStatus = retryable ? "NEW" : mt5StatusToInternal(status);
        const ackStatus = mt5CanonicalStoredStatus(status);
        const now = mt5NowIso();
        sig.status = internalStatus;
        sig.ack_at = mt5NowIso();
        sig.ack_status = ackStatus;
        sig.ack_ticket = ticket ?? null;
        sig.ack_error = error ?? null;
        if (retryable) {
          sig.locked_at = null;
        }
        if ((internalStatus === "PLACED" || internalStatus === "START") && !sig.opened_at) {
          sig.opened_at = now;
        }
        if (internalStatus === "TP" || internalStatus === "SL" || internalStatus === "FAIL" || internalStatus === "CANCEL" || internalStatus === "EXPIRED") {
          sig.closed_at = now;
        }
        mt5WriteJsonDb(db);
        return { changes: 1 };
      },
      async listSignals(limit, statusFilter) {
        const db = mt5ReadJsonDb();
        const rows = db.signals
          .filter((s) => !statusFilter || String(s.status || "") === statusFilter)
          .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
          .slice(0, limit);
        return rows.map((r) => ({ ...r }));
      },
      async appendSignalEvent(signalId, eventType, payload = {}) {
        const db = mt5ReadJsonDb();
        db.signal_events.push({
          id: String(crypto.randomUUID()),
          signal_id: String(signalId),
          event_type: String(eventType),
          event_time: mt5NowIso(),
          payload_json: payload || {},
        });
        mt5WriteJsonDb(db);
      },
      async listSignalEvents(signalId, limit = 200) {
        const db = mt5ReadJsonDb();
        return db.signal_events
          .filter((e) => String(e.signal_id) === String(signalId))
          .sort((a, b) => (String(a.event_time) > String(b.event_time) ? -1 : 1))
          .slice(0, Math.max(1, Math.min(2000, Number(limit) || 200)));
      },
      async pruneOldSignals(days) {
        const db = mt5ReadJsonDb();
        const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
        const terminals = new Set(mt5TerminalStatuses());
        const before = db.signals.length;
        db.signals = db.signals.filter((s) => {
          const status = String(s.status || "");
          if (!terminals.has(status)) return true;
          const t = Date.parse(String(s.created_at || ""));
          if (!Number.isFinite(t)) return true;
          return t >= cutoffMs;
        });
        const removed = before - db.signals.length;
        if (removed > 0) mt5WriteJsonDb(db);
        return { removed, remaining: db.signals.length };
      },
      async deleteSignalsByIds(signalIds) {
        const ids = new Set((signalIds || []).map((s) => String(s || "")).filter(Boolean));
        if (!ids.size) return { deleted: 0 };
        const db = mt5ReadJsonDb();
        const before = db.signals.length;
        db.signals = db.signals.filter((s) => !ids.has(String(s.signal_id || "")));
        db.signal_events = (db.signal_events || []).filter((e) => !ids.has(String(e.signal_id || "")));
        const deleted = before - db.signals.length;
        if (deleted > 0) mt5WriteJsonDb(db);
        return { deleted };
      },
      async cancelSignalsByIds(signalIds) {
        const ids = new Set((signalIds || []).map((s) => String(s || "")).filter(Boolean));
        if (!ids.size) return { updated: 0, updated_ids: [] };
        const db = mt5ReadJsonDb();
        const now = mt5NowIso();
        const updatedIds = [];
        for (const s of db.signals) {
          const id = String(s.signal_id || "");
          if (!ids.has(id)) continue;
          const cur = mt5CanonicalStoredStatus(s.status);
          if (!(cur === "NEW" || cur === "LOCKED" || cur === "START" || cur === "PLACED")) continue;
          s.status = "CANCEL";
          s.closed_at = now;
          updatedIds.push(id);
        }
        if (updatedIds.length > 0) mt5WriteJsonDb(db);
        return { updated: updatedIds.length, updated_ids: updatedIds };
      },
      async renewSignalsByIds(signalIds) {
        const ids = new Set((signalIds || []).map((s) => String(s || "")).filter(Boolean));
        if (!ids.size) return { updated: 0, updated_ids: [] };
        const db = mt5ReadJsonDb();
        const updatedIds = [];
        const now = mt5NowIso();
        const renewedFromIds = new Set();
        const existingIds = new Set((db.signals || []).map((s) => String(s.signal_id || "")));
        for (const s of db.signals) {
          const id = String(s.signal_id || "");
          if (!ids.has(id)) continue;
          const cur = mt5CanonicalStoredStatus(s.status);
          if (cur === "NEW" || cur === "LOCKED") continue;
          const renewedId = mt5RenewSignalIdFromExisting(id, [...existingIds]);
          s.signal_id = renewedId;
          s.created_at = now;
          s.status = "NEW";
          s.locked_at = null;
          s.ack_at = null;
          s.opened_at = null;
          s.closed_at = null;
          s.ack_status = null;
          s.ack_ticket = null;
          s.ack_error = null;
          updatedIds.push(renewedId);
          renewedFromIds.add(id);
          existingIds.delete(id);
          existingIds.add(renewedId);
        }
        if (renewedFromIds.size > 0) {
          db.signal_events = (db.signal_events || []).filter((e) => !renewedFromIds.has(String(e.signal_id || "")));
        }
        if (updatedIds.length > 0) mt5WriteJsonDb(db);
        return { updated: updatedIds.length, updated_ids: updatedIds };
      },
      async getUiAuthUser(email) {
        const db = mt5ReadJsonDb();
        const target = normalizeEmail(email);
        if (!target) return null;
        const found = (db.users || []).find((u) => normalizeEmail(u.email) === target) || null;
        if (!found) return null;
        return {
          user_id: String(found.user_id || CFG.mt5DefaultUserId),
          user_name: String(found.user_name || ""),
          email: normalizeEmail(found.email),
          role: normalizeUserRole(found.role || UI_ROLE_SYSTEM),
          is_active: normalizeUserActive(found.is_active, true),
          password_salt: String(found.password_salt || ""),
          password_hash: String(found.password_hash || ""),
          updated_at: String(found.updated_at || ""),
          created_at: String(found.created_at || ""),
        };
      },
      async getUiAuthUserById(userId) {
        const db = mt5ReadJsonDb();
        const target = String(userId || "").trim();
        if (!target) return null;
        const found = (db.users || []).find((u) => String(u.user_id || "") === target) || null;
        if (!found) return null;
        return {
          user_id: String(found.user_id || CFG.mt5DefaultUserId),
          user_name: String(found.user_name || ""),
          email: normalizeEmail(found.email),
          role: normalizeUserRole(found.role || UI_ROLE_SYSTEM),
          is_active: normalizeUserActive(found.is_active, true),
          password_salt: String(found.password_salt || ""),
          password_hash: String(found.password_hash || ""),
          updated_at: String(found.updated_at || ""),
          created_at: String(found.created_at || ""),
        };
      },
      async listUiUsers() {
        const db = mt5ReadJsonDb();
        return (db.users || [])
          .map((u) => ({
            user_id: String(u.user_id || ""),
            user_name: String(u.user_name || ""),
            email: normalizeEmail(u.email),
            role: normalizeUserRole(u.role || "User"),
            is_active: normalizeUserActive(u.is_active, true),
            updated_at: String(u.updated_at || ""),
            created_at: String(u.created_at || ""),
          }))
          .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      },
      async upsertUiAuthUser(user) {
        const db = mt5ReadJsonDb();
        const target = normalizeEmail(user?.email);
        if (!target) throw new Error("email is required");
        const userId = String(user?.user_id || CFG.mt5DefaultUserId);
        let targetUser = (db.users || []).find((u) => String(u.user_id || "") === userId);
        if (!targetUser) {
          targetUser = {
            user_id: userId,
            user_name: "",
            email: "",
            role: "User",
            is_active: true,
            password_salt: "",
            password_hash: "",
            updated_at: mt5NowIso(),
            created_at: mt5NowIso(),
          };
          db.users.push(targetUser);
        }
        targetUser.user_name = String(user?.user_name || targetUser.user_name || fallbackUserNameFromEmail(target));
        targetUser.email = target;
        targetUser.role = normalizeUserRole(user?.role || targetUser.role || UI_ROLE_SYSTEM);
        targetUser.is_active = normalizeUserActive(user?.is_active, targetUser.is_active);
        targetUser.password_salt = String(user?.password_salt || "");
        targetUser.password_hash = String(user?.password_hash || "");
        targetUser.updated_at = String(user?.updated_at || new Date().toISOString());
        targetUser.created_at = String(user?.created_at || targetUser.created_at || mt5NowIso());
        mt5WriteJsonDb(db);
        return { ok: true };
      },
      async listUserAccounts(userId) {
        const db = mt5ReadJsonDb();
        const target = String(userId || "").trim();
        return (db.accounts || [])
          .filter((a) => String(a.user_id || "") === target)
          .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")))
          .map((a) => ({ ...a }));
      },
      async upsertUserAccount(userId, account) {
        const db = mt5ReadJsonDb();
        const targetUser = String(userId || "").trim();
        const accountId = String(account?.account_id || "").trim();
        const now = mt5NowIso();
        const idx = (db.accounts || []).findIndex((a) => String(a.account_id || "") === accountId && String(a.user_id || "") === targetUser);
        const row = {
          account_id: accountId,
          user_id: targetUser,
          name: String(account?.name || ""),
          balance: account?.balance === null || account?.balance === undefined || Number.isNaN(Number(account.balance)) ? null : Number(account.balance),
          status: String(account?.status || ""),
          metadata: account?.metadata && typeof account.metadata === "object" ? account.metadata : null,
          created_at: idx >= 0 ? String(db.accounts[idx].created_at || now) : now,
          updated_at: now,
        };
        if (idx >= 0) db.accounts[idx] = row;
        else db.accounts.push(row);
        mt5WriteJsonDb(db);
        return row;
      },
      async deleteUserAccount(userId, accountId) {
        const db = mt5ReadJsonDb();
        const targetUser = String(userId || "").trim();
        const targetAccount = String(accountId || "").trim();
        db.accounts = (db.accounts || []).filter((a) => !(String(a.user_id || "") === targetUser && String(a.account_id || "") === targetAccount));
        mt5WriteJsonDb(db);
      },
      async listUserApiKeys(userId) {
        const db = mt5ReadJsonDb();
        const target = String(userId || "").trim();
        return (db.user_api_keys || [])
          .filter((k) => String(k.user_id || "") === target)
          .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")))
          .map((k) => ({ ...k }));
      },
      async createUserApiKey(userId, key) {
        const db = mt5ReadJsonDb();
        const now = mt5NowIso();
        const row = {
          key_id: String(crypto.randomUUID()),
          user_id: String(userId || ""),
          label: String(key?.label || ""),
          key_value: String(key?.key_value || ""),
          is_active: normalizeUserActive(key?.is_active, true),
          last_used_at: "",
          created_at: now,
          updated_at: now,
        };
        db.user_api_keys.push(row);
        mt5WriteJsonDb(db);
        return row;
      },
      async updateUserApiKey(userId, keyId, patch = {}) {
        const db = mt5ReadJsonDb();
        const targetUser = String(userId || "").trim();
        const targetKey = String(keyId || "").trim();
        const idx = (db.user_api_keys || []).findIndex((k) => String(k.user_id || "") === targetUser && String(k.key_id || "") === targetKey);
        if (idx < 0) return null;
        const prev = db.user_api_keys[idx];
        const next = {
          ...prev,
          label: patch.label === undefined ? String(prev.label || "") : String(patch.label || ""),
          is_active: patch.is_active === undefined ? normalizeUserActive(prev.is_active, true) : normalizeUserActive(patch.is_active, true),
          updated_at: mt5NowIso(),
        };
        db.user_api_keys[idx] = next;
        mt5WriteJsonDb(db);
        return next;
      },
      async deleteUserApiKey(userId, keyId) {
        const db = mt5ReadJsonDb();
        const targetUser = String(userId || "").trim();
        const targetKey = String(keyId || "").trim();
        db.user_api_keys = (db.user_api_keys || []).filter((k) => !(String(k.user_id || "") === targetUser && String(k.key_id || "") === targetKey));
        mt5WriteJsonDb(db);
      },
    };
    return MT5_BACKEND;
  }

  if (storage === "sqlite") {
    let DatabaseSync;
    try {
      ({ DatabaseSync } = require("node:sqlite"));
    } catch {
      throw new Error("MT5_STORAGE=sqlite requires Node.js 22+ (module node:sqlite not found). Use MT5_STORAGE=json|postgres or upgrade Node.");
    }
    const db = new DatabaseSync(CFG.mt5DbPath);
    // Migration: OK -> PLACED
    db.exec("UPDATE signals SET status = 'PLACED' WHERE status = 'OK';");
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        user_name TEXT,
        email TEXT,
        password_salt TEXT,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'User',
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS accounts (
        account_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT,
        balance REAL,
        status TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      );
      CREATE TABLE IF NOT EXISTS signals (
        signal_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'default',
        source TEXT,
        action TEXT NOT NULL,
        symbol TEXT NOT NULL,
        volume REAL NOT NULL,
        sl REAL,
        tp REAL,
        rr_planned REAL,
        risk_money_planned REAL,
        pnl_money_realized REAL,
        entry_price_exec REAL,
        sl_exec REAL,
        tp_exec REAL,
        note TEXT,
        raw_json TEXT,
        status TEXT NOT NULL,
        locked_at TEXT,
        ack_at TEXT,
        opened_at TEXT,
        closed_at TEXT,
        ack_status TEXT,
        ack_ticket TEXT,
        ack_error TEXT,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_signals_status_created
        ON signals(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_signals_user_created
        ON signals(user_id, created_at);
      CREATE TABLE IF NOT EXISTS signal_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signal_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_time TEXT NOT NULL DEFAULT (datetime('now')),
        payload_json TEXT,
        FOREIGN KEY (signal_id) REFERENCES signals(signal_id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS user_api_keys (
        key_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        label TEXT NOT NULL,
        key_value TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_used_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_signal_events_signal_time
        ON signal_events(signal_id, event_time);
      CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_created
        ON user_api_keys(user_id, created_at);
    `);

    ["users", "accounts", "signals", "signal_events"].forEach(tbl => {
      try { db.exec(`ALTER TABLE ${tbl} ADD COLUMN metadata TEXT`); } catch(e) {}
    });

    ["signal_tf", "chart_tf", "entry_model"].forEach(col => {
      try { db.exec(`ALTER TABLE signals ADD COLUMN ${col} TEXT`); } catch(e) {}
    });
    ["password_salt", "role", "updated_at", "is_active"].forEach(col => {
      try {
        if (col === "role") db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT NOT NULL DEFAULT 'User'`);
        else if (col === "updated_at") db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT NOT NULL DEFAULT (datetime('now'))`);
        else if (col === "is_active") db.exec(`ALTER TABLE users ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 1`);
        else db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
      } catch (e) {}
    });

    // Broker execution telemetry columns (added 2026-04-15).
    ["sl_pips", "tp_pips", "pip_value_per_lot", "risk_money_actual", "reward_money_planned"].forEach(col => {
      try { db.exec(`ALTER TABLE signals ADD COLUMN ${col} REAL`); } catch(e) {}
    });

    // Backward-compatible migration from legacy table name.
    const oldTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mt5_signals'").get();
    if (oldTable) {
      db.exec(`
        INSERT OR IGNORE INTO signals (
          signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
          rr_planned, risk_money_planned, pnl_money_realized, entry_price_exec, sl_exec, tp_exec,
          note, raw_json, status, locked_at, ack_at, opened_at, closed_at, ack_status, ack_ticket, ack_error
        )
        SELECT
          signal_id, created_at, 'default', source, action, symbol, volume, sl, tp,
          NULL, NULL, NULL, NULL, NULL, NULL,
          note, raw_json, status, locked_at, ack_at, NULL, NULL, ack_status, ack_ticket, ack_error
        FROM mt5_signals
      `);
    }

    db.prepare(`
      INSERT OR IGNORE INTO users (user_id, user_name, email, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(CFG.mt5DefaultUserId, "System", "", UI_ROLE_SYSTEM, mt5NowIso(), mt5NowIso());
    db.prepare(`
      UPDATE users
      SET role = ?, updated_at = COALESCE(updated_at, ?)
      WHERE user_id = ?
    `).run(UI_ROLE_SYSTEM, mt5NowIso(), CFG.mt5DefaultUserId);
    try {
      const legacy = db.prepare(`
        SELECT email, password_salt, password_hash, updated_at
        FROM ui_auth_users
        ORDER BY updated_at DESC
        LIMIT 1
      `).get();
      if (legacy && legacy.email && legacy.password_salt && legacy.password_hash) {
        const migratedEmail = normalizeEmail(legacy.email);
        db.prepare(`
          UPDATE users
          SET user_name = COALESCE(NULLIF(user_name, ''), ?),
              email = ?,
              password_salt = ?,
              password_hash = ?,
              role = ?,
              updated_at = ?
          WHERE user_id = ?
        `).run(
          fallbackUserNameFromEmail(migratedEmail),
          migratedEmail,
          String(legacy.password_salt || ""),
          String(legacy.password_hash || ""),
          UI_ROLE_SYSTEM,
          String(legacy.updated_at || mt5NowIso()),
          CFG.mt5DefaultUserId,
        );
      }
    } catch (e) {
      // Legacy table may not exist; ignore.
    }

    const count = db.prepare("SELECT COUNT(*) AS n FROM signals").get().n;
    if (count === 0) {
      try {
        const rows = mt5GetLegacyRows();
        if (rows.length > 0) {
          const insert = db.prepare(`
            INSERT OR REPLACE INTO signals (
              signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
              rr_planned, risk_money_planned, pnl_money_realized, entry_price_exec, sl_exec, tp_exec,
              note, raw_json, status, locked_at, ack_at, opened_at, closed_at, ack_status, ack_ticket, ack_error
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const tx = db.transaction((list) => {
            for (const r of list) {
              insert.run(
                String(r.signal_id || crypto.randomUUID()),
                String(r.created_at || mt5NowIso()),
                String(r.user_id || CFG.mt5DefaultUserId),
                String(r.source || "legacy"),
                String(r.action || "BUY"),
                String(r.symbol || ""),
                Number(r.volume ?? CFG.mt5DefaultLot),
                r.sl ?? null,
                r.tp ?? null,
                r.rr_planned ?? null,
                r.risk_money_planned ?? null,
                r.pnl_money_realized ?? null,
                r.entry_price_exec ?? null,
                r.sl_exec ?? null,
                r.tp_exec ?? null,
                String(r.note || ""),
                JSON.stringify(r.raw_json || {}),
                String(r.status || "NEW"),
                r.locked_at ?? null,
                r.ack_at ?? null,
                r.opened_at ?? null,
                r.closed_at ?? null,
                r.ack_status ?? null,
                r.ack_ticket ?? null,
                r.ack_error ?? null,
              );
            }
          });
          tx(rows);
          console.log(`MT5: migrated ${rows.length} row(s) from legacy JSON ${mt5LegacyJsonPath()}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`MT5: legacy JSON migration failed: ${msg}`);
      }
    }

    MT5_BACKEND = {
      storage,
      info: { path: CFG.mt5DbPath },
      async upsertSignal(signal) {
        const ins = db.prepare(`
          INSERT OR IGNORE INTO signals (
            signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
            rr_planned, risk_money_planned, pnl_money_realized, entry_price_exec, sl_exec, tp_exec,
            note, entry_model, raw_json, status, locked_at, ack_at, opened_at, closed_at, ack_status, ack_ticket, ack_error
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          signal.signal_id,
          signal.created_at,
          signal.user_id || CFG.mt5DefaultUserId,
          signal.source,
          signal.action,
          signal.symbol,
          signal.volume,
          signal.sl,
          signal.tp,
          signal.rr_planned ?? null,
          signal.risk_money_planned ?? null,
          signal.pnl_money_realized ?? null,
          signal.entry_price_exec ?? null,
          signal.sl_exec ?? null,
          signal.tp_exec ?? null,
          signal.note,
          signal.entry_model ?? null,
          JSON.stringify(signal.raw_json || {}),
          signal.status,
          signal.locked_at,
          signal.ack_at,
          signal.opened_at,
          signal.closed_at,
          signal.ack_status,
          signal.ack_ticket,
          signal.ack_error,
        );
        return { inserted: Number(ins.changes || 0) > 0 };
      },
      async pullAndLockNextSignal() {
        const next = db.prepare(`
          SELECT signal_id, created_at, action, symbol, volume, sl, tp, note, entry_price_exec, raw_json
          FROM signals
          WHERE status = 'NEW' OR (status = 'LOCKED' AND locked_at < datetime('now', '-5 minutes'))
          ORDER BY created_at ASC
          LIMIT 1
        `).get();
        if (!next) return null;
        const upd = db.prepare(`
          UPDATE signals
          SET status = 'LOCKED', locked_at = ?
          WHERE signal_id = ? AND (status = 'NEW' OR (status = 'LOCKED' AND locked_at < datetime('now', '-5 minutes')))
        `).run(mt5NowIso(), next.signal_id);
        if (upd.changes < 1) return null;
        return next;
      },
      async pullAndLockSignalById(signalId) {
        const next = db.prepare(`
          SELECT signal_id, created_at, action, symbol, volume, sl, tp, note, entry_price_exec, raw_json
          FROM signals
          WHERE signal_id = ? AND (status = 'NEW' OR (status = 'LOCKED' AND locked_at < datetime('now', '-5 minutes')))
          LIMIT 1
        `).get(signalId);
        if (!next) return null;
        const upd = db.prepare(`
          UPDATE signals
          SET status = 'LOCKED', locked_at = ?
          WHERE signal_id = ? AND (status = 'NEW' OR (status = 'LOCKED' AND locked_at < datetime('now', '-5 minutes')))
        `).run(mt5NowIso(), signalId);
        if (upd.changes < 1) return null;
        return next;
      },
      async findSignalById(signalId) {
        return db.prepare(`
          SELECT signal_id
          FROM signals
          WHERE signal_id = ?
          LIMIT 1
        `).get(signalId) || null;
      },
      async ackSignal(signalId, status, ticket, error, extra = {}) {
        const retryable = mt5IsRetryableConnectivityFail(status, error);
        const internalStatus = retryable ? "NEW" : mt5StatusToInternal(status);
        const ackStatus = mt5CanonicalStoredStatus(status);
        const now = mt5NowIso();
        return db.prepare(`
          UPDATE signals
          SET status = ?, ack_at = ?, ack_status = ?, ack_ticket = ?, ack_error = ?,
              pnl_money_realized = COALESCE(?, pnl_money_realized),
              entry_price_exec = COALESCE(?, entry_price_exec),
              sl_exec = COALESCE(?, sl_exec),
              tp_exec = COALESCE(?, tp_exec),
              sl_pips = COALESCE(?, sl_pips),
              tp_pips = COALESCE(?, tp_pips),
              pip_value_per_lot = COALESCE(?, pip_value_per_lot),
              risk_money_actual = COALESCE(?, risk_money_actual),
              reward_money_planned = COALESCE(?, reward_money_planned),
              locked_at = CASE WHEN ? = 1 THEN NULL ELSE locked_at END,
              opened_at = CASE WHEN (? = 'PLACED' OR ? = 'START') AND opened_at IS NULL THEN ? ELSE opened_at END,
              closed_at = CASE WHEN (? = 'TP' OR ? = 'SL' OR ? = 'FAIL' OR ? = 'CANCEL' OR ? = 'EXPIRED') THEN ? ELSE closed_at END
          WHERE signal_id = ?
        `).run(
          internalStatus,
          now,
          ackStatus,
          ticket ?? null,
          error ?? null,
          extra.pnl_money_realized ?? null,
          extra.entry_price_exec ?? null,
          extra.sl_exec ?? null,
          extra.tp_exec ?? null,
          extra.sl_pips ?? null,
          extra.tp_pips ?? null,
          extra.pip_value_per_lot ?? null,
          extra.risk_money_actual ?? null,
          extra.reward_money_planned ?? null,
          retryable ? 1 : 0,
          internalStatus,
          internalStatus,
          now,
          internalStatus,
          internalStatus,
          internalStatus,
          internalStatus,
          internalStatus,
          now,
          signalId,
        );
      },
      async findSignalById(signalId) {
        const r = db.prepare(`SELECT * FROM signals WHERE signal_id = ? LIMIT 1`).get(String(signalId));
        if (!r) return null;
        return { ...r, raw_json: r.raw_json ? JSON.parse(r.raw_json) : {} };
      },
      async getSignalByTicket(ticket) {
        const r = db.prepare(`
          SELECT * FROM signals WHERE ack_ticket = ? LIMIT 1
        `).get(String(ticket));
        if (!r) return null;
        return { ...r, raw_json: r.raw_json ? JSON.parse(r.raw_json) : {} };
      },
      async listSignals(limit, statusFilter) {
        if (statusFilter) {
          return db.prepare(`
            SELECT signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
                   rr_planned, risk_money_planned, pnl_money_realized, entry_price_exec, sl_exec, tp_exec,
                   sl_pips, tp_pips, pip_value_per_lot, risk_money_actual, reward_money_planned,
                   note, raw_json, status, locked_at, ack_at, opened_at, closed_at, ack_status, ack_ticket, ack_error
            FROM signals
            WHERE status = ? AND signal_id NOT LIKE 'SYSTEM_%'
            ORDER BY created_at DESC
            LIMIT ?
          `).all(statusFilter, limit).map((r) => ({
            ...r,
            raw_json: r.raw_json ? JSON.parse(r.raw_json) : {},
          }));
        }
        return db.prepare(`
          SELECT signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
                 rr_planned, risk_money_planned, pnl_money_realized, entry_price_exec, sl_exec, tp_exec,
                 sl_pips, tp_pips, pip_value_per_lot, risk_money_actual, reward_money_planned,
                 note, raw_json, status, locked_at, ack_at, opened_at, closed_at, ack_status, ack_ticket, ack_error
          FROM signals
          WHERE signal_id NOT LIKE 'SYSTEM_%'
          ORDER BY created_at DESC
          LIMIT ?
        `).all(limit).map((r) => ({
          ...r,
          raw_json: r.raw_json ? JSON.parse(r.raw_json) : {},
        }));
      },
      async getSignalByTicket(ticket) {
        const r = db.prepare(`
          SELECT * FROM signals WHERE ack_ticket = ? LIMIT 1
        `).get(String(ticket));
        if (!r) return null;
        return { ...r, raw_json: r.raw_json ? JSON.parse(r.raw_json) : {} };
      },
      async listActiveSignals() {
        return db.prepare(`
          SELECT signal_id, created_at, user_id, action, symbol, volume, sl, tp, status,
                 ack_ticket, ack_status, pnl_money_realized, entry_price_exec, sl_exec, tp_exec
          FROM signals
          WHERE status IN ('NEW', 'LOCKED', 'PLACED', 'START') AND signal_id NOT LIKE 'SYSTEM_%'
          ORDER BY created_at ASC
        `).all().map((r) => ({
          ...r,
          raw_json: r.raw_json ? JSON.parse(r.raw_json) : {},
        }));
      },
      async bulkAckSignals(updates) {
        if (!Array.isArray(updates) || !updates.length) return { updated: 0 };
        const now = mt5NowIso();
        const updateStmt = db.prepare(`
          UPDATE signals
          SET status = ?,
              ack_at = ?,
              ack_status = ?,
              ack_ticket = COALESCE(?, ack_ticket),
              pnl_money_realized = COALESCE(?, pnl_money_realized),
              closed_at = CASE WHEN (? IN ('TP','SL','FAIL','CANCEL','EXPIRED')) THEN ? ELSE closed_at END
          WHERE signal_id = ?
        `);
        let count = 0;
        const tx = db.transaction((arr) => {
          for (const u of arr) {
            const internalStatus = mt5StatusToInternal(u.status);
            const ackStatus = mt5CanonicalStoredStatus(u.status);
            const res = updateStmt.run(
              internalStatus,
              now,
              ackStatus,
              u.ticket ?? null,
              u.pnl ?? null,
              internalStatus,
              now,
              u.signal_id
            );
            count += res.changes || 0;
          }
        });
        tx(updates);
        return { updated: count };
      },
      async appendSignalEvent(signalId, eventType, payload = {}) {
        db.prepare(`
          INSERT INTO signal_events (signal_id, event_type, event_time, payload_json)
          VALUES (?, ?, ?, ?)
        `).run(String(signalId), String(eventType), mt5NowIso(), JSON.stringify(payload || {}));
      },
      async listSignalEvents(signalId, limit = 200) {
        const safeLimit = Math.max(1, Math.min(2000, Number(limit) || 200));
        return db.prepare(`
          SELECT id, signal_id, event_type, event_time, payload_json
          FROM signal_events
          WHERE signal_id = ?
          ORDER BY event_time DESC
          LIMIT ?
        `).all(String(signalId), safeLimit).map((r) => ({
          ...r,
          payload_json: r.payload_json ? JSON.parse(r.payload_json) : {},
        }));
      },
      async deleteAllEvents() {
        return db.prepare(`DELETE FROM signal_events`).run();
      },
      async listAllEvents(limit, offset, filters = {}) {
        const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 1000));
        const safeOffset = Math.max(0, Number(offset) || 0);
        let sql = `
          SELECT e.id, e.signal_id, e.event_type, e.event_time, e.payload_json, s.symbol, s.ack_ticket
          FROM signal_events e
          LEFT JOIN signals s ON e.signal_id = s.signal_id
          WHERE 1=1
        `;
        const params = [];
        if (filters.q) {
          const q = `%${filters.q}%`;
          sql += ` AND (e.signal_id LIKE ? OR CAST(s.ack_ticket AS TEXT) LIKE ? OR s.symbol LIKE ? OR e.event_type LIKE ?)`;
          params.push(q, q, q, q);
        }
        if (filters.type) {
          sql += ` AND e.event_type = ?`;
          params.push(filters.type);
        }
        sql += ` ORDER BY e.event_time DESC LIMIT ? OFFSET ?`;
        params.push(safeLimit, safeOffset);
        
        return db.prepare(sql).all(...params).map((r) => ({
          ...r,
          payload_json: r.payload_json ? JSON.parse(r.payload_json) : {},
        }));
      },
      async pruneOldSignals(days) {
        const placeholders = mt5TerminalStatuses().map(() => "?").join(", ");
        const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const result = db.prepare(`
          DELETE FROM signals
          WHERE status IN (${placeholders}) AND created_at < ?
        `).run(...mt5TerminalStatuses(), cutoffIso);
        const remaining = db.prepare("SELECT COUNT(*) AS n FROM signals").get().n;
        return { removed: result.changes || 0, remaining };
      },
      async deleteSignalsByIds(signalIds) {
        const ids = Array.isArray(signalIds)
          ? signalIds.map((s) => String(s || "")).filter(Boolean)
          : [];
        if (!ids.length) return { deleted: 0 };
        const delSignal = db.prepare(`DELETE FROM signals WHERE signal_id = ?`);
        const delEvents = db.prepare(`DELETE FROM signal_events WHERE signal_id = ?`);
        let deleted = 0;
        const tx = db.transaction((arr) => {
          for (const id of arr) {
            delEvents.run(id);
            const res = delSignal.run(id);
            deleted += res.changes || 0;
          }
        });
        tx(ids);
        return { deleted };
      },
      async cancelSignalsByIds(signalIds) {
        const ids = Array.isArray(signalIds)
          ? signalIds.map((s) => String(s || "")).filter(Boolean)
          : [];
        if (!ids.length) return { updated: 0, updated_ids: [] };
        const now = mt5NowIso();
        const update = db.prepare(`
          UPDATE signals
          SET status = 'CANCEL', closed_at = ?
          WHERE signal_id = ? AND status IN ('NEW','LOCKED','START','PLACED')
        `);
        const updatedIds = [];
        const tx = db.transaction((arr) => {
          for (const id of arr) {
            const res = update.run(now, id);
            if ((res.changes || 0) > 0) {
              updatedIds.push(id);
            }
          }
        });
        tx(ids);
        return { updated: updatedIds.length, updated_ids: updatedIds };
      },
      async renewSignalsByIds(signalIds) {
        const ids = Array.isArray(signalIds)
          ? signalIds.map((s) => String(s || "")).filter(Boolean)
          : [];
        if (!ids.length) return { updated: 0, updated_ids: [] };
        const pick = db.prepare(`
          SELECT signal_id, status
          FROM signals
          WHERE signal_id = ?
        `);
        const update = db.prepare(`
          UPDATE signals
          SET signal_id = ?,
              created_at = ?,
              status = 'NEW',
              locked_at = NULL,
              ack_at = NULL,
              opened_at = NULL,
              closed_at = NULL,
              ack_status = NULL,
              ack_ticket = NULL,
              ack_error = NULL
          WHERE signal_id = ?
        `);
        const deleteEvents = db.prepare(`DELETE FROM signal_events WHERE signal_id = ?`);
        const listExistingForBase = db.prepare(`
          SELECT signal_id
          FROM signals
          WHERE signal_id = ? OR signal_id LIKE ?
        `);
        const updatedIds = [];
        const tx = db.transaction((arr) => {
          for (const id of arr) {
            const row = pick.get(id);
            if (!row) continue;
            const cur = mt5CanonicalStoredStatus(row.status);
            if (cur === "NEW" || cur === "LOCKED") continue;
            const base = mt5RenewSignalIdBase(id);
            const existingRows = listExistingForBase.all(base, `${base}.%`);
            const renewedId = mt5RenewSignalIdFromExisting(base, existingRows.map((r) => String(r.signal_id || "")));
            const now = mt5NowIso();
            const res = update.run(renewedId, now, id);
            if ((res.changes || 0) > 0) {
              deleteEvents.run(id);
              updatedIds.push(renewedId);
            }
          }
        });
        tx(ids);
        return { updated: updatedIds.length, updated_ids: updatedIds };
      },
      async listTables() {
        const res = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        return res.map(r => r.name);
      },
      async listTableRows(table, limit = 50, offset = 0, q = "") {
        const allowed = (await this.listTables());
        if (!allowed.includes(table)) throw new Error(`Table ${table} not found or protected`);
        
        let rows = [];
        let total = 0;
        
        if (q) {
          const cols = db.prepare(`PRAGMA table_info(${table})`).all();
          const searchCols = cols.filter(c => ['TEXT', 'VARCHAR', 'JSON'].includes(c.type.toUpperCase())).map(c => c.name);
          
          if (searchCols.length > 0) {
            const where = searchCols.map(c => `${c} LIKE ?`).join(" OR ");
            rows = db.prepare(`SELECT * FROM ${table} WHERE ${where} LIMIT ? OFFSET ?`).all(...searchCols.map(() => `%${q}%`), limit, offset);
            total = db.prepare(`SELECT COUNT(*) as n FROM ${table} WHERE ${where}`).get(...searchCols.map(() => `%${q}%`)).n;
          } else {
             rows = db.prepare(`SELECT * FROM ${table} LIMIT ? OFFSET ?`).all(limit, offset);
             total = db.prepare(`SELECT COUNT(*) as n FROM ${table}`).get().n;
          }
        } else {
          rows = db.prepare(`SELECT * FROM ${table} LIMIT ? OFFSET ?`).all(limit, offset);
          total = db.prepare(`SELECT COUNT(*) as n FROM ${table}`).get().n;
        }
        return { rows, total };
      },
      async getUiAuthUser(email) {
        const target = normalizeEmail(email);
        if (!target) return null;
        return db.prepare(`
          SELECT user_id, user_name, email, role, is_active, password_salt, password_hash, updated_at, created_at
          FROM users
          WHERE lower(email) = ?
          LIMIT 1
        `).get(target) || null;
      },
      async getUiAuthUserById(userId) {
        const target = String(userId || "").trim();
        if (!target) return null;
        return db.prepare(`
          SELECT user_id, user_name, email, role, is_active, password_salt, password_hash, updated_at, created_at
          FROM users
          WHERE user_id = ?
          LIMIT 1
        `).get(target) || null;
      },
      async listUiUsers() {
        return db.prepare(`
          SELECT user_id, user_name, email, role, is_active, updated_at, created_at
          FROM users
          ORDER BY created_at ASC, user_id ASC
        `).all();
      },
      async upsertUiAuthUser(user) {
        const target = normalizeEmail(user?.email);
        if (!target) throw new Error("email is required");
        const userId = String(user?.user_id || CFG.mt5DefaultUserId);
        db.prepare(`
          INSERT INTO users (user_id, user_name, email, role, is_active, password_salt, password_hash, updated_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            user_name = excluded.user_name,
            email = excluded.email,
            role = excluded.role,
            is_active = excluded.is_active,
            password_salt = excluded.password_salt,
            password_hash = excluded.password_hash,
            updated_at = excluded.updated_at
        `).run(
          userId,
          String(user?.user_name || fallbackUserNameFromEmail(target)),
          target,
          normalizeUserRole(user?.role || UI_ROLE_SYSTEM),
          normalizeUserActive(user?.is_active, true) ? 1 : 0,
          String(user?.password_salt || ""),
          String(user?.password_hash || ""),
          normalizeIsoTimestamp(user?.updated_at, new Date().toISOString()),
          normalizeIsoTimestamp(user?.created_at, mt5NowIso()),
        );
        return { ok: true };
      },
      async listUserAccounts(userId) {
        const target = String(userId || "").trim();
        return db.prepare(`
          SELECT account_id, user_id, name, balance, status, metadata, created_at, updated_at
          FROM accounts
          WHERE user_id = ?
          ORDER BY created_at ASC, account_id ASC
        `).all(target).map((r) => ({
          ...r,
          metadata: r.metadata ? (() => { try { return JSON.parse(String(r.metadata)); } catch { return null; } })() : null,
        }));
      },
      async upsertUserAccount(userId, account) {
        const targetUser = String(userId || "").trim();
        const accountId = String(account?.account_id || "").trim();
        const now = mt5NowIso();
        db.prepare(`
          INSERT INTO accounts (account_id, user_id, name, balance, status, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(account_id) DO UPDATE SET
            user_id = excluded.user_id,
            name = excluded.name,
            balance = excluded.balance,
            status = excluded.status,
            metadata = excluded.metadata,
            updated_at = excluded.updated_at
        `).run(
          accountId,
          targetUser,
          String(account?.name || ""),
          account?.balance === null || account?.balance === undefined || Number.isNaN(Number(account.balance)) ? null : Number(account.balance),
          String(account?.status || ""),
          account?.metadata && typeof account.metadata === "object" ? JSON.stringify(account.metadata) : null,
          now,
          now,
        );
        return db.prepare(`
          SELECT account_id, user_id, name, balance, status, metadata, created_at, updated_at
          FROM accounts
          WHERE account_id = ? AND user_id = ?
          LIMIT 1
        `).get(accountId, targetUser);
      },
      async deleteUserAccount(userId, accountId) {
        db.prepare(`DELETE FROM accounts WHERE user_id = ? AND account_id = ?`).run(String(userId || ""), String(accountId || ""));
      },
      async listUserApiKeys(userId) {
        return db.prepare(`
          SELECT key_id, user_id, label, key_value, is_active, last_used_at, created_at, updated_at
          FROM user_api_keys
          WHERE user_id = ?
          ORDER BY created_at ASC, key_id ASC
        `).all(String(userId || ""));
      },
      async createUserApiKey(userId, key) {
        const now = mt5NowIso();
        const row = {
          key_id: String(crypto.randomUUID()),
          user_id: String(userId || ""),
          label: String(key?.label || ""),
          key_value: String(key?.key_value || ""),
          is_active: normalizeUserActive(key?.is_active, true) ? 1 : 0,
          last_used_at: null,
          created_at: now,
          updated_at: now,
        };
        db.prepare(`
          INSERT INTO user_api_keys (key_id, user_id, label, key_value, is_active, last_used_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(row.key_id, row.user_id, row.label, row.key_value, row.is_active, row.last_used_at, row.created_at, row.updated_at);
        return row;
      },
      async updateUserApiKey(userId, keyId, patch = {}) {
        const targetUser = String(userId || "");
        const targetKey = String(keyId || "");
        const current = db.prepare(`
          SELECT key_id, user_id, label, key_value, is_active, last_used_at, created_at, updated_at
          FROM user_api_keys
          WHERE user_id = ? AND key_id = ?
          LIMIT 1
        `).get(targetUser, targetKey);
        if (!current) return null;
        const nextLabel = patch.label === undefined ? String(current.label || "") : String(patch.label || "");
        const nextActive = patch.is_active === undefined ? normalizeUserActive(current.is_active, true) : normalizeUserActive(patch.is_active, true);
        db.prepare(`
          UPDATE user_api_keys
          SET label = ?, is_active = ?, updated_at = ?
          WHERE user_id = ? AND key_id = ?
        `).run(nextLabel, nextActive ? 1 : 0, mt5NowIso(), targetUser, targetKey);
        return db.prepare(`
          SELECT key_id, user_id, label, key_value, is_active, last_used_at, created_at, updated_at
          FROM user_api_keys
          WHERE user_id = ? AND key_id = ?
          LIMIT 1
        `).get(targetUser, targetKey);
      },
      async deleteUserApiKey(userId, keyId) {
        db.prepare(`DELETE FROM user_api_keys WHERE user_id = ? AND key_id = ?`).run(String(userId || ""), String(keyId || ""));
      }
    };
    return MT5_BACKEND;
  }

  if (!CFG.mt5PostgresUrl) {
    throw new Error("MT5_STORAGE=postgres but POSTGRES_URL/POSTGRE_URL/MT5_POSTGRES_URL is empty");
  }
  let pgModule;
  try {
    pgModule = require("pg");
  } catch {
    throw new Error("MT5 postgres backend requires `pg` package. Run: npm install pg");
  }
  const { Pool } = pgModule;
  const pool = new Pool({ 
    connectionString: CFG.mt5PostgresUrl,
    max: 20, // Allow up to 20 concurrent connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  
  pool.on('error', (err) => {
    console.error('[Postgres Pool Error]', err);
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      user_name TEXT,
      email TEXT,
      password_salt TEXT,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'User',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      name TEXT,
      balance DOUBLE PRECISION,
      status TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS signals (
      signal_id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'default',
      source TEXT,
      action TEXT NOT NULL,
      symbol TEXT NOT NULL,
      volume DOUBLE PRECISION NOT NULL,
      sl DOUBLE PRECISION NULL,
      tp DOUBLE PRECISION NULL,
      signal_tf TEXT NULL,
      chart_tf TEXT NULL,
      rr_planned DOUBLE PRECISION NULL,
      risk_money_planned DOUBLE PRECISION NULL,
      pnl_money_realized DOUBLE PRECISION NULL,
      entry_price_exec DOUBLE PRECISION NULL,
      sl_exec DOUBLE PRECISION NULL,
      tp_exec DOUBLE PRECISION NULL,
      note TEXT,
      raw_json JSONB,
      status TEXT NOT NULL,
      locked_at TIMESTAMPTZ NULL,
      ack_at TIMESTAMPTZ NULL,
      opened_at TIMESTAMPTZ NULL,
      closed_at TIMESTAMPTZ NULL,
      ack_status TEXT NULL,
      ack_ticket TEXT NULL,
      ack_error TEXT NULL,
      CONSTRAINT fk_signals_user FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);
  await pool.query(`
    DO $$ 
    BEGIN 
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signals' AND column_name='source_tf') THEN
        UPDATE signals SET signal_tf = source_tf WHERE signal_tf IS NULL;
        ALTER TABLE signals DROP COLUMN source_tf;
      END IF;
    END $$;
  `);
  await pool.query(`
    ALTER TABLE signals
    ADD COLUMN IF NOT EXISTS signal_tf TEXT
  `);
  await pool.query(`
    ALTER TABLE signals
    ADD COLUMN IF NOT EXISTS chart_tf TEXT
  `);
  await pool.query(`
    ALTER TABLE signals
    ADD COLUMN IF NOT EXISTS entry_model TEXT
  `);
  // Broker execution telemetry columns (added 2026-04-15).
  await pool.query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS sl_pips FLOAT8`);
  await pool.query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS tp_pips FLOAT8`);
  await pool.query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS pip_value_per_lot FLOAT8`);
  await pool.query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS risk_money_actual FLOAT8`);
  await pool.query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS reward_money_planned FLOAT8`);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_signals_status_created
    ON signals(status, created_at)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_signals_user_created
    ON signals(user_id, created_at)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS signal_events (
      id BIGSERIAL PRIMARY KEY,
      signal_id TEXT NOT NULL REFERENCES signals(signal_id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payload_json JSONB
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_api_keys (
      key_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      key_value TEXT NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_signal_events_signal_time
    ON signal_events(signal_id, event_time)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_created
    ON user_api_keys(user_id, created_at)
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);
  await pool.query(`
    UPDATE users
    SET role = COALESCE(NULLIF(role, ''), 'User'),
        is_active = COALESCE(is_active, TRUE),
        updated_at = COALESCE(updated_at, NOW())
  `);
  // Ensure "SYSTEM_SYNC_PUSH" dummy signal exists for global logging.
  await pool.query(`
    INSERT INTO signals (signal_id, symbol, action, volume, status, created_at, user_id, note)
    VALUES ('SYSTEM_SYNC_PUSH', 'SYNC_PUSH', 'SYSTEM', 0, 'PLACED', $1, $2, 'Global Sync Log Partition')
    ON CONFLICT (signal_id) DO NOTHING
  `, [mt5NowIso(), CFG.mt5DefaultUserId]);

  // Migration: OK -> PLACED
  await pool.query(`UPDATE signals SET status = 'PLACED' WHERE status = 'OK'`);

  for (const tbl of ["users", "accounts", "signals", "signal_events"]) {
    await pool.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS metadata JSONB`);
  }

  await pool.query(`
    INSERT INTO users (user_id, user_name, email, role, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id) DO UPDATE SET
      role = EXCLUDED.role,
      updated_at = EXCLUDED.updated_at
  `, [CFG.mt5DefaultUserId, "System", "", UI_ROLE_SYSTEM, mt5NowIso(), mt5NowIso()]);
  await pool.query(`
    WITH legacy AS (
      SELECT email, password_salt, password_hash, updated_at
      FROM ui_auth_users
      ORDER BY updated_at DESC
      LIMIT 1
    )
    UPDATE users u
    SET user_name = COALESCE(NULLIF(u.user_name, ''), split_part(legacy.email, '@', 1)),
        email = lower(legacy.email),
        password_salt = legacy.password_salt,
        password_hash = legacy.password_hash,
        role = $2,
        updated_at = COALESCE(legacy.updated_at, NOW())
    FROM legacy
    WHERE u.user_id = $1
  `, [CFG.mt5DefaultUserId, UI_ROLE_SYSTEM]).catch(() => {
    // Legacy table may not exist; safe to ignore.
  });

  // Backward-compatible migration from legacy table mt5_signals -> signals.
  await pool.query(`
    INSERT INTO signals (
      signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
      signal_tf, chart_tf,
      note, raw_json, status, locked_at, ack_at, ack_status, ack_ticket, ack_error
    )
    SELECT
      s.signal_id, s.created_at, 'default', s.source, s.action, s.symbol, s.volume, s.sl, s.tp,
      NULL, NULL,
      s.note, s.raw_json, s.status, s.locked_at, s.ack_at, s.ack_status, s.ack_ticket, s.ack_error
    FROM mt5_signals s
    ON CONFLICT (signal_id) DO NOTHING
  `).catch(() => {
    // Legacy table may not exist; safe to ignore.
  });

  const countRes = await pool.query("SELECT COUNT(*)::int AS n FROM signals");
  if (countRes.rows[0].n === 0) {
    try {
      const rows = mt5GetLegacyRows();
      if (rows.length > 0) {
        for (const r of rows) {
          await pool.query(`
            INSERT INTO signals (
              signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
              signal_tf, chart_tf,
              rr_planned, risk_money_planned, pnl_money_realized, entry_price_exec, sl_exec, tp_exec,
              note, raw_json, status, locked_at, ack_at, opened_at, closed_at, ack_status, ack_ticket, ack_error
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21,$22,$23,$24,$25,$26,$27)
            ON CONFLICT (signal_id) DO UPDATE SET
              created_at=EXCLUDED.created_at,
              user_id=EXCLUDED.user_id,
              source=EXCLUDED.source,
              action=EXCLUDED.action,
              symbol=EXCLUDED.symbol,
              volume=EXCLUDED.volume,
              sl=EXCLUDED.sl,
              tp=EXCLUDED.tp,
              signal_tf=EXCLUDED.signal_tf,
              chart_tf=EXCLUDED.chart_tf,
              rr_planned=EXCLUDED.rr_planned,
              risk_money_planned=EXCLUDED.risk_money_planned,
              pnl_money_realized=EXCLUDED.pnl_money_realized,
              entry_price_exec=EXCLUDED.entry_price_exec,
              sl_exec=EXCLUDED.sl_exec,
              tp_exec=EXCLUDED.tp_exec,
              note=EXCLUDED.note,
              raw_json=EXCLUDED.raw_json,
              status=EXCLUDED.status,
              locked_at=EXCLUDED.locked_at,
              ack_at=EXCLUDED.ack_at,
              opened_at=EXCLUDED.opened_at,
              closed_at=EXCLUDED.closed_at,
              ack_status=EXCLUDED.ack_status,
              ack_ticket=EXCLUDED.ack_ticket,
              ack_error=EXCLUDED.ack_error
          `, [
            String(r.signal_id || crypto.randomUUID()),
            String(r.created_at || mt5NowIso()),
            String(r.user_id || CFG.mt5DefaultUserId),
            String(r.source || "legacy"),
            String(r.action || "BUY"),
            String(r.symbol || ""),
            Number(r.volume ?? CFG.mt5DefaultLot),
            r.sl ?? null,
            r.tp ?? null,
            r.signal_tf ?? r.raw_json?.sourceTf ?? r.raw_json?.timeframe ?? null,
            r.chart_tf ?? r.raw_json?.chartTf ?? null,
            r.rr_planned ?? null,
            r.risk_money_planned ?? null,
            r.pnl_money_realized ?? null,
            r.entry_price_exec ?? null,
            r.sl_exec ?? null,
            r.tp_exec ?? null,
            String(r.note || ""),
            JSON.stringify(r.raw_json || {}),
            String(r.status || "NEW"),
            r.locked_at ?? null,
            r.ack_at ?? null,
            r.opened_at ?? null,
            r.closed_at ?? null,
            r.ack_status ?? null,
            r.ack_ticket ?? null,
            r.ack_error ?? null,
          ]);
        }
        console.log(`MT5: migrated ${rows.length} row(s) from legacy JSON ${mt5LegacyJsonPath()}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`MT5: legacy JSON migration failed: ${msg}`);
    }
  }

  MT5_BACKEND = {
    storage,
    info: { url: CFG.mt5PostgresUrl.replace(/:[^:@/]+@/, ":***@") },
    async upsertSignal(signal) {
      const r = await pool.query(`
        INSERT INTO signals (
          signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
          signal_tf, chart_tf,
          rr_planned, risk_money_planned, pnl_money_realized, entry_price_exec, sl_exec, tp_exec,
          note, entry_model, raw_json, status, locked_at, ack_at, opened_at, closed_at, ack_status, ack_ticket, ack_error
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21,$22,$23,$24,$25,$26,$27,$28)
        ON CONFLICT (signal_id) DO NOTHING
        RETURNING signal_id
      `, [
        signal.signal_id,
        signal.created_at,
        signal.user_id || CFG.mt5DefaultUserId,
        signal.source,
        signal.action,
        signal.symbol,
        signal.volume,
        signal.sl,
        signal.tp,
        signal.signal_tf ?? signal.raw_json?.sourceTf ?? signal.raw_json?.timeframe ?? null,
        signal.chart_tf ?? signal.raw_json?.chartTf ?? null,
        signal.rr_planned ?? null,
        signal.risk_money_planned ?? null,
        signal.pnl_money_realized ?? null,
        signal.entry_price_exec ?? null,
        signal.sl_exec ?? null,
        signal.tp_exec ?? null,
        signal.note,
        signal.entry_model ?? null,
        JSON.stringify(signal.raw_json || {}),
        signal.status,
        signal.locked_at,
        signal.ack_at,
        signal.opened_at,
        signal.closed_at,
        signal.ack_status,
        signal.ack_ticket,
        signal.ack_error,
      ]);
      return { inserted: (r.rowCount || 0) > 0 };
    },
    async pullAndLockNextSignal() {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const sel = await client.query(`
          SELECT signal_id, created_at, action, symbol, volume, sl, tp, note, entry_price_exec, raw_json
          FROM signals
          WHERE status = 'NEW' OR (status = 'LOCKED' AND locked_at < NOW() - INTERVAL '5 minutes')
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `);
        if (!sel.rows.length) {
          await client.query("COMMIT");
          return null;
        }
        const next = sel.rows[0];
        await client.query(`
          UPDATE signals
          SET status = 'LOCKED', locked_at = $1
          WHERE signal_id = $2 AND (status = 'NEW' OR (status = 'LOCKED' AND locked_at < NOW() - INTERVAL '5 minutes'))
        `, [mt5NowIso(), next.signal_id]);
        await client.query("COMMIT");
        return mt5MapDbRow(next);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
    async pullAndLockSignalById(signalId) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const sel = await client.query(`
          SELECT signal_id, created_at, action, symbol, volume, sl, tp, note, entry_price_exec, raw_json
          FROM signals
          WHERE signal_id = $1 AND (status = 'NEW' OR (status = 'LOCKED' AND locked_at < NOW() - INTERVAL '5 minutes'))
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `, [signalId]);
        if (!sel.rows.length) {
          await client.query("COMMIT");
          return null;
        }
        const next = sel.rows[0];
        await client.query(`
          UPDATE signals
          SET status = 'LOCKED', locked_at = $1
          WHERE signal_id = $2 AND (status = 'NEW' OR (status = 'LOCKED' AND locked_at < NOW() - INTERVAL '5 minutes'))
        `, [mt5NowIso(), signalId]);
        await client.query("COMMIT");
        return mt5MapDbRow(next);
      } finally {
        client.release();
      }
    },
    async listActiveSignals() {
      const res = await pool.query(`
        SELECT signal_id, created_at, user_id, action, symbol, volume, sl, tp, status,
               ack_ticket, ack_status, pnl_money_realized, entry_price_exec, sl_exec, tp_exec
        FROM signals
        WHERE status IN ('NEW', 'LOCKED', 'PLACED', 'START') AND signal_id NOT LIKE 'SYSTEM_%'
        ORDER BY created_at ASC
      `);
      return res.rows.map((r) => ({
        ...r,
        raw_json: r.raw_json || {},
      }));
    },
    async bulkAckSignals(updates) {
      if (!Array.isArray(updates) || !updates.length) return { updated: 0 };
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        let count = 0;
        const now = mt5NowIso();
        for (const u of updates) {
          const internalStatus = mt5StatusToInternal(u.status);
          const ackStatus = mt5CanonicalStoredStatus(u.status);
          const res = await client.query(`
            UPDATE signals
            SET status = $1,
                ack_at = $2,
                ack_status = $3,
                ack_ticket = COALESCE($4, ack_ticket),
                pnl_money_realized = COALESCE($5, pnl_money_realized),
                closed_at = CASE WHEN ($6 IN ('TP','SL','FAIL','CANCEL','EXPIRED')) THEN $7 ELSE closed_at END
            WHERE signal_id = $8
          `, [
            internalStatus,
            now,
            ackStatus,
            u.ticket ?? null,
            u.pnl ?? null,
            internalStatus,
            now,
            u.signal_id
          ]);
          count += res.rowCount || 0;
        }
        await client.query("COMMIT");
        return { updated: count };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
    async findSignalById(signalId) {
      const res = await pool.query(`
        SELECT signal_id
        FROM signals
        WHERE signal_id = $1
        LIMIT 1
      `, [signalId]);
      return res.rows[0] || null;
    },
    async ackSignal(signalId, status, ticket, error, extra = {}) {
      const retryable = mt5IsRetryableConnectivityFail(status, error);
      const internalStatus = retryable ? "NEW" : mt5StatusToInternal(status);
      const ackStatus = mt5CanonicalStoredStatus(status);
      const now = mt5NowIso();
      const res = await pool.query(`
        UPDATE signals
        SET status = $1, ack_at = $2, ack_status = $3, ack_ticket = $4, ack_error = $5,
            pnl_money_realized = COALESCE($6, pnl_money_realized),
            entry_price_exec = COALESCE($7, entry_price_exec),
            sl_exec = COALESCE($8, sl_exec),
            tp_exec = COALESCE($9, tp_exec),
            locked_at = CASE WHEN $11 THEN NULL ELSE locked_at END,
            opened_at = CASE WHEN ($1 = 'PLACED' OR $1 = 'START') AND opened_at IS NULL THEN $2 ELSE opened_at END,
            closed_at = CASE WHEN ($1 = 'TP' OR $1 = 'SL' OR $1 = 'FAIL' OR $1 = 'CANCEL' OR $1 = 'EXPIRED') THEN $2 ELSE closed_at END
        WHERE signal_id = $10
      `, [
        internalStatus,
        now,
        ackStatus,
        ticket ?? null,
        error ?? null,
        extra.pnl_money_realized ?? null,
        extra.entry_price_exec ?? null,
        extra.sl_exec ?? null,
        extra.tp_exec ?? null,
        signalId,
        retryable,
      ]);
      return { changes: res.rowCount || 0 };
    },
    async findSignalById(signalId) {
      const res = await pool.query(`SELECT * FROM signals WHERE signal_id = $1 LIMIT 1`, [signalId]);
      return res.rows[0] || null;
    },
    async getSignalByTicket(ticket) {
      const res = await pool.query(`SELECT * FROM signals WHERE ack_ticket = $1 LIMIT 1`, [String(ticket)]);
      return res.rows[0] || null;
    },
    async listSignals(limit, statusFilter) {
      if (statusFilter) {
        const res = await pool.query(`
          SELECT signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
                 rr_planned, risk_money_planned, pnl_money_realized, entry_price_exec, sl_exec, tp_exec,
                 note, raw_json, status, locked_at, ack_at, opened_at, closed_at, ack_status, ack_ticket, ack_error
          FROM signals
          WHERE status = $1 AND signal_id NOT LIKE 'SYSTEM_%'
          ORDER BY created_at DESC
          LIMIT $2
        `, [statusFilter, limit]);
        return res.rows.map((r) => mt5MapDbRow(r));
      }
      const res = await pool.query(`
        SELECT signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
               rr_planned, risk_money_planned, pnl_money_realized, entry_price_exec, sl_exec, tp_exec,
               sl_pips, tp_pips, pip_value_per_lot, risk_money_actual, reward_money_planned,
               note, raw_json, status, locked_at, ack_at, opened_at, closed_at, ack_status, ack_ticket, ack_error
        FROM signals
        WHERE signal_id NOT LIKE 'SYSTEM_%'
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);
      return res.rows.map((r) => mt5MapDbRow(r));
    },
    async appendSignalEvent(signalId, eventType, payload = {}) {
      await pool.query(`
        INSERT INTO signal_events (signal_id, event_type, event_time, payload_json)
        VALUES ($1, $2, $3, $4::jsonb)
      `, [String(signalId), String(eventType), mt5NowIso(), JSON.stringify(payload || {})]);
    },
    async listSignalEvents(signalId, limit = 200) {
      const safeLimit = Math.max(1, Math.min(2000, Number(limit) || 200));
      const res = await pool.query(`
        SELECT id, signal_id, event_type, event_time, payload_json
        FROM signal_events
        WHERE signal_id = $1
        ORDER BY event_time DESC
        LIMIT $2
      `, [String(signalId), safeLimit]);
      return res.rows.map((r) => ({
        ...r,
        payload_json: r.payload_json || {},
      }));
    },
    async deleteAllEvents() {
      return pool.query(`DELETE FROM signal_events`);
    },
    async listAllEvents(limit, offset, filters = {}) {
      const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 1000));
      const safeOffset = Math.max(0, Number(offset) || 0);
      let sql = `
        SELECT e.id, e.signal_id, e.event_type, e.event_time, e.payload_json, s.symbol, s.ack_ticket
        FROM signal_events e
        LEFT JOIN signals s ON e.signal_id = s.signal_id
        WHERE 1=1
      `;
      const params = [];
      let pIdx = 1;
      if (filters.q) {
        const q = `%${filters.q}%`;
        sql += ` AND (e.signal_id ILIKE $${pIdx} OR s.ack_ticket::text ILIKE $${pIdx} OR s.symbol ILIKE $${pIdx} OR e.event_type ILIKE $${pIdx})`;
        params.push(q);
        pIdx++;
      }
      if (filters.type) {
        sql += ` AND e.event_type ILIKE $${pIdx}`;
        params.push(filters.type);
        pIdx++;
      }
      if (filters.symbol) {
        sql += ` AND s.symbol ILIKE $${pIdx}`;
        params.push(filters.symbol);
        pIdx++;
      }
      sql += ` ORDER BY e.event_time DESC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
      params.push(safeLimit, safeOffset);

      const res = await pool.query(sql, params);
      return res.rows.map((r) => ({
        ...r,
        payload_json: r.payload_json || {},
      }));
    },
    async pruneOldSignals(days) {
      const res = await pool.query(`
        DELETE FROM signals
        WHERE status = ANY($1::text[])
          AND created_at < NOW() - ($2 || ' days')::interval
      `, [mt5TerminalStatuses(), String(days)]);
      const left = await pool.query("SELECT COUNT(*)::int AS n FROM signals");
      return { removed: res.rowCount || 0, remaining: left.rows[0].n };
    },
    async deleteSignalsByIds(signalIds) {
      const ids = Array.isArray(signalIds)
        ? signalIds.map((s) => String(s || "")).filter(Boolean)
        : [];
      if (!ids.length) return { deleted: 0 };
      await pool.query(`DELETE FROM signal_events WHERE signal_id = ANY($1::text[])`, [ids]);
      const res = await pool.query(`DELETE FROM signals WHERE signal_id = ANY($1::text[])`, [ids]);
      return { deleted: res.rowCount || 0 };
    },
    async cancelSignalsByIds(signalIds) {
      const ids = Array.isArray(signalIds)
        ? signalIds.map((s) => String(s || "")).filter(Boolean)
        : [];
      if (!ids.length) return { updated: 0, updated_ids: [] };
      const now = mt5NowIso();
      const res = await pool.query(`
        UPDATE signals
        SET status = 'CANCEL', closed_at = $1
        WHERE signal_id = ANY($2::text[]) AND status IN ('NEW','LOCKED','START','PLACED')
        RETURNING signal_id
      `, [now, ids]);
      return { updated: res.rowCount || 0, updated_ids: (res.rows || []).map((r) => String(r.signal_id || "")) };
    },
    async listTables() {
      const res = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
      `);
      return res.rows.map(r => r.table_name);
    },
    async listTableRows(table, limit = 50, offset = 0, q = "") {
      const allowed = await this.listTables();
      if (!allowed.includes(table)) throw new Error(`Table ${table} not found or protected`);

      let rows = [];
      let total = 0;

      if (q) {
        const colRes = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
        `, [table]);
        
        const searchCols = colRes.rows
          .filter(c => ['text', 'character varying', 'jsonb', 'json'].includes(c.data_type.toLowerCase()))
          .map(c => c.column_name);

        if (searchCols.length > 0) {
          const where = searchCols.map((c, i) => `${c}::text ILIKE $${i + 1}`).join(" OR ");
          const query = `SELECT * FROM "${table}" WHERE ${where} LIMIT $${searchCols.length + 1} OFFSET $${searchCols.length + 2}`;
          const countQuery = `SELECT COUNT(*) FROM "${table}" WHERE ${where}`;
          
          const params = [...searchCols.map(() => `%${q}%`), limit, offset];
          const dataRes = await pool.query(query, params);
          const countRes = await pool.query(countQuery, searchCols.map(() => `%${q}%`));
          
          rows = dataRes.rows;
          total = parseInt(countRes.rows[0].count);
        } else {
          const dataRes = await pool.query(`SELECT * FROM "${table}" LIMIT $1 OFFSET $2`, [limit, offset]);
          const countRes = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
          rows = dataRes.rows;
          total = parseInt(countRes.rows[0].count);
        }
      } else {
        const dataRes = await pool.query(`SELECT * FROM "${table}" LIMIT $1 OFFSET $2`, [limit, offset]);
        const countRes = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
        rows = dataRes.rows;
        total = parseInt(countRes.rows[0].count);
      }

      return { rows, total };
    },
    async getUiAuthUser(email) {
      const target = normalizeEmail(email);
      if (!target) return null;
      const res = await pool.query(`
        SELECT user_id, user_name, email, role, is_active, password_salt, password_hash, updated_at, created_at
        FROM users
        WHERE lower(email) = $1
        LIMIT 1
      `, [target]);
      return res.rows[0] || null;
    },
    async getUiAuthUserById(userId) {
      const target = String(userId || "").trim();
      if (!target) return null;
      const res = await pool.query(`
        SELECT user_id, user_name, email, role, is_active, password_salt, password_hash, updated_at, created_at
        FROM users
        WHERE user_id = $1
        LIMIT 1
      `, [target]);
      return res.rows[0] || null;
    },
    async listUiUsers() {
      const res = await pool.query(`
        SELECT user_id, user_name, email, role, is_active, updated_at, created_at
        FROM users
        ORDER BY created_at ASC, user_id ASC
      `);
      return res.rows || [];
    },
    async upsertUiAuthUser(user) {
      const target = normalizeEmail(user?.email);
      if (!target) throw new Error("email is required");
      const userId = String(user?.user_id || CFG.mt5DefaultUserId);
      await pool.query(`
        INSERT INTO users (user_id, user_name, email, role, is_active, password_salt, password_hash, updated_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) DO UPDATE SET
          user_name = EXCLUDED.user_name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active,
          password_salt = EXCLUDED.password_salt,
          password_hash = EXCLUDED.password_hash,
          updated_at = EXCLUDED.updated_at
      `, [
        userId,
        String(user?.user_name || fallbackUserNameFromEmail(target)),
        target,
        normalizeUserRole(user?.role || UI_ROLE_SYSTEM),
        normalizeUserActive(user?.is_active, true),
        String(user?.password_salt || ""),
        String(user?.password_hash || ""),
        normalizeIsoTimestamp(user?.updated_at, new Date().toISOString()),
        normalizeIsoTimestamp(user?.created_at, mt5NowIso()),
      ]);
      return { ok: true };
    },
    async listUserAccounts(userId) {
      const res = await pool.query(`
        SELECT account_id, user_id, name, balance, status, metadata, created_at, updated_at
        FROM accounts
        WHERE user_id = $1
        ORDER BY created_at ASC, account_id ASC
      `, [String(userId || "")]);
      return res.rows || [];
    },
    async upsertUserAccount(userId, account) {
      const targetUser = String(userId || "");
      const accountId = String(account?.account_id || "");
      const now = mt5NowIso();
      const res = await pool.query(`
        INSERT INTO accounts (account_id, user_id, name, balance, status, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        ON CONFLICT (account_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          balance = EXCLUDED.balance,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
        RETURNING account_id, user_id, name, balance, status, metadata, created_at, updated_at
      `, [
        accountId,
        targetUser,
        String(account?.name || ""),
        account?.balance === null || account?.balance === undefined || Number.isNaN(Number(account.balance)) ? null : Number(account.balance),
        String(account?.status || ""),
        account?.metadata && typeof account.metadata === "object" ? JSON.stringify(account.metadata) : null,
        now,
        now,
      ]);
      return res.rows[0] || null;
    },
    async deleteUserAccount(userId, accountId) {
      await pool.query(`DELETE FROM accounts WHERE user_id = $1 AND account_id = $2`, [String(userId || ""), String(accountId || "")]);
    },
    async listUserApiKeys(userId) {
      const res = await pool.query(`
        SELECT key_id, user_id, label, key_value, is_active, last_used_at, created_at, updated_at
        FROM user_api_keys
        WHERE user_id = $1
        ORDER BY created_at ASC, key_id ASC
      `, [String(userId || "")]);
      return res.rows || [];
    },
    async createUserApiKey(userId, key) {
      const now = mt5NowIso();
      const row = {
        key_id: String(crypto.randomUUID()),
        user_id: String(userId || ""),
        label: String(key?.label || ""),
        key_value: String(key?.key_value || ""),
        is_active: normalizeUserActive(key?.is_active, true),
        created_at: now,
        updated_at: now,
      };
      const res = await pool.query(`
        INSERT INTO user_api_keys (key_id, user_id, label, key_value, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING key_id, user_id, label, key_value, is_active, last_used_at, created_at, updated_at
      `, [row.key_id, row.user_id, row.label, row.key_value, row.is_active, row.created_at, row.updated_at]);
      return res.rows[0] || row;
    },
    async updateUserApiKey(userId, keyId, patch = {}) {
      const current = await pool.query(`
        SELECT key_id, user_id, label, key_value, is_active, last_used_at, created_at, updated_at
        FROM user_api_keys
        WHERE user_id = $1 AND key_id = $2
        LIMIT 1
      `, [String(userId || ""), String(keyId || "")]);
      if (!current.rows[0]) return null;
      const nextLabel = patch.label === undefined ? String(current.rows[0].label || "") : String(patch.label || "");
      const nextActive = patch.is_active === undefined ? normalizeUserActive(current.rows[0].is_active, true) : normalizeUserActive(patch.is_active, true);
      const res = await pool.query(`
        UPDATE user_api_keys
        SET label = $1, is_active = $2, updated_at = $3
        WHERE user_id = $4 AND key_id = $5
        RETURNING key_id, user_id, label, key_value, is_active, last_used_at, created_at, updated_at
      `, [nextLabel, nextActive, mt5NowIso(), String(userId || ""), String(keyId || "")]);
      return res.rows[0] || null;
    },
    async deleteUserApiKey(userId, keyId) {
      await pool.query(`DELETE FROM user_api_keys WHERE user_id = $1 AND key_id = $2`, [String(userId || ""), String(keyId || "")]);
    },
    async renewSignalsByIds(signalIds) {
      const ids = Array.isArray(signalIds)
        ? signalIds.map((s) => String(s || "")).filter(Boolean)
        : [];
      if (!ids.length) return { updated: 0, updated_ids: [] };
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const selected = await client.query(`
          SELECT *
          FROM signals
          WHERE signal_id = ANY($1::text[])
          FOR UPDATE
        `, [ids]);
        const updatedIds = [];
        for (const row of (selected.rows || [])) {
          const oldId = String(row.signal_id || "");
          const cur = mt5CanonicalStoredStatus(row.status);
          if (cur === "NEW" || cur === "LOCKED") continue;
          const base = mt5RenewSignalIdBase(oldId);
          const existingRows = await client.query(`
            SELECT signal_id
            FROM signals
            WHERE signal_id = $1 OR signal_id LIKE $2
          `, [base, `${base}.%`]);
          const renewedId = mt5RenewSignalIdFromExisting(
            base,
            (existingRows.rows || []).map((r) => String(r.signal_id || "")),
          );
          const now = mt5NowIso();
          const ins = await client.query(`
            INSERT INTO signals (
              signal_id, created_at, user_id, source, action, symbol, volume, sl, tp,
              signal_tf, chart_tf, rr_planned, risk_money_planned,
              pnl_money_realized, entry_price_exec, sl_exec, tp_exec,
              note, raw_json, status, locked_at, ack_at, opened_at, closed_at,
              ack_status, ack_ticket, ack_error
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10, $11, $12, $13,
              NULL, NULL, NULL, NULL,
              $14, $15, 'NEW', NULL, NULL, NULL, NULL,
              NULL, NULL, NULL
            )
            ON CONFLICT (signal_id) DO NOTHING
          `, [
            renewedId, now, row.user_id, row.source, row.action, row.symbol, row.volume, row.sl, row.tp,
            row.signal_tf, row.chart_tf, row.rr_planned, row.risk_money_planned,
            row.note, row.raw_json,
          ]);
          if ((ins.rowCount || 0) <= 0) continue;
          await client.query(`DELETE FROM signal_events WHERE signal_id = $1`, [oldId]);
          await client.query(`DELETE FROM signals WHERE signal_id = $1`, [oldId]);
          updatedIds.push(renewedId);
        }
        await client.query("COMMIT");
        return { updated: updatedIds.length, updated_ids: updatedIds };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  };
  return MT5_BACKEND;
}

async function mt5Backend() {
  return mt5InitBackend();
}

function mt5NormalizeAction(payload) {
  const raw = String(payload.action || payload.side || "").trim().toUpperCase();
  if (!["BUY", "SELL", "CLOSE"].includes(raw)) {
    throw new Error(`Unsupported action/side: ${raw}`);
  }
  return raw;
}

function mt5NormalizeSymbol(payload) {
  const symbol = String(payload.symbol || "").trim().toUpperCase();
  if (!symbol) {
    throw new Error("symbol is required");
  }
  return symbol;
}

function mt5NormalizeVolume(payload) {
  const v = payload.lots ?? payload.volume;
  if (v === undefined || v === null || v === "") {
    return CFG.mt5DefaultLot;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("volume/lots must be > 0");
  }
  return n;
}

function mt5NormalizeOrderType(payload) {
  const raw = String(payload.order_type ?? payload.orderType ?? "").trim().toLowerCase();
  if (!raw) return "limit";
  if (raw === "limit" || raw === "stop" || raw === "market") return raw;
  throw new Error("order_type must be one of: limit, stop, market");
}

function mt5BuildSignalId(payload, fallbackPrefix = "tv") {
  const provided = String(payload.id || "").trim();
  if (provided) {
    return provided.replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 96);
  }
  return `${fallbackPrefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function mt5BuildNote(payload) {
  const noteParts = [payload.source, payload.signal_tf, payload.reason, payload.note].filter(Boolean);
  return noteParts.join(" | ");
}

function mt5TfToMinutes(tf) {
  if (!tf) return null;
  const s = String(tf).toLowerCase().trim();
  if (s === "1" || s === "1m") return "1";
  if (s === "2" || s === "2m") return "2";
  if (s === "3" || s === "3m") return "3";
  if (s === "5" || s === "5m") return "5";
  if (s === "10" || s === "10m") return "10";
  if (s === "15" || s === "15m") return "15";
  if (s === "30" || s === "30m") return "30";
  if (s === "60" || s === "1h") return "60";
  if (s === "120" || s === "2h") return "120";
  if (s === "240" || s === "4h") return "240";
  if (s === "1440" || s === "1d" || s === "d") return "1440";
  if (s === "10080" || s === "1w" || s === "w") return "10080";
  if (s === "43200" || s === "1m" || s === "1mn" || s === "mn" || s === "1mo") return "43200";
  
  const m = s.match(/^(\d+)([mhdwm])$/);
  if (m) {
    const val = parseInt(m[1]);
    const unit = m[2];
    if (unit === 'm') return String(val);
    if (unit === 'h') return String(val * 60);
    if (unit === 'd') return String(val * 1440);
    if (unit === 'w') return String(val * 10080);
    if (unit === 'm') return String(val * 43200);
  }
  const n = parseInt(s);
  return isNaN(n) ? s : String(n);
}

async function mt5EnqueueSignalFromPayload(payload, opts = {}) {
  const source = String(payload.source || opts.source || "tradingview");
  const eventType = String(opts.eventType || "QUEUED");
  const fallbackIdPrefix = String(opts.fallbackIdPrefix || "tv");

  const action = mt5NormalizeAction(payload);
  const symbol = mt5NormalizeSymbol(payload);
  const volume = mt5NormalizeVolume(payload);
  const orderType = mt5NormalizeOrderType(payload);
  const signalId = mt5BuildSignalId(payload, fallbackIdPrefix);
  const userId = envStr(payload.user_id ?? payload.userId ?? payload.user ?? CFG.mt5DefaultUserId, CFG.mt5DefaultUserId);
  const rrPlanned = asNum(payload.rr ?? payload.risk_reward, NaN);
  const riskMoneyPlanned = asNum(payload.risk_money ?? payload.money_risk ?? payload.riskMoney, NaN);
  const signalTf = mt5TfToMinutes(payload.signal_tf ?? payload.signalTf ?? payload.sourceTf ?? payload.timeframe ?? payload.tf);
  const chartTf = mt5TfToMinutes(payload.chart_tf ?? payload.chartTf ?? payload.chartTimeframe ?? payload.chart_tf_period);
  const note = mt5BuildNote(payload);

  const plannedEntry = asNum(payload.entry ?? payload.price, NaN);
  const rawJson = payload.raw_json || payload;
  let rawJsonNormalized = {
    ...rawJson,
    order_type: orderType,
    entry_model: String(payload.entry_model ?? payload.entryModel ?? ""),
  };

  const hasRisk = rawJsonNormalized.riskPct != null || rawJsonNormalized.risk_pct != null || rawJsonNormalized.volumePct != null || rawJsonNormalized.volume_pct != null;
  if (!hasRisk) {
    rawJsonNormalized.riskPct = 1.0;
  }
  // Strip sensitive credentials before persisting to DB.
  delete rawJsonNormalized.apiKey;
  delete rawJsonNormalized.api_key;
  delete rawJsonNormalized.password;
  delete rawJsonNormalized.token;
  const upsertResult = await mt5UpsertSignal({
    signal_id: signalId,
    created_at: mt5NowIso(),
    user_id: userId,
    source,
    action,
    symbol,
    volume,
    sl: payload.sl ?? null,
    tp: payload.tp ?? null,
    rr_planned: Number.isFinite(rrPlanned) ? rrPlanned : null,
    risk_money_planned: Number.isFinite(riskMoneyPlanned) ? riskMoneyPlanned : null,
    signal_tf: signalTf || null,
    chart_tf: chartTf || null,
    pnl_money_realized: null,
    entry_price_exec: Number.isFinite(plannedEntry) && plannedEntry > 0 ? plannedEntry : null,
    sl_exec: null,
    tp_exec: null,
    note,
    entry_model: String(payload.entry_model || payload.entryModel || payload.model || ""),
    raw_json: rawJsonNormalized,
    status: "NEW",
    locked_at: null,
    ack_at: null,
    opened_at: null,
    closed_at: null,
    ack_status: null,
    ack_ticket: null,
    ack_error: null,
  });

  if (upsertResult?.inserted) {
    // Sanitize event payload — never persist API keys to signal_events.
    const sanitizedPayload = { ...(payload.raw_json || payload) };
    delete sanitizedPayload.apiKey;
    delete sanitizedPayload.api_key;
    delete sanitizedPayload.password;
    delete sanitizedPayload.token;
    await mt5AppendSignalEvent(signalId, eventType, {
      source,
      action,
      symbol,
      order_type: orderType,
      signal_tf: signalTf || null,
      chart_tf: chartTf || null,
      timeframe: payload.timeframe || null,
      strategy: payload.strategy || null,
      provider: payload.provider || null,
      raw_payload: sanitizedPayload,
    });
  }

  return { signal_id: signalId, action, symbol, status: upsertResult?.inserted ? "NEW" : "DUPLICATE" };
}

function mt5NormalizeAckStatus(value) {
  const s = String(value || "").trim().toUpperCase();
  if (!s) throw new Error("status is required");
  const legacyToCurrent = {
    DONE: "PLACED",
    FAILED: "FAIL",
    PENDING: "PLACED",
    STARTED: "START",
    CANCELED: "CANCEL",
    CANCELLED: "CANCEL",
    CLOSED_TP: "TP",
    CLOSED_SL: "SL",
    CLOSED_MANUAL: "CANCEL",
    CLOSED: "PLACED",
  };
  const normalized = legacyToCurrent[s] || s;
  const allowed = ["FAIL", "START", "TP", "SL", "CANCEL", "EXPIRED", "PLACED"];
  if (!allowed.includes(normalized)) {
    throw new Error("status must be one of: FAIL, START, TP, SL, CANCEL, EXPIRED, PLACED");
  }
  return normalized;
}

function mt5StatusToInternal(status) {
  return mt5NormalizeAckStatus(status);
}

function mt5CanonicalStoredStatus(value) {
  const s = String(value || "").trim().toUpperCase();
  if (!s) return "";
  const legacyToCurrent = {
    DONE: "PLACED",
    FAILED: "FAIL",
    CANCELED: "CANCEL",
    CANCELLED: "CANCEL",
    CLOSED_TP: "TP",
    CLOSED_SL: "SL",
    CLOSED_MANUAL: "CANCEL",
    CLOSED: "PLACED",
    OK: "PLACED"
  };
  return legacyToCurrent[s] || s;
}

function mt5IsRetryableConnectivityFail(status, errorText) {
  const st = mt5CanonicalStoredStatus(status);
  if (st !== "FAIL") return false;
  const msg = String(errorText || "").toLowerCase();
  return msg.includes("retcode=10031")
    || msg.includes("no connection")
    || msg.includes("trade server")
    || msg.includes("off quotes");
}

function mt5PublicState(row) {
  const status = mt5CanonicalStoredStatus(row.status);
  const ackStatus = row.ack_status ? mt5CanonicalStoredStatus(row.ack_status) : null;
  const updatedAt = [
    row.closed_at,
    row.opened_at,
    row.ack_at,
    row.locked_at,
    row.created_at,
  ]
    .map((v) => {
      const t = Date.parse(String(v || ""));
      return Number.isFinite(t) ? t : NaN;
    })
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => b - a)[0];
  let stage = "unknown";
  if (status === "NEW") stage = "queued";
  else if (status === "LOCKED") stage = "pulled_by_mt5";
  else if (status === "START") stage = "position_active";
  else if (status === "PLACED") stage = "ack_placed";
  else if (status === "FAIL") stage = "execute_failed";
  else if (status === "TP") stage = "take_profit_hit";
  else if (status === "SL") stage = "stop_loss_hit";
  else if (status === "CANCEL") stage = "manually_cancelled";
  else if (status === "EXPIRED") stage = "expired_ignored";

  return {
    ...row,
    status,
    ack_status: ackStatus,
    updated_at: Number.isFinite(updatedAt) ? new Date(updatedAt).toISOString() : null,
    stage,
    is_open_candidate: status === "NEW" || status === "LOCKED" || status === "START" || status === "PLACED",
    dedupe_safe: status !== "NEW",
  };
}

function mt5TerminalStatuses() {
  return ["FAIL", "TP", "SL", "CANCEL", "EXPIRED"];
}

async function mt5UpsertSignal(signal) {
  const b = await mt5Backend();
  return b.upsertSignal(signal);
}

async function mt5PullAndLockNextSignal() {
  const b = await mt5Backend();
  return b.pullAndLockNextSignal();
}

async function mt5PullAndLockSignalById(signalId) {
  const b = await mt5Backend();
  return b.pullAndLockSignalById(signalId);
}

async function mt5FindSignalById(signalId) {
  const b = await mt5Backend();
  return b.findSignalById(signalId);
}

async function mt5GetSignalByTicket(ticket) {
  const b = await mt5Backend();
  return b.getSignalByTicket(ticket);
}

async function mt5AckSignal(signalId, status, ticket, error, extra = {}) {
  const b = await mt5Backend();
  return b.ackSignal(signalId, status, ticket, error, extra);
}

async function mt5ListSignals(limit, statusFilter) {
  const b = await mt5Backend();
  return b.listSignals(limit, statusFilter);
}

async function mt5AppendSignalEvent(signalId, eventType, payload = {}) {
  const b = await mt5Backend();
  if (!b.appendSignalEvent) return;
  return b.appendSignalEvent(signalId, eventType, payload);
}

async function mt5ListSignalEvents(signalId, limit = 200) {
  const b = await mt5Backend();
  if (!b.listSignalEvents) return [];
  return b.listSignalEvents(signalId, limit);
}

async function mt5ListActiveSignals() {
  const b = await mt5Backend();
  return b.listActiveSignals();
}

async function mt5BulkAckSignals(updates) {
  const b = await mt5Backend();
  return b.bulkAckSignals(updates);
}

async function mt5ListAllEvents(limit = 1000, offset = 0, filters = {}) {
  const b = await mt5Backend();
  if (!b.listAllEvents) return [];
  return b.listAllEvents(limit, offset, filters);
}

async function mt5DeleteAllEvents() {
  const b = await mt5Backend();
  if (!b.deleteAllEvents) return { deleted: 0 };
  const res = await b.deleteAllEvents();
  // Postgres returns rowCount, SQLite returns changes
  return { deleted: res.rowCount ?? res.changes ?? 0 };
}

async function mt5PruneSignals(days) {
  const safeDays = Math.max(1, Math.min(3650, Number.isFinite(days) ? days : 14));
  const b = await mt5Backend();
  return b.pruneOldSignals(safeDays);
}

async function mt5DeleteSignalsByIds(signalIds) {
  const ids = Array.isArray(signalIds)
    ? signalIds.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) return { deleted: 0 };
  const b = await mt5Backend();
  if (!b.deleteSignalsByIds) return { deleted: 0 };
  return b.deleteSignalsByIds(ids);
}

async function mt5CancelSignalsByIds(signalIds) {
  const ids = Array.isArray(signalIds)
    ? signalIds.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) return { updated: 0, updated_ids: [] };
  const b = await mt5Backend();
  if (!b.cancelSignalsByIds) return { updated: 0, updated_ids: [] };
  return b.cancelSignalsByIds(ids);
}

async function mt5RenewSignalsByIds(signalIds) {
  const ids = Array.isArray(signalIds)
    ? signalIds.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) return { updated: 0, updated_ids: [] };
  const b = await mt5Backend();
  if (!b.renewSignalsByIds) return { updated: 0, updated_ids: [] };
  return b.renewSignalsByIds(ids);
}

function mt5CsvTimestamp(value) {
  const d = new Date(String(value || ""));
  if (!Number.isFinite(d.getTime())) {
    return "";
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function csvField(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[;"\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function mt5SignalsToBacktestCsv(rows, includeHeader = true) {
  const lines = [];
  if (includeHeader) {
    lines.push("timestamp;signal_id;action;symbol;volume;sl;tp;note");
  }
  for (const r of rows) {
    lines.push([
      csvField(mt5CsvTimestamp(r.created_at)),
      csvField(r.signal_id || ""),
      csvField(r.action || ""),
      csvField(r.symbol || ""),
      csvField(r.volume ?? ""),
      csvField(r.sl ?? ""),
      csvField(r.tp ?? ""),
      csvField(r.note || ""),
    ].join(";"));
  }
  return lines.join("\n");
}

function mt5PeriodRange(period) {
  const now = new Date();
  const end = now.toISOString();

  if (period === "all") {
    return { start: null, end: null };
  }
  if (period === "today") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    return { start, end };
  }
  if (period === "yesterday") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)).toISOString();
    const endY = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    return { start, end: endY };
  }
  if (period === "week") {
    const day = now.getUTCDay() || 7; // Monday=1 ... Sunday=7
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (day - 1)));
    return { start: startDate.toISOString(), end };
  }
  if (period === "last_week") {
    const day = now.getUTCDay() || 7;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (day - 1) - 7)).toISOString();
    const endLW = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (day - 1))).toISOString();
    return { start, end: endLW };
  }
  if (period === "month") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    return { start, end };
  }
  if (period === "last_month") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString();
    const endLM = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    return { start, end: endLM };
  }
  if (period === "year") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
    return { start, end };
  }
  return { start: null, end };
}

function mt5ToMs(value) {
  const t = Date.parse(String(value || ""));
  return Number.isFinite(t) ? t : NaN;
}

function mt5FilterRows(rows, opts = {}) {
  const userId = envStr(opts.userId);
  const symbol = envStr(opts.symbol).toUpperCase();
  const source = envStr(opts.source);
  const entryModel = envStr(opts.entryModel);
  const chartTf = envStr(opts.chartTf);
  const signalTf = envStr(opts.signalTf);
  const statuses = Array.isArray(opts.statuses)
    ? opts.statuses.map((s) => mt5CanonicalStoredStatus(s)).filter(Boolean)
    : [];
  const fromMs = opts.from ? mt5ToMs(opts.from) : NaN;
  const toMs = opts.to ? mt5ToMs(opts.to) : NaN;
  return rows.filter((r) => {
    const rs = mt5CanonicalStoredStatus(r.status);
    if (userId && String(r.user_id || "") !== userId) return false;
    if (symbol && String(r.symbol || "").toUpperCase() !== symbol) return false;
    if (source && mt5StrategyFromRow(r) !== source) return false;
    if (entryModel && mt5EntryModelFromRow(r) !== entryModel) return false;
    if (chartTf && String(r.chart_tf || r.raw_json?.chart_tf || r.raw_json?.chartTf || "") !== chartTf) return false;
    if (signalTf && String(r.signal_tf || r.raw_json?.signal_tf || r.raw_json?.sourceTf || r.raw_json?.timeframe || "") !== signalTf) return false;
    if (statuses.length > 0 && !statuses.includes(rs)) return false;
    const t = mt5ToMs(r.created_at);
    if (Number.isFinite(fromMs) && (!Number.isFinite(t) || t < fromMs)) return false;
    if (Number.isFinite(toMs) && (!Number.isFinite(t) || t > toMs)) return false;
    return true;
  });
}

function mt5ResolveTradeFilters(url, payload = null) {
  const pick = (key, fallback = "") => {
    const fromPayload = payload && payload[key] !== undefined && payload[key] !== null ? payload[key] : "";
    const fromUrl = url.searchParams.get(key);
    return envStr(fromPayload || fromUrl || fallback);
  };
  const statuses = pick("status")
    .toUpperCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const range = pick("range").toLowerCase();
  const period = mt5PeriodRange(range);
  return {
    userId: pick("user_id"),
    symbol: pick("symbol"),
    source: pick("source"),
    entryModel: pick("entry_model"),
    chartTf: pick("chart_tf"),
    signalTf: pick("signal_tf"),
    statuses,
    from: pick("from") || period.start,
    to: pick("to") || period.end,
    q: pick("q").toLowerCase(),
  };
}

function mt5ResolveSignalIds(url, payload = null) {
  const fromPayload = payload && payload.signal_ids !== undefined && payload.signal_ids !== null
    ? payload.signal_ids
    : (payload && payload.ids !== undefined && payload.ids !== null ? payload.ids : null);
  const fromQuery = url.searchParams.get("signal_ids") || url.searchParams.get("ids") || "";
  const raw = fromPayload !== null ? fromPayload : fromQuery;
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((s) => String(s || "").trim()).filter(Boolean))];
  }
  if (typeof raw === "string") {
    return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  }
  return [];
}

async function mt5GetFilteredTrades(url, payload = null, limitDefault = 10000) {
  const limitRaw = Number((payload && payload.limit) ?? url.searchParams.get("limit") ?? limitDefault);
  const limit = Math.max(100, Math.min(200000, Number.isFinite(limitRaw) ? limitRaw : limitDefault));
  const filters = mt5ResolveTradeFilters(url, payload);
  let rows = mt5FilterRows(await mt5ListSignals(limit, ""), {
    userId: filters.userId,
    symbol: filters.symbol,
    source: filters.source,
    entryModel: filters.entryModel,
    chartTf: filters.chartTf,
    signalTf: filters.signalTf,
    statuses: filters.statuses,
    from: filters.from,
    to: filters.to,
  });
  if (filters.q) {
    const q = String(filters.q).toLowerCase();
    rows = rows.filter((r) =>
      String(r.signal_id || "").toLowerCase().includes(q)
      || String(r.note || "").toLowerCase().includes(q)
      || String(r.symbol || "").toLowerCase().includes(q)
      || String(r.ack_ticket || "").toLowerCase().includes(q),
    );
  }
  const signalIds = mt5ResolveSignalIds(url, payload);
  if (signalIds.length > 0) {
    const idSet = new Set(signalIds);
    rows = rows.filter((r) => idSet.has(String(r.signal_id || "")));
  }
  filters.signal_ids = signalIds;
  return { rows, filters, limit };
}

function mt5ComputeMetrics(rows) {
  const closed = rows.filter((r) => {
    const s = mt5CanonicalStoredStatus(r.status);
    return s === "TP" || s === "SL" || s === "FAIL" || s === "PLACED" || s === "CANCEL" || s === "EXPIRED";
  });
  const wins = rows.filter((r) => {
    const pnl = Number(r.pnl_money_realized);
    return Number.isFinite(pnl) && pnl > 0;
  });
  const losses = rows.filter((r) => {
    const pnl = Number(r.pnl_money_realized);
    return Number.isFinite(pnl) && pnl < 0;
  });
  const pnl = rows.reduce((acc, r) => {
    const v = Number(r.pnl_money_realized);
    return Number.isFinite(v) ? acc + v : acc;
  }, 0);
  return {
    total_trades: rows.length,
    closed_trades: closed.length,
    wins: wins.length,
    losses: losses.length,
    win_rate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    pnl_money_realized: pnl,
  };
}

function mt5CountBy(rows, pick, { sortDesc = true, limit = 0 } = {}) {
  const map = new Map();
  for (const row of rows || []) {
    const key = String(pick(row) || "").trim();
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  let entries = [...map.entries()].map(([key, count]) => ({ key, count }));
  entries.sort((a, b) => {
    if (sortDesc) return b.count - a.count || (a.key < b.key ? -1 : 1);
    return a.key < b.key ? -1 : 1;
  });
  if (limit > 0) entries = entries.slice(0, limit);
  return entries;
}

function mt5StatusTier(statusRaw) {
  const s = mt5CanonicalStoredStatus(statusRaw);
  if (["NEW", "LOCKED", "PLACED", "START"].includes(s)) return "OPEN";
  if (["TP", "SL"].includes(s)) return "WINS_LOSSES";
  return "CLOSED";
}

const MT5_TRADE_STATUSES = new Set(["TP", "SL", "START", "PLACED"]);

function mt5IsTradeStatus(statusRaw) {
  return MT5_TRADE_STATUSES.has(mt5CanonicalStoredStatus(statusRaw));
}

function mt5ComputeRMultiple(row) {
  const pnl = Number(row?.pnl_money_realized);
  const risk = Number(row?.risk_money_planned);
  if (Number.isFinite(pnl)) {
    if (Number.isFinite(risk) && risk > 0) return pnl / risk;
    const s = mt5CanonicalStoredStatus(row.status);
    const planned = Number(row?.rr_planned);
    
    if (s === "TP") {
      return (Number.isFinite(planned) && planned > 0) ? planned : 1; 
    }
    if (s === "SL") return -1;
  }
  return null;
}

function mt5ComputeTopWinrateRows(rows, keyPicker, { limit = 10, includeDirection = false } = {}) {
  const map = new Map();
  for (const row of rows || []) {
    const baseKey = String(keyPicker(row) || "").trim();
    if (!baseKey) continue;
    const direction = String(row?.action || "").toUpperCase();
    const directionSafe = direction === "BUY" || direction === "SELL" ? direction : "-";
    const key = includeDirection ? `${baseKey} | ${directionSafe}` : baseKey;
    const status = mt5CanonicalStoredStatus(row.status);
    const rr = mt5ComputeRMultiple(row);
    const pnl = Number(row.pnl_money_realized);
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: baseKey,
        direction: directionSafe,
        wins: 0,
        losses: 0,
        trades: 0,
        pnl_total: 0,
        rr_total: 0,
        rr_sum: 0,
        rr_count: 0,
      });
    }
    const st = map.get(key);
    st.trades++;
    if (status === "TP") st.wins++;
    if (status === "SL") st.losses++;
    if (Number.isFinite(pnl)) st.pnl_total += pnl;
    if (Number.isFinite(rr)) {
      st.rr_sum += rr;
      st.rr_count++;
      st.rr_total = st.rr_sum; // the total RR is the sum
    }
  }
  let entries = [...map.values()];
  for (const st of entries) {
    const closed = st.wins + st.losses;
    st.win_rate = closed > 0 ? (st.wins / closed) * 100 : 0;
  }
  entries.sort((a, b) => b.win_rate - a.win_rate || b.trades - a.trades || (a.key < b.key ? -1 : 1));
  if (limit > 0) entries = entries.slice(0, limit);
  return entries;
}

function mt5EntryModelFromRow(row) {
  const direct = envStr(row?.entry_model);
  if (direct) return direct;
  const raw = row?.raw_json || {};
  return envStr(raw.entry_model || raw.entryModel || raw.model || raw.strategy);
}

function mt5StrategyFromRow(row) {
  const raw = row?.raw_json || {};
  return envStr(raw.strategy || raw.model || raw.entry_model || raw.entryModel);
}

function mt5ComputeTradeMetrics(rows) {
  const all = Array.isArray(rows) ? rows : [];
  const trades = all.filter((r) => mt5IsTradeStatus(r.status));
  const wins = trades.filter((r) => mt5CanonicalStoredStatus(r.status) === "TP").length;
  const losses = trades.filter((r) => mt5CanonicalStoredStatus(r.status) === "SL").length;
  
  // Strict TP/SL trades for KPI accuracy
  const tpSlTrades = trades.filter(r => {
    const s = mt5CanonicalStoredStatus(r.status);
    return s === "TP" || s === "SL";
  });

  const winBase = wins + losses; 
  
  let totalPnl = 0;
  let buyPnl = 0;
  let sellPnl = 0;
  let winSumPnl = 0;
  let loseSumPnl = 0;
  
  for (const r of trades) {
    const pnl = Number(r?.pnl_money_realized);
    if (Number.isFinite(pnl)) {
      totalPnl += pnl;
      const act = String(r?.action || "").toUpperCase();
      if (act === "BUY") buyPnl += pnl;
      else if (act === "SELL") sellPnl += pnl;

      if (pnl > 0) winSumPnl += pnl;
      else if (pnl < 0) loseSumPnl += pnl;
    }
  }

  const totalRr = tpSlTrades.reduce((acc, r) => {
    const rr = mt5ComputeRMultiple(r);
    return Number.isFinite(rr) ? acc + rr : acc;
  }, 0);
  
  return {
    total_signals: all.length,
    total_trades: tpSlTrades.length,
    wins,
    losses,
    win_rate: winBase > 0 ? (wins / winBase) * 100 : 0,
    total_pnl: totalPnl,
    buy_pnl: buyPnl,
    sell_pnl: sellPnl,
    win_sum_pnl: winSumPnl,
    lose_sum_pnl: loseSumPnl,
    total_rr: totalRr,
  };
}

function getHeaderApiKey(req) {
  return String(req.headers["x-api-key"] || req.headers.authorization?.replace(/^Bearer\s+/i, "") || "");
}

function getPayloadApiKey(payload = null) {
  if (!payload) return "";
  return String(payload.apiKey || payload.api_key || "");
}

function getQueryApiKey(urlObj = null) {
  if (!urlObj) return "";
  return String(urlObj.searchParams.get("apiKey") || urlObj.searchParams.get("api_key") || "");
}

function getApiKeyFromReq(req, payload = null, urlObj = null) {
  const headerKey = getHeaderApiKey(req);
  if (headerKey) return headerKey;
  const payloadKey = getPayloadApiKey(payload);
  if (payloadKey) return payloadKey;
  return getQueryApiKey(urlObj);
}

function resolveEaApiKey(req, payload = null, urlObj = null) {
  const headerKey = getHeaderApiKey(req);
  if (headerKey) return { key: headerKey, source: "header" };
  if (CFG.mt5AuthAllowLegacyPayloadKey) {
    const payloadKey = getPayloadApiKey(payload);
    if (payloadKey) return { key: payloadKey, source: "payload" };
  }
  if (CFG.mt5AuthAllowLegacyQueryKey) {
    const queryKey = getQueryApiKey(urlObj);
    if (queryKey) return { key: queryKey, source: "query" };
  }
  return { key: "", source: "none" };
}

function requireEaKey(req, res, urlObj, payload = null) {
  if (CFG.mt5EaApiKeys.size === 0) return true;
  const { key, source } = resolveEaApiKey(req, payload, urlObj);
  if (key && CFG.mt5EaApiKeys.has(key)) {
    if (source !== "header") {
      console.warn(`[Auth] Legacy EA auth key source="${source}" path="${urlObj?.pathname || ""}"`);
    }
    return true;
  }
  json(res, 401, { ok: false, error: "invalid ea api key" });
  return false;
}

function getTvTokenFromPath(pathname = "") {
  const m = String(pathname).match(/^\/(?:signal|mt5\/tv\/webhook)\/([^/]+)$/);
  if (!m) return "";
  try {
    return decodeURIComponent(m[1] || "").trim();
  } catch {
    return String(m[1] || "").trim();
  }
}

function isTvWebhookPath(pathname = "") {
  const p = String(pathname || "");
  return p === "/signal" || p === "/mt5/tv/webhook" || /^\/signal\/[^/]+$/.test(p) || /^\/mt5\/tv\/webhook\/[^/]+$/.test(p);
}

function requireTvAuth(req, res, urlObj, payload = null) {
  const hasAuthConfig = Boolean(CFG.signalApiKey || CFG.mt5TvAlertApiKeys.size > 0 || CFG.mt5TvWebhookTokens.size > 0);
  if (!hasAuthConfig) return true;

  const tokenFromPath = getTvTokenFromPath(urlObj?.pathname || "");
  if (tokenFromPath) {
    if (CFG.mt5TvWebhookTokens.has(tokenFromPath)) return true;
    json(res, 401, { ok: false, error: "invalid tv webhook token" });
    return false;
  }

  const headerKey = getHeaderApiKey(req);
  if (headerKey && ((CFG.signalApiKey && headerKey === CFG.signalApiKey) || CFG.mt5TvAlertApiKeys.has(headerKey))) {
    return true;
  }

  if (CFG.mt5AuthAllowLegacyPayloadKey) {
    const payloadKey = getPayloadApiKey(payload);
    if (payloadKey && ((CFG.signalApiKey && payloadKey === CFG.signalApiKey) || CFG.mt5TvAlertApiKeys.has(payloadKey))) {
      console.warn(`[Auth] Legacy TV auth key source="payload" path="${urlObj?.pathname || ""}"`);
      return true;
    }
  }

  json(res, 401, { ok: false, error: "Unauthorized" });
  return false;
}

function requireAdminKey(req, res, urlObj, payload = null) {
  const uiSess = getUiSessionFromReq(req);
  if (uiSess.ok) return true;
  if (!CFG.signalApiKey) return true;
  const incoming = getApiKeyFromReq(req, payload, urlObj);
  if (incoming === CFG.signalApiKey) return true;
  json(res, 401, { ok: false, error: "AUTH_REQUIRED" });
  return false;
}

function requireSystemRoleForUi(req, res) {
  const uiSess = getUiSessionFromReq(req);
  if (!uiSess.ok) {
    json(res, 401, { ok: false, error: "AUTH_REQUIRED" });
    return false;
  }
  if (!isSystemRole(uiSess.role)) {
    json(res, 403, { ok: false, error: "FORBIDDEN_SYSTEM_ROLE_REQUIRED" });
    return false;
  }
  return true;
}

function mt5DashboardHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MT5 Trades</title>
  <style>
    body { font-family: Arial, sans-serif; background:#0b0f14; color:#e6edf3; margin:0; }
    .wrap { max-width:1200px; margin:0 auto; padding:14px; }
    .top { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
    input, select, button { background:#121821; color:#e6edf3; border:1px solid #263244; padding:8px; border-radius:8px; }
    button { cursor:pointer; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th, td { border-bottom:1px solid #1f2a37; padding:7px; text-align:left; }
    th { color:#9fb0c4; position:sticky; top:0; background:#0b0f14; }
    .badge { border-radius:999px; padding:2px 8px; font-size:11px; font-weight:bold; display:inline-block; }
    .NEW { background:#1f2937; color:#d1d5db; }
    .LOCKED { background:#1d4ed8; color:#dbeafe; }
    .PLACED { background:#065f46; color:#d1fae5; }
    .START { background:#0f766e; color:#ccfbf1; }
    .FAIL, .SL { background:#7f1d1d; color:#fee2e2; }
    .TP { background:#14532d; color:#dcfce7; }
    .CANCEL { background:#9a3412; color:#ffedd5; }
    .EXPIRED { background:#78350f; color:#fef3c7; }
    .muted { color:#8b9db2; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <strong>MT5 Trades Monitor</strong>
      <span class="muted" id="meta"></span>
      <select id="status">
        <option value="">All statuses</option>
        <option>NEW</option><option>LOCKED</option><option>PLACED</option><option>START</option>
        <option>FAIL</option><option>TP</option><option>SL</option><option>CANCEL</option><option>EXPIRED</option>
      </select>
      <input id="limit" type="number" min="10" max="1000" value="200" />
      <input id="apiKey" type="password" placeholder="apiKey (if required)" />
      <button id="refresh">Refresh</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Created</th><th>Signal ID</th><th>Symbol</th><th>Action</th><th>Volume</th>
          <th>SL/TP</th><th>Status</th><th>Stage</th><th>Dup Safe</th><th>Ack</th><th>Note</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
  <script>
    const qs = new URLSearchParams(location.search);
    if (qs.get("apiKey")) document.getElementById("apiKey").value = qs.get("apiKey");
    async function load() {
      const status = document.getElementById("status").value;
      const limit = document.getElementById("limit").value || "200";
      const apiKey = document.getElementById("apiKey").value || "";
      const p = new URLSearchParams({ limit });
      if (status) p.set("status", status);
      if (apiKey) p.set("apiKey", apiKey);
      const res = await fetch("/mt5/trades?" + p.toString(), { headers: apiKey ? { "x-api-key": apiKey } : {} });
      const data = await res.json();
      if (!data.ok) {
        document.getElementById("meta").textContent = "Error: " + (data.error || "unknown");
        document.getElementById("rows").innerHTML = "";
        return;
      }
      document.getElementById("meta").textContent = "Total: " + data.count + " | Storage: " + data.storage + " | Updated: " + new Date().toLocaleTimeString();
      const tbody = document.getElementById("rows");
      tbody.innerHTML = data.trades.map(t => {
        const created = new Date(t.created_at).toLocaleString();
        const ack = [t.ack_status || "", t.ack_ticket || "", t.ack_error || ""].filter(Boolean).join(" | ");
        return "<tr>"
          + "<td>" + created + "</td>"
          + "<td class='muted'>" + (t.signal_id || "") + "</td>"
          + "<td>" + (t.symbol || "") + "</td>"
          + "<td>" + (t.action || "") + "</td>"
          + "<td>" + (t.volume ?? "") + "</td>"
          + "<td>" + (t.sl ?? "-") + " / " + (t.tp ?? "-") + "</td>"
          + "<td><span class='badge " + (t.status || "") + "'>" + (t.status || "") + "</span></td>"
          + "<td>" + (t.stage || "") + "</td>"
          + "<td>" + (t.dedupe_safe ? "YES" : "NO") + "</td>"
          + "<td class='muted'>" + ack + "</td>"
          + "<td class='muted'>" + (t.note || "") + "</td>"
          + "</tr>";
      }).join("");
    }
    document.getElementById("refresh").onclick = load;
    load();
    setInterval(load, 2500);
  </script>
</body>
</html>`;
}

async function executeMt5(signal) {
  if (!CFG.mt5Enabled) {
    return { broker: "mt5", status: "skipped", reason: "MT5_ENABLED=false" };
  }
  if (CFG.mt5EaApiKeys.size === 0) {
    return { broker: "mt5", status: "skipped", reason: "Missing MT5_EA_API_KEYS (or SIGNAL_API_KEY fallback)" };
  }

  const enqueue = await mt5EnqueueSignalFromPayload({
    id: signal.raw?.id || "",
    action: signal.side,
    symbol: signal.symbol,
    volume: signal.quantity && signal.quantity > 0 ? signal.quantity : CFG.mt5DefaultLot,
    sl: signal.sl ?? null,
    tp: signal.tp ?? null,
    rr: signal.rr_planned ?? null,
    risk_money: signal.risk_money_planned ?? null,
    price: signal.price ?? null,
    strategy: signal.strategy || null,
    timeframe: signal.timeframe || null,
    sourceTf: signal.raw?.sourceTf ?? signal.raw?.signal_tf ?? signal.timeframe ?? null,
    chartTf: signal.raw?.chartTf ?? signal.raw?.chart_tf ?? signal.raw?.chartTimeframe ?? signal.raw?.chart_tf_period ?? null,
    note: signal.note || "",
    user_id: signal.user_id || CFG.mt5DefaultUserId,
    provider: "signal",
    raw_json: signal.raw || {},
  }, {
    source: "signal",
    eventType: "QUEUED_FROM_SIGNAL",
    fallbackIdPrefix: "sig",
  });

  return {
    broker: "mt5",
    status: "queued",
    signal_id: enqueue.signal_id,
  };
}

const appHandler = async (req, res) => {
  const proto = req?.socket?.encrypted ? "https" : "http";
  const incomingUrl = new URL(req.url, `${proto}://${req.headers.host || "localhost"}`);
  const hostname = normalizeHostHeader(req.headers.host);

  if (tryServeLanding(incomingUrl, req, res, hostname)) {
    return;
  }

  if (tryServeUi(incomingUrl, req, res, hostname)) {
    return;
  }

  const url = new URL(incomingUrl.toString());
  url.pathname = stripWebhookPrefix(incomingUrl.pathname);

  if (req.method === "GET" && url.pathname === "/auth/me") {
    const sess = getUiSessionFromReq(req);
    if (!sess.ok) return json(res, 401, { ok: false, error: "AUTH_REQUIRED" });
    return json(res, 200, {
      ok: true,
      user: {
        user_id: sess.user_id,
        user_name: sess.user_name,
        email: sess.email,
        role: sess.role,
        is_active: normalizeUserActive(sess.is_active, true),
      },
    });
  }

  if (req.method === "GET" && url.pathname === "/auth/profile") {
    const sess = getUiSessionFromReq(req);
    if (!sess.ok) return json(res, 401, { ok: false, error: "AUTH_REQUIRED" });
    const state = await uiReadAuthStateByUserId(sess.user_id) || await uiReadAuthStateByEmail(sess.email);
    if (!state) return json(res, 404, { ok: false, error: "User not found" });
    return json(res, 200, {
      ok: true,
      user: {
        user_id: state.user_id,
        user_name: state.user_name,
        email: state.email,
        role: state.role,
        is_active: normalizeUserActive(state.is_active, true),
      },
    });
  }

  if (req.method === "PUT" && url.pathname === "/auth/profile") {
    const sess = getUiSessionFromReq(req);
    if (!sess.ok) return json(res, 401, { ok: false, error: "AUTH_REQUIRED" });
    try {
      const payload = await readJson(req);
      const out = await uiAuthUpdateProfile(sess, payload || {});
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to update profile" });
      if (sess.token && UI_SESSIONS.has(sess.token)) {
        const cur = UI_SESSIONS.get(sess.token) || {};
        UI_SESSIONS.set(sess.token, {
          ...cur,
          email: out.user.email,
          user_name: out.user.user_name,
          role: out.user.role,
          user_id: out.user.user_id,
          is_active: normalizeUserActive(out.user.is_active, true),
        });
      }
      return json(res, 200, { ok: true, user: out.user });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/auth/users") {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const users = await uiListUsers();
      return json(res, 200, { ok: true, users });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && url.pathname === "/auth/users") {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const payload = await readJson(req);
      const out = await uiCreateUser(payload || {});
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to create user" });
      return json(res, 200, { ok: true, user: out.user });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && /^\/auth\/users\/[^/]+\/detail$/.test(url.pathname)) {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const userId = decodeURIComponent(url.pathname.slice("/auth/users/".length, -"/detail".length));
      const out = await uiGetUserDetail(userId);
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to load user detail" });
      return json(res, 200, out);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && /^\/auth\/users\/[^/]+\/accounts$/.test(url.pathname)) {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const userId = decodeURIComponent(url.pathname.slice("/auth/users/".length, -"/accounts".length));
      const payload = await readJson(req);
      const out = await uiUpsertUserAccount(userId, payload || {});
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to save account" });
      return json(res, 200, out);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "PUT" && /^\/auth\/users\/[^/]+\/accounts\/[^/]+$/.test(url.pathname)) {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const parts = url.pathname.split("/").filter(Boolean);
      const userId = decodeURIComponent(parts[2] || "");
      const accountId = decodeURIComponent(parts[4] || "");
      const payload = await readJson(req);
      const out = await uiUpsertUserAccount(userId, { ...(payload || {}), account_id: accountId });
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to update account" });
      return json(res, 200, out);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "DELETE" && /^\/auth\/users\/[^/]+\/accounts\/[^/]+$/.test(url.pathname)) {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const parts = url.pathname.split("/").filter(Boolean);
      const userId = decodeURIComponent(parts[2] || "");
      const accountId = decodeURIComponent(parts[4] || "");
      const out = await uiDeleteUserAccount(userId, accountId);
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to delete account" });
      return json(res, 200, out);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && /^\/auth\/users\/[^/]+\/api-keys$/.test(url.pathname)) {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const userId = decodeURIComponent(url.pathname.slice("/auth/users/".length, -"/api-keys".length));
      const payload = await readJson(req);
      const out = await uiCreateUserApiKey(userId, payload || {});
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to create API key" });
      return json(res, 200, out);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "PUT" && /^\/auth\/users\/[^/]+\/api-keys\/[^/]+$/.test(url.pathname)) {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const parts = url.pathname.split("/").filter(Boolean);
      const userId = decodeURIComponent(parts[2] || "");
      const keyId = decodeURIComponent(parts[4] || "");
      const payload = await readJson(req);
      const out = await uiUpdateUserApiKey(userId, keyId, payload || {});
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to update API key" });
      return json(res, 200, out);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "DELETE" && /^\/auth\/users\/[^/]+\/api-keys\/[^/]+$/.test(url.pathname)) {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const parts = url.pathname.split("/").filter(Boolean);
      const userId = decodeURIComponent(parts[2] || "");
      const keyId = decodeURIComponent(parts[4] || "");
      const out = await uiDeleteUserApiKey(userId, keyId);
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to delete API key" });
      return json(res, 200, out);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "PUT" && /^\/auth\/users\/[^/]+$/.test(url.pathname)) {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const userId = decodeURIComponent(url.pathname.slice("/auth/users/".length));
      if (!userId) return json(res, 400, { ok: false, error: "user_id is required" });
      const payload = await readJson(req);
      const out = await uiUpdateUserById(userId, payload || {});
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to update user" });
      for (const [token, session] of UI_SESSIONS.entries()) {
        if (String(session?.user_id || "") !== String(userId)) continue;
        if (!normalizeUserActive(out.user?.is_active, true)) {
          UI_SESSIONS.delete(token);
          continue;
        }
        UI_SESSIONS.set(token, {
          ...session,
          user_name: out.user.user_name,
          email: out.user.email,
          role: out.user.role,
          is_active: normalizeUserActive(out.user.is_active, true),
        });
      }
      return json(res, 200, { ok: true, user: out.user });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && /^\/auth\/users\/[^/]+\/deactivate$/.test(url.pathname)) {
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const base = url.pathname.slice("/auth/users/".length, -"/deactivate".length);
      const userId = decodeURIComponent(base.replace(/\/+$/, ""));
      if (!userId) return json(res, 400, { ok: false, error: "user_id is required" });
      const out = await uiUpdateUserById(userId, { is_active: false, role: "Guest" });
      if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to deactivate user" });
      for (const [token, session] of UI_SESSIONS.entries()) {
        if (String(session?.user_id || "") === String(userId)) UI_SESSIONS.delete(token);
      }
      return json(res, 200, { ok: true, user: out.user });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && url.pathname === "/auth/login") {
    try {
      const payload = await readJson(req);
      const email = normalizeEmail(payload.email);
      const password = String(payload.password || "");
      if (!email || !password) return json(res, 400, { ok: false, error: "Email and password are required" });
      const authUser = await uiAuthGetVerifiedUser(email, password);
      if (!authUser) return json(res, 401, { ok: false, error: "Invalid email or password" });
      const token = createUiSession(authUser);
      setUiSessionCookie(res, token);
      return json(res, 200, { ok: true, user: authUser });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && url.pathname === "/auth/logout") {
    const sess = getUiSessionFromReq(req);
    if (sess.ok && sess.token) UI_SESSIONS.delete(sess.token);
    clearUiSessionCookie(res);
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/auth/password") {
    const sess = getUiSessionFromReq(req);
    if (!sess.ok) return json(res, 401, { ok: false, error: "AUTH_REQUIRED" });
    try {
      const payload = await readJson(req);
      const currentPassword = String(payload.currentPassword || "");
      const newPassword = String(payload.newPassword || "");
      const changed = await uiAuthChangePassword(sess.email, currentPassword, newPassword);
      if (!changed.ok) return json(res, 400, { ok: false, error: changed.error || "Failed to update password" });
      return json(res, 200, { ok: true, message: "Password updated" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (["GET", "HEAD"].includes(req.method) && url.pathname === "/") {
    return json(res, 200, {
      ok: true,
      service: "telegram-trading-bot",
      version: SERVER_VERSION,
      endpoints: {
        health: "/health",
        mt5Health: "/mt5/health",
        signal: "/signal",
      },
    });
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, {
      ok: true,
      service: "telegram-trading-bot",
      version: SERVER_VERSION,
      binanceEnabled: CFG.binanceEnabled,
      binanceMode: CFG.binanceMode || null,
      ctraderEnabled: CFG.ctraderEnabled,
      ctraderMode: CFG.ctraderMode || null,
      mt5Enabled: CFG.mt5Enabled,
    });
  }

  if (req.method === "GET" && url.pathname === "/mt5/health") {
    if (!CFG.mt5Enabled) {
      return json(res, 200, {
        ok: true,
        service: "mt5-bridge",
        version: SERVER_VERSION,
        enabled: false,
        storage: mt5NormalizeStorage(CFG.mt5Storage),
        hasTvApiKeys: CFG.mt5TvAlertApiKeys.size > 0,
        hasEaApiKeys: CFG.mt5EaApiKeys.size > 0,
        dbPath: CFG.mt5DbPath,
        postgresConfigured: false,
        pruneEnabled: CFG.mt5PruneEnabled,
        pruneDays: CFG.mt5PruneDays,
        pruneIntervalMinutes: CFG.mt5PruneIntervalMinutes,
      });
    }
    const b = await mt5Backend();
    return json(res, 200, {
      ok: true,
      service: "mt5-bridge",
      version: SERVER_VERSION,
      enabled: CFG.mt5Enabled,
      storage: b.storage,
      hasTvApiKeys: CFG.mt5TvAlertApiKeys.size > 0,
      hasEaApiKeys: CFG.mt5EaApiKeys.size > 0,
      dbPath: b.info.path || null,
      postgresConfigured: b.storage === "postgres",
      pruneEnabled: CFG.mt5PruneEnabled,
      pruneDays: CFG.mt5PruneDays,
      pruneIntervalMinutes: CFG.mt5PruneIntervalMinutes,
    });
  }

  if (req.method === "GET" && url.pathname === "/mt5/dashboard/summary") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const limitRaw = Number(url.searchParams.get("limit") || 5000);
      const limit = Math.max(100, Math.min(50000, Number.isFinite(limitRaw) ? limitRaw : 5000));
      const userId = envStr(url.searchParams.get("user_id"));
      const allRows = await mt5ListSignals(limit, "");
      const rows = mt5FilterRows(allRows, { userId });
      const notProcessed = rows.filter((r) => ["NEW", "LOCKED"].includes(String(r.status || "")));
      const statusCounts = mt5CountBy(rows, (r) => mt5CanonicalStoredStatus(r.status));
      const actionCounts = mt5CountBy(rows, (r) => String(r.action || "").toUpperCase());
      const orderTypeCounts = mt5CountBy(
        rows,
        (r) => String(r.raw_json?.order_type || r.raw_json?.orderType || "limit").toUpperCase(),
      );
      const topSymbols = mt5CountBy(rows, (r) => String(r.symbol || "").toUpperCase(), { limit: 10 });

      const dayRange = mt5PeriodRange("today");
      const weekRange = mt5PeriodRange("week");
      const monthRange = mt5PeriodRange("month");

      const dayRows = mt5FilterRows(rows, { from: dayRange.start, to: dayRange.end });
      const weekRows = mt5FilterRows(rows, { from: weekRange.start, to: weekRange.end });
      const monthRows = mt5FilterRows(rows, { from: monthRange.start, to: monthRange.end });

      return json(res, 200, {
        ok: true,
        version: SERVER_VERSION,
        user_id: userId || null,
        metrics: mt5ComputeMetrics(rows),
        benefit: {
          today: mt5ComputeMetrics(dayRows).pnl_money_realized,
          week: mt5ComputeMetrics(weekRows).pnl_money_realized,
          month: mt5ComputeMetrics(monthRows).pnl_money_realized,
        },
        status_counts: statusCounts,
        action_counts: actionCounts,
        order_type_counts: orderTypeCounts,
        top_symbols: topSymbols,
        latest_unprocessed: notProcessed.slice(0, 20).map(mt5PublicState),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/dashboard/advanced") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const limitRaw = Number(url.searchParams.get("limit") || 50000);
      const limit = Math.max(500, Math.min(200000, Number.isFinite(limitRaw) ? limitRaw : 50000));
      const userId = envStr(url.searchParams.get("user_id"));
      const symbol = envStr(url.searchParams.get("symbol")).toUpperCase();
      const source = envStr(url.searchParams.get("source") || url.searchParams.get("strategy"));
      const model = envStr(url.searchParams.get("entry_model") || url.searchParams.get("model"));
      const chartTf = envStr(url.searchParams.get("chart_tf") || url.searchParams.get("chartTf"));
      const signalTf = envStr(url.searchParams.get("signal_tf") || url.searchParams.get("timeframe"));
      const direction = envStr(url.searchParams.get("direction")).toUpperCase();
      const range = envStr(url.searchParams.get("range"), "all").toLowerCase();

      const allRows = mt5FilterRows(await mt5ListSignals(limit, ""), { userId });
      const rowsByDimension = allRows.filter((r) => {
        if (symbol && String(r.symbol || "").toUpperCase() !== symbol) return false;
        if (source && mt5StrategyFromRow(r) !== source) return false;
        if (model && mt5EntryModelFromRow(r) !== model) return false;
        if (chartTf && String(r.chart_tf || r.raw_json?.chart_tf || r.raw_json?.chartTf || "") !== chartTf) return false;
        if (signalTf && String(r.signal_tf || r.raw_json?.signal_tf || r.raw_json?.sourceTf || r.raw_json?.timeframe || "") !== signalTf) return false;
        if (direction && String(r.action || "").toUpperCase() !== direction) return false;
        return true;
      });

      const period = mt5PeriodRange(range);
      const selectedRows = mt5FilterRows(rowsByDimension, { from: period.start, to: period.end });

      const periods = ["all", "today", "yesterday", "last_week", "last_month", "week", "month", "year"];
      const periodTotals = {};
      for (const p of periods) {
        const pr = mt5PeriodRange(p);
        const scopedRows = mt5FilterRows(rowsByDimension, { from: pr.start, to: pr.end });
        const metrics = mt5ComputeTradeMetrics(scopedRows);
        periodTotals[p] = {
          total_pnl: metrics.total_pnl,
          total_rr: metrics.total_rr,
          total_trades: metrics.total_trades,
          total_wins: metrics.wins,
          total_losses: metrics.losses,
          win_sum_pnl: metrics.win_sum_pnl,
          lose_sum_pnl: metrics.lose_sum_pnl,
        };
      }

      const seriesBucket = range === "today" ? "hour" : "day";
      const seriesMap = new Map();
      for (const r of selectedRows) {
        const pnl = Number(r.pnl_money_realized);
        if (!Number.isFinite(pnl)) continue;
        const d = new Date(r.closed_at || r.ack_at || r.created_at);
        if (!Number.isFinite(d.getTime())) continue;
        const key = seriesBucket === "hour"
          ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:00`
          : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        seriesMap.set(key, (seriesMap.get(key) || 0) + pnl);
      }
      const pnlSeries = [...seriesMap.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([x, y]) => ({ x, y }));

      const symbols = [...new Set(rowsByDimension.map((r) => String(r.symbol || "").toUpperCase()).filter(Boolean))].sort();
      const strategies = [...new Set(rowsByDimension.map((r) => mt5StrategyFromRow(r)).filter(Boolean))].sort();
      const accounts = [...new Set(allRows.map((r) => envStr(r.user_id)).filter(Boolean))].sort();

      return json(res, 200, {
        ok: true,
        version: SERVER_VERSION,
        filters: {
          user_id: userId || "",
          symbol,
          source,
          entry_model: model,
          chart_tf: chartTf,
          signal_tf: signalTf,
          direction,
          range,
          accounts,
          symbols,
          sources: [...new Set(allRows.map(r => mt5StrategyFromRow(r)).filter(Boolean))].sort(),
          entry_models: [...new Set(allRows.map(r => mt5EntryModelFromRow(r)).filter(Boolean))].sort(),
          chart_tfs: [...new Set(allRows.map(r => String(r.chart_tf || r.raw_json?.chart_tf || r.raw_json?.chartTf || "")).filter(Boolean))].sort(),
          signal_tfs: [...new Set(allRows.map(r => String(r.signal_tf || r.raw_json?.signal_tf || r.raw_json?.sourceTf || r.raw_json?.timeframe || "")).filter(Boolean))].sort(),
        },
        metrics: mt5ComputeTradeMetrics(selectedRows),
        period_totals: periodTotals,
        top_winrate: {
          symbols: mt5ComputeTopWinrateRows(selectedRows, (r) => String(r.symbol || "").toUpperCase(), { limit: 100, includeDirection: false }),
          entry_models: mt5ComputeTopWinrateRows(selectedRows, (r) => mt5EntryModelFromRow(r), { limit: 100, includeDirection: false }),
          accounts: mt5ComputeTopWinrateRows(selectedRows, (r) => envStr(r.user_id), { limit: 100, includeDirection: false }),
        },
        pnl_series: pnlSeries,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/dashboard/pnl-series") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const limitRaw = Number(url.searchParams.get("limit") || 5000);
      const limit = Math.max(100, Math.min(50000, Number.isFinite(limitRaw) ? limitRaw : 5000));
      const period = envStr(url.searchParams.get("period"), "month").toLowerCase();
      const userId = envStr(url.searchParams.get("user_id"));
      const range = mt5PeriodRange(period);
      const rows = mt5FilterRows(await mt5ListSignals(limit, ""), {
        userId,
        from: range.start,
        to: range.end,
      });
      const bucket = period === "today" ? "hour" : "day";
      const map = new Map();
      for (const r of rows) {
        const pnl = Number(r.pnl_money_realized);
        if (!Number.isFinite(pnl)) continue;
        const d = new Date(r.closed_at || r.ack_at || r.created_at);
        if (!Number.isFinite(d.getTime())) continue;
        const key = bucket === "hour"
          ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:00`
          : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        map.set(key, (map.get(key) || 0) + pnl);
      }
      const points = [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([x, y]) => ({ x, y }));
      return json(res, 200, { ok: true, period, points });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/filters/advanced") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const limitRaw = Number(url.searchParams.get("limit") || 20000);
      const limit = Math.max(100, Math.min(100000, Number.isFinite(limitRaw) ? limitRaw : 20000));
      const userId = envStr(url.searchParams.get("user_id"));
      const allRows = mt5FilterRows(await mt5ListSignals(limit, ""), { userId });
      
      return json(res, 200, {
        ok: true,
        symbols: [...new Set(allRows.map((r) => String(r.symbol || "").toUpperCase()).filter(Boolean))].sort(),
        sources: [...new Set(allRows.map(r => mt5StrategyFromRow(r)).filter(Boolean))].sort(),
        entry_models: [...new Set(allRows.map(r => mt5EntryModelFromRow(r)).filter(Boolean))].sort(),
        chart_tfs: [...new Set(allRows.map(r => String(r.chart_tf || r.raw_json?.chart_tf || r.raw_json?.chartTf || "")).filter(Boolean))].sort(),
        signal_tfs: [...new Set(allRows.map(r => String(r.signal_tf || r.raw_json?.signal_tf || r.raw_json?.sourceTf || r.raw_json?.timeframe || "")).filter(Boolean))].sort(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/filters/symbols") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const limitRaw = Number(url.searchParams.get("limit") || 10000);
      const limit = Math.max(100, Math.min(50000, Number.isFinite(limitRaw) ? limitRaw : 10000));
      const userId = envStr(url.searchParams.get("user_id"));
      const rows = mt5FilterRows(await mt5ListSignals(limit, ""), { userId });
      const symbols = [...new Set(rows.map((r) => String(r.symbol || "").toUpperCase()).filter(Boolean))].sort();
      return json(res, 200, { ok: true, symbols });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/trades/search") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const pageRaw = Number(url.searchParams.get("page") || 1);
      const pageSizeRaw = Number(url.searchParams.get("pageSize") || 20);
      const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
      const pageSize = Math.max(5, Math.min(200, Number.isFinite(pageSizeRaw) ? pageSizeRaw : 20));
      const { rows } = await mt5GetFilteredTrades(url, null, 10000);

      const total = rows.length;
      const start = (page - 1) * pageSize;
      const data = rows.slice(start, start + pageSize).map(mt5PublicState);
      return json(res, 200, { ok: true, page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)), trades: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && url.pathname === "/mt5/trades/create") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const payload = await readJson(req);
      const sess = getUiSessionFromReq(req);
      const enqueue = await mt5EnqueueSignalFromPayload({
        id: payload.signal_id || payload.id || "",
        action: payload.action,
        symbol: payload.symbol,
        volume: payload.volume ?? payload.lots,
        sl: payload.sl ?? null,
        tp: payload.tp ?? null,
        rr: payload.rr ?? payload.risk_reward ?? null,
        risk_money: payload.risk_money ?? payload.money_risk ?? null,
        price: payload.price ?? payload.entry ?? null,
        strategy: payload.strategy || "Manual",
        timeframe: payload.timeframe || "manual",
        note: payload.note || "",
        user_id: payload.user_id || sess.user_id || CFG.mt5DefaultUserId,
        order_type: payload.order_type || "limit",
        provider: "ui",
        raw_json: payload && typeof payload === "object" ? payload : {},
      }, {
        source: "ui_manual",
        eventType: "UI_CREATE_TRADE",
        fallbackIdPrefix: "ui",
      });
      return json(res, 200, { ok: true, trade: enqueue });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && url.pathname === "/mt5/trades/delete") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    try {
      const payload = await readJson(req);
      if (!requireAdminKey(req, res, url, payload)) return;
      const { rows, filters, limit } = await mt5GetFilteredTrades(url, payload, 50000);
      const ids = rows.map((r) => String(r.signal_id || "")).filter(Boolean);
      const removed = await mt5DeleteSignalsByIds(ids);
      return json(res, 200, {
        ok: true,
        deleted: removed.deleted || 0,
        matched: ids.length,
        filters,
        scanned_limit: limit,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && url.pathname === "/mt5/trades/cancel") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    try {
      const payload = await readJson(req);
      if (!requireAdminKey(req, res, url, payload)) return;
      const { rows, filters, limit } = await mt5GetFilteredTrades(url, payload, 50000);
      const ids = rows.map((r) => String(r.signal_id || "")).filter(Boolean);
      const updated = await mt5CancelSignalsByIds(ids);
      for (const signalId of (updated.updated_ids || [])) {
        await mt5AppendSignalEvent(signalId, "MANUAL_CANCEL", {
          via: "ui_bulk_cancel",
        });
      }
      return json(res, 200, {
        ok: true,
        updated: updated.updated || 0,
        matched: ids.length,
        filters,
        scanned_limit: limit,
        target_status: "CANCEL",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/db/tables") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const b = await mt5Backend();
      if (!b.listTables) return json(res, 400, { ok: false, error: "Not supported by this backend" });
      const tables = (await b.listTables()).filter((t) => String(t || "").toLowerCase() !== "ui_auth_users");
      return json(res, 200, { ok: true, tables });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/db/rows") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const b = await mt5Backend();
      if (!b.listTableRows) return json(res, 400, { ok: false, error: "Not supported by this backend" });
      
      const table = envStr(url.searchParams.get("table") || "signals");
      if (table.toLowerCase() === "ui_auth_users") {
        return json(res, 403, { ok: false, error: "table access forbidden" });
      }
      const q = envStr(url.searchParams.get("q"));
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const pageSize = Math.max(5, Math.min(500, Number(url.searchParams.get("pageSize") || 50)));
      const offset = (page - 1) * pageSize;
      
      const { rows, total } = await b.listTableRows(table, pageSize, offset, q);
      return json(res, 200, { 
        ok: true, 
        table, 
        total, 
        rows, 
        page, 
        pageSize, 
        pages: Math.max(1, Math.ceil(total / pageSize)) 
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/mt5/db/rows/create") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const payload = await readJson(req);
      const table = String(payload.table || "").trim().toLowerCase();
      const row = payload.row && typeof payload.row === "object" ? payload.row : {};
      const sess = getUiSessionFromReq(req);
      if (!table) return json(res, 400, { ok: false, error: "table is required" });

      if (table === "signals") {
        const created = await mt5EnqueueSignalFromPayload({
          id: row.signal_id || row.id || "",
          action: row.action,
          symbol: row.symbol,
          volume: row.volume ?? row.lots,
          sl: row.sl ?? null,
          tp: row.tp ?? null,
          rr: row.rr ?? row.risk_reward ?? null,
          risk_money: row.risk_money ?? row.money_risk ?? null,
          price: row.price ?? row.entry ?? null,
          strategy: row.strategy || "DB Insert",
          timeframe: row.timeframe || "manual",
          note: row.note || "",
          user_id: row.user_id || sess.user_id || CFG.mt5DefaultUserId,
          order_type: row.order_type || "limit",
          provider: "ui_db",
          raw_json: row,
        }, {
          source: "ui_db",
          eventType: "UI_DB_INSERT_SIGNAL",
          fallbackIdPrefix: "db",
        });
        return json(res, 200, { ok: true, table, created });
      }

      if (table === "signal_events") {
        const signalId = String(row.signal_id || "").trim();
        const eventType = String(row.event_type || "").trim();
        if (!signalId) return json(res, 400, { ok: false, error: "row.signal_id is required" });
        if (!eventType) return json(res, 400, { ok: false, error: "row.event_type is required" });
        const payloadJson = row.payload_json && typeof row.payload_json === "object"
          ? { ...row.payload_json }
          : (row.payload && typeof row.payload === "object" ? { ...row.payload } : {});
        delete payloadJson.apiKey;
        delete payloadJson.api_key;
        delete payloadJson.password;
        delete payloadJson.token;
        payloadJson.via = "ui_db_create";
        payloadJson.created_by = sess.user_id || CFG.mt5DefaultUserId;
        await mt5AppendSignalEvent(signalId, eventType, payloadJson);
        return json(res, 200, { ok: true, table, created: { signal_id: signalId, event_type: eventType } });
      }

      if (table === "users") {
        const out = await uiCreateUser(row);
        if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to create user" });
        return json(res, 200, { ok: true, table, created: out.user });
      }

      if (table === "accounts") {
        const userId = String(row.user_id || "").trim();
        if (!userId) return json(res, 400, { ok: false, error: "row.user_id is required" });
        const out = await uiUpsertUserAccount(userId, row);
        if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to create account" });
        return json(res, 200, { ok: true, table, created: out.account });
      }

      if (table === "user_api_keys") {
        const userId = String(row.user_id || "").trim();
        if (!userId) return json(res, 400, { ok: false, error: "row.user_id is required" });
        const out = await uiCreateUserApiKey(userId, row);
        if (!out.ok) return json(res, 400, { ok: false, error: out.error || "Failed to create API key" });
        return json(res, 200, { ok: true, table, created: out.api_key });
      }

      return json(res, 400, { ok: false, error: `Create is not supported for table: ${table}` });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/mt5/trades/renew") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    try {
      const payload = await readJson(req);
      if (!requireAdminKey(req, res, url, payload)) return;
      const { rows, filters, limit } = await mt5GetFilteredTrades(url, payload, 50000);
      const ids = rows.map((r) => String(r.signal_id || "")).filter(Boolean);
      const updated = await mt5RenewSignalsByIds(ids);
      return json(res, 200, {
        ok: true,
        updated: updated.updated || 0,
        matched: ids.length,
        filters,
        scanned_limit: limit,
        target_status: "NEW",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname.startsWith("/mt5/trades/")) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const signalId = decodeURIComponent(url.pathname.slice("/mt5/trades/".length));
      if (!signalId) return json(res, 400, { ok: false, error: "signal_id is required" });
      const rows = await mt5ListSignals(50000, "");
      const trade = rows.find((r) => String(r.signal_id) === signalId);
      if (!trade) return json(res, 404, { ok: false, error: "signal not found" });
      const eventLimitRaw = Number(url.searchParams.get("event_limit") || 200);
      const eventLimit = Math.max(1, Math.min(2000, Number.isFinite(eventLimitRaw) ? eventLimitRaw : 200));
      const events = await mt5ListSignalEvents(signalId, eventLimit);
      return json(res, 200, {
        ok: true,
        trade: mt5PublicState(trade),
        events,
        chart: {
          symbol: trade.symbol,
          action: trade.action,
          entry: trade.entry_price_exec ?? null,
          sl: trade.sl_exec ?? trade.sl ?? null,
          tp: trade.tp_exec ?? trade.tp ?? null,
          opened_at: trade.opened_at ?? trade.ack_at ?? trade.created_at,
          closed_at: trade.closed_at ?? null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/trades") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const limitRaw = Number(url.searchParams.get("limit") || 200);
      const limit = Math.max(10, Math.min(1000, Number.isFinite(limitRaw) ? limitRaw : 200));
      const status = String(url.searchParams.get("status") || "").trim().toUpperCase();
      const trades = mt5FilterRows(await mt5ListSignals(limit, ""), { statuses: status ? [status] : [] });
      const b = await mt5Backend();
      return json(res, 200, {
        ok: true,
        count: trades.length,
        storage: b.storage,
        trades: trades.map(mt5PublicState),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && (url.pathname === "/csv" || url.pathname === "/mt5/csv")) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const includeHeader = String(url.searchParams.get("header") || "1").toLowerCase() !== "0";
      const { rows } = await mt5GetFilteredTrades(url, null, 20000);
      const symbol = envStr(url.searchParams.get("symbol")).toUpperCase();
      const status = envStr(url.searchParams.get("status")).toUpperCase();
      const chronological = rows.slice().reverse();
      const csv = mt5SignalsToBacktestCsv(chronological, includeHeader);

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const suffixSymbol = symbol ? `-${symbol}` : "";
      const suffixStatus = status ? `-${mt5CanonicalStoredStatus(status)}` : "";
      const suffix = `${suffixSymbol}${suffixStatus}`;
      const filename = `mt5-backtest${suffix}-${stamp}.csv`;
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "Content-Length": Buffer.byteLength(csv),
      });
      res.end(csv);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if ((req.method === "POST" || req.method === "GET") && url.pathname === "/mt5/prune") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      let payload = {};
      if (req.method === "POST") {
        payload = await readJson(req);
      }
      const daysRaw = Number(payload.days ?? url.searchParams.get("days") ?? CFG.mt5PruneDays);
      const days = Math.max(1, Math.min(3650, Number.isFinite(daysRaw) ? daysRaw : CFG.mt5PruneDays));
      const result = await mt5PruneSignals(days);
      return json(res, 200, { ok: true, days, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/ui") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    const body = mt5DashboardHtml();
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
    return;
  }

  if (req.method === "GET" && url.pathname === "/mt5/ea/sync") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireEaKey(req, res, url)) return;
    try {
      const signals = await mt5ListActiveSignals();
      const data = signals.map(s => ({
        signal_id: s.signal_id, status: s.status, symbol: s.symbol, action: s.action,
        ticket: s.ack_ticket || "", pnl: s.pnl_money_realized || 0,
        volume: s.volume, sl: s.sl, tp: s.tp
      }));
      return json(res, 200, { ok: true, count: data.length, signals: data });
    } catch (err) { return json(res, 500, { ok: false, error: err.message }); }
  }

  if (req.method === "GET" && url.pathname === "/mt5/api/events") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const { rows: signals } = await mt5GetFilteredTrades(url, null, 10000);
      const sids = new Set(signals.map(s => String(s.signal_id)));
      
      const limitRaw = Number(url.searchParams.get("limit") || 200);
      const limit = Math.max(1, Math.min(5000, Number.isFinite(limitRaw) ? limitRaw : 200));
      const offsetRaw = Number(url.searchParams.get("offset") || 0);
      const offset = Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0);
      
      const q = (url.searchParams.get("q") || "").toLowerCase();
      
      const allEvents = await mt5ListAllEvents(limit * 5, offset); // Pull more for manual filtering if needed, or filter by signal_id
      
      const filterSymbol = url.searchParams.get("symbol");
      let rows = allEvents;
      if (sids.size < 5000) { 
         // If a symbol filter is active, exclude SYSTEM_SYNC_PUSH unless no symbol was selected
         rows = rows.filter(e => sids.has(String(e.signal_id)) || (!filterSymbol && String(e.signal_id) === 'SYSTEM_SYNC_PUSH'));
      }
      
      if (q) {
        rows = rows.filter(e => 
          String(e.event_type || "").toLowerCase().includes(q) ||
          String(e.signal_id || "").toLowerCase().includes(q)
        );
      }
      
      return json(res, 200, { ok: true, events: rows.slice(0, limit) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && url.pathname === "/mt5/api/events/create") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const payload = await readJson(req);
      const sess = getUiSessionFromReq(req);
      const signalId = String(payload.signal_id || "").trim();
      const eventType = String(payload.event_type || "").trim();
      if (!signalId) return json(res, 400, { ok: false, error: "signal_id is required" });
      if (!eventType) return json(res, 400, { ok: false, error: "event_type is required" });
      const payloadJson = payload.payload_json && typeof payload.payload_json === "object"
        ? { ...payload.payload_json }
        : (payload.payload && typeof payload.payload === "object" ? { ...payload.payload } : {});
      delete payloadJson.apiKey;
      delete payloadJson.api_key;
      delete payloadJson.password;
      delete payloadJson.token;
      payloadJson.via = "ui_manual_log";
      payloadJson.created_by = sess.user_id || CFG.mt5DefaultUserId;
      await mt5AppendSignalEvent(signalId, eventType, payloadJson);
      return json(res, 200, { ok: true, event: { signal_id: signalId, event_type: eventType } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && url.pathname === "/mt5/api/events/delete") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireSystemRoleForUi(req, res)) return;
    try {
      const resVal = await mt5DeleteAllEvents();
      return json(res, 200, { ok: true, deleted: resVal.deleted });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && url.pathname === "/mt5/ea/sync") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    try {
      const payload = await readJson(req);
      if (!requireEaKey(req, res, url, payload)) return;
      
      const activeSignals = payload.active_signals || []; 
      const confirmedDbIds = new Set();
      
      const dbSignals = await mt5ListActiveSignals(); // NEW, LOCKED, PLACED, START
      const updates = [];
      const nowTs = Date.now();

      // 1. Reconcile EA Active Trades -> VPS
      for (const s of activeSignals) {
         const sid = String(s.signal_id || "");
         const ticket = String(s.ticket || "");
         const eaStatus = String(s.status || "");
         const eaPnl = Number(s.pnl || 0);

         // Find trade by signal_id + ticket
         let sig = dbSignals.find(d => String(d.signal_id) === sid && String(d.ack_ticket) === ticket);
         if (!sig) {
            // Backup: find by ticket alone if mapping is loose
            sig = await mt5GetSignalByTicket(ticket);
         }

         if (sig) {
            const dbCan = mt5CanonicalStoredStatus(sig.status);
            const eaCan = mt5CanonicalStoredStatus(eaStatus);

            // "Only update when 2 statuses are different."
            if (dbCan !== eaCan) {
               updates.push({
                  signal_id: sig.signal_id,
                  status: eaStatus,
                  ticket: ticket,
                  pnl: eaPnl,
                  note: `sync_status_diff_${dbCan}_to_${eaCan}`
               });
            }
         }
      }

      // 2. Identify Ghost Signals (Optional, keeping simple as requested)
      // If needed, we can add logic here to mark trades as FAIL if they are in dbSignals but not in confirmedDbIds.
      // But the user's latest instruction focuses on the array processing.
      // I'll skip ghost closing for now to be strictly lean as per the request.

      if (updates.length > 0) {
        await mt5BulkAckSignals(updates);
        
        await mt5AppendSignalEvent('SYSTEM_SYNC_PUSH', 'EA_SYNC_PUSH', { 
          account: payload.account_id, 
          active_count: activeSignals.length,
          updates_count: updates.length,
          updates_details: updates 
        });
      }

      return json(res, 200, { ok: true, reconciled: updates.length, updates });
    } catch (err) { return json(res, 500, { ok: false, error: err.message }); }
  }

  if (req.method === "POST" && url.pathname === "/mt5/ea/bulk-sync") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    try {
      const payload = await readJson(req);
      if (!requireEaKey(req, res, url, payload)) return;
      const updates = payload.updates || [];
      if (!Array.isArray(updates)) return json(res, 400, { ok: false, error: "updates array required" });
      const result = await mt5BulkAckSignals(updates);
      for (const u of updates) {
        await mt5AppendSignalEvent(u.signal_id, `EA_SYNC_${u.status}`, { ticket: u.ticket, pnl: u.pnl, account: payload.account_id });
      }
      return json(res, 200, { ok: true, updated: result.updated });
    } catch (err) { return json(res, 500, { ok: false, error: err.message }); }
  }


  if (req.method === "GET" && url.pathname === "/mt5/ea/pull") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireEaKey(req, res, url)) return;

    const signalId = String(url.searchParams.get("signal_id") || "").trim();
    const account = String(url.searchParams.get("account") || "");
    const signal = signalId
      ? await mt5PullAndLockSignalById(signalId)
      : await mt5PullAndLockNextSignal();
    if (!signal) {
      return json(res, 200, { ok: true, signal: null });
    }
    await mt5AppendSignalEvent(signal.signal_id, "SIGNAL_FETCH", {
      account: account || null
    });

    return json(res, 200, {
      ok: true,
      signal: {
        signal_id: signal.signal_id,
        // Keep EA compatibility: `timestamp` must be unix seconds (number), not ISO string.
        // Older EA parsers read `timestamp` as numeric and can misparse ISO text as year-only.
        timestamp: signal.created_at ? Math.floor(new Date(signal.created_at).getTime() / 1000) : null,
        timestamp_iso: signal.created_at || null,
        created_at_ts: signal.created_at ? Math.floor(new Date(signal.created_at).getTime() / 1000) : null,
        user_id: signal.user_id || CFG.mt5DefaultUserId,
        action: signal.action,
        symbol: signal.symbol,
        volume: signal.volume,
        entry: signal.entry_price_exec ?? signal.raw_json?.entry ?? signal.raw_json?.price ?? null,
        order_type: signal.raw_json?.order_type ?? signal.raw_json?.orderType ?? "limit",
        sl: signal.sl,
        tp: signal.tp,
        rr_planned: signal.rr_planned ?? null,
        risk_money_planned: signal.risk_money_planned ?? null,
        note: signal.note || "",
        account,
      },
    });
  }

  if (req.method === "POST" && url.pathname === "/mt5/ea/heartbeat") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    try {
      const payload = await readJson(req);
      if (!requireEaKey(req, res, url, payload)) return;
      
      const accountId = String(payload.account_id || "");
      if (!accountId) {
        return json(res, 400, { ok: false, error: "account_id is required" });
      }
      
      // TODO: upsert into accounts table
      console.log(`[MT5 Heartbeat] Account=${accountId} Bal=${payload.balance} Eq=${payload.equity}`);
      return json(res, 200, { ok: true, message: "heartbeat_received" });
    } catch (err) {
      console.error("[Webhook] EA heartbeat error:", err);
      return json(res, 500, { ok: false, error: "internal server error" });
    }
  }

  if (req.method === "POST" && url.pathname === "/mt5/ea/ack") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    try {
      const payload = await readJson(req);
      if (!requireEaKey(req, res, url, payload)) return;

      const status = mt5NormalizeAckStatus(payload.status);

      const signalId = String(payload.signal_id || "");
      if (!signalId) {
        return json(res, 400, { ok: false, error: "signal_id is required" });
      }

      const sig = await mt5FindSignalById(signalId);
      if (!sig) {
        return json(res, 404, { ok: false, error: "signal not found" });
      }

      const pnlRealized = asNum(payload.pnl_money_realized ?? payload.pnl ?? payload.profit, NaN);
      const entryExecRaw = asNum(payload.entry_price_exec ?? payload.entry, NaN);
      const slExecRaw = asNum(payload.sl_exec ?? payload.sl, NaN);
      const tpExecRaw = asNum(payload.tp_exec ?? payload.tp, NaN);
      const entryExec = (Number.isFinite(entryExecRaw) && entryExecRaw > 0.0) ? entryExecRaw : NaN;
      const slExec = (Number.isFinite(slExecRaw) && slExecRaw > 0.0) ? slExecRaw : NaN;
      const tpExec = (Number.isFinite(tpExecRaw) && tpExecRaw > 0.0) ? tpExecRaw : NaN;
      // Pip/lot telemetry from EA
      const slPipsFromPayload = asNum(payload.sl_pips, NaN);
      const tpPipsFromPayload = asNum(payload.tp_pips, NaN);
      const pipValuePerLotFromPayload = asNum(payload.pip_value_per_lot, NaN);
      const riskMoneyActualFromPayload = asNum(payload.risk_money_actual, NaN);
      const rewardMoneyPlannedFromPayload = asNum(payload.reward_money_planned, NaN);
      const ackResult = payload.result ?? payload.retcode ?? payload.code ?? null;
      const ackMessage = payload.message ?? payload.msg ?? payload.comment ?? null;
      const ackNote = payload.note ?? payload.reason ?? null;

      // Smart Parsing: If direct fields are missing, try to extract from note string (e.g., risk$=100.29)
      const noteStr = String(ackNote || "").toLowerCase();
      let riskMoneyActual = riskMoneyActualFromPayload;
      if (!Number.isFinite(riskMoneyActual)) {
        const m = noteStr.match(/risk\$=([\d.]+)/);
        if (m) riskMoneyActual = parseFloat(m[1]);
      }
      let slPips = slPipsFromPayload;
      if (!Number.isFinite(slPips)) {
        const m = noteStr.match(/sl_pips=([\d.]+)/); // Hypothetical, but we can add more patterns
        if (m) slPips = parseFloat(m[1]);
      }
      
      const tpPips = tpPipsFromPayload;
      const pipValuePerLot = pipValuePerLotFromPayload;
      const rewardMoneyPlanned = rewardMoneyPlannedFromPayload;

      const ackSummary = [ackResult, ackMessage, ackNote]
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        .join(" | ");
      const ackErrorCombined = [payload.error, ackSummary]
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        .join(" | ") || null;
      const retryableConnectivityFail = mt5IsRetryableConnectivityFail(status, ackErrorCombined);

      await mt5AckSignal(signalId, status, payload.ticket, ackErrorCombined, {
        pnl_money_realized: Number.isFinite(pnlRealized) ? pnlRealized : null,
        entry_price_exec: Number.isFinite(entryExec) ? entryExec : null,
        sl_exec: Number.isFinite(slExec) ? slExec : null,
        tp_exec: Number.isFinite(tpExec) ? tpExec : null,
        sl_pips: Number.isFinite(slPips) && slPips > 0 ? slPips : null,
        tp_pips: Number.isFinite(tpPips) && tpPips > 0 ? tpPips : null,
        pip_value_per_lot: Number.isFinite(pipValuePerLot) && pipValuePerLot > 0 ? pipValuePerLot : null,
        risk_money_actual: Number.isFinite(riskMoneyActual) && riskMoneyActual > 0 ? riskMoneyActual : null,
        reward_money_planned: Number.isFinite(rewardMoneyPlanned) && rewardMoneyPlanned > 0 ? rewardMoneyPlanned : null,
      });
      const eventType = retryableConnectivityFail ? "EA_REQUEUE_CONNECTION" : `EA_ACK_${status}`;
      await mt5AppendSignalEvent(signalId, eventType, {
        ticket: payload.ticket ?? null,
        error: ackErrorCombined,
        result: ackResult,
        message: ackMessage,
        note: ackNote,
        retryable: retryableConnectivityFail,
        pnl_money_realized: Number.isFinite(pnlRealized) ? pnlRealized : null,
        entry_price_exec: Number.isFinite(entryExec) ? entryExec : null,
        sl_exec: Number.isFinite(slExec) ? slExec : null,
        tp_exec: Number.isFinite(tpExec) ? tpExec : null,
        sl_pips: Number.isFinite(slPips) && slPips > 0 ? slPips : null,
        tp_pips: Number.isFinite(tpPips) && tpPips > 0 ? tpPips : null,
        pip_value_per_lot: Number.isFinite(pipValuePerLot) && pipValuePerLot > 0 ? pipValuePerLot : null,
        risk_money_actual: Number.isFinite(riskMoneyActual) && riskMoneyActual > 0 ? riskMoneyActual : null,
        reward_money_planned: Number.isFinite(rewardMoneyPlanned) && rewardMoneyPlanned > 0 ? rewardMoneyPlanned : null,
      });

      if (status === "TP" || status === "SL") {
        try {
          const model = mt5EntryModelFromRow(sig);
          const tf = sig.signal_tf || sig.chart_tf || "n/a";
          const pnlStr = Number.isFinite(pnlRealized) ? (pnlRealized >= 0 ? `+$${pnlRealized.toFixed(2)}` : `-$${Math.abs(pnlRealized).toFixed(2)}`) : "n/a";
          const telMsg = `[${sig.symbol}, ${sig.action}, ${signalId}, ${pnlStr}, ${model}, ${tf}, ${status}]`;
          await sendTelegram(telMsg);
        } catch (telErr) {
          console.error("[Webhook] Telegram notification failed for TP/SL:", telErr);
        }
      }

      return json(res, 200, {
        ok: true,
        signal_id: signalId,
        status,
        requeued: retryableConnectivityFail,
        ack: {
          ticket: payload.ticket ?? null,
          result: ackResult,
          message: ackMessage,
          note: ackNote,
          error: ackErrorCombined,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && isTvWebhookPath(url.pathname)) {
    try {
      const payload = await readJson(req);
      if (!requireTvAuth(req, res, url, payload)) return;

      const result = await handleSignal(payload);
      return json(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      try {
        await sendTelegram(`Signal processing failed: ${message}`);
      } catch {
        // ignore nested telegram failure
      }
      return json(res, 400, { ok: false, error: message });
    }
  }

  return json(res, 404, { ok: false, error: "Not found" });
};

async function start() {
  if (CFG.uiAuthEnabled) {
    const auth = await uiEnsureAuthBootstrap();
    console.log(`UI auth enabled=true, user=${auth.email}, storage=${(await mt5Backend()).storage}`);
  } else {
    console.log("UI auth enabled=false");
  }

  if (CFG.mt5Enabled) {
    const b = await mt5Backend();
    const where = b.info.path || b.info.url || "configured";
    console.log(`MT5 bridge enabled=true, storage=${b.storage}, target=${where}`);
    if (CFG.mt5PruneEnabled) {
      const safeDays = Math.max(1, Math.min(3650, Number.isFinite(CFG.mt5PruneDays) ? CFG.mt5PruneDays : 14));
      const safeMins = Math.max(1, Math.min(1440, Number.isFinite(CFG.mt5PruneIntervalMinutes) ? CFG.mt5PruneIntervalMinutes : 60));
      const runPrune = async () => {
        try {
          const out = await mt5PruneSignals(safeDays);
          if (out.removed > 0) {
            console.log(`MT5 prune removed=${out.removed}, remaining=${out.remaining}, days=${safeDays}`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(`MT5 prune failed: ${msg}`);
        }
      };
      await runPrune();
      const handle = setInterval(runPrune, safeMins * 60 * 1000);
      handle.unref();
      console.log(`MT5 prune enabled=true, days=${safeDays}, intervalMinutes=${safeMins}`);
    } else {
      console.log("MT5 prune enabled=false");
    }
  } else {
    console.log("MT5 bridge enabled=false");
  }

  function loadTlsOptions() {
    if (!CFG.httpsEnabled) return null;
    if (!CFG.httpsKeyPath || !CFG.httpsCertPath) {
      throw new Error("HTTPS_ENABLED=true requires HTTPS_KEY_PATH and HTTPS_CERT_PATH");
    }
    const keyPath = path.resolve(__dirname, CFG.httpsKeyPath);
    const certPath = path.resolve(__dirname, CFG.httpsCertPath);
    if (!fs.existsSync(keyPath)) throw new Error(`HTTPS key file not found: ${keyPath}`);
    if (!fs.existsSync(certPath)) throw new Error(`HTTPS cert file not found: ${certPath}`);
    const out = {
      key: fs.readFileSync(keyPath, "utf8"),
      cert: fs.readFileSync(certPath, "utf8"),
    };
    if (CFG.httpsCaPath) {
      const caPath = path.resolve(__dirname, CFG.httpsCaPath);
      if (!fs.existsSync(caPath)) throw new Error(`HTTPS CA file not found: ${caPath}`);
      out.ca = fs.readFileSync(caPath, "utf8");
    }
    return out;
  }

  if (CFG.httpsEnabled) {
    const tlsOptions = loadTlsOptions();
    const httpsServer = https.createServer(tlsOptions, appHandler);
    await new Promise((resolve, reject) => {
      httpsServer.once("error", reject);
      httpsServer.listen(CFG.httpsPort, "0.0.0.0", resolve);
    });
    console.log(`telegram-trading-bot listening on https://0.0.0.0:${CFG.httpsPort}`);

    if (CFG.httpsRedirectHttp) {
      const httpRedirectServer = http.createServer((req, res) => {
        const hostHeader = String(req.headers.host || "localhost").replace(/:\d+$/, "");
        const targetHost = CFG.httpsPort === 443 ? hostHeader : `${hostHeader}:${CFG.httpsPort}`;
        const location = `https://${targetHost}${req.url || "/"}`;
        res.writeHead(308, { Location: location });
        res.end();
      });
      await new Promise((resolve, reject) => {
        httpRedirectServer.once("error", reject);
        httpRedirectServer.listen(CFG.port, "0.0.0.0", resolve);
      });
      console.log(`HTTP redirect enabled on http://0.0.0.0:${CFG.port} -> https://0.0.0.0:${CFG.httpsPort}`);
    }
  } else {
    const httpServer = http.createServer(appHandler);
    await new Promise((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(CFG.port, "0.0.0.0", resolve);
    });
    console.log(`telegram-trading-bot listening on http://0.0.0.0:${CFG.port}`);
  }
  console.log(`Binance mode=${CFG.binanceMode || "off"}, cTrader mode=${CFG.ctraderMode || "off"}`);
}

start().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`Failed to start server: ${message}`);
  process.exit(1);
});
