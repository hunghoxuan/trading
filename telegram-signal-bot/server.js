"use strict";

const http = require("http");
const { URL } = require("url");

function loadEnvFile() {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 80);
const SIGNAL_API_KEY = process.env.SIGNAL_API_KEY || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error(
    "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. Set them in environment or .env."
  );
  process.exit(1);
}

function json(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function formatSignal(payload) {
  const strategy = payload.strategy || payload.system || "UnknownStrategy";
  const symbol = payload.symbol || payload.ticker || "UnknownSymbol";
  const side = payload.side || payload.action || "UNKNOWN";
  const timeframe = payload.timeframe || payload.tf || "n/a";
  const price = payload.price ?? payload.entry ?? "n/a";
  const sl = payload.stop_loss ?? payload.sl ?? "n/a";
  const tp = payload.take_profit ?? payload.tp ?? "n/a";
  const note = payload.note || payload.comment || "";
  const signalTime = payload.time || payload.timestamp || new Date().toISOString();

  return [
    "New Trade Signal",
    `Strategy: ${strategy}`,
    `Symbol: ${symbol}`,
    `Side: ${side}`,
    `Timeframe: ${timeframe}`,
    `Price: ${price}`,
    `SL: ${sl}`,
    `TP: ${tp}`,
    `Time: ${signalTime}`,
    note ? `Note: ${note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendTelegram(text) {
  const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }
  return data;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true, service: "telegram-signal-bot" });
  }

  if (req.method === "POST" && url.pathname === "/signal") {
    try {
      const payload = await readJson(req);
      const incomingHeaderApiKey = req.headers["x-api-key"] || "";
      const incomingBodyApiKey = payload.apiKey || payload.api_key || "";
      const incomingApiKey = incomingHeaderApiKey || incomingBodyApiKey;
      if (SIGNAL_API_KEY && incomingApiKey !== SIGNAL_API_KEY) {
        return json(res, 401, { ok: false, error: "Unauthorized" });
      }

      const text = formatSignal(payload);
      await sendTelegram(text);
      return json(res, 200, { ok: true });
    } catch (error) {
      return json(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return json(res, 404, { ok: false, error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`telegram-signal-bot listening on http://0.0.0.0:${PORT}`);
});
