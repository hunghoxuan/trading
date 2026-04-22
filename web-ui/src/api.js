const DEFAULT_REMOTE_BASE = "http://139.59.211.192";

function normalizeApiBase(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const u = new URL(withScheme);
    return u.origin;
  } catch {
    return "";
  }
}

function runtimeApiBase() {
  const u = new URL(window.location.href);
  const apiBaseQuery = normalizeApiBase(u.searchParams.get("apiBase"));
  if (apiBaseQuery) {
    localStorage.setItem("tvbridge_api_base", apiBaseQuery);
    return apiBaseQuery;
  }
  const { protocol, hostname, port, origin } = window.location;

  // On deployed server UI, always use same-origin API to avoid stale/bad saved API URLs.
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return origin;
  }

  const apiBaseStored = normalizeApiBase(localStorage.getItem("tvbridge_api_base"));
  if (apiBaseStored) return apiBaseStored;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return DEFAULT_REMOTE_BASE;
  }
  if (port && port !== "80" && port !== "443") {
    return `${protocol}//${hostname}`;
  }
  return origin;
}

function runtimeApiKey() {
  const u = new URL(window.location.href);
  const keyFromQuery = (u.searchParams.get("apiKey") || "").trim();
  if (keyFromQuery) {
    localStorage.setItem("tvbridge_api_key", keyFromQuery);
    return keyFromQuery;
  }
  return (localStorage.getItem("tvbridge_api_key") || "").trim();
}

export function getRuntimeApiKey() {
  return runtimeApiKey();
}

export function setRuntimeApiKey(value) {
  const v = String(value || "").trim();
  if (!v) {
    localStorage.removeItem("tvbridge_api_key");
    return;
  }
  localStorage.setItem("tvbridge_api_key", v);
}

export function getRuntimeApiBase() {
  return runtimeApiBase();
}

export function setRuntimeApiBase(value) {
  const v = normalizeApiBase(value);
  if (!v) {
    localStorage.removeItem("tvbridge_api_base");
    return;
  }
  localStorage.setItem("tvbridge_api_base", v);
}

function buildUrl(base, path) {
  return new URL(path, `${base.replace(/\/+$/, "")}/`).toString();
}

function isAuthFailure(status, data) {
  if (status === 401 || status === 403) return true;
  const err = String(data?.error || "").toLowerCase();
  return err.includes("unauthorized") || err.includes("forbidden") || err.includes("session") || err.includes("login required");
}

function redirectToLogin() {
  try {
    localStorage.removeItem("tvbridge_api_key");
  } catch {
    // ignore
  }
  if (window.location.pathname.endsWith("/login")) return;
  const base = window.location.pathname.startsWith("/ui") ? "/ui" : "";
  const loginPath = `${base}/login`;
  window.location.assign(loginPath);
}

