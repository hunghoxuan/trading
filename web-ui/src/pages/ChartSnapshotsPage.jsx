import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const DEFAULT_CLAUDE_PROMPT = `Act as a Senior Algo-Trader. Task: Analyze {SYMBOL} on {TIMEFRAME: default 15m} using {STRATEGY: default Price Action}.
Execution Logic:

Context First: Establish Weekly, Daily, and 4H Bias. If HTF (Higher Timeframe) alignment is absent, prioritize the dominant trend (Trendfolge).
Constraint Check: Execute entry ONLY if a high-probability confluence (Zusammenfluss) exists.
Risk Management: Min RR must be {RR}. If no valid setup meets the criteria, return null for trade levels.
Volatility Selection: If {SYMBOL} is unspecified, analyze the top 3 high-volume pairs with the highest winning probability (Gewinnwahrscheinlichkeit). Output: Return ONLY a raw JSON object (no prose, no markdown).`;

function replacePromptVars(template, vars) {
  return String(template || "")
    .replace(/{SYMBOL}/g, vars.symbol || "")
    .replace(/{TIMEFRAME: default 15m}/g, vars.timeframe || "15m")
    .replace(/{TIMEFRAME}/g, vars.timeframe || "15m")
    .replace(/{STRATEGY: default Price Action}/g, vars.strategy || "Price Action")
    .replace(/{STRATEGY}/g, vars.strategy || "Price Action")
    .replace(/{RR}/g, vars.rr || "1:2");
}

