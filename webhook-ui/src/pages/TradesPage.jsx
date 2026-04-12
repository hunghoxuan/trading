import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import TradeCard from "../components/TradeCard";

const RANGE_OPTIONS = ["", "today", "week", "month"];

export default function TradesPage() {
  const [symbols, setSymbols] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [filter, setFilter] = useState({
    q: "",
    symbol: "",
    status: "",
    range: "month",
    from: "",
    to: "",
    page: 1,
    pageSize: 20,
  });

  const query = useMemo(() => ({ ...filter }), [filter]);

  async function loadSymbols() {
    try {
      const data = await api.symbols();
      setSymbols(data.symbols || []);
    } catch {
      // keep page usable even if symbol endpoint fails
    }
  }

  async function loadTrades() {
    try {
      setLoading(true);
      setError("");
      const data = await api.trades(query);
      setRows(data.trades || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSymbols();
  }, []);

  useEffect(() => {
    loadTrades();
  }, [query]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const t = setInterval(loadTrades, 5000);
    return () => clearInterval(t);
  }, [autoRefresh, query]);

  return (
    <section className="split-layout">
      <aside className="panel filters">
        <h2>Filters</h2>
        <label>Search</label>
        <input value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value, page: 1 }))} placeholder="signal id, note..." />

        <label>Symbol</label>
        <select value={filter.symbol} onChange={(e) => setFilter((f) => ({ ...f, symbol: e.target.value, page: 1 }))}>
          <option value="">All</option>
          {symbols.map((s) => <option key={s}>{s}</option>)}
        </select>

        <label>Status</label>
        <input value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value.toUpperCase(), page: 1 }))} placeholder="NEW,DONE,CLOSED_TP" />

        <label>Range</label>
        <select value={filter.range} onChange={(e) => setFilter((f) => ({ ...f, range: e.target.value, page: 1 }))}>
          {RANGE_OPTIONS.map((r) => <option key={r} value={r}>{r || "custom"}</option>)}
        </select>

        <label>From</label>
        <input type="date" value={filter.from} onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value, page: 1 }))} />

        <label>To</label>
        <input type="date" value={filter.to} onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value, page: 1 }))} />

        <label>Page Size</label>
        <input type="number" min={5} max={200} value={filter.pageSize} onChange={(e) => setFilter((f) => ({ ...f, pageSize: Number(e.target.value) || 20, page: 1 }))} />

        <label className="row-check">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Auto refresh (5s)
        </label>
      </aside>

      <section className="panel">
        <div className="panel-head">
          <h2>Trades</h2>
          <div className="muted">{total} results</div>
        </div>

        {error ? <div className="error">{error}</div> : null}
        {loading ? <div className="loading">Loading trades...</div> : null}

        <div className="trade-list">
          {rows.map((t) => <TradeCard key={t.signal_id} trade={t} />)}
        </div>

        <div className="pager">
          <button disabled={filter.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))}>Prev</button>
          <span>Page {filter.page} / {pages}</span>
          <button disabled={filter.page >= pages} onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))}>Next</button>
        </div>
      </section>
    </section>
  );
}
