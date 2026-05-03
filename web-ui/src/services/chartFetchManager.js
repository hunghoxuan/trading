/**
 * Chart Sync — shared fetch manager.
 *
 * Cache key: {SYMBOL}  (e.g. "EURUSD")
 * Master object per symbol — all TFs, bars, context, snapshots in one entry.
 * Aligns with backend MARKET_DATA:{SYMBOL} contract.
 *
 * Runtime dedupe: {symbol}:{tf}  (for in-flight coordination only)
 * Concurrency cap: 4. Cooldown: 2.5 s. Stale-while-revalidate.
 */

const CONCURRENCY_CAP = 4;
const COOLDOWN_MS = 2500;
const STALE_THRESHOLD_MS = 60_000; // 1 min → stale
const MAX_CACHE_AGE_MS = 10 * 60_000; // 10 min → eviction

// ── internal state ────────────────────────────────────────────────
let activeCount = 0;
const queue = [];
const inFlight = new Map(); // "{symbol}:{tf}" → Promise
const lastFetch = new Map(); // "{symbol}:{tf}" → timestamp ms
const masterCache = new Map(); // "{SYMBOL}" → master object

// ── helpers ────────────────────────────────────────────────────────

/** Normalize symbol to uppercase cache key. */
function normSymbol(symbol) {
  return String(symbol || "")
    .trim()
    .toUpperCase();
}

/** Build runtime dedupe key (in-flight only, NOT cache key). */
function flightKey(symbol, tf) {
  return `${normSymbol(symbol)}:${String(tf || "").toLowerCase()}`;
}

/** Evict master entries older than MAX_CACHE_AGE_MS. */
function evict() {
  const cutoff = Date.now() - MAX_CACHE_AGE_MS;
  for (const [k, v] of masterCache) {
    if ((v.cached_at || 0) < cutoff) masterCache.delete(k);
  }
}

// ── queue processor ────────────────────────────────────────────────

function processQueue() {
  while (queue.length > 0 && activeCount < CONCURRENCY_CAP) {
    const { fkey, fetcher, resolve, reject } = queue.shift();
    startFetch(fkey, fetcher).then(resolve, reject);
  }
}

function startFetch(fkey, fetcher) {
  activeCount++;
  const promise = (async () => {
    try {
      const result = await fetcher();
      lastFetch.set(fkey, Date.now());
      // Merge into master (Read-Modify-Write)
      if (result && result.symbol) {
        const sym = normSymbol(result.symbol);
        const prev = masterCache.get(sym) || {
          symbol: sym,
          bars: {},
          context: {},
          snapshots: {},
        };
        const merged = {
          ...prev,
          ...result,
          cached_at: Date.now(),
          bars: { ...prev.bars, ...(result.bars || {}) },
          context: { ...prev.context, ...(result.context || {}) },
          snapshots: { ...prev.snapshots, ...(result.snapshots || {}) },
        };
        masterCache.set(sym, merged);
      }
      return {
        data: result,
        fromCache: false,
        stale: false,
        updatedAt: Date.now(),
        error: null,
      };
    } catch (err) {
      const cached = lastFetch.get(fkey)
        ? masterCache.get(normSymbol(String(err?.symbol || "")))
        : null;
      if (cached) {
        return {
          data: cached,
          fromCache: true,
          stale: true,
          updatedAt: cached.cached_at,
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
      inFlight.delete(fkey);
      processQueue();
    }
  })();
  inFlight.set(fkey, promise);
  return promise;
}

// ── public API ─────────────────────────────────────────────────────

/** Enqueue a fetch through the shared manager (runtime dedupe + concurrency). */
function enqueue(symbol, tf, fetcher) {
  const fkey = flightKey(symbol, tf);
  if (inFlight.has(fkey)) return inFlight.get(fkey);
  const now = Date.now();
  const last = lastFetch.get(fkey) || 0;
  if (now - last < COOLDOWN_MS) {
    const master = masterCache.get(normSymbol(symbol));
    if (master)
      return Promise.resolve({
        data: master,
        fromCache: true,
        stale: true,
        updatedAt: master.cached_at,
        error: null,
      });
  }
  if (activeCount >= CONCURRENCY_CAP) {
    return new Promise((resolve, reject) => {
      queue.push({ fkey, fetcher, resolve, reject });
    });
  }
  return startFetch(fkey, fetcher);
}

/** Get the master cache entry for a symbol. Returns null if not cached or too old. */
function get(symbol, maxAgeMs = STALE_THRESHOLD_MS) {
  evict();
  const entry = masterCache.get(normSymbol(symbol));
  if (!entry) return null;
  return { ...entry, stale: Date.now() - (entry.cached_at || 0) > maxAgeMs };
}

/** Get bars + snapshot metadata for a specific TF from the master cache. */
function getTf(symbol, tf, maxAgeMs = STALE_THRESHOLD_MS) {
  const master = get(symbol, maxAgeMs);
  if (!master) return null;
  const tfKey = String(tf || "").toLowerCase();
  return {
    bars: master.bars?.[tfKey] || [],
    context: master.context?.[tfKey] || null,
    snapshot: master.snapshots?.[tfKey] || null,
    cached_at: master.cached_at || null,
    stale: master.stale,
  };
}

/** Check if a symbol has fresh cached data. */
function isFresh(symbol, maxAgeMs = STALE_THRESHOLD_MS) {
  const master = get(symbol, maxAgeMs);
  return master && !master.stale;
}

/** Drop cached entries matching a pattern. */
function invalidate(pattern = "") {
  for (const key of masterCache.keys()) {
    if (!pattern || key.includes(pattern.toUpperCase()))
      masterCache.delete(key);
  }
  for (let i = queue.length - 1; i >= 0; i--) {
    if (!pattern || queue[i].fkey.toUpperCase().includes(pattern.toUpperCase()))
      queue.splice(i, 1);
  }
}

function isInFlight(symbol, tf) {
  return inFlight.has(flightKey(symbol, tf));
}

function reset() {
  activeCount = 0;
  queue.length = 0;
  inFlight.clear();
  lastFetch.clear();
  masterCache.clear();
}

export const chartFetchManager = {
  get,
  getTf,
  isFresh,
  enqueue,
  invalidate,
  isInFlight,
  reset,
};