function normalizeNoteForStorage(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function extractSignalsFromAnalysis(parsed, fallback = {}) {
  if (!parsed || typeof parsed !== "object") return [];
  let rows = [];
  if (Array.isArray(parsed)) rows = parsed;
  else if (Array.isArray(parsed.signals)) rows = parsed.signals;
  else rows = [parsed];

  return rows
    .map((s) => {
      const sideRaw = String(s?.side || s?.direction || "").toUpperCase();
      const action = sideRaw.includes("SELL") ? "SELL" : "BUY";
      const entry = Number(s?.entry ?? s?.price ?? 0);
      const sl = Number(s?.sl ?? s?.stop_loss ?? 0);
      const tp = Number(s?.tp ?? s?.take_profit ?? 0);
      return {
        symbol: String(s?.symbol || fallback.symbol || "").trim(),
        action,
        entry,
        sl,
        tp,
        tf: String(s?.timeframe || fallback.timeframe || "15m").trim(),
        model: String(s?.entry_model || "ai_claude"),
        entry_model: String(s?.entry_model || "ai_claude"),
        note: normalizeNoteForStorage(s?.note ?? s),
        source: "ai",
        strategy: "ai",
      };
    })
    .filter((x) => x.symbol && Number.isFinite(x.entry) && Number.isFinite(x.sl) && Number.isFinite(x.tp) && x.entry > 0 && x.sl > 0 && x.tp > 0);
}

export default function ChartSnapshotsPage() {
  const [symbol, setSymbol] = useState("ICMARKETS:UK100");
  const [timeframe, setTimeframe] = useState("15m");
  const [provider, setProvider] = useState("ICMARKETS");
  const [theme, setTheme] = useState("dark");
  const [width, setWidth] = useState(960);
  const [height, setHeight] = useState(540);
  const [lookbackBars, setLookbackBars] = useState(300);
  const [format, setFormat] = useState("jpg");
  const [quality, setQuality] = useState(55);
  const [limit, setLimit] = useState(30);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [claudePromptTemplate, setClaudePromptTemplate] = useState(DEFAULT_CLAUDE_PROMPT);
  const [analyzing, setAnalyzing] = useState(false);
  const [addingSignal, setAddingSignal] = useState(false);
  const [analysisRaw, setAnalysisRaw] = useState("");
  const [analysisJson, setAnalysisJson] = useState("");
  const [analysisParsed, setAnalysisParsed] = useState(null);
  const [symbolOptions, setSymbolOptions] = useState([]);

  const previewTitle = useMemo(() => `${symbol} • ${timeframe}`, [symbol, timeframe]);
  const claudePrompt = useMemo(() => replacePromptVars(claudePromptTemplate, {
    symbol: symbol || "BTCUSDT",
    timeframe: timeframe || "15m",
    strategy: "Price Action",
    rr: "1:2",
  }), [claudePromptTemplate, symbol, timeframe]);

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

  const captureOne = async () => {
    setCapturing(true);
    setError("");
    try {
      const out = await api.chartSnapshotCreate({
        symbol: String(symbol || "").trim(),
        timeframe: String(timeframe || "").trim(),
        provider: String(provider || "").trim(),
        theme: String(theme || "dark"),
        width: Number(width || 960),
        height: Number(height || 540),
        lookbackBars: Number(lookbackBars || 300),
        format: String(format || "jpg"),
        quality: Number(quality || 55),
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

  const captureThreeTF = async () => {
    setCapturing(true);
    setError("");
    try {
      const out = await api.chartSnapshotCreateBatch({
        symbol: String(symbol || "").trim(),
        provider: String(provider || "").trim(),
        timeframes: ["15m", "4h", "1D"],
        theme: String(theme || "dark"),
        width: Number(width || 960),
        height: Number(height || 540),
        lookbackBars: Number(lookbackBars || 300),
        format: String(format || "jpg"),
        quality: Number(quality || 55),
      });
      if (Array.isArray(out?.items) && out.items.length) {
        setItems((prev) => [...out.items, ...prev].slice(0, limit));
      }
    } catch (e) {
      setError(String(e?.message || e || "Batch capture failed."));
    } finally {
      setCapturing(false);
    }
  };

  const analyzeLatestThree = async () => {
    setAnalyzing(true);
    setError("");
    setAnalysisRaw("");
    setAnalysisJson("");
    setAnalysisParsed(null);
    try {
      const out = await api.chartSnapshotsAnalyze({
        model: "claude-sonnet-4-0",
        prompt: claudePrompt,
      });
      const raw = String(out?.raw_response || "");
      setAnalysisRaw(raw);
      if (out?.parsed_json) {
        setAnalysisParsed(out.parsed_json);
        setAnalysisJson(JSON.stringify(out.parsed_json, null, 2));
      } else {
        setAnalysisParsed(null);
        setAnalysisJson("");
      }
    } catch (e) {
      setError(String(e?.message || e || "Claude analysis failed."));
    } finally {
      setAnalyzing(false);
    }
  };

  const addToSignal = async () => {
    setAddingSignal(true);
    setError("");
    try {
      let parsed = analysisParsed;
      if (!parsed && analysisJson) {
        parsed = JSON.parse(analysisJson);
      }
      const signals = extractSignalsFromAnalysis(parsed, { symbol, timeframe });
      if (!signals.length) throw new Error("No valid signal found in analysis JSON.");
      for (const payload of signals) {
        await api.createTrade(payload);
      }
      setError(`Added ${signals.length} signal(s) successfully.`);
    } catch (e) {
      setError(String(e?.message || e || "Add to Signal failed."));
    } finally {
      setAddingSignal(false);
    }
  };

  const setUltraSmall = () => {
    setWidth(640);
    setHeight(360);
    setFormat("jpg");
    setQuality(45);
  };

  useEffect(() => {
    load();
  }, [limit]);

  useEffect(() => {
    const q = String(symbol || "").trim();
    const plain = q.includes(":") ? q.split(":").slice(1).join(":") : q;
    if (!plain || plain.length < 2) {
      setSymbolOptions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const out = await api.chartSymbols(plain, provider || "ICMARKETS", 8);
        const items = Array.isArray(out?.items) ? out.items : [];
        setSymbolOptions(items.map((x) => x.full_symbol || x.symbol).filter(Boolean));
      } catch {
        setSymbolOptions([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [symbol, provider]);

  return (
    <div className="page-grid">
      <section className="panel" style={{ marginBottom: 12 }}>
        <h2 style={{ marginTop: 0 }}>Chart Snapshots (Test)</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          Faster capture with zoom/lookback control and 3-TF batch mode.
        </p>

        <div className="filters-row">
          <input list="tv-symbol-options" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol (e.g. ICMARKETS:UK100)" />
          <datalist id="tv-symbol-options">
            {symbolOptions.map((opt) => <option key={opt} value={opt} />)}
          </datalist>
          <input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} placeholder="TF (e.g. 15m, 4h, 1D)" />
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider (e.g. ICMARKETS)" />
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="dark">dark</option>
            <option value="light">light</option>
          </select>
        </div>

        <div className="filters-row" style={{ marginTop: 8 }}>
          <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value || 960))} placeholder="Width" />
          <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value || 540))} placeholder="Height" />
          <input type="number" value={lookbackBars} min={50} max={5000} onChange={(e) => setLookbackBars(Number(e.target.value || 300))} placeholder="Lookback bars" />
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="jpg">jpg (small)</option>
            <option value="png">png (sharp)</option>
          </select>
          <input type="number" value={quality} min={20} max={95} onChange={(e) => setQuality(Number(e.target.value || 55))} placeholder="JPEG quality" />
          <button className="secondary-button" onClick={setUltraSmall}>Ultra Small</button>
          <button className="btn-primary" onClick={captureOne} disabled={capturing}>
            {capturing ? "Capturing..." : "Capture 1 TF"}
          </button>
          <button className="btn-primary" onClick={captureThreeTF} disabled={capturing}>
            {capturing ? "Capturing..." : "Capture 3 TF (15m/4h/1D)"}
          </button>
          <button className="btn-primary" onClick={analyzeLatestThree} disabled={capturing || analyzing}>
            {analyzing ? "Analyzing..." : "Analyze Latest 3 (Claude)"}
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

      <section className="panel" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Claude Prompt Template</h3>
        <p className="muted" style={{ marginTop: -6 }}>
          Use this prompt with the 3 snapshot files in Claude.ai.
        </p>
        <textarea
          rows={8}
          style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
          value={claudePromptTemplate}
          onChange={(e) => setClaudePromptTemplate(e.target.value)}
        />
        <label className="minor-text">Resolved prompt</label>
        <textarea rows={6} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} value={claudePrompt} readOnly />
        <a href="https://claude.ai/" target="_blank" rel="noreferrer">Open Claude.ai</a>
      </section>

      <section className="panel" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Claude Analysis Result</h3>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button className="btn-primary" onClick={addToSignal} disabled={addingSignal || !analysisJson}>
            {addingSignal ? "Adding..." : "Add To Signal"}
          </button>
        </div>
        {analysisJson ? (
          <>
            <label className="minor-text">Parsed JSON</label>
            <textarea rows={10} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} value={analysisJson} readOnly />
          </>
        ) : null}
        <label className="minor-text">Raw response</label>
        <textarea rows={8} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} value={analysisRaw} readOnly />
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Latest Snapshots ({items.length})</h3>
        {items.length === 0 ? (
          <div className="muted">No snapshots yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
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
