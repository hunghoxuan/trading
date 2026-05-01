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
  await pool.query("UPDATE user_settings SET type = 'trade', name = 'WATCHLIST' WHERE type = 'SYMBOLS' AND name = 'WATCHLIST';");
  await pool.query("UPDATE user_settings SET type = 'cron', name = 'ANALYSIS_CRON' WHERE type = 'ai_analysis_cron' AND name = 'default';");
  await pool.query("UPDATE user_settings SET type = 'cron', name = 'MARKET_DATA_CRON' WHERE type = 'market_data_cron' AND name = 'default';");
  
  const { rows } = await pool.query("SELECT id, data FROM user_settings WHERE type = 'cron';");
  for (const row of rows) {
    if (row.data && row.data.enabled !== undefined) {
      delete row.data.enabled;
      await pool.query("UPDATE user_settings SET data = $1 WHERE id = $2;", [row.data, row.id]);
    }
  }
  
  console.log("DB Updated");
  process.exit(0);
}
run().catch(console.error);
