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
 *  snapshot — Full pipeline: Chart Sync → snapshots → Claude analyze.
 *
 * Return shape
 * ────────────
 *  { status, data, error, updatedAt, refresh, snapshotState }
 *
 *  snapshotState (only populated in snapshot mode):
 *    { stage, snapshotsReady, analysisReady, analysisResult, message }
 */

// ── helpers ────────────────────────────────────────────────────────

/** Map timeframe string to a TradingView interval token. */
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
  const [status, setStatus] = useState("IDLE"); // IDLE | LOADING | READY | STALE | ERROR
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  // Live-mode: iframe rebind counter
  const [liveKey, setLiveKey] = useState(0);

  // Snapshot-mode extended state
  const [snapshotState, setSnapshotState] = useState({
    stage: "idle", // idle | bars | snapshots | uploading | analyzing | ready | error
    snapshotsReady: false,
    analysisReady: false,
    analysisResult: null,
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

  // ── Live TV mode fetcher (no-op; just returns placeholder) ──────
  const fetchLive = useCallback(async () => {
    // Live TV mode does not call any backend.
    return {
      bars: [],
      last_price: null,
      summary: null,
      freshness: null,
      source: "tradingview_iframe",
      updated_time: Date.now(),
    };
  }, []);

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

      // If still stale/missing TF, fetch Twelve candles as fallback
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
          // swallow — will return what we have
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

  // ── Snapshot mode fetcher (full pipeline) ────────────────────────
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

      // Stage 2: Create snapshots
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
        // Snapshots are optional for the pipeline
      }

      // Stage 3: Upload to Claude if we have files
      if (mountedRef.current && snapshotFiles.length > 0) {
        setSnapshotState((prev) => ({
          ...prev,
          stage: "uploading",
          message: "Uploading to Claude...",
        }));
        try {
          await api.claudeUploadSnapshots({
            symbol: sym,
            session_prefix: prefix,
            files: snapshotFiles,
          });
        } catch {
          // upload failure is non-fatal
        }
      }

      // Stage 4: Analyze
      if (mountedRef.current) {
        setSnapshotState((prev) => ({
          ...prev,
          stage: "analyzing",
          message: "Running Claude analysis...",
          snapshotsReady: snapshotFiles.length > 0,
        }));
      }

      let analysisResult = null;
      try {
        const analyzeOut = await api.chartSnapshotsAnalyze({
          model: "claude-sonnet-4-0",
          prompt: `Analyze ${sym} on ${tfInterval} timeframe. Provide key levels, bias, and trade plan.`,
          session_prefix: prefix,
          max_tokens: 2000,
          symbol: sym,
          timeframe: tfInterval,
          provider,
          timeframes: [tfInterval],
          bars_count: Number(lookbackBars || 300) || 300,
          use_context_files: true,
          context_mode: "claude",
          files: snapshotFiles.map((f) => f.id || f).filter(Boolean),
        });
        analysisResult = analyzeOut;
      } catch {
        // analysis failure is noted but doesn't fail the whole flow
      }

      if (mountedRef.current) {
        setSnapshotState((prev) => ({
          ...prev,
          stage: analysisResult ? "ready" : "error",
          analysisReady: !!analysisResult,
          analysisResult,
          message: analysisResult
            ? "Snapshot analysis complete."
            : "Analysis step failed; bars/context are available.",
        }));
      }

      return {
        bars,
        last_price: tfData?.last_price ?? symbolData?.last_price ?? null,
        summary: tfData?.summary || symbolData?.summary || null,
        freshness: tfData?.freshness || symbolData?.freshness || null,
        context: symbolData,
        snapshotFiles,
        analysisResult,
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
          snapshotsReady: false,
          analysisReady: false,
          analysisResult: null,
          message: "Starting snapshot pipeline...",
        });
      }

      try {
        let fetcher;
        if (mode === "snapshot") fetcher = () => fetchSnapshot(opts);
        else fetcher = () => fetchFixed(opts);

        const result = await chartFetchManager.enqueue(key, fetcher);

        if (!mountedRef.current) return null;

        if (result.error && !result.data) {
          setStatus("ERROR");
          setError(result.error);
        } else if (result.stale) {
          setStatus("STALE");
        } else if (result.error && result.data) {
          // Stale-while-revalidate: show stale data with error note
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

  // ── auto-fetch on mount / when deps change ───────────────────────
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
      // No cache — full fetch (no force so normal pipeline)
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
    liveKey, // bump this to force iframe rebind in Live TV mode
    snapshotState, // extended pipeline state for Snapshot mode
  };
}
