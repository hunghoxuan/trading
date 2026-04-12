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
  const apiBaseStored = normalizeApiBase(localStorage.getItem("tvbridge_api_base"));
  if (apiBaseStored) return apiBaseStored;
  const { protocol, hostname, port, origin } = window.location;
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

function withApiKey(url) {
  const API_KEY = runtimeApiKey();
  if (!API_KEY) return url;
  const u = new URL(url, window.location.origin);
  u.searchParams.set("apiKey", API_KEY);
  return u.toString();
}

async function get(path) {
  const API_KEY = runtimeApiKey();
  const base = runtimeApiBase();
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 12000);
  let res;
  try {
    res = await fetch(withApiKey(`${base}${path}`), {
      signal: ctrl.signal,
      headers: API_KEY ? { "x-api-key": API_KEY } : {},
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timeout (12s). Check API URL and server status.");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned non-JSON response");
  }
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  dashboardSummary: (userId = "") => get(`/mt5/dashboard/summary${userId ? `?user_id=${encodeURIComponent(userId)}` : ""}`),
  dashboardSeries: (period = "month", userId = "") => get(`/mt5/dashboard/pnl-series?period=${encodeURIComponent(period)}${userId ? `&user_id=${encodeURIComponent(userId)}` : ""}`),
  symbols: (userId = "") => get(`/mt5/filters/symbols${userId ? `?user_id=${encodeURIComponent(userId)}` : ""}`),
  trades: (params) => {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
    });
    return get(`/mt5/trades/search?${q.toString()}`);
  },
  trade: (signalId) => get(`/mt5/trades/${encodeURIComponent(signalId)}`),
};
