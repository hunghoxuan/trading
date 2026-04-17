import { useEffect, useState } from "react";
import { api } from "../api";

const EMPTY_MSG = { type: "", text: "" };

function fmtNum(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(2);
}

export default function ExecutionV2Page() {
  const [rows, setRows] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedTradeId, setSelectedTradeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(EMPTY_MSG);
  const [filters, setFilters] = useState({
    q: "",
    account_id: "",
    source_id: "",
    dispatch_status: "",
    execution_status: "",
    origin_kind: "",
    symbol: "",
    side: "",
    page: 1,
    pageSize: 30,
  });
  const [meta, setMeta] = useState({ page: 1, pageSize: 30, total: 0, pages: 1 });

  async function loadTrades(nextFilters = filters) {
    setLoading(true);
    try {
      const out = await api.v2Trades(nextFilters);
      setRows(Array.isArray(out?.items) ? out.items : []);
      setMeta({
        page: Number(out?.page || nextFilters.page || 1),
        pageSize: Number(out?.pageSize || nextFilters.pageSize || 30),
        total: Number(out?.total || 0),
        pages: Number(out?.pages || 1),
      });
      setMsg(EMPTY_MSG);
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Failed to load v2 trades" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents(tradeId) {
    const tid = String(tradeId || "").trim();
    if (!tid) {
      setEvents([]);
      return;
    }
    try {
      const out = await api.v2TradeEvents(tid, 200);
      setEvents(Array.isArray(out?.items) ? out.items : []);
    } catch {
      setEvents([]);
    }
  }

  useEffect(() => {
    loadTrades(filters);
  }, []);

  useEffect(() => {
    if (selectedTradeId) loadEvents(selectedTradeId);
    else setEvents([]);
  }, [selectedTradeId]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function applyFilters() {
    const next = { ...filters, page: 1 };
    setFilters(next);
    await loadTrades(next);
  }

  async function gotoPage(page) {
    const p = Math.max(1, page);
    const next = { ...filters, page: p };
    setFilters(next);
    await loadTrades(next);
  }

  return (
    <div className="stack-layout fadeIn">
      <h2 className="page-title">Execution V2</h2>

      <section className="panel">
        <div className="panel-label">TRADE FILTERS</div>
        {msg?.text ? <div className={`form-message msg-${msg.type || "error"}`}>{msg.text}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          <input value={filters.q} onChange={(e) => updateFilter("q", e.target.value)} placeholder="Search trade/signal/ticket" />
          <input value={filters.account_id} onChange={(e) => updateFilter("account_id", e.target.value)} placeholder="account_id" />
          <input value={filters.source_id} onChange={(e) => updateFilter("source_id", e.target.value)} placeholder="source_id" />
          <input value={filters.symbol} onChange={(e) => updateFilter("symbol", e.target.value)} placeholder="symbol" />
          <select value={filters.dispatch_status} onChange={(e) => updateFilter("dispatch_status", e.target.value)}>
            <option value="">dispatch: all</option>
            <option value="NEW">NEW</option>
            <option value="LEASED">LEASED</option>
            <option value="CONSUMED">CONSUMED</option>
          </select>
          <select value={filters.execution_status} onChange={(e) => updateFilter("execution_status", e.target.value)}>
            <option value="">execution: all</option>
            <option value="PENDING">PENDING</option>
            <option value="OPEN">OPEN</option>
            <option value="CLOSED">CLOSED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <select value={filters.origin_kind} onChange={(e) => updateFilter("origin_kind", e.target.value)}>
            <option value="">origin: all</option>
            <option value="SIGNAL">SIGNAL</option>
            <option value="BROKER">BROKER</option>
          </select>
          <select value={filters.side} onChange={(e) => updateFilter("side", e.target.value)}>
            <option value="">side: all</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="primary-button" onClick={applyFilters} disabled={loading}>{loading ? "LOADING..." : "APPLY"}</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-label">V2 TRADES</div>
        <div className="minor-text" style={{ marginBottom: 8 }}>Total: {meta.total} | Page: {meta.page}/{meta.pages}</div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Trade ID</th>
                <th>Account</th>
                <th>Source</th>
                <th>Origin</th>
                <th>Symbol</th>
                <th>Side</th>
                <th>Dispatch</th>
                <th>Execution</th>
                <th>Broker Ticket</th>
                <th>PnL</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.trade_id} className={selectedTradeId === r.trade_id ? "active" : ""} onClick={() => setSelectedTradeId(String(r.trade_id || ""))} style={{ cursor: "pointer" }}>
                  <td>{r.trade_id}</td>
                  <td>{r.account_id || "-"}</td>
                  <td>{r.source_id || "-"}</td>
                  <td>{r.origin_kind || "-"}</td>
                  <td>{r.symbol || "-"}</td>
                  <td>{r.side || "-"}</td>
                  <td>{r.dispatch_status || "-"}</td>
                  <td>{r.execution_status || "-"}</td>
                  <td>{r.broker_trade_id || "-"}</td>
                  <td>{fmtNum(r.pnl_realized)}</td>
                  <td>{r.updated_at || "-"}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="muted">No v2 trades found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="secondary-button" onClick={() => gotoPage(meta.page - 1)} disabled={loading || meta.page <= 1}>PREV</button>
          <button className="secondary-button" onClick={() => gotoPage(meta.page + 1)} disabled={loading || meta.page >= meta.pages}>NEXT</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-label">TRADE EVENTS</div>
        <div className="minor-text" style={{ marginBottom: 8 }}>Selected trade: <strong>{selectedTradeId || "-"}</strong></div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={`${ev.event_id}_${ev.event_time}`}>
                  <td>{ev.event_time || "-"}</td>
                  <td>{ev.event_type || "-"}</td>
                  <td><code>{JSON.stringify(ev.payload_json || {})}</code></td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">No events.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
