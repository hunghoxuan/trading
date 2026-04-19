import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { TradeSignalChart } from "../components/TradeSignalChart";

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

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
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
      if (selectedSignal?.signal_id) {
        const refreshed = nextRows.find((x) => x.signal_id === selectedSignal.signal_id);
        if (refreshed) setSelectedSignal(refreshed);
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
    if (selectedSignal) loadSignalDetail(selectedSignal.signal_id);
    else setSignalDetails(null);
  }, [selectedSignal]);

  useEffect(() => { loadSymbols(); }, []);
  useEffect(() => { loadSignals(); }, [query]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      loadSignals();
      if (selectedSignal?.signal_id) {
        loadSignalDetail(selectedSignal.signal_id);
      }
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [query, selectedSignal?.signal_id]);

  const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.signal_id));

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
                <button className="secondary-button" disabled={filter.page <= 1} onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))}>PREV</button>
                <span className="minor-text">PAGE {filter.page} / {pages}</span>
                <button className="secondary-button" disabled={filter.page >= pages} onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))}>NEXT</button>
              </div>
            )}
            <select
              value={filter.pageSize}
              onChange={e => setFilter(f => ({ ...f, pageSize: Number(e.target.value), page: 1 }))}
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
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
                          rows.forEach(r => checked ? next.add(r.signal_id) : next.delete(r.signal_id));
                          return next;
                        });
                      }}
                    />
                  </th>
                  <th>SYMBOL</th>
                  <th>POSITION</th>
                  <th>AUDIT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => {
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
                      onClick={() => { setCreateMode(false); setSelectedSignal(t); }}
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
                            Entry: {fPrice(t.entry, t.target_price || t.entry_price)} → {fPrice(t.tp)} / {fPrice(t.sl)}
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
            <div className="trade-detail-content">
              <div className="detail-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ margin: 0 }}>
                    <span className={String(selectedSignal.action || selectedSignal.side || '').toUpperCase() === 'BUY' ? 'side-buy' : 'side-sell'} style={{ fontSize: '24px' }}>
                      {String(selectedSignal.action || selectedSignal.side || '-').toUpperCase()}
                    </span> 
                    {" "}{selectedSignal.symbol}
                  </h2>
                  <div className="cell-minor" style={{ marginTop: '4px' }}>{selectedSignal.signal_id}</div>
                  <div className="cell-minor" style={{ marginTop: '4px', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedSignal.source} | {selectedSignal.entry_model} | {formatTimeframe(selectedSignal.chart_tf)} | {formatTimeframe(selectedSignal.signal_tf)}
                  </div>
                </div>
                <div className={`badge ${statusUi(selectedSignal.status).cls}`} style={{ height: 'fit-content', padding: '6px 14px' }}>
                  {statusUi(selectedSignal.status).label}
                </div>
              </div>

              <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
                  <div><span className="minor-text">Signal ID</span><div>{selectedSignal.signal_id || "-"}</div></div>
                  <div><span className="minor-text">Source</span><div>{selectedSignal.source || "-"}</div></div>
                  <div><span className="minor-text">Entry Model</span><div>{selectedSignal.entry_model || "-"}</div></div>
                  <div><span className="minor-text">Chart TF</span><div>{formatTimeframe(selectedSignal.chart_tf || "-")}</div></div>
                  <div><span className="minor-text">Signal TF</span><div>{formatTimeframe(selectedSignal.signal_tf || "-")}</div></div>
                  <div><span className="minor-text">Entry</span><div>{fPrice(selectedSignal.entry, selectedSignal.target_price || selectedSignal.entry_price)}</div></div>
                  <div><span className="minor-text">TP/SL</span><div>{fPrice(selectedSignal.tp)} / {fPrice(selectedSignal.sl)}</div></div>
                  <div><span className="minor-text">Volume</span><div>{selectedSignal.volume || "-"}</div></div>
                  <div><span className="minor-text">Note</span><div>{selectedSignal.note || "-"}</div></div>
                </div>
              </div>

              <div className="panel" style={{ padding: 12 }}>
                <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Market View</div>
                <TradeSignalChart 
                   symbol={selectedSignal.symbol} 
                   interval={selectedSignal.signal_tf || selectedSignal.chart_tf || "1h"}
                   live={true}
                   entryPrice={asNum(selectedSignal.entry || selectedSignal.target_price || selectedSignal.entry_price)}
                   slPrice={asNum(selectedSignal.sl)}
                   tpPrice={asNum(selectedSignal.tp)}
                />
              </div>

              <div style={{ marginTop: '20px' }}>
                <div className="panel-label">HISTORY</div>
                {!(signalDetails?.events || signalDetails?.items) ? (
                  <div className="loading">FETCHING TELEMETRY LOGS...</div>
                ) : (
                  <div className="stack-layout" style={{ gap: '10px' }}>
                    {[...(signalDetails?.events || signalDetails?.items || [])].sort((a,b) => new Date(b.event_time || b.created_at || 0) - new Date(a.event_time || a.created_at || 0)).map((ev) => {
                      let stTxt = "";
                      let stCls = "OTHER";
                      const payload = ev.payload_json || ev.metadata || {};
                      const tType = String(ev.event_type || payload.event_type || payload.event || ev.type || "");
                      if (tType.startsWith("EA_ACK_")) {
                         const raw = tType.replace("EA_ACK_", "");
                         stTxt = raw;
                         stCls = statusUi(raw).cls;
                      }
                      
                      return (
                        <div key={`${ev.id || ev.event_id || ev.created_at || Math.random()}`} className="panel" style={{ margin: 0, padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="panel-label" style={{ margin: 0 }}>{tType || "EVENT"}</span>
                              {stTxt && <span className={`badge ${stCls}`}>{stTxt}</span>}
                            </div>
                            <span className="minor-text">{fDateTime(ev.event_time || ev.created_at)}</span>
                          </div>
                          <div className="json-table-wrapper">
                            <pre className="minor-text" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {JSON.stringify(payload || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
