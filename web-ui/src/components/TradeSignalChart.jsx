import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

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
  const asNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
  const lowRaw = asNum(item?.low ?? item?.bottom);
  const highRaw = asNum(item?.high ?? item?.top);
  if (lowRaw != null && highRaw != null) {
    return { low: Math.min(lowRaw, highRaw), high: Math.max(lowRaw, highRaw) };
  }
  const zone = String(item?.zone || '').trim();
  if (!zone) return null;
  const nums = zone.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  const a = Number(nums[0]);
  const b = Number(nums[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { low: Math.min(a, b), high: Math.max(a, b) };
}

function parseKeyLevels(snapshot) {
  const arr = Array.isArray(snapshot?.key_levels) ? snapshot.key_levels : [];
  return arr
    .map((x) => {
      const price = Number(x?.price ?? x?.level ?? x?.value);
      if (!Number.isFinite(price)) return null;
      return {
        name: String(x?.name || x?.label || 'Key').trim() || 'Key',
        price,
        kind: String(x?.kind || 'generic'),
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function buildSummaryTexts(snapshot) {
  const s = snapshot?.summary && typeof snapshot.summary === 'object' ? snapshot.summary : {};
  const parts = [];
  if (s.bias) parts.push(`Bias: ${s.bias}`);
  if (s.trend) parts.push(`Trend: ${s.trend}`);
  if (Number.isFinite(Number(s.confidence_pct))) parts.push(`Conf: ${Number(s.confidence_pct)}%`);
  if (s.profile) parts.push(`Profile: ${s.profile}`);
  const rows = [];
  if (parts.length) rows.push(parts.join(' | '));
  if (s.invalidation) rows.push(`Invalidation: ${String(s.invalidation).slice(0, 80)}`);
  if (s.note) rows.push(String(s.note).slice(0, 110));
  return rows.slice(0, 3);
}

function checklistText(snapshot) {
  const arr = Array.isArray(snapshot?.checklist) ? snapshot.checklist : [];
  const selected = arr.filter((x) => x?.checked).slice(0, 4).map((x) => `${x.strategy || 'Rule'}:${x.condition || 'ok'}`);
  if (!selected.length) return '';
  return `Checklist: ${selected.join(', ').slice(0, 140)}`;
}

function extractAnalysisSnapshot(analysisSnapshot) {
  if (analysisSnapshot && typeof analysisSnapshot === 'object') return analysisSnapshot;
  return null;
}

/**
 * Lightweight Charts custom primitive that draws a filled semi-transparent rectangle
 * between two price levels from bar_start to the last visible bar.
 */
class PdArrayBoxPrimitive {
  constructor(barStartSec, priceLow, priceHigh, color) {
    this._barStart = barStartSec; // unix seconds
    this._priceLow = priceLow;
    this._priceHigh = priceHigh;
    this._color = color;
    this._series = null;
    this._chart = null;
  }

  attached({ series, chart }) {
    this._series = series;
    this._chart = chart;
  }

  detached() {
    this._series = null;
    this._chart = null;
  }

  updateAllViews() {}

  priceAxisViews() { return []; }

  paneViews() {
    return [{
      renderer: {
        draw: (target) => {
          if (!this._series || !this._chart) return;
          target.useBitmapCoordinateSpace((scope) => {
            const ctx = scope.context;
            const r = scope.bitmapSize;
            const ts = this._chart.timeScale();
            const ps = this._series;

            // Convert prices to y-pixels
            const yHigh = ps.priceToCoordinate(this._priceHigh);
            const yLow = ps.priceToCoordinate(this._priceLow);
            if (yHigh == null || yLow == null) return;

            // Convert bar_start time to x-pixel
            const xStart = ts.timeToCoordinate(this._barStart);
            if (xStart == null) return;

            const pixelRatio = scope.horizontalPixelRatio || 1;
            const pixelRatioY = scope.verticalPixelRatio || 1;

            const x0 = Math.max(0, Math.round(xStart * pixelRatio));
            const x1 = r.width;
            const y0 = Math.round(Math.min(yHigh, yLow) * pixelRatioY);
            const y1 = Math.round(Math.max(yHigh, yLow) * pixelRatioY);
            const h = y1 - y0;
            if (h <= 0 || x1 - x0 <= 0) return;

            // Fill
            ctx.save();
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = this._color;
            ctx.fillRect(x0, y0, x1 - x0, h);

            // Border lines (top & bottom)
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = this._color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x0, y1);
            ctx.lineTo(x1, y1);
            ctx.stroke();
            ctx.restore();
          });
        },
      },
    }];
  }
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
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState("");

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
            // Twelve fetch failed
          }
        }

        if (!candles.length) {
          throw new Error("No snapshot/Twelve bars available for this symbol/timeframe.");
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

          // Draw PD Array overlays — boxes for active zones, colored by HTF tier
          const pdArrays = Array.isArray(snapshot?.pd_arrays) ? snapshot.pd_arrays : [];
          const htfTfs = Array.isArray(snapshot?.htf_tfs) ? snapshot.htf_tfs : [];

          // Helper: normalize timeframe strings for comparison
          const normTf = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g, '');
          const htf1 = normTf(htfTfs[0] || '');
          const htf2 = normTf(htfTfs[1] || '');

          const COLOR_HTF1 = '#f59e0b'; // yellow
          const COLOR_HTF2 = '#a855f7'; // purple
          const COLOR_DEFAULT = '#60a5fa'; // blue fallback

          const lastBarTime = candles.length ? Number(candles[candles.length - 1]?.time) : null;

          const activePdArrays = pdArrays.filter((pd) => {
            const status = String(pd?.status || '').toLowerCase();
            return status === 'active' || status === ''; // include if status missing
          });

          activePdArrays.slice(0, 40).forEach((pd) => {
            const bounds = parsePdZoneBounds(pd);
            if (!bounds) return;

            // Determine color by which HTF tier the timeframe belongs to
            const pdTf = normTf(pd?.timeframe || '');
            let color = COLOR_DEFAULT;
            if (htf1 && pdTf === htf1) color = COLOR_HTF1;
            else if (htf2 && pdTf === htf2) color = COLOR_HTF2;
            else if (htf1 && !htf2) color = COLOR_HTF1; // all are HTF1 if only one HTF

            // bar_start: use provided value or fall back to first bar
            const barStartRaw = Number(pd?.bar_start);
            const barStart = Number.isFinite(barStartRaw) && barStartRaw > 0
              ? barStartRaw
              : (candles.length ? Number(candles[0]?.time) : null);

            if (!barStart || !lastBarTime) return;

            // Attach box primitive to the candle series
            const primitive = new PdArrayBoxPrimitive(barStart, bounds.low, bounds.high, color);
            candleSeries.attachPrimitive(primitive);
          });

          // Draw key levels as clean horizontal lines (no text)
          const keyLevels = parseKeyLevels(snapshot);
          keyLevels.forEach((k) => {
            candleSeries.createPriceLine({
              price: k.price,
              color: '#f97316',
              lineWidth: 1,
              lineStyle: 4,
              axisLabelVisible: false,
              title: '',
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
      chart.remove();
    };
  }, [symbol, interval, openedAt, closedAt, JSON.stringify(analysisSnapshot), JSON.stringify(historicalData), live]); // Re-init if bounds change

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
        <span>{symbol} ({interval})</span>
        {(dataSource === "snapshot" || analysisSnapshot?.status === "ok")
          ? <span style={{ color: '#22c55e' }}>● Snapshot: TwelveData</span>
          : dataSource === "twelve"
            ? <span style={{ color: '#22c55e' }}>● TwelveData (on-demand)</span>
            : <span style={{ color: '#94a3b8' }}>● No data</span>}
      </div>
    </div>
  );
};
