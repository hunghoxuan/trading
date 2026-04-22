import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const STORAGE_KEY = "chart_prompt_builder_templates_v2";

const HTF_OPTIONS = ["W1", "D1", "4H", "2H", "1H"];
const EXEC_OPTIONS = ["1H", "30M", "15M", "5M"];
const CONF_OPTIONS = ["5M", "3M", "1M"];
const STRATEGY_OPTIONS = ["ICT", "SMC", "Price Action", "Wyckoff", "EMA Trend", "Breakout", "VWAP"];
const SNAPSHOT_TF_OPTIONS = ["1D", "4h", "15m", "5m", "1h", "30m"];
const DEFAULT_TEMPLATE_ID = "__default__";
const SYMBOLS_SETTING_TYPE = "SYMBOLS";
const SYMBOLS_SETTING_NAME = "WATCHLIST";

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
const STRATEGY_CHECKLIST = {
  ICT: ["Liquidity sweep", "BOS/CHoCH confirmed", "PD Array reaction", "Displacement candle", "Killzone/session alignment"],
  SMC: ["Liquidity grab", "Structure break", "Order block mitigation", "Imbalance/FVG reaction", "HTF bias alignment"],
  "Price Action": ["Trend context clear", "Key S/R reaction", "Candlestick confirmation", "RR >= target", "No major news conflict"],
  Wyckoff: ["Phase identified", "Spring/Upthrust event", "Volume confirmation", "Sign of strength/weakness", "Markup/markdown continuation"],
  "EMA Trend": ["EMA stack aligned", "Pullback to EMA zone", "Trend continuation candle", "Momentum confirmation", "Avoid chop/range"],
  Breakout: ["Range clearly defined", "Valid breakout close", "Retest holds", "Volume expansion", "False-break risk checked"],
  VWAP: ["Price vs VWAP bias", "VWAP reclaim/reject", "Session anchor context", "Confluence with S/R", "Risk controlled around VWAP"],
};

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
  const yyyy = Number(parts[0].slice(0, 4));
  const mm = Number(parts[0].slice(4, 6));
  const dd = Number(parts[0].slice(6, 8));
  const hh = Number(parts[1]);
  const mi = Number(parts[2]);
  const tsFromName = Date.UTC(yyyy, Math.max(mm - 1, 0), dd, hh, mi, 0, 0);
  return {
    fileName,
    tfToken,
    symbolToken: symbolParts.join("_"),
    createdAtMs: Date.parse(it?.created_at || "") || tsFromName || 0,
  };
}

function intervalTokenToLabel(token) {
  const t = String(token || "").toUpperCase();
  if (t === "D") return "1D";
  if (t === "W") return "1W";
  if (t === "M") return "1M";
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    if (n < 60) return `${n}m`;
    if (n % 60 === 0) return `${n / 60}h`;
    return `${n}m`;
  }
  return t;
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

function normalizeSignalSymbol(symbolRaw) {
  const s = String(symbolRaw || "").trim().toUpperCase();
  if (!s) return "";
  if (s.includes(":")) {
    const parts = s.split(":");
    return String(parts[parts.length - 1] || "").trim().toUpperCase();
  }
  return s;
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

function extractJsonCandidate(textRaw) {
  const text = String(textRaw || "").trim();
  if (!text) return "";
  let s = text.replace(/^\s*`+json\s*/i, "").replace(/^\s*```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) s = fenced[1].trim();
  const findBalanced = (str, openChar, closeChar) => {
    const start = str.indexOf(openChar);
    if (start < 0) return "";
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < str.length; i += 1) {
      const ch = str[i];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === "\"") inString = false;
        continue;
      }
      if (ch === "\"") {
        inString = true;
        continue;
      }
      if (ch === openChar) depth += 1;
      if (ch === closeChar) {
        depth -= 1;
        if (depth === 0) return str.slice(start, i + 1);
      }
    }
    return "";
  };
  const obj = findBalanced(s, "{", "}");
  if (obj) return obj;
  const arr = findBalanced(s, "[", "]");
  if (arr) return arr;
  return s;
}

