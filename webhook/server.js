"use strict";

const crypto = require("crypto");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL, URLSearchParams } = require("url");

function loadEnvFile() {
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

function asBool(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const raw = String(value).trim();
  if (raw === "") {
    return fallback;
  }
  const v = raw.toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function asNum(value, fallback = NaN) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "string" && value.trim() === "") {
    return fallback;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseKeySet(value) {
  return new Set(envStr(value).split(",").map((s) => s.trim()).filter(Boolean));
}

function envStr(value, fallback = "") {
  if (value === undefined || value === null) {
    return fallback;
  }
  const s = String(value).trim();
  return s === "" ? fallback : s;
}

loadEnvFile();

const CFG = {
  port: asNum(process.env.PORT, 80),
  signalApiKey: envStr(process.env.SIGNAL_API_KEY),

  telegramBotToken: envStr(process.env.TELEGRAM_BOT_TOKEN),
  telegramChatId: envStr(process.env.TELEGRAM_CHAT_ID),

  allowSymbols: envStr(process.env.ALLOW_SYMBOLS).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),

  binanceMode: envStr(process.env.BINANCE_MODE).toLowerCase(),
  binanceProduct: envStr(process.env.BINANCE_PRODUCT, "spot").toLowerCase(),
  binanceApiKey: envStr(process.env.BINANCE_API_KEY),
  binanceApiSecret: envStr(process.env.BINANCE_API_SECRET),
  binanceRecvWindow: asNum(process.env.BINANCE_RECV_WINDOW, 5000),
  binanceDefaultQty: asNum(process.env.BINANCE_DEFAULT_QTY, NaN),
  binanceDefaultQuoteQty: asNum(process.env.BINANCE_DEFAULT_QUOTE_QTY, NaN),

  ctraderMode: envStr(process.env.CTRADER_MODE).toLowerCase(),
  ctraderExecutorUrl: envStr(process.env.CTRADER_EXECUTOR_URL),
  ctraderExecutorApiKey: envStr(process.env.CTRADER_EXECUTOR_API_KEY),

  maxRiskPct: asNum(process.env.MAX_RISK_PCT, NaN),

  // MT5 bridge (merged into this same server.js)
  mt5Enabled: asBool(process.env.MT5_ENABLED, true),
  mt5Storage: envStr(process.env.MT5_STORAGE, "sqlite").toLowerCase(),
  mt5TvAlertApiKeys: parseKeySet(process.env.MT5_TV_ALERT_API_KEYS),
  mt5EaApiKeys: parseKeySet(process.env.MT5_EA_API_KEYS),
  mt5DefaultLot: asNum(process.env.MT5_DEFAULT_LOT, 0.01),
  mt5DbPath: path.resolve(
    __dirname,
    envStr(process.env.MT5_DB_PATH) ||
      ((envStr(process.env.MT5_STORAGE, "sqlite").toLowerCase() === "json")
        ? "./mt5-signals.json"
        : "./mt5-signals.db"),
  ),
  mt5PostgresUrl: envStr(process.env.MT5_POSTGRES_URL) || envStr(process.env.POSTGRES_URL) || envStr(process.env.POSTGRE_URL),
};

CFG.binanceEnabled = ["paper", "live"].includes(CFG.binanceMode);
CFG.ctraderEnabled = ["demo", "live"].includes(CFG.ctraderMode);

// Convenience fallback: if MT5 keys are not set, reuse SIGNAL_API_KEY.
if (CFG.signalApiKey) {
  if (CFG.mt5TvAlertApiKeys.size === 0) {
    CFG.mt5TvAlertApiKeys = new Set([CFG.signalApiKey]);
  }
  if (CFG.mt5EaApiKeys.size === 0) {
    CFG.mt5EaApiKeys = new Set([CFG.signalApiKey]);
  }
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

function normalizeSide(sideRaw) {
  const s = String(sideRaw || "").toUpperCase();
  if (s === "BUY" || s === "LONG") return "BUY";
  if (s === "SELL" || s === "SHORT") return "SELL";
  throw new Error("Invalid side");
}

function normalizeSignal(payload) {
  const strategy = String(payload.strategy || payload.system || "UnknownStrategy");
  const symbol = String(payload.symbol || payload.ticker || "").toUpperCase();
  const side = normalizeSide(payload.side || payload.action);
  const timeframe = String(payload.timeframe || payload.tf || "n/a");
  const price = asNum(payload.price ?? payload.entry, NaN);
  const sl = asNum(payload.stop_loss ?? payload.sl, NaN);
  const tp = asNum(payload.take_profit ?? payload.tp, NaN);
  const note = String(payload.note || payload.comment || "");
  const signalTime = payload.time || payload.timestamp || new Date().toISOString();
  const quantity = asNum(payload.quantity ?? payload.qty, NaN);

  if (!symbol) throw new Error("Missing symbol");
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid price");

  return {
    strategy,
    symbol,
    side,
    timeframe,
    price,
    sl: Number.isFinite(sl) ? sl : null,
    tp: Number.isFinite(tp) ? tp : null,
    note,
    signalTime,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    raw: payload,
  };
}

function enforceRiskAndPolicy(signal) {
  if (CFG.allowSymbols.length > 0 && !CFG.allowSymbols.includes(signal.symbol)) {
    throw new Error(`Symbol ${signal.symbol} is not in ALLOW_SYMBOLS`);
  }

  if (Number.isFinite(CFG.maxRiskPct) && signal.sl !== null) {
    const risk = Math.abs(signal.price - signal.sl);
    const riskPct = signal.price > 0 ? (risk / signal.price) * 100 : 0;
    if (riskPct > CFG.maxRiskPct) {
      throw new Error(`Risk ${riskPct.toFixed(2)}% exceeds MAX_RISK_PCT ${CFG.maxRiskPct}%`);
    }
  }
}

function formatTime(time) {
  return new Date(time).toLocaleString();
}

function formatSignal(signal, execReport) {
  return [
    `${signal.side} ${signal.symbol} | ${formatTime(signal.signalTime)}`,
    `Entry: ${signal.price} | SL: ${signal.sl ?? "n/a"} | TP: ${signal.tp ?? "n/a"}`,
    `${signal.strategy}: ${signal.note}. ${execReport}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendTelegram(text) {
  if (!CFG.telegramBotToken || !CFG.telegramChatId) {
    return { ok: false, skipped: true, reason: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID" };
  }
  const endpoint = `https://api.telegram.org/bot${CFG.telegramBotToken}/sendMessage`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CFG.telegramChatId,
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

function binanceBaseUrl() {
  if (CFG.binanceProduct === "um_futures") {
    return CFG.binanceMode === "live"
      ? "https://fapi.binance.com"
      : "https://testnet.binancefuture.com";
  }
  return CFG.binanceMode === "live"
    ? "https://api.binance.com"
    : "https://testnet.binance.vision";
}

function signQuery(query, secret) {
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

async function binanceSignedRequest(method, route, params) {
  const timestamp = Date.now();
  const allParams = {
    ...params,
    recvWindow: CFG.binanceRecvWindow,
    timestamp,
  };
  const query = new URLSearchParams(allParams).toString();
  const signature = signQuery(query, CFG.binanceApiSecret);
  const url = `${binanceBaseUrl()}${route}?${query}&signature=${signature}`;

  const res = await fetch(url, {
    method,
    headers: { "X-MBX-APIKEY": CFG.binanceApiKey },
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`Binance ${route} failed ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function resolveBinanceSizing(signal) {
  if (signal.quantity && signal.quantity > 0) {
    return { quantity: String(signal.quantity) };
  }
  if (Number.isFinite(CFG.binanceDefaultQty) && CFG.binanceDefaultQty > 0) {
    return { quantity: String(CFG.binanceDefaultQty) };
  }
  if (
    CFG.binanceProduct === "spot" &&
    signal.side === "BUY" &&
    Number.isFinite(CFG.binanceDefaultQuoteQty) &&
    CFG.binanceDefaultQuoteQty > 0
  ) {
    return { quoteOrderQty: String(CFG.binanceDefaultQuoteQty) };
  }
  throw new Error("No valid quantity. Provide signal.quantity or BINANCE_DEFAULT_QTY (or BINANCE_DEFAULT_QUOTE_QTY for spot BUY)");
}

async function executeBinance(signal) {
  if (!CFG.binanceEnabled) {
    const reason = CFG.binanceMode
      ? "BINANCE_MODE invalid (use paper|live, or empty to disable)"
      : "BINANCE_MODE empty (disabled)";
    return { broker: "binance", status: "skipped", reason };
  }
  if (!CFG.binanceApiKey || !CFG.binanceApiSecret) {
    return { broker: "binance", status: "skipped", reason: "Missing BINANCE_API_KEY/SECRET" };
  }
  if (!["spot", "um_futures"].includes(CFG.binanceProduct)) {
    throw new Error("BINANCE_PRODUCT must be spot|um_futures");
  }

  const clientOrderId = `tv_${signal.strategy}_${signal.symbol}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 36);
  const sizing = resolveBinanceSizing(signal);


  if (CFG.binanceProduct === "spot") {
    const order = await binanceSignedRequest("POST", "/api/v3/order", {
      symbol: signal.symbol,
      side: signal.side,
      type: "MARKET",
      newClientOrderId: clientOrderId,
      ...sizing,
    });

    return {
      broker: "binance",
      status: "submitted",
      product: "spot",
      orderId: order.orderId,
      clientOrderId,
    };
  }

  const entry = await binanceSignedRequest("POST", "/fapi/v1/order", {
    symbol: signal.symbol,
    side: signal.side,
    type: "MARKET",
    newClientOrderId: clientOrderId,
    quantity: sizing.quantity,
  });

  const protective = [];
  const closeSide = signal.side === "BUY" ? "SELL" : "BUY";

  if (signal.sl !== null) {
    const slRes = await binanceSignedRequest("POST", "/fapi/v1/order", {
      symbol: signal.symbol,
      side: closeSide,
      type: "STOP_MARKET",
      stopPrice: String(signal.sl),
      closePosition: "true",
      reduceOnly: "true",
      workingType: "MARK_PRICE",
    });
    protective.push({ type: "SL", orderId: slRes.orderId });
  }

  if (signal.tp !== null) {
    const tpRes = await binanceSignedRequest("POST", "/fapi/v1/order", {
      symbol: signal.symbol,
      side: closeSide,
      type: "TAKE_PROFIT_MARKET",
      stopPrice: String(signal.tp),
      closePosition: "true",
      reduceOnly: "true",
      workingType: "MARK_PRICE",
    });
    protective.push({ type: "TP", orderId: tpRes.orderId });
  }

  return {
    broker: "binance",
    status: "submitted",
    product: "um_futures",
    orderId: entry.orderId,
    clientOrderId,
    protective,
  };
}

async function executeCTrader(signal) {
  if (!CFG.ctraderEnabled) {
    const reason = CFG.ctraderMode
      ? "CTRADER_MODE invalid (use demo|live, or empty to disable)"
      : "CTRADER_MODE empty (disabled)";
    return { broker: "ctrader", status: "skipped", reason };
  }
  if (!CFG.ctraderExecutorUrl) {
    return { broker: "ctrader", status: "skipped", reason: "Set CTRADER_EXECUTOR_URL" };
  }


  const headers = { "Content-Type": "application/json" };
  if (CFG.ctraderExecutorApiKey) {
    headers["x-api-key"] = CFG.ctraderExecutorApiKey;
  }

  const res = await fetch(CFG.ctraderExecutorUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mode: CFG.ctraderMode,
      signal,
    }),
  });

  const bodyText = await res.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = { raw: bodyText };
  }

  if (!res.ok) {
    throw new Error(`cTrader executor failed ${res.status}: ${JSON.stringify(body)}`);
  }

  return {
    broker: "ctrader",
    status: "submitted",
    mode: CFG.ctraderMode,
    response: body,
  };
}

function buildExecSummary(execResults) {
  return execResults
    .map((r) => {
      const broker = r.broker || "broker";
      const status = r.status || "unknown";
      const detail = r.reason ? `(${r.reason})` : r.orderId ? `(#${r.orderId})` : "";
      return `${broker}:${status}${detail ? " " + detail : ""}`;
    })
    .join(" | ");
}

async function handleSignal(payload) {
  const signal = normalizeSignal(payload);
  enforceRiskAndPolicy(signal);

  const execResults = [];
  const mt5Res = await executeMt5(signal);
  execResults.push(mt5Res);

  const binanceRes = await executeBinance(signal);
  execResults.push(binanceRes);

  const ctraderRes = await executeCTrader(signal);
  execResults.push(ctraderRes);

  const execSummary = buildExecSummary(execResults);
  const text = formatSignal(signal, execSummary);
  const telegram = await sendTelegram(text);

  return {
    ok: true,
    signal,
    execution: execResults,
    telegram,
  };
}

// ==================== MT5 bridge (merged routes) ====================
function mt5NowIso() {
  return new Date().toISOString();
}

let MT5_BACKEND = null;

function mt5LegacyJsonPath() {
  return path.join(path.dirname(CFG.mt5DbPath), "mt5-signals.json");
}

function mt5NormalizeStorage(storageRaw) {
  const s = String(storageRaw || "").trim().toLowerCase();
  if (!s) return "sqlite";
  if (["json", "sqlite", "postgres"].includes(s)) return s;
  throw new Error(`Invalid MT5_STORAGE=${storageRaw}. Use json|sqlite|postgres`);
}

function mt5EnsureJsonDbFile() {
  if (!fs.existsSync(CFG.mt5DbPath)) {
    fs.writeFileSync(CFG.mt5DbPath, JSON.stringify({ signals: [] }, null, 2));
  }
}

function mt5ReadJsonDb() {
  mt5EnsureJsonDbFile();
  return JSON.parse(fs.readFileSync(CFG.mt5DbPath, "utf8"));
}

function mt5WriteJsonDb(db) {
  fs.writeFileSync(CFG.mt5DbPath, JSON.stringify(db, null, 2));
}

function mt5MapDbRow(row) {
  if (!row) return null;
  return {
    signal_id: String(row.signal_id),
    created_at: String(row.created_at),
    source: String(row.source || ""),
    action: String(row.action || ""),
    symbol: String(row.symbol || ""),
    volume: Number(row.volume),
    sl: row.sl === null || row.sl === undefined ? null : Number(row.sl),
    tp: row.tp === null || row.tp === undefined ? null : Number(row.tp),
    note: String(row.note || ""),
    raw_json: row.raw_json || {},
    status: String(row.status || ""),
    locked_at: row.locked_at ?? null,
    ack_at: row.ack_at ?? null,
    ack_status: row.ack_status ?? null,
    ack_ticket: row.ack_ticket ?? null,
    ack_error: row.ack_error ?? null,
  };
}

function mt5GetLegacyRows() {
  const legacyPath = mt5LegacyJsonPath();
  if (!fs.existsSync(legacyPath)) return [];
  const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
  return Array.isArray(legacy?.signals) ? legacy.signals : [];
}

async function mt5InitBackend() {
  if (MT5_BACKEND) return MT5_BACKEND;
  const storage = mt5NormalizeStorage(CFG.mt5Storage);

  if (storage === "json") {
    MT5_BACKEND = {
      storage,
      info: { path: CFG.mt5DbPath },
      async upsertSignal(signal) {
        const db = mt5ReadJsonDb();
        const idx = db.signals.findIndex((s) => s.signal_id === signal.signal_id);
        if (idx >= 0) db.signals[idx] = signal;
        else db.signals.push(signal);
        mt5WriteJsonDb(db);
      },
      async pullAndLockNextSignal() {
        const db = mt5ReadJsonDb();
        const arr = db.signals
          .filter((s) => s.status === "NEW")
          .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
        if (!arr.length) return null;
        const signal = arr[0];
        signal.status = "LOCKED";
        signal.locked_at = mt5NowIso();
        mt5WriteJsonDb(db);
        return signal;
      },
      async findSignalById(signalId) {
        const db = mt5ReadJsonDb();
        return db.signals.find((s) => s.signal_id === signalId) || null;
      },
      async ackSignal(signalId, status, ticket, error) {
        const db = mt5ReadJsonDb();
        const sig = db.signals.find((s) => s.signal_id === signalId);
        if (!sig) return { changes: 0 };
        sig.status = mt5StatusToInternal(status);
        sig.ack_at = mt5NowIso();
        sig.ack_status = status;
        sig.ack_ticket = ticket ?? null;
        sig.ack_error = error ?? null;
        mt5WriteJsonDb(db);
        return { changes: 1 };
      },
      async listSignals(limit, statusFilter) {
        const db = mt5ReadJsonDb();
        const rows = db.signals
          .filter((s) => !statusFilter || String(s.status || "") === statusFilter)
          .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
          .slice(0, limit);
        return rows.map((r) => ({ ...r }));
      },
    };
    return MT5_BACKEND;
  }

  if (storage === "sqlite") {
    let DatabaseSync;
    try {
      ({ DatabaseSync } = require("node:sqlite"));
    } catch {
      throw new Error("MT5_STORAGE=sqlite requires Node.js 22+ (module node:sqlite not found). Use MT5_STORAGE=json|postgres or upgrade Node.");
    }
    const db = new DatabaseSync(CFG.mt5DbPath);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS mt5_signals (
        signal_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        source TEXT,
        action TEXT NOT NULL,
        symbol TEXT NOT NULL,
        volume REAL NOT NULL,
        sl REAL,
        tp REAL,
        note TEXT,
        raw_json TEXT,
        status TEXT NOT NULL,
        locked_at TEXT,
        ack_at TEXT,
        ack_status TEXT,
        ack_ticket TEXT,
        ack_error TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_mt5_signals_status_created
        ON mt5_signals(status, created_at);
    `);

    const count = db.prepare("SELECT COUNT(*) AS n FROM mt5_signals").get().n;
    if (count === 0) {
      try {
        const rows = mt5GetLegacyRows();
        if (rows.length > 0) {
          const insert = db.prepare(`
            INSERT OR REPLACE INTO mt5_signals (
              signal_id, created_at, source, action, symbol, volume, sl, tp, note, raw_json,
              status, locked_at, ack_at, ack_status, ack_ticket, ack_error
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const tx = db.transaction((list) => {
            for (const r of list) {
              insert.run(
                String(r.signal_id || crypto.randomUUID()),
                String(r.created_at || mt5NowIso()),
                String(r.source || "legacy"),
                String(r.action || "BUY"),
                String(r.symbol || ""),
                Number(r.volume ?? CFG.mt5DefaultLot),
                r.sl ?? null,
                r.tp ?? null,
                String(r.note || ""),
                JSON.stringify(r.raw_json || {}),
                String(r.status || "NEW"),
                r.locked_at ?? null,
                r.ack_at ?? null,
                r.ack_status ?? null,
                r.ack_ticket ?? null,
                r.ack_error ?? null,
              );
            }
          });
          tx(rows);
          console.log(`MT5: migrated ${rows.length} row(s) from legacy JSON ${mt5LegacyJsonPath()}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`MT5: legacy JSON migration failed: ${msg}`);
      }
    }

    MT5_BACKEND = {
      storage,
      info: { path: CFG.mt5DbPath },
      async upsertSignal(signal) {
        db.prepare(`
          INSERT OR REPLACE INTO mt5_signals (
            signal_id, created_at, source, action, symbol, volume, sl, tp, note, raw_json,
            status, locked_at, ack_at, ack_status, ack_ticket, ack_error
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          signal.signal_id,
          signal.created_at,
          signal.source,
          signal.action,
          signal.symbol,
          signal.volume,
          signal.sl,
          signal.tp,
          signal.note,
          JSON.stringify(signal.raw_json || {}),
          signal.status,
          signal.locked_at,
          signal.ack_at,
          signal.ack_status,
          signal.ack_ticket,
          signal.ack_error,
        );
      },
      async pullAndLockNextSignal() {
        const next = db.prepare(`
          SELECT signal_id, action, symbol, volume, sl, tp, note
          FROM mt5_signals
          WHERE status = 'NEW'
          ORDER BY created_at ASC
          LIMIT 1
        `).get();
        if (!next) return null;
        const upd = db.prepare(`
          UPDATE mt5_signals
          SET status = 'LOCKED', locked_at = ?
          WHERE signal_id = ? AND status = 'NEW'
        `).run(mt5NowIso(), next.signal_id);
        if (upd.changes < 1) return null;
        return next;
      },
      async findSignalById(signalId) {
        return db.prepare(`
          SELECT signal_id
          FROM mt5_signals
          WHERE signal_id = ?
          LIMIT 1
        `).get(signalId) || null;
      },
      async ackSignal(signalId, status, ticket, error) {
        return db.prepare(`
          UPDATE mt5_signals
          SET status = ?, ack_at = ?, ack_status = ?, ack_ticket = ?, ack_error = ?
          WHERE signal_id = ?
        `).run(
          mt5StatusToInternal(status),
          mt5NowIso(),
          status,
          ticket ?? null,
          error ?? null,
          signalId,
        );
      },
      async listSignals(limit, statusFilter) {
        if (statusFilter) {
          return db.prepare(`
            SELECT signal_id, created_at, source, action, symbol, volume, sl, tp, note, raw_json,
                   status, locked_at, ack_at, ack_status, ack_ticket, ack_error
            FROM mt5_signals
            WHERE status = ?
            ORDER BY created_at DESC
            LIMIT ?
          `).all(statusFilter, limit).map((r) => ({
            ...r,
            raw_json: r.raw_json ? JSON.parse(r.raw_json) : {},
          }));
        }
        return db.prepare(`
          SELECT signal_id, created_at, source, action, symbol, volume, sl, tp, note, raw_json,
                 status, locked_at, ack_at, ack_status, ack_ticket, ack_error
          FROM mt5_signals
          ORDER BY created_at DESC
          LIMIT ?
        `).all(limit).map((r) => ({
          ...r,
          raw_json: r.raw_json ? JSON.parse(r.raw_json) : {},
        }));
      },
    };
    return MT5_BACKEND;
  }

  if (!CFG.mt5PostgresUrl) {
    throw new Error("MT5_STORAGE=postgres but POSTGRES_URL/POSTGRE_URL/MT5_POSTGRES_URL is empty");
  }
  let pgModule;
  try {
    pgModule = require("pg");
  } catch {
    throw new Error("MT5 postgres backend requires `pg` package. Run: npm install pg");
  }
  const { Pool } = pgModule;
  const pool = new Pool({ connectionString: CFG.mt5PostgresUrl });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mt5_signals (
      signal_id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      source TEXT,
      action TEXT NOT NULL,
      symbol TEXT NOT NULL,
      volume DOUBLE PRECISION NOT NULL,
      sl DOUBLE PRECISION NULL,
      tp DOUBLE PRECISION NULL,
      note TEXT,
      raw_json JSONB,
      status TEXT NOT NULL,
      locked_at TIMESTAMPTZ NULL,
      ack_at TIMESTAMPTZ NULL,
      ack_status TEXT NULL,
      ack_ticket TEXT NULL,
      ack_error TEXT NULL
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mt5_signals_status_created
    ON mt5_signals(status, created_at)
  `);

  const countRes = await pool.query("SELECT COUNT(*)::int AS n FROM mt5_signals");
  if (countRes.rows[0].n === 0) {
    try {
      const rows = mt5GetLegacyRows();
      if (rows.length > 0) {
        for (const r of rows) {
          await pool.query(`
            INSERT INTO mt5_signals (
              signal_id, created_at, source, action, symbol, volume, sl, tp, note, raw_json,
              status, locked_at, ack_at, ack_status, ack_ticket, ack_error
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16)
            ON CONFLICT (signal_id) DO UPDATE SET
              created_at=EXCLUDED.created_at,
              source=EXCLUDED.source,
              action=EXCLUDED.action,
              symbol=EXCLUDED.symbol,
              volume=EXCLUDED.volume,
              sl=EXCLUDED.sl,
              tp=EXCLUDED.tp,
              note=EXCLUDED.note,
              raw_json=EXCLUDED.raw_json,
              status=EXCLUDED.status,
              locked_at=EXCLUDED.locked_at,
              ack_at=EXCLUDED.ack_at,
              ack_status=EXCLUDED.ack_status,
              ack_ticket=EXCLUDED.ack_ticket,
              ack_error=EXCLUDED.ack_error
          `, [
            String(r.signal_id || crypto.randomUUID()),
            String(r.created_at || mt5NowIso()),
            String(r.source || "legacy"),
            String(r.action || "BUY"),
            String(r.symbol || ""),
            Number(r.volume ?? CFG.mt5DefaultLot),
            r.sl ?? null,
            r.tp ?? null,
            String(r.note || ""),
            JSON.stringify(r.raw_json || {}),
            String(r.status || "NEW"),
            r.locked_at ?? null,
            r.ack_at ?? null,
            r.ack_status ?? null,
            r.ack_ticket ?? null,
            r.ack_error ?? null,
          ]);
        }
        console.log(`MT5: migrated ${rows.length} row(s) from legacy JSON ${mt5LegacyJsonPath()}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`MT5: legacy JSON migration failed: ${msg}`);
    }
  }

  MT5_BACKEND = {
    storage,
    info: { url: CFG.mt5PostgresUrl.replace(/:[^:@/]+@/, ":***@") },
    async upsertSignal(signal) {
      await pool.query(`
        INSERT INTO mt5_signals (
          signal_id, created_at, source, action, symbol, volume, sl, tp, note, raw_json,
          status, locked_at, ack_at, ack_status, ack_ticket, ack_error
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (signal_id) DO UPDATE SET
          created_at=EXCLUDED.created_at,
          source=EXCLUDED.source,
          action=EXCLUDED.action,
          symbol=EXCLUDED.symbol,
          volume=EXCLUDED.volume,
          sl=EXCLUDED.sl,
          tp=EXCLUDED.tp,
          note=EXCLUDED.note,
          raw_json=EXCLUDED.raw_json,
          status=EXCLUDED.status,
          locked_at=EXCLUDED.locked_at,
          ack_at=EXCLUDED.ack_at,
          ack_status=EXCLUDED.ack_status,
          ack_ticket=EXCLUDED.ack_ticket,
          ack_error=EXCLUDED.ack_error
      `, [
        signal.signal_id,
        signal.created_at,
        signal.source,
        signal.action,
        signal.symbol,
        signal.volume,
        signal.sl,
        signal.tp,
        signal.note,
        JSON.stringify(signal.raw_json || {}),
        signal.status,
        signal.locked_at,
        signal.ack_at,
        signal.ack_status,
        signal.ack_ticket,
        signal.ack_error,
      ]);
    },
    async pullAndLockNextSignal() {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const sel = await client.query(`
          SELECT signal_id, action, symbol, volume, sl, tp, note
          FROM mt5_signals
          WHERE status = 'NEW'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `);
        if (!sel.rows.length) {
          await client.query("COMMIT");
          return null;
        }
        const next = sel.rows[0];
        await client.query(`
          UPDATE mt5_signals
          SET status = 'LOCKED', locked_at = $1
          WHERE signal_id = $2
        `, [mt5NowIso(), next.signal_id]);
        await client.query("COMMIT");
        return mt5MapDbRow(next);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
    async findSignalById(signalId) {
      const res = await pool.query(`
        SELECT signal_id
        FROM mt5_signals
        WHERE signal_id = $1
        LIMIT 1
      `, [signalId]);
      return res.rows[0] || null;
    },
    async ackSignal(signalId, status, ticket, error) {
      const res = await pool.query(`
        UPDATE mt5_signals
        SET status = $1, ack_at = $2, ack_status = $3, ack_ticket = $4, ack_error = $5
        WHERE signal_id = $6
      `, [
        mt5StatusToInternal(status),
        mt5NowIso(),
        status,
        ticket ?? null,
        error ?? null,
        signalId,
      ]);
      return { changes: res.rowCount || 0 };
    },
    async listSignals(limit, statusFilter) {
      if (statusFilter) {
        const res = await pool.query(`
          SELECT signal_id, created_at, source, action, symbol, volume, sl, tp, note, raw_json,
                 status, locked_at, ack_at, ack_status, ack_ticket, ack_error
          FROM mt5_signals
          WHERE status = $1
          ORDER BY created_at DESC
          LIMIT $2
        `, [statusFilter, limit]);
        return res.rows.map((r) => mt5MapDbRow(r));
      }
      const res = await pool.query(`
        SELECT signal_id, created_at, source, action, symbol, volume, sl, tp, note, raw_json,
               status, locked_at, ack_at, ack_status, ack_ticket, ack_error
        FROM mt5_signals
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);
      return res.rows.map((r) => mt5MapDbRow(r));
    },
  };
  return MT5_BACKEND;
}

async function mt5Backend() {
  return mt5InitBackend();
}

function mt5NormalizeAction(payload) {
  const raw = String(payload.action || payload.side || "").trim().toUpperCase();
  if (!["BUY", "SELL", "CLOSE"].includes(raw)) {
    throw new Error(`Unsupported action/side: ${raw}`);
  }
  return raw;
}

function mt5NormalizeSymbol(payload) {
  const symbol = String(payload.symbol || "").trim().toUpperCase();
  if (!symbol) {
    throw new Error("symbol is required");
  }
  return symbol;
}

function mt5NormalizeVolume(payload) {
  const v = payload.lots ?? payload.volume;
  if (v === undefined || v === null || v === "") {
    return CFG.mt5DefaultLot;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("volume/lots must be > 0");
  }
  return n;
}

function mt5NormalizeAckStatus(value) {
  const s = String(value || "").trim().toUpperCase();
  if (!s) throw new Error("status is required");
  const allowed = [
    "OK",
    "FAIL",
    "CANCELED",
    "CANCELLED",
    "CLOSED_TP",
    "CLOSED_SL",
    "CLOSED_MANUAL",
    "CLOSED",
  ];
  if (!allowed.includes(s)) {
    throw new Error("status must be one of: OK, FAIL, CANCELED, CLOSED_TP, CLOSED_SL, CLOSED_MANUAL, CLOSED");
  }
  return s === "CANCELLED" ? "CANCELED" : s;
}

function mt5StatusToInternal(status) {
  switch (status) {
    case "OK":
      return "DONE";
    case "FAIL":
      return "FAILED";
    case "CANCELED":
      return "CANCELED";
    case "CLOSED_TP":
      return "CLOSED_TP";
    case "CLOSED_SL":
      return "CLOSED_SL";
    case "CLOSED_MANUAL":
      return "CLOSED_MANUAL";
    case "CLOSED":
      return "CLOSED";
    default:
      return "FAILED";
  }
}

function mt5PublicState(row) {
  const status = String(row.status || "");
  let stage = "unknown";
  if (status === "NEW") stage = "queued";
  else if (status === "LOCKED") stage = "pulled_by_mt5";
  else if (status === "DONE") stage = "opened_or_processed";
  else if (status === "FAILED") stage = "failed";
  else if (status === "CANCELED") stage = "canceled";
  else if (status.startsWith("CLOSED")) stage = "closed";

  return {
    ...row,
    stage,
    is_open_candidate: status === "NEW" || status === "LOCKED" || status === "DONE",
    dedupe_safe: status !== "NEW",
  };
}

async function mt5UpsertSignal(signal) {
  const b = await mt5Backend();
  return b.upsertSignal(signal);
}

async function mt5PullAndLockNextSignal() {
  const b = await mt5Backend();
  return b.pullAndLockNextSignal();
}

async function mt5FindSignalById(signalId) {
  const b = await mt5Backend();
  return b.findSignalById(signalId);
}

async function mt5AckSignal(signalId, status, ticket, error) {
  const b = await mt5Backend();
  return b.ackSignal(signalId, status, ticket, error);
}

async function mt5ListSignals(limit, statusFilter) {
  const b = await mt5Backend();
  return b.listSignals(limit, statusFilter);
}

function getApiKeyFromReq(req, payload = null, urlObj = null) {
  const headerKey = String(req.headers["x-api-key"] || "");
  if (headerKey) return headerKey;
  if (payload && (payload.apiKey || payload.api_key)) return String(payload.apiKey || payload.api_key || "");
  if (urlObj) return String(urlObj.searchParams.get("apiKey") || urlObj.searchParams.get("api_key") || "");
  return "";
}

function requireAdminKey(req, res, urlObj, payload = null) {
  if (!CFG.signalApiKey) return true;
  const incoming = getApiKeyFromReq(req, payload, urlObj);
  if (incoming === CFG.signalApiKey) return true;
  json(res, 401, { ok: false, error: "Unauthorized" });
  return false;
}

function mt5DashboardHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MT5 Trades</title>
  <style>
    body { font-family: Arial, sans-serif; background:#0b0f14; color:#e6edf3; margin:0; }
    .wrap { max-width:1200px; margin:0 auto; padding:14px; }
    .top { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
    input, select, button { background:#121821; color:#e6edf3; border:1px solid #263244; padding:8px; border-radius:8px; }
    button { cursor:pointer; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th, td { border-bottom:1px solid #1f2a37; padding:7px; text-align:left; }
    th { color:#9fb0c4; position:sticky; top:0; background:#0b0f14; }
    .badge { border-radius:999px; padding:2px 8px; font-size:11px; font-weight:bold; display:inline-block; }
    .NEW { background:#1f2937; color:#d1d5db; }
    .LOCKED { background:#1d4ed8; color:#dbeafe; }
    .DONE { background:#065f46; color:#d1fae5; }
    .FAILED, .CANCELED, .CLOSED_SL { background:#7f1d1d; color:#fee2e2; }
    .CLOSED_TP, .CLOSED, .CLOSED_MANUAL { background:#14532d; color:#dcfce7; }
    .muted { color:#8b9db2; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <strong>MT5 Trades Monitor</strong>
      <span class="muted" id="meta"></span>
      <select id="status">
        <option value="">All statuses</option>
        <option>NEW</option><option>LOCKED</option><option>DONE</option><option>FAILED</option>
        <option>CANCELED</option><option>CLOSED_TP</option><option>CLOSED_SL</option><option>CLOSED_MANUAL</option><option>CLOSED</option>
      </select>
      <input id="limit" type="number" min="10" max="1000" value="200" />
      <input id="apiKey" type="password" placeholder="apiKey (if required)" />
      <button id="refresh">Refresh</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Created</th><th>Signal ID</th><th>Symbol</th><th>Action</th><th>Volume</th>
          <th>SL/TP</th><th>Status</th><th>Stage</th><th>Dup Safe</th><th>Ack</th><th>Note</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
  <script>
    const qs = new URLSearchParams(location.search);
    if (qs.get("apiKey")) document.getElementById("apiKey").value = qs.get("apiKey");
    async function load() {
      const status = document.getElementById("status").value;
      const limit = document.getElementById("limit").value || "200";
      const apiKey = document.getElementById("apiKey").value || "";
      const p = new URLSearchParams({ limit });
      if (status) p.set("status", status);
      if (apiKey) p.set("apiKey", apiKey);
      const res = await fetch("/mt5/trades?" + p.toString(), { headers: apiKey ? { "x-api-key": apiKey } : {} });
      const data = await res.json();
      if (!data.ok) {
        document.getElementById("meta").textContent = "Error: " + (data.error || "unknown");
        document.getElementById("rows").innerHTML = "";
        return;
      }
      document.getElementById("meta").textContent = "Total: " + data.count + " | Storage: " + data.storage + " | Updated: " + new Date().toLocaleTimeString();
      const tbody = document.getElementById("rows");
      tbody.innerHTML = data.trades.map(t => {
        const created = new Date(t.created_at).toLocaleString();
        const ack = [t.ack_status || "", t.ack_ticket || "", t.ack_error || ""].filter(Boolean).join(" | ");
        return "<tr>"
          + "<td>" + created + "</td>"
          + "<td class='muted'>" + (t.signal_id || "") + "</td>"
          + "<td>" + (t.symbol || "") + "</td>"
          + "<td>" + (t.action || "") + "</td>"
          + "<td>" + (t.volume ?? "") + "</td>"
          + "<td>" + (t.sl ?? "-") + " / " + (t.tp ?? "-") + "</td>"
          + "<td><span class='badge " + (t.status || "") + "'>" + (t.status || "") + "</span></td>"
          + "<td>" + (t.stage || "") + "</td>"
          + "<td>" + (t.dedupe_safe ? "YES" : "NO") + "</td>"
          + "<td class='muted'>" + ack + "</td>"
          + "<td class='muted'>" + (t.note || "") + "</td>"
          + "</tr>";
      }).join("");
    }
    document.getElementById("refresh").onclick = load;
    load();
    setInterval(load, 2500);
  </script>
</body>
</html>`;
}

async function executeMt5(signal) {
  if (!CFG.mt5Enabled) {
    return { broker: "mt5", status: "skipped", reason: "MT5_ENABLED=false" };
  }
  if (CFG.mt5EaApiKeys.size === 0) {
    return { broker: "mt5", status: "skipped", reason: "Missing MT5_EA_API_KEYS (or SIGNAL_API_KEY fallback)" };
  }

  const signalId = `tv_${signal.strategy}_${signal.symbol}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 64);
  const volume = signal.quantity && signal.quantity > 0 ? signal.quantity : CFG.mt5DefaultLot;
  const note = [signal.strategy, signal.timeframe, signal.note].filter(Boolean).join(" | ");

  await mt5UpsertSignal({
    signal_id: signalId,
    created_at: mt5NowIso(),
    source: "signal",
    action: signal.side,
    symbol: signal.symbol,
    volume,
    sl: signal.sl ?? null,
    tp: signal.tp ?? null,
    note,
    raw_json: signal.raw || {},
    status: "NEW",
    locked_at: null,
    ack_at: null,
    ack_status: null,
    ack_ticket: null,
    ack_error: null,
  });

  return {
    broker: "mt5",
    status: "queued",
    signal_id: signalId,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, {
      ok: true,
      service: "telegram-trading-bot",
      binanceEnabled: CFG.binanceEnabled,
      binanceMode: CFG.binanceMode || null,
      ctraderEnabled: CFG.ctraderEnabled,
      ctraderMode: CFG.ctraderMode || null,
      mt5Enabled: CFG.mt5Enabled,
    });
  }

  if (req.method === "GET" && url.pathname === "/mt5/health") {
    if (!CFG.mt5Enabled) {
      return json(res, 200, {
        ok: true,
        service: "mt5-bridge",
        enabled: false,
        storage: mt5NormalizeStorage(CFG.mt5Storage),
        hasTvApiKeys: CFG.mt5TvAlertApiKeys.size > 0,
        hasEaApiKeys: CFG.mt5EaApiKeys.size > 0,
        dbPath: CFG.mt5DbPath,
        postgresConfigured: false,
      });
    }
    const b = await mt5Backend();
    return json(res, 200, {
      ok: true,
      service: "mt5-bridge",
      enabled: CFG.mt5Enabled,
      storage: b.storage,
      hasTvApiKeys: CFG.mt5TvAlertApiKeys.size > 0,
      hasEaApiKeys: CFG.mt5EaApiKeys.size > 0,
      dbPath: b.info.path || null,
      postgresConfigured: b.storage === "postgres",
    });
  }

  if (req.method === "GET" && url.pathname === "/mt5/trades") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    try {
      const limitRaw = Number(url.searchParams.get("limit") || 200);
      const limit = Math.max(10, Math.min(1000, Number.isFinite(limitRaw) ? limitRaw : 200));
      const status = String(url.searchParams.get("status") || "").trim().toUpperCase();
      const statusFilter = status || "";
      const trades = await mt5ListSignals(limit, statusFilter);
      const b = await mt5Backend();
      return json(res, 200, {
        ok: true,
        count: trades.length,
        storage: b.storage,
        trades: trades.map(mt5PublicState),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/ui") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    if (!requireAdminKey(req, res, url)) return;
    const body = mt5DashboardHtml();
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
    return;
  }

  if (req.method === "POST" && url.pathname === "/mt5/tv/webhook") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    try {
      const payload = await readJson(req);
      const apiKey = String(payload.apiKey || "");
      if (CFG.mt5TvAlertApiKeys.size > 0 && !CFG.mt5TvAlertApiKeys.has(apiKey)) {
        return json(res, 401, { ok: false, error: "invalid api key" });
      }

      const action = mt5NormalizeAction(payload);
      const symbol = mt5NormalizeSymbol(payload);
      const volume = mt5NormalizeVolume(payload);
      const signalId = String(payload.id || crypto.randomUUID());

      const noteParts = [payload.strategy, payload.timeframe, payload.reason, payload.note].filter(Boolean);
      const note = noteParts.join(" | ");

      await mt5UpsertSignal({
        signal_id: signalId,
        created_at: mt5NowIso(),
        source: "tradingview",
        action,
        symbol,
        volume,
        sl: payload.sl ?? null,
        tp: payload.tp ?? null,
        note,
        raw_json: payload,
        status: "NEW",
        locked_at: null,
        ack_at: null,
        ack_status: null,
        ack_ticket: null,
        ack_error: null,
      });

      return json(res, 200, { ok: true, signal_id: signalId, action, symbol });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "GET" && url.pathname === "/mt5/ea/pull") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });

    const apiKey = String(url.searchParams.get("api_key") || "");
    if (CFG.mt5EaApiKeys.size > 0 && !CFG.mt5EaApiKeys.has(apiKey)) {
      return json(res, 401, { ok: false, error: "invalid ea api key" });
    }

    const account = String(url.searchParams.get("account") || "");
    const signal = await mt5PullAndLockNextSignal();
    if (!signal) {
      return json(res, 200, { ok: true, signal: null });
    }

    return json(res, 200, {
      ok: true,
      signal: {
        signal_id: signal.signal_id,
        action: signal.action,
        symbol: signal.symbol,
        volume: signal.volume,
        sl: signal.sl,
        tp: signal.tp,
        note: signal.note || "",
        account,
      },
    });
  }

  if (req.method === "POST" && url.pathname === "/mt5/ea/ack") {
    if (!CFG.mt5Enabled) return json(res, 400, { ok: false, error: "MT5 bridge disabled" });
    try {
      const payload = await readJson(req);
      const apiKey = String(payload.api_key || "");
      if (CFG.mt5EaApiKeys.size > 0 && !CFG.mt5EaApiKeys.has(apiKey)) {
        return json(res, 401, { ok: false, error: "invalid ea api key" });
      }

      const status = mt5NormalizeAckStatus(payload.status);

      const signalId = String(payload.signal_id || "");
      if (!signalId) {
        return json(res, 400, { ok: false, error: "signal_id is required" });
      }

      const sig = await mt5FindSignalById(signalId);
      if (!sig) {
        return json(res, 404, { ok: false, error: "signal not found" });
      }

      await mt5AckSignal(signalId, status, payload.ticket, payload.error);

      return json(res, 200, { ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return json(res, 400, { ok: false, error: message });
    }
  }

  if (req.method === "POST" && url.pathname === "/signal") {
    try {
      const payload = await readJson(req);
      const incomingHeaderApiKey = req.headers["x-api-key"] || "";
      const incomingBodyApiKey = payload.apiKey || payload.api_key || "";
      const incomingApiKey = incomingHeaderApiKey || incomingBodyApiKey;
      if (CFG.signalApiKey && incomingApiKey !== CFG.signalApiKey) {
        return json(res, 401, { ok: false, error: "Unauthorized" });
      }

      const result = await handleSignal(payload);
      return json(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      try {
        await sendTelegram(`Signal processing failed: ${message}`);
      } catch {
        // ignore nested telegram failure
      }
      return json(res, 400, { ok: false, error: message });
    }
  }

  return json(res, 404, { ok: false, error: "Not found" });
});

async function start() {
  if (CFG.mt5Enabled) {
    const b = await mt5Backend();
    const where = b.info.path || b.info.url || "configured";
    console.log(`MT5 bridge enabled=true, storage=${b.storage}, target=${where}`);
  } else {
    console.log("MT5 bridge enabled=false");
  }

  server.listen(CFG.port, () => {
    console.log(`telegram-trading-bot listening on http://0.0.0.0:${CFG.port}`);
    console.log(`Binance mode=${CFG.binanceMode || "off"}, cTrader mode=${CFG.ctraderMode || "off"}`);
  });
}

start().catch((err) => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`Failed to start server: ${message}`);
  process.exit(1);
});
