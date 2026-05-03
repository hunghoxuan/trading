import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { chartFetchManager } from "../services/chartFetchManager";
import { api } from "../api";

/**
 * Per-symbol multi-TF chart data hook.
 *
 * Cache key: {SYMBOL} — master object per symbol.
 * Fetches ALL timeframes in one api.chartRefresh call.
 *
 * Return: { status, master, error, cachedAt, refresh, liveKey, snapshotState }
 *   master = { symbol, cached_at, bars: {[tf]:[]}, context:{[tf]:{}}, snapshots:{[tf]:{}} }
 */

function tfNorm(tf) {
  return String(tf || "")
    .toLowerCase()
    .trim();
}

function makeSessionPrefix() {
  const now = new Date();
  const rnd = Math.random().toString(36).slice(2, 7);
  return [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
    rnd,
  ].join("");
}

export function useSymbolChartData({
  symbol,
  timeframes = ["D", "4h", "15m", "5m"],
  mode = "fixed",
  lookbackBars = 300,
}) {
  const [status, setStatus] = useState("IDLE");
  const [master, setMaster] = useState(null);
  const [error, setError] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);
  const [liveKey, setLiveKey] = useState(0);
  const [snapshotState, setSnapshotState] = useState({
    stage: "idle",
    message: "",
  });

  const mountedRef = useRef(true);
  const sessionPrefixRef = useRef("");
  const sym = useMemo(
    () =>
      String(symbol || "")
        .trim()
        .toUpperCase(),
    [symbol],
  );

  const fetchAll = useCallback(
    async (opts = {}) => {
      if (!sym) throw new Error("Symbol required");
      const tfs = [...new Set(timeframes.map(tfNorm).filter(Boolean))];

      const out = await api.chartRefresh({
        symbols: [sym],
        timeframes: tfs,
        types: ["context", "bars", "snapshots"],
        bars: Number(lookbackBars || 300) || 300,
        force: opts.force === true,
      });

      const symbolData = out?.symbols?.[0] || out || {};
      const contextData = symbolData?.context || out?.context || {};
      const tfRows = Array.isArray(contextData?.timeframes)
        ? contextData.timeframes
        : [];

      const barsMap = {},
        contextMap = {};
      let hasAnyBars = false;
      for (const row of tfRows) {
        const key = tfNorm(row?.tf || row?.timeframe || "");
        if (!key) continue;
        const b = Array.isArray(row?.bars) ? row.bars : [];
        barsMap[key] = b;
        if (b.length > 0) hasAnyBars = true;
        contextMap[key] = {
          last_price: row?.last_price ?? null,
          summary: row?.summary || null,
          freshness: row?.freshness || null,
        };
      }

      const snapshotsData = symbolData?.snapshots || out?.snapshots || {};
      const snapItems = Array.isArray(snapshotsData?.items)
        ? snapshotsData.items
        : [];
      const snapshotsMap = {};
      for (const item of snapItems) {
        const itemTf = tfNorm(item?.timeframe || item?.tf || "");
        if (!itemTf) continue;
        snapshotsMap[itemTf] = {
          file_name: item?.file_name || item?.filename || item?.name || "",
          file_path: item?.file_path || item?.path || "",
          created_at: item?.created_at || item?.createdAt || Date.now(),
        };
      }

      const hasAnySnapshots = Object.keys(snapshotsMap).length > 0;

      // If no bars AND no snapshots, treat as data failure
      if (!hasAnyBars && !hasAnySnapshots) {
        throw new Error(
          "No data returned from provider (Twelve Data may be unavailable)",
        );
      }

      return {
        symbol: sym,
        bars: barsMap,
        context: contextMap,
        snapshots: snapshotsMap,
        source: out?.source || "chart_refresh",
      };
    },
    [sym, timeframes, lookbackBars],
  );

  const uploadToClaude = useCallback(
    async (snapshotsMap) => {
      const items = Object.values(snapshotsMap || {}).filter(
        (s) => s?.file_path,
      );
      if (!items.length) return {};

      const prefix = sessionPrefixRef.current || makeSessionPrefix();
      sessionPrefixRef.current = prefix;
      try {
        await api.claudeUploadSnapshots({
          symbol: sym,
          session_prefix: prefix,
          files: items,
        });
        const uploadedMap = {};
        for (const [tfKey, snap] of Object.entries(snapshotsMap || {})) {
          uploadedMap[tfKey] = { ...snap, uploaded_at: Date.now() };
        }
        return uploadedMap;
      } catch {
        return snapshotsMap;
      }
    },
    [sym],
  );

  const refresh = useCallback(
    async (opts = {}) => {
      if (!sym) return null;

      if (mode === "live") {
        setLiveKey((prev) => prev + 1);
        // Live TV: no data, no status, no cache time
        setMaster(null);
        setCachedAt(null);
        setError(null);
        return null;
      }

      setStatus("LOADING");
      setError(null);
      if (mode === "snapshots")
        setSnapshotState({ stage: "bars", message: "Fetching..." });

      try {
        const result = await chartFetchManager.enqueue(
          sym,
          timeframes[0] || "4h",
          () => fetchAll(opts),
        );
        if (!mountedRef.current) return null;

        const data = result.data;
        const hasBars = Object.values(data?.bars || {}).some(
          (b) => Array.isArray(b) && b.length > 0,
        );
        const hasSnapshots = Object.keys(data?.snapshots || {}).length > 0;

        // Only cache if we have actual data
        if (!hasBars && !hasSnapshots) {
          setStatus("ERROR");
          setError("No data from provider");
          return null;
        }

        let uploadedSnapshots = data?.snapshots || {};
        if (mode === "snapshots" && Object.keys(uploadedSnapshots).length > 0) {
          setSnapshotState({
            stage: "uploading",
            message: "Uploading to Claude...",
          });
          uploadedSnapshots = await uploadToClaude(data.snapshots);
          if (data) data.snapshots = uploadedSnapshots;
        }

        // Only set master + cached_at if we have bars (snapshots alone don't count for cache time)
        if (hasBars) {
          const merged = {
            ...data,
            snapshots: uploadedSnapshots,
            cached_at: Date.now(),
          };
          setMaster(merged);
          setCachedAt(Date.now());
        }

        if (result.stale) setStatus("STALE");
        else if (result.error) {
          setStatus(result.data ? "STALE" : "ERROR");
          setError(result.error);
        } else if (!hasBars) {
          // Has snapshots but no bars — partial data
          setStatus("STALE");
        } else setStatus("READY");

        if (mode === "snapshots") {
          const hasSnap = Object.keys(uploadedSnapshots).length > 0;
          setSnapshotState({
            stage: hasSnap ? "ready" : "error",
            message: hasSnap ? "Snapshots ready" : "Snapshot failed",
          });
        }
        return result;
      } catch (err) {
        if (!mountedRef.current) return null;
        setStatus("ERROR");
        setError(String(err?.message || err || "Chart Sync failed"));
        return null;
      }
    },
    [sym, timeframes, mode, fetchAll, uploadToClaude],
  );

  useEffect(() => {
    mountedRef.current = true;
    sessionPrefixRef.current = "";
    if (!sym) {
      setStatus("IDLE");
      setMaster(null);
      return;
    }

    if (mode === "live") {
      // Live TV: no API, no cache — just iframe
      setMaster(null);
      setCachedAt(null);
      setError(null);
      return;
    }

    const cached = chartFetchManager.get(sym);
    if (cached) {
      setMaster(cached);
      setCachedAt(cached.cached_at || null);
      if (cached.stale) {
        setStatus("STALE");
        refresh({ force: true }).catch(() => null);
      } else setStatus("READY");
    } else {
      setStatus("LOADING");
      refresh({ force: false }).catch(() => null);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [sym, mode]);

  return { status, master, error, cachedAt, refresh, liveKey, snapshotState };
}
