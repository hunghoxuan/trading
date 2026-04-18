#!/usr/bin/env node

const path = require("path");
const fs = require("fs");

function loadEnvFileFallback(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of String(raw || "").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = val;
  }
}

try {
  require("dotenv").config({ path: path.resolve(__dirname, "../webhook/.env") });
} catch {
  loadEnvFileFallback(path.resolve(__dirname, "../webhook/.env"));
}

async function hasColumn(pool, table, column) {
  const res = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column],
  );
  return (res.rowCount || 0) > 0;
}

async function main() {
  const pgUrl = process.env.MT5_POSTGRES_URL || process.env.POSTGRES_URL || process.env.POSTGRE_URL;
  if (!pgUrl) {
    console.error("[BackfillSimple] Missing MT5_POSTGRES_URL / POSTGRES_URL / POSTGRE_URL");
    process.exit(1);
  }

  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: pgUrl });

  const report = {
    tradesActionFromSide: 0,
    tradesEntryFromIntent: 0,
    tradesSlFromIntent: 0,
    tradesTpFromIntent: 0,
    tradesNoteFromIntent: 0,
    tradesVolumeFromIntent: 0,
    usersBalanceStartDropped: false,
  };

  try {
    await pool.query("BEGIN");

    if (await hasColumn(pool, "trades", "side") && await hasColumn(pool, "trades", "action")) {
      const r = await pool.query(`UPDATE trades SET action = side WHERE (action IS NULL OR action = '') AND side IS NOT NULL`);
      report.tradesActionFromSide = r.rowCount || 0;
    }

    if (await hasColumn(pool, "trades", "intent_entry") && await hasColumn(pool, "trades", "entry")) {
      const r = await pool.query(`UPDATE trades SET entry = intent_entry WHERE entry IS NULL AND intent_entry IS NOT NULL`);
      report.tradesEntryFromIntent = r.rowCount || 0;
    }

    if (await hasColumn(pool, "trades", "intent_sl") && await hasColumn(pool, "trades", "sl")) {
      const r = await pool.query(`UPDATE trades SET sl = intent_sl WHERE sl IS NULL AND intent_sl IS NOT NULL`);
      report.tradesSlFromIntent = r.rowCount || 0;
    }

    if (await hasColumn(pool, "trades", "intent_tp") && await hasColumn(pool, "trades", "tp")) {
      const r = await pool.query(`UPDATE trades SET tp = intent_tp WHERE tp IS NULL AND intent_tp IS NOT NULL`);
      report.tradesTpFromIntent = r.rowCount || 0;
    }

    if (await hasColumn(pool, "trades", "intent_note") && await hasColumn(pool, "trades", "note")) {
      const r = await pool.query(`UPDATE trades SET note = intent_note WHERE (note IS NULL OR note = '') AND intent_note IS NOT NULL`);
      report.tradesNoteFromIntent = r.rowCount || 0;
    }

    if (await hasColumn(pool, "trades", "intent_volume") && await hasColumn(pool, "trades", "volume")) {
      const r = await pool.query(`UPDATE trades SET volume = intent_volume WHERE volume IS NULL AND intent_volume IS NOT NULL`);
      report.tradesVolumeFromIntent = r.rowCount || 0;
    }

    if (await hasColumn(pool, "users", "balance_start")) {
      await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS balance_start`);
      report.usersBalanceStartDropped = true;
    }

    await pool.query("COMMIT");
    console.log("[BackfillSimple] Completed");
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("[BackfillSimple] Failed:", error?.stack || error?.message || String(error));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
