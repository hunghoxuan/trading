import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function ChartSnapshotsPage() {
  const [symbol, setSymbol] = useState("OANDA:UK100GBP");
  const [timeframe, setTimeframe] = useState("5");
  const [provider, setProvider] = useState("");
  const [theme, setTheme] = useState("dark");
  const [width, setWidth] = useState(1400);
  const [height, setHeight] = useState(900);
  const [limit, setLimit] = useState(30);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  const previewTitle = useMemo(() => `${symbol} • ${timeframe}`, [symbol, timeframe]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const out = await api.chartSnapshots(limit);
      setItems(Array.isArray(out.items) ? out.items : []);
    } catch (e) {
      setError(String(e?.message || e || "Failed to load snapshots."));
    } finally {
      setLoading(false);
    }
  };

  const capture = async () => {
    setCapturing(true);
    setError("");
    try {
      const out = await api.chartSnapshotCreate({
        symbol: String(symbol || "").trim(),
        timeframe: String(timeframe || "").trim(),
        provider: String(provider || "").trim(),
        theme: String(theme || "dark"),
        width: Number(width || 1400),
        height: Number(height || 900),
      });
      if (out?.item) {
        setItems((prev) => [out.item, ...prev].slice(0, limit));
      }
    } catch (e) {
      setError(String(e?.message || e || "Capture failed."));
    } finally {
      setCapturing(false);
    }
  };

  useEffect(() => {
    load();
  }, [limit]);

  return (
    <div className="page-grid">
      <section className="panel" style={{ marginBottom: 12 }}>
        <h2 style={{ marginTop: 0 }}>Chart Snapshots (Test)</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          Create server-side chart screenshots for quick review.
        </p>

        <div className="filters-row">
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol (e.g. OANDA:UK100GBP)" />
          <input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} placeholder="TF (e.g. 5, 15, 60, D)" />
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider (optional)" />
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="dark">dark</option>
            <option value="light">light</option>
          </select>
          <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value || 1400))} placeholder="Width" />
          <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value || 900))} placeholder="Height" />
          <button className="btn-primary" onClick={capture} disabled={capturing}>
            {capturing ? "Capturing..." : "Capture Snapshot"}
          </button>
          <button className="secondary-button" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="filters-row" style={{ marginTop: 8 }}>
          <label className="muted">Gallery size:</label>
          <input type="number" value={limit} min={1} max={200} onChange={(e) => setLimit(Math.max(1, Math.min(200, Number(e.target.value || 30))))} />
          <span className="muted">Current: {previewTitle}</span>
        </div>
        {error ? <div className="error-banner" style={{ marginTop: 10 }}>{error}</div> : null}
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Latest Snapshots ({items.length})</h3>
        {items.length === 0 ? (
          <div className="muted">No snapshots yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12 }}>
            {items.map((it) => (
              <article key={it.id} className="panel" style={{ margin: 0, padding: 10 }}>
                <div className="muted" style={{ marginBottom: 8 }}>
                  {it.file_name} • {it.created_at}
                </div>
                <a href={it.url} target="_blank" rel="noreferrer">
                  <img src={it.url} alt={it.file_name} style={{ width: "100%", borderRadius: 6, border: "1px solid var(--border)" }} />
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
