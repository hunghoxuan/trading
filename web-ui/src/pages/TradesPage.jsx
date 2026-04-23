import { api } from "../api";
import { TradeSignalChart } from "../components/TradeSignalChart";
import { useState, useMemo, useRef, useEffect } from "react";

const STATUS_OPTIONS = [
  { value: "", label: "ALL STATUSES" },
  { value: "PENDING", label: "PENDING" },
  { value: "FILLED", label: "FILLED" },
  { value: "CLOSED", label: "CLOSED" },
  { value: "CANCELLED", label: "CANCELLED" },
  { value: "ERROR", label: "ERROR" },
];
const BULK_ACTIONS = [
  { value: "", label: "BULK ACTION..." },
  { value: "close_all", label: "Close All" },
  { value: "cancel_all", label: "Cancel All" },
  { value: "delete_all", label: "Delete All" },
];
const RANGE_OPTIONS = [
  { value: "all", label: "All times" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_week", label: "Last week" },
  { value: "last_month", label: "Last month" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];
const PAGE_SIZE_OPTIONS = [50, 100, 200];
const AUTO_REFRESH_MS = 5000;

function fDateTime(v) {
  if (!v) return "-";
  return new Date(v).toLocaleString(undefined, {
    year: "2-digit", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatTimeframe(min) {
  if (!min || min === "manual") return min || "-";
  const n = Number(min);
  if (Number.isNaN(n) || n <= 0) return String(min);
  if (n < 60) return `${n}m`;
  if (n < 1440) return `${n / 60}h`;
  if (n < 10080) return `${n / 1440}d`;
  if (n < 43200) return `${n / 10080}w`;
  if (n === 43200) return "1M";
  return `${n / 43200}M`;
}

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "FILLED") return { cls: "ACTIVE", label: "FILLED" };
  if (s === "OPEN") return { cls: "ACTIVE", label: "FILLED" };
  if (s === "CLOSED" || s === "CANCELLED") return { cls: "INACTIVE", label: s };
  if (s === "ERROR") return { cls: "FAIL", label: s };
  return { cls: "OTHER", label: s || "PENDING" };
}

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function calcRr(t) {
  const entry = asNum(t?.entry);
  const sl = asNum(t?.sl);
  const tp = asNum(t?.tp);
  if (entry == null || sl == null || tp == null) return null;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (!risk) return null;
  return reward / risk;
}

function brokerNameFromAccount(a) {
  if (!a || typeof a !== "object") return "-";
  const m = a.metadata && typeof a.metadata === "object" ? a.metadata : {};
  return String(m.broker_name || m.broker || m.platform || "-");
}

function brokerTicketOf(t) {
  return String(t?.broker_trade_id || t?.ticket || "").trim() || "-";
}

function rangeBounds(range) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  switch (String(range || "all")) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: null };
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { from: start.toISOString(), to: end.toISOString() };
    case "week":
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: null };
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: null };
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: null };
    case "last_week":
      start.setDate(start.getDate() - 7);
      return { from: start.toISOString(), to: null };
    case "last_month":
      start.setMonth(start.getMonth() - 1);
      return { from: start.toISOString(), to: null };
    default:
      return { from: null, to: null };
  }
}

function moneyRiskReward(t) {
  const m = t?.metadata && typeof t.metadata === "object" ? t.metadata : {};
  const risk = asNum(m.risk_money_actual) ?? asNum(m.risk_money) ?? asNum(m.risk_money_planned);
  const rr = asNum(m.rr) ?? asNum(t?.rr_planned) ?? calcRr(t);
  if (risk == null || rr == null) return { risk: null, reward: null };
  return { risk, reward: risk * rr };
}

const DETAIL_TF_TABS = ["ENTRY", "W", "D", "4H", "15m", "5m", "1m"];

function detailTabToTvInterval(tab) {
  const t = String(tab || "").toUpperCase();
  if (t === "W") return "W";
  if (t === "D") return "D";
  if (t === "4H") return "240";
  if (t === "15M") return "15";
  if (t === "5M") return "5";
  if (t === "1M") return "1";
  return "15";
}

