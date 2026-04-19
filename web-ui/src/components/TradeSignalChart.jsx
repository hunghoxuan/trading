import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

/**
 * TradeSignalChart
 * A reusable lightweight-charts component for Trade/Signal details.
 * Supports historical data and live Binance WebSocket simulation.
 * 
 * @param {Object} props
 * @param {string} props.symbol - Symbol like "BTCUSDT" or "EURUSD"
 * @param {string} props.interval - Chart interval like "1m", "5m", "1h"
 * @param {Array} props.historicalData - Initial candles [{time, open, high, low, close}]
 * @param {boolean} props.live - Whether to connect to Binance WebSocket for live updates
 * @param {number} props.entryPrice - Optional entry price for a horizontal line
 * @param {number} props.slPrice - Optional SL price for a horizontal line
 * @param {number} props.tpPrice - Optional TP price for a horizontal line
 */
export const TradeSignalChart = ({ 
  symbol = 'BTCUSDT', 
  interval = '1m', 
  historicalData = [], 
  live = false,
  entryPrice = null,
  slPrice = null,
  tpPrice = null
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#0d1117' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
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

    if (historicalData && historicalData.length > 0) {
      candleSeries.setData(historicalData);
    }

    // 2. Add Price Lines if provided
    if (entryPrice) {
      candleSeries.createPriceLine({
        price: entryPrice,
        color: '#2196f3',
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: 'ENTRY',
      });
    }
    if (slPrice) {
      candleSeries.createPriceLine({
        price: slPrice,
        color: '#ef5350',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'SL',
      });
    }
    if (tpPrice) {
      candleSeries.createPriceLine({
        price: tpPrice,
        color: '#26a69a',
        lineWidth: 2,
        lineStyle: 1, // Dotted
        axisLabelVisible: true,
        title: 'TP',
      });
    }

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    // 3. Resize Handling
    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    // 4. optional Live Binance WebSocket
    if (live && symbol) {
      const bSymbol = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
      const socketUrl = `wss://stream.binance.com:9443/ws/${bSymbol}@kline_${interval}`;
      const socket = new WebSocket(socketUrl);

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const candle = message.k;
        const candleData = {
          time: candle.t / 1000,
          open: parseFloat(candle.o),
          high: parseFloat(candle.h),
          low: parseFloat(candle.l),
          close: parseFloat(candle.c),
        };
        candleSeries.update(candleData);
      };

      socketRef.current = socket;
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (socketRef.current) socketRef.current.close();
      chart.remove();
    };
  }, [symbol, interval, live, entryPrice, slPrice, tpPrice]); // Re-init if core props change

  return (
    <div className="chart-wrapper" style={{ position: 'relative', width: '100%', marginBottom: '20px' }}>
      <div 
        ref={chartContainerRef} 
        style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #30363d' }} 
      />
      <div style={{ padding: '8px', fontSize: '12px', color: '#8b949e', display: 'flex', justifyContent: 'space-between' }}>
        <span>{symbol} ({interval})</span>
        {live && <span style={{ color: '#26a69a' }}>● Live (Binance)</span>}
      </div>
    </div>
  );
};
