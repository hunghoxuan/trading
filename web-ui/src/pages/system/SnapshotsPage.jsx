import { useEffect, useState } from "react";
import { api } from "../../api";

import { showDateTime } from "../../utils/format";

function formatCompactDateTime(dateLike) {
  return showDateTime(dateLike);
}

export default function SnapshotsPage() {
  const [source, setSource] = useState("vps");
  const [items, setItems] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const loadSnapshots = async (nextSource = source) => {
    setLoading(true);
    setStatus({ type: "", text: "" });
    try {
      if (nextSource === "claude") {
        const out = await api.claudeFiles({ limit: 120 });
        const localMap = out?.local_map && typeof out.local_map === "object" ? out.local_map : {};
        const byClaudeId = new Map(
          Object.entries(localMap)
            .map(([localFile, meta]) => [String(meta?.file_id || ""), { localFile, meta }])
            .filter(([fileId]) => fileId),
        );
        const rows = Array.isArray(out?.data) ? out.data : [];
        setItems(rows.map((it) => {
          const fileId = String(it?.id || "");
          const linked = byClaudeId.get(fileId) || null;
          const linkedLocalFile = linked?.localFile || "";
          return {
            id: fileId,
            file_name: String(it?.filename || fileId),
            claude_file_id: fileId,
            local_file: linkedLocalFile,
            created_at: it?.created_at || linked?.meta?.uploaded_at || "",
            size_bytes: Number(it?.size_bytes || linked?.meta?.size_bytes || 0),
            mime_type: String(it?.mime_type || linked?.meta?.mime_type || ""),
            url: linkedLocalFile ? `/v2/chart/snapshots/${encodeURIComponent(linkedLocalFile)}` : "",
          };
        }));
      } else {
        const out = await api.chartSnapshots(120);
        setItems(Array.isArray(out?.items) ? out.items : []);
      }
      setSelectedFiles(new Set());
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Failed to load snapshots.") });
    } finally {
      setLoading(false);
    }
  };

  const chooseSource = (nextSource) => {
    setSource(nextSource);
    loadSnapshots(nextSource);
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
      const out = source === "claude"
        ? await api.claudeDeleteFiles(payload || {})
        : await api.chartSnapshotsDelete(payload || {});
      await loadSnapshots();
      setStatus({ type: "success", text: `Deleted ${Number(out?.deleted_count || 0)} ${source === "claude" ? "Claude file" : "screenshot"}(s).` });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Delete failed.") });
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = async () => {
    const files = [...selectedFiles];
    if (!files.length) {
      setStatus({ type: "warning", text: `No ${source === "claude" ? "Claude file" : "screenshot"} selected.` });
      return;
    }
    await deleteSnapshots(source === "claude" ? { file_ids: files } : { files });
  };

  const deleteAll = async () => {
    if (source === "claude") {
      const fileIds = items.map((it) => String(it.claude_file_id || it.id || "")).filter(Boolean);
      if (!fileIds.length) {
        setStatus({ type: "warning", text: "No Claude files to delete." });
        return;
      }
      await deleteSnapshots({ file_ids: fileIds });
      return;
    }
    await deleteSnapshots({ all: true });
  };

  const uploadSelectedToClaude = async () => {
    const files = [...selectedFiles];
    if (!files.length) {
      setStatus({ type: "warning", text: "No VPS screenshot selected." });
      return;
    }
    setUploading(true);
    setStatus({ type: "", text: "" });
    try {
      const out = await api.claudeUploadSnapshots({ files });
      setStatus({
        type: out?.failed_count ? "warning" : "success",
        text: `Uploaded ${Number(out?.uploaded_count || 0)} screenshot(s) to Claude${out?.failed_count ? `, ${Number(out.failed_count)} failed.` : "."}`,
      });
    } catch (e) {
      setStatus({ type: "error", text: String(e?.message || e || "Claude upload failed.") });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    loadSnapshots(source);
  }, []);

  return (
    <section className="snapshot-builder-v2">
      <section className="panel">
        <div className="snapshot-gallery-head-v2">
          <div>
            <span className="panel-label" style={{ margin: 0 }}>Snapshots ({items.length})</span>
            <div className="minor-text">{source === "claude" ? "Claude Files API" : "VPS file server"}</div>
          </div>
          <div className="snapshot-bulk-actions-v2">
            <div className="nav-dropdown">
              <button className="secondary-button nav-dropdown-trigger" type="button">
                Source: {source === "claude" ? "Claude" : "VPS"}
              </button>
              <div className="nav-dropdown-menu">
                <button type="button" className={source === "vps" ? "active" : ""} onClick={() => chooseSource("vps")}>VPS</button>
                <button type="button" className={source === "claude" ? "active" : ""} onClick={() => chooseSource("claude")}>Claude</button>
              </div>
            </div>
            <button className="secondary-button" type="button" onClick={() => loadSnapshots()} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
            {source === "vps" ? (
              <button className="secondary-button" type="button" onClick={uploadSelectedToClaude} disabled={uploading || deleting}>{uploading ? "Uploading..." : "Upload to Claude"}</button>
            ) : null}
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
          <div className="minor-text">No {source === "claude" ? "Claude files" : "snapshots"} yet.</div>
        ) : (
          <div className="snapshot-gallery-v2">
            {items.map((it) => (
              <article key={it.id} className="snapshot-card-v2">
                <label className="snapshot-select-v2">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(source === "claude" ? it.claude_file_id : it.file_name)}
                    onChange={() => toggleFile(source === "claude" ? it.claude_file_id : it.file_name)}
                  />
                </label>
                {it.url ? (
                  <a href={it.url} target="_blank" rel="noreferrer">
                    <img src={it.url} alt={it.file_name} />
                  </a>
                ) : (
                  <div className="snapshot-card-file-v2">
                    <strong>{String(it.mime_type || "file").toUpperCase()}</strong>
                    <span>{source === "claude" ? "Claude file" : "Snapshot"}</span>
                  </div>
                )}
                <div className="snapshot-meta-v2">
                  <div className="snapshot-file-v2">{it.file_name}</div>
                  {source === "claude" ? <div className="snapshot-time-v2">{it.claude_file_id}</div> : null}
                  {it.local_file ? <div className="snapshot-time-v2">VPS: {it.local_file}</div> : null}
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
