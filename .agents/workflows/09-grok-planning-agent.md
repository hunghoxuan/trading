# Workflow: Using Grok (Web) as a Planning Agent via 9Router

This workflow explains how to use your **Grok (xAI) Web Subscription** as a high-performance planning agent for Antigravity using **9Router** as a bridge.

## 1. Prerequisites
- A valid **Grok (xAI)** web subscription.
- **Node.js** installed on your machine.

## 2. Setup 9Router (The Bridge)
9Router acts as a local proxy that converts your browser's authenticated Grok session into an OpenAI-compatible API.

1. **Run 9Router**:
   ```bash
   npx 9router
   ```
2. **Open Dashboard**: Go to [http://localhost:20128](http://localhost:20128).
3. **Add Provider**: 
   - Click "Add Provider" -> Select **xAI (Grok)**.
   - Choose **"Web Session"** or **"Subscription"** mode.
4. **Connect Session**:
   - 9Router will open a browser window (or ask you to).
   - Log into [grok.com](https://grok.com).
   - 9Router will confirm the session is "Active".

## 3. Configure Antigravity
Add the 9Router endpoint to your project's `provider_config.yaml`:

```yaml
- provider: "9router"
  base_url: "http://localhost:20128/v1"
  model: "grok-beta"
```

## 4. Run Planning Tasks
You can now use the `ai.js` script to send your current project state to Grok for planning.

```bash
# Example: Ask Grok to plan a new feature using project context
node scripts/ai.js --model grok-beta --project "Plan a new risk management dashboard"
```

## 5. Why use this?
- **Cost**: Uses your existing web subscription instead of pay-per-token API.
- **Performance**: Grok often provides high-quality reasoning for complex architectural decisions.
- **Context**: The `--project` flag in `ai.js` automatically attaches your `.agents/rules.md` and `architecture.md` so Grok knows the project constraints.
