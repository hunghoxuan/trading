import { useEffect, useMemo, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import { api } from "../api";
import { SignalDetailCard } from "../components/SignalDetailCard";
import TradeSignalChart from "../components/TradeSignalChart";

const STORAGE_KEY = "chart_prompt_builder_templates_v2";

const STRATEGY_OPTIONS = [
  "ICT",
  "SMC",
  "Price Action",
  "Market Structure",
  "Wyckoff",
  "EMA Trend",
  "Breakout",
  "VWAP",

];

const STRATEGY_CHECKLIST = {
  ICT: ["Liquidity sweep", "BOS/CHoCH confirmed", "PD Array reaction", "Displacement candle", "London/NY killzone alignment"],
  "Market Structure": ["HTF narrative clear", "BOS/CHoCH sequence valid", "Premium/Discount aligned", "DOL target mapped", "No structure conflict"],
  SMC: ["Liquidity grab", "Structure break", "Order block mitigation", "Imbalance/FVG reaction", "HTF bias alignment"],
  "Price Action": ["Trend context clear", "Key S/R reaction", "Candlestick confirmation", "RR >= target", "No major news conflict"],
  Wyckoff: ["Phase identified", "Spring/Upthrust event", "Volume confirmation", "Sign of strength/weakness", "Markup/markdown continuation"],
  "EMA Trend": ["EMA stack aligned", "Pullback to EMA zone", "Trend continuation candle", "Momentum confirmation", "Avoid chop/range"],
  Breakout: ["Range clearly defined", "Valid breakout close", "Retest holds", "Volume expansion", "False-break risk checked"],
  VWAP: ["Price vs VWAP bias", "VWAP reclaim/reject", "Session anchor context", "Confluence with S/R", "Risk controlled around VWAP"],
};


const DEFAULT_TEMPLATE_ID = "__default__";
const SYMBOLS_SETTING_TYPE = "SYMBOLS";
const SYMBOLS_SETTING_NAME = "WATCHLIST";

const PROFILE_PRESETS = {
  position: {
    label: "Position (1M+W / d / 4h)",
    htf_tfs: ["1M", "W"],
    exec_tfs: ["d"],
    conf_tfs: ["4h"],
    sessions: "All sessions",
    rr: "3",
  },
  swing: {
    label: "Swing (W+d / 4h / 15m)",
    htf_tfs: ["W", "d"],
    exec_tfs: ["4h"],
    conf_tfs: ["15m"],
    sessions: "London+NY",
    rr: "2",
  },
  day: {
    label: "Daily (d+4h / 15m / 5m)",
    htf_tfs: ["d", "4h"],
    exec_tfs: ["15m"],
    conf_tfs: ["5m"],
    sessions: "London+NY",
    rr: "1.5",
  },
  scalper: {
    label: "Scalping (4h+1h / 5m / 1m)",
    htf_tfs: ["4h", "1h"],
    exec_tfs: ["5m"],
    conf_tfs: ["1m"],
    sessions: "London+NY",
    rr: "1",
  },
};

const DEFAULT_CONFIG = {
  symbol: "UK100",
  asset: "Auto detect",
  session: "London+NY",
  rr: "2",
  risk: "1",
  lookbackBars: "600",
  strategies: ["ICT", "Price Action", "Market Structure"],
  profile: "day",
  htf_tfs: [...PROFILE_PRESETS.day.htf_tfs],
  exec_tfs: [...PROFILE_PRESETS.day.exec_tfs],
  conf_tfs: [...PROFILE_PRESETS.day.conf_tfs],
  htfbias: "",
  dir: "Direction: Both",
  news: "",
  notes: "",
};

const GUIDE_TEXT = `FIELD GUIDE (ICT + PRICE ACTION + MARKET STRUCTURE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYMBOL: Prefer UK100 unless chart clearly shows another symbol.
MIN_RR: 2.0 minimum.
MAX_RISK_PCT: 1.0 max per trade.
DAILY_ADR_FILTER: enabled. TP must remain realistic vs current daily ADR boundaries.

PHASE 1 — PRIMARY FILTERS
- Killzones: focus on London (02:00-05:00 EST) and New York (07:00-10:00 EST).
- Draw on Liquidity (DOL): define nearest HTF target (PDH/PDL, EQH/EQL).
- Premium/Discount: buy in discount, sell in premium.
- SMT Divergence: mark as Confirmed or None.

PHASE 2 — PD ARRAYS & LEVELS
- Include OB, FVG, Breaker, Mitigation, Liquidity Void.
- Include PDH, PDL, Weekly Open, Midnight Open, ADR High, ADR Low.
- Mark each item: active | tested | broken.

PHASE 3 — PATTERN & RISK
- Patterns: V-Shape, QM, Flag, Triangle, Pin Bar, Inside Bar, Fakey.
- Dynamic risk sizing: 1.0% (high confluence), 0.5% (standard), 0.25% (high risk).
- If setup is weak or RR < 2.0, return empty trade_plan.

OUTPUT RULE
- STRICT JSON ONLY (no markdown, no prose).
- Keep market_analysis + trade_plan structure compatible with existing app fields.
- Prefer trade_plan as array; multiple plans allowed and ranked by confidence_pct.`;

function normalizeTemplateConfig(raw) {
  const strategyValue = raw?.strategies || raw?.strategy || ["ICT"];
  const strategies = Array.isArray(strategyValue) ? strategyValue : [String(strategyValue || "ICT")];
  const profileRaw = String(raw?.profile || "").trim().toLowerCase();
  const profile = PROFILE_PRESETS[profileRaw] ? profileRaw : DEFAULT_CONFIG.profile;
  const preset = PROFILE_PRESETS[profile] || PROFILE_PRESETS.day;
  return {
    ...DEFAULT_CONFIG,
    ...(raw || {}),
    profile,
    htf_tfs: Array.isArray(raw?.htf_tfs) && raw.htf_tfs.length ? raw.htf_tfs : [...preset.htf_tfs],
    exec_tfs: Array.isArray(raw?.exec_tfs) && raw.exec_tfs.length ? raw.exec_tfs : [...preset.exec_tfs],
    conf_tfs: Array.isArray(raw?.conf_tfs) && raw.conf_tfs.length ? raw.conf_tfs : [...preset.conf_tfs],
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
  let parts = base.split("_");
  if (parts[0] === "UID" && parts.length >= 7) {
    parts = parts.slice(2);
  }
  if (parts.length < 3) return null;
  let tfToken = "";
  let sessionPrefix = "";
  let symbolParts = [];
  let tsFromName = 0;
  if (parts.length >= 5 && /^\d{8}$/.test(parts[0]) && /^\d{2}$/.test(parts[1]) && /^\d{2}$/.test(parts[2])) {
    const rest = parts.slice(3);
    if (rest.length < 2) return null;
    const hasDup = rest.length >= 3 && /^\d+$/.test(rest[rest.length - 1]);
    tfToken = String(hasDup ? rest[rest.length - 2] : rest[rest.length - 1]).toUpperCase();
    symbolParts = rest.slice(0, hasDup ? -2 : -1);
    const yyyy = Number(parts[0].slice(0, 4));
    const mm = Number(parts[0].slice(4, 6));
    const dd = Number(parts[0].slice(6, 8));
    const hh = Number(parts[1]);
    const mi = Number(parts[2]);
    tsFromName = Date.UTC(yyyy, Math.max(mm - 1, 0), dd, hh, mi, 0, 0);
  } else {
    const hasDup = parts.length >= 4 && /^\d+$/.test(parts[parts.length - 1]);
    tfToken = String(hasDup ? parts[parts.length - 2] : parts[parts.length - 1]).toUpperCase();
    sessionPrefix = String(hasDup ? parts[parts.length - 3] : parts[parts.length - 2] || "").toUpperCase();
    symbolParts = parts.slice(0, hasDup ? -3 : -2);
  }
  if (!symbolParts.length || !tfToken) return null;
  return {
    fileName,
    tfToken,
    sessionPrefix,
    symbolToken: symbolParts.join("_"),
    createdAtMs: Date.parse(it?.created_at || "") || tsFromName || 0,
  };
}

function makeSessionPrefix() {
  const now = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${now}${rnd}`.replace(/[^A-Z0-9]/g, "").slice(0, 12);
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

import { showDateTime } from "../utils/format";

function formatCompactDateTime(dateLike) {
  return showDateTime(dateLike);
}

function parseNum(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  let raw = String(value ?? "").trim();
  if (!raw) return NaN;
  if (/^-?\d+,\d+$/.test(raw)) raw = raw.replace(",", ".");
  else raw = raw.replace(/,/g, "");
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  if (!m) return NaN;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : NaN;
}

function formatNum3(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n * 1000) / 1000);
}

function parsePdZoneBounds(zoneRaw) {
  if (zoneRaw === null || zoneRaw === undefined) return { low: null, high: null };
  if (typeof zoneRaw === "number" && Number.isFinite(zoneRaw)) return { low: zoneRaw, high: zoneRaw };
  const txt = String(zoneRaw).trim();
  if (!txt) return { low: null, high: null };
  const nums = txt.match(/-?\d+(?:\.\d+)?/g) || [];
  const a = nums[0] ? Number(nums[0]) : NaN;
  const b = nums[1] ? Number(nums[1]) : NaN;
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return { low: Math.min(a, b), high: Math.max(a, b) };
  }
  if (Number.isFinite(a)) return { low: a, high: a };
  return { low: null, high: null };
}

function normalizeTfLabelToLower(tfRaw) {
  const tf = String(tfRaw || "").trim().toLowerCase();
  if (!tf) return "15m";
  if (/^\d+$/.test(tf)) return `${tf}m`;
  if (tf.endsWith("m") || tf.endsWith("h") || tf.endsWith("d") || tf.endsWith("w")) return tf;
  return tf;
}

function tfToSeconds(tfRaw) {
  const s = String(tfRaw || "").trim().toLowerCase();
  if (!s) return 900;
  if (/^\d+$/.test(s)) return Math.max(60, Number(s) * 60);
  const m = s.match(/^(\d+)\s*(m|min|h|d|w)$/i);
  if (!m) return 900;
  const n = Math.max(1, Number(m[1] || 1));
  const u = String(m[2] || "").toLowerCase();
  if (u === "m" || u === "min") return n * 60;
  if (u === "h") return n * 3600;
  if (u === "d") return n * 86400;
  if (u === "w") return n * 604800;
  return 900;
}

function normalizeSnapshotBars(snapshot, tfRaw = "") {
  const rawBars = Array.isArray(snapshot?.bars) ? snapshot.bars : [];
  if (!rawBars.length) return snapshot;
  const tfSec = tfToSeconds(tfRaw || snapshot?.tf_norm || snapshot?.timeframe || snapshot?.interval);
  const nowSec = Math.floor(Date.now() / 1000);
  const dedup = new Map();
  rawBars.forEach((x) => {
    const t = Number(x?.time);
    const o = Number(x?.open);
    const h = Number(x?.high);
    const l = Number(x?.low);
    const c = Number(x?.close);
    if (!Number.isFinite(t) || !Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) return;
    if (t > nowSec + (tfSec * 2)) return;
    dedup.set(t, { time: t, open: o, high: h, low: l, close: c });
  });
  let bars = [...dedup.values()].sort((a, b) => a.time - b.time);
  if (bars.length >= 30) {
    const ranges = bars.map((b) => Math.abs(b.high - b.low)).filter((v) => Number.isFinite(v) && v > 0);
    const typicalRange = ranges.length ? ranges.sort((a, b) => a - b)[Math.floor(ranges.length / 2)] : 0;
    if (typicalRange > 0) {
      const tinyRange = typicalRange * 0.06;
      let trailingTiny = 0;
      for (let i = bars.length - 1; i >= 0; i -= 1) {
        const r = Math.abs(Number(bars[i].high) - Number(bars[i].low));
        if (r <= tinyRange) trailingTiny += 1;
        else break;
      }
      if (trailingTiny >= 12) {
        bars = bars.slice(0, Math.max(10, bars.length - trailingTiny + 2));
      }
    }
  }
  if (!bars.length) return snapshot;
  return {
    ...(snapshot || {}),
    bars,
    bar_start: bars[0].time,
    bar_end: bars[bars.length - 1].time,
  };
}

function aiSourceFromModel(modelRaw) {
  const model = String(modelRaw || "").trim().toLowerCase();
  if (!model) return "ai_claude";
  if (model.includes("gpt") || model.includes("openai")) return "ai_openai";
  if (model.includes("gemini")) return "ai_gemini";
  if (model.includes("deepseek")) return "ai_deepseek";
  if (model.includes("claude")) return "ai_claude";
  return "ai_claude";
}

function liveTfToTradingViewInterval(tfRaw) {
  const s = String(tfRaw || "").toUpperCase();
  if (s === "W") return "W";
  if (s === "D") return "D";
  if (s === "4H") return "240";
  if (s === "15M") return "15";
  if (s === "5M") return "5";
  if (s === "1M") return "1";
  return "15";
}

function configTfToSnapshotTf(tfRaw) {
  const s = String(tfRaw || "").trim().toUpperCase();
  if (s === "W" || s === "W1") return "1w";
  if (s === "D" || s === "D1") return "1D";
  if (s === "4H") return "4h";
  if (s === "2H") return "2h";
  if (s === "1H") return "1h";
  if (s === "30M") return "30m";
  if (s === "15M") return "15m";
  if (s === "5M") return "5m";
  if (s === "3M") return "3m";
  if (s === "1M") return "1m";
  return String(tfRaw || "").trim();
}

function extractPositionFromAnalysis(parsed) {
  const tradePlans = [];
  if (Array.isArray(parsed?.trade_plan)) tradePlans.push(...parsed.trade_plan);
  if (parsed?.trade_plan && typeof parsed.trade_plan === "object" && !Array.isArray(parsed.trade_plan)) tradePlans.push(parsed.trade_plan);
  if (!tradePlans.length && parsed?.trade_setup && typeof parsed.trade_setup === "object") tradePlans.push(parsed.trade_setup);
  if (!tradePlans.length && parsed && typeof parsed === "object") tradePlans.push(parsed);
  const bestPlan = tradePlans
    .map((x) => ({ ...(x || {}), confidence_pct: parseNum(x?.confidence_pct) }))
    .sort((a, b) => {
      const ac = Number.isFinite(a.confidence_pct) ? a.confidence_pct : -1;
      const bc = Number.isFinite(b.confidence_pct) ? b.confidence_pct : -1;
      return bc - ac;
    })[0] || {};
  const plan = bestPlan;
  const directionRaw = String(plan.direction || parsed?.direction || "").trim().toUpperCase();
  const direction = (
    directionRaw.includes("SELL") ||
    directionRaw.includes("SHORT") ||
    directionRaw === "S"
  )
    ? "SELL"
    : (
      directionRaw.includes("BUY") ||
      directionRaw.includes("LONG") ||
      directionRaw === "B"
    )
      ? "BUY"
      : "";
  const entry = parseNum(plan.entry ?? parsed?.entry ?? parsed?.price);
  const sl = parseNum(plan.sl ?? parsed?.sl);
  const tpLevels = Array.isArray(plan?.tp_levels) ? plan.tp_levels : (Array.isArray(plan?.targets) ? plan.targets : []);
  const tp = parseNum(tpLevels[0] ?? plan.tp1 ?? plan.tp ?? parsed?.tp ?? parsed?.take_profit);
  const rrRaw = parseNum(plan.rr ?? parsed?.rr);
  let rr = Number.isFinite(rrRaw) ? rrRaw : null;
  if (!Number.isFinite(rr) && Number.isFinite(entry) && Number.isFinite(sl) && Number.isFinite(tp)) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk > 0 && reward > 0) rr = Number((reward / risk).toFixed(2));
  }
  return {
    direction: direction || "BUY",
    entry: Number.isFinite(entry) ? formatNum3(entry) : "",
    tp: Number.isFinite(tp) ? formatNum3(tp) : "",
    sl: Number.isFinite(sl) ? formatNum3(sl) : "",
    rr: Number.isFinite(rr) ? formatNum3(rr) : "",
    trade_type: String(plan.type || parsed?.type || "limit").trim().toLowerCase() || "limit",
    note: String(plan.note || parsed?.invalidation || parsed?.note || "").trim(),
  };
}

function extractPositionFromPlan(plan, parsed = {}) {
  const item = plan && typeof plan === "object" ? plan : {};
  const directionRaw = String(item.direction || parsed?.direction || "").trim().toUpperCase();
  const direction = directionRaw.includes("SELL") || directionRaw.includes("SHORT")
    ? "SELL"
    : directionRaw.includes("BUY") || directionRaw.includes("LONG")
      ? "BUY"
      : "BUY";
  const entry = parseNum(item.entry ?? parsed?.entry ?? parsed?.price);
  const sl = parseNum(item.sl ?? parsed?.sl);
  const tpLevels = Array.isArray(item?.tp_levels) ? item.tp_levels : (Array.isArray(item?.targets) ? item.targets : []);
  const tp = parseNum(tpLevels[0] ?? item.tp1 ?? item.tp ?? parsed?.tp ?? parsed?.take_profit);
  const rrRaw = parseNum(item.rr ?? parsed?.rr);
  let rr = Number.isFinite(rrRaw) ? rrRaw : null;
  if (!Number.isFinite(rr) && Number.isFinite(entry) && Number.isFinite(sl) && Number.isFinite(tp)) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk > 0 && reward > 0) rr = Number((reward / risk).toFixed(2));
  }
  return {
    direction,
    entry: Number.isFinite(entry) ? formatNum3(entry) : "",
    tp: Number.isFinite(tp) ? formatNum3(tp) : "",
    sl: Number.isFinite(sl) ? formatNum3(sl) : "",
    rr: Number.isFinite(rr) ? formatNum3(rr) : "",
    trade_type: String(item.type || parsed?.type || "limit").trim().toLowerCase() || "limit",
    note: String(item.note || parsed?.invalidation || parsed?.note || "").trim(),
  };
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

function normalizeWatchSymbol(symbolRaw) {
  return normalizeSignalSymbol(symbolRaw).replace(/\s+/g, "");
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
  let tradePlanBlock = raw.match(/"trade_plan"\s*:\s*\{([\s\S]*?)\}\s*(?:,|\})/i)?.[1] || "";
  if (!tradePlanBlock) {
    tradePlanBlock = raw.match(/"trade_plan"\s*:\s*\[\s*\{([\s\S]*?)\}\s*(?:,|\])/i)?.[1] || "";
  }
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
      type: inPlan(/"type"\s*:\s*"([^"]+)"/i),
      strategy: inPlan(/"strategy"\s*:\s*"([^"]+)"/i),
      entry_model: inPlan(/"entry_model"\s*:\s*"([^"]+)"/i),
      confidence_pct: inPlanNum(/"confidence_pct"\s*:\s*(-?\d+(?:\.\d+)?)/i),
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

function getEffectiveTfConfig(cfg) {
  const profileKey = String(cfg?.profile || "").trim().toLowerCase();
  const preset = PROFILE_PRESETS[profileKey] || PROFILE_PRESETS.day;
  return {
    profile: PROFILE_PRESETS[profileKey] ? profileKey : "day",
    htf_tfs: Array.isArray(cfg?.htf_tfs) && cfg.htf_tfs.length ? cfg.htf_tfs : [...preset.htf_tfs],
    exec_tfs: Array.isArray(cfg?.exec_tfs) && cfg.exec_tfs.length ? cfg.exec_tfs : [...preset.exec_tfs],
    conf_tfs: Array.isArray(cfg?.conf_tfs) && cfg.conf_tfs.length ? cfg.conf_tfs : [...preset.conf_tfs],
  };
}

function buildPrompt(cfg) {
  const tfConfig = getEffectiveTfConfig(cfg);
  const profileLabel = {
    position: "position",
    swing: "swing",
    day: "daily",
    scalper: "scalping",
  }[tfConfig.profile] || "daily";
  const symbol = String(cfg.symbol || "UK100").trim() || "UK100";
  const strategy = cfg.strategies.join(", ") || "ICT";
  const context = [];
  if (cfg.htfbias) context.push(`htf_bias_override: "${cfg.htfbias}"`);
  if (cfg.dir) context.push(`direction: "${cfg.dir}"`);
  if (cfg.news) context.push(`news_risk: "${cfg.news}"`);
  if (cfg.session && cfg.session !== "Any") context.push(`session: "${cfg.session}"`);
  if (cfg.notes) context.push(`notes: "${cfg.notes}"`);
  const tfJson = JSON.stringify(
    {
      htf_bias_tfs: tfConfig.htf_tfs,
      execution_tf: tfConfig.exec_tfs,
      confirmation_tf: tfConfig.conf_tfs,
    },
    null,
    2,
  );

  const checklistRules = (cfg.strategies.length ? cfg.strategies : ["ICT"])
    .map((s) => {
      const rules = STRATEGY_CHECKLIST[s] || [];
      return `- ${s}: ${rules.join("; ")}`;
    })
    .join("\n");

  return `Act as a Senior ICT + Price Action + Market Structure trader. Analyze uploaded chart(s).\n\nCONFIG:\nSYMBOL: ${symbol} (or auto-detect)\nASSET_CLASS: ${cfg.asset}\nSTRATEGY: ${strategy}\nMIN_RR: ${cfg.rr}\nMAX_RISK_PCT: ${cfg.risk}%\nDAILY_ADR_FILTER: true\n${context.length ? `\nCONTEXT:\n${context.map((x) => `  ${x}`).join("\n")}\n` : ""}\nTIMEFRAME_ARRAY:\n${tfJson}\n\nPHASE 1 — PRIMARY FILTERS\n1. Time alignment killzones: London (02:00-05:00 EST), New York (07:00-10:00 EST).\n2. Draw on Liquidity (DOL): identify HTF target (PDH/PDL, EQH/EQL).\n3. Premium vs Discount: buys in discount (<0.5 fib), sells in premium (>0.5 fib).\n4. SMT divergence: mark institutional sponsorship as Confirmed or None.\n\nPHASE 2 — ARRAYS & KEY LEVELS\n1. PD arrays: OB, FVG, Breaker, Mitigation, Liquidity Void.\n2. Key levels: PDH, PDL, Weekly Open, Midnight Open, ADR High, ADR Low.\n3. Mark each array/level status as active|tested|broken where applicable.\n4. Include bar_start_unix (or bar_start) when possible.\n\nPHASE 3 — PATTERN & RISK LOGIC\n1. Pattern scan: V-Shape, Quasimodo, Flag, Triangle, Pin Bar, Inside Bar, Fakey.\n2. Dynamic risk sizing guide:\n   - >85 confluence: 1.0%\n   - standard: 0.5%\n   - high risk: 0.25%\n3. TP targeting must be realistic relative to daily ADR.\n4. Reject setup when RR < ${cfg.rr}.\n\nCHECKLIST CONDITIONS BY STRATEGY:\n${checklistRules}\n\nOUTPUT RULES\n1. Return STRICT JSON only (no markdown, no prose).\n2. Keep compatibility with existing fields and structure.\n3. trade_plan can contain multiple plans sorted by confidence_pct.\n4. If no valid setup, return trade_plan as empty array.\n\nOUTPUT:\n{\n  "symbol": "",\n  "market_analysis": {\n    "bias": "",\n    "trend": "",\n    "timeframes": [\n      { "tf": "D|4H|1H|15M", "trend": "Bullish|Bearish|Neutral", "bias": "Long|Short|Neutral" }\n    ],\n    "pd_arrays": [\n      { "type": "OB|FVG|Breaker|Mitigation|Void|Liquidity", "bar_start": null, "price_top": null, "price_bottom": null, "status": "active|tested|broken" }\n    ],\n    "key_levels": [\n      { "name": "PDH|PDL|WeeklyOpen|MidnightOpen|ADR_High|ADR_Low", "price": null, "type": "S/R|Liquidity", "bar_start": null }\n    ],\n    "institutional_filters": {\n      "killzone": "Active|Inactive",\n      "dol": "",\n      "p_d_status": "Premium|Discount|Equilibrium",\n      "smt": "Confirmed|None"\n    },\n    "confluence_checklist": [\n      { "item": "Killzone alignment", "checked": true, "note": "" },\n      { "item": "HTF Bias alignment", "checked": true, "note": "" },\n      { "item": "SMT Divergence", "checked": false, "note": "" }\n    ]\n  },\n  "trade_plan": [\n    {\n      "direction": "BUY|SELL|NULL",\n      "profile": "position|swing|daily|scalping",\n      "entry_model": "",\n      "entry": null,\n      "sl": null,\n      "tp_levels": [null, null, null],\n      "tp1": null,\n      "tp2": null,\n      "tp3": null,\n      "invalidation": "",\n      "rr": null,\n      "size_vol_pct": "",\n      "type": "limit|stop|market",\n      "strategy": "",\n      "confidence_pct": null,\n      "checklist_reasons_to_take": ["string reasons"],\n      "checklist_reasons_NOT_to_take": ["string reasons"],\n      "note": ""\n    }\n  ]\n}\n\nSELECTED_PROFILE: ${profileLabel}`;
}

function buildJsonConfig(cfg) {
  const tfConfig = getEffectiveTfConfig(cfg);
  return JSON.stringify(
    {
      version: "2.1",
      saved_at: new Date().toISOString(),
      config: {
        symbol: cfg.symbol,
        profile: tfConfig.profile,
        asset_class: cfg.asset,
        strategy: cfg.strategies.join(" + "),
        strategies: cfg.strategies,
        session: cfg.session,
        min_rr: Number(cfg.rr),
        max_risk_pct: Number(cfg.risk),
        daily_adr_filter: true,
        killzones_est: ["02:00-05:00", "07:00-10:00"],
        risk_tiers_pct: {
          high_confluence_gt_85: 1.0,
          standard: 0.5,
          high_risk: 0.25,
        },
        required_patterns: ["V-Shape", "Quasimodo", "Flag", "Triangle", "Pin Bar", "Inside Bar", "Fakey"],
        lookback_bars: Number(cfg.lookbackBars),
        timeframe_array: {
          htf_bias_tfs: tfConfig.htf_tfs,
          execution_tf: tfConfig.exec_tfs,
          confirmation_tf: tfConfig.conf_tfs,
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
  if (Array.isArray(parsed.trade_plan)) rows.push(...parsed.trade_plan.map((x) => ({ ...(x || {}), symbol: parsed.symbol || fallback.symbol })));
  if (parsed.trade_setup && typeof parsed.trade_setup === "object") {
    rows.push({ ...(parsed.trade_setup || {}), symbol: parsed.symbol || fallback.symbol });
  }
  if (parsed.trade_plan && typeof parsed.trade_plan === "object" && !Array.isArray(parsed.trade_plan)) {
    rows.push({ ...(parsed.trade_plan || {}), symbol: parsed.symbol || fallback.symbol });
  }
  if (!rows.length) rows.push(parsed);

  return rows
    .map((s) => {
      const sideRaw = String(s?.side || s?.direction || s?.action || "").toUpperCase();
      const action = sideRaw.includes("SELL") ? "SELL" : "BUY";
      const entry = parseNum(s?.entry ?? s?.price ?? s?.entry_price);
      const sl = parseNum(s?.sl ?? s?.stop_loss);
      const tpLevels = Array.isArray(s?.tp_levels) ? s.tp_levels : (Array.isArray(s?.targets) ? s.targets : []);
      const tp = parseNum(tpLevels[0] ?? s?.tp ?? s?.take_profit ?? s?.tp1 ?? s?.target);
      const strategy = String(s?.strategy || fallback.strategy || "ai").trim();
      const entryModel = String(s?.entry_model || s?.model || "ai_claude").trim() || "ai_claude";
      const source = String(s?.source || fallback.source || "ai_claude").trim() || "ai_claude";
      return {
        symbol: normalizeSignalSymbol(s?.symbol || fallback.symbol || ""),
        action,
        entry,
        sl,
        tp,
        tf: String(s?.timeframe || fallback.timeframe || "15m").trim(),
        model: entryModel,
        entry_model: entryModel,
        order_type: String(s?.type || s?.order_type || "limit").trim().toLowerCase(),
        note: typeof s?.note === "string" ? s.note : "",
        source,
        strategy,
        rr: parseNum(s?.rr),
        profile: String(s?.profile || parsed?.profile || "").trim(),
        confidence_pct: parseNum(s?.confidence_pct),
        invalidation: String(s?.invalidation || parsed?.invalidation || "").trim(),
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

function validatePosition(pos = {}) {
  const entry = parseNum(pos.entry);
  const tp = parseNum(pos.tp);
  const sl = parseNum(pos.sl);
  const rr = parseNum(pos.rr);
  const directionRaw = String(pos.direction || "").trim().toUpperCase();
  const direction = directionRaw === "BUY" || directionRaw === "SELL"
    ? directionRaw
    : (Number.isFinite(entry) && Number.isFinite(tp) ? (tp >= entry ? "BUY" : "SELL") : "");

  if (!Number.isFinite(entry) || !Number.isFinite(tp) || !Number.isFinite(sl)) {
    return "Entry/TP/SL must be numeric values.";
  }
  if (Number.isFinite(rr) && (rr < 0.3 || rr > 5)) {
    return "RR must be between 0.3 and 5.";
  }
  if (direction === "BUY") {
    if (!(tp > entry)) return "For BUY, TP must be greater than Entry.";
    if (!(sl < entry)) return "For BUY, SL must be lower than Entry.";
  }
  if (direction === "SELL") {
    if (!(tp < entry)) return "For SELL, TP must be lower than Entry.";
    if (!(sl > entry)) return "For SELL, SL must be greater than Entry.";
  }
  return "";
}

export default function ChartSnapshotsPage() {
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState(() => loadTemplates());
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [templateName, setTemplateName] = useState("");

  const [provider, setProvider] = useState("ICMARKETS");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [addingSignal, setAddingSignal] = useState(false);
  const [settingsTab, setSettingsTab] = useState("settings");
  const [responseTab, setResponseTab] = useState("text");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [actionStatus, setActionStatus] = useState({ action: "", type: "", text: "" });

  const [analysisRaw, setAnalysisRaw] = useState("");
  const [analysisJson, setAnalysisJson] = useState("");
  const [analysisParsed, setAnalysisParsed] = useState(null);
  const [analysisSource, setAnalysisSource] = useState("ai_claude");
  const [usedFiles, setUsedFiles] = useState([]);
  const [sessionPrefix, setSessionPrefix] = useState("");

  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [symbolOptions, setSymbolOptions] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [analysisFilesDisplay, setAnalysisFilesDisplay] = useState([]);
  const [position, setPosition] = useState({ direction: "BUY", entry: "", tp: "", sl: "", rr: "", trade_type: "limit", note: "" });
  const [barsCache, setBarsCache] = useState({});
  const [barsLoading, setBarsLoading] = useState(false);
  const [symbolActivity, setSymbolActivity] = useState({ loading: false, items: [] });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState(() => buildPrompt(DEFAULT_CONFIG));
  const [promptEdited, setPromptEdited] = useState(false);
  const [guideDraft, setGuideDraft] = useState(GUIDE_TEXT);
  const liteChartRef = useRef(null);
  const liteChartApiRef = useRef(null);
  const tfConfig = useMemo(() => getEffectiveTfConfig(cfg), [cfg]);

  const tvSymbol = useMemo(() => {
    const base = String(cfg.symbol || "").trim();
    if (!base) return "";
    return base.includes(":") ? base : `${provider}:${base}`;
  }, [cfg.symbol, provider]);

  const promptText = useMemo(() => buildPrompt(cfg), [cfg]);
  const [selectedEntryTf, setSelectedEntryTf] = useState("");
  const timeframe = useMemo(() => selectedEntryTf || normalizeTfLabelToLower(tfConfig.exec_tfs?.[0] || "15m"), [selectedEntryTf, tfConfig.exec_tfs]);
  const snapshotTfs = useMemo(() => {
    const all = [...(tfConfig.htf_tfs || []), ...(tfConfig.exec_tfs || []), ...(tfConfig.conf_tfs || [])];
    return [...new Set(all.map(configTfToSnapshotTf).filter(Boolean))];
  }, [tfConfig.htf_tfs, tfConfig.exec_tfs, tfConfig.conf_tfs]);
  const jsonConfigText = useMemo(() => buildJsonConfig(cfg), [cfg]);
  const widgetTfs = useMemo(() => {
    const base = [...new Set([...(tfConfig.htf_tfs || []), ...(tfConfig.exec_tfs || []), ...(tfConfig.conf_tfs || [])]
      .map((x) => String(x || "").toLowerCase().trim())
      .filter(Boolean))];
    const fallback = ["d", "4h", "15m", "5m", "1m", "w"];
    for (const tf of fallback) {
      if (base.length >= 4) break;
      if (!base.includes(tf.toLowerCase())) base.push(tf.toLowerCase());
    }
    return base.slice(0, 4);
  }, [tfConfig.htf_tfs, tfConfig.exec_tfs, tfConfig.conf_tfs]);
  const effectiveParsed = useMemo(
    () => enrichParsedAnalysis(analysisRaw, analysisParsed || tryParseJsonLoose(analysisJson) || tryParseJsonLoose(analysisRaw)),
    [analysisParsed, analysisJson, analysisRaw],
  );
  const hasResponse = useMemo(
    () => Boolean((analysisRaw || "").trim() || (analysisJson || "").trim() || (effectiveParsed && typeof effectiveParsed === "object")),
    [analysisRaw, analysisJson, effectiveParsed],
  );
  const responseText = useMemo(() => buildFriendlyResponse(effectiveParsed), [effectiveParsed]);
  const canAddSignal = useMemo(
    () => {
      const fromAi = extractSignalsFromAnalysis(effectiveParsed, {
        symbol: tvSymbol,
        timeframe,
        strategy: cfg.strategies.join("+") || "ai",
        source: analysisSource,
      }).length > 0;
      if (fromAi) return true;
      const err = validatePosition(position);
      return Boolean(normalizeSignalSymbol(tvSymbol || cfg.symbol || "")) && !err;
    },
    [effectiveParsed, tvSymbol, timeframe, cfg.strategies, position.entry, position.sl, position.tp, position.rr, position.direction, cfg.symbol],
  );
  const normalizedSymbolForBars = useMemo(() => normalizeSignalSymbol(tvSymbol || cfg.symbol || ""), [tvSymbol, cfg.symbol]);
  const currentBarsKey = useMemo(
    () => `${normalizedSymbolForBars}|${timeframe}|${Number(cfg.lookbackBars || 300) || 300}`,
    [normalizedSymbolForBars, timeframe, cfg.lookbackBars],
  );
  const currentBarsSnapshot = barsCache[currentBarsKey] || null;

  const setCfgField = (key, value) => setCfg((prev) => ({ ...prev, [key]: value }));
  const resetPositionLocal = () => {
    if (effectiveParsed && typeof effectiveParsed === "object") {
      setPosition(extractPositionFromAnalysis(effectiveParsed));
      return;
    }
    setPosition({ direction: "BUY", entry: "", tp: "", sl: "", rr: "", trade_type: "limit", note: "" });
  };
  const setProfilePreset = (profileKey) => {
    const key = String(profileKey || "").trim().toLowerCase();
    const preset = PROFILE_PRESETS[key] || PROFILE_PRESETS.day;
    setCfg((prev) => ({
      ...prev,
      profile: PROFILE_PRESETS[key] ? key : "day",
      htf_tfs: [...preset.htf_tfs],
      exec_tfs: [...preset.exec_tfs],
      conf_tfs: [...preset.conf_tfs],
    }));
  };

  const loadSnapshots = async () => {
    setLoading(true);
    setStatus({ type: "", text: "" });
    try {
      const out = await api.chartSnapshots(60);
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

  const fetchBarsSnapshot = async (symbol, tf, bars, forceRefresh = false) => {
    const sym = normalizeSignalSymbol(symbol || "");
    const cacheKey = `${sym}|${tf}|${bars}`;
    if (!sym) return null;
    if (!forceRefresh && barsCache[cacheKey]) {
      return barsCache[cacheKey];
    }
    setBarsLoading(true);
    try {
      const out = await api.chartTwelveCandles(sym, tf, bars, forceRefresh);
      const rawSnap = out?.snapshot && typeof out.snapshot === "object" ? out.snapshot : null;
      const snap = rawSnap ? normalizeSnapshotBars(rawSnap, tf) : null;
      if (snap) {
        setBarsCache((prev) => ({ ...prev, [cacheKey]: snap }));
      }
      return snap;
    } catch {
      return null;
    } finally {
      setBarsLoading(false);
    }
  };

  const analyzeFiles = async (files = []) => {
    setAnalyzing(true);
    setStatus({ type: "", text: "" });
    setAnalysisRaw("");
    setAnalysisJson("");
    setAnalysisParsed(null);
    setUsedFiles([]);
    setAnalysisFilesDisplay(Array.isArray(files) ? files : []);
    const activeSessionPrefix = sessionPrefix || makeSessionPrefix();
    if (!sessionPrefix) setSessionPrefix(activeSessionPrefix);
    try {
      const prefetchSymbol = normalizeSignalSymbol(tvSymbol || cfg.symbol || "");
      const prefetchTf = timeframe;
      const prefetchBars = Number(cfg.lookbackBars || 300) || 300;
      const prefetchBarsPromise = prefetchSymbol
        ? fetchBarsSnapshot(prefetchSymbol, prefetchTf, prefetchBars, true)
        : Promise.resolve(null);

      const basePrompt = String(promptDraft || promptText || "").trim();
      const composedPrompt = [
        basePrompt,
        "JSON_CONFIG:",
        jsonConfigText,
        "GUIDE:",
        String(guideDraft || "").trim(),
      ].filter(Boolean).join("\n\n");
      const payload = {
        model: "claude-sonnet-4-0",
        prompt: composedPrompt,
        session_prefix: activeSessionPrefix,
      };
      if (Array.isArray(files) && files.length) payload.files = files;
      const out = await api.chartSnapshotsAnalyze(payload);
      const raw = String(out?.raw_response || "");
      setAnalysisRaw(raw);
      setAnalysisSource(aiSourceFromModel(out?.model));
      const parsed = enrichParsedAnalysis(raw, out?.parsed_json || tryParseJsonLoose(raw));
      if (parsed && typeof parsed === "object") {
        setAnalysisParsed(parsed);
        setAnalysisJson(JSON.stringify(parsed, null, 2));
        setPosition(extractPositionFromAnalysis(parsed));
        const symbolForBars = normalizeSignalSymbol(parsed?.symbol || tvSymbol || cfg.symbol || "");
        const prefetched = await prefetchBarsPromise;
        if (!prefetched || normalizeSignalSymbol(symbolForBars) !== normalizeSignalSymbol(prefetchSymbol)) {
          await fetchBarsSnapshot(symbolForBars, timeframe, Number(cfg.lookbackBars || 300) || 300, true);
        }
      }
      setUsedFiles(Array.isArray(out?.used_files) ? out.used_files : []);
      if (!files.length) setAnalysisFilesDisplay(Array.isArray(out?.used_files) ? out.used_files : []);
      setResponseTab("chart");
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
    const activeSessionPrefix = sessionPrefix || makeSessionPrefix();
    if (!sessionPrefix) setSessionPrefix(activeSessionPrefix);
    try {
      const out = await api.chartSnapshotCreateBatch({
        symbol: tvSymbol,
        provider,
        session_prefix: activeSessionPrefix,
        timeframes: tfs,
        lookbackBars: Number(cfg.lookbackBars || 300),
        format: "jpg",
        quality: 55,
      });
      const created = Array.isArray(out?.items) ? out.items : [];
      if (created.length) {
        setItems((prev) => [...created, ...prev].slice(0, 60));
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
    const activeSessionPrefix = sessionPrefix || makeSessionPrefix();
    if (!sessionPrefix) setSessionPrefix(activeSessionPrefix);
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
      .filter((x) => !activeSessionPrefix || !x.sessionPrefix || x.sessionPrefix === activeSessionPrefix)
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
        session_prefix: activeSessionPrefix,
        timeframes: tfs,
        lookbackBars: Number(cfg.lookbackBars || 300),
        format: "jpg",
        quality: 55,
      });
      const created = Array.isArray(out?.items) ? out.items : [];
      if (created.length) {
        setItems((prev) => [...created, ...prev].slice(0, 60));
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

  const updatePositionField = (key, value) => {
    setPosition((prev) => {
      let normalizedValue = value;
      if (["entry", "tp", "sl", "rr"].includes(key)) {
        normalizedValue = String(value ?? "").replace(",", ".");
      }
      const next = { ...prev, [key]: normalizedValue };
      const e = parseNum(next.entry);
      const s = parseNum(next.sl);
      const t = parseNum(next.tp);
      const rrInput = parseNum(next.rr);
      if (key === "rr") {
        if (Number.isFinite(e) && Number.isFinite(s) && Number.isFinite(rrInput) && rrInput > 0) {
          const risk = Math.abs(e - s);
          if (risk > 0) {
            const currentTp = parseNum(prev.tp);
            const dirSign = Number.isFinite(currentTp)
              ? (currentTp >= e ? 1 : -1)
              : (String(prev.direction || "").toUpperCase().includes("SELL") ? -1 : 1);
            const nextTp = e + dirSign * (risk * rrInput);
            if (Number.isFinite(nextTp)) next.tp = formatNum3(nextTp);
          }
        }
      } else if (Number.isFinite(e) && Number.isFinite(s) && Number.isFinite(t)) {
        const risk = Math.abs(e - s);
        const reward = Math.abs(t - e);
        if (risk > 0 && reward > 0) next.rr = formatNum3(reward / risk);
      }
      if (["entry", "tp", "sl", "rr"].includes(key)) {
        const parsed = parseNum(next[key]);
        next[key] = Number.isFinite(parsed) ? formatNum3(parsed) : "";
      }
      return next;
    });
  };

  const addBySelection = async (mode = "signal") => {
    setAddingSignal(true);
    setStatus({ type: "", text: "" });
    const activeSessionPrefix = sessionPrefix || makeSessionPrefix();
    if (!sessionPrefix) setSessionPrefix(activeSessionPrefix);
    try {
      let parsed = effectiveParsed;
      if (!parsed && analysisJson) parsed = JSON.parse(analysisJson);
      if (!parsed && analysisRaw) parsed = enrichParsedAnalysis(analysisRaw, tryParseJsonLoose(analysisRaw));
      const signals = extractSignalsFromAnalysis(parsed, {
        symbol: tvSymbol,
        timeframe,
        strategy: cfg.strategies.join("+") || "ai",
        source: analysisSource,
      });
      if (!signals.length) {
        const symbolManual = normalizeSignalSymbol(tvSymbol || cfg.symbol || "");
        const entry = parseNum(position.entry);
        const sl = parseNum(position.sl);
        const tp = parseNum(position.tp);
        const validationErr = validatePosition(position);
        if (!symbolManual || !Number.isFinite(entry) || !Number.isFinite(sl) || !Number.isFinite(tp)) {
          throw new Error("No valid signal found. Fill Entry/TP/SL or run Analyze first.");
        }
        if (validationErr) throw new Error(validationErr);
        const dir = String(position.direction || "").trim().toUpperCase();
        signals.push({
          symbol: symbolManual,
          action: dir === "BUY" || dir === "SELL" ? dir : (tp >= entry ? "BUY" : "SELL"),
          entry,
          sl,
          tp,
          tf: timeframe,
          model: analysisSource,
          entry_model: analysisSource,
          order_type: String(position.trade_type || "limit").toLowerCase(),
          note: position.note || "",
          source: analysisSource,
          strategy: cfg.strategies.join("+") || "ai",
          rr: parseNum(position.rr),
        });
      }
      const validationErr = validatePosition(position);
      if (validationErr) throw new Error(validationErr);
      let createdCount = 0;
      for (let i = 0; i < signals.length; i++) {
        const payload = signals[i];
        const dir = String(position.direction || "").trim().toUpperCase();
        const cachedSnapshot = currentBarsSnapshot && typeof currentBarsSnapshot === "object" ? currentBarsSnapshot : null;
        const mergedPdArrays = Array.isArray(parsed?.market_analysis?.pd_arrays) ? parsed.market_analysis.pd_arrays : [];
        const mergedKeyLevels = Array.isArray(parsed?.market_analysis?.key_levels) ? parsed.market_analysis.key_levels : [];
        const analysisSnapshotPayload = cachedSnapshot
          ? {
            ...cachedSnapshot,
            pd_arrays: mergedPdArrays,
            key_levels: mergedKeyLevels,
            htf_tfs: Array.isArray(tfConfig?.htf_tfs) ? tfConfig.htf_tfs : [],
            summary: {
              ...(cachedSnapshot.summary && typeof cachedSnapshot.summary === "object" ? cachedSnapshot.summary : {}),
              profile: payload?.profile || parsed?.profile || "",
              bias: parsed?.market_analysis?.bias || "",
              trend: parsed?.market_analysis?.trend || "",
              note: position.note || payload.note || "",
            },
          }
          : undefined;

        const finalPayload = {
          ...payload,
          source: String(payload?.source || analysisSource || "ai_claude").trim() || "ai_claude",
          session_prefix: activeSessionPrefix ? `${activeSessionPrefix}_${i}` : undefined,
          sid: (() => {
            const s = normalizeSignalSymbol(payload.symbol || tvSymbol || cfg.symbol || "");
            const p = String(activeSessionPrefix || "").trim().toUpperCase();
            return s && p ? `${s}_${p}_${i}` : undefined;
          })(),
          action: dir === "BUY" || dir === "SELL" ? dir : payload.action,
          entry: parseNum(position.entry) || payload.entry,
          tp: parseNum(position.tp) || payload.tp,
          sl: parseNum(position.sl) || payload.sl,
          rr: parseNum(position.rr) || payload.rr,
          order_type: String(position.trade_type || payload.order_type || "limit").toLowerCase(),
          note: String(position.note || payload.note || parsed?.note || "").trim(),
          only_signal: mode === "signal",
          profile: payload?.profile || parsed?.profile || "",
          trade_plan: parsed?.trade_plan && typeof parsed.trade_plan === "object" ? parsed.trade_plan : (Array.isArray(parsed?.trade_plan) ? parsed.trade_plan : undefined),
          market_analysis: parsed?.market_analysis && typeof parsed.market_analysis === "object" ? parsed.market_analysis : undefined,
          risk_management: parsed?.risk_management && typeof parsed.risk_management === "object" ? parsed.risk_management : undefined,
          invalidation: payload?.invalidation || parsed?.invalidation || "",
          confidence_pct: Number.isFinite(payload?.confidence_pct) ? payload.confidence_pct : (parsed?.confidence_pct ?? null),
          final_verdict: parsed?.final_verdict && typeof parsed.final_verdict === "object" ? parsed.final_verdict : undefined,
          raw_json: parsed && typeof parsed === "object" ? parsed : undefined,
          snapshot_files: chartFiles,
          analysis_snapshot: analysisSnapshotPayload,
        };
        if (mode === "trade") {
          await api.createTradeDirect(finalPayload);
        } else {
          await api.createSignal(finalPayload);
        }
        createdCount += 1;
      }
      const msg = mode === "trade"
        ? `Added ${createdCount} trade request(s).`
        : `Added ${createdCount} signal(s) only.`;
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
      setPromptEdited(false);
      setTemplateName("");
      setStatus({ type: "success", text: "Default template loaded." });
      return;
    }
    const found = templates.find((x) => x.id === id);
    if (!found?.config) return;
    setCfg(normalizeTemplateConfig(found.config));
    setPromptEdited(false);
    setStatus({ type: "success", text: `Template loaded: ${found.name}` });
  };

  const loadWatchlist = async () => {
    try {
      const out = await api.getSettings();
      const list = Array.isArray(out?.settings) ? out.settings : [];
      const row = list.find((x) => String(x?.type || "").toUpperCase() === SYMBOLS_SETTING_TYPE && String(x?.name || "").toUpperCase() === SYMBOLS_SETTING_NAME);
      const arr = Array.isArray(row?.data?.symbols) ? row.data.symbols : [];
      setWatchlist([...new Set(arr.map(normalizeWatchSymbol).filter(Boolean))]);
    } catch {
      setWatchlist([]);
    }
  };

  const addCurrentSymbolToWatchlist = async () => {
    const s = normalizeWatchSymbol(cfg.symbol);
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
  }, []);

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

  useEffect(() => {
    if (!effectiveParsed || typeof effectiveParsed !== "object") return;
    setPosition(extractPositionFromAnalysis(effectiveParsed));
  }, [effectiveParsed]);

  useEffect(() => {
    if (!promptEdited) setPromptDraft(promptText);
  }, [promptText, promptEdited]);

  useEffect(() => {
    const symbol = normalizeSignalSymbol(tvSymbol || cfg.symbol || "");
    if (!symbol) {
      setSymbolActivity({ loading: false, items: [] });
      return;
    }
    let alive = true;
    (async () => {
      try {
        setSymbolActivity((prev) => ({ ...prev, loading: true }));
        const [tradesOut, signalsOut] = await Promise.all([
          api.v2Trades({ symbol, page: 1, pageSize: 30 }),
          api.trades({ symbol, page: 1, pageSize: 30 }),
        ]);
        const tradeItems = Array.isArray(tradesOut?.items) ? tradesOut.items : [];
        const signalItems = Array.isArray(signalsOut?.trades) ? signalsOut.trades : [];
        const allowed = new Set(["PENDING", "FILLED", "OPEN", "NEW"]);
        const normalizedTrades = tradeItems
          .filter((x) => allowed.has(String(x?.execution_status || "").toUpperCase()))
          .map((x) => ({
            kind: "TRADE",
            status: String(x?.execution_status || "").toUpperCase(),
            side: String(x?.action || x?.side || "").toUpperCase(),
            symbol: normalizeSignalSymbol(x?.symbol || symbol),
            entry: x?.entry,
            tp: x?.tp,
            sl: x?.sl,
            updatedAt: x?.updated_at || x?.created_at,
            id: x?.trade_id || x?.id,
          }));
        const normalizedSignals = signalItems
          .filter((x) => allowed.has(String(x?.status || "").toUpperCase()))
          .map((x) => ({
            kind: "SIGNAL",
            status: String(x?.status || "").toUpperCase(),
            side: String(x?.action || x?.side || "").toUpperCase(),
            symbol: normalizeSignalSymbol(x?.symbol || symbol),
            entry: x?.entry || x?.target_price || x?.entry_price,
            tp: x?.tp || x?.tp_price,
            sl: x?.sl || x?.sl_price,
            updatedAt: x?.updated_at || x?.created_at,
            id: x?.signal_id || x?.id,
          }));
        const merged = [...normalizedTrades, ...normalizedSignals]
          .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
          .slice(0, 12);
        if (alive) setSymbolActivity({ loading: false, items: merged });
      } catch {
        if (alive) setSymbolActivity({ loading: false, items: [] });
      }
    })();
    return () => { alive = false; };
  }, [tvSymbol, cfg.symbol]);

  const settingsFormNode = (
    <section className="snapshot-settings-v2">
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
      <div className="snapshot-fields-v2 compact">
        <div><label className="minor-text">Assets</label><select value={cfg.asset} onChange={(e) => setCfgField("asset", e.target.value)}><option>Auto detect</option><option>Commodity</option><option>Forex</option><option>Crypto</option><option>Index</option><option>Stock</option></select></div>
        <div><label className="minor-text">Sessions</label><select value={cfg.session} onChange={(e) => setCfgField("session", e.target.value)}><option>Any</option><option>London</option><option>New York</option><option>Asian</option><option>London+NY</option></select></div>
        <div><label className="minor-text">MinRR</label><input type="number" min="0.5" step="0.5" value={cfg.rr} onChange={(e) => setCfgField("rr", e.target.value)} /></div>
        <div className="snapshot-col-span-2">
          <label className="minor-text">Bias / Execution / Confirm TFs</label>
          <select value={cfg.profile || "day"} onChange={(e) => setProfilePreset(e.target.value)}>
            <option value="position">{PROFILE_PRESETS.position.label}</option>
            <option value="swing">{PROFILE_PRESETS.swing.label}</option>
            <option value="day">{PROFILE_PRESETS.day.label}</option>
            <option value="scalper">{PROFILE_PRESETS.scalper.label}</option>
          </select>
        </div>
      </div>
      <div>
        <label className="minor-text">Strategy (multi-select)</label>
        <div className="snapshot-tag-wrap-v2">
          {STRATEGY_OPTIONS.map((s) => (
            <button key={s} type="button" className={`secondary-button snapshot-tag-v2 ${cfg.strategies.includes(s) ? "active" : ""}`} onClick={() => setCfgField("strategies", toggleArrayValue(cfg.strategies, s))}>{s}</button>
          ))}
        </div>
      </div>
      <div className="snapshot-context-v2">
        <div className="snapshot-col-span-2"><label className="minor-text">HTF Bias</label><select value={cfg.htfbias} onChange={(e) => setCfgField("htfbias", e.target.value)}><option value="">Auto</option><option>Bullish</option><option>Bearish</option><option>Ranging</option></select></div>
        <div className="snapshot-col-span-2"><label className="minor-text">Direction</label><select value={cfg.dir} onChange={(e) => setCfgField("dir", e.target.value)}><option>Direction: Both</option><option>Direction: Bias</option><option>Long only</option><option>Short only</option></select></div>
        <div className="snapshot-col-span-2"><label className="minor-text">News</label><select value={cfg.news} onChange={(e) => setCfgField("news", e.target.value)}><option value="">None</option><option>High-impact today</option><option>NFP / FOMC week</option><option>Earnings release</option></select></div>
        <div className="snapshot-col-span-12"><label className="minor-text">Notes</label><textarea className="snapshot-notes-textarea-v3" rows={4} value={cfg.notes} onChange={(e) => setCfgField("notes", e.target.value)} placeholder="Notes / extra context" /></div>
      </div>
    </section>
  );
  const settingsTabContentNode = (
    <>
      {settingsTab === "settings" ? settingsFormNode : null}
      {settingsTab === "prompt" ? (
        <>
          <div className="minor-text">Prompt is the main instruction sent to AI on Analyze.</div>
          <textarea className="snapshot-mono-v2" rows={30} value={promptDraft} onChange={(e) => { setPromptDraft(e.target.value); setPromptEdited(true); }} />
        </>
      ) : null}
      {settingsTab === "json" ? (
        <>
          <div className="minor-text">JSON Config is included in Analyze request as structured context (Prompt + JSON Config + Guide).</div>
          <textarea className="snapshot-mono-v2" rows={30} value={jsonConfigText} readOnly disabled />
        </>
      ) : null}
      {settingsTab === "guide" ? (
        <>
          <div className="minor-text">Guide is editable and included in Analyze request as additional instructions/checklist context.</div>
          <textarea className="snapshot-mono-v2" rows={30} value={guideDraft} onChange={(e) => setGuideDraft(e.target.value)} />
        </>
      ) : null}
    </>
  );

  const resetAnalyzeSession = () => {
    setAnalysisRaw("");
    setAnalysisJson("");
    setAnalysisParsed(null);
    setAnalysisSource("ai_claude");
    setUsedFiles([]);
    setAnalysisFilesDisplay([]);
    setResponseTab("text");
    resetPositionLocal();
    setActionStatus({ action: "", type: "", text: "" });
    setSessionPrefix("");
    setStatus({ type: "success", text: "New analyze session started." });
  };

  const chartFiles = (analysisFilesDisplay && analysisFilesDisplay.length ? analysisFilesDisplay : usedFiles).map((x) => String(x || "").trim()).filter(Boolean);
  const chartPdArrays = useMemo(() => {
    const arr = Array.isArray(effectiveParsed?.market_analysis?.pd_arrays) ? effectiveParsed.market_analysis.pd_arrays : [];
    return arr.map((x, idx) => {
      const lowRaw = parseNum(x?.low);
      const highRaw = parseNum(x?.high);
      const zoneParsed = parsePdZoneBounds(x?.zone);
      const low = Number.isFinite(lowRaw) ? lowRaw : zoneParsed.low;
      const high = Number.isFinite(highRaw) ? highRaw : zoneParsed.high;
      const startTs = Number(x?.bar_start_unix ?? x?.bar_start);
      return {
        id: `${String(x?.type || "PD")}_${idx}`,
        type: String(x?.type || "PD").trim(),
        timeframe: String(x?.timeframe || x?.tf || "").trim(),
        status: String(x?.status || "").trim(),
        barStart: Number.isFinite(startTs) ? startTs : null,
        low: Number.isFinite(low) ? low : null,
        high: Number.isFinite(high) ? high : null,
      };
    }).filter((x) => Number.isFinite(x.low) || Number.isFinite(x.high));
  }, [effectiveParsed]);

  const chartKeyLevels = useMemo(() => {
    const arr = Array.isArray(effectiveParsed?.market_analysis?.key_levels) ? effectiveParsed.market_analysis.key_levels : [];
    return arr
      .map((x, idx) => {
        const p = parseNum(x?.price ?? x?.level ?? x?.value);
        if (!Number.isFinite(p)) return null;
        return {
          id: `${String(x?.name || "KEY")}_${idx}`,
          name: String(x?.name || x?.type || "Key Level"),
          price: p,
          barStart: Number.isFinite(Number(x?.bar_start_unix ?? x?.bar_start)) ? Number(x?.bar_start_unix ?? x?.bar_start) : null,
        };
      })
      .filter(Boolean);
  }, [effectiveParsed]);

  const analysisTradePlans = useMemo(() => {
    const plans = Array.isArray(effectiveParsed?.trade_plan)
      ? effectiveParsed.trade_plan
      : (effectiveParsed?.trade_plan && typeof effectiveParsed.trade_plan === "object" ? [effectiveParsed.trade_plan] : []);
    return plans
      .map((p, idx) => {
        const entry = parseNum(p?.entry);
        const sl = parseNum(p?.sl);
        const tpLevels = Array.isArray(p?.tp_levels) ? p.tp_levels : [];
        const tp = parseNum(tpLevels[0] ?? p?.tp1 ?? p?.tp);
        const rr = parseNum(p?.rr);
        return {
          idx,
          raw: p,
          direction: String(p?.direction || "NULL").toUpperCase(),
          strategy: String(p?.strategy || "").trim(),
          entryModel: String(p?.entry_model || p?.model || "").trim(),
          confidence: parseNum(p?.confidence_pct),
          entry,
          sl,
          tp,
          rr,
          note: String(p?.note || "").trim(),
        };
      })
      .filter((x) => x.raw && typeof x.raw === "object");
  }, [effectiveParsed]);

  const applyTradePlanToEditor = (plan) => {
    if (!plan?.raw) return;
    setPosition(extractPositionFromPlan(plan.raw, effectiveParsed || {}));
  };

  useEffect(() => {
    if (!liteChartRef.current || responseTab !== "chart") return;
    const snapshot = normalizeSnapshotBars(currentBarsSnapshot, timeframe);
    const bars = Array.isArray(snapshot?.bars) ? snapshot.bars : [];
    if (!bars.length) return;

    if (liteChartApiRef.current) {
      liteChartApiRef.current.remove();
      liteChartApiRef.current = null;
    }

    const chart = createChart(liteChartRef.current, {
      width: Math.max(320, liteChartRef.current.clientWidth || 640),
      height: 320,
      layout: { background: { color: "transparent" }, textColor: "#b8c4de" },
      grid: { vertLines: { color: "rgba(255,255,255,0.08)" }, horzLines: { color: "rgba(255,255,255,0.08)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)", timeVisible: true },
      crosshair: { mode: 1 },
    });
    liteChartApiRef.current = chart;

    const candles = chart.addCandlestickSeries({
      upColor: "#1cc8b7",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#1cc8b7",
      wickDownColor: "#ef5350",
    });
    candles.setData(bars);

    chartPdArrays.forEach((pd, idx) => {
      const y = Number.isFinite(pd.high) ? pd.high : pd.low;
      if (!Number.isFinite(y)) return;
      const color = idx % 2 ? "rgba(255,193,7,0.8)" : "rgba(29,185,84,0.8)";
      const line = chart.addLineSeries({ color, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
      line.setData([{ time: bars[0].time, value: y }, { time: bars[bars.length - 1].time, value: y }]);
    });

    chartKeyLevels.forEach((lvl) => {
      const line = chart.addLineSeries({ color: "rgba(104,163,255,0.9)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      line.setData([{ time: bars[0].time, value: lvl.price }, { time: bars[bars.length - 1].time, value: lvl.price }]);
    });

    const entry = parseNum(position.entry);
    const sl = parseNum(position.sl);
    const tp = parseNum(position.tp);
    const addTradeLine = (val, color) => {
      if (!Number.isFinite(val)) return;
      const line = chart.addLineSeries({ color, lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
      line.setData([{ time: bars[0].time, value: val }, { time: bars[bars.length - 1].time, value: val }]);
    };
    addTradeLine(entry, "#33a0ff");
    addTradeLine(sl, "#ef5350");
    addTradeLine(tp, "#22c55e");

    chart.timeScale().fitContent();

    const onResize = () => {
      if (!liteChartRef.current || !liteChartApiRef.current) return;
      liteChartApiRef.current.applyOptions({ width: Math.max(320, liteChartRef.current.clientWidth || 640) });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (liteChartApiRef.current) {
        liteChartApiRef.current.remove();
        liteChartApiRef.current = null;
      }
    };
  }, [responseTab, currentBarsSnapshot, chartPdArrays, chartKeyLevels, position.entry, position.sl, position.tp]);

  return (
    <section className="snapshot-builder-v2 snapshot-builder-v3 snapshot-builder-ai-v4">
      <section className="panel snapshot-col-v3 snapshot-col-symbols-v3">
        <div className="snapshot-symbol-row-inline-v4">
          <span className="panel-label" style={{ margin: 0 }}>Symbols</span>
          <input
            list="tv-symbol-options"
            value={cfg.symbol}
            onChange={(e) => setCfgField("symbol", normalizeWatchSymbol(e.target.value))}
            placeholder="Symbol (e.g. EURUSD)"
          />
          <button className="secondary-button snapshot-plus-btn-v2" type="button" onClick={addCurrentSymbolToWatchlist} title="Add current symbol">+</button>
        </div>
        <datalist id="tv-symbol-options">
          {symbolOptions.map((opt) => <option key={opt} value={opt} />)}
        </datalist>
        <div className="snapshot-watchlist-v2">
          {watchlist.length === 0 ? <span className="minor-text">No watchlist symbols yet.</span> : watchlist.map((s) => (
            <button
              key={s}
              type="button"
              className={`secondary-button snapshot-tag-v2 ${normalizeWatchSymbol(cfg.symbol) === s ? "active" : ""}`}
              onClick={() => setCfgField("symbol", normalizeWatchSymbol(s))}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="snapshot-live-card-v3">
          <div className="snapshot-gallery-head-v2">
            <span className="panel-label" style={{ margin: 0 }}>Related Pending / Filled / New</span>
          </div>
          <div className="snapshot-activity-list-v4">
            {symbolActivity.loading ? <div className="minor-text">Loading...</div> : null}
            {!symbolActivity.loading && symbolActivity.items.length === 0 ? <div className="minor-text">No related trades/signals.</div> : null}
            {!symbolActivity.loading && symbolActivity.items.map((x) => (
              <article key={`${x.kind}_${x.id}`} className="snapshot-activity-card-v4">
                <div className="snapshot-activity-top-v4">
                  <span className={x.side === "SELL" ? "side-sell" : "side-buy"}>{x.side || "-"}</span>
                  <span className="cell-major">{x.symbol || "-"}</span>
                  <span className="minor-text">{x.kind} · {x.status === "OPEN" ? "FILLED" : x.status}</span>
                </div>
                <div className="minor-text">{x.entry ?? "-"} → {x.tp ?? "-"} / {x.sl ?? "-"}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel snapshot-col-v3 snapshot-col-settings-v3">
        <div className="snapshot-control-card-v3 toolbar-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, padding: '12px 16px', alignItems: 'flex-start' }}>
          {/* Row 1 */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-start' }}>
            {hasResponse && (
              <button className="secondary-button" type="button" onClick={resetAnalyzeSession}>{"<"} Back</button>
            )}
            
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select 
                className="secondary-button" 
                style={{ height: '34px', padding: '0 10px', fontSize: '12px' }}
                value={templateId} 
                onChange={(e) => handleSelectTemplate(e.target.value)}
              >
                <option value="">New Template</option>
                <option value={DEFAULT_TEMPLATE_ID}>Default Template</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <select 
                className="secondary-button" 
                style={{ height: '34px', padding: '0 10px', fontSize: '12px' }}
                value={cfg.profile || "day"} 
                onChange={(e) => setProfilePreset(e.target.value)}
              >
                {Object.entries(PROFILE_PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="v-sep-v3" style={{ height: 20, width: 1, background: 'var(--border)', margin: '0 4px' }} />

            <button type="button" className="secondary-button" onClick={() => setSettingsModalOpen(true)}>Settings</button>
            
            <span className="minor-text" style={{ opacity: 0.8 }}>
               {cfg.strategies.join("+") || "ai"} | {PROFILE_PRESETS[cfg.profile]?.label || cfg.profile}
            </span>
          </div>

          {/* Row 2 */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', justifyContent: 'flex-start' }}>
            <select
              value={analysisSource}
              onChange={(e) => setAnalysisSource(e.target.value)}
              className="secondary-button"
              style={{ padding: '0 10px', height: 34, fontSize: '12px' }}
            >
              <option value="ai_claude">Claude 3.5 Sonnet</option>
              <option value="ai_gpt4o">GPT-4o</option>
              <option value="ai_deepseek">DeepSeek V3</option>
              <option value="ai_gemini">Gemini 1.5 Pro</option>
            </select>

            <button className="secondary-button" type="button" onClick={captureSnapshots} disabled={capturing}>
              {capturing ? "Snapshots..." : "Snapshots"}
            </button>
            <button className="primary-button" type="button" onClick={analyzeSelected} disabled={analyzing}>
              {analyzing ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>

        <div className="snapshot-live-grid-v4">
          {widgetTfs.map((tf) => (
            <div key={tf} className="snapshot-live-card-v3">
              <div className="minor-text" style={{ marginBottom: 6 }}>{tf}</div>
              <iframe
                title={`live-chart-${tf}`}
                className="snapshot-live-iframe-v3"
                src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol || cfg.symbol || "EURUSD")}&interval=${encodeURIComponent(liveTfToTradingViewInterval(tf))}&theme=dark&style=1&locale=en&toolbarbg=%230f1729&hide_top_toolbar=1&hide_legend=1&saveimage=0`}
              />
            </div>
          ))}
        </div>
        {hasResponse && (
          <SignalDetailCard
            mode="ai"
            hideTabsBeforeResponse={true}
            chart={{
              enabled: true,
              symbol: cfg.symbol,
              interval: timeframe,
              detailTfTab: timeframe,
              onDetailTfTabChange: setSelectedEntryTf,
              entryNode: (
                <div className="snapshot-live-card-v3">
                  <div className="minor-text" style={{ marginBottom: 12 }}>Chart 1: Twelve + PD Arrays</div>
                  <TradeSignalChart 
                    symbol={cfg.symbol}
                    interval={timeframe}
                    analysisSnapshot={effectiveParsed}
                  />
                  <div className="minor-text" style={{ marginTop: 8 }}>{barsLoading ? "Loading bars..." : (currentBarsSnapshot?.normalized_symbol || currentBarsSnapshot?.symbol || "No bars cache yet")}</div>
                </div>
              )
            }}
            response={{
              enabled: true,
              hasData: hasResponse,
              label: "Response",
              tab: responseTab,
              onTabChange: setResponseTab,
              text: responseText,
              raw: effectiveParsed || analysisRaw || analysisJson,
              bars: JSON.stringify(currentBarsSnapshot || { status: "no_cached_bars" }, null, 2),
              tradePlans: analysisTradePlans,
              snapshotFiles: chartFiles,
            }}
            tradePlan={{
              enabled: true,
              signalId: null,
              tradeId: null,
              value: position,
              onChange: updatePositionField,
              onAddSignal: () => addBySelection("signal"),
              onAddTrade: () => addBySelection("trade"),
              showSaveButton: false,
              showAddSignalButton: true,
              showAddTradeButton: true,
              showResetButton: true,
              onReset: resetPositionLocal,
              busy: { signal: addingSignal, trade: addingSignal },
              disabled: false,
              error: !canAddSignal ? validatePosition(position) : "",
              successMessage: actionStatus.action === "add" && actionStatus.text && actionStatus.type !== "error" && actionStatus.type !== "warning"
                ? actionStatus.text
                : "",
            }}
          />
        )}
        {actionStatus.action === "add" && actionStatus.text && (actionStatus.type === "error" || actionStatus.type === "warning") ? (
          <span className={`minor-text snapshot-footer-msg-v3 ${actionStatus.type === "error" ? "msg-error" : "msg-warning"}`}>{actionStatus.text}</span>
        ) : null}
      </section>

      {settingsModalOpen ? (
        <div className="snapshot-modal-backdrop-v4" onClick={() => setSettingsModalOpen(false)}>
          <div className="snapshot-modal-panel-v4" onClick={(e) => e.stopPropagation()}>
            <div className="snapshot-modal-head-v4">
              <span className="panel-label" style={{ margin: 0 }}>Settings</span>
              <button type="button" className="danger-button" onClick={() => setSettingsModalOpen(false)}>Close</button>
            </div>
            <div className="snapshot-tabs-v2" style={{ marginBottom: 10 }}>
              <button type="button" className={`secondary-button ${settingsTab === "settings" ? "active" : ""}`} onClick={() => setSettingsTab("settings")}>Settings</button>
              <button type="button" className={`secondary-button ${settingsTab === "prompt" ? "active" : ""}`} onClick={() => setSettingsTab("prompt")}>Prompt</button>
              <button type="button" className={`secondary-button ${settingsTab === "json" ? "active" : ""}`} onClick={() => setSettingsTab("json")}>JSON Config</button>
              <button type="button" className={`secondary-button ${settingsTab === "guide" ? "active" : ""}`} onClick={() => setSettingsTab("guide")}>Guide</button>
            </div>
            {settingsTabContentNode}
          </div>
        </div>
      ) : null}

      {status.text ? (
        <div className={`form-message ${status.type === "error" ? "msg-error" : status.type === "warning" ? "msg-warning" : "msg-success"}`}>
          {status.text}
        </div>
      ) : null}
    </section>
  );
}
