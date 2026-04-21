import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const STORAGE_KEY = "chart_prompt_builder_templates_v1";

const GUIDE_TEXT = `FIELD GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYMBOL: Trading instrument (XAUUSD, BTCUSDT, UK100)
ASSET_CLASS: Forex | Crypto | Index | Commodity | Stock
SESSION: Preferred execution session
MIN_RR: Minimum Reward:Risk gate
MAX_RISK_PCT: % risk per setup

TIMEFRAME ARRAY
HTF_BIAS: trend and structure context
EXECUTION: setup discovery timeframe
CONFIRMATION: trigger timeframe

CONFLUENCE GATE
Require at least 3 aligned factors before entry.

OUTPUT KEYS
htf_bias, structure, confluence_factors, trade_setup,
risk_management, invalidation, confidence_pct, final_verdict`;

const STRATEGIES = ["ICT", "SMC", "Price Action", "Wyckoff", "EMA Trend", "Breakout", "VWAP"];
const HTF_OPTIONS = ["W1", "D1", "4H", "2H", "1H"];
const EXEC_OPTIONS = ["1H", "30M", "15M", "5M"];
const CONF_OPTIONS = ["5M", "3M", "1M"];

const DEFAULT_CONFIG = {
  symbol: "UK100",
  asset: "Index",
  session: "Any",
  rr: "1",
  risk: "1",
  strategy: "ICT",
  htf_tfs: ["W1", "D1", "4H"],
  exec_tfs: ["30M", "15M"],
  conf_tfs: ["5M", "1M"],
  htfbias: "",
  dir: "",
  keylevel: "",
  news: "",
  notes: "",
};

function loadTemplates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTemplates(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next || []));
}

function replacePromptVars(template, vars) {
  return String(template || "")
    .replace(/{SYMBOL}/g, vars.symbol || "")
    .replace(/{TIMEFRAME: default 15m}/g, vars.timeframe || "15m")
    .replace(/{TIMEFRAME}/g, vars.timeframe || "15m")
    .replace(/{STRATEGY: default Price Action}/g, vars.strategy || "Price Action")
    .replace(/{STRATEGY}/g, vars.strategy || "Price Action")
    .replace(/{RR}/g, vars.rr || "1:2");
}

function buildPrompt(c) {
  const ctx = [];
  if (c.htfbias) ctx.push(`htf_bias_override: "${c.htfbias}"`);
  if (c.dir) ctx.push(`direction: "${c.dir}"`);
  if (c.keylevel) ctx.push(`key_level: "${c.keylevel}"`);
  if (c.news) ctx.push(`news_risk: "${c.news}"`);
  if (c.session && c.session !== "Any") ctx.push(`session: "${c.session}"`);
  if (c.notes) ctx.push(`notes: "${c.notes}"`);

  const tfJson = JSON.stringify(
    {
      htf_bias_tfs: c.htf_tfs,
      execution_tf: c.exec_tfs,
      confirmation_tf: c.conf_tfs,
    },
    null,
    2,
  );

  return `Act as a Senior Algo-Trader. Analyze the uploaded chart(s).

SYMBOL: ${c.symbol}
ASSET_CLASS: ${c.asset}
STRATEGY: ${c.strategy}
MIN_RR: ${c.rr}
MAX_RISK_PCT: ${c.risk}%
${ctx.length ? `\nCONTEXT:\n${ctx.map((x) => `  ${x}`).join("\n")}\n` : ""}
TIMEFRAME_ARRAY:
${tfJson}

EXECUTION LOGIC:
1. HTF Bias — establish bias on [${c.htf_tfs.join(", ")}]. If misaligned, follow dominant Trendfolge.
2. Execution layer — identify setup on [${c.exec_tfs.join(", ")}] using ${c.strategy}: OBs, FVGs, BOS, CHoCH, liquidity sweeps.
3. Confirmation — wait for entry signal on [${c.conf_tfs.join(", ")}] before committing.
4. Confluence gate — entry ONLY if 3+ confluence factors align (HTF bias + OB/FVG + liquidity + session).
5. RR gate — reject setup if RR < ${c.rr}. Return null for trade levels if no valid setup.
6. News gate — if news_risk is flagged, widen SL by 20% or skip setup entirely.

OUTPUT: Return ONLY a raw JSON object with these exact keys:
{
  "symbol": "",
  "trade_setup": {
    "direction": "",
    "entry": null,
    "sl": null,
    "tp1": null,
    "tp2": null,
    "tp3": null,
    "rr": null,
    "status": ""
  },
  "confluence_factors": [],
  "risk_management": {},
  "invalidation": "",
  "confidence_pct": null,
  "final_verdict": {}
}`;
}

