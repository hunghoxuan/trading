# External 3rd-Party APIs

This document lists all external service integrations used by the Trading Bot, their purpose, and where they are implemented.

## 1. Market Data Providers

### **TwelveData**
- **Purpose**: Source of truth for Stock, Forex, and Index chart data (Candles).
- **Vendor**: [twelvedata.com](https://twelvedata.com/)
- **Usage Tracking**: Provides a `/usage` endpoint to manage "Credits" (Tokens) left.
- **Code Reference**: `webhook/server.js:7077` (`buildAnalysisSnapshotFromTwelve`)

### **Binance**
- **Purpose**: Market data and trade execution for Cryptocurrencies.
- **Vendor**: [binance.com](https://binance.com/)
- **Code Reference**: `webhook/server.js:8784` (`/api/proxy/binance`)

### **ForexFactory**
- **Purpose**: Real-time economic news feed (High-impact events).
- **Vendor**: [forexfactory.com](https://www.forexfactory.com/)
- **Code Reference**: `webhook/server.js` (`refreshEconomicCalendar`)

## 2. AI & Intelligence Providers

### **Anthropic (Claude)**
- **Purpose**: Advanced market analysis and signal generation.
- **Capabilities**: Uses the "Files Beta" API for context-heavy analysis.
- **Code Reference**: `webhook/server.js` (`anthropicFilesRequest`)

### **Google (Gemini)**
- **Purpose**: Secondary AI analysis and multi-model consensus.
- **Code Reference**: `webhook/server.js` (`GEMINI_API_KEY`)

### **OpenAI**
- **Purpose**: Alternative AI analysis provider.
- **Code Reference**: `webhook/server.js` (`OPENAI_API_KEY`)

## 3. Communication & Execution

### **Telegram**
- **Purpose**: Real-time trade alerts and system health notifications.
- **Code Reference**: `webhook/server.js` (`sendTelegramMessage`)

### **MetaTrader 5 (MT5)**
- **Purpose**: Live broker execution bridge.
- **Logic**: Operates via a custom MQL5 Expert Advisor connecting back to the server.

---

## FAQ: Managing "Tokens Left"

**Which vendor provides an API to manage tokens left?**
The **TwelveData API** is the primary vendor in this project that uses a "Credit/Token" system for market data requests. You can check your remaining credits via their `/usage` endpoint:
`https://api.twelvedata.com/usage?apikey=YOUR_API_KEY`

The AI providers (Anthropic, Google, OpenAI) typically use a billing/quota system rather than a "tokens left" counter in the API response, though their usage is logged locally in our `logs` table.
