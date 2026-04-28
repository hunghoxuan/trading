import { useEffect, useState } from "react";
import { api } from "../../api";

import { showDateTime } from "../../utils/format";

function formatCompactDateTime(dateLike) {
  return showDateTime(dateLike);
}

export default function SnapshotsPage() {
  const [items, setItems] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const loadSnapshots = async () => {
    setLoading(true);
    setStatus({ type: "", text: "" });
    try {
      const out = await api.chartSnapshots(120);
      setItems(Array.isArray(out?.items) ? out.items : []);
      setSelectedFiles(new Set());
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Failed to load snapshots.") });
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (fileName) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) next.delete(fileName);
      else next.add(fileName);
      return next;
    });
  };

  const deleteSnapshots = async (payload) => {
    setDeleting(true);
    setStatus({ type: "", text: "" });
    try {
      const out = await api.chartSnapshotsDelete(payload || {});
      await loadSnapshots();
      setStatus({ type: "success", text: `Deleted ${Number(out?.deleted_count || 0)} screenshot(s).` });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Delete failed.") });
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = async () => {
    const files = [...selectedFiles];
    if (!files.length) {
      setStatus({ type: "warning", text: "No screenshot selected." });
      return;
    }
    await deleteSnapshots({ files });
  };

  const deleteAll = async () => {
    await deleteSnapshots({ all: true });
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  return (
    <section className="snapshot-builder-v2">
      <section className="panel">
        <div className="snapshot-gallery-head-v2">
          <span className="panel-label" style={{ margin: 0 }}>Snapshots ({items.length})</span>
          <div className="snapshot-bulk-actions-v2">
            <button className="secondary-button" type="button" onClick={loadSnapshots} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
            <button className="danger-button" type="button" onClick={deleteSelected} disabled={deleting}>{deleting ? "Deleting..." : "Delete Selected"}</button>
            <button className="danger-button" type="button" onClick={deleteAll} disabled={deleting}>{deleting ? "Deleting..." : "Delete All"}</button>
          </div>
        </div>

        {status.text ? (
          <div className={`form-message ${status.type === "error" ? "msg-error" : status.type === "warning" ? "msg-warning" : "msg-success"}`}>
            {status.text}
          </div>
        ) : null}

        {items.length === 0 ? (
          <div className="minor-text">No snapshots yet.</div>
        ) : (
          <div className="snapshot-gallery-v2">
            {items.map((it) => (
              <article key={it.id} className="snapshot-card-v2">
                <label className="snapshot-select-v2">
                  <input type="checkbox" checked={selectedFiles.has(it.file_name)} onChange={() => toggleFile(it.file_name)} />
                </label>
                <a href={it.url} target="_blank" rel="noreferrer">
                  <img src={it.url} alt={it.file_name} />
                </a>
                <div className="snapshot-meta-v2">
                  <div className="snapshot-file-v2">{it.file_name}</div>
                  <div className="snapshot-time-v2">{formatCompactDateTime(it.created_at)}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
