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
  const effectiveShowSave = typeof showSaveButton === "boolean" ? showSaveButton : Boolean(signalId || tradeId);
  const effectiveShowAddSignal = typeof showAddSignalButton === "boolean" ? showAddSignalButton : (!signalId && !tradeId);
  const effectiveShowAddTrade = typeof showAddTradeButton === "boolean" ? showAddTradeButton : Boolean(signalId || (!signalId && !tradeId));
  const resolvedSaveLabel = saveLabel || (tradeId ? "Save Trade" : "Save Signal");

  const controlsDisabled = disabled || Boolean(busy?.save || busy?.signal || busy?.trade);
  const rrReadOnly = false;
  const directionOptions = useMemo(() => (["BUY", "SELL"]), []);

  const update = (key, val) => {
    if (typeof onChange === "function") onChange(key, val);
  };

  return (
    <div className={`trade-plan-editor-v5 ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="snapshot-footer-row0-v3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="snapshot-direction-field-v4" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="minor-text" style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Direction</label>
          <select value={value.direction || "BUY"} onChange={(e) => update("direction", String(e.target.value || ""))} disabled={controlsDisabled}>
            {directionOptions.map((x) => (
              <option key={x} value={x}>{x === "BUY" ? "Buy" : "Sell"}</option>
            ))}
          </select>
        </div>
        <div className="snapshot-direction-field-v4" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="minor-text" style={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Trade Type</label>
          <select value={value.trade_type || "limit"} onChange={(e) => update("trade_type", String(e.target.value || "limit"))} disabled={controlsDisabled}>
            <option value="limit">limit</option>
            <option value="market">market</option>
            <option value="stop">stop</option>
          </select>
        </div>
      </div>

      <div className="snapshot-footer-row1-v3" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="snapshot-footer-field-v3" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="minor-text" style={{ fontWeight: 'bold' }}>Entry</label>
          <input type="number" step="0.001" inputMode="decimal" value={value.entry || ""} onChange={(e) => update("entry", e.target.value)} disabled={controlsDisabled} />
          {(() => {
            const m = calcSliderMeta(value.entry);
            return (
              <input
                className="snapshot-number-slider-v4"
                type="range"
                min={m.min}
                max={m.max}
                step={m.step}
                value={m.value}
                disabled={!m.enabled || controlsDisabled}
                onChange={(e) => update("entry", formatNum3(Number(e.target.value)))}
              />
            );
          })()}
        </div>
        <div className="snapshot-footer-field-v3" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="minor-text" style={{ fontWeight: 'bold' }}>TP</label>
          <input type="number" step="0.001" inputMode="decimal" value={value.tp || ""} onChange={(e) => update("tp", e.target.value)} disabled={controlsDisabled} />
          {(() => {
            const m = calcSliderMeta(value.tp);
            return (
              <input
                className="snapshot-number-slider-v4"
                type="range"
                min={m.min}
                max={m.max}
                step={m.step}
                value={m.value}
                disabled={!m.enabled || controlsDisabled}
                onChange={(e) => update("tp", formatNum3(Number(e.target.value)))}
              />
            );
          })()}
        </div>
        <div className="snapshot-footer-field-v3" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="minor-text" style={{ fontWeight: 'bold' }}>SL</label>
          <input type="number" step="0.001" inputMode="decimal" value={value.sl || ""} onChange={(e) => update("sl", e.target.value)} disabled={controlsDisabled} />
          {(() => {
            const m = calcSliderMeta(value.sl);
            return (
              <input
                className="snapshot-number-slider-v4"
                type="range"
                min={m.min}
                max={m.max}
                step={m.step}
                value={m.value}
                disabled={!m.enabled || controlsDisabled}
                onChange={(e) => update("sl", formatNum3(Number(e.target.value)))}
              />
            );
          })()}
        </div>
        <div className="snapshot-footer-field-v3" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="minor-text" style={{ fontWeight: 'bold' }}>RR</label>
          <input type="number" step="0.001" inputMode="decimal" min="0.3" max="5" value={value.rr || ""} onChange={(e) => update("rr", e.target.value)} disabled={controlsDisabled} readOnly={rrReadOnly} />
          {(() => {
            const m = calcSliderMeta(value.rr);
            return (
              <input
                className="snapshot-number-slider-v4"
                type="range"
                min={m.min}
                max={m.max}
                step={m.step}
                value={m.value}
                disabled={!m.enabled || controlsDisabled}
                onChange={(e) => update("rr", formatNum3(Number(e.target.value)))}
              />
            );
          })()}
        </div>
      </div>

      <div className="snapshot-footer-row2-v3" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'end' }}>
        <div className="snapshot-note-field-v3" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="minor-text" style={{ fontWeight: 'bold' }}>Note</label>
          <textarea 
            value={value.note || ""} 
            onChange={(e) => update("note", e.target.value)} 
            onInput={(e) => {
              e.target.style.height = 'inherit';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            rows={1} 
            disabled={controlsDisabled} 
            placeholder="Plan description..."
          />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {showResetButton ? (
            <button className="secondary-button" type="button" onClick={onReset} disabled={controlsDisabled || typeof onReset !== "function"}>
              Reset
            </button>
          ) : null}
          {effectiveShowSave ? (
            <button className={`secondary-button ${busy?.save ? "btn-busy" : ""}`} type="button" onClick={onSave} disabled={controlsDisabled || typeof onSave !== "function"}>
              {busy?.save ? <div className="spinner" style={{ width: 14, height: 14 }} /> : resolvedSaveLabel}
            </button>
          ) : null}
          {effectiveShowAddSignal ? (
            <button className={`secondary-button ${busy?.signal ? "btn-busy" : ""}`} type="button" onClick={() => onAddSignal?.(value)} disabled={controlsDisabled || typeof onAddSignal !== "function"}>
              {busy?.signal ? <div className="spinner" style={{ width: 14, height: 14 }} /> : addSignalLabel}
            </button>
          ) : null}
          {effectiveShowAddTrade ? (
            <button className={`primary-button ${busy?.trade ? "btn-busy" : ""}`} type="button" onClick={() => onAddTrade?.(value)} disabled={controlsDisabled || typeof onAddTrade !== "function"}>
              {busy?.trade ? <div className="spinner" style={{ width: 14, height: 14 }} /> : addTradeLabel}
            </button>
          ) : null}
        </div>
      </div>
      {error ? <span className="minor-text snapshot-footer-msg-v3 msg-error">{error}</span> : null}
    </div>
  );
}
