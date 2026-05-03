/**
 * Chart Sync — shared fetch manager.
 *
 * Runtime in-flight dedupe key:
 *   {provider}:{symbol}:{timeframe}:{mode}
 *
 * Persisted cache contract (backend):
 *   MARKET_DATA:SYMBOL  (symbol-centered, all TFs grouped in one symbol object)
 *
 * Concurrency cap: 4. Cooldown per runtime key: 2.5 s. Stale-while-revalidate.
 */

const CONCURRENCY_CAP = 4;
const COOLDOWN_MS = 2500; // 2.5 s (within ticket's 2–3 s window)
const STALE_THRESHOLD_MS = 60_000; // 1 min → stale flag
const MAX_CACHE_AGE_MS = 5 * 60_000; // 5 min → eligible for eviction

// ── internal state ────────────────────────────────────────────────
let activeCount = 0;
const queue = []; // { key, fetcher, resolve, reject }
const inFlight = new Map(); // key → Promise
const lastFetch = new Map(); // key → timestamp ms
const memoryCache = new Map(); // key → { data, updatedAt }

// ── helpers ────────────────────────────────────────────────────────

/** Build the runtime dedupe / cooldown key. */
function cacheKey(provider, symbol, timeframe, mode) {
  return [
    String(provider || "ICMARKETS").toUpperCase(),
    String(symbol || "").toUpperCase(),
    String(timeframe || "4h").toLowerCase(),
    String(mode || "fixed").toLowerCase(),
  ].join(":");
}

/** Evict entries older than MAX_CACHE_AGE_MS. */
function evictStaleEntries() {
  const cutoff = Date.now() - MAX_CACHE_AGE_MS;
  for (const [k, v] of memoryCache) {
    if (v.updatedAt < cutoff) memoryCache.delete(k);
  }
}

// ── queue processor ────────────────────────────────────────────────

function processQueue() {
  while (queue.length > 0 && activeCount < CONCURRENCY_CAP) {
    const { key, fetcher, resolve, reject } = queue.shift();
    startFetch(key, fetcher).then(resolve, reject);
  }
}

function startFetch(key, fetcher) {
  activeCount++;
  const promise = (async () => {
    try {
      const result = await fetcher();
      lastFetch.set(key, Date.now());
      memoryCache.set(key, { data: result, updatedAt: Date.now() });
      return {
        data: result,
        fromCache: false,
        stale: false,
        updatedAt: Date.now(),
        error: null,
      };
    } catch (err) {
      const cached = memoryCache.get(key);
      if (cached) {
        return {
          ...cached,
          stale: true,
          error: String(err?.message || err || "fetch failed"),
        };
      }
      return {
        data: null,
        fromCache: false,
        stale: false,
        updatedAt: null,
        error: String(err?.message || err || "fetch failed"),
      };
    } finally {
      activeCount--;
      inFlight.delete(key);
      processQueue();
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

// ── public API ─────────────────────────────────────────────────────

/**
 * Enqueue a fetch through the shared manager.
 *
 * - If the same key is already in-flight the existing promise is returned
 *   (runtime dedupe).
 * - If the key was fetched within COOLDOWN_MS the cached value is returned
 *   with stale=true.
 * - Otherwise the fetcher is run immediately (up to CONCURRENCY_CAP
 *   concurrent), queued otherwise.
 */
function enqueue(key, fetcher) {
  // 1) in-flight dedupe
  if (inFlight.has(key)) return inFlight.get(key);

  // 2) manual-refresh cooldown
  const now = Date.now();
  const last = lastFetch.get(key) || 0;
  if (now - last < COOLDOWN_MS) {
    const cached = memoryCache.get(key);
    if (cached) {
      return Promise.resolve({
        ...cached,
        fromCache: true,
        stale: true,
        error: null,
      });
    }
  }

  // 3) concurrency gate
  if (activeCount >= CONCURRENCY_CAP) {
    return new Promise((resolve, reject) => {
      queue.push({ key, fetcher, resolve, reject });
    });
  }

  return startFetch(key, fetcher);
}

/**
 * Read from the runtime memory cache.
 * Returns null if not present; returns `{ ..., stale: true }` if older
 * than `maxAgeMs`.
 */
function getCached(key, maxAgeMs = STALE_THRESHOLD_MS) {
  evictStaleEntries();
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > maxAgeMs) {
    return { ...entry, fromCache: true, stale: true };
  }
  return { ...entry, fromCache: true, stale: false };
}

/**
 * Drop all memory-cache entries whose key includes `pattern`.
 * Useful for invalidating a whole symbol after a force-refresh.
 */
function invalidate(pattern = "") {
  for (const key of memoryCache.keys()) {
    if (!pattern || key.includes(pattern)) memoryCache.delete(key);
  }
  // also cancel any queued fetches for the same pattern
  for (let i = queue.length - 1; i >= 0; i--) {
    if (!pattern || queue[i].key.includes(pattern)) {
      queue.splice(i, 1);
    }
  }
}

/**
 * Check whether a key is currently in-flight.
 */
function isInFlight(key) {
  return inFlight.has(key);
}

/**
 * Reset all internal state (for testing / hard reset).
 */
function reset() {
  activeCount = 0;
  queue.length = 0;
  inFlight.clear();
  lastFetch.clear();
  memoryCache.clear();
}

export const chartFetchManager = {
  cacheKey,
  enqueue,
  getCached,
  invalidate,
  isInFlight,
  reset,
};
