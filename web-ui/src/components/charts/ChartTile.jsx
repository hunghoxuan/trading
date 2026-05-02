import { useState, useMemo } from "react";
import { useChartTileData } from "../../hooks/useChartTileData";

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

const MODES = ["Live TV", "Fixed Data"];

function liveTfToTvInterval(tf) {
  const s = String(tf || "4h").toLowerCase();
  if (s === "d" || s === "1d") return "D";
  if (s === "w" || s === "1w") return "W";
  return s.toUpperCase();
}

/**
 * ChartTile — independent per-chart card.
 * Props: symbol (required), timeframe (required), provider, bars?, entries?, defaultMode, onSelect, onAddWatchlist, onRemoveWatchlist, inWatchlist
 */
export function ChartTile({
  symbol,
  timeframe,
  provider = "ICMARKETS",
  bars: initialBars,
  entries,
  defaultMode = "fixed",
  onSelect,
  onAddWatchlist,
  onRemoveWatchlist,
  inWatchlist = false,
}) {
  const [mode, setMode] = useState(defaultMode);
  const modeKey = mode === "Live TV" ? "live" : "fixed";
  const { status, data, error, refresh } = useChartTileData({
    symbol,
    timeframe,
    provider,
    mode: modeKey,
  });

  const displayBars = useMemo(() => {
    if (data?.bars?.length) return data.bars;
    if (Array.isArray(initialBars) && initialBars.length) return initialBars;
    return [];
  }, [data, initialBars]);

  const lastPrice = data?.last_price ?? null;
  const color = STATUS_COLORS[status] || STATUS_COLORS.IDLE;

  return (
    <div className="browser-card-v1" style={{ position: "relative" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{symbol}</span>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{timeframe}</span>
          {/* Status badge */}
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 4,
              background: color + "20",
              color: color,
              border: `1px solid ${color}40`,
            }}
          >
            {STATUS_LABELS[status] || status}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {/* Watchlist +/- */}
          {inWatchlist ? (
            <button
              type="button"
              className="secondary-button"
              style={{ width: 18, height: 18, padding: 0, fontSize: 10, lineHeight: 1, minWidth: 18, borderRadius: 4, color: "rgba(239,68,68,0.5)", borderColor: "rgba(239,68,68,0.25)" }}
              onClick={(e) => { e.stopPropagation(); onRemoveWatchlist?.(symbol); }}
              title={"Remove " + symbol}
            >-</button>
          ) : (
            <button
              type="button"
              className="secondary-button"
              style={{ width: 18, height: 18, padding: 0, fontSize: 10, lineHeight: 1, minWidth: 18, borderRadius: 4, color: "var(--muted)", borderColor: "rgba(255,255,255,0.08)" }}
              onClick={(e) => { e.stopPropagation(); onAddWatchlist?.(symbol); }}
              title={"Add " + symbol + " to watchlist"}
            >+</button>
          )}
          {/* Mode toggle */}
          <select
            className="secondary-button"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ padding: "2px 4px", fontSize: 10, height: 22 }}
          >
            {MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {/* Refresh */}
          <button
            type="button"
            className="secondary-button"
            style={{ width: 22, height: 22, padding: 0, fontSize: 11, lineHeight: 1, minWidth: 22 }}
            onClick={(e) => { e.stopPropagation(); refresh(); }}
            disabled={status === "LOADING"}
            title="Chart Sync refresh"
          >
            {status === "LOADING" ? "⏳" : "↻"}
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

      {/* Error display */}
      {error && (
        <div className="minor-text" style={{ color: "#ef4444", fontSize: 10, marginBottom: 4 }}>
          {error}
        </div>
      )}

      {/* Chart content */}
      {mode === "Live TV" ? (
        <iframe
          title={`tile-${symbol}-${timeframe}`}
          className="browser-chart-v1"
          style={{ height: 200 }}
          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(liveTfToTvInterval(timeframe))}&theme=dark&style=1&locale=en&toolbarbg=%230f1729&hide_top_toolbar=1&hide_legend=1&saveimage=0`}
        />
      ) : (
        <div style={{ position: "relative", minHeight: 200 }}>
          {status === "LOADING" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", zIndex: 2 }}>
              <span className="minor-text">Chart Sync loading...</span>
            </div>
          )}
          {displayBars.length > 0 ? (
            <MiniBarsChart bars={displayBars} lastPrice={lastPrice} />
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }} className="minor-text">
              {status === "IDLE" ? "Chart Sync pending..." : "No data"}
            </div>
          )}
        </div>
      )}

      {/* Footer: last price */}
      {lastPrice != null && (
        <div style={{ marginTop: 4, fontSize: 11, color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
          <span>Last: {Number(lastPrice).toFixed(5)}</span>
          {data?.updated_time && <span>{new Date(data.updated_time).toLocaleTimeString()}</span>}
        </div>
      )}
    </div>
  );
}

/** Minimal SVG bar chart for Fixed Data mode. */
function MiniBarsChart({ bars, lastPrice }) {
  if (!bars.length) return null;
  const w = 280, h = 180, pad = 4;
  const closes = bars.map((b) => Number(b.close)).filter(Number.isFinite);
  if (!closes.length) return null;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const barW = Math.max(1, (w - pad * 2) / closes.length - 1);

  const points = closes.map((c, i) => {
    const x = pad + i * (barW + 1);
    const y = h - pad - ((c - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} style={{ display: "block", background: "transparent" }}>
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth={1} />
      {closes.map((c, i) => {
        const x = pad + i * (barW + 1);
        const y = h - pad - ((c - min) / range) * (h - pad * 2);
        return <circle key={i} cx={x} cy={y} r={1} fill="#22d3ee" />;
      })}
      {lastPrice != null && (() => {
        const y = h - pad - ((Number(lastPrice) - min) / range) * (h - pad * 2);
        return <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="4 2" />;
      })()}
    </svg>
  );
}
