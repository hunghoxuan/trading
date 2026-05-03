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

function liveTfToTvInterval(tf) {
  const s = String(tf || "4h").toLowerCase();
  if (s === "d" || s === "1d") return "D";
  if (s === "w" || s === "1w") return "W";
  return s.toUpperCase();
}
function toModeKey(m) {
  const s = String(m || "").toLowerCase();
  if (s === "live" || s === "live tv") return "live";
  if (s === "snapshot") return "snapshot";
  return "fixed";
}

function timeAgo(ms) {
  if (!ms) return null;
  const diff = Date.now() - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

// ── StatusModal ────────────────────────────────────────────────────

function StatusModal({ open, onClose, status, error, master }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
          maxWidth: 500,
          maxHeight: "80vh",
          overflow: "auto",
          minWidth: 320,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span style={{ fontWeight: 700 }}>
            Status: {STATUS_LABELS[status] || status}
          </span>
          <button
            className="secondary-button"
            onClick={onClose}
            style={{ padding: "2px 8px" }}
          >
            X
          </button>
        </div>
        {error && (
          <div
            style={{
              color: "#ef4444",
              fontSize: 12,
              marginBottom: 8,
              padding: 8,
              background: "rgba(239,68,68,0.1)",
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}
        {master && (
          <pre
            style={{
              fontSize: 10,
              color: "var(--muted)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: 400,
              overflow: "auto",
            }}
          >
            {JSON.stringify(master, null, 2)}
          </pre>
        )}
        {!error && !master && (
          <span className="minor-text">No cached data</span>
        )}
      </div>
    </div>
  );
}

// ── SymbolChart ────────────────────────────────────────────────────

export function SymbolChart({
  symbol,
  timeframes = ["D", "4h", "15m", "5m"],
  defaultMode = "Live TV",
  onAnalyze,
  onRemove,
  inWatchlist = false,
}) {
  const [mode, setMode] = useState(defaultMode);
  const modeKey = toModeKey(mode);
  const [modalOpen, setModalOpen] = useState(false);

  const { status, master, error, cachedAt, refresh, liveKey, snapshotState } =
    useSymbolChartData({ symbol, timeframes, mode: modeKey });

  const color = STATUS_COLORS[status] || STATUS_COLORS.IDLE;
  const sortedTfs = [...timeframes].sort((a, b) => {
    const order = { d: 0, w: 0, "4h": 1, "1h": 2, "15m": 3, "5m": 4, "1m": 5 };
    return (
      (order[String(a).toLowerCase()] ?? 9) -
      (order[String(b).toLowerCase()] ?? 9)
    );
  });

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

  // ── render ──────────────────────────────────────────────────────

  return (
    <div className="browser-card-v1" style={{ position: "relative" }}>
      {/* ── Control Bar ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{symbol}</span>
          {onRemove && (
            <button
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
                onRemove(symbol);
              }}
              title="Remove"
            >
              -
            </button>
          )}
          <select
            className="secondary-button"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ padding: "2px 4px", fontSize: 10, height: 22 }}
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Status button */}
          <button
            className="secondary-button"
            onClick={() => setModalOpen(true)}
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
          </button>
          {/* Cached time */}
          {cachedAt && (
            <span style={{ fontSize: 9, color: "var(--muted)" }}>
              {timeAgo(cachedAt)}
            </span>
          )}
          {/* Refresh */}
          <button
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
            title="Refresh"
          >
            {status === "LOADING" ? "\u23F3" : "\u21BB"}
          </button>
          {/* Analyze */}
          <button
            className="primary-button"
            style={{ padding: "2px 8px", fontSize: 10 }}
            onClick={() => onAnalyze?.(symbol, timeframes)}
          >
            Analyze
          </button>
        </div>
      </div>

      {/* Snapshot pipeline stage */}
      {modeKey === "snapshot" &&
        snapshotState?.message &&
        snapshotState.stage !== "idle" && (
          <div
            className="minor-text"
            style={{
              fontSize: 9,
              color: snapshotState.stage === "error" ? "#ef4444" : "#f59e0b",
              marginBottom: 4,
            }}
          >
            {snapshotState.message}
          </div>
        )}

      {/* Error */}
      {error && (
        <div
          className="minor-text"
          style={{ color: "#ef4444", fontSize: 10, marginBottom: 4 }}
        >
          {error}
        </div>
      )}

      {/* Charts — one per TF, higher TF first */}
      {mode === "Live TV" ? (
        sortedTfs.map((tf) => (
          <div key={tf} style={{ marginBottom: 8 }}>
            <div
              style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}
            >
              {tf.toUpperCase()}
            </div>
            <iframe
              key={`tv-${symbol}-${tf}-${liveKey}`}
              title={`tv-${symbol}-${tf}`}
              className="browser-chart-v1"
              style={{ height: 160 }}
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(liveTfToTvInterval(tf))}&theme=dark&style=1&locale=en&toolbarbg=%230f1729&hide_top_toolbar=1&hide_legend=1&saveimage=0`}
            />
          </div>
        ))
      ) : (
        <>
          {status === "LOADING" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
              className="minor-text"
            >
              Loading...
            </div>
          )}
          {sortedTfs.map((tf) => (
            <div key={tf} style={{ marginBottom: 8 }}>
              <div
                style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}
              >
                {tf.toUpperCase()}
                {master?.snapshots?.[tf.toLowerCase()] && (
                  <span
                    style={{ marginLeft: 8, color: "#10b981", fontSize: 9 }}
                  >
                    📷{" "}
                    {master.snapshots[tf.toLowerCase()].file_name || "snapshot"}
                  </span>
                )}
              </div>
              <TradeSignalChart
                symbol={symbol}
                interval={tf}
                analysisSnapshot={null}
                entryPrice={null}
                slPrice={null}
                tpPrice={null}
              />
            </div>
          ))}
        </>
      )}

      {/* Status Modal */}
      <StatusModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        status={status}
        error={error}
        master={master}
      />
    </div>
  );
}
