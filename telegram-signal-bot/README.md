# Telegram Signal Bot

Lightweight webhook receiver to forward trading signals to Telegram.

## 1) Create Telegram bot + get chat id

1. Open Telegram and talk to `@BotFather`.
2. Run `/newbot`, create bot name + username.
3. Copy bot token.
4. Send at least one message to your new bot from your Telegram account.
5. Open this URL in browser (replace token):
   - `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
6. Find `chat.id` in the JSON response. That is your `TELEGRAM_CHAT_ID`.

## 2) Configure environment

```bash
cd telegram-signal-bot
cp .env.example .env
```

Update `.env`:

```env
PORT=80
SIGNAL_API_KEY=your_secret_key
TELEGRAM_BOT_TOKEN=123456789:xxxx
TELEGRAM_CHAT_ID=123456789
```

## 3) Run bot

```bash
npm start
```

Health check:

```bash
curl http://localhost:80/health
```

## 4) Send a test signal

```bash
curl -X POST http://localhost:80/signal \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "Hung-Core",
    "symbol": "BTCUSDT",
    "side": "BUY",
    "timeframe": "15m",
    "price": 68123.5,
    "sl": 67650,
    "tp": 68950,
    "note": "MSS + PDArray confluence",
    "apiKey": "your_secret_key"
  }'
```

You should receive message in Telegram immediately.

## 5) Connect from TradingView alert webhook

- TradingView alert webhook URL: `https://<your-domain>/signal`
- TradingView does not support custom headers. Put `apiKey` in JSON payload body.
- This receiver accepts either `x-api-key` header or `apiKey` in body.

## Deployment notes (cheap)

- Lowest effort: deploy this folder to Render/Fly/Railway free/low-tier.
- VPS option: smallest VM + `pm2`:
  - `pm2 start server.js --name telegram-signal-bot`
  - `pm2 save`
