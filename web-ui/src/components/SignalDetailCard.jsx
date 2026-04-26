import { useEffect, useMemo, useState } from "react";
import { TradeSignalChart } from "./TradeSignalChart";
import { TradePlanEditor } from "./TradePlanEditor";
import { renderHistoryItem } from "../utils/signalDetailUtils";

const DEFAULT_TF_TABS = ["ENTRY", "W", "D", "4H", "15m", "5m", "1m"];
const MODE_PRESETS = {
  generic: {
    headerColumns: "minmax(0, 1fr) minmax(0, 1.25fr) minmax(120px, 0.55fr)",
    historyLoadingText: "Fetching logs...",
    historyEmptyText: "No events.",
  },
  ai: {
    headerColumns: "minmax(0, 1fr) minmax(0, 1.25fr) minmax(120px, 0.55fr)",
    historyLoadingText: "Fetching logs...",
    historyEmptyText: "No events.",
  },
  signal: {
    headerColumns: "minmax(0, 1fr) minmax(0, 1.25fr) minmax(120px, 0.55fr)",
    historyLoadingText: "Fetching telemetry logs...",
    historyEmptyText: "No signal events.",
  },
  trade: {
    headerColumns: "minmax(0, 1fr) minmax(0, 1.25fr) minmax(120px, 0.55fr)",
    historyLoadingText: "Fetching execution logs...",
    historyEmptyText: "No trade events.",
  },
};

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

