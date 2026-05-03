import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { chartFetchManager } from "../services/chartFetchManager";
import { api } from "../api";

/**
 * Per-symbol-chart data lifecycle hook.
 *
 * Master cache key: {SYMBOL} — one entry per symbol, all TFs inside.
 * Aligns with backend MARKET_DATA:{SYMBOL}.
 *
 * Modes (display only — cache is shared):
 *  live     — TradingView iframe; no API calls
 *  fixed    — bars chart
 *  snapshot — bars chart + snapshot pipeline
 *
 * Return shape:
 *  { status, bars, snapshot, cachedTime, error, refresh, liveKey, snapshotState }
 */

// ── helpers ────────────────────────────────────────────────────────

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

function tfNorm(tf) {
  return String(tf || "")
    .toLowerCase()
    .trim();
}

// ── hook ───────────────────────────────────────────────────────────

export function useSymbolChartData({
  symbol,
  timeframe,
  allTfs = ["D", "4h", "15m", "5m"],
  mode = "fixed",
  lookbackBars = 300,
}) {
  const [status, setStatus] = useState("IDLE");
  const [bars, setBars] = useState([]);
  const [snapshot, setSnapshot] = useState(null); // { file_id, file_name, uploaded_at }
  const [cachedTime, setCachedTime] = useState(null);
  const [error, setError] = useState(null);

  // Live mode: iframe rebind counter
  const [liveKey, setLiveKey] = useState(0);

  // Snapshot pipeline state
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
  const tf = useMemo(() => tfNorm(timeframe), [timeframe]);

  // ── Fetch all TFs (bars + context + snapshots) ──────────────────
  const fetchAll = useCallback(
    async (opts = {}) => {
      if (!sym) throw new Error("Symbol required");

      // Call chartRefresh for ALL TFs, ALL types — one API call
      const out = await api.chartRefresh({
        symbols: [sym],
        timeframes: allTfs,
        types: ["context", "bars", "snapshots"],
        bars: Number(lookbackBars || 300) || 300,
        force: opts.force === true,
      });

      const symbolData = out?.symbols?.[0] || out?.context || out || {};
      const tfRows = Array.isArray(symbolData?.timeframes)
        ? symbolData.timeframes
        : [];

      // Build master object: bars + context per TF
      const barsMap = {};
      const contextMap = {};
      for (const row of tfRows) {
        const key = tfNorm(row?.tf || row?.timeframe || "");
        if (!key) continue;
        barsMap[key] = Array.isArray(row?.bars) ? row.bars : [];
        contextMap[key] = {
          last_price: row?.last_price ?? null,
          summary: row?.summary || null,
          freshness: row?.freshness || null,
        };
      }

      // Extract snapshot data from response
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

      return {
        symbol: sym,
        bars: barsMap,
        context: contextMap,
        snapshots: snapshotsMap,
        source: out?.source || "chart_refresh",
      };
    },
    [sym, allTfs, lookbackBars],
  );

  // ── Upload snapshots to Claude ──────────────────────────────────
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
        // After upload, we'd ideally get file_ids back. For now mark as uploaded.
        const uploadedMap = {};
        for (const [tfKey, snap] of Object.entries(snapshotsMap || {})) {
          uploadedMap[tfKey] = {
            ...snap,
            uploaded_at: Date.now(),
            // file_id would come from Claude response
          };
        }
        return uploadedMap;
      } catch {
        return snapshotsMap; // return un-uploaded snapshots on failure
      }
    },
    [sym],
  );

  // ── Refresh orchestrator ─────────────────────────────────────────
  const refresh = useCallback(
    async (opts = {}) => {
      if (!sym || !tf) return null;

      // Live TV: bump key for iframe rebind
      if (mode === "live") {
        setLiveKey((prev) => prev + 1);
        setStatus("READY");
        setCachedTime(Date.now());
        setError(null);
        return null;
      }

      setStatus("LOADING");
      setError(null);

      if (mode === "snapshot") {
        setSnapshotState({ stage: "bars", message: "Fetching..." });
      }

      try {
        // 1) Fetch all TFs (bars + context + VPS snapshots) via chartRefresh
        const result = await chartFetchManager.enqueue(sym, tf, () =>
          fetchAll(opts),
        );

        if (!mountedRef.current) return null;

        const master = result.data;

        // 2) If snapshot mode, upload to Claude
        let uploadedSnapshots = master?.snapshots || {};
        if (mode === "snapshot" && Object.keys(uploadedSnapshots).length > 0) {
          setSnapshotState({
            stage: "uploading",
            message: "Uploading to Claude...",
          });
          uploadedSnapshots = await uploadToClaude(master.snapshots);
          // Merge uploaded snapshots back into master
          if (master) master.snapshots = uploadedSnapshots;
        }

        // 3) Update local state for THIS TF
        const tfBars = master?.bars?.[tf] || [];
        const tfSnapshot = uploadedSnapshots?.[tf] || null;

        setBars(tfBars);
        setSnapshot(tfSnapshot);
        setCachedTime(master?.cached_at || Date.now());

        if (result.stale) {
          setStatus("STALE");
        } else if (result.error && tfBars.length === 0) {
          setStatus("ERROR");
          setError(result.error);
        } else if (result.error) {
          setStatus("STALE");
          setError(result.error);
        } else {
          setStatus("READY");
        }

        if (mode === "snapshot") {
          setSnapshotState({
            stage: tfSnapshot ? "ready" : "error",
            message: tfSnapshot ? "Snapshot ready" : "Snapshot creation failed",
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
    [sym, tf, mode, fetchAll, uploadToClaude],
  );

  // ── Auto-fetch on mount ──────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    sessionPrefixRef.current = "";

    if (!sym || !tf) {
      setStatus("IDLE");
      setBars([]);
      setSnapshot(null);
      return;
    }

    // Live mode: immediately ready
    if (mode === "live") {
      setStatus("READY");
      setCachedTime(Date.now());
      setError(null);
      return;
    }

    // Check master cache for this TF
    const cached = chartFetchManager.getTf(sym, tf);
    if (cached) {
      setBars(cached.bars || []);
      setSnapshot(cached.snapshot || null);
      setCachedTime(cached.cached_at || null);
      if (cached.stale) {
        setStatus("STALE");
        // stale-while-revalidate
        refresh({ force: true }).catch(() => null);
      } else {
        setStatus("READY");
      }
    } else {
      setStatus("LOADING");
      refresh({ force: false }).catch(() => null);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [sym, tf, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    bars,
    snapshot, // { file_id, file_name, uploaded_at } | null
    cachedTime,
    error,
    refresh,
    liveKey,
    snapshotState,
  };
}