function tryParseJsonLoose(textRaw) {
  const candidate = extractJsonCandidate(textRaw);
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    // Fallback: repair common LLM JSON issues (raw newlines in strings, trailing commas)
    try {
      let repaired = "";
      let inString = false;
      let escaped = false;
      for (let i = 0; i < candidate.length; i += 1) {
        const ch = candidate[i];
        if (inString) {
          if (escaped) {
            repaired += ch;
            escaped = false;
            continue;
          }
          if (ch === "\\") {
            repaired += ch;
            escaped = true;
            continue;
          }
          if (ch === "\"") {
            repaired += ch;
            inString = false;
            continue;
          }
          if (ch === "\n" || ch === "\r") {
            repaired += " ";
            continue;
          }
          repaired += ch;
          continue;
        }
        if (ch === "\"") {
          repaired += ch;
          inString = true;
          continue;
        }
        repaired += ch;
      }
      repaired = repaired.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

function parseTradePlanFromRaw(rawText) {
  const raw = String(rawText || "");
  if (!raw) return null;
  const getString = (re) => {
    const m = raw.match(re);
    return m?.[1] ? String(m[1]).trim() : "";
  };
  const getNum = (re) => {
    const m = raw.match(re);
    if (!m?.[1]) return null;
    const n = Number(String(m[1]).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  const symbol = getString(/"symbol"\s*:\s*"([^"]+)"/i);
  const profile = getString(/"profile"\s*:\s*"([^"]+)"/i);
  const tradePlanBlock = raw.match(/"trade_plan"\s*:\s*\{([\s\S]*?)\}\s*(?:,|\})/i)?.[1] || "";
  if (!tradePlanBlock) return null;
  const inPlan = (re) => {
    const m = tradePlanBlock.match(re);
    return m?.[1] ? String(m[1]).trim() : "";
  };
  const inPlanNum = (re) => {
    const m = tradePlanBlock.match(re);
    if (!m?.[1]) return null;
    const n = Number(String(m[1]).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  const direction = inPlan(/"direction"\s*:\s*"([^"]+)"/i);
  const entry = inPlanNum(/"entry"\s*:\s*(-?\d+(?:\.\d+)?)/i);
  const sl = inPlanNum(/"sl"\s*:\s*(-?\d+(?:\.\d+)?)/i);
  const tp1 = inPlanNum(/"tp1"\s*:\s*(-?\d+(?:\.\d+)?)/i);
  const tp2 = inPlanNum(/"tp2"\s*:\s*(-?\d+(?:\.\d+)?)/i);
  const tp3 = inPlanNum(/"tp3"\s*:\s*(-?\d+(?:\.\d+)?)/i);
  const rr = inPlanNum(/"rr"\s*:\s*(-?\d+(?:\.\d+)?)/i);
  const note = inPlan(/"note"\s*:\s*"([\s\S]*?)"/i);
  if (!symbol && !direction && !Number.isFinite(entry)) return null;
  return {
    symbol: symbol || "",
    profile: profile || "",
    trade_plan: {
      direction: direction || "",
      entry,
      sl,
      tp1,
      tp2,
      tp3,
      rr,
      note: note || "",
    },
  };
}

function enrichParsedAnalysis(rawText, parsed) {
  const fallback = parseTradePlanFromRaw(rawText);
  if (!fallback) return parsed;
  if (!parsed || typeof parsed !== "object") return fallback;
  if (Array.isArray(parsed)) {
    return {
      ...fallback,
      market_analysis: {
        pd_arrays: parsed,
      },
    };
  }
  if (!parsed.trade_plan && fallback.trade_plan) {
    return {
      ...parsed,
      symbol: parsed.symbol || fallback.symbol,
      profile: parsed.profile || fallback.profile,
      trade_plan: fallback.trade_plan,
    };
  }
  return parsed;
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

  const checklistRules = cfg.strategies
    .map((s) => {
      const rules = STRATEGY_CHECKLIST[s] || [];
      return `- ${s}: ${rules.join("; ")}`;
    })
    .join("\n");

  return `Act as a Senior Algo-Trader. Analyze the uploaded chart(s).\n\nSYMBOL: ${cfg.symbol}\nASSET_CLASS: ${cfg.asset}\nSTRATEGY: ${cfg.strategies.join(", ")}\nMIN_RR: ${cfg.rr}\nMAX_RISK_PCT: ${cfg.risk}%\n${context.length ? `\nCONTEXT:\n${context.map((x) => `  ${x}`).join("\n")}\n` : ""}\nTIMEFRAME_ARRAY:\n${tfJson}\n\nCHECKLIST CONDITIONS BY STRATEGY:\n${checklistRules}\n\nEXECUTION LOGIC:\n1. HTF Bias — establish bias on [${cfg.htf_tfs.join(", ")}].\n2. Execution layer — identify setup on [${cfg.exec_tfs.join(", ")}] using ${cfg.strategies.join(", ")}.\n3. Confirmation — wait for trigger on [${cfg.conf_tfs.join(", ")}].\n4. Confluence gate — entry only if 3+ factors align.\n5. RR gate — reject setup if RR < ${cfg.rr}.\n6. Return JSON only (no markdown).\n\nOUTPUT:\n{\n  "symbol": "",\n  "profile": "scalping|daily|swing",\n  "trade_plan": {\n    "direction": "",\n    "entry": null,\n    "sl": null,\n    "tp1": null,\n    "tp2": null,\n    "tp3": null,\n    "rr": null,\n    "note": "Short overview of strategy, risk level, and recommendation."\n  },\n  "market_analysis": {\n    "bias": "",\n    "trend": "",\n    "pd_arrays": [\n      { "type": "OB|FVG|S/R|Liquidity", "timeframe": "", "zone": "", "status": "active|tested|broken" }\n    ],\n    "checklist": [\n      { "strategy": "", "condition": "", "checked": true, "note": "" }\n    ]\n  },\n  "risk_management": {},\n  "invalidation": "",\n  "confidence_pct": null,\n  "final_verdict": {}\n}`;
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
  if (parsed.trade_plan && typeof parsed.trade_plan === "object") {
    rows.push({ ...(parsed.trade_plan || {}), symbol: parsed.symbol || fallback.symbol });
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
        symbol: normalizeSignalSymbol(s?.symbol || fallback.symbol || ""),
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
  if (parsed === null || parsed === undefined) return "No parsed JSON yet.";
  const lines = [];
  const walk = (value, prefix = "", depth = 0) => {
    const indent = "  ".repeat(depth);
    if (value === null || value === undefined) {
      lines.push(`${indent}${prefix}: -`);
      return;
    }
    if (Array.isArray(value)) {
      if (!value.length) {
        lines.push(`${indent}${prefix}: []`);
        return;
      }
      lines.push(`${indent}${prefix}:`);
      value.forEach((item, idx) => {
        if (item && typeof item === "object") {
          lines.push(`${indent}  - [${idx + 1}]`);
          walk(item, "", depth + 2);
        } else {
          lines.push(`${indent}  - ${String(item)}`);
        }
      });
      return;
    }
    if (typeof value === "object") {
      const entries = Object.entries(value);
      if (!entries.length) {
        lines.push(`${indent}${prefix}: {}`);
        return;
      }
      if (prefix) lines.push(`${indent}${prefix}:`);
      entries.forEach(([k, v]) => walk(v, k, prefix ? depth + 1 : depth));
      return;
    }
    lines.push(`${indent}${prefix}: ${String(value)}`);
  };
  if (typeof parsed === "object") walk(parsed);
  else lines.push(String(parsed));
  return lines.join("\n");
}

export default function ChartSnapshotsPage() {
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState(() => loadTemplates());
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
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
  const [actionStatus, setActionStatus] = useState({ action: "", type: "", text: "" });

  const [analysisRaw, setAnalysisRaw] = useState("");
  const [analysisJson, setAnalysisJson] = useState("");
  const [analysisParsed, setAnalysisParsed] = useState(null);
  const [usedFiles, setUsedFiles] = useState([]);

  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [symbolOptions, setSymbolOptions] = useState([]);
  const [snapshotTfs, setSnapshotTfs] = useState(["1D", "4h", "15m", "5m"]);
  const [watchlist, setWatchlist] = useState([]);
  const [analysisFilesDisplay, setAnalysisFilesDisplay] = useState([]);

  const tvSymbol = useMemo(() => {
    const base = String(cfg.symbol || "").trim();
    if (!base) return "";
    return base.includes(":") ? base : `${provider}:${base}`;
  }, [cfg.symbol, provider]);

  const promptText = useMemo(() => buildPrompt(cfg), [cfg]);
  const jsonConfigText = useMemo(() => buildJsonConfig(cfg), [cfg]);
  const effectiveParsed = useMemo(
    () => enrichParsedAnalysis(analysisRaw, analysisParsed || tryParseJsonLoose(analysisJson) || tryParseJsonLoose(analysisRaw)),
    [analysisParsed, analysisJson, analysisRaw],
  );
  const responseText = useMemo(() => buildFriendlyResponse(effectiveParsed), [effectiveParsed]);
  const canAddSignal = useMemo(
    () => extractSignalsFromAnalysis(effectiveParsed, { symbol: tvSymbol, timeframe, strategy: cfg.strategies.join("+") || "ai" }).length > 0,
    [effectiveParsed, tvSymbol, timeframe, cfg.strategies],
  );

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

  const setActionMessage = (action, type, text) => {
    setActionStatus({ action, type, text: String(text || "") });
  };

  const analyzeFiles = async (files = []) => {
    setAnalyzing(true);
    setStatus({ type: "", text: "" });
    setAnalysisRaw("");
    setAnalysisJson("");
    setAnalysisParsed(null);
    setUsedFiles([]);
    setAnalysisFilesDisplay(Array.isArray(files) ? files : []);
    try {
      const payload = {
        model: "claude-sonnet-4-0",
        prompt: promptText,
      };
      if (Array.isArray(files) && files.length) payload.files = files;
      const out = await api.chartSnapshotsAnalyze(payload);
      const raw = String(out?.raw_response || "");
      setAnalysisRaw(raw);
      const parsed = enrichParsedAnalysis(raw, out?.parsed_json || tryParseJsonLoose(raw));
      if (parsed && typeof parsed === "object") {
        setAnalysisParsed(parsed);
        setAnalysisJson(JSON.stringify(parsed, null, 2));
      }
      setUsedFiles(Array.isArray(out?.used_files) ? out.used_files : []);
      if (!files.length) setAnalysisFilesDisplay(Array.isArray(out?.used_files) ? out.used_files : []);
      setResponseTab("text");
      const msg = `Analyzed ${Array.isArray(out?.used_files) ? out.used_files.length : 0} screenshot(s).`;
      setStatus({ type: "success", text: msg });
      setActionMessage("analyze", "success", msg);
    } catch (e) {
      const msg = String(e?.message || e || "Analyze failed.");
      setStatus({ type: "error", text: msg });
      setActionMessage("analyze", "error", msg);
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
      const createdTfSet = new Set(created.map((x) => parseSnapshotMeta(x)?.tfToken).filter(Boolean));
      const expectedTfSet = new Set(tfs.map((x) => toTradingViewInterval(x).toUpperCase()));
      const missing = [...expectedTfSet].filter((tf) => !createdTfSet.has(tf));
      if (missing.length) {
        const msg = `Captured ${created.length} snapshot(s). Missing TF: ${missing.map(intervalTokenToLabel).join(", ")}`;
        setStatus({ type: "warning", text: msg });
        setActionMessage("capture", "warning", msg);
      } else {
        const msg = `Captured ${created.length || tfs.length} snapshot(s).`;
        setStatus({ type: "success", text: msg });
        setActionMessage("capture", "success", msg);
      }
    } catch (e) {
      const msg = String(e?.message || e || "Snapshots failed.");
      setStatus({ type: "error", text: msg });
      setActionMessage("capture", "error", msg);
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
      const msg = `Using existing snapshots (${matchedFiles.length}) from last 15 minutes.`;
      setStatus({ type: "success", text: msg });
      setActionMessage("analyze", "success", msg);
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
      const msg = String(e?.message || e || "Snapshots failed before analyze.");
      setStatus({ type: "error", text: msg });
      setActionMessage("analyze", "error", msg);
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
      let parsed = effectiveParsed;
      if (!parsed && analysisJson) parsed = JSON.parse(analysisJson);
      if (!parsed && analysisRaw) parsed = enrichParsedAnalysis(analysisRaw, tryParseJsonLoose(analysisRaw));
      const signals = extractSignalsFromAnalysis(parsed, {
        symbol: tvSymbol,
        timeframe,
        strategy: cfg.strategies.join("+") || "ai",
      });
      if (!signals.length) throw new Error("No valid signal found in response JSON.");
      for (const payload of signals) {
        const finalPayload = { ...payload, note: responseText || payload.note || "" };
        await api.createTrade(finalPayload);
      }
      const msg = `Added ${signals.length} signal(s).`;
      setStatus({ type: "success", text: msg });
      setActionMessage("add", "success", msg);
    } catch (e) {
      const msg = String(e?.message || e || "Add Signal failed.");
      setStatus({ type: "error", text: msg });
      setActionMessage("add", "error", msg);
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
    if (id === DEFAULT_TEMPLATE_ID) {
      setCfg({ ...DEFAULT_CONFIG });
      setTemplateName("");
      setStatus({ type: "success", text: "Default template loaded." });
      return;
    }
    const found = templates.find((x) => x.id === id);
    if (!found?.config) return;
    setCfg(normalizeTemplateConfig(found.config));
    setStatus({ type: "success", text: `Template loaded: ${found.name}` });
  };

  const loadWatchlist = async () => {
    try {
      const out = await api.getSettings();
      const list = Array.isArray(out?.settings) ? out.settings : [];
      const row = list.find((x) => String(x?.type || "").toUpperCase() === SYMBOLS_SETTING_TYPE && String(x?.name || "").toUpperCase() === SYMBOLS_SETTING_NAME);
      const arr = Array.isArray(row?.data?.symbols) ? row.data.symbols : [];
      setWatchlist([...new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))]);
    } catch {
      setWatchlist([]);
    }
  };

  const addCurrentSymbolToWatchlist = async () => {
    const s = String(cfg.symbol || "").trim().toUpperCase();
    if (!s) {
      setStatus({ type: "warning", text: "Symbol is required." });
      return;
    }
    const next = [...new Set([...watchlist, s])];
    try {
      await api.upsertSetting({
        type: SYMBOLS_SETTING_TYPE,
        name: SYMBOLS_SETTING_NAME,
        data: { symbols: next },
        status: "active",
      });
      setWatchlist(next);
      setStatus({ type: "success", text: `Added to watchlist: ${s}` });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Failed to save watchlist.") });
    }
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
    loadWatchlist();
  }, []);

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

  const chartFiles = (analysisFilesDisplay && analysisFilesDisplay.length ? analysisFilesDisplay : usedFiles).map((x) => String(x || "").trim()).filter(Boolean);

  return (
    <section className="snapshot-builder-v2">
      <section className="snapshot-settings-shell-v2">
        <section className="panel snapshot-symbols-card-v2">
          <div className="snapshot-symbols-title-v2">
            <span className="panel-label" style={{ margin: 0 }}>Symbols</span>
            <button className="secondary-button snapshot-plus-btn-v2" type="button" onClick={addCurrentSymbolToWatchlist} title="Add current symbol">+</button>
          </div>
          <input
            list="tv-symbol-options"
            value={cfg.symbol}
            onChange={(e) => setCfgField("symbol", e.target.value)}
            placeholder="Symbol (e.g. ICMARKETS:EURJF)"
          />
          <datalist id="tv-symbol-options">
            {symbolOptions.map((opt) => <option key={opt} value={opt} />)}
          </datalist>
          <div className="snapshot-watchlist-v2">
            {watchlist.length === 0 ? <span className="minor-text">No watchlist symbols yet.</span> : watchlist.map((s) => (
              <button key={s} type="button" className={`secondary-button snapshot-tag-v2 ${String(cfg.symbol).toUpperCase() === s ? "active" : ""}`} onClick={() => setCfgField("symbol", s)}>
                {s}
              </button>
            ))}
          </div>
        </section>

        <section className="panel snapshot-settings-v2">
        <div className="snapshot-settings-head-v2">
          <h2 className="page-title" style={{ margin: 0, fontSize: 22 }}>Settings</h2>
          <div className="snapshot-template-row-v2">
            <div className="snapshot-template-col-v2">
              <select aria-label="Template" value={templateId} onChange={(e) => handleSelectTemplate(e.target.value)}>
                <option value="">New Template</option>
                <option value={DEFAULT_TEMPLATE_ID}>Default Template</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="snapshot-template-col-v2">
              <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
            </div>
            <button className="primary-button snapshot-template-save-btn-v2" type="button" onClick={saveTemplate}>Save</button>
          </div>
        </div>

        <div className="snapshot-fields-v2 compact">
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
          <div className="snapshot-col-span-5">
            <label className="minor-text">HTF Bias TFs</label>
            <div className="snapshot-tag-wrap-v2">
              {HTF_OPTIONS.map((tf) => (
                <button key={tf} type="button" className={`secondary-button snapshot-tag-v2 ${cfg.htf_tfs.includes(tf) ? "active" : ""}`} onClick={() => setCfgField("htf_tfs", toggleArrayValue(cfg.htf_tfs, tf))}>{tf}</button>
              ))}
            </div>
          </div>
          <div className="snapshot-col-span-4">
            <label className="minor-text">Execution TFs</label>
            <div className="snapshot-tag-wrap-v2">
              {EXEC_OPTIONS.map((tf) => (
                <button key={tf} type="button" className={`secondary-button snapshot-tag-v2 ${cfg.exec_tfs.includes(tf) ? "active" : ""}`} onClick={() => setCfgField("exec_tfs", toggleArrayValue(cfg.exec_tfs, tf))}>{tf}</button>
              ))}
            </div>
          </div>
          <div className="snapshot-col-span-3">
            <label className="minor-text">Confirmation TFs</label>
            <div className="snapshot-tag-wrap-v2">
              {CONF_OPTIONS.map((tf) => (
                <button key={tf} type="button" className={`secondary-button snapshot-tag-v2 ${cfg.conf_tfs.includes(tf) ? "active" : ""}`} onClick={() => setCfgField("conf_tfs", toggleArrayValue(cfg.conf_tfs, tf))}>{tf}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="snapshot-context-v2">
          <div className="snapshot-col-span-2">
            <label className="minor-text">HTF Bias</label>
            <select value={cfg.htfbias} onChange={(e) => setCfgField("htfbias", e.target.value)}>
              <option value="">Auto</option>
              <option>Bullish</option>
              <option>Bearish</option>
              <option>Ranging</option>
            </select>
          </div>
          <div className="snapshot-col-span-2">
            <label className="minor-text">Direction</label>
            <select value={cfg.dir} onChange={(e) => setCfgField("dir", e.target.value)}>
              <option>Direction: Both</option>
              <option>Direction: Bias</option>
              <option>Long only</option>
              <option>Short only</option>
            </select>
          </div>
          <div className="snapshot-col-span-4">
            <label className="minor-text">Key Level</label>
            <input value={cfg.keylevel} onChange={(e) => setCfgField("keylevel", e.target.value)} placeholder="e.g. 3300 resistance" />
          </div>
          <div className="snapshot-col-span-2">
            <label className="minor-text">News</label>
            <select value={cfg.news} onChange={(e) => setCfgField("news", e.target.value)}>
              <option value="">None</option>
              <option>High-impact today</option>
              <option>NFP / FOMC week</option>
              <option>Earnings release</option>
            </select>
          </div>
          <div className="snapshot-col-span-2">
            <label className="minor-text">Notes</label>
            <input value={cfg.notes} onChange={(e) => setCfgField("notes", e.target.value)} placeholder="Notes / extra context" />
          </div>
        </div>
        </section>
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
            {actionStatus.action === "capture" && actionStatus.text ? <span className={`minor-text ${actionStatus.type === "error" ? "msg-error" : actionStatus.type === "warning" ? "msg-warning" : "msg-success"}`}>{actionStatus.text}</span> : null}
            <button className="primary-button" type="button" onClick={analyzeSelected} disabled={analyzing}>{analyzing ? "Analyzing..." : "Analyze"}</button>
            {actionStatus.action === "analyze" && actionStatus.text ? <span className={`minor-text ${actionStatus.type === "error" ? "msg-error" : actionStatus.type === "warning" ? "msg-warning" : "msg-success"}`}>{actionStatus.text}</span> : null}
          </div>
        </section>

        <section className="panel snapshot-io-col-v2">
          <div className="snapshot-tabs-v2">
            <button type="button" className={`secondary-button ${responseTab === "text" ? "active" : ""}`} onClick={() => setResponseTab("text")}>Text</button>
            <button type="button" className={`secondary-button ${responseTab === "raw" ? "active" : ""}`} onClick={() => setResponseTab("raw")}>Raw</button>
            <button type="button" className={`secondary-button ${responseTab === "chart" ? "active" : ""}`} onClick={() => setResponseTab("chart")}>Chart</button>
          </div>

          {responseTab === "text" ? <textarea className="snapshot-mono-v2" rows={18} value={responseText} readOnly /> : null}
          {responseTab === "raw" ? <textarea className="snapshot-mono-v2" rows={18} value={analysisRaw || analysisJson} readOnly /> : null}
          {responseTab === "chart" ? (
            <div className="snapshot-chart-grid-v2">
              {chartFiles.length === 0 ? <div className="minor-text">No chart files from current analysis.</div> : chartFiles.map((f) => {
                const meta = parseSnapshotMeta({ file_name: f }) || {};
                return (
                  <a key={f} className="snapshot-chart-card-v2" href={`/v2/chart/snapshots/${encodeURIComponent(f)}`} target="_blank" rel="noreferrer">
                    <img src={`/v2/chart/snapshots/${encodeURIComponent(f)}`} alt={f} />
                    <div className="snapshot-chart-meta-v2">
                      <span>{meta?.symbolToken || "-"}</span>
                      <span>{intervalTokenToLabel(meta?.tfToken || "-")}</span>
                      <span>{formatCompactDateTime(meta?.createdAtMs || Date.now())}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : null}

          <div className="snapshot-actions-under-v2">
            <button className="primary-button" type="button" onClick={addToSignal} disabled={addingSignal || !canAddSignal}>{addingSignal ? "Adding..." : "Add Signal"}</button>
            {actionStatus.action === "add" && actionStatus.text ? <span className={`minor-text ${actionStatus.type === "error" ? "msg-error" : actionStatus.type === "warning" ? "msg-warning" : "msg-success"}`}>{actionStatus.text}</span> : null}
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
