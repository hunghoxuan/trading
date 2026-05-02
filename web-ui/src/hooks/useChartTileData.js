import { useState, useEffect, useCallback, useRef } from "react";
import { chartFetchManager } from "../services/chartFetchManager";
import { api } from "../api";

/**
 * Hook for per-chart-tile data lifecycle.
 * Uses Chart Sync family: api.chartRefresh() -> POST /v2/chart/refresh
 * Persisted cache contract: MARKET_DATA:SYMBOL (symbol-centered).
 */
export function useChartTileData({ symbol, timeframe, provider = "ICMARKETS", mode = "fixed" }) {
  const [status, setStatus] = useState("IDLE"); // IDLE | LOADING | READY | STALE | ERROR
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const mountedRef = useRef(true);

  const key = chartFetchManager.cacheKey(provider, symbol, timeframe, mode);

  const fetchData = useCallback(async (opts = {}) => {
    if (!symbol || !timeframe) return null;
    setStatus("LOADING");
    setError(null);

    try {
      const result = await chartFetchManager.enqueue(key, async () => {
        // Chart Sync family: use same pipeline as symbol select
        const out = await api.chartRefresh({
          symbols: [symbol],
          provider,
          timeframes: [timeframe],
          types: ["context", "bars"],
          bars: 300,
          force: opts.force === true,
        });

        // Extract from MARKET_DATA:SYMBOL contract
        const symbolData = out?.symbols?.[0] || out?.context || out || {};
        const tfData = symbolData?.timeframes?.find(
          (t) => String(t?.tf || t?.timeframe || "").toLowerCase() === String(timeframe).toLowerCase()
        ) || symbolData;

        return {
          bars: tfData?.bars || symbolData?.bars || [],
          last_price: tfData?.last_price ?? symbolData?.last_price ?? null,
          summary: tfData?.summary || symbolData?.summary || null,
          freshness: tfData?.freshness || symbolData?.freshness || null,
          source: out?.source || "remote_api",
          updated_time: out?.updated_time || Date.now(),
        };
      });

      if (!mountedRef.current) return null;

      if (result.error) {
        setStatus(result.stale ? "STALE" : "ERROR");
        setError(result.error);
      } else if (result.stale) {
        setStatus("STALE");
      } else {
        setStatus("READY");
      }
      setData(result.data);
      setUpdatedAt(result.updatedAt);
      return result;
    } catch (err) {
      if (!mountedRef.current) return null;
      setStatus("ERROR");
      setError(String(err?.message || err || "Chart Sync failed"));
      return null;
    }
  }, [key, symbol, timeframe, provider, mode]);

  // Auto-fetch on mount / when symbol/timeframe changes
  useEffect(() => {
    mountedRef.current = true;
    if (symbol && timeframe) {
      // Check cache first
      const cached = chartFetchManager.getCached(key);
      if (cached) {
        setData(cached.data);
        setStatus(cached.stale ? "STALE" : "READY");
        setUpdatedAt(cached.updatedAt);
        if (cached.stale) fetchData({ force: true });
      } else {
        fetchData();
      }
    }
    return () => { mountedRef.current = false; };
  }, [symbol, timeframe, mode]);

  const refresh = useCallback(() => fetchData({ force: true }), [fetchData]);

  return { status, data, error, updatedAt, refresh };
}