function toTradingViewSymbol(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "ICMARKETS:EURUSD";
  if (s.includes(":")) return s;
  return `ICMARKETS:${s.replace(/[^A-Z0-9]/g, "")}`;
}

export default function TradesPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [tradeEvents, setTradeEvents] = useState([]);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [createMode, setCreateMode] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [detailTfTab, setDetailTfTab] = useState("ENTRY");
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

  const [filter, setFilter] = useState({
    q: "",
    account_id: "",
    source_id: "",
    symbol: "",
    side: "",
    entry_model: "",
    chart_tf: "",
    execution_status: "",
    range: "all",
    page: 1,
    pageSize: 50,
  });

  const query = useMemo(() => ({ ...filter }), [filter]);
  const [sortKey, setSortKey] = useState("audit");
  const [sortDir, setSortDir] = useState("desc");
  const inFlightRef = useRef(false);

  const accountById = useMemo(() => {
    const map = new Map();
    (accounts || []).forEach((a) => map.set(String(a.account_id || ""), a));
    return map;
  }, [accounts]);

  const uniqueOptions = useMemo(() => {
    const symbols = new Set();
    const models = new Set();
    const tfs = new Set();
    (rows || []).forEach(r => {
      if (r.symbol) symbols.add(r.symbol);
      if (r.entry_model) models.add(r.entry_model);
      if (r.chart_tf) tfs.add(r.chart_tf);
    });
    return {
      symbols: Array.from(symbols).sort(),
      models: Array.from(models).sort(),
      tfs: Array.from(tfs).sort()
    };
  }, [rows]);

  async function loadMeta() {
    try {
      const [accs, srcs] = await Promise.all([api.v2Accounts(), api.v2Sources()]);
      setAccounts(accs?.items || []);
      setSources(srcs?.items || []);
    } catch (e) { console.error(e); }
  }

  async function loadTrades() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setLoading(true);
      const queryApi = { ...query };
      const b = rangeBounds(queryApi.range);
      queryApi.created_from = b.from || "";
      queryApi.created_to = b.to || "";
      if (String(queryApi.execution_status || "").toUpperCase() === "FILLED") {
        queryApi.execution_status = "OPEN";
      }
      const data = await api.v2Trades(queryApi);
      const itemsRaw = data.items || [];
      const statusOrder = (x) => {
        const s = String(x?.execution_status || "").toUpperCase();
        if (s === "OPEN" || s === "FILLED") return 0;
        if (s === "PENDING") return 1;
        if (s === "CLOSED" || s === "CANCELLED") return 2;
        return 3;
      };
      const items = [...itemsRaw].sort((a, b) => {
        const sa = statusOrder(a);
        const sb = statusOrder(b);
        if (sa !== sb) return sa - sb;
        return new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime();
      });
      setRows(items);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setError("");
      setLastRefreshAt(new Date());
      if (items.length > 0) {
        if (!selectedTrade) setSelectedTrade(items[0]);
        else {
          const nextSelected = items.find((x) => x.trade_id === selectedTrade.trade_id);
          if (nextSelected) setSelectedTrade(nextSelected);
        }
      }
    } catch (e) {
      setError(e?.message || "Failed to load trades");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  async function loadTradeEvents(tradeId) {
    if (!tradeId) {
      setTradeEvents([]);
      return;
    }
    try {
      const out = await api.v2TradeEvents(tradeId, 100);
      let items = Array.isArray(out?.items) ? out.items : [];
      if (items.length === 0) {
        const row = rows.find((r) => r.trade_id === tradeId);
        const signalId = String(row?.signal_id || "").trim();
        if (signalId) {
          const legacy = await api.trade(signalId);
          const evs = Array.isArray(legacy?.events) ? legacy.events : [];
          items = evs.map((e, i) => ({
            log_id: e.id || i,
            created_at: e.event_time || e.created_at || null,
            metadata: e.payload_json || e.metadata || {},
            object_table: "signals",
          }));
        }
      }
      setTradeEvents(items);
    } catch {
      setTradeEvents([]);
    }
  }

  async function onBulkApply() {
    if (!bulkAction) return;
    if (bulkAction === "delete_all") {
      const targetCount = selectedIds.size > 0 ? selectedIds.size : rows.length;
      const ok = window.confirm(`Delete ${targetCount} trade(s)? This cannot be undone.`);
      if (!ok) return;
    }
    try {
      setBulkBusy(true);
      const filters = { ...query };
      const b = rangeBounds(filters.range);
      filters.created_from = b.from || "";
      filters.created_to = b.to || "";
      if (selectedIds.size > 0) {
        filters.trade_ids = Array.from(selectedIds);
      }
      await api.v2TradesBulkAction(bulkAction, filters);
      setSelectedIds(new Set());
      await loadTrades();
    } catch (e) {
      setError(e?.message || "Bulk action failed");
    } finally {
      setBulkBusy(false);
      setBulkAction("");
    }
  }

  async function onCreateTrade() {
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
      await api.createTrade(payload);
      setCreateMsg("Trade created");
      setCreateMode(false);
      await loadTrades();
      setTimeout(() => setCreateMsg(""), 1800);
    } catch (e) {
      setError(e?.message || "Create trade failed");
    } finally {
      setBulkBusy(false);
    }
  }

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadTrades(); }, [query]);
  useEffect(() => {
    if (selectedTrade?.trade_id) loadTradeEvents(selectedTrade.trade_id);
    else setTradeEvents([]);
  }, [selectedTrade?.trade_id]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      loadTrades();
      if (selectedTrade?.trade_id) {
        loadTradeEvents(selectedTrade.trade_id);
      }
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [query, selectedTrade?.trade_id]);

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.trade_id));
  const sortedRows = useMemo(() => {
    const statusRankAsc = (v) => {
      const s = String(v || "").toUpperCase();
      if (s === "OPEN" || s === "FILLED") return 0;
      if (s === "PENDING") return 1;
      if (s === "CLOSED" || s === "CANCELLED") return 2;
      return 3;
    };
    const statusRankDesc = (v) => {
      const s = String(v || "").toUpperCase();
      if (s === "PENDING") return 0;
      if (s === "OPEN" || s === "FILLED") return 1;
      if (s === "CLOSED" || s === "CANCELLED") return 2;
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
          ? statusRankAsc(a?.execution_status) - statusRankAsc(b?.execution_status)
          : statusRankDesc(a?.execution_status) - statusRankDesc(b?.execution_status);
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

  return (
    <section className="logs-page-container stack-layout">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 className="page-title" style={{ margin: 0 }}>Trades</h2>
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
                <button className="secondary-button" disabled={filter.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))}>PREV</button>
                <span className="minor-text">PAGE {filter.page} / {pages}</span>
                <button className="secondary-button" disabled={filter.page >= pages} onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))}>NEXT</button>
              </div>
            )}
            <select value={filter.pageSize} onChange={(e) => setFilter((f) => ({ ...f, pageSize: Number(e.target.value), page: 1 }))}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        </div>

        <div className="toolbar-group toolbar-search-filter" style={{ flexWrap: "wrap" }}>
          <input value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value, page: 1 }))} placeholder="Search trade id, symbol..." style={{ width: 220 }} />
          <select value={filter.account_id} onChange={(e) => setFilter((f) => ({ ...f, account_id: e.target.value, page: 1 }))}>
            <option value="">ALL ACCOUNTS</option>
            {accounts.map((a) => <option key={a.account_id} value={a.account_id}>{a.name || a.account_id}</option>)}
          </select>
          <select value={filter.source_id} onChange={(e) => setFilter((f) => ({ ...f, source_id: e.target.value, page: 1 }))}>
            <option value="">ALL SOURCES</option>
            {sources.map((s) => <option key={s.source_id} value={s.source_id}>{s.name || s.source_id}</option>)}
          </select>
          <select value={filter.execution_status} onChange={(e) => setFilter((f) => ({ ...f, execution_status: e.target.value, page: 1 }))}>
            {STATUS_OPTIONS.map((s) => <option key={s.value || "all"} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filter.side} onChange={(e) => setFilter((f) => ({ ...f, side: e.target.value, page: 1 }))}>
            <option value="">ALL SIDES</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <select value={filter.symbol} onChange={(e) => setFilter((f) => ({ ...f, symbol: e.target.value, page: 1 }))}>
            <option value="">ALL SYMBOLS</option>
            {uniqueOptions.symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filter.entry_model} onChange={(e) => setFilter((f) => ({ ...f, entry_model: e.target.value, page: 1 }))}>
            <option value="">ALL MODELS</option>
            {uniqueOptions.models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filter.chart_tf} onChange={(e) => setFilter((f) => ({ ...f, chart_tf: e.target.value, page: 1 }))}>
            <option value="">ALL TFS</option>
            {uniqueOptions.tfs.map(t => <option key={t} value={t}>{formatTimeframe(t)}</option>)}
          </select>
          <select value={filter.range} onChange={(e) => setFilter((f) => ({ ...f, range: e.target.value, page: 1 }))}>
            {RANGE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="toolbar-group toolbar-bulk-action">
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} disabled={bulkBusy}>
            {BULK_ACTIONS.map((a) => <option key={a.value || "none"} value={a.value}>{a.label}</option>)}
          </select>
          <button type="button" className="primary-button" disabled={!bulkAction || bulkBusy} onClick={onBulkApply}>APPLY</button>
          <button type="button" className="primary-button" onClick={() => setCreateMode((v) => !v)}>{createMode ? "CANCEL" : "+ CREATE TRADE"}</button>
        </div>
      </div>
      {createMsg ? <div className="loading" style={{ padding: 10 }}>{createMsg}</div> : null}

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          {error ? <div className="error">{error}</div> : null}
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          rows.forEach((r) => {
                            if (checked) next.add(r.trade_id);
                            else next.delete(r.trade_id);
                          });
                          return next;
                        });
                      }}
                    />
                  </th>
                  <th onClick={() => toggleSort("symbol")} style={{ cursor: "pointer" }}>SYMBOL{sortMarker("symbol")}</th>
                  <th>ACCOUNT</th>
                  <th>POSITION</th>
                  <th onClick={() => toggleSort("audit")} style={{ cursor: "pointer" }}>AUDIT{sortMarker("audit")}</th>
                  <th onClick={() => toggleSort("status")} style={{ cursor: "pointer" }}>STATUS{sortMarker("status")}</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr><td colSpan="6" className="loading">Loading trades...</td></tr>
                ) : sortedRows.length === 0 ? (
                  <tr><td colSpan="6" className="empty-state">No trades found.</td></tr>
                ) : sortedRows.map((t) => {
                  const status = statusUi(t.execution_status);
                  const action = String(t.action || t.side || "-").toUpperCase();
                  const actionCls = action === "BUY" ? "side-buy" : "side-sell";
                  const rr = calcRr(t);
                  const acc = accountById.get(String(t.account_id || ""));
                  const accountName = String(acc?.name || t.account_id || "-");
                  const brokerName = brokerNameFromAccount(acc);
                  const pnl = asNum(t.pnl_realized);
                  const stRaw = String(t.execution_status || "").toUpperCase();
                  const showPnl = stRaw !== "PENDING" && pnl != null && pnl !== 0;
                  const rrDisplay = asNum(t.rr_planned) ?? rr;
                  const timeValue = fDateTime(t.closed_at || t.opened_at || t.created_at);
                  return (
                    <tr key={t.trade_id} className={selectedTrade?.trade_id === t.trade_id ? "active" : ""} onClick={() => setSelectedTrade(t)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.trade_id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(t.trade_id);
                              else next.delete(t.trade_id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major"><span className={actionCls}>{action}</span> {t.symbol}</div>
                          <div className="cell-minor">{String(t.trade_id || "").slice(-8)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major">{accountName}</div>
                          <div className="cell-minor">{brokerName} | {brokerTicketOf(t)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major">{t.entry || "-"} → {t.tp || "-"} / {t.sl || "-"}</div>
                          <div className="cell-minor">
                            {(() => {
                              const mr = moneyRiskReward(t);
                              const riskTxt = mr.risk == null ? "-" : `$${mr.risk.toFixed(2)}`;
                              const rewardTxt = mr.reward == null ? "-" : `$${mr.reward.toFixed(2)}`;
                              return `${t.entry_model || "-"} | ${formatTimeframe(t.chart_tf || "-")} | ${formatTimeframe(t.signal_tf || "-")} | ${(rrDisplay ?? 0).toFixed(2)} rr | ${asNum(t.volume) ?? "-"} lots | ${riskTxt} / ${rewardTxt}`;
                            })()}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major">{timeValue}</div>
                          <div className="cell-minor">{t.note || "-"} {t.close_reason ? `| ${t.close_reason}` : ""}</div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major"><span className={`badge ${status.cls}`}>{status.label}</span></div>
                          {showPnl ? (
                            <div className={`cell-minor ${pnl < 0 ? "money-neg" : "money-pos"}`}>
                              ${pnl.toFixed(2)}
                            </div>
                          ) : null}
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
          {!selectedTrade ? (
            <div className="empty-state">SELECT A TRADE TO INSPECT DETAILS</div>
          ) : (
            <div className="stack-layout" style={{ gap: 14 }}>
              {(() => {
                const action = String(selectedTrade.action || selectedTrade.side || "-").toUpperCase();
                const actionCls = action === "BUY" ? "side-buy" : "side-sell";
                const st = statusUi(selectedTrade.execution_status);
                const pnl = asNum(selectedTrade.pnl_realized);
                const acc = accountById.get(String(selectedTrade.account_id || ""));
                const rr = calcRr(selectedTrade);
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "center" }}>
                    <div className="cell-major">
                      <span className={actionCls}>{action}</span> {selectedTrade.symbol || "-"}
                    </div>
                    <div className="cell-major">Entry: {selectedTrade.entry || "-"}</div>
                    <div className="cell-major">TP/SL: {selectedTrade.tp || "-"} / {selectedTrade.sl || "-"} {rr != null ? `| ${rr.toFixed(2)} rr` : ""}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                      <span className={pnl != null && pnl < 0 ? "money-neg" : "money-pos"} style={{ fontWeight: 800 }}>
                        {pnl == null ? "-" : `$${pnl.toFixed(2)}`}
                      </span>
                      <span className="minor-text">{acc?.name || selectedTrade.account_id || "-"}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  {DETAIL_TF_TABS.map((tab) => (
                    <button key={tab} type="button" className={`secondary-button ${detailTfTab === tab ? "active" : ""}`} onClick={() => setDetailTfTab(tab)}>
                      {tab}
                    </button>
                  ))}
                </div>
                {detailTfTab === "ENTRY" ? (
                  <TradeSignalChart 
                    symbol={selectedTrade.symbol}
                    interval={selectedTrade.signal_tf || selectedTrade.chart_tf || "1h"}
                    live={true}
                    entryPrice={asNum(selectedTrade.entry)}
                    slPrice={asNum(selectedTrade.sl)}
                    tpPrice={asNum(selectedTrade.tp)}
                    openedAt={selectedTrade.opened_at}
                    closedAt={selectedTrade.closed_at}
                    analysisSnapshot={selectedTrade?.metadata?.analysis_snapshot || selectedTrade?.raw_json?.analysis_snapshot || null}
                  />
                ) : (
                  <iframe
                    title={`trade-tv-${detailTfTab}`}
                    style={{ width: "100%", height: 430, border: "1px solid var(--border)", borderRadius: 10, background: "var(--panel)" }}
                    src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(toTradingViewSymbol(selectedTrade.symbol))}&interval=${encodeURIComponent(detailTabToTvInterval(detailTfTab))}&theme=dark&style=1&locale=en&toolbarbg=%230f1729&hide_top_toolbar=1&hide_legend=1&saveimage=0`}
                  />
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
                <div><span className="minor-text">Chart TF</span><div>{formatTimeframe(selectedTrade.chart_tf || "-")}</div></div>
                <div><span className="minor-text">Signal TF</span><div>{formatTimeframe(selectedTrade.signal_tf || "-")}</div></div>
                <div><span className="minor-text">Source</span><div>{selectedTrade.source_id || "-"}</div></div>
                <div><span className="minor-text">Entry Model</span><div>{selectedTrade.entry_model || "-"}</div></div>
                <div><span className="minor-text">Trade ID</span><div>{selectedTrade.trade_id || "-"}</div></div>
                <div><span className="minor-text">Broker Ticket</span><div>{brokerTicketOf(selectedTrade)}</div></div>
                <div><span className="minor-text">Signal ID</span><div>{selectedTrade.signal_id || "-"}</div></div>
                <div><span className="minor-text">Account</span><div>{accountById.get(String(selectedTrade.account_id || ""))?.name || selectedTrade.account_id || "-"}</div></div>
                <div style={{ gridColumn: "1 / -1" }}><span className="minor-text">Note</span><div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{selectedTrade.note || "-"}</div></div>
              </div>

              {createMode ? (
                <div className="panel" style={{ padding: 12 }}>
                  <div className="panel-label">CREATE TRADE</div>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
                    <select value={createForm.action} onChange={(e) => setCreateForm((p) => ({ ...p, action: e.target.value }))}><option value="BUY">BUY</option><option value="SELL">SELL</option></select>
                    <input value={createForm.symbol} onChange={(e) => setCreateForm((p) => ({ ...p, symbol: e.target.value }))} placeholder="BTCUSD" />
                    <input value={createForm.volume} onChange={(e) => setCreateForm((p) => ({ ...p, volume: e.target.value }))} placeholder="0.01" />
                    <input value={createForm.price} onChange={(e) => setCreateForm((p) => ({ ...p, price: e.target.value }))} placeholder="Entry" />
                    <input value={createForm.sl} onChange={(e) => setCreateForm((p) => ({ ...p, sl: e.target.value }))} placeholder="SL" />
                    <input value={createForm.tp} onChange={(e) => setCreateForm((p) => ({ ...p, tp: e.target.value }))} placeholder="TP" />
                    <input value={createForm.strategy} onChange={(e) => setCreateForm((p) => ({ ...p, strategy: e.target.value }))} placeholder="Strategy" />
                    <input value={createForm.timeframe} onChange={(e) => setCreateForm((p) => ({ ...p, timeframe: e.target.value }))} placeholder="TF" />
                    <input style={{ gridColumn: "1/-1" }} value={createForm.note} onChange={(e) => setCreateForm((p) => ({ ...p, note: e.target.value }))} placeholder="Note" />
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button type="button" className="primary-button" onClick={onCreateTrade} disabled={bulkBusy}>SAVE</button>
                    <button type="button" className="secondary-button" onClick={() => setCreateMode(false)}>CANCEL</button>
                  </div>
                </div>
              ) : null}

              <div style={{ maxHeight: 380, overflow: "auto", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                {tradeEvents.length === 0 ? (
                  <div className="muted">No events.</div>
                ) : tradeEvents.map((ev, idx) => {
                  const payload = ev?.metadata && typeof ev.metadata === "object" ? ev.metadata : {};
                  const evType = String(payload.event || payload.event_type || ev.object_table || "LOG");
                  const evTicket = String(
                    payload.ticket ||
                    payload.broker_trade_id ||
                    payload.brokerTradeId ||
                    payload.order_ticket ||
                    ""
                  ).trim();
                  return (
                    <div key={`${ev.log_id || idx}`} style={{ margin: "0 0 10px 0", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span className="panel-label" style={{ margin: 0 }}>{evType}</span>
                        <span className="minor-text">{fDateTime(ev.created_at || ev.event_time)}</span>
                      </div>
                      {evTicket ? (
                        <div className="minor-text" style={{ marginBottom: 8 }}>Ticket: <strong>{evTicket}</strong></div>
                      ) : null}
                      <div className="json-table-wrapper">
                        <pre className="minor-text" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {JSON.stringify(payload || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
