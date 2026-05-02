/**
 * Chart Sync — shared fetch manager.
 * Runtime in-flight dedupe key: {provider}:{symbol}:{timeframe}:{mode}
 * Concurrency cap: 4. Cooldown per key: 2.5s. Stale-while-revalidate.
 * Persisted cache contract: MARKET_DATA:SYMBOL (symbol-centered, all TFs grouped).
 */

const CONCURRENCY_CAP = 4;
const COOLDOWN_MS = 2500;
const STALE_THRESHOLD_MS = 60_000; // 1 min

let activeCount = 0;
const queue = [];
const inFlight = new Map(); // key -> Promise
const lastFetch = new Map(); // key -> timestamp
const memoryCache = new Map(); // key -> { data, updatedAt }

function cacheKey(provider, symbol, timeframe, mode) {
  return `${String(provider || "ICMARKETS").toUpperCase()}:${String(symbol || "").toUpperCase()}:${String(timeframe || "4h").toLowerCase()}:${String(mode || "fixed").toLowerCase()}`;
}

/** Enqueue a fetch, respecting concurrency and cooldown. */
function enqueue(key, fetcher) {
  if (inFlight.has(key)) return inFlight.get(key);

  const now = Date.now();
  const last = lastFetch.get(key) || 0;
  if (now - last < COOLDOWN_MS) {
    // Within cooldown: return stale cache if available
    const cached = memoryCache.get(key);
    if (cached) return Promise.resolve({ ...cached, stale: true });
  }

  if (activeCount >= CONCURRENCY_CAP) {
    return new Promise((resolve) => {
      queue.push({ key, fetcher, resolve });
    });
  }

  return startFetch(key, fetcher);
}

function startFetch(key, fetcher) {
  activeCount++;
  const promise = (async () => {
    try {
      const result = await fetcher();
      lastFetch.set(key, Date.now());
      memoryCache.set(key, { data: result, updatedAt: Date.now() });
      return { data: result, fromCache: false, stale: false, updatedAt: Date.now(), error: null };
    } catch (err) {
      const cached = memoryCache.get(key);
      if (cached) {
        return { ...cached, stale: true, error: String(err?.message || err || "fetch failed") };
      }
      return { data: null, fromCache: false, stale: false, updatedAt: null, error: String(err?.message || err || "fetch failed") };
    } finally {
      activeCount--;
      inFlight.delete(key);
      processQueue();
    }
  })();
  inFlight.set(key, promise);
  return promise;
}

function processQueue() {
  while (queue.length > 0 && activeCount < CONCURRENCY_CAP) {
    const { key, fetcher, resolve } = queue.shift();
    resolve(startFetch(key, fetcher));
  }
}

/** Read from memory cache. Returns null if not present or too stale. */
function getCached(key, maxAgeMs = STALE_THRESHOLD_MS) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > maxAgeMs) return { ...entry, stale: true };
  return { ...entry, fromCache: true, stale: false };
}

/** Invalidate cache for a key pattern. */
function invalidate(pattern = "") {
  for (const key of memoryCache.keys()) {
    if (!pattern || key.includes(pattern)) memoryCache.delete(key);
  }
}

export const chartFetchManager = {
  cacheKey,
  enqueue,
  getCached,
  invalidate,
};
