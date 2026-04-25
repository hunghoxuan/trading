import { useEffect, useState } from "react";
import { api } from "../api";

export default function StoragePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function loadStats() {
    try {
      setLoading(true);
      const data = await api.storageStats();
      setStats(data.stats);
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load storage stats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleCleanup(target) {
    const confirmMsg = target === 'reset_user_data' 
      ? "CRITICAL ACTION: This will delete ALL your signals and trades. Are you absolutely sure?" 
      : `Are you sure you want to delete all ${target}? This cannot be undone.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }
    try {
      setBusy(true);
      setMsg(`Cleaning up ${target}...`);
      const res = await api.storageCleanup(target);
      setMsg(`Cleanup complete: ${JSON.stringify(res)}`);
      await loadStats();
    } catch (e) {
      setError(e?.message || `Failed to clean up ${target}`);
      setMsg("");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 5000);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="stack-layout fadeIn">
      <h2 className="page-title">STORAGE & CLEANUP</h2>
      
      {error && <div className="error">{error}</div>}
      {msg && <div className="loading" style={{ padding: 10 }}>{msg}</div>}

      <div className="panel" style={{ maxWidth: '800px' }}>
        <div className="panel-label">YOUR STORAGE METRICS</div>
        <table className="events-table">
          <thead>
            <tr>
              <th>CLEANUP TARGET</th>
              <th>METRICS</th>
              <th style={{ width: '120px', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading && !stats ? (
              <tr><td colSpan="3" style={{ textAlign: "center", padding: "40px" }} className="muted">Loading stats...</td></tr>
            ) : stats ? (
              <>
                <tr>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>Cancelled & Error Trades/Signals</div>
                    <div className="minor-text">Signals and Trades with status CANCEL, ERROR, or CANCELLED</div>
                  </td>
                  <td>
                    <span className="badge OTHER">{stats.cancelled_error_count} items</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="danger-button" 
                      onClick={() => handleCleanup('cancelled_error')}
                      disabled={busy || stats.cancelled_error_count === 0}
                    >
                      DELETE ALL
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>Test Trades</div>
                    <div className="minor-text">Signals and Trades with symbol 'TEST'</div>
                  </td>
                  <td>
                    <span className="badge OTHER">{stats.test_trades_count} items</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="danger-button" 
                      onClick={() => handleCleanup('test_trades')}
                      disabled={busy || stats.test_trades_count === 0}
                    >
                      DELETE ALL
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>Chart Snapshots</div>
                    <div className="minor-text">Images generated for analysis</div>
                  </td>
                  <td>
                    <span className="badge OTHER">{stats.snapshots_count} files</span>
                    <span className="minor-text" style={{ marginLeft: 8 }}>({formatBytes(stats.snapshots_size_bytes)})</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="danger-button" 
                      onClick={() => handleCleanup('snapshots')}
                      disabled={busy || stats.snapshots_count === 0}
                    >
                      DELETE ALL
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style={{ fontWeight: 'bold', color: '#ef4444' }}>RESET ALL DATA</div>
                    <div className="minor-text">Delete ALL your trades and signals (irreversible)</div>
                  </td>
                  <td>
                    <span className="badge SL">DANGER ZONE</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="danger-button" 
                      onClick={() => handleCleanup('reset_user_data')}
                      disabled={busy}
                    >
                      RESET DATA
                    </button>
                  </td>
                </tr>
              </>
            ) : (
              <tr><td colSpan="3" style={{ textAlign: "center", padding: "40px" }} className="muted">No stats available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
