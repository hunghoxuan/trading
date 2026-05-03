import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { chartFetchManager } from "../services/chartFetchManager";
import { api } from "../api";

/**
 * Per-chart-tile data lifecycle hook.
 *
 * Uses the canonical Chart Sync family:
 *   api.chartRefresh(...)  →  POST /v2/chart/refresh
 *
 * Persisted (backend) cache contract: MARKET_DATA:SYMBOL (symbol-centered).
 * Runtime dedupe key: {provider}:{symbol}:{timeframe}:{mode}
 *
 * Modes
 * ─────
 *  live     — TradingView iframe; no API calls. Refresh = iframe rebind.
 *  fixed    — Chart Sync bars/context branch only.
 *  snapshot — Chart Sync → snapshot creation → Claude upload (no analysis).
 *
 * Return shape
 * ────────────
 *  { status, data, error, updatedAt, refresh, liveKey, snapshotState }
 */

// ── helpers ────────────────────────────────────────────────────────

function toTradingViewInterval(tf) {
  const s = String(tf || "4h")
    .toLowerCase()
    .trim();
  if (s === "d" || s === "1d") return "D";
  if (s === "w" || s === "1w") return "W";
  if (s === "m" || s === "1mth" || s === "1mo") return "M";
  return s.toUpperCase();
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

// ── hook ───────────────────────────────────────────────────────────

export function useChartTileData({
  symbol,
  timeframe,
  provider = "ICMARKETS",
  mode = "fixed",
  lookbackBars = 300,
}) {
  const [status, setStatus] = useState("IDLE");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  // Live-mode: iframe rebind counter
  const [liveKey, setLiveKey] = useState(0);

  // Snapshot-mode extended state
  const [snapshotState, setSnapshotState] = useState({
    stage: "idle", // idle | bars | snapshots | uploading | ready | error
    filesUploaded: 0,
    message: "",
  });

  const mountedRef = useRef(true);
  const sessionPrefixRef = useRef("");

  const key = useMemo(
    () => chartFetchManager.cacheKey(provider, symbol, timeframe, mode),
    [provider, symbol, timeframe, mode],
  );

  const tfInterval = useMemo(
    () => toTradingViewInterval(timeframe),
    [timeframe],
  );

  // ── Fixed Data mode fetcher (Chart Sync bars/context) ───────────
  const fetchFixed = useCallback(
    async (opts = {}) => {
      const sym = String(symbol || "").trim();
      if (!sym) throw new Error("Symbol required");

      const out = await api.chartRefresh({
        symbols: [sym],
        provider,
        timeframes: [tfInterval],
        types: ["context", "bars"],
        bars: Number(lookbackBars || 300) || 300,
        force: opts.force === true,
      });

      // Extract from MARKET_DATA:SYMBOL contract — symbol-centered
      const symbolData = out?.symbols?.[0] || out?.context || out || {};

      const tfRows = Array.isArray(symbolData?.timeframes)
        ? symbolData.timeframes
        : [];

      const tfData =
        tfRows.find(
          (t) =>
            String(t?.tf || t?.timeframe || "").toLowerCase() ===
            tfInterval.toLowerCase(),
        ) || symbolData;

      // Twelve Data fallback if stale/missing
      let fallbackBars = null;
      if (!Array.isArray(tfData?.bars) || tfData.bars.length === 0) {
        try {
          const twelve = await api.chartTwelveCandles(
            sym,
            tfInterval,
            Number(lookbackBars || 300) || 300,
            opts.force === true,
          );
          fallbackBars = twelve?.snapshot?.bars || twelve?.bars || null;
        } catch {
          /* swallow */
        }
      }

      return {
        bars: fallbackBars || tfData?.bars || [],
        last_price: tfData?.last_price ?? symbolData?.last_price ?? null,
        summary: tfData?.summary || symbolData?.summary || null,
        freshness: tfData?.freshness || symbolData?.freshness || null,
        context: symbolData,
        source: out?.source || "chart_refresh",
        updated_time: out?.updated_time || Date.now(),
      };
    },
    [symbol, provider, tfInterval, lookbackBars],
  );

  // ── Snapshot mode fetcher (bars → snapshots → Claude upload) ──
  const fetchSnapshot = useCallback(
    async (opts = {}) => {
      const sym = String(symbol || "").trim();
      if (!sym) throw new Error("Symbol required");

      // Stage 1: Chart Sync — bars/context
      if (mountedRef.current) {
        setSnapshotState((prev) => ({
          ...prev,
          stage: "bars",
          message: "Fetching bars/context...",
        }));
      }

      const out = await api.chartRefresh({
        symbols: [sym],
        provider,
        timeframes: [tfInterval],
        types: ["context", "bars"],
        bars: Number(lookbackBars || 300) || 300,
        force: opts.force === true,
        include_snapshots: 1,
      });

      const symbolData = out?.symbols?.[0] || out?.context || out || {};
      const tfRows = Array.isArray(symbolData?.timeframes)
        ? symbolData.timeframes
        : [];
      const tfData =
        tfRows.find(
          (t) =>
            String(t?.tf || t?.timeframe || "").toLowerCase() ===
            tfInterval.toLowerCase(),
        ) || symbolData;

      // Fallback to Twelve if still missing
      let bars = tfData?.bars || [];
      if (!bars.length) {
        try {
          const twelve = await api.chartTwelveCandles(
            sym,
            tfInterval,
            Number(lookbackBars || 300) || 300,
            true,
          );
          bars = twelve?.snapshot?.bars || twelve?.bars || [];
        } catch {
          /* swallow */
        }
      }

      // Stage 2: Create snapshots (reuse same API as page's captureSnapshots)
      if (mountedRef.current) {
        setSnapshotState((prev) => ({
          ...prev,
          stage: "snapshots",
          message: "Creating chart snapshot...",
        }));
      }

      const prefix = sessionPrefixRef.current || makeSessionPrefix();
      sessionPrefixRef.current = prefix;

      let snapshotFiles = [];
      try {
        const snapOut = await api.chartSnapshotCreateBatch({
          symbol: sym,
          provider,
          session_prefix: prefix,
          timeframes: [tfInterval],
          lookbackBars: Number(lookbackBars || 300) || 300,
          format: "jpg",
          quality: 55,
        });
        snapshotFiles = Array.isArray(snapOut?.items) ? snapOut.items : [];
      } catch {
        /* snapshots are optional */
      }

      // Stage 3: Upload to Claude server (not analysis — just file upload)
      let filesUploaded = 0;
      if (snapshotFiles.length > 0) {
        if (mountedRef.current) {
          setSnapshotState((prev) => ({
            ...prev,
            stage: "uploading",
            message: "Uploading to Claude...",
          }));
        }
        try {
          await api.claudeUploadSnapshots({
            symbol: sym,
            session_prefix: prefix,
            files: snapshotFiles,
          });
          filesUploaded = snapshotFiles.length;
        } catch {
          /* upload failure is non-fatal */
        }
      }

      if (mountedRef.current) {
        setSnapshotState((prev) => ({
          ...prev,
          stage: snapshotFiles.length > 0 ? "ready" : "error",
          filesUploaded,
          message:
            snapshotFiles.length > 0
              ? `Snapshot pipeline complete. ${filesUploaded} file(s) uploaded to Claude.`
              : "Snapshot creation failed; bars/context are available.",
        }));
      }

      return {
        bars,
        last_price: tfData?.last_price ?? symbolData?.last_price ?? null,
        summary: tfData?.summary || symbolData?.summary || null,
        freshness: tfData?.freshness || symbolData?.freshness || null,
        context: symbolData,
        snapshotFiles,
        filesUploaded,
        source: "snapshot_pipeline",
        updated_time: Date.now(),
      };
    },
    [symbol, provider, tfInterval, lookbackBars],
  );

  // ── refresh orchestrator ─────────────────────────────────────────
  const refresh = useCallback(
    async (opts = {}) => {
      if (!symbol || !timeframe) return null;

      // Live TV: just bump the key to force iframe rebind
      if (mode === "live") {
        setLiveKey((prev) => prev + 1);
        setStatus("READY");
        setUpdatedAt(Date.now());
        setError(null);
        return null;
      }

      setStatus("LOADING");
      setError(null);

      // Snapshot-mode pre-init
      if (mode === "snapshot") {
        setSnapshotState({
          stage: "bars",
          filesUploaded: 0,
          message: "Starting snapshot pipeline...",
        });
      }

      try {
        const fetcher =
          mode === "snapshot"
            ? () => fetchSnapshot(opts)
            : () => fetchFixed(opts);

        const result = await chartFetchManager.enqueue(key, fetcher);

        if (!mountedRef.current) return null;

        if (result.error && !result.data) {
          setStatus("ERROR");
          setError(result.error);
        } else if (result.stale) {
          setStatus("STALE");
        } else if (result.error && result.data) {
          // Stale-while-revalidate: show data with error note
          setStatus("STALE");
          setError(result.error);
        } else {
          setStatus("READY");
        }

        if (result.data) {
          setData(result.data);
          setUpdatedAt(result.updatedAt);
        }
        return result;
      } catch (err) {
        if (!mountedRef.current) return null;
        setStatus("ERROR");
        setError(String(err?.message || err || "Chart Sync failed"));
        return null;
      }
    },
    [symbol, timeframe, mode, key, fetchFixed, fetchSnapshot],
  );

  // ── auto-fetch on mount ──────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    sessionPrefixRef.current = "";

    if (!symbol || !timeframe) {
      setStatus("IDLE");
      setData(null);
      return;
    }

    // Live mode: immediately ready
    if (mode === "live") {
      setStatus("READY");
      setData(null);
      setError(null);
      setUpdatedAt(Date.now());
      return;
    }

    // Fixed / Snapshot: check cache, then fetch
    const cached = chartFetchManager.getCached(key);
    if (cached?.data) {
      setData(cached.data);
      setUpdatedAt(cached.updatedAt);
      if (cached.stale) {
        setStatus("STALE");
        // stale-while-revalidate
        refresh({ force: true }).catch(() => null);
      } else {
        setStatus("READY");
      }
    } else {
      // No cache — full fetch
      setStatus("LOADING");
      refresh({ force: false }).catch(() => null);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [symbol, timeframe, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    data,
    error,
    updatedAt,
    refresh,
    liveKey,
    snapshotState,
  };
}
