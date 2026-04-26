import { useEffect, useMemo, useState } from "react";
import { TradeSignalChart } from "./TradeSignalChart";
import { TradePlanEditor } from "./TradePlanEditor";
import { renderHistoryItem } from "../utils/signalDetailUtils";

const TF_WEIGHTS = {
  '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240, 'd': 1440, 'w': 10080, 'm': 43200
};

const DEFAULT_TF_TABS = ["ENTRY", "1m", "5m", "15m", "1h", "4h", "d", "W"];
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
  if (t === "1H") return "60";
  if (t === "30M") return "30";
  if (t === "15M") return "15";
  if (t === "5M") return "5";
  if (t === "1M") return "1";
  return "15";
}

function toTradingViewSymbol(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "BINANCE:BTCUSDT";
  if (s.includes(":")) return s;
  // Common mapping for TV iframe
  if (s === "BTCUSD" || s === "BTCUSDT") return "BINANCE:BTCUSDT";
  if (s === "ETHUSD" || s === "ETHUSDT") return "BINANCE:ETHUSDT";
  if (s === "XAUUSD" || s === "GOLD") return "OANDA:XAUUSD";
  return `OANDA:${s.replace(/[^A-Z0-9]/g, "")}`;
}

function renderFormattedText(text) {
  if (text == null || text === "") return null;
  const str = String(text);
  const lines = str.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(". ");
    return (
      <span key={i}>
        {parts.map((part, j) => (
          <span key={j}>
            {part}
            {j < parts.length - 1 ? "." : ""}
            {j < parts.length - 1 && <br />}
          </span>
        ))}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
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
  hideTabsBeforeResponse = false, // New prop to control tab visibility
}) {
  const preset = MODE_PRESETS[mode] || MODE_PRESETS.generic;
  if (!showWhenEmpty && !header && !response?.hasData && !tradePlan?.enabled && !chart?.enabled && !metaItems.length && !history?.enabled) {
    return <div className="empty-state">{emptyText}</div>;
  }

  const tfTabs = Array.isArray(chart?.detailTfTabs) && chart.detailTfTabs.length ? chart.detailTfTabs : DEFAULT_TF_TABS;
  const liveTabs = [...tfTabs]
    .filter(tf => tf !== 'ENTRY')
    .sort((a, b) => (TF_WEIGHTS[a.toLowerCase()] || 0) - (TF_WEIGHTS[b.toLowerCase()] || 0));
  const activeTab = chart?.detailTfTab || "ENTRY";
  const canSwitchTab = typeof chart?.onDetailTfTabChange === "function";
  const tvSymbol = String(chart?.tvSymbol || toTradingViewSymbol(chart?.symbol || "")).trim();

  const availableTabs = useMemo(() => {
    const tabs = [];
    const hasResponse = Boolean(response?.text);
    
    // Logic: if hideTabsBeforeResponse is true, we hide these until response arrived.
    // If false (default for signals/trades), we show them if enabled.
    const showAlwaysOrHasResponse = !hideTabsBeforeResponse || hasResponse;

    if (chart?.enabled && showAlwaysOrHasResponse) tabs.push("chart");
    if (showAlwaysOrHasResponse) {
      if (hasResponse) {
        tabs.push("analysis");
      }
      tabs.push("json");
    }
    if (response?.tradePlans?.length) tabs.push("plans");
    if (history?.enabled) tabs.push("history");
    if (!tabs.length && metaItems?.length) tabs.push("fields");
    return tabs;
  }, [chart?.enabled, response?.text, response?.tradePlans, response?.raw, response?.bars, history?.enabled, metaItems, hideTabsBeforeResponse]);

  const [mainTab, setMainTab] = useState("fields"); // Default to fields if chart/analysis hidden
  
  useEffect(() => {
    if (!availableTabs.includes(mainTab)) setMainTab(availableTabs[0] || "fields");
  }, [availableTabs, mainTab]);
  
  // Chart Multi-TF and Mode State
  const [selectedTfs, setSelectedTfs] = useState([]);
  const [chartModes, setChartModes] = useState(['live']);
  const [multiChartData, setMultiChartData] = useState({});
  const [loadingCharts, setLoadingCharts] = useState(false);

  useEffect(() => {
    const hasAnalysis = response?.hasData || chart?.analysisSnapshot;
    if (hasAnalysis && !chartModes.includes('static')) {
      setChartModes(prev => [...prev, 'static']);
    }
  }, [response?.hasData, chart?.analysisSnapshot]);

  // Initialize selected TFs from signal/profile
  useEffect(() => {
    if (chart?.enabled) {
      const initial = [];
      // 1. Current selected tab
      if (chart.detailTfTab && chart.detailTfTab !== 'ENTRY') {
        initial.push(chart.detailTfTab.toLowerCase());
      }
      // 2. Signal TF
      if (chart.interval) {
          const sTf = String(chart.interval).toLowerCase();
          if (!initial.includes(sTf)) initial.push(sTf);
      }
      // 3. Fallbacks
      if (initial.length < 2) {
        ['4h', '1h', '15m'].forEach(f => {
          if (!initial.includes(f) && initial.length < 3) initial.push(f);
        });
      }
      setSelectedTfs(initial.sort((a, b) => (TF_WEIGHTS[a.toLowerCase()] || 0) - (TF_WEIGHTS[b.toLowerCase()] || 0)));
    }
  }, [chart?.enabled, chart?.detailTfTab, chart?.interval]);

  // Fetch Multi-TF Data
  useEffect(() => {
    if (mainTab === 'chart' && chart?.symbol && selectedTfs.length > 0 && chartModes.includes('static')) {
      let isMounted = true;
      setLoadingCharts(true);
      const tfsParam = selectedTfs.join(',');
      fetch(`/api/charts/multi?symbol=${encodeURIComponent(chart.symbol)}&tfs=${encodeURIComponent(tfsParam)}`)
        .then(res => res.json())
        .then(res => {
          if (isMounted && res.ok) {
            setMultiChartData(res.data || {});
          }
        })
        .catch(err => console.error("Failed to fetch multi-TF charts", err))
        .finally(() => {
          if (isMounted) setLoadingCharts(false);
        });
      return () => { isMounted = false; };
    }
  }, [mainTab, chart?.symbol, selectedTfs, chartModes]);

  // Toggle Mode: Before analysis = Live only. After analysis = Static only.
  useEffect(() => {
    if (response?.text) {
      setChartModes(['static']); // "screen 1: hide this (live grid) after got AI response"
    } else {
      setChartModes(['live']);
    }
  }, [response?.text]);

  const toggleTf = (tf) => {
    const t = tf.toLowerCase();
    setSelectedTfs(prev => {
      const next = prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t];
      return next.sort((a, b) => (TF_WEIGHTS[a.toLowerCase()] || 0) - (TF_WEIGHTS[b.toLowerCase()] || 0));
    });
  };

  const toggleMode = (m) => {
    setChartModes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  useEffect(() => {
    if (canSwitchTab && mainTab === "chart") chart.onDetailTfTabChange("ENTRY");
  }, [mainTab, canSwitchTab, chart]);


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

      {mainTab === "chart" && chart?.enabled ? (
        <div className="chart-tab-content">
          <div className="chart-controls-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="tf-pills" style={{ display: 'flex', gap: 6 }}>
              {chart?.entryNode && (
                <button 
                  type="button"
                  className={`tf-pill ${activeTab === 'ENTRY' ? 'active' : ''}`}
                  onClick={() => canSwitchTab && chart.onDetailTfTabChange('ENTRY')}
                  style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', background: activeTab === 'ENTRY' ? 'var(--accent-soft)' : 'transparent', color: activeTab === 'ENTRY' ? 'var(--text)' : 'var(--muted)' }}
                >
                  ENTRY
                </button>
              )}
              {liveTabs.map(tf => {
                const lowTf = tf.toLowerCase();
                const displayTf = (lowTf === 'w' || lowTf === 'mn' || lowTf === '1m_month') ? tf.toUpperCase() : lowTf;
                return (
                  <button 
                    key={tf}
                    type="button"
                    className={`tf-pill ${activeTab !== 'ENTRY' && selectedTfs.includes(lowTf) ? 'active' : ''}`}
                    onClick={() => toggleTf(tf)}
                    style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', background: (activeTab !== 'ENTRY' && selectedTfs.includes(lowTf)) ? 'var(--accent-soft)' : 'transparent', color: (activeTab !== 'ENTRY' && selectedTfs.includes(lowTf)) ? 'var(--text)' : 'var(--muted)' }}
                  >
                    {displayTf}
                  </button>
                );
              })}
            </div>
            <div className="mode-toggles" style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 2, borderRadius: '6px' }}>
              {response?.text && (
                <button 
                  type="button"
                  className={`mode-btn ${chartModes.includes('static') ? 'active' : ''}`}
                  onClick={() => toggleMode('static')}
                  style={{ padding: '4px 12px', fontSize: '11px', border: 'none', background: chartModes.includes('static') ? 'var(--surface-light)' : 'transparent', borderRadius: '4px', color: chartModes.includes('static') ? 'var(--text)' : 'var(--muted)' }}
                >
                  CHART
                </button>
              )}
              <button 
                type="button"
                className={`mode-btn ${chartModes.includes('live') ? 'active' : ''}`}
                onClick={() => toggleMode('live')}
                style={{ padding: '4px 12px', fontSize: '11px', border: 'none', background: chartModes.includes('live') ? 'var(--surface-light)' : 'transparent', borderRadius: '4px', color: chartModes.includes('live') ? 'var(--text)' : 'var(--muted)' }}
              >
                LIVE
              </button>
            </div>
          </div>

          <div className="multi-chart-grid">
            {activeTab === 'ENTRY' && chart?.entryNode ? (
              <div className="tf-chart-row">
                {chart.entryNode}
              </div>
            ) : (
              selectedTfs.map(tf => (
                <div key={tf} className="tf-chart-row">
                  <h4 className="tf-row-label">{tf}</h4>
                  <div className={`tf-row-charts ${chartModes.length > 1 ? 'side-by-side' : ''}`} style={{ display: 'grid', gridTemplateColumns: chartModes.length > 1 ? '1fr 1fr' : '1fr', gap: 12 }}>
                    {chartModes.includes('static') && (
                      <div className="chart-wrapper static-wrapper">
                        {loadingCharts && !multiChartData[tf] ? (
                          <div className="chart-loading" style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading {tf} data...</div>
                        ) : (
                          <TradeSignalChart 
                            symbol={chart?.symbol}
                            interval={tf}
                            analysisSnapshot={multiChartData[tf]}
                            entryPrice={chart?.entryPrice}
                            slPrice={chart?.slPrice}
                            tpPrice={chart?.tpPrice}
                            openedAt={chart?.openedAt}
                            closedAt={chart?.closedAt}
                          />
                        )}
                      </div>
                    )}
                    {chartModes.includes('live') && (
                      <div className="chart-wrapper live-wrapper">
                        <iframe
                          title={`TV-${tf}`}
                          src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_762ae&symbol=${encodeURIComponent(tvSymbol)}&interval=${detailTabToTvInterval(tf)}&hidesidetoolbar=1&symboledit=1&saveimage=1&theme=dark&style=1&timezone=Etc%2FUTC&studies=[]`}
                          width="100%"
                          height="100%"
                          style={{ aspectRatio: '3 / 2', borderRadius: '8px', border: '1px solid var(--border)', display: 'block' }}
                          frameBorder="0"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {activeTab !== 'ENTRY' && selectedTfs.length === 0 && <div className="empty-state">Select at least one Timeframe to view charts.</div>}
          </div>
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
        <div className="panel" style={{ padding: 14, margin: 0, background: 'rgba(0,0,0,0.2)', overflow: 'auto', maxHeight: '500px' }}>
           <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', color: 'var(--muted)' }}>
             {JSON.stringify(response?.raw_json || response?.raw || response?.metadata || {}, null, 2)}
           </pre>
        </div>
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
            </div>
          )}
        </div>
      ) : null}

      {Array.isArray(metaItems) && metaItems.length && (mainTab === "chart" || mainTab === "fields") ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 14 }}>
          {metaItems.map((m, idx) => (
            <div key={`${m.label || "meta"}_${idx}`} style={m.fullWidth ? { gridColumn: "1 / -1" } : undefined}>
              <span className="minor-text">{m.label}</span>
              <div style={{ wordBreak: "break-word", whiteSpace: "pre-wrap", ...(m.valueStyle || {}) }}>{renderFormattedText(m.value)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
