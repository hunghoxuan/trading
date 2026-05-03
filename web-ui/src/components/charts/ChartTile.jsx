import { useState, useCallback, useMemo, useRef, useEffect } from "react";
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

export function SymbolChart({
  symbol,
  timeframes = ["D", "4h", "15m", "5m"],
  defaultMode = "live",
  onAnalyze,
  onRemove,
}) {
  const [mode, setMode] = useState(defaultMode);
  const [pendingMode, setPendingMode] = useState(null); // mode we're loading
  const [lastError, setLastError] = useState(null);
  const cleanSym = useMemo(() => normSym(symbol), [symbol]);

  const { status, master, error, cachedAt, refresh, liveKey, snapshotState } =
    useSymbolChartData({
      symbol: cleanSym,
      timeframes,
      mode: pendingMode || mode,
    });

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

  // Track per-mode cached time (bars vs snapshots)
  const barsCachedAt = useMemo(() => {
    const hasBars = Object.values(master?.bars || {}).some(
      (b) => Array.isArray(b) && b.length > 0,
    );
    return hasBars ? master?.cached_at || cachedAt : null;
  }, [master, cachedAt]);

  const snapsCachedAt = useMemo(() => {
    const hasSnaps = Object.values(master?.snapshots || {}).some(
      (s) => s?.uploaded_at,
    );
    if (!hasSnaps) return null;
    // Find latest uploaded_at among all snapshots
    let latest = 0;
    for (const s of Object.values(master?.snapshots || {})) {
      if (s?.uploaded_at && s.uploaded_at > latest) latest = s.uploaded_at;
    }
    return latest || null;
  }, [master]);

  // When loading finishes, either switch to pending mode or record error
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === "LOADING" && status !== "LOADING") {
      if (status === "READY" || status === "STALE") {
        // Data loaded — switch to pending mode
        if (pendingMode) {
          setMode(pendingMode);
          setPendingMode(null);
        }
        setLastError(null);
      } else if (status === "ERROR") {
        setLastError(error || "Fetch failed");
        setPendingMode(null);
      }
    }
    prevStatus.current = status;
  }, [status, error, pendingMode]);

  const hasAnyBars = useMemo(
    () =>
      Object.values(master?.bars || {}).some(
        (b) => Array.isArray(b) && b.length > 0,
      ),
    [master],
  );

  const needsFallback = mode !== "live" && !hasAnyBars && status !== "LOADING";

  const handleModeClick = useCallback((newMode) => {
    if (newMode === "live") {
      setMode("live");
      setPendingMode(null);
      setLastError(null);
      return;
    }
    // Just set pending — hook detects mode change, checks cache, fetches if needed
    setPendingMode(newMode);
    setLastError(null);
  }, []);

  const btnColor = (m) => {
    const active = pendingMode || mode;
    if (m !== active) return "var(--muted)";
    if (m === "live") return "var(--muted)";
    if (status === "LOADING") return STATUS_COLORS.LOADING;
    if (lastError || error) return STATUS_COLORS.ERROR;
    if (m === "cache" && barsCachedAt) return STATUS_COLORS.READY;
    if (m === "snapshots" && snapsCachedAt) return STATUS_COLORS.READY;
    return "var(--muted)";
  };

  const btnTitle = (m) => {
    const active = pendingMode || mode;
    if (m !== active) return MODE_LABELS[m];
    if (lastError || error) return lastError || error;
    if (m === "cache" && barsCachedAt)
      return "Bars cached " + timeAgo(barsCachedAt);
    if (m === "snapshots" && snapsCachedAt)
      return "Snapshots cached " + timeAgo(snapsCachedAt);
    if (status === "LOADING") return "Loading...";
    return MODE_LABELS[m] + " (no data)";
  };

  const chartHeight = 250;

  return (
    <div className="browser-card-v1" style={{ position: "relative" }}>
      {/* ── Header ── */}
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
          {/* Status inline */}
          {(pendingMode || mode) === "snapshots" &&
            snapshotState?.message &&
            snapshotState.stage !== "idle" && (
              <span
                className="minor-text"
                style={{
                  fontSize: 9,
                  color:
                    snapshotState.stage === "error" ? "#ef4444" : "#f59e0b",
                }}
              >
                {snapshotState.message}
              </span>
            )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {MODES.map((m) => (
            <button
              key={m}
              className="secondary-button"
              onClick={() => handleModeClick(m)}
              disabled={status === "LOADING"}
              title={btnTitle(m)}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 4,
                color: btnColor(m),
                borderColor:
                  (pendingMode || mode) === m
                    ? btnColor(m) + "60"
                    : "var(--border)",
                background:
                  (pendingMode || mode) === m
                    ? btnColor(m) + "12"
                    : "transparent",
              }}
            >
              {MODE_LABELS[m]}
              {(pendingMode || mode) === m && status === "LOADING" && " \u23F3"}
            </button>
          ))}
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
          <button
            className="primary-button"
            style={{ padding: "2px 8px", fontSize: 10 }}
            onClick={() => onAnalyze?.(symbol, timeframes)}
          >
            Analyze
          </button>
        </div>
      </div>

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

      {/* Error display */}
      {(lastError || error) && (
        <div style={{ marginTop: 4, fontSize: 9, color: "#ef4444" }}>
          {lastError || error}
        </div>
      )}
    </div>
  );
}
