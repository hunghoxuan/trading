import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import TradeCard from "../components/TradeCard";

const STATUS_OPTIONS = ["", "NEW", "LOCKED", "PLACED", "OK", "START", "FAIL", "TP", "SL", "CANCEL", "EXPIRED"];
const BULK_ACTIONS = ["", "Download CSV", "Renew All", "Cancel All", "Delete All"];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];
const RANGE_OPTIONS = ["", "today", "week", "month"];

export default function TradesPage() {
  const [symbols, setSymbols] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);

  const [filter, setFilter] = useState({
    q: "",
    symbol: "",
    status: "",
    range: "",
    page: 1,
    pageSize: 20,
  });

  const query = useMemo(() => ({ ...filter }), [filter]);

  async function loadSymbols() {
    try {
      const data = await api.symbols();
      setSymbols((prev) => {
        const merged = new Set([
          ...(Array.isArray(prev) ? prev : []),
          ...((data.symbols || []).map((s) => String(s || "").toUpperCase())),
        ]);
        return [...merged].filter(Boolean).sort();
      });
    } catch {
      // keep page usable even if symbol endpoint fails
    }
  }

  async function loadTrades() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setLoading(true);
      const data = await api.trades(query);
      const loadedRows = data.trades || [];
      setRows(loadedRows);
      setSelectedIds((prev) => {
        const visible = new Set(loadedRows.map((t) => String(t.signal_id || "")).filter(Boolean));
        const next = new Set();
        for (const id of prev) {
          if (visible.has(id)) next.add(id);
        }
        return next;
      });
      // Keep symbol filter options in sync with live data without requiring full page refresh.
      setSymbols((prev) => {
        const merged = new Set([...(Array.isArray(prev) ? prev : [])]);
        for (const t of (data.trades || [])) {
          const sym = String(t?.symbol || "").toUpperCase();
          if (sym) merged.add(sym);
        }
        return [...merged].sort();
      });
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

  function filteredParams() {
    return {
      q: filter.q || "",
      symbol: filter.symbol || "",
      status: filter.status || "",
      range: filter.range || "",
    };
  }

  function selectedParams() {
    const ids = [...selectedIds].filter(Boolean);
    if (!ids.length) return filteredParams();
    return { signal_ids: ids };
  }

  function selectedScopeText() {
    const selectedCount = selectedIds.size;
    if (selectedCount > 0) return `Selected cards: ${selectedCount}`;
    const scopeSymbol = filter.symbol || "ALL";
    const scopeStatus = filter.status || "ALL";
    const scopeQ = filter.q || "-";
    const estimate = total || 0;
    return `Current filter\nSymbol: ${scopeSymbol}\nStatus: ${scopeStatus}\nSearch: ${scopeQ}\nMatched: ${estimate}`;
  }

  async function onDownloadCsv() {
    try {
      setBulkBusy(true);
      const { blob, filename } = await api.downloadBacktestCsv(selectedParams());
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename || "mt5-backtest.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to download CSV");
    } finally {
      setBulkBusy(false);
    }
  }

  async function onDeleteAll() {
    const ok = window.confirm(
      `Delete trades?\n\n${selectedScopeText()}`,
    );
    if (!ok) return;

    try {
      setBulkBusy(true);
      const res = await api.deleteTrades(selectedParams());
      await loadTrades();
      await loadSymbols();
      setSelectedIds(new Set());
      setError("");
      window.alert(`Deleted ${res.deleted || 0} trade(s).`);
    } catch (e) {
      setError(e?.message || "Failed to delete trades");
    } finally {
      setBulkBusy(false);
    }
  }

  async function onCancelAll() {
    const ok = window.confirm(
      `Cancel trades?\n\n${selectedScopeText()}\n\nOnly NEW/LOCKED/START/OK trades will be changed to CANCEL.`,
    );
    if (!ok) return;
    try {
      setBulkBusy(true);
      const res = await api.cancelTrades(selectedParams());
      await loadTrades();
      await loadSymbols();
      setSelectedIds(new Set());
      setError("");
      window.alert(`Cancelled ${res.updated || 0} trade(s) to CANCEL.`);
    } catch (e) {
      setError(e?.message || "Failed to cancel trades");
    } finally {
      setBulkBusy(false);
    }
  }

  async function onRenewAll() {
    const ok = window.confirm(
      `Renew trades?\n\n${selectedScopeText()}\n\nStatus will be set back to NEW.`,
    );
    if (!ok) return;
    try {
      setBulkBusy(true);
      const res = await api.renewTrades(selectedParams());
      await loadTrades();
      await loadSymbols();
      setSelectedIds(new Set());
      setError("");
      window.alert(`Renewed ${res.updated || 0} trade(s) to NEW.`);
    } catch (e) {
      setError(e?.message || "Failed to renew trades");
    } finally {
      setBulkBusy(false);
    }
  }

  async function onBulkOk() {
    if (!bulkAction || bulkBusy) return;
    if (bulkAction === "Download CSV") {
      await onDownloadCsv();
    } else if (bulkAction === "Renew All") {
      await onRenewAll();
    } else if (bulkAction === "Cancel All") {
      await onCancelAll();
    } else if (bulkAction === "Delete All") {
      await onDeleteAll();
    }
  }

  useEffect(() => {
    loadSymbols();
  }, []);

  useEffect(() => {
    loadTrades();
  }, [query]);

  useEffect(() => {
    const t = setInterval(() => {
      loadTrades();
      loadSymbols();
    }, 30000);
    return () => clearInterval(t);
  }, [query]);

  return (
    <section className="stack-layout">
      <section className="trades-toolbar">
        <div className="filters-top compact single-line">
          <input value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value, page: 1 }))} placeholder="Search signal id, note..." />
          <select value={filter.symbol} onChange={(e) => setFilter((f) => ({ ...f, symbol: e.target.value, page: 1 }))}>
            <option value="">All symbols</option>
            {symbols.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value, page: 1 }))}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
          </select>
          <select value={filter.range} onChange={(e) => setFilter((f) => ({ ...f, range: e.target.value, page: 1 }))}>
            {RANGE_OPTIONS.map((r) => <option key={r} value={r}>{r ? (r === "week" ? "This week" : r === "month" ? "This month" : "Today") : "All time"}</option>)}
          </select>
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} disabled={bulkBusy}>
            {BULK_ACTIONS.map((s) => <option key={s} value={s}>{s || "Bulk Action..."}</option>)}
          </select>
          <button type="button" onClick={onBulkOk} disabled={bulkBusy || !bulkAction}>
            {bulkBusy ? "..." : "OK"}
          </button>
        </div>
      </section>

      <section>
        <div className="panel-head">
          <div className="muted small">
            {total} results{selectedIds.size ? ` • ${selectedIds.size} selected` : ""}
          </div>
          <div className="row-check">
            <label>
              <input
                type="checkbox"
                checked={rows.length > 0 && rows.every((t) => selectedIds.has(String(t.signal_id || "")))}
                onChange={(e) => {
                  const checked = Boolean(e.target.checked);
                  setSelectedIds(() => {
                    if (!checked) return new Set();
                    return new Set(rows.map((t) => String(t.signal_id || "")).filter(Boolean));
                  });
                }}
              />
              <span className="muted small">Select page</span>
            </label>
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}
        {loading ? <div className="loading">Loading trades...</div> : null}

        <div className="trade-list">
          {rows.map((t) => {
            const id = String(t.signal_id || "");
            return (
              <TradeCard
                key={t.signal_id}
                trade={t}
                selected={selectedIds.has(id)}
                onToggleSelect={(checked) => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (checked) next.add(id);
                    else next.delete(id);
                    return next;
                  });
                }}
              />
            );
          })}
        </div>

        <div className="pager">
          <select
            className="pager-size"
            value={filter.pageSize}
            onChange={(e) => setFilter((f) => ({ ...f, pageSize: Number(e.target.value) || 20, page: 1 }))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}/page</option>)}
          </select>
          <button className="pager-btn" disabled={filter.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: 1 }))} title="First">«</button>
          <button className="pager-btn" disabled={filter.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))} title="Previous">‹</button>
          <span>Page {filter.page} / {pages}</span>
          <button className="pager-btn" disabled={filter.page >= pages} onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))} title="Next">›</button>
          <button className="pager-btn" disabled={filter.page >= pages} onClick={() => setFilter((f) => ({ ...f, page: pages }))} title="Last">»</button>
        </div>
      </section>
    </section>
  );
}