async function get(path) {
  const API_KEY = runtimeApiKey();
  const base = runtimeApiBase();
  const primaryUrl = buildUrl(base, path);
  const fallbackUrl = buildUrl(window.location.origin, path);

  async function doFetch(url) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 12000);
    const headers = API_KEY
      ? { "x-api-key": API_KEY, "Cache-Control": "no-cache", Pragma: "no-cache" }
      : { "Cache-Control": "no-cache", Pragma: "no-cache" };
    try {
      return await fetch(url, {
        signal: ctrl.signal,
        cache: "no-store",
        credentials: "include",
        headers,
      });
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error("Request timeout (12s). Check API URL and server status.");
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
    }
  }

  let res;
  try {
    res = await doFetch(primaryUrl);
  } catch (primaryError) {
    // If user configured a remote API URL, fallback to same-origin /mt5 endpoints.
    if (primaryUrl !== fallbackUrl) {
      try {
        res = await doFetch(fallbackUrl);
      } catch {
        throw primaryError;
      }
    } else {
      throw primaryError;
    }
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }
  if (!res.ok || !data.ok) {
    if (path !== "/auth/login" && isAuthFailure(res.status, data)) {
      redirectToLogin();
      throw new Error("Session expired. Redirecting to login.");
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

async function post(path, body = {}) {
  const API_KEY = runtimeApiKey();
  const base = runtimeApiBase();
  const primaryUrl = buildUrl(base, path);
  const fallbackUrl = buildUrl(window.location.origin, path);

  async function doFetch(url) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 12000);
    try {
      return await fetch(url, {
        method: "POST",
        signal: ctrl.signal,
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...(API_KEY ? { "x-api-key": API_KEY } : {}),
        },
        body: JSON.stringify(body || {}),
      });
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error("Request timeout (12s). Check API URL and server status.");
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
    }
  }

  let res;
  try {
    res = await doFetch(primaryUrl);
  } catch (primaryError) {
    if (primaryUrl !== fallbackUrl) {
      try {
        res = await doFetch(fallbackUrl);
      } catch {
        throw primaryError;
      }
    } else {
      throw primaryError;
    }
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }
  if (!res.ok || !data.ok) {
    if (path !== "/auth/login" && isAuthFailure(res.status, data)) {
      redirectToLogin();
      throw new Error("Session expired. Redirecting to login.");
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

async function postWithTimeout(path, body = {}, timeoutMs = 12000) {
  const API_KEY = runtimeApiKey();
  const base = runtimeApiBase();
  const primaryUrl = buildUrl(base, path);
  const fallbackUrl = buildUrl(window.location.origin, path);

  async function doFetch(url) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, {
        method: "POST",
        signal: ctrl.signal,
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...(API_KEY ? { "x-api-key": API_KEY } : {}),
        },
        body: JSON.stringify(body || {}),
      });
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error(`Request timeout (${Math.round(timeoutMs / 1000)}s). Check API URL and server status.`);
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
    }
  }

  let res;
  try {
    res = await doFetch(primaryUrl);
  } catch (primaryError) {
    if (primaryUrl !== fallbackUrl) {
      try {
        res = await doFetch(fallbackUrl);
      } catch {
        throw primaryError;
      }
    } else {
      throw primaryError;
    }
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }
  if (!res.ok || !data.ok) {
    if (path !== "/auth/login" && isAuthFailure(res.status, data)) {
      redirectToLogin();
      throw new Error("Session expired. Redirecting to login.");
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

async function put(path, body = {}) {
  const API_KEY = runtimeApiKey();
  const base = runtimeApiBase();
  const primaryUrl = buildUrl(base, path);
  const fallbackUrl = buildUrl(window.location.origin, path);

  async function doFetch(url) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 12000);
    try {
      return await fetch(url, {
        method: "PUT",
        signal: ctrl.signal,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(API_KEY ? { "x-api-key": API_KEY } : {}),
        },
        body: JSON.stringify(body || {}),
      });
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error("Request timeout (12s). Check API URL and server status.");
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
    }
  }

  let res;
  try {
    res = await doFetch(primaryUrl);
  } catch (primaryError) {
    if (primaryUrl !== fallbackUrl) {
      try {
        res = await doFetch(fallbackUrl);
      } catch {
        throw primaryError;
      }
    } else {
      throw primaryError;
    }
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }
  if (!res.ok || !data.ok) {
    if (path !== "/auth/login" && isAuthFailure(res.status, data)) {
      redirectToLogin();
      throw new Error("Session expired. Redirecting to login.");
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

async function del(path) {
  const API_KEY = runtimeApiKey();
  const base = runtimeApiBase();
  const primaryUrl = buildUrl(base, path);
  const fallbackUrl = buildUrl(window.location.origin, path);

  async function doFetch(url) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 12000);
    try {
      return await fetch(url, {
        method: "DELETE",
        signal: ctrl.signal,
        credentials: "include",
        headers: API_KEY ? { "x-api-key": API_KEY } : {},
      });
    } catch (err) {
      if (err?.name === "AbortError") throw new Error("Request timeout (12s). Check API URL and server status.");
      throw err;
    } finally {
      window.clearTimeout(timer);
    }
  }

  let res;
  try {
    res = await doFetch(primaryUrl);
  } catch (primaryError) {
    if (primaryUrl !== fallbackUrl) {
      try { res = await doFetch(fallbackUrl); } catch { throw primaryError; }
    } else {
      throw primaryError;
    }
  }
  let data;
  try { data = await res.json(); } catch { throw new Error(`Server returned non-JSON response (${res.status})`); }
  if (!res.ok || !data.ok) {
    if (path !== "/auth/login" && isAuthFailure(res.status, data)) {
      redirectToLogin();
      throw new Error("Session expired. Redirecting to login.");
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

async function downloadCsv(path, params = {}) {
  const API_KEY = runtimeApiKey();
  const base = runtimeApiBase();
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
  });
  const primaryUrl = buildUrl(base, `${path}?${q.toString()}`);
  const fallbackUrl = buildUrl(window.location.origin, `${path}?${q.toString()}`);

  async function doFetch(url) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 20000);
    try {
      return await fetch(url, {
        signal: ctrl.signal,
        credentials: "include",
        headers: API_KEY ? { "x-api-key": API_KEY } : {},
      });
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error("Download timeout (20s). Check API URL and server status.");
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
    }
  }

  let res;
  try {
    res = await doFetch(primaryUrl);
  } catch (primaryError) {
    if (primaryUrl !== fallbackUrl) {
      res = await doFetch(fallbackUrl);
    } else {
      throw primaryError;
    }
  }
  if (!res.ok) {
    if (path !== "/auth/login" && isAuthFailure(res.status, {})) {
      redirectToLogin();
      throw new Error("Session expired. Redirecting to login.");
    }
    const text = await res.text();
    throw new Error(text || `Download failed: ${res.status}`);
  }
  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition") || "";
  const m = contentDisposition.match(/filename="([^"]+)"/i);
  const filename = (m && m[1]) ? m[1] : "mt5-backtest.csv";
  return { blob, filename };
}

