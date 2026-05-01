const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
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
loadEnvFile();

const pool = new Pool({ connectionString: process.env.MT5_POSTGRES_URL || process.env.POSTGRES_URL });
async function run() {
  await pool.query("DELETE FROM user_settings WHERE type = 'cron' AND name IN ('ai_analysis', 'market_data');");
  console.log("Local duplicates deleted");
  process.exit(0);
}
run().catch(console.error);
