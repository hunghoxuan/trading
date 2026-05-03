import { useState, useCallback } from "react";
import { useSymbolChartData } from "../../hooks/useChartTileData";
import TradeSignalChart from "../TradeSignalChart";

// ── constants ──────────────────────────────────────────────────────

const STATUS_COLORS = {
  IDLE: "var(--muted)",
  LOADING: "#f59e0b",
  READY: "#10b981",
  STALE: "#f59e0b",
  ERROR: "#ef4444",
};

const STATUS_LABELS = {
  IDLE: "IDLE",
  LOADING: "LOADING",
  READY: "READY",
  STALE: "STALE",
  ERROR: "ERROR",
};

const MODES = ["Live TV", "Fixed Data", "Snapshot"];

// ── helpers ────────────────────────────────────────────────────────

function liveTfToTvInterval(tf) {
  const s = String(tf || "4h").toLowerCase();
  if (s === "d" || s === "1d") return "D";
  if (s === "w" || s === "1w") return "W";
  if (s === "m" || s === "1mth" || s === "1mo") return "M";
  return s.toUpperCase();
}

function toModeKey(uiMode) {
  const m = String(uiMode || "").toLowerCase();
  if (m === "live" || m === "live tv") return "live";
  if (m === "snapshot") return "snapshot";
  return "fixed";
}

// ── SymbolChart component ──────────────────────────────────────────

/**
 * SymbolChart — independent per-symbol per-TF chart card.
 *
 * Props:
 *  symbol             (required)  instrument symbol
 *  timeframe          (required)  e.g. "4h", "15m", "D"
 *  allTfs             (optional)  TFs to fetch on refresh (default: ["D","4h","15m","5m"])
 *  bars               (optional)  pre-supplied OHLCV bars (from outside)
 *  snapshot_file_id   (optional)  Claude file_id
 *  snapshot_file_name (optional)  VPS file name
 *  cached_time        (optional)  last cache timestamp
 *  defaultMode        (optional)  "Live TV" | "Fixed Data" | "Snapshot"
 *  onSelect           (optional)  called when SELECT clicked
 *  onAddWatchlist     (optional)
 *  onRemoveWatchlist  (optional)
 *  inWatchlist        (optional)
 */
