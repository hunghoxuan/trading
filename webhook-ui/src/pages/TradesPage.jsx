import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import TradeLevelChart from "../components/TradeLevelChart";

const STATUS_OPTIONS = ["", "NEW", "LOCKED", "PLACED", "OK", "START", "FAIL", "TP", "SL", "CANCEL", "EXPIRED"];
const BULK_ACTIONS = ["", "Download CSV", "Renew All", "Cancel All", "Delete All"];
const PAGE_SIZE_OPTIONS = [50, 100, 200];
const RANGE_OPTIONS = ["", "today", "week", "month"];

function asMoney(v) {
  if (v === null || v === undefined || v === "") return "0.00";
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function asMoneySigned(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0.00";
  if (n < 0) return `-$${asMoney(Math.abs(n))}`;
  return `$${asMoney(n)}`;
}

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "OK") return { cls: "OK", label: "PLACED" };
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
  const inFlightRef = useRef(false);

  const [filter, setFilter] = useState({
    q: "",
    symbol: "",
    status: "",
    range: "",
    page: 1,
    pageSize: 50,
  });

  const query = useMemo(() => ({ ...filter }), [filter]);

  async function loadSymbols() {
    try {
      const data = await api.symbols();
      setSymbols(data.symbols || []);
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
      console.error("Failed to load history:", e);
    }
  }

  useEffect(() => {
    if (selectedTrade) {
      loadTradeDetail(selectedTrade.signal_id);
    } else {
      setTradeDetails(null);
    }
  }, [selectedTrade]);

  useEffect(() => { loadSymbols(); }, []);
  useEffect(() => { loadTrades(); }, [query]);

  return (
    <section className="logs-page-container">
      <div className="logs-top-bar">
        <div className="logs-filters">
          <input 
            value={filter.q} 
            onChange={(e) => setFilter(f => ({ ...f, q: e.target.value, page: 1 }))} 
            placeholder="Search Signal ID, Ticket, Note..." 
          />
          <select value={filter.symbol} onChange={(e) => setFilter(f => ({ ...f, symbol: e.target.value, page: 1 }))}>
            <option value="">All Symbols</option>
            {symbols.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filter.status} onChange={(e) => setFilter(f => ({ ...f, status: e.target.value, page: 1 }))}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
          </select>
          <select value={filter.range} onChange={(e) => setFilter(f => ({ ...f, range: e.target.value, page: 1 }))}>
            {RANGE_OPTIONS.map(r => <option key={r} value={r}>{r ? (r === "month" ? "Month" : r === "week" ? "Week" : "Today") : "All time"}</option>)}
          </select>
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} disabled={bulkBusy}>
            {BULK_ACTIONS.map(s => <option key={s} value={s}>{s || "Bulk Action..."}</option>)}
          </select>
          <button type="button" onClick={() => console.log("Bulk logic here")} disabled={bulkBusy || !bulkAction}>OK</button>
        </div>
      </div>

      <div className="logs-layout-split">
        {/* LEFT PANE: TRADE LIST */}
        <div className="logs-list-pane">
          <div className="panel-head">
            <h3>Trade List ({total})</h3>
            <div className="pager-mini">
              <button disabled={filter.page <= 1} onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))}>Prev</button>
              <span>{filter.page} / {pages}</span>
              <button disabled={filter.page >= pages} onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))}>Next</button>
            </div>
          </div>

          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Status</th>
                  <th>Entry</th>
                  <th>PnL</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => {
                  const status = statusUi(t.status);
                  return (
                    <tr 
                      key={t.signal_id} 
                      className={selectedTrade?.signal_id === t.signal_id ? "active" : ""}
                      onClick={() => setSelectedTrade(t)}
                    >
                      <td className="accent"><strong>{t.symbol}</strong></td>
                      <td><span className={`badge ${t.action}`}>{t.action}</span></td>
                      <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                      <td className="small">{asMoney(t.entry_price_exec || t.entry_price)}</td>
                      <td className={t.pnl_money_realized > 0 ? "money-pos" : t.pnl_money_realized < 0 ? "money-neg" : ""}>
                         {asMoneySigned(t.pnl_money_realized || 0)}
                      </td>
                      <td className="muted small">{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANE: TRADE DETAILS & HISTORY */}
        <div className="logs-detail-pane">
          {!selectedTrade ? (
            <div className="empty-state muted">Select a trade to inspect execution history and levels</div>
          ) : (
            <div className="trade-detail-content">
              <div className="detail-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '28px' }}>{selectedTrade.symbol} <span className="muted" style={{ fontSize: '18px', fontWeight: 400 }}>{selectedTrade.action}</span></h2>
                    <div className="muted small">{selectedTrade.signal_id}</div>
                  </div>
                  <div className={`badge ${statusUi(selectedTrade.status).cls}`} style={{ padding: '4px 12px', fontSize: '14px' }}>
                    {statusUi(selectedTrade.status).label}
                  </div>
                </div>
              </div>

              {/* STATS CARDS */}
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div className="kpi-card">
                  <div className="kpi-label">Execution Summary</div>
                  <div className="kpi-value" style={{ fontSize: '20px' }}>
                    {asMoney(selectedTrade.entry_price_exec || selectedTrade.entry_price)} 
                    <span className="muted" style={{ fontSize: '14px', margin: '0 8px' }}>→</span>
                    <span className={selectedTrade.pnl_money_realized > 0 ? "money-pos" : "money-neg"}>
                      {asMoneySigned(selectedTrade.pnl_money_realized || 0)}
                    </span>
                  </div>
                  <div className="muted small" style={{ marginTop: '8px' }}>
                    Risk: ${asMoney(selectedTrade.risk_money_actual || selectedTrade.risk_money_planned)} | RR: {selectedTrade.rr_planned}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Levels (Broker)</div>
                  <div className="muted small">
                    TP: <strong style={{color:'#fff'}}>{asMoney(selectedTrade.tp_exec || selectedTrade.tp_price)}</strong> 
                    {selectedTrade.tp_pips ? ` (${selectedTrade.tp_pips.toFixed(1)}p)` : ''}
                  </div>
                  <div className="muted small" style={{ marginTop: '4px' }}>
                    SL: <strong style={{color:'#fff'}}>{asMoney(selectedTrade.sl_exec || selectedTrade.sl_price)}</strong>
                    {selectedTrade.sl_pips ? ` (${selectedTrade.sl_pips.toFixed(1)}p)` : ''}
                  </div>
                </div>
              </div>

              {/* LEVEL CHART */}
              {tradeDetails?.chart && (
                <div style={{ marginTop: '24px' }}>
                  <div className="kpi-label">Level Visualization</div>
                  <TradeLevelChart trade={tradeDetails.chart} />
                </div>
              )}

              {/* HISTORY SECTION */}
              <div style={{ marginTop: '32px' }}>
                <h3 style={{ marginBottom: '16px', borderLeft: '4px solid var(--accent)', paddingLeft: '12px' }}>Audit History</h3>
                {!tradeDetails?.events ? (
                  <div className="loading">Fetching telemetry logs...</div>
                ) : tradeDetails.events.length === 0 ? (
                  <div className="muted">No event logs recorded for this trade.</div>
                ) : (
                  <div className="stack-layout" style={{ gap: '12px' }}>
                    {[...tradeDetails.events].sort((a,b) => new Date(b.event_time) - new Date(a.event_time)).map((ev) => (
                      <div key={ev.id} className="panel" style={{ margin: 0 }}>
                         <div className="panel-head" style={{ padding: '8px 16px' }}>
                           <span className="badge-event">{ev.event_type}</span>
                           <span className="muted small">{new Date(ev.event_time).toLocaleString()}</span>
                         </div>
                         <div className="panel-body" style={{ padding: '12px 16px', fontSize: '13px' }}>
                            <div className="json-table-wrapper">
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                  {Object.entries(ev.payload_json || {}).map(([k, v]) => (
                                    <tr key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                      <td className="muted" style={{ padding: '4px 0', width: '35%' }}>{k}</td>
                                      <td style={{ padding: '4px 0', wordBreak: 'break-all' }}>
                                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                         </div>
                      </div>
                    ))}
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
