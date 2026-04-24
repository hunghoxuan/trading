import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { SignalDetailCard } from "../components/SignalDetailCard";
import { buildDetailHeader } from "../components/SignalDetailHeaderBuilder";
import { asNum, buildHeaderMeta, renderHistoryItem, shouldShowPnl } from "../utils/signalDetailUtils";

const STATUS_OPTIONS = [
  { value: "", label: "ALL STATUSES" },
  { value: "NEW", label: "NEW" },
  { value: "LOCKED", label: "LOCKED" },
  { value: "PLACED", label: "PLACED" },
  { value: "START", label: "START" },
  { value: "TP", label: "TP" },
  { value: "SL", label: "SL" },
  { value: "CANCEL", label: "CANCEL" },
  { value: "FAIL", label: "FAIL" },
  { value: "EXPIRED", label: "EXPIRED" },
];
const BULK_ACTIONS = ["", "Download CSV", "Renew All", "Cancel All", "Delete All"];
const RANGE_OPTIONS = [
  { val: "all", lab: "All times" },
  { val: "today", lab: "Today" },
  { val: "yesterday", lab: "Yesterday" },
  { val: "last_week", lab: "Last week" },
  { val: "last_month", lab: "Last month" },
  { val: "week", lab: "This Week" },
  { val: "month", lab: "This Month" },
  { val: "year", lab: "This Year" },
];
const PAGE_SIZE_OPTIONS = [50, 100, 200];
const AUTO_REFRESH_MS = 5000;

function fPrice(v1, v2) {
  const n1 = Number(v1);
  if (n1 && n1 !== 0) return n1.toLocaleString(undefined, { maximumFractionDigits: 5 });
  const n2 = Number(v2);
  if (n2 && n2 !== 0) return n2.toLocaleString(undefined, { maximumFractionDigits: 5 });
  return "-";
}

function formatTimeframe(min) {
  if (!min || min === 'manual') return min || "-";
  const n = Number(min);
  if (isNaN(n) || n <= 0) return min;
  if (n < 60) return `${n}m`;
  if (n < 1440) return `${n / 60}h`;
  if (n < 10080) return `${n / 1440}d`;
  if (n < 43200) return `${n / 10080}w`;
  if (n === 43200) return "1M";
  return `${n / 43200}M`;
}

