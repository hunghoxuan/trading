import { useState, useMemo, useCallback } from "react";
import { useChartTileData } from "../../hooks/useChartTileData";

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

/** Map a local TF token to a TradingView interval string. */
function liveTfToTvInterval(tf) {
  const s = String(tf || "4h").toLowerCase();
  if (s === "d" || s === "1d") return "D";
  if (s === "w" || s === "1w") return "W";
  if (s === "m" || s === "1mth" || s === "1mo") return "M";
  return s.toUpperCase();
}

/** Derive an internal mode key that the hook understands (normalizes both display and code forms). */
function toModeKey(uiMode) {
  const m = String(uiMode || "").toLowerCase();
  if (m === "live" || m === "live tv") return "live";
  if (m === "snapshot") return "snapshot";
  return "fixed";
}

// ── ChartTile component ────────────────────────────────────────────

/**
 * ChartTile — independent per-chart card.
 *
 * Props:
 *  symbol           (required)  instrument symbol
 *  timeframe        (required)  e.g. "4h", "15m", "D"
 *  provider         (optional)  default "ICMARKETS"
 *  bars             (optional)  pre-supplied OHLCV bars
 *  entries          (optional)  trade entry markers
 *  defaultMode      (optional)  "Live TV" | "Fixed Data" | "Snapshot"  (default "Fixed Data")
 *  onSelect         (optional)  called when SELECT button is clicked
 *  onAddWatchlist   (optional)  called to add symbol to watchlist
 *  onRemoveWatchlist(optional)  called to remove symbol from watchlist
 *  inWatchlist      (optional)  whether symbol is currently watchlisted
 */
