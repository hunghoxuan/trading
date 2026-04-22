import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const STORAGE_KEY = "chart_prompt_builder_templates_v2";

const HTF_OPTIONS = ["W1", "D1", "4H", "2H", "1H"];
const EXEC_OPTIONS = ["1H", "30M", "15M", "5M"];
const CONF_OPTIONS = ["5M", "3M", "1M"];
const STRATEGY_OPTIONS = ["ICT", "SMC", "Price Action", "Wyckoff", "EMA Trend", "Breakout", "VWAP"];
const SNAPSHOT_TF_OPTIONS = ["1D", "4h", "15m", "5m", "1h", "30m"];

const DEFAULT_CONFIG = {
  symbol: "UK100",
  asset: "Auto detect",
  session: "Any",
  rr: "1",
  risk: "1",
  lookbackBars: "300",
  strategies: ["ICT"],
  htf_tfs: ["W1", "D1", "4H"],
  exec_tfs: ["30M", "15M"],
  conf_tfs: ["5M", "1M"],
  htfbias: "",
  dir: "Direction: Both",
  keylevel: "",
  news: "",
  notes: "",
};

const GUIDE_TEXT = `FIELD GUIDE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSYMBOL: Trading instrument (XAUUSD, BTCUSDT, UK100)\nASSET_CLASS: Auto detect | Forex | Crypto | Index | Commodity | Stock\nSESSION: Preferred execution session\nMIN_RR: Minimum Reward:Risk gate\nMAX_RISK_PCT: % risk per setup\n\nTIMEFRAME ARRAY\nHTF_BIAS: trend and structure context\nEXECUTION: setup discovery timeframe\nCONFIRMATION: trigger timeframe\n\nCONFLUENCE GATE\nRequire at least 3 aligned factors before entry.`;

function normalizeTemplateConfig(raw) {
  const strategyValue = raw?.strategies || raw?.strategy || ["ICT"];
  const strategies = Array.isArray(strategyValue) ? strategyValue : [String(strategyValue || "ICT")];
  return {
    ...DEFAULT_CONFIG,
    ...(raw || {}),
    strategies: [...new Set(strategies.map((x) => String(x || "").trim()).filter(Boolean))],
  };
}

function loadTemplates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.map((x) => ({ ...x, config: normalizeTemplateConfig(x?.config || {}) }))
      : [];
  } catch {
    return [];
  }
}

function saveTemplates(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next || []));
}