function buildJsonConfig(c) {
  return JSON.stringify(
    {
      version: "2.0",
      saved_at: new Date().toISOString(),
      config: {
        symbol: c.symbol,
        asset_class: c.asset,
        strategy: c.strategy,
        session: c.session,
        min_rr: Number(c.rr),
        max_risk_pct: Number(c.risk),
        timeframe_array: {
          htf_bias_tfs: c.htf_tfs,
          execution_tf: c.exec_tfs,
          confirmation_tf: c.conf_tfs,
        },
        context: {
          htf_bias_override: c.htfbias || null,
          direction: c.dir || null,
          key_level: c.keylevel || null,
          news_risk: c.news || null,
          notes: c.notes || null,
        },
      },
    },
    null,
    2,
  );
}

function toggleTf(arr, tf) {
  return arr.includes(tf) ? arr.filter((x) => x !== tf) : [...arr, tf];
}

function parseNum(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const raw = String(value ?? "").replace(/,/g, " ");
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  if (!m) return NaN;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : NaN;
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

  const rows = [];
  if (Array.isArray(parsed)) rows.push(...parsed);
  if (Array.isArray(parsed.signals)) rows.push(...parsed.signals);
  if (Array.isArray(parsed.trade_setups)) rows.push(...parsed.trade_setups);
  if (parsed.trade_setup && typeof parsed.trade_setup === "object") {
    rows.push({ ...(parsed.trade_setup || {}), symbol: parsed.symbol || fallback.symbol });
  }
  if (!rows.length) rows.push(parsed);

  return rows
    .map((s) => {
      const sideRaw = String(s?.side || s?.direction || s?.action || "").toUpperCase();
      const action = sideRaw.includes("SELL") ? "SELL" : "BUY";
      const entry = parseNum(s?.entry ?? s?.price ?? s?.entry_price);
      const sl = parseNum(s?.sl ?? s?.stop_loss);
      const tp = parseNum(s?.tp ?? s?.take_profit ?? s?.tp1 ?? s?.target);
      const symbol = String(s?.symbol || fallback.symbol || "").trim();
      return {
        symbol,
        action,
        entry,
        sl,
        tp,
        tf: String(s?.timeframe || fallback.timeframe || "15m").trim(),
        model: "ai_claude",
        entry_model: "ai_claude",
        note: normalizeNoteForStorage(s?.note ?? s),
        source: "ai",
        strategy: String(fallback.strategy || "ai"),
      };
    })
    .filter((x) => x.symbol && Number.isFinite(x.entry) && Number.isFinite(x.sl) && Number.isFinite(x.tp) && x.entry > 0 && x.sl > 0 && x.tp > 0);
}