function PnlDisplay({ value }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return null;
  const cls = n > 0 ? "money-pos" : "money-neg";
  const abs = Math.abs(n);
  const str = `$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return <div className={`cell-minor ${cls}`}>{n < 0 ? `-${str}` : str}</div>;
}

function fDateTime(v) {
  if (!v) return "-";
  return new Date(v).toLocaleString(undefined, {
    year: '2-digit', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "ACTIVE" || s === "TRUE") return { cls: "ACTIVE", label: "ACTIVE" };
  if (s === "INACTIVE" || s === "FALSE" || s === "DISABLE" || s === "DISABLED") return { cls: "INACTIVE", label: "INACTIVE" };
  if (s === "PLACED") return { cls: "PLACED", label: "PLACED" };
  if (s === "LOCKED") return { cls: "LOCKED", label: "LOCKED" };
  if (s === "START") return { cls: "START", label: "START" };
  if (s === "TP") return { cls: "TP", label: "TP" };
  if (s === "SL") return { cls: "SL", label: "SL" };
  return { cls: "OTHER", label: s || "UNKNOWN" };
}

function calcRrFromSignal(s) {
  const entry = asNum(s?.entry || s?.target_price || s?.entry_price);
  const sl = asNum(s?.sl || s?.sl_price);
  const tp = asNum(s?.tp || s?.tp_price);
  if (entry == null || sl == null || tp == null) return null;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (!risk) return null;
  return reward / risk;
}

function signalRiskSize(s, details) {
  const cands = [
    s?.risk_money_planned,
    s?.risk_money_actual,
    s?.raw_json?.risk_money,
    s?.raw_json?.risk,
    details?.trade?.metadata?.risk_money_actual,
    details?.trade?.metadata?.risk_money,
    details?.trade?.metadata?.risk_money_planned,
  ];
  for (const c of cands) {
    const n = asNum(c);
    if (n != null) return n;
  }
  const entry = asNum(s?.entry || s?.target_price || s?.entry_price);
  const sl = asNum(s?.sl || s?.sl_price);
  const vol = asNum(s?.volume);
  if (entry == null || sl == null || vol == null) return null;
  const est = Math.abs(entry - sl) * vol;
  return Number.isFinite(est) ? est : null;
}

function formatNum3(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return String(Number(n.toFixed(3)));
}

function extractTradePlanFromSignal(signal = {}) {
  const raw = signal?.raw_json && typeof signal.raw_json === "object" ? signal.raw_json : {};
  const tradePlan = raw?.trade_plan && typeof raw.trade_plan === "object" && !Array.isArray(raw.trade_plan) ? raw.trade_plan : {};
  const sideRaw = String(signal?.action || signal?.side || tradePlan?.direction || "").toUpperCase();
  return {
    direction: sideRaw.includes("SELL") ? "SELL" : "BUY",
    trade_type: String(tradePlan?.type || raw?.order_type || "limit").toLowerCase(),
    entry: formatNum3(asNum(signal?.entry || signal?.target_price || signal?.entry_price) ?? asNum(raw?.entry ?? raw?.price) ?? NaN),
    tp: formatNum3(asNum(signal?.tp || signal?.tp_price) ?? asNum(tradePlan?.tp1 ?? tradePlan?.tp) ?? NaN),
    sl: formatNum3(asNum(signal?.sl || signal?.sl_price) ?? asNum(tradePlan?.sl) ?? NaN),
    rr: formatNum3(asNum(signal?.rr_planned) ?? asNum(tradePlan?.rr) ?? calcRrFromSignal(signal) ?? NaN),
    note: String(tradePlan?.note || signal?.note || "").trim(),
  };
}

function validateTradePlan(plan = {}) {
  const entry = asNum(plan.entry);
  const tp = asNum(plan.tp);
  const sl = asNum(plan.sl);
  const rr = asNum(plan.rr);
  const direction = String(plan.direction || "").trim().toUpperCase();
  if (!["BUY", "SELL"].includes(direction)) return "Direction must be Buy or Sell.";
  if (entry == null || tp == null || sl == null) return "Entry/TP/SL must be numeric values.";
  if (rr != null && (rr < 0.3 || rr > 5)) return "RR must be between 0.3 and 5.";
  if (direction === "BUY") {
    if (!(tp > entry)) return "For BUY, TP must be greater than Entry.";
    if (!(sl < entry)) return "For BUY, SL must be lower than Entry.";
  } else if (direction === "SELL") {
    if (!(tp < entry)) return "For SELL, TP must be lower than Entry.";
    if (!(sl > entry)) return "For SELL, SL must be greater than Entry.";
  }
  return "";
}

export default function SignalsPage() {
  const [symbols, setSymbols] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [signalDetails, setSignalDetails] = useState(null);
  const [error, setError] = useState("");
  const [advFilters, setAdvFilters] = useState({ sources: [], entry_models: [], chart_tfs: [], signal_tfs: [] });
  const [createMode, setCreateMode] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [detailTfTab, setDetailTfTab] = useState("ENTRY");
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [detailPlan, setDetailPlan] = useState({ direction: "BUY", trade_type: "limit", entry: "", tp: "", sl: "", rr: "", note: "" });
  const [detailPlanBusy, setDetailPlanBusy] = useState({ save: false, trade: false, signal: false });
  const [detailPlanMsg, setDetailPlanMsg] = useState({ type: "", text: "" });
  const [createForm, setCreateForm] = useState({
    action: "BUY",
    symbol: "",
    volume: "0.01",
    price: "",
    sl: "",
    tp: "",
    strategy: "Manual",
    timeframe: "manual",
    note: "",
  });
  const inFlightRef = useRef(false);
  const [sortKey, setSortKey] = useState("audit");
  const [sortDir, setSortDir] = useState("desc");
  const selectedSignalIdRef = useRef("");

  const [filter, setFilter] = useState({
    q: "",
    symbol: "",
    status: "",
    range: "",
    source: "",
    entry_model: "",
    chart_tf: "",
    signal_tf: "",
    page: 1,
    pageSize: 50,
  });

  const query = useMemo(() => ({ ...filter }), [filter]);

  async function loadSymbols() {
    try {
      const [data, src] = await Promise.all([api.filtersAdvanced(), api.v2Sources()]);
      const srcFromTrades = data.sources || [];
      const srcFromV2 = (src?.items || []).map((x) => String(x.name || x.source_id || "")).filter(Boolean);
      const sources = [...new Set([...srcFromTrades, ...srcFromV2])].sort();
      setSymbols(data.symbols || []);
      setAdvFilters({
        sources,
        entry_models: data.entry_models || [],
        chart_tfs: data.chart_tfs || [],
        signal_tfs: data.signal_tfs || [],
      });
    } catch { /* ignore */ }
  }

  async function loadSignals() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setLoading(true);
      const data = await api.trades(query);
      const nextRows = data.trades || [];
      setRows(nextRows);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setError("");
      setLastRefreshAt(new Date());
      const selectedSignalId = String(selectedSignalIdRef.current || "").trim();
      if (selectedSignalId) {
        const exists = nextRows.some((x) => String(x?.signal_id || "") === selectedSignalId);
        if (!exists) setSelectedSignal(null);
      }
    } catch (e) {
      setError(e?.message || "Failed to load signals");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  async function loadSignalDetail(signalId) {
    try {
      const res = await api.trade(signalId);
      setSignalDetails(res);
    } catch (e) {
      console.error("Failed to load details:", e);
    }
  }

  const updateDetailPlanField = (key, rawValue) => {
    setDetailPlan((prev) => {
      const value = ["entry", "tp", "sl", "rr"].includes(key) ? String(rawValue ?? "").replace(",", ".") : rawValue;
      const next = { ...prev, [key]: value };
      const entry = asNum(next.entry);
      const sl = asNum(next.sl);
      const tp = asNum(next.tp);
      const rrInput = asNum(next.rr);
      if (key === "rr") {
        if (entry != null && sl != null && rrInput != null && rrInput > 0) {
          const risk = Math.abs(entry - sl);
          if (risk > 0) {
            const dir = String(next.direction || "BUY").toUpperCase();
            const sign = dir === "SELL" ? -1 : 1;
            next.tp = formatNum3(entry + sign * (risk * rrInput));
          }
        }
      } else if (entry != null && sl != null && tp != null) {
        const risk = Math.abs(entry - sl);
        const reward = Math.abs(tp - entry);
        if (risk > 0 && reward > 0) next.rr = formatNum3(reward / risk);
      }
      if (["entry", "tp", "sl", "rr"].includes(key)) {
        const parsed = asNum(next[key]);
        next[key] = parsed != null ? formatNum3(parsed) : "";
      }
      return next;
    });
  };

  async function saveSelectedSignalPlan() {
    if (!selectedSignal?.signal_id) return;
    const err = validateTradePlan(detailPlan);
    if (err) {
      setDetailPlanMsg({ type: "error", text: err });
      return;
    }
    try {
      setDetailPlanBusy((p) => ({ ...p, save: true }));
      await api.saveSignalTradePlan(selectedSignal.signal_id, {
        direction: detailPlan.direction,
        trade_type: detailPlan.trade_type,
        entry: asNum(detailPlan.entry),
        tp: asNum(detailPlan.tp),
        sl: asNum(detailPlan.sl),
        rr: asNum(detailPlan.rr),
        note: detailPlan.note,
      });
      await loadSignals();
      await loadSignalDetail(selectedSignal.signal_id);
      setDetailPlanMsg({ type: "success", text: "Signal plan saved." });
    } catch (e) {
      setDetailPlanMsg({ type: "error", text: String(e?.message || e || "Failed to save signal plan.") });
    } finally {
      setDetailPlanBusy((p) => ({ ...p, save: false }));
    }
  }

  async function addTradeFromSignal(signal) {
    const targetSignalId = String(signal?.signal_id || selectedSignal?.signal_id || "").trim();
    if (!targetSignalId) return;
    const err = validateTradePlan(detailPlan);
    if (signal?.signal_id === selectedSignal?.signal_id && err) {
      setDetailPlanMsg({ type: "error", text: err });
      return;
    }
    const plan = signal?.signal_id === selectedSignal?.signal_id ? detailPlan : extractTradePlanFromSignal(signal);
    try {
      setDetailPlanBusy((p) => ({ ...p, trade: true }));
      await api.createTradeFromSignal(targetSignalId, {
        direction: plan.direction,
        trade_type: plan.trade_type,
        entry: asNum(plan.entry),
        tp: asNum(plan.tp),
        sl: asNum(plan.sl),
        rr: asNum(plan.rr),
        note: plan.note,
      });
      setDetailPlanMsg({ type: "success", text: "Trade queued from signal." });
    } catch (e) {
      const msg = String(e?.message || e || "Failed to add trade from signal.");
      setDetailPlanMsg({ type: "error", text: msg });
      setError(msg);
    } finally {
      setDetailPlanBusy((p) => ({ ...p, trade: false }));
    }
  }

  function resetDetailPlanLocal() {
    if (!selectedSignal) return;
    setDetailPlan(extractTradePlanFromSignal(selectedSignal));
    setDetailPlanMsg({ type: "", text: "" });
  }

  async function onCreateSignal() {
    try {
      setBulkBusy(true);
      const payload = {
        side: String(createForm.action || "BUY").toUpperCase(),
        symbol: String(createForm.symbol || "").trim().toUpperCase(),
        volume: createForm.volume === "" ? undefined : Number(createForm.volume),
        price: createForm.price === "" ? undefined : Number(createForm.price),
        sl: createForm.sl === "" ? undefined : Number(createForm.sl),
        tp: createForm.tp === "" ? undefined : Number(createForm.tp),
        strategy: String(createForm.strategy || "Manual").trim(),
        timeframe: String(createForm.timeframe || "manual").trim(),
        note: String(createForm.note || "").trim(),
      };
      const out = await api.createTrade(payload);
      setCreateMsg(`Signal created: ${out?.trade?.signal_id || "ok"}`);
      setCreateMode(false);
      await loadSignals();
      if (out?.trade?.signal_id) {
        const created = { signal_id: out.trade.signal_id, action: payload.side, symbol: payload.symbol, status: "NEW" };
        setSelectedSignal(created);
      }
    } catch (e) {
      setError(e?.message || "Failed to create signal");
    } finally {
      setBulkBusy(false);
      window.setTimeout(() => setCreateMsg(""), 2200);
    }
  }

  async function onBulkOk() {
    if (!bulkAction) return;
    try {
      setBulkBusy(true);
      if (bulkAction === "Download CSV") {
        const { blob, filename } = await api.downloadBacktestCsv(query);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
      } else if (bulkAction === "Renew All") {
         if (window.confirm("Renew all filtered signals?")) await api.renewTrades(query);
      } else if (bulkAction === "Cancel All") {
         if (window.confirm("Cancel all filtered signals?")) await api.cancelTrades(query);
      } else if (bulkAction === "Delete All") {
         if (window.confirm("CRITICAL: Delete all filtered signals?")) await api.deleteTrades(query);
      }
      setSelectedIds(new Set());
      await loadSignals();
    } catch (e) {
      setError(e.message);
    } finally {
      setBulkBusy(false);
      setBulkAction("");
    }
  }

  useEffect(() => {
    if (selectedSignal) {
      loadSignalDetail(selectedSignal.signal_id);
      setDetailPlan(extractTradePlanFromSignal(selectedSignal));
      setDetailPlanMsg({ type: "", text: "" });
    } else {
      setSignalDetails(null);
      setDetailPlan({ direction: "BUY", trade_type: "limit", entry: "", tp: "", sl: "", rr: "", note: "" });
    }
  }, [selectedSignal]);
  useEffect(() => {
    selectedSignalIdRef.current = String(selectedSignal?.signal_id || "").trim();
  }, [selectedSignal?.signal_id]);

  useEffect(() => { loadSymbols(); }, []);
  useEffect(() => { loadSignals(); }, [query]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      loadSignals();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [query]);

  const sortedRows = useMemo(() => {
    const statusRankAsc = (v) => {
      const s = String(v || "").toUpperCase();
      if (["FILLED", "OPEN", "ACTIVE", "PLACED", "START", "TP"].includes(s)) return 0;
      if (["PENDING", "NEW", "LOCKED"].includes(s)) return 1;
      if (["CLOSED", "CANCELLED", "SL", "FAIL", "EXPIRED", "ERROR"].includes(s)) return 2;
      return 3;
    };
    const statusRankDesc = (v) => {
      const s = String(v || "").toUpperCase();
      if (["PENDING", "NEW", "LOCKED"].includes(s)) return 0;
      if (["FILLED", "OPEN", "ACTIVE", "PLACED", "START", "TP"].includes(s)) return 1;
      if (["CLOSED", "CANCELLED", "SL", "FAIL", "EXPIRED", "ERROR"].includes(s)) return 2;
      return 3;
    };
    const valueOfAudit = (x) => new Date(x?.closed_at || x?.opened_at || x?.created_at || 0).getTime();
    const out = [...rows];
    out.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "symbol") {
        cmp = String(a?.symbol || "").localeCompare(String(b?.symbol || ""));
        if (cmp === 0) cmp = valueOfAudit(b) - valueOfAudit(a);
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortKey === "status") {
        cmp = sortDir === "asc"
          ? statusRankAsc(a?.status) - statusRankAsc(b?.status)
          : statusRankDesc(a?.status) - statusRankDesc(b?.status);
        if (cmp === 0) cmp = valueOfAudit(b) - valueOfAudit(a);
        return cmp;
      }
      cmp = valueOfAudit(a) - valueOfAudit(b);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "status" ? "asc" : "desc");
  };
  const sortMarker = (key) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const allSelected = sortedRows.length > 0 && sortedRows.every(r => selectedIds.has(r.signal_id));

  return (
    <section className="logs-page-container stack-layout">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Signals</h2>
        <span className="minor-text" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          Last refreshed: {lastRefreshAt ? lastRefreshAt.toLocaleTimeString() : "-"} (auto 5s)
        </span>
      </div>
      <div className="toolbar-panel">
        <div className="toolbar-group toolbar-pagination">
          <div className="pager-area">
            <strong>{total}</strong>
            {pages > 1 && (
              <div className="pager-mini">
                <button className="secondary-button" disabled={filter.page <= 1} onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))}>&lt;</button>
                <span className="minor-text">{filter.page}/{pages}</span>
                <button className="secondary-button" disabled={filter.page >= pages} onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))}>&gt;</button>
              </div>
            )}
            <select
              value={filter.pageSize}
              onChange={e => setFilter(f => ({ ...f, pageSize: Number(e.target.value), page: 1 }))}
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="toolbar-group toolbar-search-filter">
          <input 
            value={filter.q} 
            onChange={(e) => setFilter(f => ({ ...f, q: e.target.value, page: 1 }))} 
            placeholder="Search Signal ID..." 
            style={{ width: '200px' }}
          />
          <select value={filter.symbol} onChange={(e) => setFilter(f => ({ ...f, symbol: e.target.value, page: 1 }))}>
            <option value="">ALL SYMBOLS</option>
            {symbols.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filter.status} onChange={(e) => setFilter(f => ({ ...f, status: e.target.value, page: 1 }))}>
            {STATUS_OPTIONS.map(s => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filter.source} onChange={(e) => setFilter(f => ({ ...f, source: e.target.value, page: 1 }))}>
            <option value="">ALL SOURCES</option>
            {advFilters.sources.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filter.entry_model} onChange={(e) => setFilter(f => ({ ...f, entry_model: e.target.value, page: 1 }))}>
            <option value="">ALL MODELS</option>
            {advFilters.entry_models.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filter.chart_tf} onChange={(e) => setFilter(f => ({ ...f, chart_tf: e.target.value, page: 1 }))}>
            <option value="">CHART TF</option>
            {advFilters.chart_tfs.map(s => <option key={s} value={s}>{formatTimeframe(s)}</option>)}
          </select>
          <select value={filter.signal_tf} onChange={(e) => setFilter(f => ({ ...f, signal_tf: e.target.value, page: 1 }))}>
            <option value="">SIGNAL TF</option>
            {advFilters.signal_tfs.map(s => <option key={s} value={s}>{formatTimeframe(s)}</option>)}
          </select>
          <select value={filter.range} onChange={(e) => setFilter(f => ({ ...f, range: e.target.value, page: 1 }))}>
            {RANGE_OPTIONS.map(r => <option key={r.val} value={r.val}>{r.lab}</option>)}
          </select>
        </div>

        <div className="toolbar-group toolbar-bulk-action">
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} disabled={bulkBusy}>
            {BULK_ACTIONS.map(s => <option key={s} value={s}>{s || "BULK ACTION..."}</option>)}
          </select>
          <button type="button" className="primary-button" onClick={onBulkOk} disabled={bulkBusy || !bulkAction}>APPLY</button>
          <button 
            type="button" 
            className="primary-button" 
            onClick={() => { if (createMode) { setCreateMode(false); setCreateMsg(""); } else { setCreateMode(true); setSelectedSignal(null); } }}
          >
            {createMode ? "CANCEL" : "+ CREATE SIGNAL"}
          </button>
        </div>

      </div>

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          {error ? <div className="error">{error}</div> : null}
          {createMsg ? <div className="loading" style={{ padding: 10 }}>{createMsg}</div> : null}
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>
                    <input 
                      type="checkbox" 
                      checked={allSelected} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          sortedRows.forEach(r => checked ? next.add(r.signal_id) : next.delete(r.signal_id));
                          return next;
                        });
                      }}
                    />
                  </th>
                  <th onClick={() => toggleSort("symbol")} style={{ cursor: "pointer" }}>SYMBOL{sortMarker("symbol")}</th>
                  <th>POSITION</th>
                  <th onClick={() => toggleSort("audit")} style={{ cursor: "pointer" }}>AUDIT{sortMarker("audit")}</th>
                  <th onClick={() => toggleSort("status")} style={{ cursor: "pointer" }}>STATUS{sortMarker("status")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(t => {
                  const status = statusUi(t.status);
                  const sideValue = String(t.action || t.side || '-').toUpperCase();
                  const sideCls = sideValue === 'BUY' ? 'side-buy' : 'side-sell';
                  const sourceLabel = String(t.source || "-");
                  const sourceId = String(t.source_id || "-");
                  const signalShort = String(t.signal_id || "").slice(-8) || "-";
                  
                  return (
                    <tr 
                      key={t.signal_id} 
                      className={selectedSignal?.signal_id === t.signal_id ? "active" : ""}
                      onClick={() => {
                        selectedSignalIdRef.current = String(t?.signal_id || "");
                        setCreateMode(false);
                        setSelectedSignal(t);
                      }}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(t.signal_id)}
                          onChange={e => {
                            const checked = e.target.checked;
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              if (checked) next.add(t.signal_id);
                              else next.delete(t.signal_id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major"><span className={sideCls}>{sideValue}</span> {t.symbol}</div>
                          <div className="cell-minor">{sourceLabel} | {sourceId} | signal {signalShort}</div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major">
                            {fPrice(t.entry, t.target_price || t.entry_price)} → {fPrice(t.tp)} / {fPrice(t.sl)}
                          </div>
                          <div className="cell-minor">
                            {(t.entry_model || "-")} | {formatTimeframe(t.chart_tf)} | {formatTimeframe(t.signal_tf)} | {(asNum(t.rr_planned) ?? 0).toFixed(2)} rr
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major">{fDateTime(t.closed_at || t.opened_at || t.created_at)}</div>
                          <div className="cell-minor">{t.note || 'No note'}</div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major"><span className={`badge ${status.cls} badge-fixed`}>{status.label}</span></div>
                          <PnlDisplay value={t.pnl_money_realized} />
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ marginTop: 6, width: "fit-content" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              addTradeFromSignal(t);
                            }}
                            disabled={detailPlanBusy.trade}
                          >
                            + Trade
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="logs-detail-pane">
          {createMode ? (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-label">SIGNAL FORM</div>
              <div className="stack-layout" style={{ gap: 10 }}>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
                  <label>
                    <div className="muted small">Action</div>
                    <select value={createForm.action} onChange={(e) => setCreateForm((p) => ({ ...p, action: e.target.value }))}>
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                  </label>
                  <label>
                    <div className="muted small">Symbol</div>
                    <input value={createForm.symbol} onChange={(e) => setCreateForm((p) => ({ ...p, symbol: e.target.value }))} placeholder="XAUUSD" />
                  </label>
                  <label>
                    <div className="muted small">Volume</div>
                    <input value={createForm.volume} onChange={(e) => setCreateForm((p) => ({ ...p, volume: e.target.value }))} placeholder="0.01" />
                  </label>
                  <label>
                    <div className="muted small">Entry Price</div>
                    <input value={createForm.price} onChange={(e) => setCreateForm((p) => ({ ...p, price: e.target.value }))} placeholder="3345.20" />
                  </label>
                  <label>
                    <div className="muted small">SL</div>
                    <input value={createForm.sl} onChange={(e) => setCreateForm((p) => ({ ...p, sl: e.target.value }))} placeholder="3330.00" />
                  </label>
                  <label>
                    <div className="muted small">TP</div>
                    <input value={createForm.tp} onChange={(e) => setCreateForm((p) => ({ ...p, tp: e.target.value }))} placeholder="3365.00" />
                  </label>
                  <label>
                    <div className="muted small">Strategy</div>
                    <input value={createForm.strategy} onChange={(e) => setCreateForm((p) => ({ ...p, strategy: e.target.value }))} />
                  </label>
                  <label>
                    <div className="muted small">Timeframe</div>
                    <input value={createForm.timeframe} onChange={(e) => setCreateForm((p) => ({ ...p, timeframe: e.target.value }))} />
                  </label>
                </div>
                <label>
                  <div className="muted small">Note</div>
                  <input value={createForm.note} onChange={(e) => setCreateForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional note" />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="primary-button" onClick={onCreateSignal} disabled={bulkBusy}>{bulkBusy ? "💾 SAVING..." : "💾 SAVE SIGNAL"}</button>
                  <button type="button" className="secondary-button" onClick={() => setCreateMode(false)} disabled={bulkBusy}>✖ CANCEL</button>
                </div>
              </div>
            </div>
          ) : !selectedSignal ? (
            <div className="empty-state minor-text">SELECT A SIGNAL TO INSPECT HISTORY</div>
          ) : (
            <SignalDetailCard
              mode="signal"
              header={(() => {
                const rr = calcRrFromSignal(selectedSignal);
                const vol = asNum(selectedSignal.volume);
                const risk = signalRiskSize(selectedSignal, signalDetails);
                const headerMeta = buildHeaderMeta({
                  statusRaw: selectedSignal.status,
                  pnlRaw: selectedSignal.pnl_money_realized,
                  rrRaw: rr,
                  volumeRaw: vol,
                  riskSizeRaw: risk,
                  updatedAtRaw: selectedSignal.updated_at || selectedSignal.closed_at || selectedSignal.opened_at || selectedSignal.created_at,
                  statusUi,
                });
                return buildDetailHeader({
                  side: String(selectedSignal.action || selectedSignal.side || "-").toUpperCase(),
                  symbol: selectedSignal.symbol || "-",
                  sideClass: String(selectedSignal.action || selectedSignal.side || "").toUpperCase() === "BUY" ? "side-buy" : "side-sell",
                  positionText: `${fPrice(selectedSignal.entry, selectedSignal.target_price || selectedSignal.entry_price)} → ${fPrice(selectedSignal.tp)} / ${fPrice(selectedSignal.sl)}`,
                  ...headerMeta,
                });
              })()}
              tradePlan={{
                enabled: true,
                signalId: selectedSignal?.signal_id || null,
                tradeId: null,
                value: detailPlan,
                onChange: updateDetailPlanField,
                onReset: resetDetailPlanLocal,
                onSave: saveSelectedSignalPlan,
                onAddTrade: () => addTradeFromSignal(selectedSignal),
                showSaveButton: true,
                showAddSignalButton: false,
                showAddTradeButton: true,
                showResetButton: true,
                saveLabel: "Save Signal",
                busy: detailPlanBusy,
                error: detailPlanMsg.type === "error" ? detailPlanMsg.text : "",
                successMessage: detailPlanMsg.text && detailPlanMsg.type !== "error" ? detailPlanMsg.text : "",
              }}
              chart={{
                enabled: true,
                detailTfTab,
                onDetailTfTabChange: setDetailTfTab,
                iframeTitle: `signal-tv-${detailTfTab}`,
                symbol: selectedSignal.symbol,
                interval: selectedSignal.signal_tf || selectedSignal.chart_tf || "1h",
                live: true,
                entryPrice: asNum(detailPlan.entry) ?? asNum(selectedSignal.entry || selectedSignal.target_price || selectedSignal.entry_price),
                slPrice: asNum(detailPlan.sl) ?? asNum(selectedSignal.sl),
                tpPrice: asNum(detailPlan.tp) ?? asNum(selectedSignal.tp),
                analysisSnapshot: selectedSignal?.raw_json?.analysis_snapshot
                  ? {
                      ...selectedSignal.raw_json.analysis_snapshot,
                      pd_arrays: (
                        selectedSignal.raw_json.analysis_snapshot.pd_arrays ||
                        selectedSignal.raw_json.market_analysis?.pd_arrays ||
                        selectedSignal.raw_json.pd_arrays ||
                        []
                      ),
                      key_levels: (
                        selectedSignal.raw_json.analysis_snapshot.key_levels ||
                        selectedSignal.raw_json.market_analysis?.key_levels ||
                        []
                      ),
                    }
                  : {
                      pd_arrays: (
                        selectedSignal.raw_json?.market_analysis?.pd_arrays ||
                        selectedSignal.raw_json?.pd_arrays ||
                        []
                      ),
                      key_levels: (
                        selectedSignal.raw_json?.market_analysis?.key_levels ||
                        []
                      ),
                    },
              }}
              metaItems={[
                { label: "Chart TF", value: formatTimeframe(selectedSignal.chart_tf || "-") },
                { label: "Signal TF", value: formatTimeframe(selectedSignal.signal_tf || "-") },
                { label: "Source", value: selectedSignal.source || "-" },
                { label: "Entry Model", value: selectedSignal.entry_model || "-" },
                { label: "Trade ID", value: signalDetails?.trade?.trade_id || "-" },
                { label: "Broker Ticket", value: selectedSignal.ack_ticket || signalDetails?.trade?.broker_trade_id || "-" },
                { label: "Signal ID", value: selectedSignal.signal_id || "-" },
                { label: "Account", value: signalDetails?.trade?.account_id || "-" },
                { label: "Note", value: selectedSignal.note || "-", fullWidth: true },
              ]}
              history={{
                enabled: true,
                loading: !(signalDetails?.events || signalDetails?.items),
                loadingText: "FETCHING TELEMETRY LOGS...",
                items: [...(signalDetails?.events || signalDetails?.items || [])]
                  .sort((a, b) => new Date(b.event_time || b.created_at || 0) - new Date(a.event_time || a.created_at || 0)),
                renderItem: (ev, idx) => renderHistoryItem(ev, idx, {
                  formatDateTime: fDateTime,
                  statusFromType: (eventType) => {
                    const tType = String(eventType || "");
                    if (!tType.startsWith("EA_ACK_")) return null;
                    const raw = tType.replace("EA_ACK_", "");
                    return statusUi(raw);
                  },
                }),
              }}
              formatDateTime={fDateTime}
            />
          )}
        </div>
      </div>
    </section>
  );
}
