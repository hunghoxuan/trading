# Antigravity AI Model Guide

Welcome to the Multi-Model integration for Antigravity. This guide explains how to select, verify, and expand the AI models available to you.

## 1. How to Select a Model

You can select a model via the **CLI** or the **IDE**.

### Via CLI
Run the following command in your terminal:
```bash
# List all available models
node scripts/ai.js --list

# Use a specific model by name
node scripts/ai.js --model deepseek-coder "Explain this code..."

# Use a specific provider (uses the first model in that provider)
node scripts/ai.js --provider ollama "What is the trend?"
```

### Via IDE (VS Code)
1. Press `Shift + Cmd + P` (or `F1`).
2. Type `Tasks: Run Task`.
3. Select `AI: Query DeepSeek` or `AI: Query Ollama (Qwen)`.
4. Enter your prompt when requested.

---

## 2. How to Verify Which Model is Running

When you execute a query via the CLI tool, it will explicitly log the provider and model before the response:

```text
> Consulting [deepseek] using model [deepseek-coder]...
```

If you receive an error about "Insufficient Balance" or "Model not found", it confirms the tool successfully connected to that specific provider.

---

## 3. How to Add More Models

To add models, edit your `provider_config.yaml`. The format is:

```yaml
- provider: "provider_name"
  base_url: "https://api.endpoint.com/v1"
  api_key: "${ENV_VARIABLE_NAME}"
  model: "model-identifier"
```

### Recommended Coding Models (Template)
| Model | Provider | Strengths |
| :--- | :--- | :--- |
| `claude-3-5-sonnet-20240620` | Anthropic | Best for reasoning and large refactors |
| `gpt-4o` | OpenAI | Fast, reliable general coding |
| `deepseek-coder` | DeepSeek | Extremely cheap and powerful for logic |
| `qwen2.5-coder:14b` | Ollama | Best local model for offline work |

---

## 4. Global Configuration

To apply these settings across **all your projects**:

1. Create or copy your `provider_config.yaml` to the global directory:
   `~/.gemini/antigravity/provider_config.yaml`
2. The Antigravity CLI tool will automatically merge your global models with project-specific models.

> [!NOTE]
> Environment variables (like `DEEPSEEK_API_KEY`) should still be defined in your global `~/.zshrc` or `~/.bash_profile` to be available everywhere.