function toggleArrayValue(arr, val) {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

function sanitizeSnapshotFileToken(value, fallback = "chart") {
  const raw = String(value || fallback).trim().toUpperCase();
  const token = raw.replace(/[^A-Z0-9_-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return token || fallback;
}

function toTradingViewInterval(tfRaw) {
  const tf = String(tfRaw || "5").trim().toLowerCase();
  if (!tf) return "5";
  if (/^\d+$/.test(tf)) return tf;
  if (tf.endsWith("m")) return tf.slice(0, -1) || "5";
  if (tf.endsWith("h")) return String(Number(tf.slice(0, -1) || "1") * 60);
  if (tf.endsWith("d")) return "D";
  if (tf.endsWith("w")) return "W";
  if (tf.endsWith("mo") || tf.endsWith("mth")) return "M";
  return tf.toUpperCase();
}

function parseSnapshotMeta(it) {
  const fileName = String(it?.file_name || "");
  const base = fileName.replace(/\.(png|jpe?g)$/i, "");
  const parts = base.split("_");
  if (parts.length < 5) return null;
  if (!/^\d{8}$/.test(parts[0]) || !/^\d{2}$/.test(parts[1]) || !/^\d{2}$/.test(parts[2])) return null;
  const rest = parts.slice(3);
  if (rest.length < 2) return null;
  const hasDup = rest.length >= 3 && /^\d+$/.test(rest[rest.length - 1]);
  const tfToken = String(hasDup ? rest[rest.length - 2] : rest[rest.length - 1]).toUpperCase();
  const symbolParts = rest.slice(0, hasDup ? -2 : -1);
  if (!symbolParts.length) return null;
  return {
    fileName,
    tfToken,
    symbolToken: symbolParts.join("_"),
    createdAtMs: Date.parse(it?.created_at || "") || 0,
  };
}

function sameUtcDay(aMs, bMs) {
  const a = new Date(aMs);
  const b = new Date(bMs);
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function formatCompactDateTime(dateLike) {
  const d = new Date(dateLike || Date.now());
  if (!Number.isFinite(d.getTime())) return "-";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd} ${hh}${mi}`;
}

function parseNum(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const m = String(value ?? "").replace(/,/g, " ").match(/-?\d+(?:\.\d+)?/);
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

function buildPrompt(cfg) {
  const context = [];
  if (cfg.htfbias) context.push(`htf_bias_override: "${cfg.htfbias}"`);
  if (cfg.dir) context.push(`direction: "${cfg.dir}"`);
  if (cfg.keylevel) context.push(`key_level: "${cfg.keylevel}"`);
  if (cfg.news) context.push(`news_risk: "${cfg.news}"`);
  if (cfg.session && cfg.session !== "Any") context.push(`session: "${cfg.session}"`);
  if (cfg.notes) context.push(`notes: "${cfg.notes}"`);
  const tfJson = JSON.stringify(
    {
      htf_bias_tfs: cfg.htf_tfs,
      execution_tf: cfg.exec_tfs,
      confirmation_tf: cfg.conf_tfs,
    },
    null,
    2,
  );

  return `Act as a Senior Algo-Trader. Analyze the uploaded chart(s).\n\nSYMBOL: ${cfg.symbol}\nASSET_CLASS: ${cfg.asset}\nSTRATEGY: ${cfg.strategies.join(", ")}\nMIN_RR: ${cfg.rr}\nMAX_RISK_PCT: ${cfg.risk}%\n${context.length ? `\nCONTEXT:\n${context.map((x) => `  ${x}`).join("\n")}\n` : ""}\nTIMEFRAME_ARRAY:\n${tfJson}\n\nEXECUTION LOGIC:\n1. HTF Bias — establish bias on [${cfg.htf_tfs.join(", ")}].\n2. Execution layer — identify setup on [${cfg.exec_tfs.join(", ")}] using ${cfg.strategies.join(", ")}.\n3. Confirmation — wait for trigger on [${cfg.conf_tfs.join(", ")}].\n4. Confluence gate — entry only if 3+ factors align.\n5. RR gate — reject setup if RR < ${cfg.rr}.\n6. Return JSON only (no markdown).\n\nOUTPUT:\n{\n  "symbol": "",\n  "trade_setup": {"direction": "", "entry": null, "sl": null, "tp1": null, "tp2": null, "tp3": null, "rr": null, "status": ""},\n  "confluence_factors": [],\n  "risk_management": {},\n  "invalidation": "",\n  "confidence_pct": null,\n  "final_verdict": {}\n}`;
}

function buildJsonConfig(cfg) {
  return JSON.stringify(
    {
      version: "2.0",
      saved_at: new Date().toISOString(),
      config: {
        symbol: cfg.symbol,
        asset_class: cfg.asset,
        strategies: cfg.strategies,
        session: cfg.session,
        min_rr: Number(cfg.rr),
        max_risk_pct: Number(cfg.risk),
        lookback_bars: Number(cfg.lookbackBars),
        timeframe_array: {
          htf_bias_tfs: cfg.htf_tfs,
          execution_tf: cfg.exec_tfs,
          confirmation_tf: cfg.conf_tfs,
        },
      },
    },
    null,
    2,
  );
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
      return {
        symbol: String(s?.symbol || fallback.symbol || "").trim(),
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

function buildFriendlyResponse(parsed) {
  if (!parsed || typeof parsed !== "object") return "No parsed JSON yet.";
  const symbol = parsed?.symbol || parsed?.trade_setup?.symbol || "-";
  const setup = parsed?.trade_setup || parsed;
  const direction = setup?.direction || parsed?.direction || parsed?.side || "-";
  const entry = setup?.entry ?? parsed?.entry;
  const sl = setup?.sl ?? parsed?.sl;
  const tp1 = setup?.tp1 ?? setup?.tp ?? parsed?.tp;
  const rr = setup?.rr ?? parsed?.rr;
  const conf = parsed?.confidence_pct ?? setup?.confidence_pct;
  const factors = Array.isArray(parsed?.confluence_factors) ? parsed.confluence_factors : [];
  return [
    `Symbol: ${symbol}`,
    `Direction: ${direction}`,
    `Entry: ${entry ?? "-"}`,
    `SL: ${sl ?? "-"}`,
    `TP1: ${tp1 ?? "-"}`,
    `RR: ${rr ?? "-"}`,
    `Confidence: ${conf ?? "-"}`,
    factors.length ? `Confluence: ${factors.join(", ")}` : "Confluence: -",
  ].join("\n");
}

export default function ChartSnapshotsPage() {
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState(() => loadTemplates());
  const [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");

  const [provider, setProvider] = useState("ICMARKETS");
  const [timeframe, setTimeframe] = useState("15m");
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [addingSignal, setAddingSignal] = useState(false);
  const [tab, setTab] = useState("prompt");
  const [responseTab, setResponseTab] = useState("text");
  const [status, setStatus] = useState({ type: "", text: "" });

  const [analysisRaw, setAnalysisRaw] = useState("");
  const [analysisJson, setAnalysisJson] = useState("");
  const [analysisParsed, setAnalysisParsed] = useState(null);
  const [usedFiles, setUsedFiles] = useState([]);

  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [symbolOptions, setSymbolOptions] = useState([]);
  const [snapshotTfs, setSnapshotTfs] = useState(["1D", "4h", "15m", "5m"]);

  const tvSymbol = useMemo(() => {
    const base = String(cfg.symbol || "").trim();
    if (!base) return "";
    return base.includes(":") ? base : `${provider}:${base}`;
  }, [cfg.symbol, provider]);

  const promptText = useMemo(() => buildPrompt(cfg), [cfg]);
  const jsonConfigText = useMemo(() => buildJsonConfig(cfg), [cfg]);
  const responseText = useMemo(() => buildFriendlyResponse(analysisParsed), [analysisParsed]);

  const setCfgField = (key, value) => setCfg((prev) => ({ ...prev, [key]: value }));

  const loadSnapshots = async () => {
    setLoading(true);
    setStatus({ type: "", text: "" });
    try {
      const out = await api.chartSnapshots(limit);
      const arr = Array.isArray(out?.items) ? out.items : [];
      setItems(arr);
      setSelectedFiles(new Set());
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Failed to load snapshots.") });
    } finally {
      setLoading(false);
    }
  };

  const analyzeFiles = async (files = []) => {
    setAnalyzing(true);
    setStatus({ type: "", text: "" });
    setAnalysisRaw("");
    setAnalysisJson("");
    setAnalysisParsed(null);
    setUsedFiles([]);
    try {
      const payload = {
        model: "claude-sonnet-4-0",
        prompt: promptText,
      };
      if (Array.isArray(files) && files.length) payload.files = files;
      const out = await api.chartSnapshotsAnalyze(payload);
      const raw = String(out?.raw_response || "");
      setAnalysisRaw(raw);
      if (out?.parsed_json) {
        setAnalysisParsed(out.parsed_json);
        setAnalysisJson(JSON.stringify(out.parsed_json, null, 2));
      }
      setUsedFiles(Array.isArray(out?.used_files) ? out.used_files : []);
      setResponseTab("text");
      setStatus({ type: "success", text: `Analyzed ${Array.isArray(out?.used_files) ? out.used_files.length : 0} screenshot(s).` });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Analyze failed.") });
    } finally {
      setAnalyzing(false);
    }
  };

  const captureSnapshots = async () => {
    if (!String(tvSymbol || "").trim()) {
      setStatus({ type: "warning", text: "Symbol is required." });
      return;
    }
    const tfs = [...new Set(snapshotTfs.map((x) => String(x || "").trim()).filter(Boolean))];
    if (!tfs.length) {
      setStatus({ type: "warning", text: "Select at least one timeframe." });
      return;
    }
    setCapturing(true);
    setStatus({ type: "", text: "" });
    try {
      const out = await api.chartSnapshotCreateBatch({
        symbol: tvSymbol,
        provider,
        timeframes: tfs,
        lookbackBars: Number(cfg.lookbackBars || 300),
        format: "jpg",
        quality: 55,
      });
      const created = Array.isArray(out?.items) ? out.items : [];
      if (created.length) {
        setItems((prev) => [...created, ...prev].slice(0, limit));
      } else {
        await loadSnapshots();
      }
      setStatus({ type: "success", text: `Captured ${created.length || tfs.length} snapshot(s).` });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Snapshots failed.") });
    } finally {
      setCapturing(false);
    }
  };

  const analyzeSelected = async () => {
    const files = [...selectedFiles];
    if (files.length) {
      await analyzeFiles(files);
      return;
    }

    const nowMs = Date.now();
    const targetTfTokens = [...new Set(snapshotTfs.map((x) => toTradingViewInterval(x).toUpperCase()))];
    const symbolRaw = String(cfg.symbol || "").trim().toUpperCase();
    const providerRaw = String(provider || "").trim().toUpperCase();
    const fullSymbol = symbolRaw.includes(":") ? symbolRaw : `${providerRaw}:${symbolRaw}`;
    const symbolTokens = new Set(
      [symbolRaw, fullSymbol, tvSymbol]
        .map((x) => sanitizeSnapshotFileToken(x || ""))
        .filter(Boolean),
    );

    const candidates = items
      .map(parseSnapshotMeta)
      .filter((x) => x && x.createdAtMs > 0)
      .filter((x) => symbolTokens.has(x.symbolToken))
      .filter((x) => targetTfTokens.includes(x.tfToken))
      .filter((x) => sameUtcDay(x.createdAtMs, nowMs))
      .filter((x) => Math.abs(nowMs - x.createdAtMs) <= 15 * 60 * 1000)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);

    const byTf = new Map();
    for (const c of candidates) {
      if (!byTf.has(c.tfToken)) byTf.set(c.tfToken, c.fileName);
    }
    const matchedFiles = targetTfTokens.map((tf) => byTf.get(tf)).filter(Boolean);

    if (matchedFiles.length === targetTfTokens.length && matchedFiles.length > 0) {
      setStatus({ type: "success", text: `Using existing snapshots (${matchedFiles.length}) from last 15 minutes.` });
      await analyzeFiles(matchedFiles);
      return;
    }

    setStatus({ type: "warning", text: "No matching recent snapshots found. Capturing new snapshots first..." });
    const tfs = [...new Set(snapshotTfs.map((x) => String(x || "").trim()).filter(Boolean))];
    if (!String(tvSymbol || "").trim() || !tfs.length) {
      setStatus({ type: "warning", text: "Symbol and at least one snapshot TF are required." });
      return;
    }
    setCapturing(true);
    try {
      const out = await api.chartSnapshotCreateBatch({
        symbol: tvSymbol,
        provider,
        timeframes: tfs,
        lookbackBars: Number(cfg.lookbackBars || 300),
        format: "jpg",
        quality: 55,
      });
      const created = Array.isArray(out?.items) ? out.items : [];
      if (created.length) {
        setItems((prev) => [...created, ...prev].slice(0, limit));
      } else {
        await loadSnapshots();
      }
      const newFiles = created.map((x) => String(x?.file_name || "").trim()).filter(Boolean);
      await analyzeFiles(newFiles);
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Snapshots failed before analyze.") });
    } finally {
      setCapturing(false);
    }
  };

  const deleteSnapshots = async (opts = { all: false, files: [] }) => {
    setDeleting(true);
    setStatus({ type: "", text: "" });
    try {
      const out = await api.chartSnapshotsDelete(opts);
      await loadSnapshots();
      setStatus({ type: "success", text: `Deleted ${Number(out?.deleted_count || 0)} screenshot(s).` });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Delete failed.") });
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = async () => {
    const files = [...selectedFiles];
    if (!files.length) {
      setStatus({ type: "warning", text: "No screenshot selected." });
      return;
    }
    await deleteSnapshots({ files });
  };

  const deleteOne = async (fileName) => {
    await deleteSnapshots({ files: [fileName] });
  };

  const deleteAll = async () => {
    await deleteSnapshots({ all: true });
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
        strategy: cfg.strategies.join("+") || "ai",
      });
      if (!signals.length) throw new Error("No valid signal found in response JSON.");
      for (const payload of signals) {
        await api.createTrade(payload);
      }
      setStatus({ type: "success", text: `Added ${signals.length} signal(s).` });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Add Signal failed.") });
    } finally {
      setAddingSignal(false);
    }
  };

  const saveTemplate = () => {
    const name = String(templateName || "").trim() || `${cfg.symbol} ${cfg.strategies.join("+")}`;
    const item = {
      id: Date.now().toString(),
      name,
      config: normalizeTemplateConfig(cfg),
      saved: new Date().toISOString(),
    };
    const next = [item, ...templates.filter((x) => x.id !== item.id)].slice(0, 200);
    setTemplates(next);
    saveTemplates(next);
    setTemplateId(item.id);
    setTemplateName("");
    setStatus({ type: "success", text: `Template saved: ${name}` });
  };

  const handleSelectTemplate = (id) => {
    setTemplateId(id);
    const found = templates.find((x) => x.id === id);
    if (!found?.config) return;
    setCfg(normalizeTemplateConfig(found.config));
    setStatus({ type: "success", text: `Template loaded: ${found.name}` });
  };

  const toggleFile = (fileName) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) next.delete(fileName);
      else next.add(fileName);
      return next;
    });
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
    <section className="snapshot-builder-v2">
      <section className="panel snapshot-settings-v2">
        <div className="snapshot-settings-head-v2">
          <h2 className="page-title" style={{ margin: 0, fontSize: 22 }}>Settings</h2>
          <div className="snapshot-template-row-v2">
            <div className="snapshot-template-col-v2">
              <label className="minor-text">Template</label>
              <select value={templateId} onChange={(e) => handleSelectTemplate(e.target.value)}>
                <option value="">Select template</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="snapshot-template-col-v2">
              <label className="minor-text">Template Name</label>
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
            </div>
            <button className="primary-button snapshot-template-save-btn-v2" type="button" onClick={saveTemplate}>Save</button>
          </div>
        </div>

        <div className="snapshot-fields-v2 compact">
          <div>
            <label className="minor-text">Symbol</label>
            <input list="tv-symbol-options" value={cfg.symbol} onChange={(e) => setCfgField("symbol", e.target.value)} placeholder="UK100" />
            <datalist id="tv-symbol-options">
              {symbolOptions.map((opt) => <option key={opt} value={opt} />)}
            </datalist>
          </div>
          <div>
            <label className="minor-text">Assets</label>
            <select value={cfg.asset} onChange={(e) => setCfgField("asset", e.target.value)}>
              <option>Auto detect</option>
              <option>Commodity</option>
              <option>Forex</option>
              <option>Crypto</option>
              <option>Index</option>
              <option>Stock</option>
            </select>
          </div>
          <div>
            <label className="minor-text">Sessions</label>
            <select value={cfg.session} onChange={(e) => setCfgField("session", e.target.value)}>
              <option>Any</option>
              <option>London</option>
              <option>New York</option>
              <option>Asian</option>
              <option>London+NY</option>
            </select>
          </div>
          <div>
            <label className="minor-text">MinRR</label>
            <input type="number" min="0.5" step="0.5" value={cfg.rr} onChange={(e) => setCfgField("rr", e.target.value)} />
          </div>
          <div>
            <label className="minor-text">Max Risk</label>
            <input type="number" min="0.1" step="0.1" value={cfg.risk} onChange={(e) => setCfgField("risk", e.target.value)} />
          </div>
          <div>
            <label className="minor-text">Lookback</label>
            <input type="number" min="50" max="5000" value={cfg.lookbackBars} onChange={(e) => setCfgField("lookbackBars", e.target.value)} />
          </div>
          <div>
            <label className="minor-text">Provider</label>
            <input value={provider} onChange={(e) => setProvider(e.target.value)} />
          </div>
          <div>
            <label className="minor-text">TF</label>
            <input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="minor-text">Strategy (multi-select)</label>
          <div className="snapshot-tag-wrap-v2">
            {STRATEGY_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={`secondary-button snapshot-tag-v2 ${cfg.strategies.includes(s) ? "active" : ""}`}
                onClick={() => setCfgField("strategies", toggleArrayValue(cfg.strategies, s))}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="snapshot-tf-v2">
          <div>
            <label className="minor-text">HTF Bias TFs</label>
            <div className="snapshot-tag-wrap-v2">
              {HTF_OPTIONS.map((tf) => (
                <button key={tf} type="button" className={`secondary-button snapshot-tag-v2 ${cfg.htf_tfs.includes(tf) ? "active" : ""}`} onClick={() => setCfgField("htf_tfs", toggleArrayValue(cfg.htf_tfs, tf))}>{tf}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="minor-text">Execution TFs</label>
            <div className="snapshot-tag-wrap-v2">
              {EXEC_OPTIONS.map((tf) => (
                <button key={tf} type="button" className={`secondary-button snapshot-tag-v2 ${cfg.exec_tfs.includes(tf) ? "active" : ""}`} onClick={() => setCfgField("exec_tfs", toggleArrayValue(cfg.exec_tfs, tf))}>{tf}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="minor-text">Confirmation TFs</label>
            <div className="snapshot-tag-wrap-v2">
              {CONF_OPTIONS.map((tf) => (
                <button key={tf} type="button" className={`secondary-button snapshot-tag-v2 ${cfg.conf_tfs.includes(tf) ? "active" : ""}`} onClick={() => setCfgField("conf_tfs", toggleArrayValue(cfg.conf_tfs, tf))}>{tf}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="snapshot-context-v2">
          <div>
            <label className="minor-text">HTF Bias</label>
            <select value={cfg.htfbias} onChange={(e) => setCfgField("htfbias", e.target.value)}>
              <option value="">Auto</option>
              <option>Bullish</option>
              <option>Bearish</option>
              <option>Ranging</option>
            </select>
          </div>
          <div>
            <label className="minor-text">Direction</label>
            <select value={cfg.dir} onChange={(e) => setCfgField("dir", e.target.value)}>
              <option>Direction: Both</option>
              <option>Direction: Bias</option>
              <option>Long only</option>
              <option>Short only</option>
            </select>
          </div>
          <div>
            <label className="minor-text">Key Level</label>
            <input value={cfg.keylevel} onChange={(e) => setCfgField("keylevel", e.target.value)} placeholder="e.g. 3300 resistance" />
          </div>
          <div>
            <label className="minor-text">News</label>
            <select value={cfg.news} onChange={(e) => setCfgField("news", e.target.value)}>
              <option value="">None</option>
              <option>High-impact today</option>
              <option>NFP / FOMC week</option>
              <option>Earnings release</option>
            </select>
          </div>
          <div className="full">
            <label className="minor-text">Notes</label>
            <input value={cfg.notes} onChange={(e) => setCfgField("notes", e.target.value)} placeholder="Notes / extra context" />
          </div>
        </div>
      </section>

      <section className="snapshot-io-row-v2">
        <section className="panel snapshot-io-col-v2">
          <div className="snapshot-tabs-v2">
            <button type="button" className={`secondary-button ${tab === "prompt" ? "active" : ""}`} onClick={() => setTab("prompt")}>Prompt</button>
            <button type="button" className={`secondary-button ${tab === "json" ? "active" : ""}`} onClick={() => setTab("json")}>JSON Config</button>
            <button type="button" className={`secondary-button ${tab === "guide" ? "active" : ""}`} onClick={() => setTab("guide")}>Guide</button>
            <span className="minor-text" style={{ marginLeft: "auto" }}>{promptText.length} chars</span>
          </div>
          {tab === "prompt" ? <textarea className="snapshot-mono-v2" rows={18} value={promptText} readOnly /> : null}
          {tab === "json" ? <textarea className="snapshot-mono-v2" rows={18} value={jsonConfigText} readOnly /> : null}
          {tab === "guide" ? <textarea className="snapshot-mono-v2" rows={18} value={GUIDE_TEXT} readOnly /> : null}
          <div className="snapshot-capture-inline-v2">
            <label className="minor-text">Snapshots TFs</label>
            <div className="snapshot-tag-wrap-v2">
              {SNAPSHOT_TF_OPTIONS.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`secondary-button snapshot-tag-v2 ${snapshotTfs.includes(tf) ? "active" : ""}`}
                  onClick={() => setSnapshotTfs((prev) => toggleArrayValue(prev, tf))}
                >
                  {tf}
                </button>
              ))}
            </div>
            <button className="secondary-button" type="button" onClick={captureSnapshots} disabled={capturing}>{capturing ? "Snapshots..." : "Snapshots"}</button>
            <button className="primary-button" type="button" onClick={analyzeSelected} disabled={analyzing}>{analyzing ? "Analyzing..." : "Analyze"}</button>
          </div>
        </section>

        <section className="panel snapshot-io-col-v2">
          <div className="snapshot-tabs-v2">
            <button type="button" className={`secondary-button ${responseTab === "text" ? "active" : ""}`} onClick={() => setResponseTab("text")}>Text</button>
            <button type="button" className={`secondary-button ${responseTab === "raw" ? "active" : ""}`} onClick={() => setResponseTab("raw")}>Raw</button>
            <button type="button" className={`secondary-button ${responseTab === "chart" ? "active" : ""}`} onClick={() => setResponseTab("chart")}>Chart</button>
          </div>

          {responseTab === "text" ? <textarea className="snapshot-mono-v2" rows={18} value={responseText} readOnly /> : null}
          {responseTab === "raw" ? <textarea className="snapshot-mono-v2" rows={18} value={analysisRaw || analysisJson} onChange={(e) => setAnalysisRaw(e.target.value)} /> : null}
          {responseTab === "chart" ? (
            <div className="snapshot-chart-grid-v2">
              {(usedFiles || []).length === 0 ? <div className="minor-text">No chart files from current analysis.</div> : usedFiles.map((f) => (
                <a key={f} href={`/v2/chart/snapshots/${encodeURIComponent(f)}`} target="_blank" rel="noreferrer">
                  <img src={`/v2/chart/snapshots/${encodeURIComponent(f)}`} alt={f} />
                </a>
              ))}
            </div>
          ) : null}

          <div className="snapshot-actions-under-v2">
            <button className="primary-button" type="button" onClick={addToSignal} disabled={addingSignal || (!analysisJson && !analysisParsed)}>{addingSignal ? "Adding..." : "Add Signal"}</button>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="snapshot-gallery-head-v2">
          <span className="panel-label" style={{ margin: 0 }}>Snapshots ({items.length})</span>
          <div className="snapshot-bulk-actions-v2">
            <input type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(Math.max(1, Math.min(200, Number(e.target.value || 30))))} />
            <button className="secondary-button" type="button" onClick={loadSnapshots} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
            <button className="danger-button" type="button" onClick={deleteSelected} disabled={deleting}>{deleting ? "Deleting..." : "Delete Selected"}</button>
            <button className="danger-button" type="button" onClick={deleteAll} disabled={deleting}>{deleting ? "Deleting..." : "Delete All"}</button>
          </div>
        </div>

        {status.text ? (
          <div className={`form-message ${status.type === "error" ? "msg-error" : status.type === "warning" ? "msg-warning" : "msg-success"}`}>
            {status.text}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="minor-text">No snapshots yet.</div>
        ) : (
          <div className="snapshot-gallery-v2">
            {items.map((it) => (
              <article key={it.id} className="snapshot-card-v2">
                <label className="snapshot-select-v2">
                  <input type="checkbox" checked={selectedFiles.has(it.file_name)} onChange={() => toggleFile(it.file_name)} />
                </label>
                <button className="snapshot-delete-one-v2" type="button" onClick={() => deleteOne(it.file_name)} title="Delete">✕</button>
                <a href={it.url} target="_blank" rel="noreferrer">
                  <img src={it.url} alt={it.file_name} />
                </a>
                <div className="snapshot-meta-v2">
                  <div className="snapshot-file-v2">{it.file_name}</div>
                  <div className="snapshot-time-v2">{formatCompactDateTime(it.created_at)}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
