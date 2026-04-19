import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

/**
 * Symbol helper to map common broker symbols to Binance
 */
function mapToBinance(symbol) {
  if (!symbol) return '';
  let s = String(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Mapping logic
  if (s === 'BTCUSD') return 'BTCUSDT';
  if (s === 'ETHUSD') return 'ETHUSDT';
  if (s === 'XAUUSD') return 'PAXGUSDT'; // Best crypto proxy for gold on Binance
  if (s === 'XAGUSD') return 'XAGUSDT';
  if (s === 'SOLUSD') return 'SOLUSDT';
  if (s === 'BNBUSD') return 'BNBUSDT';
  // If it's 6 characters ending in USD, append T
  if (s.length === 6 && s.endsWith('USD')) return s + 'T';
  return s;
}

export const TradeSignalChart = ({ 
  symbol = 'BTCUSDT', 
  interval = '1h', 
  historicalData = [], 
  live = true,
  entryPrice = null,
  slPrice = null,
  tpPrice = null
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const socketRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Normalize interval for Binance
  const bInterval = (interval || '1h').toLowerCase().replace('manual', '1h');

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let isMounted = true;
    const binanceSymbol = mapToBinance(symbol);

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
      try {
        setLoading(true);
        // If no data provided, try fetching from Binance
        if (historicalData && historicalData.length > 0) {
          candleSeries.setData(historicalData);
        } else if (binanceSymbol) {
          const resp = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${bInterval}&limit=500`);
          if (!resp.ok) throw new Error(\`Binance API error: \${resp.status}\`);
          const data = await resp.json();
          const candles = data.map(d => ({
            time: d[0] / 1000,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4])
          }));
          if (isMounted) candleSeries.setData(candles);
        }
      } catch (err) {
        console.error("Chart data fetch failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }

      // 4. Start WebSocket
      if (live && binanceSymbol && isMounted) {
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
  }, [symbol, binanceSymbol, bInterval]); // Re-init on symbol/interval change

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
        <span>{symbol} {interval !== bInterval ? `(${interval} mapped to ${bInterval})` : `(${interval})`}</span>
        {live && <span style={{ color: '#26a69a' }}>● Streaming (Binance)</span>}
      </div>
    </div>
  );
};