export function ChartTile({
  symbol,
  timeframe,
  provider = "ICMARKETS",
  bars: initialBars,
  entries,
  defaultMode = "Fixed Data",
  onSelect,
  onAddWatchlist,
  onRemoveWatchlist,
  inWatchlist = false,
}) {
  const [mode, setMode] = useState(defaultMode);
  const modeKey = toModeKey(mode);

  const { status, data, error, updatedAt, refresh, liveKey, snapshotState } =
    useChartTileData({
      symbol,
      timeframe,
      provider,
      mode: modeKey,
    });

  // ── derived data ───────────────────────────────────────────────

  const displayBars = useMemo(() => {
    if (data?.bars?.length) return data.bars;
    if (Array.isArray(initialBars) && initialBars.length) return initialBars;
    return [];
  }, [data, initialBars]);

  const lastPrice = data?.last_price ?? null;
  const color = STATUS_COLORS[status] || STATUS_COLORS.IDLE;

  // Mode-change handler
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(
    (e) => {
      e.stopPropagation();
      if (modeKey === "live") {
        // Live TV: just bump liveKey to trigger iframe rebind
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
      snapshots: "#f59e0b",
      uploading: "#3b82f6",
      analyzing: "#8b5cf6",
      ready: "#10b981",
      error: "#ef4444",
    };
    const sc = stageColors[stage] || "var(--muted)";
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
        {message || `Stage: ${stage}`}
      </div>
    );
  };

  // ── main render ────────────────────────────────────────────────

  return (
    <div className="browser-card-v1" style={{ position: "relative" }}>
      {/* ── Header row ─────────────────────────────────────── */}
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
          {/* Watchlist +/- */}
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

          {/* Mode toggle */}
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
            title={`Chart Sync refresh${modeKey === "snapshot" ? " (full pipeline)" : ""}`}
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

      {/* ── Snapshot pipeline stage indicator ───────────────── */}
      {renderSnapshotStage()}

      {/* ── Error display ───────────────────────────────────── */}
      {error && (
        <div
          className="minor-text"
          style={{ color: "#ef4444", fontSize: 10, marginBottom: 4 }}
        >
          {error}
        </div>
      )}

      {/* ── Chart content area ──────────────────────────────── */}
      {mode === "Live TV" ? (
        <iframe
          key={`tv-${symbol}-${timeframe}-${liveKey}`}
          title={`tile-${symbol}-${timeframe}`}
          className="browser-chart-v1"
          style={{ height: 200 }}
          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(liveTfToTvInterval(timeframe))}&theme=dark&style=1&locale=en&toolbarbg=%230f1729&hide_top_toolbar=1&hide_legend=1&saveimage=0`}
        />
      ) : (
        <div style={{ position: "relative", minHeight: 200 }}>
          {/* Loading overlay */}
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
              <span className="minor-text">
                {modeKey === "snapshot"
                  ? snapshotState?.message || "Chart Sync loading..."
                  : "Chart Sync loading..."}
              </span>
            </div>
          )}

          {/* Bars chart */}
          {displayBars.length > 0 ? (
            <MiniBarsChart
              bars={displayBars}
              lastPrice={lastPrice}
              entries={entries}
            />
          ) : (
            <div
              style={{
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 4,
              }}
              className="minor-text"
            >
              {status === "IDLE"
                ? "Chart Sync pending..."
                : status === "ERROR"
                  ? "Chart Sync failed"
                  : "No data"}
            </div>
          )}

          {/* Snapshot analysis summary (collapsed) */}
          {modeKey === "snapshot" && snapshotState?.analysisReady && (
            <div
              style={{
                marginTop: 6,
                padding: "6px 8px",
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.15)",
                borderRadius: 6,
                fontSize: 10,
                color: "#10b981",
              }}
            >
              Analysis ready &mdash;{" "}
              {snapshotState.analysisResult?.source || "Claude"}
            </div>
          )}
        </div>
      )}

      {/* ── Footer: price & timestamp ────────────────────────── */}
      {lastPrice != null && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "var(--muted)",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>Last: {Number(lastPrice).toFixed(5)}</span>
          {updatedAt && <span>{new Date(updatedAt).toLocaleTimeString()}</span>}
        </div>
      )}
    </div>
  );
}

// ── MiniBarsChart (inline SVG for Fixed Data / Snapshot) ──────────

/**
 * Minimal SVG price-line chart for Fixed Data / Snapshot mode.
 * Props:
 *  bars      — array of { close, time, ... }
 *  lastPrice — horizontal reference line
 *  entries   — optional [{ price, color, label }]
 */
function MiniBarsChart({ bars, lastPrice, entries }) {
  if (!bars.length) return null;

  const w = 280;
  const h = 180;
  const pad = 4;

  const closes = bars
    .map((b) => Number(b?.close ?? b?.c ?? null))
    .filter(Number.isFinite);
  if (!closes.length) return null;

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const barW = Math.max(1, (w - pad * 2) / closes.length - 1);

  // Polyline points
  const points = closes
    .map((c, i) => {
      const x = pad + i * (barW + 1);
      const y = h - pad - ((c - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  // Helper: price → y
  const priceToY = (price) =>
    h - pad - ((Number(price) - min) / range) * (h - pad * 2);

  return (
    <svg
      width={w}
      height={h}
      style={{ display: "block", background: "transparent" }}
    >
      {/* Price line */}
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth={1} />

      {/* Data dots */}
      {closes.map((c, i) => {
        const x = pad + i * (barW + 1);
        const y = priceToY(c);
        return <circle key={i} cx={x} cy={y} r={1} fill="#22d3ee" />;
      })}

      {/* Last price reference line */}
      {lastPrice != null &&
        Number.isFinite(Number(lastPrice)) &&
        (() => {
          const y = priceToY(Number(lastPrice));
          return (
            <line
              x1={pad}
              y1={y}
              x2={w - pad}
              y2={y}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          );
        })()}

      {/* Entry markers */}
      {Array.isArray(entries) &&
        entries.map((entry, i) => {
          const price = Number(entry?.price ?? entry?.entry ?? null);
          if (!Number.isFinite(price)) return null;
          const y = priceToY(price);
          const entryColor = entry?.color || "#33a0ff";
          return (
            <line
              key={`entry-${i}`}
              x1={pad}
              y1={y}
              x2={w - pad}
              y2={y}
              stroke={entryColor}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          );
        })}
    </svg>
  );
}