export function SymbolChart({
  symbol,
  timeframe,
  allTfs = ["D", "4h", "15m", "5m"],
  bars: externalBars,
  snapshot_file_id: externalFileId,
  snapshot_file_name: externalFileName,
  cached_time: externalCachedTime,
  defaultMode = "Fixed Data",
  onSelect,
  onAddWatchlist,
  onRemoveWatchlist,
  inWatchlist = false,
}) {
  const [mode, setMode] = useState(defaultMode);
  const modeKey = toModeKey(mode);
  const hasExternalData = externalBars != null || externalFileName != null;

  const {
    status,
    bars: fetchedBars,
    snapshot: fetchedSnapshot,
    cachedTime: fetchedCachedTime,
    error,
    refresh,
    liveKey,
    snapshotState,
  } = useSymbolChartData({
    symbol,
    timeframe,
    allTfs,
    mode: modeKey,
  });

  // ── derived data ───────────────────────────────────────────────

  const displayBars = hasExternalData ? externalBars || [] : fetchedBars || [];
  const displaySnapshot = hasExternalData
    ? { file_id: externalFileId, file_name: externalFileName }
    : fetchedSnapshot;
  const displayCachedTime = hasExternalData
    ? externalCachedTime
    : fetchedCachedTime;
  const color = STATUS_COLORS[status] || STATUS_COLORS.IDLE;

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  const handleRefresh = useCallback(
    (e) => {
      e.stopPropagation();
      if (modeKey === "live") {
        refresh();
        return;
      }
      refresh({ force: true });
    },
    [modeKey, refresh],
  );

  // ── render helpers ──────────────────────────────────────────────

  const renderStatusBadge = () => (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 4,
        background: color + "20",
        color,
        border: `1px solid ${color}40`,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );

  const renderSnapshotStage = () => {
    if (modeKey !== "snapshot" || !snapshotState) return null;
    const { stage, message } = snapshotState;
    const stageColors = {
      idle: "var(--muted)",
      bars: "#f59e0b",
      uploading: "#3b82f6",
      ready: "#10b981",
      error: "#ef4444",
    };
    const sc = stageColors[stage] || "var(--muted)";
    if (!message && stage === "idle") return null;
    return (
      <div
        className="minor-text"
        style={{
          fontSize: 9,
          color: sc,
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: sc,
            display: "inline-block",
          }}
        />
        {message}
      </div>
    );
  };

  // ── main render ────────────────────────────────────────────────

  return (
    <div className="browser-card-v1" style={{ position: "relative" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
          gap: 4,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
        >
          <span style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" }}>
            {symbol}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--muted)",
              whiteSpace: "nowrap",
            }}
          >
            {timeframe}
          </span>
          {renderStatusBadge()}
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {/* Watchlist */}
          {inWatchlist ? (
            <button
              type="button"
              className="secondary-button"
              style={{
                width: 18,
                height: 18,
                padding: 0,
                fontSize: 10,
                lineHeight: 1,
                minWidth: 18,
                borderRadius: 4,
                color: "rgba(239,68,68,0.5)",
                borderColor: "rgba(239,68,68,0.25)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveWatchlist?.(symbol);
              }}
              title={"Remove " + symbol}
            >
              -
            </button>
          ) : (
            <button
              type="button"
              className="secondary-button"
              style={{
                width: 18,
                height: 18,
                padding: 0,
                fontSize: 10,
                lineHeight: 1,
                minWidth: 18,
                borderRadius: 4,
                color: "var(--muted)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onAddWatchlist?.(symbol);
              }}
              title={"Add " + symbol + " to watchlist"}
            >
              +
            </button>
          )}

          {/* Mode */}
          <select
            className="secondary-button"
            value={mode}
            onChange={(e) => handleModeChange(e.target.value)}
            style={{ padding: "2px 4px", fontSize: 10, height: 22 }}
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            type="button"
            className="secondary-button"
            style={{
              width: 22,
              height: 22,
              padding: 0,
              fontSize: 11,
              lineHeight: 1,
              minWidth: 22,
            }}
            onClick={handleRefresh}
            disabled={status === "LOADING"}
            title={`Chart Sync${modeKey === "snapshot" ? " + Claude upload" : ""}`}
          >
            {status === "LOADING" ? "\u23F3" : "\u21BB"}
          </button>

          {/* Select */}
          <button
            className="secondary-button"
            style={{ padding: "2px 6px", fontSize: 10 }}
            onClick={() => onSelect?.(symbol)}
          >
            SELECT
          </button>
        </div>
      </div>

      {/* Snapshot stage */}
      {renderSnapshotStage()}

      {/* Error */}
      {error && (
        <div
          className="minor-text"
          style={{ color: "#ef4444", fontSize: 10, marginBottom: 4 }}
        >
          {error}
        </div>
      )}

      {/* Chart */}
      {mode === "Live TV" ? (
        <iframe
          key={`tv-${symbol}-${timeframe}-${liveKey}`}
          title={`tv-${symbol}-${timeframe}`}
          className="browser-chart-v1"
          style={{ height: 200 }}
          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(liveTfToTvInterval(timeframe))}&theme=dark&style=1&locale=en&toolbarbg=%230f1729&hide_top_toolbar=1&hide_legend=1&saveimage=0`}
        />
      ) : (
        <div style={{ position: "relative", minHeight: 200 }}>
          {status === "LOADING" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.3)",
                zIndex: 2,
                borderRadius: 8,
              }}
            >
              <span className="minor-text">Loading...</span>
            </div>
          )}
          <TradeSignalChart
            symbol={symbol}
            interval={timeframe}
            analysisSnapshot={null}
            entryPrice={null}
            slPrice={null}
            tpPrice={null}
          />
        </div>
      )}

      {/* Snapshot info bar */}
      {displaySnapshot &&
        (displaySnapshot.file_id || displaySnapshot.file_name) && (
          <div
            style={{
              marginTop: 4,
              padding: "4px 6px",
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.15)",
              borderRadius: 4,
              fontSize: 9,
              color: "#10b981",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span title={displaySnapshot.file_id || ""}>
              {displaySnapshot.file_name || "Snapshot ready"}
            </span>
            {displayCachedTime && (
              <span>{new Date(displayCachedTime).toLocaleTimeString()}</span>
            )}
          </div>
        )}

      {/* Footer */}
      {displayCachedTime && (
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: "var(--muted)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Cached</span>
          <span>{new Date(displayCachedTime).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
