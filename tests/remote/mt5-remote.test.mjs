import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = (process.env.BASE_URL || "http://139.59.211.192").replace(/\/+$/, "");
const API_KEY = process.env.API_KEY || "";
const ACCOUNT = process.env.ACCOUNT || "remote-test";
const TEST_SYMBOL = (process.env.TEST_SYMBOL || "TEST").toUpperCase();
const TV_WEBHOOK_TOKEN = process.env.TV_WEBHOOK_TOKEN || "";

if (TEST_SYMBOL !== "TEST") {
  throw new Error(`Safety guard: TEST_SYMBOL must be TEST, got ${TEST_SYMBOL}`);
}

function withBaseUrl(path) {
  return `${BASE_URL}${path}`;
}

async function requestJson(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (API_KEY) headers["x-api-key"] = API_KEY;
  const res = await fetch(withBaseUrl(path), { ...init, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Expected JSON from ${path}, got: ${text.slice(0, 240)}`);
  }
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function requestText(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (API_KEY) headers["x-api-key"] = API_KEY;
  const res = await fetch(withBaseUrl(path), { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} -> HTTP ${res.status}: ${text.slice(0, 240)}`);
  }
  return text;
}

function makeSignalId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

test("TradingView webhook push enqueues a signal", async () => {
  const signalId = makeSignalId("tv_push");
  const payload = {
    id: signalId,
    action: "BUY",
    symbol: TEST_SYMBOL,
    volume: 0.01,
    sl: 65000,
    tp: 75000,
    note: "remote webhook push test",
  };
  const tvWebhookPath = TV_WEBHOOK_TOKEN
    ? `/mt5/tv/webhook/${encodeURIComponent(TV_WEBHOOK_TOKEN)}`
    : "/mt5/tv/webhook";
  const out = await requestJson(tvWebhookPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(out.ok, true);
  assert.equal(out.signal_id, signalId);
});

test("CSV download returns data and contains just inserted signal", async () => {
  const signalId = makeSignalId("csv_test");
  const tvWebhookPath = TV_WEBHOOK_TOKEN
    ? `/mt5/tv/webhook/${encodeURIComponent(TV_WEBHOOK_TOKEN)}`
    : "/mt5/tv/webhook";
  await requestJson(tvWebhookPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: signalId,
      action: "SELL",
      symbol: TEST_SYMBOL,
      volume: 0.01,
      sl: 78000,
      tp: 70000,
      note: "remote csv test",
    }),
  });

  const csv = await requestText("/csv?limit=500&header=1");
  assert.match(csv, /timestamp;signal_id;action;symbol;volume;sl;tp;note/);
  assert.ok(csv.includes(signalId), `csv missing ${signalId}`);
});

test("EA pull endpoint can pull signal by signal_id", async () => {
  const signalId = makeSignalId("ea_pull");
  const tvWebhookPath = TV_WEBHOOK_TOKEN
    ? `/mt5/tv/webhook/${encodeURIComponent(TV_WEBHOOK_TOKEN)}`
    : "/mt5/tv/webhook";
  await requestJson(tvWebhookPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: signalId,
      action: "BUY",
      symbol: TEST_SYMBOL,
      volume: 0.01,
      sl: 65000,
      tp: 76000,
      note: "remote ea pull test",
    }),
  });

  const out = await requestJson(
    `/mt5/ea/pull?account=${encodeURIComponent(ACCOUNT)}&signal_id=${encodeURIComponent(signalId)}`,
  );
  assert.equal(out.ok, true);
  assert.ok(out.signal, "signal should not be null");
  assert.equal(out.signal.signal_id, signalId);
  assert.equal(out.signal.account, ACCOUNT);

  const detail = await requestJson(`/mt5/trades/${encodeURIComponent(signalId)}`);
  assert.equal(detail.ok, true);
  assert.ok(Array.isArray(detail.events), "events should be array");
  assert.ok(
    detail.events.some((e) => String(e.event_type || "") === "EA_PULLED"),
    "events should include EA_PULLED",
  );
});