function renderFormattedText(text) {
  if (!text) return null;
  return String(text).split('\n').map((line, i) => (
    <span key={i}>
      {line}
      {i < text.split('\n').length - 1 && <br />}
    </span>
  ));
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
  const preset = MODE_PRESETS[mode] || MODE_PRESETS.generic;
  if (!showWhenEmpty && !header && !response?.hasData && !tradePlan?.enabled && !chart?.enabled && !metaItems.length && !history?.enabled) {
    return <div className="empty-state">{emptyText}</div>;
  }

  const tfTabs = Array.isArray(chart?.detailTfTabs) && chart.detailTfTabs.length ? chart.detailTfTabs : DEFAULT_TF_TABS;
  const liveTabs = tfTabs.filter((x) => String(x || "").toUpperCase() !== "ENTRY");
  const activeTab = chart?.detailTfTab || "ENTRY";
  const canSwitchTab = typeof chart?.onDetailTfTabChange === "function";
  const tvSymbol = String(chart?.tvSymbol || toTradingViewSymbol(chart?.symbol || "")).trim();

  const availableTabs = useMemo(() => {
    const tabs = [];
    if (chart?.enabled) tabs.push("chart", "live");
    if (response?.text) tabs.push("analysis");
    if (response?.tradePlans?.length) tabs.push("plans");
    if (response?.chartNode || response?.snapshotNode || response?.snapshotFiles?.length) tabs.push("snapshots");
    if ((response?.raw || response?.text || response?.bars)) tabs.push("json");
    if (history?.enabled) tabs.push("history");
    if (!tabs.length && metaItems?.length) tabs.push("fields");
    return tabs;
  }, [chart?.enabled, response?.text, response?.tradePlans, response?.chartNode, response?.snapshotNode, response?.snapshotFiles, response?.raw, response?.text, response?.bars, history?.enabled, metaItems]);

  const [mainTab, setMainTab] = useState(availableTabs[0] || "chart");
  const [liveTab, setLiveTab] = useState(liveTabs[0] || "15m");

  useEffect(() => {
    if (!availableTabs.includes(mainTab)) setMainTab(availableTabs[0] || "fields");
  }, [availableTabs, mainTab]);

  useEffect(() => {
    if (canSwitchTab && mainTab === "chart") chart.onDetailTfTabChange("ENTRY");
  }, [mainTab, canSwitchTab, chart]);

  useEffect(() => {
    if (!liveTabs.includes(liveTab)) setLiveTab(liveTabs[0] || "15m");
  }, [liveTabs, liveTab]);

  return (
    <div className="trade-detail-content">
      {header ? (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: header.columns || preset.headerColumns, gap: 12, alignItems: "center" }}>
            <div className="cell-major" style={{ minWidth: 0 }}>{header.left}</div>
            <div className="cell-major" style={{ minWidth: 0 }}>{header.center}</div>
            <div style={{ textAlign: "right", minWidth: 0 }}>{header.rightTop}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: header.columns || preset.headerColumns, gap: 12, alignItems: "center" }}>
            <div className="minor-text" style={{ minWidth: 0 }}>{header.leftMinor}</div>
            <div className="minor-text" style={{ minWidth: 0 }}>{header.centerMinor}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", minWidth: 0 }}>{header.rightBottom}</div>
          </div>
        </div>
      ) : null}

      {availableTabs.length ? (
        <div className="snapshot-tabs-v2" style={{ marginBottom: 14 }}>
          {availableTabs.map((t) => (
            <button key={t} type="button" className={`secondary-button ${mainTab === t ? "active" : ""}`} onClick={() => setMainTab(t)}>
              {t === "plans" ? "Trade Plans" : (t.charAt(0).toUpperCase() + t.slice(1))}
            </button>
          ))}
        </div>
      ) : null}

      {mainTab === "plans" && Array.isArray(response?.tradePlans) && response.tradePlans.length ? (
        <div className="stack-layout" style={{ gap: 12, marginBottom: 14 }}>
          {response.tradePlans.map((plan, pIdx) => {
             const sideCls = plan.direction === "SELL" ? "side-sell" : "side-buy";
             return (
               <article key={`plan_card_${plan.idx || pIdx}`} className="panel" style={{ padding: 14, margin: 0, position: 'relative' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                   <div className="cell-major">
                     <span className={sideCls} style={{ marginRight: 8 }}>{plan.direction}</span>
                     <strong>{plan.entryModel || "AI Trade Plan"}</strong>
                   </div>
                   <span className="minor-text">{plan.strategy || "ai"}</span>
                 </div>
                 <div className="cell-major" style={{ marginBottom: 6 }}>
                   {(plan.entry || 0).toLocaleString()} → {(plan.tp || 0).toLocaleString()} / {(plan.sl || 0).toLocaleString()}
                   <span className="minor-text" style={{ marginLeft: 8 }}>
                     | RR {(plan.rr || 0).toFixed(2)} {plan.confidence ? `| ${plan.confidence}%` : ""}
                   </span>
                 </div>
                 {plan.note ? (
                   <div className="minor-text" style={{ marginBottom: 12, lineHeight: 1.4 }}>
                     {renderFormattedText(plan.note)}
                   </div>
                 ) : null}
                 <button 
                   type="button" 
                   className="secondary-button" 
                   style={{ height: 28, padding: '0 12px', fontSize: '11px' }}
                   onClick={() => {
                     if (tradePlan?.onChange) {
                       const upd = { 
                          direction: plan.direction, 
                          entry: String(plan.entry || ""),
                          tp: String(plan.tp || ""),
                          sl: String(plan.sl || ""),
                          rr: String(plan.rr || ""),
                          note: plan.note || ""
                       };
                       Object.entries(upd).forEach(([k, v]) => tradePlan.onChange(k, v));
                     }
                   }}
                 >
                   Use Plan
                 </button>
               </article>
             );
          })}
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

      {mainTab === "chart" && chart?.enabled ? (
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
      ) : null}

      {mainTab === "live" && chart?.enabled ? (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {liveTabs.map((tab) => (
              <button key={tab} type="button" className={`secondary-button ${liveTab === tab ? "active" : ""}`} onClick={() => setLiveTab(tab)}>{tab}</button>
            ))}
          </div>
          <iframe
            title={chart.iframeTitle || `detail-tv-${liveTab}`}
            style={{ width: "100%", height: 430, border: "1px solid var(--border)", borderRadius: 10, background: "var(--panel)" }}
            src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${encodeURIComponent(detailTabToTvInterval(liveTab))}&theme=dark&style=1&locale=en&toolbarbg=%230f1729&hide_top_toolbar=1&hide_legend=1&saveimage=0`}
          />
        </div>
      ) : null}

      {mainTab === "snapshots" ? (
        <div>
          {response?.snapshotNode || response?.chartNode || (
            Array.isArray(response?.snapshotFiles) && response.snapshotFiles.length
              ? (
                <div className="snapshot-chart-grid-v2">
                  {response.snapshotFiles.map((f) => (
                    <a key={f} className="snapshot-chart-card-v2" href={`/v2/chart/snapshots/${encodeURIComponent(f)}`} target="_blank" rel="noreferrer">
                      <img src={`/v2/chart/snapshots/${encodeURIComponent(f)}`} alt={f} />
                    </a>
                  ))}
                </div>
              )
              : <div className="minor-text">No snapshots.</div>
          )}
        </div>
      ) : null}

      {mainTab === "analysis" ? (
        <div className="panel" style={{ padding: 14, margin: 0, lineHeight: 1.5, fontSize: '13px' }}>
          {renderFormattedText(response.text)}
        </div>
      ) : null}

      {mainTab === "json" ? (
        <textarea className="snapshot-mono-v2" rows={16} value={response?.raw || response?.text || response?.bars || "{}"} readOnly disabled />
      ) : null}

      {mainTab === "history" && history?.enabled ? (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10, maxHeight: history.maxHeight || 380, overflow: history.scroll ? "auto" : "visible" }}>
          {history.loading ? (
            <div className="loading">{history.loadingText || preset.historyLoadingText}</div>
          ) : (
            <div className="stack-layout" style={{ gap: "10px" }}>
              {(Array.isArray(history.items) && history.items.length
                ? history.items
                : []).map((item, idx) => (
                history.renderItem
                  ? history.renderItem(item, idx)
                  : renderHistoryItem(item, idx, { formatDateTime })
              ))}
              {(!Array.isArray(history.items) || history.items.length === 0) ? (
                <div className="muted">{history.emptyText || preset.historyEmptyText}</div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {Array.isArray(metaItems) && metaItems.length && (mainTab === "chart" || mainTab === "fields") ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 14 }}>
          {metaItems.map((m, idx) => (
            <div key={`${m.label || "meta"}_${idx}`} style={m.fullWidth ? { gridColumn: "1 / -1" } : undefined}>
              <span className="minor-text">{m.label}</span>
              <div style={m.valueStyle || { wordBreak: "break-word" }}>{renderFormattedText(m.value)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
