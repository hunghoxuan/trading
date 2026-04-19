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

const SERVER_VERSION = envStr(process.env.WEBHOOK_SERVER_VERSION, "2026.04.20-04");

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
  ctraderClientId: envStr(process.env.CTRADER_CLIENT_ID),
  ctraderSecret: envStr(process.env.CTRADER_SECRET),

  maxRiskPct: asNum(process.env.MAX_RISK_PCT, NaN),

  // MT5 bridge (merged into this same server.js)
  mt5Enabled: asBool(process.env.MT5_ENABLED, true),
  mt5Storage: "postgres",
  mt5TvAlertApiKeys: parseKeySet(process.env.MT5_TV_ALERT_API_KEYS),
  mt5TvWebhookTokens: parseKeySet(process.env.MT5_TV_WEBHOOK_TOKENS || process.env.TV_WEBHOOK_TOKENS),
  mt5EaApiKeys: parseKeySet(process.env.MT5_EA_API_KEYS),
  mt5AuthAllowLegacyPayloadKey: asBool(process.env.MT5_AUTH_ALLOW_LEGACY_PAYLOAD_KEY, true),
  mt5AuthAllowLegacyQueryKey: asBool(process.env.MT5_AUTH_ALLOW_LEGACY_QUERY_KEY, true),
  mt5V2DualWriteEnabled: asBool(process.env.MT5_V2_DUAL_WRITE_ENABLED, false),
  mt5V2BrokerApiEnabled: asBool(process.env.MT5_V2_BROKER_API_ENABLED, true),
  mt5V2LeaseSeconds: asNum(process.env.MT5_V2_LEASE_SECONDS, 30),
  mt5DefaultLot: asNum(process.env.MT5_DEFAULT_LOT, 0.01),
  mt5DefaultUserId: envStr(process.env.MT5_DEFAULT_USER_ID, "default"),
  mt5PruneEnabled: asBool(process.env.MT5_PRUNE_ENABLED, true),
  mt5PruneDays: asNum(process.env.MT5_PRUNE_DAYS, 14),
  mt5PruneIntervalMinutes: asNum(process.env.MT5_PRUNE_INTERVAL_MINUTES, 60),
  mt5PostgresUrl: envStr(process.env.MT5_POSTGRES_URL) || envStr(process.env.POSTGRES_URL) || envStr(process.env.POSTGRE_URL),
  uiDistPath: path.resolve(__dirname, envStr(process.env.WEB_UI_DIST_PATH || process.env.WEBHOOK_UI_DIST_PATH, "../web-ui/dist")),
  landingDistPath: path.resolve(__dirname, envStr(process.env.WEB_LANDING_DIST_PATH, "../web")),
  uiAuthEnabled: asBool(process.env.UI_AUTH_ENABLED, true),
  uiBootstrapEmail: envStr(process.env.UI_BOOTSTRAP_EMAIL, "hung.hoxuan@gmail.com").toLowerCase(),
  uiBootstrapPassword: envStr(process.env.UI_BOOTSTRAP_PASSWORD, "BceTzkUuznrX7WDLTODBh077"),
  uiSessionTtlSeconds: asNum(process.env.UI_SESSION_TTL_SECONDS, 60 * 60 * 24 * 7),
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

