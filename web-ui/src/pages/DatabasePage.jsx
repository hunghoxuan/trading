import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";

function fDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString(undefined, {
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
  return { cls: "OTHER", label: s || "-" };
}

export default function DatabasePage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("signals");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [createMode, setCreateMode] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createRowJson, setCreateRowJson] = useState("{\n  \"action\": \"BUY\",\n  \"symbol\": \"XAUUSD\",\n  \"volume\": 0.01\n}");
  const inFlightRef = useRef(false);

  const [filter, setFilter] = useState({
    q: "",
    page: 1,
    pageSize: 50,
  });

  const query = useMemo(() => ({ table: selectedTable, ...filter }), [selectedTable, filter]);

  async function loadTables() {
    try {
      const data = await api.dbTables();
      setTables(data.tables || []);
    } catch (e) {
      console.error("Failed to load tables:", e);
    }
  }

  async function loadRows() {
    if (!selectedTable) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setLoading(true);
      const data = await api.dbRows(query);
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load database data");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  useEffect(() => { loadTables(); }, []);
  useEffect(() => { loadRows(); }, [query]);

  const handleSearchChange = (e) => {
    setFilter(prev => ({ ...prev, q: e.target.value, page: 1 }));
  };

  const handleTableChange = (e) => {
    setSelectedTable(e.target.value);
    setFilter(prev => ({ ...prev, page: 1 }));
    setSelectedRow(null);
    setCreateMode(false);
  };

  const handlePageChange = (p) => {
    setFilter(prev => ({ ...prev, page: p }));
  };

  async function onCreateRow() {
    try {
      setCreateBusy(true);
      const parsed = createRowJson ? JSON.parse(createRowJson) : {};
      await api.dbCreateRow({ table: selectedTable, row: parsed });
      setCreateMsg("Row created.");
      setCreateMode(false);
      await loadRows();
    } catch (e) {
      setError(e?.message || "Failed to create row");
    } finally {
      setCreateBusy(false);
      window.setTimeout(() => setCreateMsg(""), 2200);
    }
  }

  const tableHeaders = useMemo(() => {
    if (!rows.length) return [];
    // Prioritize institutional fields
    const priority = ['signal_id', 'trade_id', 'created_at', 'symbol', 'side', 'status', 'object_id', 'object_table', 'user_id', 'account_id'];
    const blacklist = ['raw_json', 'metadata', 'extra_meta', 'details', 'log_payload', 'payload', 'password_hash', 'pwd_hash', 'password', 'token', 'api_key', 'admin_key'];
    
    const keys = Object.keys(rows[0]).filter(k => {
      const low = k.toLowerCase();
      return !blacklist.some(b => low.includes(b));
    });
    
    return [...new Set([...priority.filter(p => keys.includes(p)), ...keys])].slice(0, 10);
  }, [rows]);

  return (
    <div className="stack-layout fadeIn">
      <h2 className="page-title">DB</h2>
      <div className="toolbar-panel">
        <div className="toolbar-group toolbar-pagination">
          {pages > 1 && (
            <div className="pager-mini">
              <button className="secondary-button" disabled={filter.page <= 1} onClick={() => handlePageChange(filter.page - 1)}>PREV</button>
              <span className="minor-text">PAGE {filter.page} / {pages}</span>
              <button className="secondary-button" disabled={filter.page >= pages} onClick={() => handlePageChange(filter.page + 1)}>NEXT</button>
            </div>
          )}
          <div className="minor-text" style={{ marginLeft: "10px" }}>TOTAL: {total}</div>

          <select
            value={filter.pageSize}
            onChange={e => setFilter(f => ({ ...f, pageSize: Number(e.target.value), page: 1 }))}
          >
            {[20, 50, 100, 200, 500].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>

        <div className="toolbar-group toolbar-search-filter">
          <select value={selectedTable} onChange={handleTableChange} style={{ minWidth: '140px' }}>
            {tables.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>

          <input 
            type="text" 
            placeholder="SEARCH RECORDS..." 
            value={filter.q} 
            onChange={handleSearchChange} 
            style={{ width: "180px" }}
          />
        </div>

        <div className="toolbar-group toolbar-bulk-action">
          <select disabled={loading}>
            <option value="">BULK ACTION...</option>
            <option value="export">DOWNLOAD CSV</option>
            <option value="delete">DELETE ALL</option>
          </select>
          <button type="button" className="primary-button" onClick={() => alert("Action triggered")} disabled={loading}>APPLY</button>
        </div>

      </div>

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          {error && <div className="error">{error}</div>}
          {createMsg ? <div className="loading" style={{ padding: 10 }}>{createMsg}</div> : null}
          <div className="events-table-wrap">
            <table className="events-table">
              <thead>
                <tr>
                  {tableHeaders.map(h => <th key={h}>{h.replace(/_/g, " ").toUpperCase()}</th>)}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={tableHeaders.length} style={{ textAlign: "center", padding: "40px" }} className="muted">Loading institutional records...</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={tableHeaders.length} style={{ textAlign: "center", padding: "40px" }} className="muted">No records found</td></tr>}
                {!loading && rows.map((row, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => { setCreateMode(false); setSelectedRow(row); }} 
                    className={selectedRow === row ? "active" : ""}
                  >
                    {tableHeaders.map(h => {
                      const val = row[h];
                      const isDate = h.includes("_at") || h === "tick_time" || h === "event_time";
                      const isStatus = h === "status" || h === "ack_status";
                      
                      if (isStatus) {
                        const ui = statusUi(val);
                        return <td key={h}><span className={`badge ${ui.cls}`}>{ui.label}</span></td>;
                      }
                      
                      return (
                        <td key={h}>
                          <div className="cell-wrap">
                             <div className="minor-text">{isDate ? fDateTime(val) : String(val ?? "-").slice(0, 50)}</div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
                  setSelectedRow(null);
                }
              }}
            >
              {createMode ? "CANCEL" : "CREATE ROW"}
            </button>
          </div>
        </div>

        <div className="logs-detail-pane">
          {createMode ? (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-label">DB ROW FORM ({selectedTable})</div>
              <div className="stack-layout" style={{ gap: 10 }}>
                <div className="minor-text">
                  Supported tables: <code>users</code>, <code>accounts</code>, <code>signals</code>, <code>trades</code>, <code>logs</code>.
                </div>
                <label>
                  <div className="muted small">Row JSON</div>
                  <textarea
                    value={createRowJson}
                    onChange={(e) => setCreateRowJson(e.target.value)}
                    rows={14}
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="primary-button" onClick={onCreateRow} disabled={createBusy}>{createBusy ? "💾 SAVING..." : "💾 SAVE ROW"}</button>
                  <button type="button" className="secondary-button" onClick={() => setCreateMode(false)} disabled={createBusy}>✖ CANCEL</button>
                </div>
              </div>
            </div>
          ) : selectedRow ? (
            <div className="trade-detail-content scrollable fadeIn">
              <div className="detail-header" style={{ marginBottom: '15px' }}>
                 <h2 style={{ margin: 0 }}>ROW DETAILS</h2>
              </div>
              <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {Object.entries(selectedRow)
                  .filter(([k]) => {
                    const low = k.toLowerCase();
                    const sensitive = ['password', 'hash', 'token', 'key'];
                    return !sensitive.some(s => low.includes(s));
                  })
                  .map(([k, v]) => (
                  <div key={k} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <div className="minor-text" style={{ textTransform: 'uppercase', marginBottom: '2px', color: 'var(--text-secondary)' }}>{k.replace(/_/g, " ")}</div>
                    <div className="minor-text" style={{ color: 'var(--text)', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                      {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? "-")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
             <div className="empty-state minor-text">SELECT A RECORD TO INSPECT TELEMETRY</div>
          )}
        </div>
      </div>
    </div>
  );
}
