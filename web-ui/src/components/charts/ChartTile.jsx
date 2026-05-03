import { useState, useCallback, useMemo } from "react";
import { useSymbolChartData } from "../../hooks/useChartTileData";
import TradeSignalChart from "../TradeSignalChart";

const MODES = ["live", "cache", "snapshots"];
const MODE_LABELS = { live: "Live", cache: "Cache", snapshots: "Snapshots" };
const STATUS_COLORS = {
  IDLE: "var(--muted)",
  LOADING: "#f59e0b",
  READY: "#10b981",
  STALE: "#f59e0b",
  ERROR: "#ef4444",
};

function liveTfToTvInterval(tf) {
  const s = String(tf || "4h").toLowerCase();
  if (s === "d" || s === "1d") return "D";
  if (s === "w" || s === "1w") return "W";
  return s.toUpperCase();
}
function normSym(s) {
  // Strip provider prefix: ICMARKETS:EURUSD → EURUSD
  const raw = String(s || "")
    .trim()
    .toUpperCase();
  if (raw.includes(":")) return raw.split(":").pop().trim().toUpperCase();
  return raw;
}

function timeAgo(ms) {
  if (!ms) return null;
  const diff = Date.now() - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

// Status modal
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
          <span style={{ fontWeight: 700 }}>Status: {status}</span>
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

export function SymbolChart({
  symbol,
  timeframes = ["D", "4h", "15m", "5m"],
  defaultMode = "live",
  onAnalyze,
  onRemove,
}) {
  const [mode, setMode] = useState(defaultMode);
  const [modalOpen, setModalOpen] = useState(false);
  const cleanSym = useMemo(() => normSym(symbol), [symbol]);

  const { status, master, error, cachedAt, refresh, liveKey, snapshotState } =
    useSymbolChartData({ symbol: cleanSym, timeframes, mode });

  const sortedTfs = useMemo(
    () =>
      [...timeframes].sort((a, b) => {
        const order = {
          d: 0,
          w: 0,
          "4h": 1,
          "1h": 2,
          "15m": 3,
          "5m": 4,
          "1m": 5,
        };
        return (
          (order[String(a).toLowerCase()] ?? 9) -
          (order[String(b).toLowerCase()] ?? 9)
        );
      }),
    [timeframes],
  );

  // Per-mode status for button colors
  const modeStatus = useMemo(() => {
    if (mode === "live") return "IDLE"; // Live never errors
    if (status === "LOADING") return "LOADING";
    if (error) return "ERROR";
    const hasBars = Object.values(master?.bars || {}).some(
      (b) => Array.isArray(b) && b.length > 0,
    );
    if (hasBars) return "READY";
    return "IDLE"; // no data yet
  }, [mode, status, error, master]);

  const hasAnyData = useMemo(() => {
    return Object.values(master?.bars || {}).some(
      (b) => Array.isArray(b) && b.length > 0,
    );
  }, [master]);

  const handleRefresh = useCallback(
    (newMode) => {
      setMode(newMode);
      if (newMode === "live") return; // no fetch
      refresh({ force: true });
    },
    [refresh],
  );

  const btnColor = (m) => {
    if (m !== mode) return "var(--muted)"; // inactive mode
    const c = STATUS_COLORS[modeStatus] || "var(--muted)";
    return c;
  };

  const btnTitle = (m) => {
    if (m !== mode) return MODE_LABELS[m];
    if (error) return error;
    if (cachedAt && hasAnyData) return "Cached " + timeAgo(cachedAt);
    if (status === "LOADING") return "Loading...";
    return MODE_LABELS[m];
  };

  const chartHeight = 180;
  const needsFallback = mode !== "live" && !hasAnyData && status !== "LOADING";

  return (
    <div className="browser-card-v1" style={{ position: "relative" }}>
      {/* ── Header: Symbol | Live Cache Snapshots | Analyze ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
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
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Mode buttons: Live | Cache | Snapshots */}
          {MODES.map((m) => (
            <button
              key={m}
              className="secondary-button"
              onClick={() => handleRefresh(m)}
              disabled={status === "LOADING" && m === mode}
              title={btnTitle(m)}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 4,
                color: btnColor(m),
                borderColor: mode === m ? btnColor(m) + "60" : "var(--border)",
                background: mode === m ? btnColor(m) + "12" : "transparent",
              }}
            >
              {MODE_LABELS[m]}
              {mode === m && status === "LOADING" && " \u23F3"}
            </button>
          ))}
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
            onClick={() => mode !== "live" && refresh({ force: true })}
            disabled={status === "LOADING" || mode === "live"}
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

      {/* Snapshot pipeline message */}
      {mode === "snapshots" &&
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

      {/* ── Charts row ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(mode === "live" || needsFallback ? sortedTfs : []).map((tf) => (
          <div key={`live-${tf}`} style={{ flex: "1 1 0", minWidth: 140 }}>
            <div
              style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}
            >
              {tf.toUpperCase()}
            </div>
            <iframe
              key={`tv-${symbol}-${tf}-${liveKey}`}
              title={`tv-${symbol}-${tf}`}
              className="browser-chart-v1"
              style={{ height: chartHeight }}
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(cleanSym)}&interval=${encodeURIComponent(liveTfToTvInterval(tf))}&theme=dark&style=1&locale=en&toolbarbg=%230f1729&hide_top_toolbar=1&hide_legend=1&saveimage=0`}
            />
          </div>
        ))}
        {mode !== "live" &&
          !needsFallback &&
          sortedTfs.map((tf) => (
            <div key={`cache-${tf}`} style={{ flex: "1 1 0", minWidth: 140 }}>
              <div
                style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}
              >
                {tf.toUpperCase()}
                {master?.snapshots?.[tf.toLowerCase()] && (
                  <span
                    style={{ marginLeft: 6, color: "#10b981", fontSize: 9 }}
                  >
                    📷 {master.snapshots[tf.toLowerCase()].file_name || "snap"}
                  </span>
                )}
              </div>
              <TradeSignalChart
                symbol={cleanSym}
                interval={tf}
                analysisSnapshot={null}
                entryPrice={null}
                slPrice={null}
                tpPrice={null}
              />
            </div>
          ))}
      </div>

      {/* Cached time footer */}
      {cachedAt && hasAnyData && (
        <div
          style={{
            marginTop: 6,
            fontSize: 9,
            color: "var(--muted)",
            textAlign: "right",
          }}
        >
          Cached {timeAgo(cachedAt)}
        </div>
      )}

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
