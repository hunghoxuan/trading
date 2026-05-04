import { useMemo } from "react";

function parseNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatNum3(v) {
  if (!Number.isFinite(v)) return "";
  return String(Number(v.toFixed(3)));
}

function calcSliderMeta(rawValue) {
  const n = parseNum(rawValue);
  if (!Number.isFinite(n)) {
    return { min: 0, max: 1, step: 0.001, value: 0, enabled: false };
  }
  const magnitude = Math.max(Math.abs(n), 1);
  const span = magnitude * 0.25;
  const min = n - span;
  const max = n + span;
  const step = Math.max(0.001, magnitude * 0.0005);
  return { min, max, step, value: n, enabled: true };
}

export function TradePlanEditor({
  signalId = null,
  tradeId = null,
  value = {},
  onChange,
  onSave,
  onAddSignal,
  onAddTrade,
  onReset,
  showSaveButton,
  showAddSignalButton,
  showAddTradeButton,
  showResetButton = true,
  saveLabel,
  addSignalLabel = "+ Signal",
  addTradeLabel = "+ Trade",
  busy = {},
  disabled = false,
  error = "",
  className = "",
}) {
  const effectiveShowSave =
    typeof showSaveButton === "boolean"
      ? showSaveButton
      : Boolean(signalId || tradeId);
  const effectiveShowAddSignal =
    typeof showAddSignalButton === "boolean"
      ? showAddSignalButton
      : !signalId && !tradeId;
  const effectiveShowAddTrade =
    typeof showAddTradeButton === "boolean"
      ? showAddTradeButton
      : Boolean(signalId || (!signalId && !tradeId));
  const resolvedSaveLabel =
    saveLabel || (tradeId ? "Save Trade" : "Save Signal");

  const controlsDisabled =
    disabled || Boolean(busy?.save || busy?.signal || busy?.trade);
  const rrReadOnly = false;
  const directionOptions = useMemo(() => ["BUY", "SELL"], []);

  const update = (key, val) => {
    if (typeof onChange === "function") onChange(key, val);
  };

  return (
    <div
      className={`trade-plan-editor-v5 ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: "12px",
        marginTop: "10px",
        paddingTop: "8px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {/* Left Column: Inputs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "8px 12px",
        }}
      >
        <div
          className="snapshot-field-mini"
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <label
            className="minor-text"
            style={{
              fontWeight: "700",
              fontSize: "9px",
              textTransform: "uppercase",
              color: "var(--muted-bright)",
              opacity: 0.8,
            }}
          >
            Order Type
          </label>
          <div style={{ display: "flex", gap: "4px" }}>
            <select
              style={{
                flex: 1,
                height: "24px",
                fontSize: "11px",
                padding: "0 2px",
                background: "rgba(255,255,255,0.05)",
              }}
              value={value.direction || "BUY"}
              onChange={(e) =>
                update("direction", String(e.target.value || ""))
              }
              disabled={controlsDisabled}
            >
              {directionOptions.map((x) => (
                <option key={x} value={x}>
                  {x === "BUY" ? "Buy" : "Sell"}
                </option>
              ))}
            </select>
            <select
              style={{
                flex: 1,
                height: "24px",
                fontSize: "11px",
                padding: "0 2px",
                background: "rgba(255,255,255,0.05)",
              }}
              value={value.trade_type || "limit"}
              onChange={(e) =>
                update("trade_type", String(e.target.value || "limit"))
              }
              disabled={controlsDisabled}
            >
              <option value="limit">limit</option>
              <option value="market">market</option>
              <option value="stop">stop</option>
            </select>
          </div>
        </div>

        <div
          className="snapshot-field-mini"
          style={{ display: "flex", flexDirection: "column", gap: "2px" }}
        >
          <label
            className="minor-text"
            style={{
              fontWeight: "700",
              fontSize: "9px",
              textTransform: "uppercase",
              color: "var(--muted-bright)",
              opacity: 0.8,
            }}
          >
            Entry
          </label>
          <input
            style={{
              height: "24px",
              fontSize: "11px",
              padding: "0 6px",
              width: "100%",
            }}
            type="number"
            step="0.001"
            inputMode="decimal"
            value={value.entry || ""}
            onChange={(e) => update("entry", e.target.value)}
            disabled={controlsDisabled}
          />
          {(() => {
            const m = calcSliderMeta(value.entry);
            return (
              <input
                className="snapshot-number-slider-v4" style={{ accentColor: "var(--muted)" }}
                type="range"
                min={m.min}
                max={m.max}
                step={m.step}
                value={m.value}
                style={{ height: "10px", margin: "2px 0 0 0" }}
                disabled={!m.enabled || controlsDisabled}
                onChange={(e) =>
                  update("entry", formatNum3(Number(e.target.value)))
                }
              />
            );
          })()}
        </div>

        <div
          className="snapshot-field-mini"
          style={{ display: "flex", flexDirection: "column", gap: "2px" }}
        >
          <label
            className="minor-text"
            style={{
              fontWeight: "700",
              fontSize: "9px",
              textTransform: "uppercase",
              color: "var(--muted-bright)",
              opacity: 0.8,
            }}
          >
            Risk / Reward
          </label>
          <input
            style={{
              height: "24px",
              fontSize: "11px",
              padding: "0 6px",
              width: "100%",
            }}
            type="number"
            step="0.1"
            inputMode="decimal"
            min="0.3"
            max="10"
            value={value.rr || ""}
            onChange={(e) => update("rr", e.target.value)}
            disabled={controlsDisabled}
            readOnly={rrReadOnly}
          />
          {(() => {
            const m = calcSliderMeta(value.rr);
            return (
              <input
                className="snapshot-number-slider-v4" style={{ accentColor: "var(--muted)" }}
                type="range"
                min={0.5}
                max={8}
                step={0.1}
                value={Number(value.rr) || 2}
                style={{ height: "10px", margin: "2px 0 0 0" }}
                disabled={controlsDisabled}
                onChange={(e) =>
                  update("rr", formatNum3(Number(e.target.value)))
                }
              />
            );
          })()}
        </div>

        <div
          className="snapshot-field-mini"
          style={{ display: "flex", flexDirection: "column", gap: "2px" }}
        >
          <label
            className="minor-text"
            style={{
              fontWeight: "700",
              fontSize: "9px",
              textTransform: "uppercase",
              color: "var(--muted-bright)",
              opacity: 0.8,
            }}
          >
            Take Profit
          </label>
          <input
            style={{
              height: "24px",
              fontSize: "11px",
              padding: "0 6px",
              width: "100%",
            }}
            type="number"
            step="0.001"
            inputMode="decimal"
            value={value.tp || ""}
            onChange={(e) => update("tp", e.target.value)}
            disabled={controlsDisabled}
          />
          {(() => {
            const m = calcSliderMeta(value.tp);
            return (
              <input
                className="snapshot-number-slider-v4" style={{ accentColor: "var(--muted)" }}
                type="range"
                min={m.min}
                max={m.max}
                step={m.step}
                value={m.value}
                style={{ height: "10px", margin: "2px 0 0 0" }}
                disabled={!m.enabled || controlsDisabled}
                onChange={(e) =>
                  update("tp", formatNum3(Number(e.target.value)))
                }
              />
            );
          })()}
        </div>

        <div
          className="snapshot-field-mini"
          style={{ display: "flex", flexDirection: "column", gap: "2px" }}
        >
          <label
            className="minor-text"
            style={{
              fontWeight: "700",
              fontSize: "9px",
              textTransform: "uppercase",
              color: "var(--muted-bright)",
              opacity: 0.8,
            }}
          >
            Stop Loss
          </label>
          <input
            style={{
              height: "24px",
              fontSize: "11px",
              padding: "0 6px",
              width: "100%",
            }}
            type="number"
            step="0.001"
            inputMode="decimal"
            value={value.sl || ""}
            onChange={(e) => update("sl", e.target.value)}
            disabled={controlsDisabled}
          />
          {(() => {
            const m = calcSliderMeta(value.sl);
            return (
              <input
                className="snapshot-number-slider-v4" style={{ accentColor: "var(--muted)" }}
                type="range"
                min={m.min}
                max={m.max}
                step={m.step}
                value={m.value}
                style={{ height: "10px", margin: "2px 0 0 0" }}
                disabled={!m.enabled || controlsDisabled}
                onChange={(e) =>
                  update("sl", formatNum3(Number(e.target.value)))
                }
              />
            );
          })()}
        </div>
      </div>

      {/* Right Column: Note & Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <label
            className="minor-text"
            style={{
              fontWeight: "700",
              fontSize: "9px",
              textTransform: "uppercase",
              color: "var(--muted-bright)",
              opacity: 0.8,
            }}
          >
            Strategic Note
          </label>
          <textarea
            style={{
              flex: 1,
              minHeight: "64px",
              fontSize: "11.5px",
              padding: "6px 8px",
              lineHeight: "1.4",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            value={value.note || ""}
            onChange={(e) => update("note", e.target.value)}
            disabled={controlsDisabled}
            placeholder="Execution details..."
          />
          {(value.reasons_to_skip || value.skip_recommendation) && (
            <div
              style={{
                fontSize: 10,
                color: "var(--text)",
                opacity: 0.7,
                marginTop: 4,
              }}
            >
              {value.reasons_to_skip ? (
                <div>
                  Skip:{" "}
                  {Array.isArray(value.reasons_to_skip)
                    ? value.reasons_to_skip.join(", ")
                    : value.reasons_to_skip}
                </div>
              ) : null}
              {value.skip_recommendation && (
                <div>{value.skip_recommendation}</div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "6px",
            alignItems: "center",
            marginTop: "4px",
          }}
        >
          {showResetButton ? (
            <button
              className="secondary-button"
              type="button"
              onClick={onReset}
              disabled={controlsDisabled || typeof onReset !== "function"}
              style={{
                height: "26px",
                fontSize: "11px",
                padding: "0 10px",
                borderRadius: "4px",
              }}
            >
              Reset
            </button>
          ) : null}
          {effectiveShowSave ? (
            <button
              className={`secondary-button ${busy?.save ? "btn-busy" : ""}`}
              type="button"
              onClick={onSave}
              disabled={controlsDisabled || typeof onSave !== "function"}
              style={{
                height: "26px",
                fontSize: "11px",
                padding: "0 10px",
                borderRadius: "4px",
              }}
            >
              {busy?.save ? (
                <div className="spinner" style={{ width: 12, height: 12 }} />
              ) : (
                resolvedSaveLabel
              )}
            </button>
          ) : null}
          {effectiveShowAddSignal ? (
            <button
              className={`secondary-button ${busy?.signal ? "btn-busy" : ""}`}
              type="button"
              onClick={() => onAddSignal?.(value)}
              disabled={controlsDisabled || typeof onAddSignal !== "function"}
              style={{
                height: "26px",
                fontSize: "11px",
                padding: "0 10px",
                borderRadius: "4px",
              }}
            >
              {busy?.signal ? (
                <div className="spinner" style={{ width: 12, height: 12 }} />
              ) : (
                addSignalLabel
              )}
            </button>
          ) : null}
          {effectiveShowAddTrade ? (
            <button
              className={`primary-button ${busy?.trade ? "btn-busy" : ""}`}
              type="button"
              onClick={() => onAddTrade?.(value)}
              disabled={controlsDisabled || typeof onAddTrade !== "function"}
              style={{
                height: "26px",
                fontSize: "11px",
                padding: "0 10px",
                borderRadius: "4px",
              }}
            >
              {busy?.trade ? (
                <div className="spinner" style={{ width: 12, height: 12 }} />
              ) : (
                addTradeLabel
              )}
            </button>
          ) : null}
        </div>
        {error ? (
          <span
            className="minor-text msg-error"
            style={{ fontSize: "10px", textAlign: "right" }}
          >
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
