# Skill: Browser Testing & Debugging (MCP + Chromium)

Use this skill to perform automated UI testing, inspect console logs, and monitor network traffic on the local web application using any Chromium-based browser.

## 1. Prerequisites (Local Setup)

The browser must be running with remote debugging enabled on port `9222`. 

### Launch Commands (Mac Terminal):

*   **Brave**: `/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser --remote-debugging-port=9222`
*   **Google Chrome**: `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222`
*   **Microsoft Edge**: `/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --remote-debugging-port=9222`

> [!NOTE]
> **Safari is NOT supported** by this MCP server because it uses WebKit instead of Chromium. If Safari testing is required, consider the **Playwright MCP** server.

## 2. MCP Configuration

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

## 3. Core Testing Workflows

### A. Auto-Detect UI Errors
- **Command**: "Use chrome-devtools to check for console errors on http://localhost:3000/chart-snapshots"
- **Action**: The agent will use `evaluate` or `get_console_logs` to find runtime crashes.

### B. Network Traffic Audit
- **Command**: "Monitor network for /api/charts/multi and report any 4xx/5xx responses."
- **Action**: Use `capture_network_traffic` to identify backend connectivity issues.

### C. Visual Validation
- **Command**: "Take a screenshot of the SignalDetailCard and compare it to the design spec."
- **Action**: Use `capture_screenshot` to verify layout integrity across resolutions.

## 4. Troubleshooting
- **Port Conflict**: If port 9222 is busy, find the process: `lsof -i :9222`.
- **Not Connecting**: Ensure Brave is the **active** instance started with the flag. Standard app launches from the Dock will not expose the debugging port.
