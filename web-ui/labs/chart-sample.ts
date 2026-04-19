import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';

// --- 1. CẤU HÌNH BIỂU ĐỒ (CHART KONFIGURATION) ---
const chartOptions = {
    layout: {
        backgroundColor: '#131722',
        textColor: '#d1d4dc',
    },
    grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
    },
    crosshair: {
        mode: 0, // CrosshairMode.Normal
    },
    timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: false,
    },
};

const chartContainer = document.getElementById('chart') as HTMLElement;
const chart: IChartApi = createChart(chartContainer, { width: 800, height: 600, ...chartOptions });
const candleSeries: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
});

// --- 2. KẾT NỐI WEBSOCKET BINANCE (LIVE-DATENVERBINDUNG) ---
const symbol = 'btcusdt';
const interval = '1m';
const socketUrl = `wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`;

const binanceSocket = new WebSocket(socketUrl);

binanceSocket.onmessage = (event: MessageEvent) => {
    const message = JSON.parse(event.data);
    const candle = message.k;

    // Chuyển đổi dữ liệu Binance sang định dạng Lightweight Charts
    const candleData: CandlestickData = {
        time: (candle.t / 1000) as Time, // Binance dùng ms, Chart dùng s
        open: parseFloat(candle.o),
        high: parseFloat(candle.h),
        low: parseFloat(candle.l),
        close: parseFloat(candle.c),
    };

    // Cập nhật biểu đồ (Update thực hiện tự động vẽ nến mới hoặc cập nhật nến hiện tại)
    candleSeries.update(candleData);
};

binanceSocket.onclose = () => {
    console.log("WebSocket đóng (Verbindung geschlossen)");
};

binanceSocket.onerror = (error: Event) => {
    console.error("Lỗi WebSocket (Fehler):", error);
};

// --- 3. TỐI ƯU HÓA RESPONSIVE (RESPONSIVES DESIGN) ---
window.addEventListener('resize', () => {
    chart.applyOptions({ width: chartContainer.clientWidth, height: chartContainer.clientHeight });
});