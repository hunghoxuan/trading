# Trading VPS MCP Wrapper

This package wraps your VPS API as MCP tools.

Important: this repo currently provides a **local stdio MCP server** (`server.mjs`), which works directly with local MCP clients such as Claude Desktop local config.

## Support Matrix

- Claude Desktop local MCP: supported now (via `claude_desktop_config.json`)
- Claude.ai web (custom connectors): requires a **remote MCP server URL** (public HTTPS), not local stdio
- Claude mobile: can use remote connectors already added from Claude.ai

## 1) Install

```bash
cd /Users/macmini/Trade/Bot/trading/mcp-vps-api
npm install
```

## 2) Environment

Set env vars:

- `VPS_API_BASE_URL` (example: `https://trade.mozasolution.com`)
- `VPS_API_KEY` (your server API key)
- optional `VPS_DEFAULT_SYMBOL` (default `ICMARKETS:UK100`)

## 3) Run (Local MCP / stdio)

```bash
npm start
```

## 4) Claude Desktop (Local MCP)

Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "trading-vps-api": {
      "command": "node",
      "args": ["/Users/macmini/Trade/Bot/trading/mcp-vps-api/server.mjs"],
      "env": {
        "VPS_API_BASE_URL": "https://trade.mozasolution.com",
        "VPS_API_KEY": "YOUR_API_KEY",
        "VPS_DEFAULT_SYMBOL": "ICMARKETS:UK100"
      }
    }
  }
}
```

## 5) Claude.ai Web (Remote MCP Connector)

Claude.ai web cannot attach this local stdio server directly.  
You must host a **remote MCP server** and add it as a custom connector.

High-level flow:

1. Deploy a public HTTPS remote MCP endpoint (SSE or Streamable HTTP transport).
2. Ensure it is reachable from Anthropic cloud (public internet / allowlist rules if needed).
3. In Claude.ai: `Customize -> Connectors -> Add custom connector`.
4. Paste your remote MCP server URL (and OAuth settings if used).
5. Enable connector per conversation.

Notes:

- Free plan may limit number of custom connectors.
- Remote connectors are in beta.
- Local `claude_desktop_config.json` MCP entries do not appear in Claude.ai web.

## 6) Skill Usage (Desktop + Web)

Use [CLAUDE_SKILL_TEMPLATE.md](./CLAUDE_SKILL_TEMPLATE.md) as:

- Claude Desktop: project/system instructions with MCP tools enabled.
- Claude.ai web: project instructions after enabling your remote connector.

## Exposed MCP tools

- `vps_health`
- `vps_symbol_search`
- `vps_capture_snapshots_3tf`
- `vps_analyze_latest_3_claude`
- `vps_add_signal`
