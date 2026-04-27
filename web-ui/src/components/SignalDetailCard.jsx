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

function PlanHeader({ plan, planLabel, symbol, isBuy }) {
  const directionColor = isBuy ? '#26a69a' : '#ef5350';
  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      marginBottom: 8, 
      borderBottom: '1px solid var(--accent-soft)', 
      paddingBottom: 8,
      flexWrap: 'nowrap',
      gap: 12,
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ color: directionColor, fontWeight: 700, fontSize: '13px' }}>{String(plan.direction || "BUY").toUpperCase()}</span>
        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{planLabel}</span>
        <span style={{ fontWeight: 600, fontSize: '13px' }}>{symbol}</span>
        <span style={{ marginLeft: 4, fontSize: '13px', color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
          {plan.entry || "-"} → {plan.tp || "-"} / {plan.sl || "-"}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '11px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--muted-bright)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{plan.entryModel || plan.strategy || "Secondary"}</span>
        <span>{plan.rr || "0.0"} RR</span>
        <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{plan.confidence || "0"}%</span>
      </div>
    </div>
  );
}

function ExtraPlanBlock({ planId, plan, onAddSignal, onAddTrade, busy, submittingPlanId, successMessage }) {
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
  const isThisPlanAdding = submittingPlanId === planId;
  const isSignalAdding = busy?.signal && isThisPlanAdding;
  const isTradeAdding = busy?.trade && isThisPlanAdding;

  return (
    <div>
      <TradePlanEditor
        value={localPos}
        onChange={update}
        onAddSignal={() => onAddSignal?.(localPos, planId)}
        onAddTrade={() => onAddTrade?.(localPos, planId)}
        showAddSignalButton={true}
        showAddTradeButton={true}
        showResetButton={false}
        busy={{
          signal: isSignalAdding,
          trade: isTradeAdding
        }}
        disabled={Boolean(submittingPlanId && !isThisPlanAdding)}
      />
      {successMessage && isThisPlanAdding && (
        <div style={{ marginTop: 12 }}><span className="minor-text msg-success">{successMessage}</span></div>
      )}
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
  hideTabsBeforeResponse = false,
}) {
  const preset = MODE_PRESETS[mode] || MODE_PRESETS.generic;
  const hasResponseData = Boolean(response?.hasData);
  
  if (!showWhenEmpty && !header && !hasResponseData && !tradePlan?.enabled && !chart?.enabled && !metaItems.length && !history?.enabled) {
    return <div className="empty-state">{emptyText}</div>;
  }

  const tfTabs = Array.isArray(chart?.detailTfTabs) && chart.detailTfTabs.length ? chart.detailTfTabs : DEFAULT_TF_TABS;
  const tvSymbol = String(chart?.tvSymbol || toTradingViewSymbol(chart?.symbol || "")).trim();

  const availableTabs = useMemo(() => {
    const tabs = [];
    const hasRaw = response?.raw && typeof response.raw === "object" && Object.keys(response.raw).length > 0;
    const hasPlans = Array.isArray(response?.tradePlans) && response.tradePlans.length > 0;
    const trulyHasData = hasRaw || hasPlans;

    if (!trulyHasData && hideTabsBeforeResponse) return tabs;

    if (chart?.enabled) tabs.push("chart");
    if (trulyHasData) tabs.push("analysis");
    tabs.push("json");
    if (history?.enabled) tabs.push("history");
    if (!tabs.length && metaItems?.length) tabs.push("fields");
    return tabs;
  }, [chart?.enabled, response?.raw, response?.tradePlans, history?.enabled, metaItems, hideTabsBeforeResponse]);

  const [mainTab, setMainTab] = useState("fields");
  useEffect(() => {
    if (!availableTabs.includes(mainTab)) setMainTab(availableTabs[0] || "fields");
  }, [availableTabs, mainTab]);
   const [selectedTfs, setSelectedTfs] = useState([]);
  const [chartModes, setChartModes] = useState(['static', 'live']);
  const [multiChartData, setMultiChartData] = useState({});
  const [loadingCharts, setLoadingCharts] = useState(false);

  useEffect(() => {
    if (chart?.enabled) {
      const initial = [];
      
      // Default TFs based on User Request: { signal_TF, 15m, 4h, 1d }
      const signalTf = (chart.interval || '').toLowerCase();
      const defaults = [signalTf, '15m', '4h', 'd'];
      
      defaults.forEach(tf => {
        const t = String(tf || '').toLowerCase().trim();
        if (t && t !== 'entry' && !initial.includes(t)) initial.push(t);
      });

      setSelectedTfs(initial.sort((a, b) => (TF_WEIGHTS[a.toLowerCase()] || 0) - (TF_WEIGHTS[b.toLowerCase()] || 0)));
    }
  }, [chart?.enabled, chart?.interval]);

  useEffect(() => {
    if (mainTab === 'chart' && chart?.symbol && selectedTfs.length > 0 && chartModes.includes('static')) {
      let isMounted = true;
      setLoadingCharts(true);
      fetch(`/api/charts/multi?symbol=${encodeURIComponent(chart.symbol)}&tfs=${encodeURIComponent(selectedTfs.join(','))}`)
        .then(res => res.ok ? res.json() : null)
        .then(res => { if (isMounted && res?.ok) setMultiChartData(res.data || {}); })
        .finally(() => { if (isMounted) setLoadingCharts(false); });
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

  // Use raw data from multiple possible fields
  const rawData = response?.raw || response?.raw_json || response?.metadata || {};

  return (
    <div className="trade-detail-content">
      {/* Header - hide if trade plan is showing and it's a main signal/trade view to avoid duplication */}
      {header && !tradePlan?.enabled ? (
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: header.columns || preset.headerColumns, gap: 12, alignItems: "center" }}>
            <div className="cell-major">{header.left}</div>
            <div className="cell-major">{header.center}</div>
            <div style={{ textAlign: "right" }}>{header.rightTop}</div>
          </div>
        </div>
      ) : null}

      {/* Trade Plans */}
      {tradePlan?.enabled && (
        <div className="stack-layout" style={{ gap: 16, marginBottom: 24 }}>
          {(response?.tradePlans || [{ direction: tradePlan.value.direction, entry: tradePlan.value.entry, sl: tradePlan.value.sl, tp: tradePlan.value.tp, rr: tradePlan.value.rr, strategy: tradePlan.value.strategy, entryModel: tradePlan.value.entry_model, confidence: tradePlan.value.confidence_pct }]).map((p, i) => {
            const isMain = i === 0;
            const planId = isMain ? "main" : `suggested_${i}`;
            const isBuy = String(p.direction).toUpperCase() === "BUY";
            return (
              <div key={planId} style={{ 
                border: isMain ? '2px solid var(--accent-soft)' : '1px solid var(--accent-soft)', 
                padding: '12px 16px', 
                borderRadius: 10, 
                background: isMain ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)' 
              }}>
                <PlanHeader plan={p} planLabel={`Plan ${i + 1}`} symbol={chart?.symbol || "Plan"} isBuy={isBuy} />
                {isMain ? (
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
                ) : (
                  <ExtraPlanBlock 
                    planId={planId} plan={p} 
                    onAddSignal={tradePlan?.onAddSignal} onAddTrade={tradePlan?.onAddTrade}
                    busy={tradePlan?.busy} submittingPlanId={tradePlan?.submittingPlanId}
                    successMessage={tradePlan?.successMessage}
                  />
                )}
                {isMain && tradePlan.successMessage && <div style={{ marginTop: 8 }}><span className="minor-text msg-success">{tradePlan.successMessage}</span></div>}
              </div>
            );
          })}
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

      {/* FIELDS TAB */}
      <div style={{ display: mainTab === "fields" ? 'block' : 'none' }}>
        <div className="fields-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '20px',
          padding: '20px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}>
          {metaItems.map((item, i) => (
            <div key={i} style={{ 
              gridColumn: item.fullWidth ? '1 / -1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <span className="minor-text" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-bright)' }}>{item.label}</span>
              <div style={{ 
                fontSize: '13px', 
                color: 'var(--foreground)',
                wordBreak: 'break-word',
                fontWeight: 500,
                ...(item.valueStyle || {})
              }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHART TAB */}
      <div style={{ display: mainTab === "chart" ? 'block' : 'none' }}>
        <div className="chart-tab-content">
          <div className="chart-controls-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="tf-pills" style={{ display: 'flex', gap: 6 }}>
              {['1m', '5m', '15m', '1h', '4h', 'd', 'w'].map(tf => {
                const isSelected = selectedTfs.includes(tf.toLowerCase());
                const analysisObj = rawData;
                const tfData = (analysisObj?.market_analysis?.timeframes || []).find(x => String(x.tf || '').toLowerCase() === tf.toLowerCase());
                const trend = tfData?.trend || '';
                const bias = tfData?.bias || '';
                const isBullishTrend = String(trend).toLowerCase().includes('bull');
                const isBearishTrend = String(trend).toLowerCase().includes('bear');
                const isLongBias = String(bias).toLowerCase().includes('long') || String(bias).toLowerCase().includes('buy');
                const isShortBias = String(bias).toLowerCase().includes('short') || String(bias).toLowerCase().includes('sell');

                let bg = isSelected ? 'var(--accent-soft)' : 'rgba(255,255,255,0.03)';
                if (trend) bg = isBullishTrend ? 'rgba(38, 166, 154, 0.2)' : (isBearishTrend ? 'rgba(239, 83, 80, 0.2)' : bg);

                return (
                  <button key={tf} type="button" onClick={() => toggleTf(tf)}
                    style={{ 
                      padding: '4px 10px', fontSize: '11px', borderRadius: '4px', 
                      border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)', 
                      background: bg, backdropFilter: 'blur(4px)', color: isSelected ? 'var(--text)' : 'var(--muted)',
                      transition: 'all 0.2s ease', fontWeight: isSelected ? 'bold' : 'normal',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    {tf.toUpperCase()}
                    {bias && (
                      <span style={{ color: isLongBias ? '#26a69a' : (isShortBias ? '#ef5350' : 'inherit'), fontWeight: 900 }}>
                        {isLongBias ? '↑' : (isShortBias ? '↓' : '')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mode-toggles" style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 2, borderRadius: '6px' }}>
              <button type="button" className={`mode-btn ${chartModes.includes('static') ? 'active' : ''}`} onClick={() => toggleMode('static')} style={{ padding: '4px 12px', fontSize: '11px', border: 'none', background: chartModes.includes('static') ? 'var(--surface-light)' : 'transparent', borderRadius: '4px', color: chartModes.includes('static') ? 'var(--text)' : 'var(--muted)' }}>CHART</button>
              <button type="button" className={`mode-btn ${chartModes.includes('live') ? 'active' : ''}`} onClick={() => toggleMode('live')} style={{ padding: '4px 12px', fontSize: '11px', border: 'none', background: chartModes.includes('live') ? 'var(--surface-light)' : 'transparent', borderRadius: '4px', color: chartModes.includes('live') ? 'var(--text)' : 'var(--muted)' }}>LIVE</button>
            </div>
          </div>

          <div className="multi-chart-grid" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {selectedTfs.map(tf => {
              const isEntryTf = tf.toLowerCase() === (chart.interval || '').toLowerCase();
              const snapshot = isEntryTf ? rawData : multiChartData[tf];
              const analysisObj = rawData;
              const tfData = (analysisObj?.market_analysis?.timeframes || []).find(x => String(x.tf || '').toLowerCase() === tf.toLowerCase());
              const trend = tfData?.trend || '';
              const bias = tfData?.bias || '';
              const isBullishTrend = String(trend).toLowerCase().includes('bull');
              const isBearishTrend = String(trend).toLowerCase().includes('bear');
              const isLongBias = String(bias).toLowerCase().includes('long') || String(bias).toLowerCase().includes('buy');
              const isShortBias = String(bias).toLowerCase().includes('short') || String(bias).toLowerCase().includes('sell');

              return (
                <div key={tf} className="tf-chart-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <h4 className="tf-row-label" style={{ margin: 0, minWidth: '40px', fontSize: '13px' }}>{tf.toUpperCase()}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {trend && <span style={{ fontSize: '13px', fontWeight: 600, color: isBullishTrend ? '#26a69a' : (isBearishTrend ? '#ef5350' : 'var(--muted)') }}>{trend}</span>}
                      {bias && <span style={{ fontSize: '14px', fontWeight: 700, color: isLongBias ? '#26a69a' : (isShortBias ? '#ef5350' : 'var(--muted)'), display: 'flex', alignItems: 'center' }}>{isLongBias ? '↑' : (isShortBias ? '↓' : '')}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: chartModes.length > 1 ? '1fr 1fr' : '1fr', gap: 12 }}>
                    {chartModes.includes('static') && (
                      <div className="chart-wrapper static-wrapper">
                        {loadingCharts && !snapshot ? <div className="chart-loading" style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading {tf}...</div> : <TradeSignalChart symbol={chart?.symbol} interval={tf} analysisSnapshot={snapshot} entryPrice={chart?.entryPrice} slPrice={chart?.slPrice} tpPrice={chart?.tpPrice} />}
                      </div>
                    )}
                    {chartModes.includes('live') && (
                      <div className="chart-wrapper live-wrapper">
                        <iframe title={`TV-${tf}`} src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${detailTabToTvInterval(tf)}&theme=dark&style=1`} width="100%" height="100%" style={{ aspectRatio: '3 / 2', borderRadius: '8px', border: '1px solid var(--border)' }} frameBorder="0" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ANALYSIS TAB */}
      <div style={{ display: mainTab === "analysis" ? 'block' : 'none' }}>
        <div className="panel" style={{ padding: 16, margin: 0, lineHeight: 1.6, fontSize: '14px', background: 'var(--card-bg)', borderRadius: 12 }}>
          {(() => {
             const raw = rawData;
             const m = raw.market_analysis || {};
             const bias = m.bias || raw.bias || "N/A";
             const trend = m.trend || raw.trend || "N/A";
             const confluence = m.confluence || raw.confluence || "";
             let checklist = m.confluence_checklist || raw.confluence_checklist || m.checklist || raw.checklist || [];
             if (typeof checklist === 'string') checklist = [checklist];
             let filters = m.institutional_filters || raw.institutional_filters || [];
             const verdictObj = raw.final_verdict || m.final_verdict || {};
             const verdictText = typeof verdictObj === 'string' ? verdictObj : (verdictObj.action ? `${verdictObj.action}${verdictObj.confidence ? ` (${verdictObj.confidence}%)` : ''}` : "");
             const note = raw.note || m.note || (verdictObj && verdictObj.note) || (raw.trade_plan && raw.trade_plan.note) || "";
             const analysis = raw.analysis || m.analysis || "";
             return (
               <div className="analysis-summary-md">
                 <div style={{ marginBottom: 20 }}>
                    <div className="minor-text" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Bias & Trend</div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: bias.toLowerCase().includes('long') ? '#26a69a' : (bias.toLowerCase().includes('short') ? '#ef5350' : 'inherit') }}>{bias}</div>
                      <div style={{ color: 'var(--muted)' }}>•</div>
                      <div style={{ fontSize: '16px', fontWeight: 500 }}>{trend}</div>
                    </div>
                 </div>
                 {analysis && <div style={{ marginBottom: 20 }}><div className="minor-text" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Analysis</div><div style={{ whiteSpace: 'pre-wrap', marginBottom: 12, color: 'var(--foreground)', fontSize: '14px', lineHeight: 1.6 }}>{analysis}</div></div>}
                 {confluence && <div style={{ marginBottom: 20 }}><div className="minor-text" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Confluence</div><div style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }}>{confluence}</div></div>}
                 {Array.isArray(checklist) && checklist.length > 0 && <div style={{ marginBottom: 20 }}><div className="minor-text" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Checklist</div><ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', color: 'var(--muted)', fontSize: '13px' }}>{checklist.map((item, idx) => <li key={idx} style={{ marginBottom: 6 }}>{typeof item === 'object' ? `${item.item || item.condition || ''}${item.note ? `: ${item.note}` : ''}` : String(item)}</li>)}</ul></div>}
                 {verdictText && <div style={{ marginBottom: 20, padding: 12, background: 'rgba(38, 166, 154, 0.05)', borderRadius: 8, border: '1px solid rgba(38, 166, 154, 0.2)' }}><div className="minor-text" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Final Verdict</div><div style={{ fontWeight: 600, color: '#26a69a', fontSize: '15px' }}>{verdictText}</div></div>}
                 {note && <div style={{ marginTop: 24, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}><div className="minor-text" style={{ fontSize: '10px', marginBottom: 4 }}>NOTE</div><div style={{ fontStyle: 'italic', color: 'var(--muted)' }}>{note}</div></div>}
               </div>
             );
          })()}
        </div>
      </div>

      {/* JSON TAB */}
      <div style={{ display: mainTab === "json" ? 'block' : 'none' }}>
        <pre className="snapshot-mono-v2" style={{ padding: 16, background: 'rgba(0,0,0,0.3)', borderRadius: 12, overflow: 'auto', fontSize: '12px' }}>
          {JSON.stringify(rawData, null, 2)}
        </pre>
      </div>

      {/* HISTORY TAB */}
      <div style={{ display: mainTab === "history" ? 'block' : 'none' }}>
        {history?.loading ? <div className="minor-text">{preset.historyLoadingText}</div> : (
          <div className="telemetry-list">
            {(!history?.items || history.items.length === 0) ? <div className="minor-text">{preset.historyEmptyText}</div> : 
              history.items.map((item, i) => <div key={i} className="telemetry-item">{renderHistoryItem(item, i, { formatDateTime })}</div>)
            }
          </div>
        )}
      </div>
    </div>
  );
}
