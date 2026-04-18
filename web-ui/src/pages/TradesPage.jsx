import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

const STATUS_OPTIONS = ["", "PENDING", "OPEN", "FILLED", "CLOSED", "CANCELLED", "ERROR"];
const PAGE_SIZE_OPTIONS = [50, 100, 200];

function fDateTime(v) {
  if (!v) return "-";
  return new Date(v).toLocaleString(undefined, {
    year: '2-digit', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "FILLED" || s === "OPEN") return { cls: "ACTIVE", label: s };
  if (s === "CLOSED" || s === "CANCELLED") return { cls: "INACTIVE", label: s };
  if (s === "ERROR") return { cls: "FAIL", label: s };
  return { cls: "OTHER", label: s || "PENDING" };
}

export default function TradesPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [sources, setSources] = useState([]);
  
  const [filter, setFilter] = useState({
    q: "",
    account_id: "",
    source_id: "",
    execution_status: "",
    page: 1,
    pageSize: 50,
  });

  const query = useMemo(() => ({ ...filter }), [filter]);
  const inFlightRef = useRef(false);

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
      const data = await api.v2Trades(query);
      setRows(data.items || []);
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

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadTrades(); }, [query]);

  return (
    <section className="logs-page-container stack-layout">
      <h2 className="page-title">Trades (V2 Executions)</h2>
      
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
            <select value={filter.pageSize} onChange={e => setFilter(f => ({ ...f, pageSize: Number(e.target.value), page: 1 }))}>
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        </div>

        <div className="toolbar-group toolbar-search-filter" style={{ flexWrap: 'wrap' }}>
          <input 
            value={filter.q} 
            onChange={(e) => setFilter(f => ({ ...f, q: e.target.value, page: 1 }))} 
            placeholder="Search Trade ID, Symbol..." 
            style={{ width: '180px' }}
          />
          <select value={filter.account_id} onChange={(e) => setFilter(f => ({ ...f, account_id: e.target.value, page: 1 }))}>
            <option value="">ALL ACCOUNTS</option>
            {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.name || a.account_id}</option>)}
          </select>
          <select value={filter.source_id} onChange={(e) => setFilter(f => ({ ...f, source_id: e.target.value, page: 1 }))}>
            <option value="">ALL SOURCES</option>
            {sources.map(s => <option key={s.source_id} value={s.source_id}>{s.name || s.source_id}</option>)}
          </select>
          <select value={filter.execution_status} onChange={(e) => setFilter(f => ({ ...f, execution_status: e.target.value, page: 1 }))}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || "ALL STATUSES"}</option>)}
          </select>
        </div>
      </div>

      <div className="events-table-wrap">
        {error ? <div className="error">{error}</div> : null}
        <table className="events-table">
          <thead>
            <tr>
              <th>SYMBOL</th>
              <th>ACCOUNT</th>
              <th>SOURCE</th>
              <th>INTENT</th>
              <th>STATUS</th>
              <th>CREATED</th>
              <th style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr><td colSpan="7" className="loading">Loading trades...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">No trades found.</td></tr>
            ) : rows.map(t => {
              const status = statusUi(t.execution_status);
              const actionCls = t.action === 'BUY' ? 'side-buy' : 'side-sell';
              return (
                <tr key={t.trade_id}>
                  <td>
                    <div className="cell-wrap">
                      <div className="cell-major"><span className={actionCls}>{t.action}</span> {t.symbol}</div>
                      <div className="cell-minor">{t.trade_id.slice(-8)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-wrap">
                      <div className="cell-major">{t.account_id}</div>
                      <div className="cell-minor">{t.broker_id || '-'}</div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-wrap">
                      <div className="cell-major">{t.source_id}</div>
                      <div className="cell-minor">{t.note || "-"}</div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-wrap">
                      <div className="cell-major">{t.entry || '-'}</div>
                      <div className="cell-minor">SL: {t.sl || '-'} | TP: {t.tp || '-'}</div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-wrap">
                      <div className="cell-major"><span className={`badge ${status.cls}`}>{status.label}</span></div>
                      <div className={Number(t.pnl_realized) >= 0 ? 'money-pos' : 'money-neg'} style={{ fontWeight: 800 }}>
                        {t.pnl_realized != null ? `$${Number(t.pnl_realized).toFixed(2)}` : ''}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-minor">{fDateTime(t.created_at)}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/trades/${t.trade_id}`} className="primary-button small">VIEW</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
