import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";

const STATUS_OPTIONS = ["", "NEW", "LOCKED", "PLACED", "START", "FAIL", "TP", "SL", "CANCEL", "EXPIRED"];
const BULK_ACTIONS = ["", "Download CSV", "Renew All", "Cancel All", "Delete All"];
const RANGE_OPTIONS = ["", "today", "week", "month"];
const PAGE_SIZE_OPTIONS = [50, 100, 200];

function fPrice(v1, v2) {
  const n1 = Number(v1);
  if (n1 && n1 !== 0) return n1.toLocaleString(undefined, { maximumFractionDigits: 5 });
  const n2 = Number(v2);
  if (n2 && n2 !== 0) return n2.toLocaleString(undefined, { maximumFractionDigits: 5 });
  return "-";
}

function PnlDisplay({ value }) {
  const n = Number(value);
  if (n === null || n === undefined || n === 0) return null;
  const cls = n > 0 ? "money-pos" : "money-neg";
  const abs = Math.abs(n);
  const str = `$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return <div className={`cell-minor ${cls}`} style={{ fontWeight: 800 }}>{n < 0 ? `-${str}` : str}</div>;
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

export default function TradesPage() {
  const [symbols, setSymbols] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [tradeDetails, setTradeDetails] = useState(null);
  const [error, setError] = useState("");
  const [advFilters, setAdvFilters] = useState({ sources: [], entry_models: [], chart_tfs: [], signal_tfs: [] });
  const [createMode, setCreateMode] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
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
      const data = await api.filtersAdvanced();
      setSymbols(data.symbols || []);
      setAdvFilters({
        sources: data.sources || [],
        entry_models: data.entry_models || [],
        chart_tfs: data.chart_tfs || [],
        signal_tfs: data.signal_tfs || [],
      });
    } catch { /* ignore */ }
  }

  async function loadTrades() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setLoading(true);
      const data = await api.trades(query);
      setRows(data.trades || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load trades");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  async function loadTradeDetail(signalId) {
    try {
      const res = await api.trade(signalId);
      setTradeDetails(res);
    } catch (e) {
      console.error("Failed to load details:", e);
    }
  }

  async function onCreateTrade() {
    try {
      setBulkBusy(true);
      const payload = {
        action: String(createForm.action || "BUY").toUpperCase(),
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
      setCreateMsg(`Trade created: ${out?.trade?.signal_id || "ok"}`);
      setCreateMode(false);
      await loadTrades();
      if (out?.trade?.signal_id) {
        const created = { signal_id: out.trade.signal_id, action: payload.action, symbol: payload.symbol, status: "NEW" };
        setSelectedTrade(created);
      }
    } catch (e) {
      setError(e?.message || "Failed to create trade");
    } finally {
      setBulkBusy(false);
      window.setTimeout(() => setCreateMsg(""), 2200);
    }
  }

  useEffect(() => {
    if (selectedTrade) loadTradeDetail(selectedTrade.signal_id);
    else setTradeDetails(null);
  }, [selectedTrade]);

  useEffect(() => { loadSymbols(); }, []);
  useEffect(() => { loadTrades(); }, [query]);

  const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.signal_id));

  return (
    <section className="logs-page-container stack-layout">
      <h2 className="page-title">Trades</h2>
      <div className="toolbar-panel">
        <div className="toolbar-group toolbar-pagination">
          <div className="pager-area">
            <strong>{total}</strong> RESULTS
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
            placeholder="Search Trade ID, Ticket..." 
            style={{ width: '200px' }}
          />
          <select value={filter.symbol} onChange={(e) => setFilter(f => ({ ...f, symbol: e.target.value, page: 1 }))}>
            <option value="">ALL SYMBOLS</option>
            {symbols.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filter.status} onChange={(e) => setFilter(f => ({ ...f, status: e.target.value, page: 1 }))}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || "ALL STATUSES"}</option>)}
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
            {advFilters.chart_tfs.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filter.signal_tf} onChange={(e) => setFilter(f => ({ ...f, signal_tf: e.target.value, page: 1 }))}>
            <option value="">SIGNAL TF</option>
            {advFilters.signal_tfs.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filter.range} onChange={(e) => setFilter(f => ({ ...f, range: e.target.value, page: 1 }))}>
            {RANGE_OPTIONS.map(s => <option key={s} value={s}>{s ? s.toUpperCase() : "ALL RANGES"}</option>)}
          </select>
        </div>

        <div className="toolbar-group toolbar-bulk-action">
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} disabled={bulkBusy}>
            {BULK_ACTIONS.map(s => <option key={s} value={s}>{s || "BULK ACTION..."}</option>)}
          </select>
          <button type="button" className="primary-button" onClick={() => console.log("Bulk logic here")} disabled={bulkBusy || !bulkAction}>APPLY</button>
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
                  <th>LEVELS</th>
                  <th>AUDIT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => {
                  const status = statusUi(t.status);
                  const sideCls = t.action?.toUpperCase() === 'BUY' ? 'side-buy' : 'side-sell';
                  
                  return (
                    <tr 
                      key={t.signal_id} 
                      className={selectedTrade?.signal_id === t.signal_id ? "active" : ""}
                      onClick={() => { setCreateMode(false); setSelectedTrade(t); }}
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
                          <div className="cell-major"><span className={sideCls}>{t.action?.toUpperCase()}</span> {t.symbol}</div>
                          <div className="cell-minor" style={{ fontWeight: 700, color: 'var(--primary)' }}>{t.source || 'TV.Unknown'}</div>
                          <div className="cell-minor">{t.signal_id} {t.ack_ticket ? `| #${t.ack_ticket}` : ''}</div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major">
                            {fPrice(t.entry_price_exec, t.entry_price)} → {fPrice(t.tp_exec, t.tp)} / {fPrice(t.sl_exec, t.sl)}
                          </div>
                          <div className="cell-minor">{t.entry_model || '-'}</div>
                          <div className="cell-minor">{t.signal_tf || t.chart_tf || '-'} | {t.volume || '0'} lots</div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major">{fDateTime(t.created_at)}</div>
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
          <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                if (createMode) {
                  setCreateMode(false);
                } else {
                  setCreateMode(true);
                  setSelectedTrade(null);
                }
              }}
            >
              {createMode ? "CANCEL" : "CREATE TRADE"}
            </button>
          </div>
        </div>

        <div className="logs-detail-pane">
          {createMode ? (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-label">TRADE FORM</div>
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
                  <button type="button" className="primary-button" onClick={onCreateTrade} disabled={bulkBusy}>{bulkBusy ? "💾 SAVING..." : "💾 SAVE TRADE"}</button>
                  <button type="button" className="secondary-button" onClick={() => setCreateMode(false)} disabled={bulkBusy}>✖ CANCEL</button>
                </div>
              </div>
            </div>
          ) : !selectedTrade ? (
            <div className="empty-state minor-text">SELECT A TRADE TO INSPECT HISTORY</div>
          ) : (
            <div className="trade-detail-content">
              <div className="detail-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ margin: 0 }}>
                    <span className={selectedTrade.action?.toUpperCase() === 'BUY' ? 'side-buy' : 'side-sell'} style={{ fontSize: '24px' }}>
                      {selectedTrade.action?.toUpperCase()}
                    </span> 
                    {" "}{selectedTrade.symbol}
                  </h2>
                  <div className="cell-minor" style={{ marginTop: '4px' }}>{selectedTrade.signal_id}</div>
                  <div className="cell-minor" style={{ marginTop: '4px', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedTrade.source} | {selectedTrade.entry_model} | {selectedTrade.chart_tf || 'n/a'} | {selectedTrade.signal_tf || 'n/a'}
                  </div>
                </div>
                <div className={`badge ${statusUi(selectedTrade.status).cls}`} style={{ height: 'fit-content', padding: '6px 14px' }}>
                  {statusUi(selectedTrade.status).label}
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <div className="panel-label">HISTORY</div>
                {!tradeDetails?.events ? (
                  <div className="loading">FETCHING TELEMETRY LOGS...</div>
                ) : (
                  <div className="stack-layout" style={{ gap: '10px' }}>
                    {[...tradeDetails.events].sort((a,b) => new Date(b.event_time) - new Date(a.event_time)).map((ev) => {
                      let stTxt = "";
                      let stCls = "OTHER";
                      const tType = String(ev.event_type || "");
                      if (tType.startsWith("EA_ACK_")) {
                         const raw = tType.replace("EA_ACK_", "");
                         stTxt = raw;
                         stCls = statusUi(raw).cls;
                      }
                      
                      return (
                        <div key={ev.id} className="panel" style={{ margin: 0, padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="panel-label" style={{ margin: 0 }}>{ev.event_type}</span>
                              {stTxt && <span className={`badge ${stCls}`}>{stTxt}</span>}
                            </div>
                            <span className="minor-text">{fDateTime(ev.event_time)}</span>
                          </div>
                          <div className="json-table-wrapper">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <tbody>
                                {Object.entries(ev.payload_json || {}).map(([k, v]) => (
                                  <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td className="minor-text" style={{ padding: '8px 0', width: '30%', fontWeight: 700, color: 'var(--muted)' }}>{k}</td>
                                    <td className="minor-text" style={{ padding: '8px 0', color: 'var(--text)' }}>
                                      {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
