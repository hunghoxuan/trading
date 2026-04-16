import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

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
    // Prioritize institutional fields, then everything else
    const priority = ['signal_id', 'created_at', 'symbol', 'action', 'status', 'event_type', 'type', 'user_id', 'account_id'];
    const keys = Object.keys(rows[0]);
    return [...new Set([...priority.filter(p => keys.includes(p)), ...keys])].slice(0, 8);
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
            placeholder="Search rows..." 
            value={filter.q} 
            onChange={handleSearchChange} 
            className="dashboard-filter-input"
            style={{ width: "240px" }}
          />
        </div>

        <div className="toolbar-right">
          <button className="kpi-card" style={{ padding: "8px 16px", cursor: "pointer", border: "1px solid var(--border-color)" }} onClick={() => loadRows()}>
            REFRESH
          </button>
        </div>
      </div>

      <div className="stack-layout" style={{ marginTop: "18px" }}>
        {error && <div className="error-banner">{error}</div>}

        <div className="trades-layout">
          <div className="trades-main">
            <div className="panel">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      {tableHeaders.map(h => <th key={h}>{h.replace(/_/g, " ").toUpperCase()}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={tableHeaders.length} style={{ textAlign: "center", padding: "40px" }} className="muted">Loading institutional data...</td></tr>}
                    {!loading && rows.length === 0 && <tr><td colSpan={tableHeaders.length} style={{ textAlign: "center", padding: "40px" }} className="muted">No records found for table {selectedTable}</td></tr>}
                    {!loading && rows.map((row, idx) => (
                      <tr key={idx} onClick={() => setSelectedRow(row)} className={selectedRow === row ? "selected" : ""}>
                        {tableHeaders.map(h => (
                          <td key={h}>
                            <div className="cell-major">{String(row[h] ?? "-").slice(0, 50)}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pager-area">
                <div className="pager-info">
                  Showing <strong>{rows.length}</strong> of <strong>{total}</strong> records
                </div>
                <div className="pager-controls">
                  <button disabled={filter.page <= 1} onClick={() => handlePageChange(filter.page - 1)}>Prev</button>
                  <span className="pager-current">Page {filter.page} of {pages}</span>
                  <button disabled={filter.page >= pages} onClick={() => handlePageChange(filter.page + 1)}>Next</button>
                </div>
              </div>
            </div>
          </div>

          <div className={`trades-detail panel ${selectedRow ? "open" : ""}`}>
            <div className="detail-header">
              <div className="kpi-label">ROW DETAILS</div>
              <button className="icon-button" onClick={() => setSelectedRow(null)}>×</button>
            </div>
            {selectedRow ? (
              <div className="detail-content scrollable">
                {Object.entries(selectedRow).map(([k, v]) => (
                  <div key={k} className="detail-item">
                    <div className="detail-label">{k.replace(/_/g, " ").toUpperCase()}</div>
                    <div className="detail-value" style={{ wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
                      {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? "-")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="detail-empty muted">Select a row to view full institutional telemetry</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
