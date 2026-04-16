import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";

const STATUS_OPTIONS = ["", "NEW", "LOCKED", "PLACED", "OK", "START", "FAIL", "TP", "SL", "CANCEL", "EXPIRED"];
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
      console.error("Failed to load details:", e);
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
      <div className="logs-top-bar">
        <div className="logs-top-left">
          <div className="pager-area">
            <strong>{total}</strong> RESULTS
            <div className="pager-mini">
              <button disabled={filter.page <= 1} onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))}>PREV</button>
              <span className="minor-text">PAGE {filter.page} / {pages}</span>
              <button disabled={filter.page >= pages} onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))}>NEXT</button>
            </div>
            <select 
              className="minor-text" 
              style={{ padding: '0 4px', height: '22px', marginLeft: '10px' }}
              value={filter.pageSize}
              onChange={e => setFilter(f => ({ ...f, pageSize: Number(e.target.value), page: 1 }))}
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        </div>

        <div className="logs-filters">
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
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} disabled={bulkBusy}>
            {BULK_ACTIONS.map(s => <option key={s} value={s}>{s || "BULK ACTION..."}</option>)}
          </select>
          <button type="button" onClick={() => console.log("Bulk logic here")} disabled={bulkBusy || !bulkAction}>OK</button>
        </div>
      </div>

      <div className="logs-layout-split">
        <div className="logs-list-pane">
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
                      onClick={() => setSelectedTrade(t)}
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
                          <div className="cell-minor">{t.signal_id} {t.ack_ticket ? `| #${t.ack_ticket}` : ''}</div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major">
                            {fPrice(t.entry_price_exec, t.entry_price)} → {fPrice(t.tp_exec, t.tp)} / {fPrice(t.sl_exec, t.sl)}
                          </div>
                          <div className="cell-minor">{t.rr_planned || '0'} rr | {t.volume || '0'} lots</div>
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
        </div>

        <div className="logs-detail-pane">
          {!selectedTrade ? (
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