function mt5GenerateId(prefix = "ID") {
  // Use timestamp for rough ordering + random suffix for uniqueness
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}_${now}_${rand}`;
}

function mt5NormalizeSymbol(s) {
  const val = typeof s === 'string' ? s : (s?.symbol || s?.s || "");
  return String(val).toUpperCase().replace(/[\/\-\_\.]/g, "").trim();
}

async function mt5Log(objectId, objectTable, metadata = {}, userId = null) {
  const b = await mt5Backend();
  if (b.log) return await b.log(objectId, objectTable, metadata, userId);
  // Fallback for non-postgres or bootstrapping
  const now = mt5NowIso();
  console.log(`[LOG][${objectTable}][${objectId}] user=${userId} metadata=${JSON.stringify(metadata)}`);
}

function json(res, statusCode, data) {
  if (!res || res.destroyed || res.writableEnded) return false;
  const body = JSON.stringify(data);
  try {
    if (!res.headersSent) {
      res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
      });
    }
    if (!res.writableEnded && !res.destroyed) {
      res.end(body);
      return true;
    }
  } catch {
    // Ignore write-after-end or socket-closed races on aborted/malformed requests.
  }
  return false;
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

function hashApiKey(raw) {
  return crypto.createHash("sha256").update(String(raw || ""), "utf8").digest("hex");
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
  return {
    ok: true,
    user: uiPublicUserView(user),
    accounts: (accounts || []).map(uiPublicAccountView),
    api_keys: [],
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
    p === "/v2" ||
    p.startsWith("/v2/") ||
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
  const strategy = String(payload.strategy || payload.source || payload.system || "UnknownStrategy");
  const symbol = String(payload.symbol || payload.ticker || "").toUpperCase();
  const side = normalizeSide(payload.side || payload.action);
  const tradeId = envStr(payload.signal_id ?? payload.id ?? payload.trade_id ?? payload.tradeId);
  const timeframe = String(payload.timeframe || payload.tf || "n/a");
  const orderTypeRaw = envStr(payload.order_type ?? payload.orderType);
  const orderType = orderTypeRaw ? mt5NormalizeOrderType(payload) : "market";
  const chartTf = envStr(payload.chart_tf ?? payload.chartTf ?? payload.timeframe ?? payload.tf);
  const signalTf = envStr(payload.signal_tf ?? payload.signalTf);
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
    order_type: orderType,
    chart_tf: chartTf || null,
    signal_tf: signalTf || null,
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

async function executeCTrader(signal, opts = {}) {
  const mode = String(opts?.mode || CFG.ctraderMode || "").trim().toLowerCase();
  const modeEnabled = ["demo", "live"].includes(mode);
  const enabled = opts?.forceEnabled ? modeEnabled : CFG.ctraderEnabled;
  if (!enabled) {
    const reason = mode
      ? "CTRADER mode invalid (use demo|live, or empty to disable)"
      : "CTRADER mode empty (disabled)";
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
      mode: mode || CFG.ctraderMode,
      signal,
      execution_profile: opts?.profile || null,
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
    mode: mode || CFG.ctraderMode,
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

async function resolveExecutionPlan(signal) {
  const userId = String(signal?.user_id || CFG.mt5DefaultUserId).trim() || CFG.mt5DefaultUserId;
  const profile = await mt5GetActiveExecutionProfileV2(userId).catch(() => null);
  if (!profile) {
    return {
      kind: "legacy",
      runMt5: true,
      runBinance: true,
      runCTrader: true,
      profile: null,
    };
  }
  const route = String(profile.route || "").trim().toLowerCase();
  if (route === "ctrader") {
    return {
      kind: "profile",
      runMt5: false,
      runBinance: false,
      runCTrader: true,
      ctraderMode: String(profile.ctrader_mode || CFG.ctraderMode || "demo").toLowerCase(),
      profile,
    };
  }
  // `ea` and `v2` both route into MT5 queue. Consumer side differs externally.
  return {
    kind: "profile",
    runMt5: true,
    runBinance: false,
    runCTrader: false,
    profile,
  };
}

async function handleSignal(payload) {
  const signal = normalizeSignal(payload);
  enforceRiskAndPolicy(signal);

  const plan = await resolveExecutionPlan(signal);
  const execResults = [];
  if (plan.runMt5) {
    const mt5Res = await executeMt5(signal);
    execResults.push(mt5Res);
  } else {
    execResults.push({ broker: "mt5", status: "skipped", reason: "Execution profile route != mt5" });
  }

  if (plan.runBinance) {
    const binanceRes = await executeBinance(signal);
    execResults.push(binanceRes);
  } else {
    execResults.push({ broker: "binance", status: "skipped", reason: "Execution profile route disabled" });
  }

  if (plan.runCTrader) {
    const ctraderRes = await executeCTrader(signal, {
      mode: plan.ctraderMode,
      forceEnabled: plan.kind === "profile",
      profile: plan.profile,
    });
    execResults.push(ctraderRes);
  } else {
    execResults.push({ broker: "ctrader", status: "skipped", reason: "Execution profile route disabled" });
  }

  const text = formatSignal(signal);
  const telegram = await sendTelegram(text);

  return {
    ok: true,
    signal,
    execution_plan: plan?.profile ? {
      profile_id: plan.profile.profile_id || null,
      route: plan.profile.route || null,
      account_id: plan.profile.account_id || null,
      ctrader_mode: plan.ctraderMode || null,
    } : null,
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
  const rowEntry = row.entry === null || row.entry === undefined ? null : Number(row.entry);
  const entryFromRaw = Number(raw.entry ?? raw.price);
  const resolvedEntry = Number.isFinite(rowEntry) && rowEntry > 0
    ? rowEntry
    : (Number.isFinite(entryFromRaw) && entryFromRaw > 0 ? entryFromRaw : null);
  const tfFallback = String(row.signal_tf || raw.signal_tf || raw.signalTf || raw.sourceTf || raw.timeframe || "");
  return {
    signal_id: String(row.signal_id),
    created_at: String(row.created_at),
    user_id: String(row.user_id || CFG.mt5DefaultUserId || "default"),
    source: String(row.source || ""),
    action: String(row.action || row.side || ""),
    side: String(row.side || row.action || ""),
    symbol: String(row.symbol || ""),
    volume: Number(row.volume),
    sl: row.sl === null || row.sl === undefined ? null : Number(row.sl),
    tp: row.tp === null || row.tp === undefined ? null : Number(row.tp),
    entry: resolvedEntry,
    rr_planned: row.rr_planned === null || row.rr_planned === undefined ? null : Number(row.rr_planned),
    risk_money_planned: row.risk_money_planned === null || row.risk_money_planned === undefined ? null : Number(row.risk_money_planned),
    pnl_money_realized: row.pnl_money_realized === null || row.pnl_money_realized === undefined ? null : Number(row.pnl_money_realized),
    entry_price_exec: Number.isFinite(execEntry) && execEntry > 0 ? execEntry : null,
    sl_exec: Number.isFinite(execSl) && execSl > 0 ? execSl : null,
    tp_exec: Number.isFinite(execTp) && execTp > 0 ? execTp : null,
    note: String(row.note || ""),
    raw_json: raw,
    signal_tf: tfFallback,
    chart_tf: String(row.chart_tf || raw.chart_tf || raw.chartTf || raw.chartTimeframe || tfFallback || ""),
    entry_model: String(row.entry_model || raw.entry_model || raw.entryModel || ""),
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


async function mt5InitBackend() {
  if (MT5_BACKEND) return MT5_BACKEND;
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

  // NEW UNIFIED SCHEMA (v2.2 simplified)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      user_name TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      password_salt TEXT,
      role TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      name TEXT,
      balance DOUBLE PRECISION NULL,
      api_key_hash TEXT NULL,
      api_key_last4 TEXT NULL,
      api_key_rotated_at TIMESTAMPTZ NULL,
      source_ids_cache JSONB NULL,
      metadata JSONB,
      status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS signals (
      signal_id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      source TEXT,
      source_id TEXT,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      entry_model TEXT NULL,
      sl DOUBLE PRECISION NULL,
      tp DOUBLE PRECISION NULL,
      signal_tf TEXT NULL,
      chart_tf TEXT NULL,
      rr_planned DOUBLE PRECISION NULL,
      note TEXT,
      raw_json JSONB,
      status TEXT NOT NULL DEFAULT 'NEW'
    );

    CREATE TABLE IF NOT EXISTS trades (
      trade_id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      broker_id TEXT NULL,
      signal_id TEXT NULL REFERENCES signals(signal_id) ON DELETE SET NULL,
      source_id TEXT NULL,
      entry_model TEXT NULL,
      signal_tf TEXT NULL,
      chart_tf TEXT NULL,
      symbol TEXT NOT NULL,
      action TEXT NOT NULL,
      volume FLOAT8 NULL,
      entry FLOAT8 NULL,
      sl FLOAT8 NULL,
      tp FLOAT8 NULL,
      note TEXT NULL,
      lease_token TEXT NULL,
      lease_expires_at TIMESTAMPTZ NULL,
      dispatch_status TEXT NOT NULL DEFAULT 'NEW',
      execution_status TEXT NOT NULL DEFAULT 'PENDING',
      close_reason TEXT NULL,
      broker_trade_id TEXT NULL,
      entry_exec FLOAT8 NULL,
      sl_exec FLOAT8 NULL,
      tp_exec FLOAT8 NULL,
      opened_at TIMESTAMPTZ NULL,
      closed_at TIMESTAMPTZ NULL,
      pnl_realized FLOAT8 NULL,
      metadata JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS execution_profiles (
      profile_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      profile_name TEXT NOT NULL,
      route TEXT NOT NULL,
      account_id TEXT NULL REFERENCES accounts(account_id) ON DELETE SET NULL,
      source_ids JSONB NULL,
      ctrader_mode TEXT NULL,
      ctrader_account_id TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS logs (
      log_id SERIAL PRIMARY KEY,
      object_id TEXT NULL,
      object_table TEXT NULL,
      metadata JSONB,
      user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  
  // Migration: Merge legacy events into unified logs and drop old tables
  try {
    await pool.query(`
      INSERT INTO logs (object_id, object_table, metadata, created_at)
      SELECT signal_id, 'signals', payload_json || jsonb_build_object('legacy_event_type', event_type), event_time
      FROM signal_events
    `).catch(() => {});
    await pool.query(`
      INSERT INTO logs (object_id, object_table, metadata, created_at)
      SELECT trade_id, 'trades', payload_json || jsonb_build_object('legacy_event_type', event_type), event_time
      FROM trade_events
    `).catch(() => {});
  } catch (e) {
    // Legacy tables might already be gone
  }

  const legacyTables = ['signal_events', 'trade_events', 'source_events', 'mt5_signals', 'account_sources', 'ui_auth_users', 'user_api_keys', 'brokers'];
  for (const t of legacyTables) {
    await pool.query(`DROP TABLE IF EXISTS ${t} CASCADE`).catch(() => {});
  }

  // Migration: Strip legacy columns from signals/trades that Postgres persists despite IF NOT EXISTS definitions
  const legacySigCols = [
    'risk_money_planned', 'pnl_money_realized', 'entry_price_exec', 'sl_exec', 'tp_exec', 
    'sl_pips', 'tp_pips', 'pip_value_per_lot', 'risk_money_actual', 
    'reward_money_planned', 'reward_money_actual', 'ack_status', 'ack_ticket', 'ack_error',
    'locked_at', 'ack_at', 'opened_at', 'closed_at'
  ];
  for (const col of legacySigCols) {
    await pool.query(`ALTER TABLE signals DROP COLUMN IF EXISTS ${col}`).catch(() => {});
  }

  // Migration: keep schema simple and aligned with v2.2 fields.
  await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS balance_start`).catch(() => {});
  await pool.query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS source_id TEXT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS entry_model TEXT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS name TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS balance DOUBLE PRECISION NULL`).catch(() => {});
  await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS api_key_hash TEXT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS api_key_last4 TEXT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS api_key_rotated_at TIMESTAMPTZ NULL`).catch(() => {});
  await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS source_ids_cache JSONB NULL`).catch(() => {});
  await pool.query(`ALTER TABLE accounts DROP COLUMN IF EXISTS broker_id`).catch(() => {});
  await pool.query(`ALTER TABLE execution_profiles ADD COLUMN IF NOT EXISTS source_ids JSONB NULL`).catch(() => {});
  await pool.query(`ALTER TABLE execution_profiles ADD COLUMN IF NOT EXISTS ctrader_mode TEXT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE execution_profiles ADD COLUMN IF NOT EXISTS ctrader_account_id TEXT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE execution_profiles ADD COLUMN IF NOT EXISTS metadata JSONB NULL`).catch(() => {});
  await pool.query(`ALTER TABLE execution_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`).catch(() => {});

  await pool.query(`ALTER TABLE trades RENAME COLUMN side TO action`).catch(() => {});
  await pool.query(`ALTER TABLE trades RENAME COLUMN intent_entry TO entry`).catch(() => {});
  await pool.query(`ALTER TABLE trades RENAME COLUMN intent_sl TO sl`).catch(() => {});
  await pool.query(`ALTER TABLE trades RENAME COLUMN intent_tp TO tp`).catch(() => {});
  await pool.query(`ALTER TABLE trades RENAME COLUMN intent_note TO note`).catch(() => {});
  await pool.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS volume FLOAT8 NULL`).catch(() => {});
  await pool.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS user_id TEXT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_model TEXT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS signal_tf TEXT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE trades ADD COLUMN IF NOT EXISTS chart_tf TEXT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_execution_status_check`).catch(() => {});
  await pool.query(`
    ALTER TABLE trades
    ADD CONSTRAINT trades_execution_status_check
    CHECK (execution_status = ANY (ARRAY['PENDING','OPEN','CLOSED','REJECTED','CANCELLED']))
  `).catch(() => {});
  await pool.query(`ALTER TABLE trades DROP COLUMN IF EXISTS origin_kind`).catch(() => {});
  await pool.query(`ALTER TABLE trades DROP COLUMN IF EXISTS intent_volume`).catch(() => {});
  await pool.query(`ALTER TABLE trades DROP COLUMN IF EXISTS broker_order_id`).catch(() => {});
  await pool.query(`ALTER TABLE trades DROP COLUMN IF EXISTS pulled_at`).catch(() => {});
  await pool.query(`ALTER TABLE trades DROP COLUMN IF EXISTS error_code`).catch(() => {});
  await pool.query(`ALTER TABLE trades DROP COLUMN IF EXISTS error_message`).catch(() => {});
  await pool.query(`
    UPDATE trades t
    SET entry_model = COALESCE(NULLIF(t.entry_model, ''), NULLIF(s.entry_model, ''), s.raw_json->>'entry_model'),
        signal_tf = COALESCE(NULLIF(t.signal_tf, ''), s.signal_tf),
        chart_tf = COALESCE(NULLIF(t.chart_tf, ''), s.chart_tf)
    FROM signals s
    WHERE t.signal_id = s.signal_id
  `).catch(() => {});

  // Ensure default user
  const now = mt5NowIso();
  await pool.query(`
    INSERT INTO users (user_id, email, password_hash, role, created_at, updated_at)
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

  // Legacy migration paths removed; using Postgres-exclusive storage.

  const storage = "postgres";
  MT5_BACKEND = {
    storage,
    info: { url: CFG.mt5PostgresUrl.replace(/:[^:@/]+@/, ":***@") },
    async log(objectId, objectTable, metadata = {}, userId = null) {
      await pool.query(`
        INSERT INTO logs (object_id, object_table, metadata, user_id, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [objectId, objectTable, JSON.stringify(metadata), userId]);
    },
    async upsertSignal(signal) {
      const r = await pool.query(`
        INSERT INTO signals (
          signal_id, created_at, user_id, source, source_id, symbol, side, sl, tp,
          entry_model, signal_tf, chart_tf, rr_planned, note, raw_json, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16)
        ON CONFLICT (signal_id) DO NOTHING
        RETURNING signal_id
      `, [
        signal.signal_id, signal.created_at, signal.user_id, signal.source, signal.source_id,
        signal.symbol, signal.side, signal.sl, signal.tp, signal.entry_model || null,
        signal.signal_tf, signal.chart_tf, signal.rr_planned, signal.note,
        JSON.stringify(signal.raw_json || {}), signal.status || 'NEW'
      ]);
      return { inserted: (r.rowCount || 0) > 0 };
    },
    async fanoutSignalTradeV2(payload = {}) {
      const signalId = String(payload.signal_id || "").trim();
      const sourceId = String(payload.source_id || "").trim();
      const userId = String(payload.user_id || CFG.mt5DefaultUserId).trim();
      if (!signalId || !sourceId || !userId) return { created: 0, account_ids: [] };
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const accounts = await client.query(`SELECT account_id FROM accounts WHERE user_id = $1 AND status != 'ARCHIVED'`, [userId]);
        let created = 0; const accountIds = [];
        for (const row of accounts.rows || []) {
          const aid = row.account_id;
          const tradeId = mt5GenerateId("TRD");
          const ins = await client.query(`
            INSERT INTO trades (
              trade_id, account_id, user_id, signal_id, source_id,
              entry_model, signal_tf, chart_tf,
              symbol, action, entry, sl, tp, volume, note,
              dispatch_status, execution_status, metadata, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'NEW','PENDING',$16::jsonb,$17,$17)
          `, [
            tradeId, aid, userId, signalId, sourceId,
            payload.entry_model || null, payload.signal_tf || null, payload.chart_tf || null,
            payload.symbol, payload.action, payload.entry, payload.sl,
            payload.tp, payload.volume, payload.note, JSON.stringify(payload.metadata || {}), mt5NowIso()
          ]);
          if ((ins.rowCount || 0) > 0) {
            created++; accountIds.push(aid);
            await client.query(`INSERT INTO logs (object_id, object_table, metadata, user_id) VALUES ($1,'trades',$2,$3)`, 
              [tradeId, JSON.stringify({ event: 'SIGNAL_FANOUT', signal_id: signalId }), userId]);
          }
        }
        await client.query("COMMIT");
        return { created, account_ids: accountIds };
      } catch (e) { await client.query("ROLLBACK"); throw e; }
      finally { client.release(); }
    },
    async pullLeasedTradesV2(accountId, maxItems = 1, leaseSeconds = 30) {
      const aid = String(accountId || "").trim();
      const leaseSec = Math.max(5, Math.min(300, Number(leaseSeconds) || 30));
      if (!aid) return [];
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const sel = await client.query(`
          SELECT * FROM trades
          WHERE account_id = $1 AND (dispatch_status = 'NEW' OR (dispatch_status = 'LEASED' AND lease_expires_at < NOW()))
          ORDER BY created_at ASC LIMIT $2 FOR UPDATE SKIP LOCKED
        `, [aid, Math.max(1, Math.min(100, Number(maxItems) || 1))]);
        const out = [];
        for (const row of sel.rows || []) {
          const leaseToken = crypto.randomUUID();
          const leaseExpiresAt = new Date(Date.now() + leaseSec * 1000).toISOString();
          await client.query(`UPDATE trades SET dispatch_status = 'LEASED', lease_token = $1, lease_expires_at = $2, updated_at = NOW() WHERE trade_id = $3`, [leaseToken, leaseExpiresAt, row.trade_id]);
          out.push({ ...row, lease_token: leaseToken, lease_expires_at: leaseExpiresAt });
        }
        await client.query("COMMIT"); return out;
      } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
    },
    async ackTradeV2(accountId, payload = {}) {
       const now = mt5NowIso();
       const res = await pool.query(`
         UPDATE trades
         SET dispatch_status = 'CONSUMED',
             execution_status = $1, broker_trade_id = $2, entry_exec = $3, pnl_realized = $4,
             closed_at = CASE WHEN $1 = 'CLOSED' THEN $5 ELSE closed_at END, updated_at = $5
         WHERE trade_id = $6 AND account_id = $7 RETURNING user_id
       `, [payload.execution_status, payload.broker_trade_id, payload.entry_exec, payload.pnl_realized, now, payload.trade_id, accountId]);
       if (res.rowCount > 0) {
         await this.log(payload.trade_id, 'trades', { event: 'ACK', status: payload.execution_status, pnl: payload.pnl_realized }, res.rows[0].user_id);
       }
       return { ok: res.rowCount > 0 };
    },
    async brokerSyncV2(accountId, payload = {}) {
      const aid = String(accountId || "").trim();
      const acc = await pool.query(`SELECT user_id FROM accounts WHERE account_id = $1`, [aid]);
      const uid = acc.rows[0]?.user_id || CFG.mt5DefaultUserId;
      await this.log(aid, 'accounts', { event: 'SYNC', data: payload }, uid);

      const merged = new Map();
      const seenTickets = new Set();
      const hasPositionsSnapshot = Array.isArray(payload?.positions);
      const hasOrdersSnapshot = Array.isArray(payload?.orders);
      const snapshotComplete = hasPositionsSnapshot && hasOrdersSnapshot;
      const statusRank = (s) => {
        if (s === "CLOSED") return 3;
        if (s === "OPEN") return 2;
        return 1;
      };
      const pushItems = (arr = []) => {
        for (const raw of Array.isArray(arr) ? arr : []) {
          if (!raw || typeof raw !== 'object') continue;
          const signalId = String(raw.signal_id || "").trim();
          const ticket = String(raw.ticket || "").trim() || null;
          if (!signalId && !ticket) continue;
          if (ticket) seenTickets.add(ticket);
          const pnlRaw = Number(raw.pnl);
          const pnl = Number.isFinite(pnlRaw) ? pnlRaw : null;
          const statusRaw = String(raw.status || "").trim().toUpperCase();
          let executionStatus = "PENDING";
          if (statusRaw === "START" || statusRaw === "OPEN") executionStatus = "OPEN";
          else if (statusRaw === "PLACED" || statusRaw === "NEW" || statusRaw === "PENDING") executionStatus = "PENDING";
          else if (statusRaw === "TP" || statusRaw === "SL" || statusRaw === "CANCEL" || statusRaw === "FAIL" || statusRaw === "CLOSED") executionStatus = "CLOSED";
          const key = ticket ? `tk:${ticket}` : `sig:${signalId}`;
          const prev = merged.get(key);
          if (!prev) {
            merged.set(key, { signal_id: signalId || null, ticket, pnl, status_raw: statusRaw || "UNKNOWN", execution_status: executionStatus });
          } else {
            if (!prev.signal_id && signalId) prev.signal_id = signalId;
            if (statusRank(executionStatus) > statusRank(prev.execution_status)) {
              prev.execution_status = executionStatus;
              prev.status_raw = statusRaw || prev.status_raw;
            }
            if (pnl !== null) prev.pnl = pnl;
          }
        }
      };

      pushItems(payload.positions);
      pushItems(payload.orders);
      const items = Array.from(merged.values());

      let matched = 0;
      let synced = 0;
      for (const it of items) {
        let res = { rowCount: 0 };
        if (it.ticket) {
          res = await pool.query(`
            UPDATE trades
            SET dispatch_status = CASE
                  WHEN dispatch_status IN ('NEW','LEASED') THEN 'CONSUMED'
                  ELSE dispatch_status
                END,
                execution_status = CASE
                  WHEN execution_status IN ('CLOSED', 'CANCELLED') AND $1 NOT IN ('CLOSED', 'CANCELLED') THEN execution_status
                  WHEN execution_status = 'OPEN' AND $1 = 'PENDING' THEN execution_status
                  ELSE $1
                END,
                pnl_realized = COALESCE($2, pnl_realized),
                closed_at = CASE WHEN $1 IN ('CLOSED','CANCELLED') THEN NOW() ELSE closed_at END,
                updated_at = NOW()
            WHERE account_id = $3 AND broker_trade_id = $4
            RETURNING trade_id
          `, [it.execution_status, it.pnl, aid, it.ticket]);
        }
        if (it.signal_id) {
          if (res.rowCount === 0) {
            res = await pool.query(`
            UPDATE trades
            SET dispatch_status = CASE
                  WHEN dispatch_status IN ('NEW','LEASED') THEN 'CONSUMED'
                  ELSE dispatch_status
                END,
                execution_status = CASE
                  WHEN execution_status IN ('CLOSED', 'CANCELLED') AND $1 NOT IN ('CLOSED', 'CANCELLED') THEN execution_status
                  WHEN execution_status = 'OPEN' AND $1 = 'PENDING' THEN execution_status
                  ELSE $1
                END,
                broker_trade_id = COALESCE(NULLIF($2, ''), broker_trade_id),
                pnl_realized = COALESCE($3, pnl_realized),
                closed_at = CASE WHEN $1 IN ('CLOSED','CANCELLED') THEN NOW() ELSE closed_at END,
                updated_at = NOW()
            WHERE trade_id = (
              SELECT trade_id
              FROM trades
              WHERE account_id = $4
                AND signal_id = $5
              ORDER BY
                CASE WHEN broker_trade_id IS NULL OR broker_trade_id = '' THEN 0 ELSE 1 END,
                created_at ASC
              LIMIT 1
            )
            RETURNING trade_id
            `, [it.execution_status, it.ticket, it.pnl, aid, it.signal_id]);
          }
        }
        if (res.rowCount === 0 && it.ticket) {
          // Last-resort fallback: bind ticket to oldest unresolved trade for this account.
          res = await pool.query(`
            UPDATE trades
            SET dispatch_status = CASE
                  WHEN dispatch_status IN ('NEW','LEASED') THEN 'CONSUMED'
                  ELSE dispatch_status
                END,
                execution_status = CASE
                  WHEN execution_status IN ('CLOSED', 'CANCELLED') AND $1 NOT IN ('CLOSED', 'CANCELLED') THEN execution_status
                  WHEN execution_status = 'OPEN' AND $1 = 'PENDING' THEN execution_status
                  ELSE $1
                END,
                broker_trade_id = COALESCE(NULLIF($2, ''), broker_trade_id),
                pnl_realized = COALESCE($3, pnl_realized),
                closed_at = CASE WHEN $1 IN ('CLOSED','CANCELLED') THEN NOW() ELSE closed_at END,
                updated_at = NOW()
            WHERE trade_id = (
              SELECT trade_id
              FROM trades
              WHERE account_id = $4
                AND execution_status IN ('PENDING','OPEN')
                AND (broker_trade_id IS NULL OR broker_trade_id = '')
              ORDER BY created_at ASC
              LIMIT 1
            )
            RETURNING trade_id
          `, [it.execution_status, it.ticket, it.pnl, aid]);
        }
        matched += res.rowCount;
        if (res.rowCount > 0) {
          synced++;
          const tid = String(res.rows?.[0]?.trade_id || "").trim();
          if (tid) {
            await this.log(tid, 'trades', {
              event: 'SYNC_UPDATE',
              status_raw: it.status_raw,
              execution_status: it.execution_status,
              ticket: it.ticket || null,
              signal_id: it.signal_id || null,
              pnl: it.pnl,
            }, uid);
          }
        }
      }
      let closed_by_snapshot = 0;
      if (snapshotComplete) {
        if (seenTickets.size > 0) {
          const closeRes = await pool.query(`
            UPDATE trades
            SET execution_status = CASE WHEN execution_status = 'PENDING' THEN 'CANCELLED' ELSE 'CLOSED' END,
                close_reason = COALESCE(close_reason, CASE WHEN execution_status = 'PENDING' THEN 'CANCEL' ELSE 'MANUAL' END),
                closed_at = COALESCE(closed_at, NOW()),
                updated_at = NOW()
            WHERE account_id = $1
              AND execution_status IN ('OPEN','PENDING')
              AND broker_trade_id IS NOT NULL
              AND broker_trade_id <> ''
              AND NOT (broker_trade_id = ANY($2::text[]))
          `, [aid, Array.from(seenTickets)]);
          closed_by_snapshot = Number(closeRes.rowCount || 0);
        } else {
          const closeRes = await pool.query(`
            UPDATE trades
            SET execution_status = CASE WHEN execution_status = 'PENDING' THEN 'CANCELLED' ELSE 'CLOSED' END,
                close_reason = COALESCE(close_reason, CASE WHEN execution_status = 'PENDING' THEN 'CANCEL' ELSE 'MANUAL' END),
                closed_at = COALESCE(closed_at, NOW()),
                updated_at = NOW()
            WHERE account_id = $1
              AND execution_status IN ('OPEN','PENDING')
              AND broker_trade_id IS NOT NULL
              AND broker_trade_id <> ''
          `, [aid]);
          closed_by_snapshot = Number(closeRes.rowCount || 0);
        }
      }

      return { ok: true, synced, matched, received: items.length, closed_by_snapshot };
    },
    async brokerHeartbeatV2(accountId, payload = {}) {
      const aid = String(accountId || "").trim();
      const now = mt5NowIso();
      const acc = await pool.query(`SELECT user_id FROM accounts WHERE account_id = $1`, [aid]);
      const uid = acc.rows[0]?.user_id || CFG.mt5DefaultUserId;
      await pool.query(`UPDATE accounts SET updated_at = $1 WHERE account_id = $2`, [now, aid]);
      await this.log(aid, 'accounts', { event: 'HEARTBEAT', payload }, uid);
      return { ok: true };
    },
    async listSignals(limit, statusFilter, userId = null) {
      const clauses = ["signal_id NOT LIKE 'SYSTEM_%'"]; const params = [];
      if (statusFilter) { params.push(statusFilter); clauses.push(`status = $${params.length}`); }
      if (userId) { params.push(userId); clauses.push(`user_id = $${params.length}`); }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      params.push(limit);
      const res = await pool.query(`SELECT * FROM signals ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params);
      return (res.rows || []).map((r) => mt5MapDbRow(r)).filter(Boolean);
    },
    async listTradesV2(filters = {}, page = 1, pageSize = 50) {
      const safePage = Math.max(1, Number(page) || 1); const safePageSize = Math.max(1, Math.min(200, Number(pageSize) || 50));
      const offset = (safePage - 1) * safePageSize; const clauses = []; const params = [];
      const tradeIds = Array.isArray(filters.trade_ids) ? filters.trade_ids.map((v) => String(v || "").trim()).filter(Boolean) : [];
      if (tradeIds.length) { params.push(tradeIds); clauses.push(`trade_id = ANY($${params.length}::text[])`); }
      if (filters.user_id) { params.push(filters.user_id); clauses.push(`user_id = $${params.length}`); }
      if (filters.account_id) { params.push(filters.account_id); clauses.push(`account_id = $${params.length}`); }
      if (filters.source_id) { params.push(filters.source_id); clauses.push(`source_id = $${params.length}`); }
      if (filters.dispatch_status) { params.push(filters.dispatch_status); clauses.push(`dispatch_status = $${params.length}`); }
      if (filters.execution_status) { params.push(filters.execution_status); clauses.push(`execution_status = $${params.length}`); }
      if (filters.created_from) { params.push(filters.created_from); clauses.push(`created_at >= $${params.length}`); }
      if (filters.created_to) { params.push(filters.created_to); clauses.push(`created_at <= $${params.length}`); }
      if (filters.symbol) { params.push(filters.symbol); clauses.push(`symbol = $${params.length}`); }
      const actionFilter = filters.action || filters.side;
      if (actionFilter) { params.push(actionFilter); clauses.push(`action = $${params.length}`); }
      if (filters.q) {
        params.push(`%${String(filters.q)}%`);
        const p = `$${params.length}`;
        clauses.push(`(trade_id ILIKE ${p} OR signal_id ILIKE ${p} OR symbol ILIKE ${p} OR account_id ILIKE ${p} OR source_id ILIKE ${p})`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const countRes = await pool.query(`SELECT COUNT(*) FROM trades ${where}`, params);
      params.push(safePageSize, offset);
      const res = await pool.query(`SELECT * FROM trades ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      return { items: res.rows, total: parseInt(countRes.rows[0].count), page: safePage, pageSize: safePageSize };
    },
    async bulkActionTradesV2(action, filters = {}) {
      const act = String(action || "").trim().toLowerCase();
      if (!act) return { ok: false, error: "action is required" };
      if (!["close_all", "cancel_all", "delete_all"].includes(act)) {
        return { ok: false, error: "unsupported action" };
      }
      const isDelete = act === "delete_all";
      const baseOffset = isDelete ? 0 : 2;
      const clauses = [];
      const closeReason = act === "cancel_all" ? "CANCEL" : "MANUAL";
      const nextStatus = act === "cancel_all" ? "CANCELLED" : "CLOSED";
      const params = isDelete ? [] : [closeReason, nextStatus];
      const tradeIds = Array.isArray(filters.trade_ids) ? filters.trade_ids.map((v) => String(v || "").trim()).filter(Boolean) : [];
      if (tradeIds.length) { params.push(tradeIds); clauses.push(`trade_id = ANY($${baseOffset + params.length}::text[])`); }
      if (filters.user_id) { params.push(filters.user_id); clauses.push(`user_id = $${baseOffset + params.length}`); }
      if (filters.account_id) { params.push(filters.account_id); clauses.push(`account_id = $${baseOffset + params.length}`); }
      if (filters.source_id) { params.push(filters.source_id); clauses.push(`source_id = $${baseOffset + params.length}`); }
      if (filters.execution_status) { params.push(filters.execution_status); clauses.push(`execution_status = $${baseOffset + params.length}`); }
      if (filters.created_from) { params.push(filters.created_from); clauses.push(`created_at >= $${baseOffset + params.length}`); }
      if (filters.created_to) { params.push(filters.created_to); clauses.push(`created_at <= $${baseOffset + params.length}`); }
      if (filters.q) {
        params.push(`%${String(filters.q)}%`);
        const p = `$${baseOffset + params.length}`;
        clauses.push(`(trade_id ILIKE ${p} OR signal_id ILIKE ${p} OR symbol ILIKE ${p} OR account_id ILIKE ${p} OR source_id ILIKE ${p})`);
      }
      if (act === "close_all") clauses.push(`execution_status IN ('OPEN','PENDING')`);
      if (act === "cancel_all") clauses.push(`execution_status = 'PENDING'`);
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      if (act === "delete_all") {
        const delRes = await pool.query(`
          DELETE FROM trades
          ${where}
        `, params);
        return { ok: true, updated: Number(delRes.rowCount || 0), action: act };
      }
      const res = await pool.query(`
        UPDATE trades
        SET execution_status = $2,
            close_reason = COALESCE(close_reason, $1),
            closed_at = COALESCE(closed_at, NOW()),
            updated_at = NOW()
        ${where}
      `, params);
      return { ok: true, updated: Number(res.rowCount || 0), action: act };
    },
    async listLogs(filters = {}, limit = 200, offset = 0) {
      const clauses = []; const params = [];
      if (filters.user_id) { params.push(filters.user_id); clauses.push(`user_id = $${params.length}`); }
      if (filters.object_id) { params.push(filters.object_id); clauses.push(`object_id = $${params.length}`); }
      if (filters.object_table) { params.push(filters.object_table); clauses.push(`object_table = $${params.length}`); }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      params.push(limit, offset);
      const res = await pool.query(`SELECT * FROM logs ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      return res.rows;
    },
    async deleteAllEvents() {
      return pool.query(`DELETE FROM logs`);
    },
    async listSourcesV2() {
      const res = await pool.query(`
        SELECT source_id, name, kind, auth_mode, auth_secret_hash, is_active, metadata, created_at, updated_at
        FROM sources
        ORDER BY created_at ASC, source_id ASC
      `);
      return res.rows || [];
    },
    async getSourceByIdV2(sourceId) {
      const sid = String(sourceId || "").trim();
      if (!sid) return null;
      const res = await pool.query(`
        SELECT source_id, name, kind, auth_mode, auth_secret_hash, is_active, metadata, created_at, updated_at
        FROM sources
        WHERE source_id = $1
        LIMIT 1
      `, [sid]);
      return res.rows[0] || null;
    },
    async upsertSourceV2(source = {}) {
      const sourceId = String(source.source_id || "").trim();
      if (!sourceId) return null;
      const now = mt5NowIso();
      const res = await pool.query(`
        INSERT INTO sources (
          source_id, name, kind, auth_mode, auth_secret_hash, is_active, metadata, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$8)
        ON CONFLICT (source_id) DO UPDATE SET
          name = EXCLUDED.name,
          kind = EXCLUDED.kind,
          auth_mode = EXCLUDED.auth_mode,
          auth_secret_hash = EXCLUDED.auth_secret_hash,
          is_active = EXCLUDED.is_active,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
        RETURNING source_id, name, kind, auth_mode, auth_secret_hash, is_active, metadata, created_at, updated_at
      `, [
        sourceId,
        String(source.name || sourceId),
        String(source.kind || "api"),
        String(source.auth_mode || "token"),
        source.auth_secret_hash ? String(source.auth_secret_hash) : null,
        normalizeUserActive(source.is_active, true),
        source.metadata && typeof source.metadata === "object" ? JSON.stringify(source.metadata) : "{}",
        now,
      ]);
      return res.rows[0] || null;
    },
    async rotateSourceSecretV2(sourceId) {
      const sid = String(sourceId || "").trim();
      if (!sid) return null;
      const secretPlain = `src_${crypto.randomBytes(18).toString("hex")}`;
      const secretHash = hashApiKey(secretPlain);
      const secretLast4 = secretPlain.slice(-4);
      const res = await pool.query(`
        UPDATE sources
        SET auth_secret_hash = $1,
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('auth_secret_last4', $2),
            updated_at = NOW()
        WHERE source_id = $3
        RETURNING source_id
      `, [secretHash, secretLast4, sid]);
      if (!res.rows[0]) return null;
      return { source_id: sid, source_secret_plaintext: secretPlain, source_secret_last4: secretLast4 };
    },
    async revokeSourceSecretV2(sourceId) {
      const sid = String(sourceId || "").trim();
      if (!sid) return { ok: false, error: "source_id is required" };
      const res = await pool.query(`
        UPDATE sources
        SET auth_secret_hash = NULL,
            metadata = (COALESCE(metadata, '{}'::jsonb) - 'auth_secret_last4'),
            updated_at = NOW()
        WHERE source_id = $1
      `, [sid]);
      if ((res.rowCount || 0) === 0) return { ok: false, error: "source not found" };
      return { ok: true };
    },
    async createAccountV2(payload = {}) {
      const accountId = String(payload.account_id || "").trim();
      if (!accountId) return { ok: false, error: "account_id is required" };
      const now = mt5NowIso();
      const plainApiKey = `acc_${crypto.randomBytes(18).toString("hex")}`;
      const apiKeyHash = hashApiKey(plainApiKey);
      const apiKeyLast4 = plainApiKey.slice(-4);
      const res = await pool.query(`
        INSERT INTO accounts (
          account_id, user_id, name, balance, status, metadata,
          api_key_hash, api_key_last4, api_key_rotated_at, source_ids_cache,
          created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10::jsonb,$11,$11)
        ON CONFLICT (account_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          balance = EXCLUDED.balance,
          status = EXCLUDED.status,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `, [
        accountId,
        String(payload.user_id || CFG.mt5DefaultUserId),
        String(payload.name || accountId),
        payload.balance === null || payload.balance === undefined || Number.isNaN(Number(payload.balance)) ? null : Number(payload.balance),
        String(payload.status || "ACTIVE"),
        payload.metadata && typeof payload.metadata === "object" ? JSON.stringify(payload.metadata) : "{}",
        apiKeyHash,
        apiKeyLast4,
        now,
        payload.source_ids_cache && typeof payload.source_ids_cache === "object" ? JSON.stringify(payload.source_ids_cache) : "[]",
        now,
      ]);
      return { ok: true, item: res.rows[0] || null, api_key_plaintext: plainApiKey };
    },
    async listAccountsV2(userId = null) {
      const params = [];
      let where = "";
      if (userId) {
        params.push(String(userId || ""));
        where = `WHERE user_id = $1`;
      }
      const res = await pool.query(`SELECT * FROM accounts ${where} ORDER BY created_at ASC, account_id ASC`, params);
      return res.rows || [];
    },
    async listExecutionProfilesV2(userId = null) {
      const params = [];
      let where = "";
      if (userId) {
        params.push(String(userId || "").trim());
        where = `WHERE user_id = $1`;
      }
      const res = await pool.query(`
        SELECT profile_id, user_id, profile_name, route, account_id, source_ids, ctrader_mode, ctrader_account_id,
               is_active, metadata, created_at, updated_at
        FROM execution_profiles
        ${where}
        ORDER BY is_active DESC, updated_at DESC, created_at DESC
      `, params);
      return res.rows || [];
    },
    async getActiveExecutionProfileV2(userId = null) {
      const params = [];
      let where = `WHERE is_active = TRUE`;
      if (userId) {
        params.push(String(userId || "").trim());
        where += ` AND user_id = $${params.length}`;
      }
      const res = await pool.query(`
        SELECT profile_id, user_id, profile_name, route, account_id, source_ids, ctrader_mode, ctrader_account_id,
               is_active, metadata, created_at, updated_at
        FROM execution_profiles
        ${where}
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 1
      `, params);
      return res.rows?.[0] || null;
    },
    async saveExecutionProfileV2(payload = {}) {
      const profileId = String(payload.profile_id || "default").trim() || "default";
      const userId = String(payload.user_id || CFG.mt5DefaultUserId).trim() || CFG.mt5DefaultUserId;
      const profileName = String(payload.profile_name || profileId).trim() || profileId;
      const routeRaw = String(payload.route || "").trim().toLowerCase();
      const route = ["ea", "v2", "ctrader"].includes(routeRaw) ? routeRaw : "ea";
      const accountId = String(payload.account_id || "").trim() || null;
      const sourceIds = (Array.isArray(payload.source_ids) ? payload.source_ids : [])
        .map((v) => String(v || "").trim())
        .filter(Boolean);
      const ctraderModeRaw = String(payload.ctrader_mode || "").trim().toLowerCase();
      const ctraderMode = ["demo", "live"].includes(ctraderModeRaw) ? ctraderModeRaw : null;
      const ctraderAccountId = String(payload.ctrader_account_id || "").trim() || null;
      const isActive = payload.is_active === undefined ? true : Boolean(payload.is_active);
      const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (isActive) {
          await client.query(`UPDATE execution_profiles SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1`, [userId]);
        }
        const res = await client.query(`
          INSERT INTO execution_profiles (
            profile_id, user_id, profile_name, route, account_id, source_ids,
            ctrader_mode, ctrader_account_id, is_active, metadata, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10::jsonb,NOW(),NOW())
          ON CONFLICT (profile_id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            profile_name = EXCLUDED.profile_name,
            route = EXCLUDED.route,
            account_id = EXCLUDED.account_id,
            source_ids = EXCLUDED.source_ids,
            ctrader_mode = EXCLUDED.ctrader_mode,
            ctrader_account_id = EXCLUDED.ctrader_account_id,
            is_active = EXCLUDED.is_active,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING profile_id, user_id, profile_name, route, account_id, source_ids, ctrader_mode, ctrader_account_id,
                    is_active, metadata, created_at, updated_at
        `, [
          profileId,
          userId,
          profileName,
          route,
          accountId,
          JSON.stringify(sourceIds),
          ctraderMode,
          ctraderAccountId,
          isActive,
          JSON.stringify(metadata),
        ]);
        await client.query("COMMIT");
        return { ok: true, item: res.rows?.[0] || null };
      } catch (error) {
        await client.query("ROLLBACK");
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      } finally {
        client.release();
      }
    },
    async updateAccountV2(accountId, patch = {}) {
      const targetId = String(accountId || "").trim();
      if (!targetId) return { ok: false, error: "account_id is required" };
      const prevRes = await pool.query(`SELECT * FROM accounts WHERE account_id = $1 LIMIT 1`, [targetId]);
      const prev = prevRes.rows[0];
      if (!prev) return { ok: false, error: "account not found" };
      const res = await pool.query(`
        UPDATE accounts
        SET user_id = $1,
            name = $2,
            balance = $3,
            status = $4,
            metadata = $5::jsonb,
            updated_at = NOW()
        WHERE account_id = $6
        RETURNING *
      `, [
        String(patch.user_id ?? prev.user_id ?? CFG.mt5DefaultUserId),
        String(patch.name ?? prev.name ?? targetId),
        patch.balance === undefined
          ? (prev.balance === null || prev.balance === undefined ? null : Number(prev.balance))
          : (patch.balance === null || patch.balance === "" || Number.isNaN(Number(patch.balance)) ? null : Number(patch.balance)),
        String(patch.status ?? prev.status ?? "ACTIVE"),
        patch.metadata && typeof patch.metadata === "object"
          ? JSON.stringify(patch.metadata)
          : (prev.metadata && typeof prev.metadata === "object" ? JSON.stringify(prev.metadata) : "{}"),
        targetId,
      ]);
      return { ok: true, item: res.rows[0] || null };
    },
    async archiveAccountV2(accountId) {
      const targetId = String(accountId || "").trim();
      if (!targetId) return { ok: false, error: "account_id is required" };
      const openRes = await pool.query(`
        SELECT COUNT(*)::int AS c
        FROM trades
        WHERE account_id = $1 AND execution_status IN ('PENDING','OPEN')
      `, [targetId]);
      const blocking = Number(openRes.rows?.[0]?.c || 0);
      if (blocking > 0) return { ok: false, error: "account has open/pending trades", blocking_open_trades: blocking };
      const res = await pool.query(`
        UPDATE accounts
        SET status = 'ARCHIVED', updated_at = NOW()
        WHERE account_id = $1
        RETURNING *
      `, [targetId]);
      if (!res.rows[0]) return { ok: false, error: "account not found" };
      return { ok: true, item: res.rows[0] };
    },
    async findAccountByApiKeyHash(apiKeyHash) {
      const h = String(apiKeyHash || "").trim();
      if (!h) return null;
      const res = await pool.query(`
        SELECT * FROM accounts
        WHERE api_key_hash = $1 AND status = 'ACTIVE'
        LIMIT 1
      `, [h]);
      return res.rows[0] || null;
    },
    async rotateAccountApiKeyV2(accountId) {
      const targetId = String(accountId || "").trim();
      if (!targetId) return null;
      const plainApiKey = `acc_${crypto.randomBytes(18).toString("hex")}`;
      const apiKeyHash = hashApiKey(plainApiKey);
      const apiKeyLast4 = plainApiKey.slice(-4);
      const res = await pool.query(`
        UPDATE accounts
        SET api_key_hash = $1, api_key_last4 = $2, api_key_rotated_at = NOW(), updated_at = NOW()
        WHERE account_id = $3
        RETURNING account_id
      `, [apiKeyHash, apiKeyLast4, targetId]);
      if (!res.rows[0]) return null;
      return { account_id: targetId, api_key_plaintext: plainApiKey };
    },
    async revokeAccountApiKeyV2(accountId) {
      const targetId = String(accountId || "").trim();
      if (!targetId) return { ok: false, error: "account_id is required" };
      const res = await pool.query(`
        UPDATE accounts
        SET api_key_hash = NULL, api_key_last4 = NULL, api_key_rotated_at = NOW(), updated_at = NOW()
        WHERE account_id = $1
      `, [targetId]);
      if ((res.rowCount || 0) === 0) return { ok: false, error: "account not found" };
      return { ok: true, account_id: targetId };
    },
    async updateAccountApiKeyV2(accountId, plainApiKey) {
      const targetId = String(accountId || "").trim();
      const plain = String(plainApiKey || "").trim();
      if (!targetId || !plain) return null;
      const apiKeyHash = hashApiKey(plain);
      const apiKeyLast4 = plain.slice(-4);
      const res = await pool.query(`
        UPDATE accounts
        SET api_key_hash = $1, api_key_last4 = $2, api_key_rotated_at = NOW(), updated_at = NOW()
        WHERE account_id = $3
        RETURNING account_id
      `, [apiKeyHash, apiKeyLast4, targetId]);
      return res.rowCount > 0 ? { account_id: targetId, api_key_last4: apiKeyLast4 } : null;
    },
    async getAccountSubscriptionsV2(accountId) {
      const targetId = String(accountId || "").trim();
      if (!targetId) return [];
      const res = await pool.query(`SELECT source_ids_cache FROM accounts WHERE account_id = $1 LIMIT 1`, [targetId]);
      const cache = res.rows?.[0]?.source_ids_cache;
      const arr = Array.isArray(cache) ? cache : [];
      return arr.map((sourceId) => ({ source_id: String(sourceId || ""), is_active: true })).filter((x) => x.source_id);
    },
    async replaceAccountSubscriptionsV2(accountId, items = []) {
      const targetId = String(accountId || "").trim();
      if (!targetId) return { ok: false, error: "account_id is required" };
      const sourceIds = (Array.isArray(items) ? items : [])
        .filter((x) => x && x.is_active !== false)
        .map((x) => String(x.source_id || "").trim())
        .filter(Boolean);
      await pool.query(`UPDATE accounts SET source_ids_cache = $1::jsonb, updated_at = NOW() WHERE account_id = $2`, [JSON.stringify(sourceIds), targetId]);
      return { ok: true };
    },
    async listTables() {
      return ['users', 'accounts', 'signals', 'trades', 'logs'];
    },
    async listTableRows(table, limit = 50, offset = 0, query = "") {
      const allowed = await this.listTables();
      if (!allowed.includes(table)) throw new Error(`Access denied to table: ${table}`);
      let where = "";
      const params = [limit, offset];
      if (query) {
        params.push(`%${query}%`);
        if (table === 'signals' || table === 'trades') {
          where = `WHERE symbol ILIKE $3 OR signal_id ILIKE $3 OR trade_id ILIKE $3`;
        } else if (table === 'users' || table === 'accounts') {
          where = `WHERE user_id ILIKE $3 OR account_id ILIKE $3`;
        } else if (table === 'logs') {
          where = `WHERE object_id ILIKE $3 OR metadata::text ILIKE $3`;
        }
      }
      const res = await pool.query(`SELECT * FROM ${table} ${where} ORDER BY 1 DESC LIMIT $1 OFFSET $2`, params);
      const totalRes = await pool.query(`SELECT COUNT(*) FROM ${table} ${where}`, query ? [params[2]] : []);
      return { rows: res.rows, total: parseInt(totalRes.rows[0].count) };
    },
    async getAccountByIdV2(accountId) {
      const res = await pool.query(`SELECT * FROM accounts WHERE account_id = $1 LIMIT 1`, [accountId]);
      return res.rows[0] || null;
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
    async pruneOldSignals(days) {
      const res = await pool.query(`
        WITH signals_del AS (DELETE FROM signals WHERE created_at < NOW() - $1 * INTERVAL '1 day' RETURNING signal_id),
             trades_del AS (DELETE FROM trades WHERE created_at < NOW() - $1 * INTERVAL '1 day' RETURNING trade_id),
             logs_del AS (DELETE FROM logs WHERE created_at < NOW() - $1 * INTERVAL '1 day' RETURNING object_id)
        SELECT (SELECT COUNT(*) FROM signals_del) as signals_count,
               (SELECT COUNT(*) FROM trades_del) as trades_count,
               (SELECT COUNT(*) FROM logs_del) as logs_count
      `, [days]);
      const counts = res.rows[0];
      return { 
        removed: parseInt(counts.signals_count) + parseInt(counts.trades_count), 
        logs_removed: parseInt(counts.logs_count),
        remaining: 0 
      };
    },
    async listActiveSignals() {
      const res = await pool.query(`
        SELECT * FROM signals 
        WHERE status IN ('NEW', 'LOCKED', 'PLACED', 'START') 
        ORDER BY created_at DESC
      `);
      return res.rows || [];
    },
    async bulkAckSignals(updates) {
      let count = 0;
      for (const u of updates) {
        const res = await pool.query(`
          UPDATE signals 
          SET status = $1, ack_status = $2, ack_ticket = $3, pnl_money_realized = $4, updated_at = NOW() 
          WHERE signal_id = $5
        `, [u.status, u.status, u.ticket, u.pnl, u.signal_id]);
        count += res.rowCount;
      }
      return { updated: count };
    },
    async deleteSignalsByIds(ids) {
      const res = await pool.query(`DELETE FROM signals WHERE signal_id = ANY($1)`, [ids]);
      return { deleted: res.rowCount };
    },
    async cancelSignalsByIds(ids) {
      const res = await pool.query(`UPDATE signals SET status = 'CANCEL', updated_at = NOW() WHERE signal_id = ANY($1) RETURNING signal_id`, [ids]);
      return { updated: res.rowCount, updated_ids: res.rows.map(r => r.signal_id) };
    },
    async renewSignalsByIds(signalIds) {
      const ids = Array.isArray(signalIds) ? signalIds.map(s => String(s || "")).filter(Boolean) : [];
      if (!ids.length) return { updated: 0, updated_ids: [] };
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const selected = await client.query(`SELECT * FROM signals WHERE signal_id = ANY($1) FOR UPDATE`, [ids]);
        const updatedIds = [];
        for (const row of (selected.rows || [])) {
          const oldId = String(row.signal_id || "");
          const cur = mt5CanonicalStoredStatus(row.status);
          if (cur === "NEW" || cur === "LOCKED") continue;
          
          const base = mt5RenewSignalIdBase(oldId);
          const existingRows = await client.query(`SELECT signal_id FROM signals WHERE signal_id = $1 OR signal_id LIKE $2`, [base, `${base}.%`]);
          const renewedId = mt5RenewSignalIdFromExisting(base, (existingRows.rows || []).map(r => String(r.signal_id || "")));
          
          const ins = await client.query(`
            INSERT INTO signals (
              signal_id, created_at, user_id, source, source_id, side, symbol, entry_model, sl, tp,
              signal_tf, chart_tf, rr_planned, note, raw_json, status
            )
            VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'NEW')
            ON CONFLICT DO NOTHING
          `, [
            renewedId, row.user_id, row.source, row.source_id, row.side || row.action, row.symbol,
            row.entry_model || row.raw_json?.entry_model || null,
            row.sl, row.tp, row.signal_tf, row.chart_tf, row.rr_planned, row.note, row.raw_json
          ]);
          
          if ((ins.rowCount || 0) > 0) {
            await client.query(`DELETE FROM signals WHERE signal_id = $1`, [oldId]);
            updatedIds.push(renewedId);
          }
        }
        await client.query("COMMIT");
        return { updated: updatedIds.length, updated_ids: updatedIds };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
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

function mt5SlugId(input, fallback = "default") {
  const raw = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return raw || fallback;
}

function mt5MapActionToSide(action) {
  const a = String(action || "").trim().toUpperCase();
  if (a === "BUY" || a === "LONG") return "BUY";
  if (a === "SELL" || a === "SHORT") return "SELL";
  return a || "BUY";
}

function mt5NormalizeBrokerTicket(item = {}) {
  const candidates = [
    item.broker_trade_id,
    item.brokerTradeId,
    item.trade_id,
    item.tradeId,
    item.ticket,
    item.position_id,
    item.positionId,
    item.order_id,
    item.orderId,
    item.id,
  ];
  for (const c of candidates) {
    const v = String(c || "").trim();
    if (v) return v;
  }
  return "";
}

function mt5NormalizeExecutionStatusV2(value) {
  const s = String(value || "").trim().toUpperCase();
  if (s === "CANCEL" || s === "CANCELED" || s === "CANCELLED") return "CANCELLED";
  if (s === "PENDING" || s === "OPEN" || s === "CLOSED" || s === "REJECTED" || s === "CANCELLED") return s;
  return "OPEN";
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
  const sourceId = mt5SlugId(source, "tradingview");

  const action = mt5NormalizeAction(payload);
  const symbol = mt5NormalizeSymbol(payload);
  const volume = mt5NormalizeVolume(payload);
  const orderType = mt5NormalizeOrderType(payload);
  const signalId = mt5GenerateId("SIG");
  const userId = envStr(payload.user_id ?? payload.userId ?? payload.user ?? CFG.mt5DefaultUserId, CFG.mt5DefaultUserId);
  const rrPlanned = asNum(payload.rr ?? payload.risk_reward, NaN);
  const riskMoneyPlanned = asNum(payload.risk_money ?? payload.money_risk ?? payload.riskMoney, NaN);
  const signalTf = mt5TfToMinutes(payload.signal_tf ?? payload.signalTf ?? payload.sourceTf ?? payload.timeframe ?? payload.tf);
  const chartTf = mt5TfToMinutes(payload.chart_tf ?? payload.chartTf ?? payload.chartTimeframe ?? payload.chart_tf_period);
  const entryModel = String(payload.entry_model ?? payload.entryModel ?? payload.model ?? payload.strategy ?? source ?? "").trim();
  const note = mt5BuildNote(payload);

  const plannedEntry = asNum(payload.entry ?? payload.price, NaN);
  const rawJson = payload.raw_json || payload;
  let rawJsonNormalized = {
    ...rawJson,
    order_type: orderType,
    entry_model: entryModel || String(rawJson.entry_model ?? rawJson.entryModel ?? ""),
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
    source_id: sourceId,
    symbol,
    side: mt5MapActionToSide(action),
    entry_model: entryModel || null,
    sl: payload.sl ?? null,
    tp: payload.tp ?? null,
    rr_planned: Number.isFinite(rrPlanned) ? rrPlanned : null,
    signal_tf: signalTf || null,
    chart_tf: chartTf || null,
    note,
    raw_json: rawJsonNormalized,
    status: "NEW",

  });

  if (upsertResult?.inserted) {
    // Sanitize event payload — never persist API keys to signal_events.
    const sanitizedPayload = { ...(payload.raw_json || payload) };
    delete sanitizedPayload.apiKey;
    delete sanitizedPayload.api_key;
    delete sanitizedPayload.password;
    delete sanitizedPayload.token;
    await mt5Log(signalId, "signals", { event_type: eventType, data: sanitizedPayload }, userId);


    if (CFG.mt5V2DualWriteEnabled) {
      const sourceId = mt5SlugId(source, "tradingview");
      try {
        await mt5UpsertSourceV2({
          source_id: sourceId,
          name: source,
          kind: sourceId.includes("tv") ? "tv" : "api",
          auth_mode: "token",
          is_active: true,
          metadata: {
            migrated_from: "legacy_signal_ingest",
            signal_source: source,
          },
        });
        const fanout = await mt5FanoutSignalTradeV2({
          signal_id: signalId,
          source_id: sourceId,
          user_id: userId,
          entry_model: String(payload.entry_model ?? payload.entryModel ?? "") || null,
          signal_tf: signalTf || null,
          chart_tf: chartTf || null,
          symbol,
          action: mt5MapActionToSide(action),
          entry: Number.isFinite(plannedEntry) && plannedEntry > 0 ? plannedEntry : null,
          sl: payload.sl ?? null,
          tp: payload.tp ?? null,
          volume: volume ?? null,
          note: note || null,
          metadata: {
            event_type: eventType,
            order_type: orderType,
            signal_tf: signalTf || null,
            chart_tf: chartTf || null,
            provider: payload.provider || null,
          },
        });
        await mt5Log(signalId, "signals", { 
          event: "FANOUT_COMPLETED", 
          trades_created: fanout?.created || 0,
          account_ids: fanout?.account_ids || []
        }, userId);
      } catch (error) {
        await mt5Log(signalId, "signals", { 
          event: "FANOUT_FAILED", 
          error: error instanceof Error ? error.message : String(error)
        }, userId);
      }
    }
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
  try {
    const b = await mt5Backend();
    const userId = payload.user_id || payload.created_by || CFG.mt5DefaultUserId;
    await b.log(signalId, 'signals', { ...payload, event_type: eventType }, userId);
  } catch (err) {
    console.error(`[SIG_EVENT_FAIL] ${signalId} ${eventType}:`, err.message);
  }
}

async function mt5UpsertSourceV2(source) {
  const b = await mt5Backend();
  if (!b.upsertSourceV2) return null;
  return b.upsertSourceV2(source);
}

async function mt5FanoutSignalTradeV2(payload) {
  const b = await mt5Backend();
  if (!b.fanoutSignalTradeV2) return { created: 0, account_ids: [] };
  return b.fanoutSignalTradeV2(payload);
}

async function mt5FindAccountByApiKeyHash(apiKeyHash) {
  const b = await mt5Backend();
  if (!b.findAccountByApiKeyHash) return null;
  return b.findAccountByApiKeyHash(apiKeyHash);
}

async function mt5PullLeasedTradesV2(accountId, maxItems = 1, leaseSeconds = 30) {
  const b = await mt5Backend();
  if (!b.pullLeasedTradesV2) return [];
  return b.pullLeasedTradesV2(accountId, maxItems, leaseSeconds);
}

async function mt5AckTradeV2(accountId, payload) {
  const b = await mt5Backend();
  if (!b.ackTradeV2) return { ok: false, error: "not supported" };
  return b.ackTradeV2(accountId, payload);
}

async function mt5RotateAccountApiKeyV2(accountId) {
  const b = await mt5Backend();
  if (!b.rotateAccountApiKeyV2) return null;
  return b.rotateAccountApiKeyV2(accountId);
}

async function mt5RevokeAccountApiKeyV2(accountId) {
  const b = await mt5Backend();
  if (!b.revokeAccountApiKeyV2) return { ok: false, error: "not supported" };
  return b.revokeAccountApiKeyV2(accountId);
}

async function mt5BrokerSyncV2(accountId, payload) {
  const b = await mt5Backend();
  if (!b.brokerSyncV2) return { ok: false, error: "not supported" };
  return b.brokerSyncV2(accountId, payload);
}

async function mt5CreateBrokerTradeV2(accountId, payload) {
  const b = await mt5Backend();
  if (!b.createBrokerTradeV2) return { ok: false, error: "not supported" };
  return b.createBrokerTradeV2(accountId, payload);
}

async function mt5BrokerHeartbeatV2(accountId, payload) {
  const b = await mt5Backend();
  if (!b.brokerHeartbeatV2) return { ok: false, error: "not supported" };
  return b.brokerHeartbeatV2(accountId, payload);
}

async function mt5CreateAccountV2(payload = {}) {
  const b = await mt5Backend();
  if (!b.createAccountV2) return { ok: false, error: "not supported" };
  return b.createAccountV2(payload);
}

async function mt5UpdateAccountV2(accountId, patch = {}) {
  const b = await mt5Backend();
  if (!b.updateAccountV2) return { ok: false, error: "not supported" };
  return b.updateAccountV2(accountId, patch);
}

async function mt5ArchiveAccountV2(accountId) {
  const b = await mt5Backend();
  if (!b.archiveAccountV2) return { ok: false, error: "not supported" };
  return b.archiveAccountV2(accountId);
}

async function mt5ListSourcesV2() {
  const b = await mt5Backend();
  if (b.listSourcesV2) return b.listSourcesV2();
  const rows = await b.listLogs({ object_table: "sources" }, 100);
  return rows
    .map((r) => ({ ...r.metadata, source_id: r.object_id }))
    .filter((r) => String(r.source_id || "").trim());
}

async function mt5GetSourceByIdV2(sourceId) {
  const b = await mt5Backend();
  if (!b.getSourceByIdV2) return null;
  return b.getSourceByIdV2(sourceId);
}

async function mt5ListSourceEventsV2(sourceId, limit = 100) {
  const b = await mt5Backend();
  return b.listLogs({ object_table: "sources", object_id: sourceId }, limit);
}

async function mt5ListTradesV2(filters = {}, page = 1, pageSize = 50) {
  const b = await mt5Backend();
  if (!b.listTradesV2) return { items: [], total: 0, page: 1, page_size: Math.max(1, Number(pageSize) || 50) };
  return b.listTradesV2(filters, page, pageSize);
}

async function mt5BulkActionTradesV2(action, filters = {}) {
  const b = await mt5Backend();
  if (!b.bulkActionTradesV2) return { ok: false, error: "not supported" };
  return b.bulkActionTradesV2(action, filters);
}

async function mt5ListTradeEventsV2(tradeId, limit = 200) {
  const b = await mt5Backend();
  return b.listLogs({ object_id: tradeId }, limit);
}

async function mt5ListAccountsV2(userId = null) {
  const b = await mt5Backend();
  if (!b.listAccountsV2) return [];
  return b.listAccountsV2(userId);
}

async function mt5ListExecutionProfilesV2(userId = null) {
  const b = await mt5Backend();
  if (!b.listExecutionProfilesV2) return [];
  return b.listExecutionProfilesV2(userId);
}

async function mt5GetActiveExecutionProfileV2(userId = null) {
  const b = await mt5Backend();
  if (!b.getActiveExecutionProfileV2) return null;
  return b.getActiveExecutionProfileV2(userId);
}

async function mt5SaveExecutionProfileV2(payload = {}) {
  const b = await mt5Backend();
  if (!b.saveExecutionProfileV2) return { ok: false, error: "not supported" };
  return b.saveExecutionProfileV2(payload);
}

async function mt5RotateSourceSecretV2(sourceId) {
  const b = await mt5Backend();
  if (!b.rotateSourceSecretV2) return null;
  return b.rotateSourceSecretV2(sourceId);
}

async function mt5RevokeSourceSecretV2(sourceId) {
  const b = await mt5Backend();
  if (!b.revokeSourceSecretV2) return { ok: false, error: "not supported" };
  return b.revokeSourceSecretV2(sourceId);
}

async function mt5GetAccountSubscriptionsV2(accountId) {
  const b = await mt5Backend();
  if (!b.getAccountSubscriptionsV2) return [];
  return b.getAccountSubscriptionsV2(accountId);
}

async function mt5ReplaceAccountSubscriptionsV2(accountId, items = []) {
  const b = await mt5Backend();
  if (!b.replaceAccountSubscriptionsV2) return { ok: false, error: "not supported" };
  return b.replaceAccountSubscriptionsV2(accountId, items);
}

async function mt5ListSignalEvents(signalId, limit = 200) {
  const b = await mt5Backend();
  return b.listLogs({ object_id: signalId }, limit);
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
    // Prefer closed_at for trades PnL accuracy, fallback to created_at
    const tRaw = r.closed_at || r.ack_at || r.created_at;
    const t = mt5ToMs(tRaw);
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
  const pnl = Number(row?.pnl_realized ?? row?.pnl_money_realized);
  const risk = Number(row?.risk_money_planned);
  if (Number.isFinite(pnl)) {
    if (Number.isFinite(risk) && risk > 0) return pnl / risk;
    const s = mt5CanonicalStoredStatus(row?.execution_status || row?.status || row?.close_reason);
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
    const status = mt5CanonicalStoredStatus(row.execution_status || row.status || row.close_reason);
    const rr = mt5ComputeRMultiple(row);
    const pnl = Number(row?.pnl_realized ?? row?.pnl_money_realized);
    const closeReason = String(row?.close_reason || "").toUpperCase();
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
    if (status === "TP" || closeReason === "TP") st.wins++;
    else if (status === "SL" || closeReason === "SL") st.losses++;
    else if (Number.isFinite(pnl) && pnl > 0) st.wins++;
    else if (Number.isFinite(pnl) && pnl < 0) st.losses++;
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
  return envStr(raw.entry_model || raw.entryModel || raw.model || raw.strategy || row?.source_id || row?.source || "manual");
}

function mt5StrategyFromRow(row) {
  const sourceId = envStr(row?.source_id || row?.source);
  if (sourceId) return sourceId;
  const raw = row?.raw_json || {};
  return envStr(raw.source || raw.source_id || raw.strategy || raw.model || raw.entry_model || raw.entryModel);
}

function mt5ComputeTradeMetrics(rows) {
  const all = Array.isArray(rows) ? rows : [];
  // Support both legacy signal status and v2 execution_status
  const trades = all.filter((r) => {
    const s = mt5CanonicalStoredStatus(r.execution_status || r.status || r.close_reason);
    if (mt5IsTradeStatus(s)) return true;
    return ["PENDING", "OPEN", "CLOSED", "REJECTED", "CANCEL", "CANCELLED"].includes(s);
  });
  
  const wins = trades.filter((r) => {
    const s = mt5CanonicalStoredStatus(r.execution_status || r.status || r.close_reason);
    const res = String(r.close_reason || "").toUpperCase();
    if (s === "TP" || res === "TP") return true;
    const pnl = Number(r?.pnl_realized ?? r?.pnl_money_realized);
    return Number.isFinite(pnl) && pnl > 0;
  }).length;
  
  const losses = trades.filter((r) => {
    const s = mt5CanonicalStoredStatus(r.execution_status || r.status || r.close_reason);
    const res = String(r.close_reason || "").toUpperCase();
    if (s === "SL" || res === "SL") return true;
    const pnl = Number(r?.pnl_realized ?? r?.pnl_money_realized);
    return Number.isFinite(pnl) && pnl < 0;
  }).length;
  
  const rrRows = trades.filter((r) => {
    const s = mt5CanonicalStoredStatus(r.execution_status || r.status || r.close_reason);
    const res = String(r.close_reason || "").toUpperCase();
    return s === "TP" || s === "SL" || res === "TP" || res === "SL";
  });

  const winBase = wins + losses; 
  let totalPnl = 0;
  let buyPnl = 0;
  let sellPnl = 0;
  let winSumPnl = 0;
  let loseSumPnl = 0;
  let countPending = 0;
  let countFilled = 0;
  let countClosed = 0;
  
  for (const r of all) {
    const s = mt5CanonicalStoredStatus(r.execution_status || r.status || r.close_reason);
    if (s === "PENDING") countPending++;
    else if (s === "FILLED") countFilled++;
    else if (s === "PLACED" || s === "CLOSED") countClosed++;
  }

  for (const r of trades) {
    const pnl = Number(r?.pnl_realized ?? r?.pnl_money_realized ?? 0);
    if (Number.isFinite(pnl)) {
      totalPnl += pnl;
      if (pnl > 0) winSumPnl += pnl;
      else if (pnl < 0) loseSumPnl += pnl;
    }
  }

  const totalRr = rrRows.reduce((acc, r) => {
    // Map V2 fields for R computation if needed
    const mapped = {
      ...r,
      price: r.entry ?? r.intent_entry ?? r.price,
      sl: r.sl ?? r.intent_sl ?? null,
      tp: r.tp ?? r.intent_tp ?? null,
      pnl_money_realized: r.pnl_realized ?? r.pnl_money_realized
    };
    const rr = mt5ComputeRMultiple(mapped);
    return Number.isFinite(rr) ? acc + rr : acc;
  }, 0);
  
  return {
    total_signals: all.length,
    total_trades: trades.length,
    wins,
    losses,
    win_rate: winBase > 0 ? (wins / winBase) * 100 : 0,
    total_pnl: totalPnl,
    buy_pnl: buyPnl,
    sell_pnl: sellPnl,
    win_sum_pnl: winSumPnl,
    lose_sum_pnl: loseSumPnl,
    total_rr: totalRr,
    count_pending: countPending,
    count_filled: countFilled,
    count_closed: countClosed,
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

async function requireV2BrokerAccount(req, res, urlObj, payload = null) {
  const { key } = resolveEaApiKey(req, payload, urlObj);
  if (!key) {
    json(res, 401, { ok: false, error: "missing api key" });
    return null;
  }
  const account = await mt5FindAccountByApiKeyHash(hashApiKey(key));
  if (account === null) {
    const b = await mt5Backend();
    if (!b.findAccountByApiKeyHash) {
      json(res, 400, { ok: false, error: "v2 broker auth not supported by backend" });
      return null;
    }
  }
  if (!account) {
    json(res, 401, { ok: false, error: "invalid account api key" });
    return null;
  }
  return account;
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

/**
 * Returns the effective user_id for UI requests.
 * If user is not an admin, always returns their session user_id.
 * If user is admin, returns the requested user_id from query/payload if any.
 */
function uiEffectiveUserId(req, urlObj = null, payload = null) {
  const sess = getUiSessionFromReq(req);
  if (!sess.ok) return null;
  if (isSystemRole(sess.role)) {
    // Admins can see specific users if requested
    const target = (payload?.user_id ?? urlObj?.searchParams?.get("user_id") ?? "").trim();
    return target || null;
  }
  return sess.user_id;
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
    entry_model: signal.entry_model || signal.raw?.entry_model || signal.raw?.entryModel || signal.strategy || null,
    timeframe: signal.timeframe || null,
    sourceTf: signal.raw?.sourceTf ?? signal.raw?.signal_tf ?? signal.timeframe ?? null,
    chartTf: signal.raw?.chartTf ?? signal.raw?.chart_tf ?? signal.raw?.chartTimeframe ?? signal.raw?.chart_tf_period ?? null,
    note: signal.note || "",
    user_id: signal.user_id || CFG.mt5DefaultUserId,
    order_type: signal.raw?.order_type ?? signal.raw?.orderType ?? "limit",
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

  if (req.method === "POST" && /^\/v2\/broker\/accounts\/[^/]+\/apiKey$/.test(incomingUrl.pathname)) {
    try {
      const accountId = decodeURIComponent(incomingUrl.pathname.split("/")[4]);
      const body = await readJson(req);
      const out = await (await mt5Backend()).updateAccountApiKeyV2(accountId, body.api_key_plaintext);
      if (!out) return json(res, 404, { ok: false, error: "Account not found" });
      return json(res, 200, { ok: true, ...out });
    } catch (e) { return json(res, 400, { ok: false, error: e.message }); }
  }

  if (req.method === "DELETE" && /^\/v2\/broker\/accounts\/[^/]+\/apiKey$/.test(incomingUrl.pathname)) {
    try {
      const accountId = decodeURIComponent(incomingUrl.pathname.split("/")[4]);
      const out = await (await mt5Backend()).updateAccountApiKeyV2(accountId, null);
      if (!out) return json(res, 404, { ok: false, error: "Account not found" });
      return json(res, 200, { ok: true, ...out });
    } catch (e) { return json(res, 400, { ok: false, error: e.message }); }
  }

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
    return json(res, 410, { ok: false, error: "User API key endpoints are removed. Use account API key rotation." });
  }

  if (req.method === "PUT" && /^\/auth\/users\/[^/]+\/api-keys\/[^/]+$/.test(url.pathname)) {
    return json(res, 410, { ok: false, error: "User API key endpoints are removed. Use account API key rotation." });
  }

  if (req.method === "DELETE" && /^\/auth\/users\/[^/]+\/api-keys\/[^/]+$/.test(url.pathname)) {
    return json(res, 410, { ok: false, error: "User API key endpoints are removed. Use account API key rotation." });
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
        storage: "postgres",
        hasTvApiKeys: CFG.mt5TvAlertApiKeys.size > 0,
        hasEaApiKeys: CFG.mt5EaApiKeys.size > 0,
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
      const userId = uiEffectiveUserId(req, url);
      const rows = await mt5ListSignals(limit, "", userId);
      
      const metrics = mt5ComputeMetrics(rows);
      return json(res, 200, {
        ok: true,
        version: SERVER_VERSION,
        user_id: userId || null,
        metrics,
        benefit: {
          today: mt5ComputeMetrics(mt5FilterRows(rows, { from: mt5PeriodRange("today").start })).pnl_money_realized,
          week: mt5ComputeMetrics(mt5FilterRows(rows, { from: mt5PeriodRange("week").start })).pnl_money_realized,
          month: mt5ComputeMetrics(mt5FilterRows(rows, { from: mt5PeriodRange("month").start })).pnl_money_realized,
        },
        status_counts: mt5CountBy(rows, (r) => mt5CanonicalStoredStatus(r.status)),
        action_counts: mt5CountBy(rows, (r) => String(r.action || "").toUpperCase()),
        order_type_counts: mt5CountBy(rows, (r) => String(r.raw_json?.order_type || "limit").toUpperCase()),
        top_symbols: mt5CountBy(rows, (r) => String(r.symbol || "").toUpperCase(), { limit: 10 }),
        latest_unprocessed: rows.filter(r => ["NEW", "LOCKED"].includes(r.status)).slice(0, 20).map(mt5PublicState),
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
      const limitRaw = Number(url.searchParams.get("limit") || 100000);
      const limit = Math.max(500, Math.min(200000, Number.isFinite(limitRaw) ? limitRaw : 100000));
      const userId = uiEffectiveUserId(req, url);
      const accountId = envStr(url.searchParams.get("account_id"));
      const symbol = envStr(url.searchParams.get("symbol")).toUpperCase();
      const sourceId = envStr(url.searchParams.get("source_id") || url.searchParams.get("source") || url.searchParams.get("strategy"));
      const model = envStr(url.searchParams.get("entry_model") || url.searchParams.get("model"));
      const chartTf = envStr(url.searchParams.get("chart_tf") || url.searchParams.get("chartTf"));
      const signalTf = envStr(url.searchParams.get("signal_tf") || url.searchParams.get("timeframe"));
      const direction = envStr(url.searchParams.get("direction")).toUpperCase();
      const range = envStr(url.searchParams.get("range"), "all").toLowerCase();

      // Use V2 trades ledger for authoritative dashboard stats
      const tradesRes = await mt5ListTradesV2({ 
        user_id: userId,
        account_id: accountId,
        symbol: symbol,
        source_id: sourceId,
        side: direction === "BUY" ? "BUY" : (direction === "SELL" ? "SELL" : "")
      }, 1, limit);
      
      const allRows = tradesRes.items || [];
      const rowsByDimension = allRows.filter((r) => {
        const m = r.metadata || {};
        const rowModel = String(r.entry_model || r.metadata?.entry_model || "");
        if (model && rowModel !== model) return false;
        const rowChartTf = String(r.chart_tf || r.metadata?.chart_tf || "");
        if (chartTf && rowChartTf !== chartTf) return false;
        const rowSignalTf = String(r.signal_tf || r.metadata?.signal_tf || "");
        if (signalTf && rowSignalTf !== signalTf) return false;
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
        // Use unified PnL field (pnl_realized for trades, pnl_money_realized for signals)
        const pnl = Number(r.pnl_realized ?? r.pnl_money_realized);
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
      const accounts = [...new Set(allRows.map((r) => envStr(r.account_id)).filter(Boolean))].sort();

      const accountsSummary = await mt5ListAccountsV2(userId);

      return json(res, 200, {
        ok: true,
        version: SERVER_VERSION,
        accounts_summary: accountsSummary || [],
        filters: {
          user_id: userId || "",
          symbol,
          source: sourceId,
          entry_model: model,
          chart_tf: chartTf,
          signal_tf: signalTf,
          direction,
          range,
          accounts,
          symbols,
          sources: [...new Set(allRows.map(r => mt5StrategyFromRow(r)).filter(Boolean))].sort(),
          entry_models: [...new Set(allRows.map(r => mt5EntryModelFromRow(r)).filter(Boolean))].sort(),
          chart_tfs: [...new Set(allRows.map(r => String(r.chart_tf || r.raw_json?.chart_tf || r.raw_json?.chartTf || r.raw_json?.chartTimeframe || r.signal_tf || r.raw_json?.signal_tf || r.raw_json?.sourceTf || r.raw_json?.timeframe || "")).filter(Boolean))].sort(),
          signal_tfs: [...new Set(allRows.map(r => String(r.signal_tf || r.raw_json?.signal_tf || r.raw_json?.sourceTf || r.raw_json?.timeframe || "")).filter(Boolean))].sort(),
        },
        metrics: mt5ComputeTradeMetrics(selectedRows),
        period_totals: periodTotals,
        top_winrate: {
          symbols: mt5ComputeTopWinrateRows(selectedRows, (r) => String(r.symbol || "").toUpperCase(), { limit: 100, includeDirection: false }),
          entry_models: mt5ComputeTopWinrateRows(selectedRows, (r) => mt5EntryModelFromRow(r), { limit: 100, includeDirection: false }),
          accounts: mt5ComputeTopWinrateRows(selectedRows, (r) => envStr(r.account_id), { limit: 100, includeDirection: false }),
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
      const userId = uiEffectiveUserId(req, url);
      const range = mt5PeriodRange(period);
      const rows = await mt5ListSignals(limit, "", userId);
      const filtered = mt5FilterRows(rows, { from: range.start, to: range.end });
      const bucket = period === "today" ? "hour" : "day";
      const map = new Map();
      for (const r of filtered) {
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
      const userId = uiEffectiveUserId(req, url);
      const limitRaw = Number(url.searchParams.get("limit") || 20000);
      const limit = Math.max(1000, Math.min(100000, Number.isFinite(limitRaw) ? limitRaw : 20000));
      const rows = await mt5ListSignals(limit, "", userId);
      const symbols = [...new Set(rows.map((r) => String(r.symbol || "").toUpperCase()))].filter(Boolean).sort();
      const sources = [...new Set(rows.map((r) => mt5StrategyFromRow(r)))].filter(Boolean).sort();
      const models = [...new Set(rows.map((r) => mt5EntryModelFromRow(r)))].filter(Boolean).sort();
      const chartTfs = [...new Set(rows.map((r) => String(r.chart_tf || r.raw_json?.chart_tf || r.raw_json?.chartTf || r.raw_json?.chartTimeframe || r.signal_tf || r.raw_json?.signal_tf || r.raw_json?.sourceTf || r.raw_json?.timeframe || "")))].filter(Boolean).sort();
      const signalTfs = [...new Set(rows.map((r) => String(r.signal_tf || r.raw_json?.signal_tf || r.raw_json?.sourceTf || r.raw_json?.timeframe || "")))].filter(Boolean).sort();
      return json(res, 200, { ok: true, symbols, sources, entry_models: models, chart_tfs: chartTfs, signal_tfs: signalTfs });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/filters/symbols") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const limitRaw = Number(url.searchParams.get("limit") || 10000);
      const limit = Math.max(100, Math.min(50000, Number.isFinite(limitRaw) ? limitRaw : 10000));
      const userId = uiEffectiveUserId(req, url);
      const rows = await mt5ListSignals(limit, "", userId);
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
        return json(res, 410, { ok: false, error: "user_api_keys is removed. Use accounts api-key rotation." });
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
    const sess = getUiSessionFromReq(req);
    const userId = sess.ok ? sess.user_id : (url.searchParams.get("user_id") || null);

    try {
      const limitRaw = Number(url.searchParams.get("limit") || 200);
      const limit = Math.max(1, Math.min(5000, Number.isFinite(limitRaw) ? limitRaw : 200));
      const offsetRaw = Number(url.searchParams.get("offset") || 0);
      const offset = Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0);
      const q = String(url.searchParams.get("q") || "").trim().toLowerCase();
      const typeFilter = String(url.searchParams.get("type") || "").trim().toLowerCase();
      const symbolFilter = String(url.searchParams.get("symbol") || "").trim().toUpperCase();
      const range = String(url.searchParams.get("range") || "all").trim().toLowerCase();
      const { start: rangeStart, end: rangeEnd } = mt5PeriodRange(range);
      const hasExtraFilter = Boolean(q || typeFilter || symbolFilter || (range && range !== "all"));

      const b = await mt5Backend();
      const fetchLimit = hasExtraFilter ? Math.max(limit + offset, 5000) : limit;
      const fetchOffset = hasExtraFilter ? 0 : offset;
      const rows = await b.listLogs({ user_id: userId }, fetchLimit, fetchOffset);
      let events = (rows || []).map((r) => {
        const payload = r?.metadata && typeof r.metadata === "object" ? r.metadata : {};
        const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
        const symbol = String(data?.symbol || payload?.symbol || "").trim();
        const eventType = String(payload.event_type || payload.event || "").trim() || String(r.object_table || "LOG");
        const eventTime = String(r.created_at || "");
        const signalId = String(r.object_id || "");
        const ackTicket = String(data?.ticket || payload?.ticket || data?.ack_ticket || payload?.ack_ticket || "");
        return {
          id: Number(r.log_id || 0),
          event_time: eventTime,
          event_type: eventType,
          signal_id: signalId,
          ack_ticket: ackTicket,
          symbol: symbol || "N/A",
          payload_json: payload,
        };
      });
      if (hasExtraFilter) {
        events = events.filter((ev) => {
          if (symbolFilter && String(ev.symbol || "").toUpperCase() !== symbolFilter) return false;
          if (typeFilter && !String(ev.event_type || "").toLowerCase().includes(typeFilter)) return false;
          if (rangeStart || rangeEnd) {
            const ts = mt5ToMs(ev.event_time);
            if (!Number.isFinite(ts)) return false;
            if (rangeStart && ts < mt5ToMs(rangeStart)) return false;
            if (rangeEnd && ts > mt5ToMs(rangeEnd)) return false;
          }
          if (q) {
            const haystack = [
              ev.signal_id,
              ev.ack_ticket,
              ev.symbol,
              ev.event_type,
              JSON.stringify(ev.payload_json || {}),
            ].join(" ").toLowerCase();
            if (!haystack.includes(q)) return false;
          }
          return true;
        });
        events = events.slice(offset, offset + limit);
      }
      return json(res, 200, { ok: true, events });
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
      const signalId = String(payload.signal_id || payload.object_id || "").trim() || `ui_note_${Date.now()}`;
      const eventType = String(payload.event_type || "").trim();
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


  if (req.method === "GET" && url.pathname === "/v2/accounts") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const userId = uiEffectiveUserId(req, url);
      const items = await mt5ListAccountsV2(userId);
      return json(res, 200, { ok: true, items });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/v2/accounts") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const accountId = String(payload?.account_id || "").trim();
      if (!accountId) return json(res, 400, { ok: false, error: "account_id is required" });
      const out = await mt5CreateAccountV2({
        account_id: accountId,
        user_id: String(payload?.user_id || CFG.mt5DefaultUserId),
        name: String(payload?.name || accountId),
        balance: payload?.balance,
        status: String(payload?.status || "ACTIVE"),
        metadata: payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
      });
      if (!out?.ok) return json(res, 400, { ok: false, error: out?.error || "failed to create account" });
      const rows = await mt5ListAccountsV2();
      return json(res, 200, {
        ok: true,
        item: out.item || null,
        api_key_plaintext: out.api_key_plaintext || null,
        items: rows,
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "PUT" && /^\/v2\/accounts\/[^/]+$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const m = url.pathname.match(/^\/v2\/accounts\/([^/]+)$/);
      const accountId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!accountId) return json(res, 400, { ok: false, error: "account_id is required" });
      const out = await mt5UpdateAccountV2(accountId, payload || {});
      if (!out?.ok) return json(res, 400, { ok: false, error: out?.error || "failed to update account" });
      const rows = await mt5ListAccountsV2();
      return json(res, 200, { ok: true, item: out.item || null, items: rows });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "DELETE" && /^\/v2\/accounts\/[^/]+$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const m = url.pathname.match(/^\/v2\/accounts\/([^/]+)$/);
      const accountId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!accountId) return json(res, 400, { ok: false, error: "account_id is required" });
      const out = await mt5ArchiveAccountV2(accountId);
      if (!out?.ok) {
        const statusCode = out?.blocking_open_trades ? 409 : 400;
        return json(res, statusCode, {
          ok: false,
          error: out?.error || "failed to archive account",
          blocking_open_trades: Number(out?.blocking_open_trades || 0),
        });
      }
      const rows = await mt5ListAccountsV2();
      return json(res, 200, { ok: true, item: out.item || null, items: rows });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/v2/settings/execution-profiles") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const userId = uiEffectiveUserId(req, url);
      const [items, active, accounts] = await Promise.all([
        mt5ListExecutionProfilesV2(userId),
        mt5GetActiveExecutionProfileV2(userId),
        mt5ListAccountsV2(userId),
      ]);
      return json(res, 200, {
        ok: true,
        items,
        active_profile: active || null,
        accounts: accounts || [],
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/v2/settings/execution-profile") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const userId = uiEffectiveUserId(req, url, payload);
      const route = String(payload?.route || "").trim().toLowerCase();
      if (!["ea", "v2", "ctrader"].includes(route)) {
        return json(res, 400, { ok: false, error: "route must be one of: ea, v2, ctrader" });
      }
      const accountId = String(payload?.account_id || "").trim();
      if (!accountId) return json(res, 400, { ok: false, error: "account_id is required" });
      const sourceIds = (Array.isArray(payload?.source_ids) ? payload.source_ids : [])
        .map((v) => String(v || "").trim())
        .filter(Boolean);
      const save = await mt5SaveExecutionProfileV2({
        profile_id: String(payload?.profile_id || "default").trim() || "default",
        profile_name: String(payload?.profile_name || `profile_${route}`).trim() || `profile_${route}`,
        user_id: userId,
        route,
        account_id: accountId,
        source_ids: sourceIds,
        ctrader_mode: String(payload?.ctrader_mode || "").trim().toLowerCase(),
        ctrader_account_id: String(payload?.ctrader_account_id || "").trim(),
        is_active: payload?.is_active !== false,
        metadata: payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
      });
      if (!save?.ok) return json(res, 400, { ok: false, error: save?.error || "failed to save execution profile" });
      const rows = await mt5ListExecutionProfilesV2(userId);
      return json(res, 200, { ok: true, item: save.item || null, items: rows });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/v2/settings/execution-profile/apply") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const userId = uiEffectiveUserId(req, url, payload);
      const route = String(payload?.route || "").trim().toLowerCase();
      if (!["ea", "v2", "ctrader"].includes(route)) {
        return json(res, 400, { ok: false, error: "route must be one of: ea, v2, ctrader" });
      }
      const accountId = String(payload?.account_id || "").trim();
      if (!accountId) return json(res, 400, { ok: false, error: "account_id is required" });
      const sourceIds = (Array.isArray(payload?.source_ids) ? payload.source_ids : ["signal", "tradingview"])
        .map((v) => String(v || "").trim())
        .filter(Boolean);
      const save = await mt5SaveExecutionProfileV2({
        profile_id: String(payload?.profile_id || "default").trim() || "default",
        profile_name: String(payload?.profile_name || `active_${route}`).trim() || `active_${route}`,
        user_id: userId,
        route,
        account_id: accountId,
        source_ids: sourceIds,
        ctrader_mode: String(payload?.ctrader_mode || "").trim().toLowerCase(),
        ctrader_account_id: String(payload?.ctrader_account_id || "").trim(),
        is_active: true,
        metadata: payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
      });
      if (!save?.ok) return json(res, 400, { ok: false, error: save?.error || "failed to save execution profile" });

      // Route one-account-only by subscriptions to avoid duplicate fanout.
      const accounts = await mt5ListAccountsV2(userId);
      for (const acc of accounts || []) {
        const aid = String(acc?.account_id || "").trim();
        if (!aid) continue;
        const items = aid === accountId ? sourceIds.map((sid) => ({ source_id: sid, is_active: true })) : [];
        await mt5ReplaceAccountSubscriptionsV2(aid, items);
      }
      const active = await mt5GetActiveExecutionProfileV2(userId);
      return json(res, 200, {
        ok: true,
        active_profile: active || null,
        routed_account_id: accountId,
        route,
        note: "Signal fanout routed to selected account. Runtime process mode (EA/v2 daemon/cTrader bridge) is still managed outside server.",
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/v2/sources") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const rows = await mt5ListSourcesV2();
      return json(res, 200, { ok: true, items: rows });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/v2/brokers") {
    return json(res, 410, { ok: false, error: "Brokers endpoint removed. Broker metadata is account-scoped." });
  }

  if (req.method === "GET" && url.pathname === "/v2/trades") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const pageRaw = Number(url.searchParams.get("page") || 1);
      const pageSizeRaw = Number(url.searchParams.get("pageSize") || url.searchParams.get("limit") || 50);
      const page = Math.max(1, Number.isFinite(pageRaw) ? pageRaw : 1);
      const pageSize = Math.max(1, Math.min(200, Number.isFinite(pageSizeRaw) ? pageSizeRaw : 50));
      const userId = uiEffectiveUserId(req, url);
      const filters = {
        user_id: userId,
        account_id: url.searchParams.get("account_id") || "",
        source_id: url.searchParams.get("source_id") || "",
        dispatch_status: url.searchParams.get("dispatch_status") || "",
        execution_status: url.searchParams.get("execution_status") || "",
        created_from: url.searchParams.get("created_from") || "",
        created_to: url.searchParams.get("created_to") || "",
        symbol: url.searchParams.get("symbol") || "",
        action: url.searchParams.get("action") || url.searchParams.get("side") || "",
        q: url.searchParams.get("q") || "",
      };
      const out = await mt5ListTradesV2(filters, page, pageSize);
      const total = Number(out?.total || 0);
      return json(res, 200, {
        ok: true,
        items: Array.isArray(out?.items) ? out.items : [],
        page: Number(out?.page || page),
        pageSize: Number(out?.page_size || pageSize),
        total,
        pages: Math.max(1, Math.ceil(total / Math.max(1, Number(out?.page_size || pageSize)))),
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/v2/trades/bulk-action") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const userId = uiEffectiveUserId(req, url, payload);
      const action = String(payload.action || "").trim().toLowerCase();
      const filters = {
        user_id: userId,
        trade_ids: Array.isArray(payload.trade_ids) ? payload.trade_ids : [],
        account_id: payload.account_id || "",
        source_id: payload.source_id || "",
        execution_status: payload.execution_status || "",
        created_from: payload.created_from || "",
        created_to: payload.created_to || "",
        q: payload.q || "",
      };
      const out = await mt5BulkActionTradesV2(action, filters);
      return json(res, out?.ok ? 200 : 400, out);
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && /^\/v2\/trades\/[^/]+\/events$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const m = url.pathname.match(/^\/v2\/trades\/([^/]+)\/events$/);
      const tradeId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!tradeId) return json(res, 400, { ok: false, error: "trade_id is required" });
      const limitRaw = Number(url.searchParams.get("limit") || 200);
      const limit = Math.max(1, Math.min(1000, Number.isFinite(limitRaw) ? limitRaw : 200));
      const rows = await mt5ListTradeEventsV2(tradeId, limit);
      return json(res, 200, { ok: true, trade_id: tradeId, items: rows });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/v2/sources") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const name = String(payload?.name || "").trim();
      if (!name) return json(res, 400, { ok: false, error: "name is required" });
      const sourceId = String(payload?.source_id || "").trim() || mt5SlugId(name, "source");
      await mt5UpsertSourceV2({
        source_id: sourceId,
        name,
        kind: String(payload?.kind || "api"),
        auth_mode: String(payload?.auth_mode || "token"),
        auth_secret_hash: payload?.auth_secret_hash ?? null,
        is_active: normalizeUserActive(payload?.is_active, true),
        metadata: payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
      });
      const rows = await mt5ListSourcesV2();
      const created = (rows || []).find((r) => String(r.source_id || "") === sourceId) || null;
      return json(res, 200, { ok: true, item: created, items: rows });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "PUT" && /^\/v2\/sources\/[^/]+$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const m = url.pathname.match(/^\/v2\/sources\/([^/]+)$/);
      const sourceId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!sourceId) return json(res, 400, { ok: false, error: "source_id is required" });
      const rowsBefore = await mt5ListSourcesV2();
      const prev = (rowsBefore || []).find((r) => String(r.source_id || "") === sourceId);
      if (!prev) return json(res, 404, { ok: false, error: "source not found" });

      await mt5UpsertSourceV2({
        source_id: sourceId,
        name: String(payload?.name ?? prev.name ?? sourceId),
        kind: String(payload?.kind ?? prev.kind ?? "api"),
        auth_mode: String(payload?.auth_mode ?? prev.auth_mode ?? "token"),
        auth_secret_hash: payload?.auth_secret_hash ?? prev.auth_secret_hash ?? null,
        is_active: payload?.is_active === undefined ? normalizeUserActive(prev.is_active, true) : normalizeUserActive(payload?.is_active, true),
        metadata: payload?.metadata && typeof payload.metadata === "object"
          ? payload.metadata
          : (prev?.metadata && typeof prev.metadata === "object" ? prev.metadata : {}),
      });
      const rows = await mt5ListSourcesV2();
      const updated = (rows || []).find((r) => String(r.source_id || "") === sourceId) || null;
      return json(res, 200, { ok: true, item: updated, items: rows });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && /^\/v2\/sources\/[^/]+\/events$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const m = url.pathname.match(/^\/v2\/sources\/([^/]+)\/events$/);
      const sourceId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!sourceId) return json(res, 400, { ok: false, error: "source_id is required" });
      const limitRaw = Number(url.searchParams.get("limit") || 100);
      const limit = Math.max(1, Math.min(1000, Number.isFinite(limitRaw) ? limitRaw : 100));
      const rows = await mt5ListSourceEventsV2(sourceId, limit);
      return json(res, 200, { ok: true, source_id: sourceId, items: rows });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && /^\/v2\/sources\/[^/]+\/auth-secret\/rotate$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const m = url.pathname.match(/^\/v2\/sources\/([^/]+)\/auth-secret\/rotate$/);
      const sourceId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!sourceId) return json(res, 400, { ok: false, error: "source_id is required" });
      const out = await mt5RotateSourceSecretV2(sourceId);
      if (!out) return json(res, 404, { ok: false, error: "source not found or backend unsupported" });
      return json(res, 200, {
        ok: true,
        source_id: out.source_id,
        source_secret_plaintext: out.source_secret_plaintext,
        source_secret_last4: out.source_secret_last4 || null,
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && /^\/v2\/sources\/[^/]+\/auth-secret\/revoke$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const m = url.pathname.match(/^\/v2\/sources\/([^/]+)\/auth-secret\/revoke$/);
      const sourceId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!sourceId) return json(res, 400, { ok: false, error: "source_id is required" });
      const out = await mt5RevokeSourceSecretV2(sourceId);
      if (!out?.ok) return json(res, 400, { ok: false, error: out?.error || "failed to revoke source secret" });
      return json(res, 200, { ok: true, source_id: sourceId });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "GET" && /^\/v2\/accounts\/[^/]+\/subscriptions$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const m = url.pathname.match(/^\/v2\/accounts\/([^/]+)\/subscriptions$/);
      const accountId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!accountId) return json(res, 400, { ok: false, error: "account_id is required" });
      const rows = await mt5GetAccountSubscriptionsV2(accountId);
      return json(res, 200, { ok: true, account_id: accountId, items: rows });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "PUT" && /^\/v2\/accounts\/[^/]+\/subscriptions$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const m = url.pathname.match(/^\/v2\/accounts\/([^/]+)\/subscriptions$/);
      const accountId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!accountId) return json(res, 400, { ok: false, error: "account_id is required" });
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const out = await mt5ReplaceAccountSubscriptionsV2(accountId, items);
      if (!out?.ok) return json(res, 400, { ok: false, error: out?.error || "failed to update subscriptions" });
      const rows = await mt5GetAccountSubscriptionsV2(accountId);
      return json(res, 200, { ok: true, account_id: accountId, items: rows });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if ((req.method === "POST" || req.method === "GET") && url.pathname === "/v2/broker/pull") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!CFG.mt5V2BrokerApiEnabled) return json(res, 404, { ok: false, error: "v2 broker api disabled" });
    try {
      const payload = req.method === "POST" ? await readJson(req) : null;
      const account = await requireV2BrokerAccount(req, res, url, payload);
      if (!account) return;
      const maxItemsRaw = Number(payload?.max_items ?? payload?.maxItems ?? url.searchParams.get("max_items") ?? url.searchParams.get("maxItems") ?? 1);
      const maxItems = Math.max(1, Math.min(100, Number.isFinite(maxItemsRaw) ? maxItemsRaw : 1));
      const leaseSeconds = Math.max(5, Math.min(300, Number.isFinite(CFG.mt5V2LeaseSeconds) ? CFG.mt5V2LeaseSeconds : 30));
      const items = await mt5PullLeasedTradesV2(account.account_id, maxItems, leaseSeconds);
      return json(res, 200, {
        ok: true,
        items: (items || []).map((t) => ({
          trade_id: t.trade_id,
          lease_token: t.lease_token,
          lease_expires_at: t.lease_expires_at,
          account_id: t.account_id,
          signal_id: t.signal_id ?? null,
          source_id: t.source_id ?? null,
          symbol: t.symbol,
          action: t.action ?? t.side ?? null,
          entry: t.entry ?? t.intent_entry ?? null,
          order_type: String(t.order_type || t.metadata?.order_type || "limit"),
          sl: t.sl ?? t.intent_sl ?? null,
          tp: t.tp ?? t.intent_tp ?? null,
          volume: t.volume ?? t.intent_volume ?? null,
          note: t.note ?? t.intent_note ?? null,
          metadata: t.metadata && typeof t.metadata === "object" ? t.metadata : {},
        })),
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/v2/broker/ack") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!CFG.mt5V2BrokerApiEnabled) return json(res, 404, { ok: false, error: "v2 broker api disabled" });
    try {
      const payload = await readJson(req);
      const account = await requireV2BrokerAccount(req, res, url, payload);
      if (!account) return;
      const tradeId = String(payload.trade_id || "").trim();
      const leaseToken = String(payload.lease_token || "").trim();
      if (!tradeId || !leaseToken) {
        return json(res, 400, { ok: false, error: "trade_id and lease_token are required" });
      }
      const result = await mt5AckTradeV2(account.account_id, payload);
      if (!result?.ok) return json(res, 409, { ok: false, error: result?.error || "ack failed" });
      return json(res, 200, {
        ok: true,
        dispatch_status: result.dispatch_status,
        execution_status: result.execution_status,
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/v2/broker/sync") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!CFG.mt5V2BrokerApiEnabled) return json(res, 404, { ok: false, error: "v2 broker api disabled" });
    try {
      const payload = await readJson(req);
      const account = await requireV2BrokerAccount(req, res, url, payload);
      if (!account) return;
      const result = await mt5BrokerSyncV2(account.account_id, payload || {});
      const statusCode = result?.ok ? 200 : 400;
      return json(res, statusCode, result);
    } catch (error) {
      console.error("[v2/broker/sync] failed", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      });
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/v2/broker/heartbeat") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!CFG.mt5V2BrokerApiEnabled) return json(res, 404, { ok: false, error: "v2 broker api disabled" });
    try {
      const payload = await readJson(req);
      const account = await requireV2BrokerAccount(req, res, url, payload);
      if (!account) return;
      const result = await mt5BrokerHeartbeatV2(account.account_id, payload || {});
      const statusCode = result?.ok ? 200 : 400;
      return json(res, statusCode, result);
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/v2/broker/trades/create") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!CFG.mt5V2BrokerApiEnabled) return json(res, 404, { ok: false, error: "v2 broker api disabled" });
    try {
      const payload = await readJson(req);
      const account = await requireV2BrokerAccount(req, res, url, payload);
      if (!account) return;
      const result = await mt5CreateBrokerTradeV2(account.account_id, payload || {});
      const statusCode = result?.ok ? 200 : 400;
      return json(res, statusCode, result);
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && /^\/v2\/accounts\/[^/]+\/api-key\/rotate$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const m = url.pathname.match(/^\/v2\/accounts\/([^/]+)\/api-key\/rotate$/);
      const accountId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!accountId) return json(res, 400, { ok: false, error: "account_id is required" });
      const rotated = await mt5RotateAccountApiKeyV2(accountId);
      if (!rotated) return json(res, 404, { ok: false, error: "account not found or backend unsupported" });
      return json(res, 200, {
        ok: true,
        account_id: rotated.account_id,
        api_key_plaintext: rotated.api_key_plaintext,
      });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (req.method === "POST" && /^\/v2\/accounts\/[^/]+\/api-key\/revoke$/.test(url.pathname)) {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    let payload = {};
    try { payload = await readJson(req); } catch {}
    if (!requireAdminKey(req, res, url, payload)) return;
    try {
      const m = url.pathname.match(/^\/v2\/accounts\/([^/]+)\/api-key\/revoke$/);
      const accountId = String(m?.[1] ? decodeURIComponent(m[1]) : "").trim();
      if (!accountId) return json(res, 400, { ok: false, error: "account_id is required" });
      const out = await mt5RevokeAccountApiKeyV2(accountId);
      if (!out?.ok) return json(res, 400, { ok: false, error: out?.error || "failed to revoke api key" });
      return json(res, 200, { ok: true, account_id: accountId });
    } catch (error) {
      return json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
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
      
      const now = mt5NowIso();
      const b = await mt5Backend();
      if (b.brokerHeartbeatV2) {
        await b.brokerHeartbeatV2(accountId, {
          balance: payload.balance,
          equity: payload.equity,
          free_margin: payload.free_margin || payload.margin,
          name: payload.account_name,
          broker_type: 'mt5_legacy',
          now: payload.now || now
        });
      }

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

  function attachClientErrorHandler(server) {
    server.on("clientError", (_err, socket) => {
      if (!socket) return;
      try {
        if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      } catch {
        // ignore
      }
      try { socket.destroy(); } catch {}
    });
  }

  if (CFG.httpsEnabled) {
    const tlsOptions = loadTlsOptions();
    const httpsServer = https.createServer(tlsOptions, appHandler);
    attachClientErrorHandler(httpsServer);
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
      attachClientErrorHandler(httpRedirectServer);
      await new Promise((resolve, reject) => {
        httpRedirectServer.once("error", reject);
        httpRedirectServer.listen(CFG.port, "0.0.0.0", resolve);
      });
      console.log(`HTTP redirect enabled on http://0.0.0.0:${CFG.port} -> https://0.0.0.0:${CFG.httpsPort}`);
    }
  } else {
    const httpServer = http.createServer(appHandler);
    attachClientErrorHandler(httpServer);
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
