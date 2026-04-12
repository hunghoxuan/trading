const API_BASE_CONFIG = (import.meta.env.VITE_API_BASE || "").trim();

function runtimeApiBase() {
  if (API_BASE_CONFIG) return API_BASE_CONFIG;
  const { protocol, hostname, port, origin } = window.location;
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

function withApiKey(url) {
  const API_KEY = runtimeApiKey();
  if (!API_KEY) return url;
  const u = new URL(url, window.location.origin);
  u.searchParams.set("apiKey", API_KEY);
  return `${u.pathname}${u.search}`;
}

async function get(path) {
  const API_KEY = runtimeApiKey();
  const base = runtimeApiBase();
  const res = await fetch(withApiKey(`${base}${path}`), {
    headers: API_KEY ? { "x-api-key": API_KEY } : {},
  });
  const data = await res.json();
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
