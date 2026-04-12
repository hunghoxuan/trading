const API_BASE = import.meta.env.VITE_API_BASE || "";
const API_KEY = import.meta.env.VITE_API_KEY || "";

function withApiKey(url) {
  if (!API_KEY) return url;
  const u = new URL(url, window.location.origin);
  u.searchParams.set("apiKey", API_KEY);
  return `${u.pathname}${u.search}`;
}

async function get(path) {
  const res = await fetch(withApiKey(`${API_BASE}${path}`), {
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
