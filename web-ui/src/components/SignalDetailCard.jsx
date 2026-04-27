import { useEffect, useMemo, useState } from "react";
import TradeSignalChart from "./TradeSignalChart";
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

/**
 * Local helper component for each "Cloned Screen 1" (Trade Plan)
 */
function ExtraPlanBlock({ planId, plan, onAddSignal, onAddTrade, busy, submittingPlanId }) {
  const [localPos, setLocalPos] = useState({
    direction: plan.direction || "BUY",
    trade_type: "limit",
    entry: String(plan.entry || ""),
    tp: String(plan.tp || ""),
    sl: String(plan.sl || ""),
    rr: String(plan.rr || ""),
    note: plan.note || ""
  });

  const update = (key, val) => setLocalPos(prev => ({ ...prev, [key]: val }));
  const isAdding = busy?.signal || busy?.trade;
  const isThisPlanAdding = isAdding && submittingPlanId === planId;

  return (
    <TradePlanEditor
      value={localPos}
      onChange={update}
      onAddSignal={() => onAddSignal?.(localPos, planId)}
      onAddTrade={() => onAddTrade?.(localPos, planId)}
      showAddSignalButton={true}
      showAddTradeButton={true}
      showResetButton={false}
      busy={{
        signal: isThisPlanAdding,
        trade: isThisPlanAdding
      }}
      disabled={isAdding && !isThisPlanAdding} // disable others while one is adding
    />
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
  hideTabsBeforeResponse = false,
}) {
  const preset = MODE_PRESETS[mode] || MODE_PRESETS.generic;
  const hasResponseData = Boolean(response?.hasData);
  
  if (!showWhenEmpty && !header && !hasResponseData && !tradePlan?.enabled && !chart?.enabled && !metaItems.length && !history?.enabled) {
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
    const hasRaw = response?.raw && typeof response.raw === "object" && Object.keys(response.raw).length > 0;
    const hasPlans = Array.isArray(response?.tradePlans) && response.tradePlans.length > 0;
    const trulyHasData = hasRaw || hasPlans;

    if (!trulyHasData && hideTabsBeforeResponse) return tabs;

    if (chart?.enabled) tabs.push("chart");
    if (trulyHasData) {
      tabs.push("analysis");
    }
    tabs.push("json");
    if (history?.enabled) tabs.push("history");
    if (!tabs.length && metaItems?.length) tabs.push("fields");
    return tabs;
  }, [chart?.enabled, hasResponseData, response?.raw, response?.tradePlans, response?.bars, history?.enabled, metaItems, hideTabsBeforeResponse]);

  const [mainTab, setMainTab] = useState("fields");
  
  useEffect(() => {
    if (!availableTabs.includes(mainTab)) setMainTab(availableTabs[0] || "fields");
  }, [availableTabs, mainTab]);
  
  const [selectedTfs, setSelectedTfs] = useState([]);
  const [chartModes, setChartModes] = useState(['static', 'live']);
  const [multiChartData, setMultiChartData] = useState({});
  const [loadingCharts, setLoadingCharts] = useState(false);

  useEffect(() => {
    if (hasResponseData && !chartModes.includes('static')) {
      setChartModes(['static', 'live']);
    } else if (!hasResponseData) {
      setChartModes(['live']);
    }
  }, [hasResponseData, chart?.analysisSnapshot]);

  useEffect(() => {
    if (chart?.enabled) {
      const initial = [];
      if (chart.detailTfTab && chart.detailTfTab !== 'ENTRY') initial.push(chart.detailTfTab.toLowerCase());
      if (chart.interval) {
          const sTf = String(chart.interval).toLowerCase();
          if (!initial.includes(sTf)) initial.push(sTf);
      }
      if (initial.length < 2) {
        ['4h', '1h', '15m'].forEach(f => {
          if (!initial.includes(f) && initial.length < 3) initial.push(f);
        });
      }
      setSelectedTfs(initial.sort((a, b) => (TF_WEIGHTS[a.toLowerCase()] || 0) - (TF_WEIGHTS[b.toLowerCase()] || 0)));
    }
  }, [chart?.enabled, chart?.detailTfTab, chart?.interval]);

  useEffect(() => {
    if (mainTab === 'chart' && chart?.symbol && selectedTfs.length > 0 && chartModes.includes('static')) {
      let isMounted = true;
      setLoadingCharts(true);
      const tfsParam = selectedTfs.join(',');
      fetch(`/api/charts/multi?symbol=${encodeURIComponent(chart.symbol)}&tfs=${encodeURIComponent(tfsParam)}`)
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(res => {
          if (isMounted && res?.ok) setMultiChartData(res.data || {});
        })
        .catch(err => {
          if (isMounted) console.warn("Failed to fetch multi-TF charts:", err.message);
        })
        .finally(() => {
          if (isMounted) setLoadingCharts(false);
        });
      return () => { isMounted = false; };
    }
  }, [mainTab, chart?.symbol, selectedTfs, chartModes]);

  const toggleTf = (tf) => {
    const t = tf.toLowerCase();
    setSelectedTfs(prev => {
      const next = prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t];
      return next.sort((a, b) => (TF_WEIGHTS[a.toLowerCase()] || 0) - (TF_WEIGHTS[b.toLowerCase()] || 0));
    });
  };

  const toggleMode = (m) => setChartModes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  useEffect(() => {
    if (canSwitchTab && mainTab === "chart") chart.onDetailTfTabChange("ENTRY");
  }, [mainTab, canSwitchTab, chart]);

  return (
    <div className="trade-detail-content">
      {header ? (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: header.columns || preset.headerColumns, gap: 12, alignItems: "center" }}>
            <div className="cell-major">{header.left}</div>
            <div className="cell-major">{header.center}</div>
            <div style={{ textAlign: "right" }}>{header.rightTop}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: header.columns || preset.headerColumns, gap: 12, alignItems: "center" }}>
            <div className="minor-text">{header.leftMinor}</div>
            <div className="minor-text">{header.centerMinor}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>{header.rightBottom}</div>
          </div>
        </div>
      ) : null}

      {/* Multiple Trade Plan Blocks (Duplicates of Screen 1) */}
      {tradePlan?.enabled && (
        <div className="stack-layout" style={{ gap: 24, marginBottom: 32 }}>
          {/* Main Plan (from analysis) or Default Editor */}
          <div style={{ border: '2px solid var(--accent-soft)', padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
            {Array.isArray(response?.tradePlans) && response.tradePlans.length > 0 && (
              <div className="minor-text" style={{ marginBottom: 16, fontWeight: '900', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}>
                Primary Trade Plan: {response.tradePlans[0].entryModel || response.tradePlans[0].strategy || "Suggested"}
              </div>
            )}
            <TradePlanEditor
              signalId={tradePlan.signalId || null}
              tradeId={tradePlan.tradeId || null}
              value={tradePlan.value || {}}
              onChange={tradePlan.onChange}
              onReset={tradePlan.onReset}
              onSave={tradePlan.onSave}
              onAddSignal={(pos) => tradePlan.onAddSignal?.(pos || tradePlan.value, "main")}
              onAddTrade={(pos) => tradePlan.onAddTrade?.(pos || tradePlan.value, "main")}
              showSaveButton={tradePlan.showSaveButton}
              showAddSignalButton={tradePlan.showAddSignalButton}
              showAddTradeButton={tradePlan.showAddTradeButton}
              showResetButton={tradePlan.showResetButton !== false}
              busy={tradePlan.busy || {}}
              disabled={Boolean(tradePlan.disabled)}
              error={tradePlan.error || ""}
            />
            {tradePlan.successMessage ? <div style={{ marginTop: 12 }}><span className="minor-text msg-success">{tradePlan.successMessage}</span></div> : null}
          </div>

          {/* Additional Plans */}
          {Array.isArray(response?.tradePlans) && response.tradePlans.length > 1 && 
            response.tradePlans.slice(1).map((plan, pIdx) => {
              const planId = `suggested_${pIdx + 1}`;
              return (
                <div key={planId} style={{ border: '1px solid var(--border)', padding: 20, borderRadius: 12, background: 'rgba(255,255,255,0.015)' }}>
                  <div className="minor-text" style={{ marginBottom: 16, fontWeight: '900', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}>
                    Suggested Plan {pIdx + 2}: {plan.entryModel || plan.strategy || "Alternative Scenario"}
                  </div>
                  <ExtraPlanBlock 
                     planId={planId}
                     plan={plan} 
                     onAddSignal={tradePlan?.onAddSignal}
                     onAddTrade={tradePlan?.onAddTrade}
                     busy={tradePlan?.busy}
                     submittingPlanId={tradePlan?.submittingPlanId}
                  />
                </div>
              );
            })
          }
        </div>
      )}

      {availableTabs.length ? (
        <div className="snapshot-tabs-v2" style={{ marginBottom: 14 }}>
          {availableTabs.map((t) => (
            <button key={t} type="button" className={`secondary-button ${mainTab === t ? "active" : ""}`} onClick={() => setMainTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      ) : null}

      {mainTab === "chart" && chart?.enabled && hasResponseData ? (
        <div className="chart-tab-content">
          <div className="chart-controls-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="tf-pills" style={{ display: 'flex', gap: 6 }}>
              {liveTabs.map(tf => {
                const lowTf = tf.toLowerCase();
                const isSelected = selectedTfs.includes(lowTf);
                return (
                  <button 
                    key={tf}
                    type="button"
                    className={`tf-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleTf(tf)}
                    style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border)', background: isSelected ? 'var(--accent-soft)' : 'transparent', color: isSelected ? 'var(--text)' : 'var(--muted)' }}
                  >
                    {tf.toLowerCase()}
                  </button>
                );
              })}
            </div>
            <div className="mode-toggles" style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 2, borderRadius: '6px' }}>
              {(hasResponseData || chart?.analysisSnapshot) && (
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

          <div className="multi-chart-grid" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Show all selected timeframes */}
            {selectedTfs.map(tf => {
              const isEntryTf = tf.toLowerCase() === (chart.interval || '').toLowerCase();
              const snapshot = isEntryTf ? (response?.raw || chart?.analysisSnapshot) : multiChartData[tf];

              return (
                <div key={tf} className="tf-chart-row">
                  <h4 className="tf-row-label">{tf.toUpperCase()}</h4>
                  <div className={`tf-row-charts ${chartModes.length > 1 ? 'side-by-side' : ''}`} style={{ display: 'grid', gridTemplateColumns: chartModes.length > 1 ? '1fr 1fr' : '1fr', gap: 12 }}>
                    {chartModes.includes('static') && (
                      <div className="chart-wrapper static-wrapper">
                        {loadingCharts && !snapshot ? (
                          <div className="chart-loading" style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading {tf}...</div>
                        ) : (
                          <TradeSignalChart 
                            symbol={chart?.symbol} interval={tf} 
                            analysisSnapshot={snapshot}
                            entryPrice={chart?.entryPrice} slPrice={chart?.slPrice} tpPrice={chart?.tpPrice}
                          />
                        )}
                      </div>
                    )}
                    {chartModes.includes('live') && (
                      <div className="chart-wrapper live-wrapper">
                        <iframe
                          title={`TV-${tf}`}
                          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${detailTabToTvInterval(tf)}&theme=dark&style=1`}
                          width="100%" height="100%" style={{ aspectRatio: '3 / 2', borderRadius: '8px', border: '1px solid var(--border)' }} frameBorder="0"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {mainTab === "analysis" && hasResponseData ? (
        <div className="panel" style={{ padding: 14, margin: 0, lineHeight: 1.5, fontSize: '13px' }}>
          {renderFormattedText(response.text)}
        </div>
      ) : null}

      {mainTab === "json" && hasResponseData ? (
        <div className="panel" style={{ padding: 14, margin: 0, background: 'rgba(0,0,0,0.2)', overflow: 'auto', maxHeight: '500px' }}>
           <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', color: 'var(--muted)' }}>
             {JSON.stringify(response?.raw_json || response?.raw || {}, null, 2)}
           </pre>
        </div>
      ) : null}

      {mainTab === "history" && history?.enabled ? (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div className="stack-layout" style={{ gap: "10px" }}>
            {(history.items || []).map((item, idx) => renderHistoryItem(item, idx, { formatDateTime }))}
          </div>
        </div>
      ) : null}

      {Array.isArray(metaItems) && metaItems.length && hasResponseData && (mainTab === "chart" || mainTab === "fields") ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 14 }}>
          {metaItems.map((m, idx) => (
            <div key={idx} style={m.fullWidth ? { gridColumn: "1 / -1" } : undefined}>
              <span className="minor-text">{m.label}</span>
              <div>{renderFormattedText(m.value)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
