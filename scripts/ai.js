#!/usr/bin/env node
"use strict";

/**
 * AI CLI Gateway for Trading Bot
 * 
 * Usage:
 *   node scripts/ai.js --list
 *   node scripts/ai.js --model deepseek-coder "Analyze signal..."
 *   node scripts/ai.js --provider ollama "What is the trend?"
 * 
 * Config: provider_config.yaml
 * Env: .env
 */

const fs = require("fs");
const path = require("path");

// --- Helper Functions ---

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function parseProviderConfig(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  const providers = [];
  let currentProvider = null;

  for (let line of raw.split(/\r?\n/)) {
    const commentIdx = line.indexOf("#");
    if (commentIdx >= 0) line = line.slice(0, commentIdx);
    line = line.trim();
    if (!line) continue;

    if (line.startsWith("-")) {
      if (currentProvider) providers.push(currentProvider);
      currentProvider = {};
      line = line.slice(1).trim();
    }

    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);

      // ${VAR} interpolation
      val = val.replace(/\${(\w+)}/g, (_, name) => process.env[name] || "");

      if (currentProvider) currentProvider[key] = val;
    }
  }
  if (currentProvider) providers.push(currentProvider);
  return providers;
}

async function callProvider(provider, prompt) {
  const url = `${provider.base_url}/chat/completions`;
  const headers = { "Content-Type": "application/json" };
  if (provider.api_key) headers["Authorization"] = `Bearer ${provider.api_key}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      stream: false
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${provider.provider} failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function getProjectContext() {
  const agentsDir = path.resolve(__dirname, "../.agents");
  if (!fs.existsSync(agentsDir)) return "";

  let context = "\n--- PROJECT CONTEXT (Obsidian Vault) ---\n";
  const coreFiles = ["Brain_Index.md", "sprint.md", "rules.md", "architecture.md"];
  
  for (const file of coreFiles) {
    const filePath = path.join(agentsDir, file);
    if (fs.existsSync(filePath)) {
      context += `\n[File: ${file}]\n${fs.readFileSync(filePath, "utf8")}\n`;
    }
  }
  context += "--- END OF CONTEXT ---\n";
  return context;
}

// --- Main CLI ---

async function main() {
  loadEnv();
  const projectConfigPath = path.resolve(__dirname, "../provider_config.yaml");
  const globalConfigPath = "/Users/macmini/.gemini/antigravity/provider_config.yaml";
  
  let providers = [];
  
  if (fs.existsSync(globalConfigPath)) {
    providers = providers.concat(parseProviderConfig(globalConfigPath));
  }
  
  if (fs.existsSync(projectConfigPath)) {
    const projectProviders = parseProviderConfig(projectConfigPath);
    projectProviders.forEach(pp => {
      const idx = providers.findIndex(gp => gp.model === pp.model && gp.provider === pp.provider);
      if (idx >= 0) providers[idx] = pp;
      else providers.push(pp);
    });
  }

  if (providers.length === 0) {
    console.error("Error: No AI providers found.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  let selectedProvider = providers[0];
  let prompt = "";
  let useProjectContext = false;
  let debug = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--list" || args[i] === "-l") {
      console.log("\nAvailable AI Providers/Models:");
      providers.forEach(p => console.log(`- [${p.provider}] Model: ${p.model}`));
      return;
    }
    if (args[i] === "--model" || args[i] === "-m") {
      const modelName = args[++i];
      selectedProvider = providers.find(p => p.model === modelName) || selectedProvider;
    } else if (args[i] === "--provider" || args[i] === "-p") {
      const pName = args[++i];
      selectedProvider = providers.find(p => p.provider === pName) || selectedProvider;
    } else if (args[i] === "--project") {
      useProjectContext = true;
    } else if (args[i] === "--debug") {
      debug = true;
    } else if (!args[i].startsWith("-")) {
      prompt = args.slice(i).join(" ");
      break;
    }
  }

  if (!prompt) {
    console.log("Usage: node scripts/ai.js [--model <name> | --provider <name>] [--project] [--debug] \"prompt\"");
    process.exit(0);
  }

  if (useProjectContext) {
    const context = getProjectContext();
    prompt = `INSTRUCTIONS: You are an expert developer with access to the project's internal documentation (Obsidian Vault). Use the following context to answer the user's question accurately.

${context}

User Question: ${prompt}`;
  }

  if (debug) {
    console.log("\n--- DEBUG: FULL PROMPT ---");
    console.log(prompt);
    console.log("--------------------------\n");
  }

  console.log(`\n> Consulting [${selectedProvider.provider}] using model [${selectedProvider.model}]...`);
  try {
    const response = await callProvider(selectedProvider, prompt);
    console.log("\n--- Response ---");
    console.log(response);
    console.log("----------------\n");
  } catch (error) {
    console.error(`\n[Error] ${error.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
