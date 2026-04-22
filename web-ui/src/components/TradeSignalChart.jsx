import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

/**
 * Universal mapper to convert platform symbols to Binance-compatible ones.
 * Add more mappings here as needed.
 */
export function mapSymbolToBinance(rawSymbol) {
  if (!rawSymbol) return '';
  const s = String(rawSymbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  const map = {
    'BTCUSD': 'BTCUSDT',
    'ETHUSD': 'ETHUSDT',
    'BNBUSD': 'BNBUSDT',
    'SOLUSD': 'SOLUSDT',
    'XRPUSD': 'XRPUSDT',
    'ADAUSD': 'ADAUSDT',
    'DOTUSD': 'DOTUSDT',
    'DOGEUSD': 'DOGEUSDT',
    'XAUUSD': 'PAXGUSDT', // Gold proxy
    'XAGUSD': 'XAGUSDT',
  };

  if (map[s]) return map[s];

  // Generic fallback: if it ends with USD and is likely crypto, try USDT
  if (s.length >= 6 && s.endsWith('USD')) {
    return s + 'T';
  }

  return s;
}

/**
 * Mapper for Timeframes to Binance Klines interval format
 */
export function mapIntervalToBinance(tf) {
  if (!tf || tf === 'manual') return '1h';
  let s = String(tf).toLowerCase();
  
  // Binance valid: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
  if (s === '1' || s === '3' || s === '5' || s === '15' || s === '30') return s + 'm';
  if (s === '60') return '1h';
  if (s === '240') return '4h';
  if (s === '1440') return '1d';
  if (s === '10080') return '1w';
  if (s === '43200') return '1M';

  // If already tagged, return as is
  if (/[0-9]+[mhd]$/.test(s)) return s;
  
  return s;
}

function parseSnapshotBars(snapshot) {
  const bars = Array.isArray(snapshot?.bars) ? snapshot.bars : [];
  return bars
    .map((x) => {
      const t = Number(x?.time);
      const o = Number(x?.open);
      const h = Number(x?.high);
      const l = Number(x?.low);
      const c = Number(x?.close);
      if (!Number.isFinite(t) || !Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) return null;
      return { time: t, open: o, high: h, low: l, close: c };
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
}

function parsePdZoneBounds(item) {
  const asNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const lowRaw = asNum(item?.low ?? item?.bottom);
  const highRaw = asNum(item?.high ?? item?.top);
  if (lowRaw != null && highRaw != null) {
    return { low: Math.min(lowRaw, highRaw), high: Math.max(lowRaw, highRaw) };
  }
  const zone = String(item?.zone || "").trim();
  if (!zone) return null;
  const nums = zone.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  const a = Number(nums[0]);
  const b = Number(nums[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { low: Math.min(a, b), high: Math.max(a, b) };
}

function pdColorByType(typeRaw) {
  const t = String(typeRaw || "").toUpperCase();
  if (t.includes("OB")) return '#f59e0b';
  if (t.includes("FVG")) return '#a78bfa';
  if (t.includes("LIQ")) return '#ef4444';
  if (t.includes("S/R") || t.includes("SR")) return '#22c55e';
  return '#60a5fa';
}

function parseKeyLevels(snapshot) {
  const arr = Array.isArray(snapshot?.key_levels) ? snapshot.key_levels : [];
  return arr
    .map((x) => {
      const price = Number(x?.price ?? x?.level ?? x?.value);
      if (!Number.isFinite(price)) return null;
      return {
        name: String(x?.name || x?.label || "Key").trim() || "Key",
        price,
        kind: String(x?.kind || "generic"),
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function buildSummaryTexts(snapshot) {
  const s = snapshot?.summary && typeof snapshot.summary === "object" ? snapshot.summary : {};
  const parts = [];
  if (s.bias) parts.push(`Bias: ${s.bias}`);
  if (s.trend) parts.push(`Trend: ${s.trend}`);
  if (Number.isFinite(Number(s.confidence_pct))) parts.push(`Conf: ${Number(s.confidence_pct)}%`);
  if (s.profile) parts.push(`Profile: ${s.profile}`);
  const rows = [];
  if (parts.length) rows.push(parts.join(" | "));
  if (s.invalidation) rows.push(`Invalidation: ${String(s.invalidation).slice(0, 80)}`);
  if (s.note) rows.push(String(s.note).slice(0, 110));
  return rows.slice(0, 3);
}

function checklistText(snapshot) {
  const arr = Array.isArray(snapshot?.checklist) ? snapshot.checklist : [];
  const selected = arr.filter((x) => x?.checked).slice(0, 4).map((x) => `${x.strategy || "Rule"}:${x.condition || "ok"}`);
  if (!selected.length) return "";
  return `Checklist: ${selected.join(", ").slice(0, 140)}`;
}

function extractAnalysisSnapshot(analysisSnapshot) {
  if (analysisSnapshot && typeof analysisSnapshot === "object") return analysisSnapshot;
  return null;
}

export const TradeSignalChart = ({ 
  symbol = 'BTCUSDT', 
  interval = '1h', 
  historicalData = [], 
  live = true,
  entryPrice = null,
  slPrice = null,
  tpPrice = null,
  openedAt = null,
  closedAt = null,
  analysisSnapshot = null
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const socketRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState("");

  // Derive constants outside of useEffect so they can be used in dependency array
  const binanceSymbol = mapSymbolToBinance(symbol);
  const bInterval = mapIntervalToBinance(interval);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let isMounted = true;

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 380,
      layout: {
        background: { color: '#0d1117' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.1)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.4)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    // 2. Add Price Lines
    const asNum = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
    const ep = asNum(entryPrice);
    const sp = asNum(slPrice);
    const tp = asNum(tpPrice);

    if (ep) candleSeries.createPriceLine({ price: ep, color: '#2196f3', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'ENTRY' });
    if (sp) candleSeries.createPriceLine({ price: sp, color: '#ef5350', lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: 'SL' });
    if (tp) candleSeries.createPriceLine({ price: tp, color: '#26a69a', lineWidth: 2, lineStyle: 1, axisLabelVisible: true, title: 'TP' });

    // 3. Fetch History + Start Live
    async function initData() {
      let snapshot = extractAnalysisSnapshot(analysisSnapshot);
      let snapshotBars = parseSnapshotBars(snapshot);
      let hasSnapshotBars = snapshotBars.length > 0;
      if (!binanceSymbol && !hasSnapshotBars) return;
      try {
        setLoading(true);
        let candles = [];
        if (historicalData && historicalData.length > 0) {
          candles = historicalData;
          setDataSource("historical");
        } else if (hasSnapshotBars) {
          candles = snapshotBars;
          setDataSource("snapshot");
        } else {
          // Try Twelve Data on-demand (for old trades without stored snapshot)
          try {
            const r = await fetch(`/v2/chart/twelve/candles?symbol=${encodeURIComponent(symbol || "")}&timeframe=${encodeURIComponent(interval || "15m")}&bars=300`, {
              credentials: "include",
              cache: "no-store",
            });
            const j = await r.json().catch(() => ({}));
            const snap = j?.snapshot && typeof j.snapshot === "object" ? j.snapshot : null;
            const bars = parseSnapshotBars(snap);
            if (r.ok && bars.length > 0) {
              snapshot = snap;
              snapshotBars = bars;
              hasSnapshotBars = true;
              candles = bars;
              setDataSource("twelve");
            }
          } catch {
            // continue to Binance fallback
          }
        }

        if (!candles.length) {
          // If we have openedAt, we want to make sure we fetch enough data before it
          // Binance klines can take endTime (optional)
          const sParam = binanceSymbol || 'BTCUSDT'; 
          let query = `symbol=${sParam}&interval=${bInterval}&limit=500`;
          
          const endTs = closedAt ? new Date(closedAt).getTime() : Date.now();
          // Add some padding to see what happened after close
          const fetchEnd = endTs + (1000 * 3600 * 24); // +1 day padding
          
          // If the trade is very old, we need to use 'endTime' parameter in Binance API
          if (fetchEnd < Date.now() - (1000 * 3600)) {
             query += `&endTime=${fetchEnd}`;
          }

          const resp = await fetch(`/api/proxy/binance?${query}`);
          if (!resp.ok) {
             const errText = await resp.text();
             throw new Error(`Binance API error: ${resp.status} - ${errText}`);
          }
          const data = await resp.json();
          candles = data.map(d => ({
            time: d[0] / 1000,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4])
          }));
          setDataSource("binance");
        }

        if (isMounted) {
          candleSeries.setData(candles);

          // Add Markers for Open/Close + Analysis text
          const markers = [];
          if (openedAt) {
            const openTs = Math.floor(new Date(openedAt).getTime() / 1000);
            markers.push({ time: openTs, position: 'belowBar', color: '#2196f3', shape: 'arrowUp', text: 'START' });
          }
          if (closedAt) {
            const closeTs = Math.floor(new Date(closedAt).getTime() / 1000);
            markers.push({ time: closeTs, position: 'aboveBar', color: '#f68410', shape: 'arrowDown', text: 'END' });
          }
          const lastTs = candles.length ? Number(candles[candles.length - 1]?.time) : null;
          if (Number.isFinite(lastTs) && snapshot && typeof snapshot === "object") {
            const summaryRows = buildSummaryTexts(snapshot);
            summaryRows.forEach((txt, idx) => {
              markers.push({
                time: lastTs,
                position: idx % 2 === 0 ? 'aboveBar' : 'belowBar',
                color: '#94a3b8',
                shape: 'circle',
                text: txt,
              });
            });
            const chk = checklistText(snapshot);
            if (chk) {
              markers.push({ time: lastTs, position: 'belowBar', color: '#22c55e', shape: 'square', text: chk });
            }
          }
          if (markers.length > 0) candleSeries.setMarkers(markers);

          // Draw PD Array overlays from stored analysis snapshot
          const pdArrays = Array.isArray(snapshot?.pd_arrays) ? snapshot.pd_arrays : [];
          if (pdArrays.length) {
            pdArrays.slice(0, 30).forEach((pd, idx) => {
              const bounds = parsePdZoneBounds(pd);
              if (!bounds) return;
              const color = pdColorByType(pd?.type);
              candleSeries.createPriceLine({
                price: bounds.high,
                color,
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: false,
                title: `${String(pd?.type || "PD").toUpperCase()} ${String(pd?.timeframe || "").toUpperCase()}`.trim(),
              });
              candleSeries.createPriceLine({
                price: bounds.low,
                color,
                lineWidth: 1,
                lineStyle: 2,
                axisLabelVisible: false,
                title: "",
              });
              if (idx < 8) {
                const mid = (bounds.high + bounds.low) / 2;
                candleSeries.createPriceLine({
                  price: mid,
                  color,
                  lineWidth: 1,
                  lineStyle: 4,
                  axisLabelVisible: false,
                  title: "",
                });
              }
            });
          }

          // Draw key levels from analysis snapshot
          const keyLevels = parseKeyLevels(snapshot);
          keyLevels.forEach((k, idx) => {
            const color = k.kind === "pd" ? '#64748b' : '#f97316';
            candleSeries.createPriceLine({
              price: k.price,
              color,
              lineWidth: 1,
              lineStyle: 4,
              axisLabelVisible: idx < 8,
              title: idx < 8 ? `KEY ${k.name.slice(0, 18)}` : '',
            });
          });

          // Fit view to stored range first, then trade bounds
          const snapshotStart = Number(snapshot?.bar_start);
          const snapshotEnd = Number(snapshot?.bar_end);
          if (Number.isFinite(snapshotStart) && Number.isFinite(snapshotEnd) && snapshotEnd > snapshotStart) {
            const dur = snapshotEnd - snapshotStart;
            chart.timeScale().setVisibleRange({
              from: snapshotStart - (dur * 0.06),
              to: snapshotEnd + (dur * 0.06),
            });
          } else if (openedAt && closedAt) {
            const rangeStart = Math.floor(new Date(openedAt).getTime() / 1000);
            const rangeEnd = Math.floor(new Date(closedAt).getTime() / 1000);
            // Add 10% padding
            const dur = rangeEnd - rangeStart;
            chart.timeScale().setVisibleRange({
               from: rangeStart - (dur * 0.2),
               to: rangeEnd + (dur * 0.2)
            });
          } else if (openedAt) {
             const rangeStart = Math.floor(new Date(openedAt).getTime() / 1000);
             chart.timeScale().scrollToPosition(0, false); // Scroll to latest but we might want to center on start
          }
        }
      } catch (err) {
        console.error("Chart data fetch failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }

      // 4. Start WebSocket (only if not a settled historical trade)
      const isHistorical = closedAt && (new Date(closedAt).getTime() < Date.now() - 3600000);
      if (live && binanceSymbol && isMounted && !isHistorical) {
        if (hasSnapshotBars) return;
        const socketUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@kline_${bInterval}`;
        const socket = new WebSocket(socketUrl);
        socket.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.e === 'kline') {
            const k = msg.k;
            const liveCandle = {
              time: k.t / 1000,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
            };
            if (isMounted) candleSeries.update(liveCandle);
          }
        };
        socketRef.current = socket;
      }
    }

    initData();

    // Resize handling
    const handleResize = () => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (socketRef.current) socketRef.current.close();
      chart.remove();
    };
  }, [binanceSymbol, bInterval, openedAt, closedAt, JSON.stringify(analysisSnapshot)]); // Re-init if bounds change

  return (
    <div className="chart-wrapper" style={{ position: 'relative', width: '100%', minHeight: '420px' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13, 17, 23, 0.7)', zIndex: 10, borderRadius: '8px' }}>
          <div className="loading-small">Loading Chart Data...</div>
        </div>
      )}
      <div 
        ref={chartContainerRef} 
        style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #30363d' }} 
      />
      <div style={{ padding: '8px', fontSize: '11px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}>
        <span>{symbol} {binanceSymbol !== symbol ? `(mapped to ${binanceSymbol} on Binance)` : `(${interval})`} [{bInterval}]</span>
        {(dataSource === "snapshot" || analysisSnapshot?.status === "ok")
          ? <span style={{ color: '#22c55e' }}>● Snapshot: TwelveData</span>
          : dataSource === "twelve"
            ? <span style={{ color: '#22c55e' }}>● TwelveData (on-demand)</span>
            : (live && binanceSymbol && <span style={{ color: '#26a69a' }}>● Streaming (Binance)</span>)}
      </div>
    </div>
  );
};
