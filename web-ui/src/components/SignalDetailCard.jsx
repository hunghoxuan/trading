import { TradeSignalChart } from "./TradeSignalChart";
import { TradePlanEditor } from "./TradePlanEditor";

const DEFAULT_TF_TABS = ["ENTRY", "W", "D", "4H", "15m", "5m", "1m"];

function detailTabToTvInterval(tab) {
  const t = String(tab || "").toUpperCase();
  if (t === "W") return "W";
  if (t === "D") return "D";
  if (t === "4H") return "240";
  if (t === "15M") return "15";
  if (t === "5M") return "5";
  if (t === "1M") return "1";
  return "15";
}

function toTradingViewSymbol(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "ICMARKETS:EURUSD";
  if (s.includes(":")) return s;
  return `ICMARKETS:${s.replace(/[^A-Z0-9]/g, "")}`;
}

function defaultHistoryRenderer(item, idx, formatDateTime) {
  const payload = item?.payload_json || item?.metadata || item?.payload || {};
  const type = String(item?.event_type || item?.type || payload?.event || payload?.event_type || "EVENT");
  const when = formatDateTime ? formatDateTime(item?.event_time || item?.created_at) : String(item?.event_time || item?.created_at || "-");
  return (
    <div key={`${item?.id || item?.event_id || item?.log_id || idx}`} style={{ margin: "0 0 10px 0", paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="panel-label" style={{ margin: 0 }}>{type}</span>
        <span className="minor-text">{when}</span>
      </div>
      <div className="json-table-wrapper">
        <pre className="minor-text" style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {JSON.stringify(payload || {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export function SignalDetailCard({
  mode = "generic",
  emptyText = "Select an item to inspect details.",
  showWhenEmpty = false,
  header = null,
  response = null,
  tradePlan = null,
  chart = null,
  metaItems = [],
  history = null,
  formatDateTime,
}) {
  if (!showWhenEmpty && !header && !response?.hasData && !tradePlan?.enabled && !chart?.enabled && !metaItems.length && !history?.enabled) {
    return <div className="empty-state">{emptyText}</div>;
  }

  const tfTabs = Array.isArray(chart?.detailTfTabs) && chart.detailTfTabs.length ? chart.detailTfTabs : DEFAULT_TF_TABS;
  const activeTab = chart?.detailTfTab || "ENTRY";
  const canSwitchTab = typeof chart?.onDetailTfTabChange === "function";
  const tvSymbol = String(chart?.tvSymbol || toTradingViewSymbol(chart?.symbol || "")).trim();

  return (
    <div className="trade-detail-content">
      {header ? (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: header.columns || "minmax(0, 1fr) minmax(0, 1.25fr) minmax(120px, 0.55fr)", gap: 12, alignItems: "center" }}>
            <div className="cell-major" style={{ minWidth: 0 }}>
              {header.left}
            </div>
            <div className="cell-major" style={{ minWidth: 0 }}>
              {header.center}
            </div>
            <div style={{ textAlign: "right", minWidth: 0 }}>
              {header.rightTop}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: header.columns || "minmax(0, 1fr) minmax(0, 1.25fr) minmax(120px, 0.55fr)", gap: 12, alignItems: "center" }}>
            <div className="minor-text" style={{ minWidth: 0 }}>{header.leftMinor}</div>
            <div className="minor-text" style={{ minWidth: 0 }}>{header.centerMinor}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", minWidth: 0 }}>
              {header.rightBottom}
            </div>
          </div>
        </div>
      ) : null}

      {response?.enabled && response?.hasData ? (
        <div style={{ marginBottom: 14 }}>
          <div className="snapshot-tabs-v2">
            <span className="panel-label" style={{ margin: 0 }}>{response.label || "Response"}</span>
            <button type="button" className={`secondary-button ${response.tab === "text" ? "active" : ""}`} onClick={() => response.onTabChange?.("text")}>Text</button>
            <button type="button" className={`secondary-button ${response.tab === "raw" ? "active" : ""}`} onClick={() => response.onTabChange?.("raw")}>Raw</button>
            <button type="button" className={`secondary-button ${response.tab === "bars" ? "active" : ""}`} onClick={() => response.onTabChange?.("bars")}>Bars</button>
            <button type="button" className={`secondary-button ${response.tab === "chart" ? "active" : ""}`} onClick={() => response.onTabChange?.("chart")}>Chart</button>
          </div>
          {response.tab === "text" ? <textarea className="snapshot-mono-v2" rows={16} value={response.text || ""} readOnly disabled /> : null}
          {response.tab === "raw" ? <textarea className="snapshot-mono-v2" rows={16} value={response.raw || ""} readOnly disabled /> : null}
          {response.tab === "bars" ? <textarea className="snapshot-mono-v2" rows={16} value={response.bars || ""} readOnly disabled /> : null}
          {response.tab === "chart" ? response.chartNode : null}
        </div>
      ) : null}

      {tradePlan?.enabled ? (
        <div className="snapshot-response-footer-v3" style={{ marginBottom: 14 }}>
          <TradePlanEditor
            signalId={tradePlan.signalId || null}
            tradeId={tradePlan.tradeId || null}
            value={tradePlan.value || {}}
            onChange={tradePlan.onChange}
            onReset={tradePlan.onReset}
            onSave={tradePlan.onSave}
            onAddSignal={tradePlan.onAddSignal}
            onAddTrade={tradePlan.onAddTrade}
            showSaveButton={tradePlan.showSaveButton}
            showAddSignalButton={tradePlan.showAddSignalButton}
            showAddTradeButton={tradePlan.showAddTradeButton}
            showResetButton={tradePlan.showResetButton !== false}
            saveLabel={tradePlan.saveLabel}
            addSignalLabel={tradePlan.addSignalLabel}
            addTradeLabel={tradePlan.addTradeLabel}
            busy={tradePlan.busy || {}}
            disabled={Boolean(tradePlan.disabled)}
            error={tradePlan.error || ""}
          />
          {tradePlan.successMessage ? <span className="minor-text msg-success">{tradePlan.successMessage}</span> : null}
        </div>
      ) : null}

      {chart?.enabled ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {tfTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`secondary-button ${activeTab === tab ? "active" : ""}`}
                onClick={() => canSwitchTab && chart.onDetailTfTabChange(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          {activeTab === "ENTRY" ? (
            chart.entryNode || (
              <TradeSignalChart
                symbol={chart.symbol}
                interval={chart.interval}
                live={chart.live !== false}
                historicalData={chart.historicalData || []}
                entryPrice={chart.entryPrice}
                slPrice={chart.slPrice}
                tpPrice={chart.tpPrice}
                openedAt={chart.openedAt || null}
                closedAt={chart.closedAt || null}
                analysisSnapshot={chart.analysisSnapshot || null}
              />
            )
          ) : (
            <iframe
              title={chart.iframeTitle || `detail-tv-${activeTab}`}
              style={{ width: "100%", height: 430, border: "1px solid var(--border)", borderRadius: 10, background: "var(--panel)" }}
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${encodeURIComponent(detailTabToTvInterval(activeTab))}&theme=dark&style=1&locale=en&toolbarbg=%230f1729&hide_top_toolbar=1&hide_legend=1&saveimage=0`}
            />
          )}
        </div>
      ) : null}

      {Array.isArray(metaItems) && metaItems.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginBottom: 14 }}>
          {metaItems.map((m, idx) => (
            <div key={`${m.label || "meta"}_${idx}`} style={m.fullWidth ? { gridColumn: "1 / -1" } : undefined}>
              <span className="minor-text">{m.label}</span>
              <div style={m.valueStyle || { whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {history?.enabled ? (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10, maxHeight: history.maxHeight || 380, overflow: history.scroll ? "auto" : "visible" }}>
          {history.loading ? (
            <div className="loading">{history.loadingText || "Fetching logs..."}</div>
          ) : (
            <div className="stack-layout" style={{ gap: "10px" }}>
              {(Array.isArray(history.items) && history.items.length
                ? history.items
                : []).map((item, idx) => (
                history.renderItem
                  ? history.renderItem(item, idx)
                  : defaultHistoryRenderer(item, idx, formatDateTime)
              ))}
              {(!Array.isArray(history.items) || history.items.length === 0) ? (
                <div className="muted">{history.emptyText || "No events."}</div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