export default function ChartSnapshotsPage() {
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState(() => loadTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");

  const [provider, setProvider] = useState("ICMARKETS");
  const [timeframe, setTimeframe] = useState("15m");
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
  const [analyzing, setAnalyzing] = useState(false);
  const [addingSignal, setAddingSignal] = useState(false);
  const [analysisRaw, setAnalysisRaw] = useState("");
  const [analysisJson, setAnalysisJson] = useState("");
  const [analysisParsed, setAnalysisParsed] = useState(null);
  const [symbolOptions, setSymbolOptions] = useState([]);
  const [tab, setTab] = useState("prompt");
  const [status, setStatus] = useState({ type: "", text: "" });

  const promptText = useMemo(() => buildPrompt(cfg), [cfg]);
  const jsonConfigText = useMemo(() => buildJsonConfig(cfg), [cfg]);
  const totalTfs = cfg.htf_tfs.length + cfg.exec_tfs.length + cfg.conf_tfs.length;

  const resolvedPrompt = useMemo(
    () =>
      replacePromptVars(promptText, {
        symbol: cfg.symbol,
        timeframe,
        strategy: cfg.strategy,
        rr: cfg.rr,
      }),
    [promptText, cfg.symbol, cfg.strategy, cfg.rr, timeframe],
  );

  const tvSymbol = useMemo(() => {
    const base = String(cfg.symbol || "").trim();
    if (!base) return "";
    return base.includes(":") ? base : `${provider}:${base}`;
  }, [cfg.symbol, provider]);

  const loadSnapshots = async () => {
    setLoading(true);
    setStatus({ type: "", text: "" });
    try {
      const out = await api.chartSnapshots(limit);
      setItems(Array.isArray(out.items) ? out.items : []);
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Failed to load snapshots.") });
    } finally {
      setLoading(false);
    }
  };

  const captureSnapshot = async (batch = false) => {
    setCapturing(true);
    setStatus({ type: "", text: "" });
    try {
      if (batch) {
        const out = await api.chartSnapshotCreateBatch({
          symbol: tvSymbol,
          provider,
          timeframes: ["15m", "4h", "1D"],
          theme,
          width: Number(width || 960),
          height: Number(height || 540),
          lookbackBars: Number(lookbackBars || 300),
          format,
          quality: Number(quality || 55),
        });
        if (Array.isArray(out?.items) && out.items.length) setItems((prev) => [...out.items, ...prev].slice(0, limit));
      } else {
        const out = await api.chartSnapshotCreate({
          symbol: tvSymbol,
          timeframe,
          provider,
          theme,
          width: Number(width || 960),
          height: Number(height || 540),
          lookbackBars: Number(lookbackBars || 300),
          format,
          quality: Number(quality || 55),
        });
        if (out?.item) setItems((prev) => [out.item, ...prev].slice(0, limit));
      }
      setStatus({ type: "success", text: batch ? "Captured 3 snapshots (15m/4h/1D)." : "Snapshot captured." });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Capture failed.") });
    } finally {
      setCapturing(false);
    }
  };

  const analyzeLatestThree = async () => {
    setAnalyzing(true);
    setStatus({ type: "", text: "" });
    setAnalysisRaw("");
    setAnalysisJson("");
    setAnalysisParsed(null);
    try {
      const out = await api.chartSnapshotsAnalyze({
        model: "claude-sonnet-4-0",
        prompt: resolvedPrompt,
      });
      const raw = String(out?.raw_response || "");
      setAnalysisRaw(raw);
      if (out?.parsed_json) {
        setAnalysisParsed(out.parsed_json);
        setAnalysisJson(JSON.stringify(out.parsed_json, null, 2));
      }
      setStatus({ type: "success", text: "AI analysis completed." });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Claude analysis failed.") });
    } finally {
      setAnalyzing(false);
    }
  };

  const addToSignal = async () => {
    setAddingSignal(true);
    setStatus({ type: "", text: "" });
    try {
      let parsed = analysisParsed;
      if (!parsed && analysisJson) parsed = JSON.parse(analysisJson);
      const signals = extractSignalsFromAnalysis(parsed, {
        symbol: tvSymbol,
        timeframe,
        strategy: cfg.strategy || "ai",
      });
      if (!signals.length) throw new Error("No valid signal found in analysis JSON.");
      for (const payload of signals) {
        await api.createTrade(payload);
      }
      setStatus({ type: "success", text: `Added ${signals.length} signal(s) successfully.` });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Add to Signal failed.") });
    } finally {
      setAddingSignal(false);
    }
  };

  const saveTemplateItem = () => {
    const name = String(templateName || "").trim() || `${cfg.symbol} ${cfg.strategy}`;
    const item = { id: Date.now().toString(), name, config: cfg, saved: new Date().toISOString() };
    const next = [item, ...templates].slice(0, 200);
    setTemplates(next);
    saveTemplates(next);
    setSelectedTemplateId(item.id);
    setTemplateName("");
    setStatus({ type: "success", text: `Template saved: ${name}` });
  };

  const loadTemplateItem = (id) => {
    const found = templates.find((x) => x.id === id);
    if (!found?.config) return;
    setCfg({ ...DEFAULT_CONFIG, ...found.config });
    setSelectedTemplateId(id);
    setStatus({ type: "success", text: `Template loaded: ${found.name}` });
  };

  const deleteTemplateItem = (id) => {
    const next = templates.filter((x) => x.id !== id);
    setTemplates(next);
    saveTemplates(next);
    if (selectedTemplateId === id) setSelectedTemplateId("");
    setStatus({ type: "warning", text: "Template deleted." });
  };

  useEffect(() => {
    loadSnapshots();
  }, [limit]);

  useEffect(() => {
    const q = String(cfg.symbol || "").trim();
    const plain = q.includes(":") ? q.split(":").slice(1).join(":") : q;
    if (!plain || plain.length < 2) {
      setSymbolOptions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const out = await api.chartSymbols(plain, provider || "ICMARKETS", 8);
        const arr = Array.isArray(out?.items) ? out.items : [];
        setSymbolOptions(arr.map((x) => x.full_symbol || x.symbol).filter(Boolean));
      } catch {
        setSymbolOptions([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [cfg.symbol, provider]);

  return (
    <section className="snapshot-builder">
      <aside className="snapshot-builder-left panel">
        <div className="snapshot-title-row">
          <h2 className="page-title" style={{ fontSize: 22, margin: 0 }}>Chart Snapshot AI</h2>
        </div>

        <div className="snapshot-stats">
          <div className="snapshot-stat"><strong>{totalTfs}</strong><span>TFs</span></div>
          <div className="snapshot-stat"><strong>{cfg.rr}</strong><span>Min RR</span></div>
          <div className="snapshot-stat"><strong>{cfg.risk}%</strong><span>Max Risk</span></div>
          <div className="snapshot-stat"><strong>{templates.length}</strong><span>Templates</span></div>
        </div>

        <div className="snapshot-section">
          <span className="panel-label">Instrument</span>
          <div className="snapshot-grid2">
            <input list="tv-symbol-options" value={cfg.symbol} onChange={(e) => setCfg((p) => ({ ...p, symbol: e.target.value }))} placeholder="Symbol (e.g. UK100 or ICMARKETS:UK100)" />
            <datalist id="tv-symbol-options">
              {symbolOptions.map((opt) => <option key={opt} value={opt} />)}
            </datalist>
            <select value={cfg.asset} onChange={(e) => setCfg((p) => ({ ...p, asset: e.target.value }))}>
              <option>Commodity</option><option>Forex</option><option>Crypto</option><option>Index</option><option>Stock</option>
            </select>
            <select value={cfg.session} onChange={(e) => setCfg((p) => ({ ...p, session: e.target.value }))}>
              <option>Any</option><option>London</option><option>New York</option><option>Asian</option><option>London+NY</option>
            </select>
            <input type="number" min="0.5" step="0.5" value={cfg.rr} onChange={(e) => setCfg((p) => ({ ...p, rr: e.target.value }))} placeholder="Min RR" />
            <input type="number" min="0.1" step="0.1" value={cfg.risk} onChange={(e) => setCfg((p) => ({ ...p, risk: e.target.value }))} placeholder="Max Risk %" />
          </div>
        </div>

        <div className="snapshot-section">
          <span className="panel-label">Strategy</span>
          <div className="snapshot-tag-wrap">
            {STRATEGIES.map((s) => (
              <button key={s} type="button" className={`secondary-button snapshot-tag ${cfg.strategy === s ? "active" : ""}`} onClick={() => setCfg((p) => ({ ...p, strategy: s }))}>{s}</button>
            ))}
          </div>
        </div>

        <div className="snapshot-section">
          <span className="panel-label">Timeframe Array</span>
          <label className="minor-text">HTF Bias TFs</label>
          <div className="snapshot-tag-wrap">
            {HTF_OPTIONS.map((tf) => (
              <button key={tf} type="button" className={`secondary-button snapshot-tag ${cfg.htf_tfs.includes(tf) ? "active" : ""}`} onClick={() => setCfg((p) => ({ ...p, htf_tfs: toggleTf(p.htf_tfs, tf) }))}>{tf}</button>
            ))}
          </div>
          <label className="minor-text">Execution TFs</label>
          <div className="snapshot-tag-wrap">
            {EXEC_OPTIONS.map((tf) => (
              <button key={tf} type="button" className={`secondary-button snapshot-tag ${cfg.exec_tfs.includes(tf) ? "active" : ""}`} onClick={() => setCfg((p) => ({ ...p, exec_tfs: toggleTf(p.exec_tfs, tf) }))}>{tf}</button>
            ))}
          </div>
          <label className="minor-text">Confirmation TFs</label>
          <div className="snapshot-tag-wrap">
            {CONF_OPTIONS.map((tf) => (
              <button key={tf} type="button" className={`secondary-button snapshot-tag ${cfg.conf_tfs.includes(tf) ? "active" : ""}`} onClick={() => setCfg((p) => ({ ...p, conf_tfs: toggleTf(p.conf_tfs, tf) }))}>{tf}</button>
            ))}
          </div>
        </div>

        <div className="snapshot-section">
          <span className="panel-label">Context</span>
          <div className="snapshot-grid2">
            <select value={cfg.htfbias} onChange={(e) => setCfg((p) => ({ ...p, htfbias: e.target.value }))}>
              <option value="">HTF Bias: Auto</option><option>Bullish</option><option>Bearish</option><option>Ranging</option>
            </select>
            <select value={cfg.dir} onChange={(e) => setCfg((p) => ({ ...p, dir: e.target.value }))}>
              <option value="">Direction: Both</option><option>Long only</option><option>Short only</option>
            </select>
            <input value={cfg.keylevel} onChange={(e) => setCfg((p) => ({ ...p, keylevel: e.target.value }))} placeholder="Key level" />
            <select value={cfg.news} onChange={(e) => setCfg((p) => ({ ...p, news: e.target.value }))}>
              <option value="">News: None</option><option>High-impact today</option><option>NFP / FOMC week</option><option>Earnings release</option>
            </select>
          </div>
          <input value={cfg.notes} onChange={(e) => setCfg((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes / extra context" />
        </div>

        <div className="snapshot-section">
          <span className="panel-label">Templates</span>
          <div className="snapshot-template-save">
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
            <button className="primary-button" type="button" onClick={saveTemplateItem}>Save</button>
          </div>
          <div className="snapshot-template-list">
            {!templates.length ? <div className="minor-text">No templates saved yet.</div> : null}
            {templates.map((t) => (
              <div key={t.id} className={`snapshot-template-item ${selectedTemplateId === t.id ? "active" : ""}`}>
                <button type="button" className="secondary-button" onClick={() => loadTemplateItem(t.id)}>{t.name}</button>
                <button type="button" className="danger-button" onClick={() => deleteTemplateItem(t.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="snapshot-builder-right">
        <section className="panel snapshot-section" style={{ marginBottom: 12 }}>
          <span className="panel-label">Capture & Analyze</span>
          <div className="snapshot-grid-capture">
            <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider" />
            <input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} placeholder="TF" />
            <select value={theme} onChange={(e) => setTheme(e.target.value)}><option value="dark">dark</option><option value="light">light</option></select>
            <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value || 960))} placeholder="W" />
            <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value || 540))} placeholder="H" />
            <input type="number" min={50} max={5000} value={lookbackBars} onChange={(e) => setLookbackBars(Number(e.target.value || 300))} placeholder="Lookback" />
            <select value={format} onChange={(e) => setFormat(e.target.value)}><option value="jpg">jpg</option><option value="png">png</option></select>
            <input type="number" min={20} max={95} value={quality} onChange={(e) => setQuality(Number(e.target.value || 55))} placeholder="Q" />
            <input type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(Math.max(1, Math.min(200, Number(e.target.value || 30))))} placeholder="Gallery" />
          </div>
          <div className="snapshot-action-row">
            <button className="primary-button" type="button" onClick={() => captureSnapshot(false)} disabled={capturing}>{capturing ? "Capturing..." : "Capture 1"}</button>
            <button className="primary-button" type="button" onClick={() => captureSnapshot(true)} disabled={capturing}>{capturing ? "Capturing..." : "Capture 3 TF"}</button>
            <button className="primary-button" type="button" onClick={analyzeLatestThree} disabled={capturing || analyzing}>{analyzing ? "Analyzing..." : "Analyze Latest 3"}</button>
            <button className="secondary-button" type="button" onClick={addToSignal} disabled={addingSignal || !analysisJson}>{addingSignal ? "Adding..." : "Add to Signal"}</button>
            <button className="secondary-button" type="button" onClick={loadSnapshots} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
          </div>
          {status.text ? <div className={`form-message ${status.type === "error" ? "msg-error" : status.type === "warning" ? "msg-warning" : "msg-success"}`}>{status.text}</div> : null}
        </section>

        <section className="panel snapshot-section" style={{ marginBottom: 12 }}>
          <div className="snapshot-tabs">
            <button type="button" className={`secondary-button ${tab === "prompt" ? "active" : ""}`} onClick={() => setTab("prompt")}>Prompt</button>
            <button type="button" className={`secondary-button ${tab === "json" ? "active" : ""}`} onClick={() => setTab("json")}>JSON Config</button>
            <button type="button" className={`secondary-button ${tab === "guide" ? "active" : ""}`} onClick={() => setTab("guide")}>Guide</button>
            <span className="minor-text" style={{ marginLeft: "auto" }}>{promptText.length} chars</span>
          </div>
          {tab === "prompt" ? <textarea className="snapshot-mono" rows={18} readOnly value={resolvedPrompt} /> : null}
          {tab === "json" ? <textarea className="snapshot-mono" rows={18} readOnly value={jsonConfigText} /> : null}
          {tab === "guide" ? <textarea className="snapshot-mono" rows={18} readOnly value={GUIDE_TEXT} /> : null}
        </section>

        <section className="panel snapshot-section" style={{ marginBottom: 12 }}>
          <span className="panel-label">AI Response</span>
          <label className="minor-text">Parsed JSON</label>
          <textarea className="snapshot-mono" rows={10} value={analysisJson} onChange={(e) => setAnalysisJson(e.target.value)} placeholder="Parsed JSON appears here after Analyze Latest 3." />
          <label className="minor-text">Raw response</label>
          <textarea className="snapshot-mono" rows={8} readOnly value={analysisRaw} placeholder="Raw model response" />
        </section>

        <section className="panel snapshot-section">
          <span className="panel-label">Latest Snapshots ({items.length})</span>
          {items.length === 0 ? <div className="minor-text">No snapshots yet.</div> : (
            <div className="snapshot-gallery">
              {items.map((it) => (
                <article key={it.id} className="snapshot-card">
                  <div className="minor-text" style={{ marginBottom: 6 }}>{it.file_name}</div>
                  <div className="minor-text" style={{ marginBottom: 8 }}>{it.created_at}</div>
                  <a href={it.url} target="_blank" rel="noreferrer">
                    <img src={it.url} alt={it.file_name} style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
