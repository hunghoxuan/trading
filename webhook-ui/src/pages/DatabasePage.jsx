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
  };

  const handlePageChange = (p) => {
    setFilter(prev => ({ ...prev, page: p }));
  };

  const tableHeaders = useMemo(() => {
    if (!rows.length) return [];
    // Prioritize institutional fields
    const priority = ['signal_id', 'created_at', 'symbol', 'action', 'status', 'event_type', 'type', 'tick_time', 'user_id', 'account_id'];
    const blacklist = ['raw_json', 'metadata', 'extra_meta', 'details', 'log_payload', 'payload'];
    
    const keys = Object.keys(rows[0]).filter(k => !blacklist.includes(k.toLowerCase()));
    
    return [...new Set([...priority.filter(p => keys.includes(p)), ...keys])].slice(0, 10);
  }, [rows]);

  return (
    <div className="page-container fadeIn">
      <div className="toolbar-panel">
        <div className="toolbar-left">
          <div className="kpi-label">DATABASE EXPLORER</div>
          <div className="toolbar-separator" />
          
          <select value={selectedTable} onChange={handleTableChange} className="dashboard-filter-select">
            {tables.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>

          <input 
            type="text" 
            placeholder="SEARCH ROWS..." 
            value={filter.q} 
            onChange={handleSearchChange} 
            className="dashboard-filter-input"
            style={{ width: "240px" }}
          />
        </div>

        <div className="toolbar-right">
          <button type="button" onClick={() => loadRows()} disabled={loading}>REFRESH</button>
          <div className="toolbar-separator" />
          <button type="button" onClick={() => alert("CSV Export coming soon")}>DOWNLOAD CSV</button>
          <button type="button" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => alert("Delete placeholder")}>DELETE ALL</button>
        </div>
      </div>

      <div className="logs-layout-split">
        <div className="logs-list-pane">
          {error && <div className="error">{error}</div>}
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
                    onClick={() => setSelectedRow(row)} 
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

          <div className="pager-area" style={{ marginTop: '10px' }}>
             <div className="pager-info minor-text">
                Showing {rows.length} of {total}
             </div>
             <div className="pager-controls">
                <button disabled={filter.page <= 1} onClick={() => handlePageChange(filter.page - 1)}>Prev</button>
                <span className="minor-text">Page {filter.page} of {pages}</span>
                <button disabled={filter.page >= pages} onClick={() => handlePageChange(filter.page + 1)}>Next</button>
             </div>
          </div>
        </div>

        <div className="logs-detail-pane">
          {selectedRow ? (
            <div className="trade-detail-content scrollable fadeIn">
              <div className="detail-header" style={{ marginBottom: '15px' }}>
                 <h2 style={{ margin: 0 }}>ROW DETAILS</h2>
              </div>
              <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {Object.entries(selectedRow).map(([k, v]) => (
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
