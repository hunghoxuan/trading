import { useState, useCallback } from "react";

/**
 * SmartContent — auto-detects format and renders appropriately.
 * Modes: readonly | editable
 * In editable mode: toggle between view/edit, copy to clipboard.
 */
export function SmartContent({
  content,
  mode = "readonly",
  rows = 6,
  onChange,
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const raw = content ?? "";
  const isEmpty = !raw || (typeof raw === "string" && !raw.trim());

  // Auto-detect format
  const isJson =
    typeof raw === "object" ||
    (typeof raw === "string" && raw.trim().startsWith("{"));
  const isHtml = typeof raw === "string" && /<[a-z][\s\S]*>/i.test(raw);

  const displayText = useCallback(() => {
    if (isJson && typeof raw === "object") return JSON.stringify(raw, null, 2);
    if (isJson && typeof raw === "string") {
      try {
        return JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        return raw;
      }
    }
    return String(raw);
  }, [raw, isJson]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // Readonly mode
  if (mode === "readonly") {
    if (isEmpty) return <span className="minor-text">—</span>;
    if (isJson) {
      return (
        <pre
          style={{
            margin: 0,
            fontSize: 11,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 300,
            overflow: "auto",
            color: "var(--text)",
            opacity: 0.85,
          }}
        >
          {displayText()}
        </pre>
      );
    }
    if (isHtml) {
      return <div dangerouslySetInnerHTML={{ __html: raw }} />;
    }
    // Plain text: split by ". " or newline
    const lines = String(raw)
      .split(/\.\s+|\n/)
      .filter(Boolean);
    return (
      <div style={{ lineHeight: 1.6 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            {line.trim()}
            {i < lines.length - 1 ? "." : ""}
          </div>
        ))}
      </div>
    );
  }

  // Editable mode
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 4,
          alignItems: "center",
        }}
      >
        <button
          className="secondary-button"
          onClick={() => setEditing(!editing)}
          style={{ padding: "2px 6px", fontSize: 9 }}
          title={editing ? "View" : "Edit"}
        >
          {editing ? "👁" : "✏️"}
        </button>
        <button
          className="secondary-button"
          onClick={handleCopy}
          style={{ padding: "2px 6px", fontSize: 9 }}
          title="Copy"
        >
          {copied ? "✓" : "📋"}
        </button>
      </div>
      {editing ? (
        <textarea
          style={{
            width: "100%",
            minHeight: rows * 20,
            fontSize: 11,
            padding: 6,
            background: "rgba(255,255,255,0.05)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            resize: "vertical",
          }}
          value={typeof raw === "string" ? raw : JSON.stringify(raw, null, 2)}
          readOnly
        />
      ) : (
        <>
          {isEmpty ? (
            <span className="minor-text">—</span>
          ) : isJson ? (
            <pre
              style={{
                margin: 0,
                fontSize: 11,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 300,
                overflow: "auto",
                color: "var(--text)",
                opacity: 0.85,
              }}
            >
              {displayText()}
            </pre>
          ) : isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: raw }} />
          ) : (
            <div style={{ lineHeight: 1.6 }}>
              {String(raw)
                .split(/\.\s+|\n/)
                .filter(Boolean)
                .map((line, i, arr) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    {line.trim()}
                    {i < arr.length - 1 ? "." : ""}
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