export const api = {
  authMe: () => get("/auth/me"),
  authProfile: () => get("/auth/profile"),
  updateAuthProfile: (user_name, email) => put("/auth/profile", { user_name, email }),
  listUsers: () => get("/auth/users"),
  createUser: (payload = {}) => post("/auth/users", payload),
  updateUser: (userId, payload = {}) => put(`/auth/users/${encodeURIComponent(userId)}`, payload),
  deactivateUser: (userId) => post(`/auth/users/${encodeURIComponent(userId)}/deactivate`, {}),
  userDetail: (userId) => get(`/auth/users/${encodeURIComponent(userId)}/detail`),
  createUserAccount: (userId, payload = {}) => post(`/auth/users/${encodeURIComponent(userId)}/accounts`, payload),
  updateUserAccount: (userId, accountId, payload = {}) => put(`/auth/users/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(accountId)}`, payload),
  deleteUserAccount: (userId, accountId) => del(`/auth/users/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(accountId)}`),
  v2Accounts: () => get("/v2/accounts"),
  v2CreateAccount: (payload = {}) => post("/v2/accounts", payload),
  v2UpdateAccount: (accountId, payload = {}) => put(`/v2/accounts/${encodeURIComponent(accountId)}`, payload),
  v2ArchiveAccount: (accountId) => del(`/v2/accounts/${encodeURIComponent(accountId)}`),
  v2Sources: () => get("/v2/sources"),
  v2Trades: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
    });
    return get(`/v2/trades?${q.toString()}`);
  },
  v2TradesBulkAction: (action, filters = {}) => post("/v2/trades/bulk-action", { action, ...filters }),
  v2TradeEvents: (tradeId, limit = 200) => get(`/v2/trades/${encodeURIComponent(tradeId)}/events?limit=${encodeURIComponent(limit)}`),
  v2CreateSource: (payload = {}) => post("/v2/sources", payload),
  v2UpdateSource: (sourceId, payload = {}) => put(`/v2/sources/${encodeURIComponent(sourceId)}`, payload),
  v2SourceEvents: (sourceId, limit = 100) => get(`/v2/sources/${encodeURIComponent(sourceId)}/events?limit=${encodeURIComponent(limit)}`),
  v2RotateSourceSecret: (sourceId) => post(`/v2/sources/${encodeURIComponent(sourceId)}/auth-secret/rotate`, {}),
  v2RevokeSourceSecret: (sourceId) => post(`/v2/sources/${encodeURIComponent(sourceId)}/auth-secret/revoke`, {}),
  v2GetSubscriptions: (accountId) => get(`/v2/accounts/${encodeURIComponent(accountId)}/subscriptions`),
  v2PutSubscriptions: (accountId, items = []) => put(`/v2/accounts/${encodeURIComponent(accountId)}/subscriptions`, { items }),
  v2RotateAccountApiKey: (accountId) => post(`/v2/accounts/${encodeURIComponent(accountId)}/api-key/rotate`, {}),
  v2RevokeAccountApiKey: (accountId) => post(`/v2/accounts/${encodeURIComponent(accountId)}/api-key/revoke`, {}),
  v2UpdateAccountApiKey: (accountId, plainApiKey) => post(`/v2/broker/accounts/${encodeURIComponent(accountId)}/apiKey`, { api_key_plaintext: plainApiKey }),
  v2ExecutionProfiles: () => get("/v2/settings/execution-profiles"),
  v2SaveExecutionProfile: (payload = {}) => post("/v2/settings/execution-profile", payload),
  v2ApplyExecutionProfile: (payload = {}) => post("/v2/settings/execution-profile/apply", payload),
  login: (email, password) => post("/auth/login", { email, password }),
  logout: () => post("/auth/logout", {}),
  changePassword: (currentPassword, newPassword) => post("/auth/password", { currentPassword, newPassword }),
  health: () => get("/health"),
  dashboardAdvanced: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
    });
    return get(`/mt5/dashboard/advanced?${q.toString()}`);
  },
  dashboardSummary: (userId = "") => get(`/mt5/dashboard/summary${userId ? `?user_id=${encodeURIComponent(userId)}` : ""}`),
  dashboardSeries: (period = "month", userId = "") => get(`/mt5/dashboard/pnl-series?period=${encodeURIComponent(period)}${userId ? `&user_id=${encodeURIComponent(userId)}` : ""}`),
  symbols: (userId = "") => get(`/mt5/filters/symbols${userId ? `?user_id=${encodeURIComponent(userId)}` : ""}`),
  filtersAdvanced: (userId = "") => get(`/mt5/filters/advanced${userId ? `?user_id=${encodeURIComponent(userId)}` : ""}`),
  trades: (params) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
    });
    return get(`/mt5/trades/search?${q.toString()}`);
  },
  trade: (signalId) => get(`/mt5/trades/${encodeURIComponent(signalId)}`),
  createTrade: (payload = {}) => post("/v2/signals/create", payload),
  createSignal: (payload = {}) => post("/v2/signals/create", payload),
  deleteTrades: (params) => post("/mt5/trades/delete", params),
  cancelTrades: (params) => post("/mt5/trades/cancel", params),
  renewTrades: (params) => post("/mt5/trades/renew", params),
  downloadBacktestCsv: (params) => downloadCsv("/csv", params),
  events: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
    });
    return get(`/mt5/api/events?${q.toString()}`);
  },
  createEvent: (payload = {}) => post("/mt5/api/events/create", payload),
  deleteEvents: () => post("/mt5/api/events/delete", {}),
  dbTables: () => get("/mt5/db/tables"),
  dbRows: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
    });
    return get(`/mt5/db/rows?${q.toString()}`);
  },
  dbCreateRow: (payload = {}) => post("/mt5/db/rows/create", payload),
  aiListTemplates: () => get("/v2/ai/templates"),
  aiUpsertTemplate: (payload = {}) => post("/v2/ai/templates", payload),
  aiDeleteTemplate: (templateId) => del(`/v2/ai/templates/${encodeURIComponent(templateId)}`),
  aiGetConfig: () => get("/v2/ai/config"),
  aiUpsertConfig: (key, value) => post("/v2/ai/config", { key, value }),
  aiGenerate: (payload = {}) => postWithTimeout("/v2/ai/generate", payload, 65000),
  chartSnapshotCreate: (payload = {}) => postWithTimeout("/v2/chart/snapshot", payload, 90000),
  chartSnapshotCreateBatch: (payload = {}) => postWithTimeout("/v2/chart/snapshot/batch", payload, 180000),
  chartSnapshotsAnalyze: (payload = {}) => postWithTimeout("/v2/chart/snapshots/analyze", payload, 120000),
  chartSymbols: (q = "", provider = "ICMARKETS", limit = 20) =>
    get(`/v2/chart/symbols?q=${encodeURIComponent(q)}&provider=${encodeURIComponent(provider)}&limit=${encodeURIComponent(limit)}`),
  chartSnapshots: (limit = 30) => get(`/v2/chart/snapshots?limit=${encodeURIComponent(limit)}`),
  chartSnapshotsDelete: (payload = {}) => post("/v2/chart/snapshots/delete", payload),
  getSettings: () => get("/v2/settings"),
  upsertSetting: (payload = {}) => post("/v2/settings", payload),
  deleteSetting: (type, name) => del(`/v2/settings/${encodeURIComponent(type)}/${encodeURIComponent(name)}`),
};
