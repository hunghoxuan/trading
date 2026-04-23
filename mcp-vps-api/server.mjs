import { randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const API_BASE_URL = (process.env.VPS_API_BASE_URL || "https://trade.mozasolution.com").replace(/\/+$/, "");
const API_KEY = process.env.VPS_API_KEY || "";
const DEFAULT_SYMBOL = process.env.VPS_DEFAULT_SYMBOL || "ICMARKETS:UK100";
const MCP_TRANSPORT_MODE = (process.env.MCP_TRANSPORT_MODE || "stdio").trim().toLowerCase();
const MCP_HOST = (process.env.MCP_HOST || "0.0.0.0").trim();
const MCP_PORT = Number.parseInt(process.env.MCP_PORT || "8443", 10);
const MCP_SERVER_TOKEN = (process.env.MCP_SERVER_TOKEN || "").trim();
const MCP_HTTPS_ENABLED = String(process.env.MCP_HTTPS_ENABLED || "1").trim().toLowerCase() !== "0";
const MCP_HTTPS_KEY_PATH = (process.env.MCP_HTTPS_KEY_PATH || "/etc/letsencrypt/live/mozasolution.com/privkey.pem").trim();
const MCP_HTTPS_CERT_PATH = (process.env.MCP_HTTPS_CERT_PATH || "/etc/letsencrypt/live/mozasolution.com/fullchain.pem").trim();

function getReqHeader(req, key) {
  const value = req?.headers?.[key.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function isAuthorized(req) {
  if (!MCP_SERVER_TOKEN) return true;
  const bearer = String(getReqHeader(req, "authorization") || "");
  const apiKey = String(getReqHeader(req, "x-api-key") || "");
  if (apiKey && apiKey === MCP_SERVER_TOKEN) return true;
  if (bearer.toLowerCase().startsWith("bearer ")) {
    return bearer.slice(7).trim() === MCP_SERVER_TOKEN;
  }
  return false;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, MCP-Session-Id, Last-Event-Id");
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, Authorization, X-API-Key, MCP-Session-Id, Last-Event-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      ...(API_KEY ? { "x-api-key": API_KEY } : {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(data)}`);
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "x-api-key": API_KEY } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(data)}`);
  return data;
}

function buildMcpServer() {
  const server = new McpServer({
    name: "trading-vps-api",
    version: "0.2.0",
  });

  server.registerTool(
    "vps_health",
    {
      title: "VPS Health",
      description: "Check VPS API health",
      inputSchema: {},
    },
    async () => {
      const out = await apiGet("/health");
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      };
    },
  );

  server.registerTool(
    "vps_symbol_search",
    {
      title: "Symbol Search",
      description: "Search valid TradingView symbols for provider autocomplete",
      inputSchema: {
        q: z.string().min(1),
        provider: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async ({ q, provider, limit }) => {
      const qs = new URLSearchParams({
        q,
        provider: provider || "ICMARKETS",
        limit: String(limit || 10),
      });
      const out = await apiGet(`/v2/chart/symbols?${qs.toString()}`);
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      };
    },
  );

  server.registerTool(
    "vps_capture_snapshots_3tf",
    {
      title: "Capture 3TF Snapshots",
      description: "Capture 15m/4h/1D chart snapshots on VPS",
      inputSchema: {
        symbol: z.string().optional(),
        provider: z.string().optional(),
        lookbackBars: z.number().int().min(50).max(5000).optional(),
        width: z.number().int().min(480).max(2400).optional(),
        height: z.number().int().min(270).max(1600).optional(),
        format: z.enum(["jpg", "png"]).optional(),
        quality: z.number().int().min(20).max(95).optional(),
        theme: z.enum(["dark", "light"]).optional(),
      },
    },
    async (args) => {
      const out = await apiPost("/v2/chart/snapshot/batch", {
        symbol: args.symbol || DEFAULT_SYMBOL,
        provider: args.provider || "ICMARKETS",
        timeframes: ["15m", "4h", "1D"],
        lookbackBars: args.lookbackBars ?? 300,
        width: args.width ?? 960,
        height: args.height ?? 540,
        format: args.format ?? "jpg",
        quality: args.quality ?? 55,
        theme: args.theme ?? "dark",
      });
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      };
    },
  );

  server.registerTool(
    "vps_analyze_latest_3_claude",
    {
      title: "Analyze Latest 3 (Claude)",
      description: "Send latest 3 snapshots to Claude through VPS API and get JSON response",
      inputSchema: {
        model: z.string().optional(),
        prompt: z.string().optional(),
      },
    },
    async ({ model, prompt }) => {
      const out = await apiPost("/v2/chart/snapshots/analyze", {
        model: model || "claude-sonnet-4-0",
        prompt,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      };
    },
  );

  server.registerTool(
    "vps_add_signal",
    {
      title: "Add Signal",
      description: "Create signal/trade record in VPS from parsed JSON",
      inputSchema: {
        symbol: z.string(),
        action: z.enum(["BUY", "SELL"]),
        entry: z.number(),
        sl: z.number(),
        tp: z.number(),
        tf: z.string().optional(),
        source: z.string().optional(),
        strategy: z.string().optional(),
        model: z.string().optional(),
        entry_model: z.string().optional(),
        note: z.string().optional(),
      },
    },
    async (args) => {
      const out = await apiPost("/mt5/trades/create", {
        symbol: args.symbol,
        action: args.action,
        entry: args.entry,
        sl: args.sl,
        tp: args.tp,
        tf: args.tf || "15m",
        source: args.source || "ai",
        strategy: args.strategy || "ai",
        model: args.model || "ai_claude",
        entry_model: args.entry_model || "ai_claude",
        note: args.note || "",
      });
      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      };
    },
  );

  return server;
}

async function runStdio() {
  const server = buildMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio transport.");
}

function createHttpServer() {
  const sessions = new Map();

  const handleMcpPost = async (req, res) => {
    const parsedBody = await readJsonBody(req);
    const sessionId = String(getReqHeader(req, "mcp-session-id") || "");

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      await session.transport.handleRequest(req, res, parsedBody);
      return;
    }

    if (!sessionId && isInitializeRequest(parsedBody)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          sessions.set(newSessionId, { transport, server });
        },
      });
      const server = buildMcpServer();
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
      return;
    }

    sendJson(res, 400, {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID provided" },
      id: null,
    });
  };

  const mcpHttpHandler = async (req, res) => {
    setCorsHeaders(req, res);
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    console.error(`[MCP] ${req.method} ${requestUrl.pathname} (Session: ${getReqHeader(req, "mcp-session-id") || "none"})`);

    if (requestUrl.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        transport: "streamable-http",
        mode: MCP_TRANSPORT_MODE,
        now: new Date().toISOString(),
      });
      return;
    }

    if (!isAuthorized(req)) {
      sendJson(res, 401, { ok: false, error: "Unauthorized MCP request." });
      return;
    }

    if (requestUrl.pathname !== "/mcp") {
      sendJson(res, 404, { ok: false, error: "Not found." });
      return;
    }

    try {
      if (req.method === "POST") {
        await handleMcpPost(req, res);
        return;
      }

      if (req.method === "GET" || req.method === "DELETE") {
        const sessionId = String(getReqHeader(req, "mcp-session-id") || requestUrl.searchParams.get("sessionId") || requestUrl.searchParams.get("mcp-session-id") || "");
        if (!sessionId || !sessions.has(sessionId)) {
          console.error(`[MCP] Session not found: ${sessionId}`);
          sendJson(res, 404, { ok: false, error: "Session not found." });
          return;
        }
        const session = sessions.get(sessionId);
        await session.transport.handleRequest(req, res);
        return;
      }

      sendJson(res, 405, { ok: false, error: "Method not allowed." });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err?.message || err) });
    }
  };

  const canUseHttps = MCP_HTTPS_ENABLED && fs.existsSync(MCP_HTTPS_KEY_PATH) && fs.existsSync(MCP_HTTPS_CERT_PATH);
  const listener = canUseHttps
    ? https.createServer(
      {
        key: fs.readFileSync(MCP_HTTPS_KEY_PATH),
        cert: fs.readFileSync(MCP_HTTPS_CERT_PATH),
      },
      mcpHttpHandler,
    )
    : http.createServer(mcpHttpHandler);

  listener.listen(MCP_PORT, MCP_HOST, () => {
    const proto = canUseHttps ? "https" : "http";
    console.error(`MCP server listening on ${proto}://${MCP_HOST}:${MCP_PORT}/mcp`);
  });
}

if (MCP_TRANSPORT_MODE === "http") {
  createHttpServer();
} else {
  await runStdio();
}
