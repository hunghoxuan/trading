import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";

const STATUS_OPTIONS = ["", "PENDING", "OPEN", "FILLED", "CLOSED", "CANCELLED", "ERROR"];
const PAGE_SIZE_OPTIONS = [50, 100, 200];

function fDateTime(v) {
  if (!v) return "-";
  return new Date(v).toLocaleString(undefined, {
    year: "2-digit", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function statusUi(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "FILLED" || s === "OPEN") return { cls: "ACTIVE", label: s };
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

  const accountById = useMemo(() => {
    const map = new Map();
    (accounts || []).forEach((a) => map.set(String(a.account_id || ""), a));
    return map;
  }, [accounts]);

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
      const items = data.items || [];
      setRows(items);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setError("");
      if (!selectedTrade && items.length > 0) setSelectedTrade(items[0]);
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
      setTradeEvents(Array.isArray(out?.items) ? out.items : []);
    } catch {
      setTradeEvents([]);
    }
  }

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadTrades(); }, [query]);
  useEffect(() => {
    if (selectedTrade?.trade_id) loadTradeEvents(selectedTrade.trade_id);
    else setTradeEvents([]);
  }, [selectedTrade?.trade_id]);

  return (
    <section className="logs-page-container stack-layout">
      <h2 className="page-title">Trades</h2>

      <div className="toolbar-panel">
        <div className="toolbar-group toolbar-pagination">
          <div className="pager-area">
            <strong>{total}</strong> RESULTS
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
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "ALL STATUSES"}</option>)}
          </select>
        </div>
      </div>

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          {error ? <div className="error">{error}</div> : null}
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  <th>SYMBOL</th>
                  <th>ACCOUNT</th>
                  <th>POSITION</th>
                  <th>STATUS</th>
                  <th>TIME</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr><td colSpan="5" className="loading">Loading trades...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan="5" className="empty-state">No trades found.</td></tr>
                ) : rows.map((t) => {
                  const status = statusUi(t.execution_status);
                  const action = String(t.action || t.side || "-").toUpperCase();
                  const actionCls = action === "BUY" ? "side-buy" : "side-sell";
                  const rr = calcRr(t);
                  const acc = accountById.get(String(t.account_id || ""));
                  const accountName = String(acc?.name || t.account_id || "-");
                  const brokerName = brokerNameFromAccount(acc);
                  return (
                    <tr key={t.trade_id} className={selectedTrade?.trade_id === t.trade_id ? "active" : ""} onClick={() => setSelectedTrade(t)}>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major"><span className={actionCls}>{action}</span> {t.symbol}</div>
                          <div className="cell-minor">{String(t.trade_id || "").slice(-8)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major">{accountName}</div>
                          <div className="cell-minor">{brokerName}</div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-wrap">
                          <div className="cell-major">{t.entry || "-"} → TP {t.tp || "-"} / SL {t.sl || "-"}</div>
                          <div className="cell-minor">RR: {rr == null ? "-" : rr.toFixed(2)} | Volume: {asNum(t.volume) ?? "-"}</div>
                        </div>
                      </td>
                      <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                      <td className="minor-text">{fDateTime(t.created_at)}</td>
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
              <div className="panel-label" style={{ marginBottom: 0 }}>TRADE DETAIL</div>
              <div className="panel" style={{ padding: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
                  <div><span className="minor-text">Trade ID</span><div>{selectedTrade.trade_id}</div></div>
                  <div><span className="minor-text">Signal ID</span><div>{selectedTrade.signal_id || "-"}</div></div>
                  <div><span className="minor-text">Account</span><div>{selectedTrade.account_id || "-"}</div></div>
                  <div><span className="minor-text">Source</span><div>{selectedTrade.source_id || "-"}</div></div>
                  <div><span className="minor-text">Action</span><div>{String(selectedTrade.action || selectedTrade.side || "-").toUpperCase()}</div></div>
                  <div><span className="minor-text">Symbol</span><div>{selectedTrade.symbol || "-"}</div></div>
                  <div><span className="minor-text">Entry</span><div>{selectedTrade.entry || "-"}</div></div>
                  <div><span className="minor-text">TP/SL</span><div>{selectedTrade.tp || "-"} / {selectedTrade.sl || "-"}</div></div>
                  <div><span className="minor-text">Volume</span><div>{selectedTrade.volume ?? "-"}</div></div>
                  <div><span className="minor-text">Status</span><div>{selectedTrade.execution_status || "-"}</div></div>
                </div>
              </div>

              <div className="panel" style={{ padding: 12 }}>
                <div className="panel-label" style={{ marginBottom: 8 }}>HISTORY</div>
                <div style={{ maxHeight: 320, overflow: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Event</th>
                        <th>Payload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeEvents.length === 0 ? (
                        <tr><td colSpan={3} className="muted">No events.</td></tr>
                      ) : tradeEvents.map((ev, idx) => (
                        <tr key={`${ev.log_id || idx}`}>
                          <td className="minor-text">{fDateTime(ev.created_at || ev.event_time)}</td>
                          <td>{String(ev?.metadata?.event || ev?.metadata?.event_type || ev.object_table || "LOG")}</td>
                          <td><code>{JSON.stringify(ev.metadata || {}, null, 0)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
