#!/usr/bin/env node

const path = require("path");
const fs = require("fs");

/**
 * MT5 V2 Cleanup Script
 * Deletes signals from the 'signals' table that have already been migrated to 'trades'.
 */

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

async function main() {
  const pgUrl = process.env.MT5_POSTGRES_URL || process.env.POSTGRES_URL;
  if (!pgUrl) {
    console.error("[Cleanup] Missing MT5_POSTGRES_URL");
    process.exit(1);
  }

  let pg;
  try {
    pg = require("pg");
  } catch {
    pg = require(path.resolve(__dirname, "../webhook/node_modules/pg"));
  }
  const { Pool } = pg;
  const pool = new Pool({ connectionString: pgUrl });

  try {
    console.log("[Cleanup] Identifying signals to remove...");
    
    // Find signal IDs that exist in the trades ledger
    const res = await pool.query(`
      SELECT signal_id 
      FROM signals 
      WHERE signal_id IN (SELECT signal_id FROM trades WHERE origin_kind = 'SIGNAL' AND signal_id IS NOT NULL)
    `);

    const ids = res.rows.map(r => r.signal_id);
    if (ids.length === 0) {
      console.log("[Cleanup] No migrated signals found to clean up.");
      return;
    }

    console.log(`[Cleanup] Found ${ids.length} migrated signals. Deleting...`);

    // We use a transaction for safety
    await pool.query("BEGIN");
    
    // Delete from signal_events first (FK dependency usually)
    await pool.query("DELETE FROM signal_events WHERE signal_id = ANY($1::text[])", [ids]);
    
    // Delete from signals
    const delRes = await pool.query("DELETE FROM signals WHERE signal_id = ANY($1::text[])", [ids]);
    
    await pool.query("COMMIT");

    console.log(`[Cleanup] Success! Deleted ${delRes.rowCount} signals from audit log.`);
    
    const remaining = await pool.query("SELECT COUNT(*) FROM signals");
    console.log(`[Cleanup] Signals remaining in table: ${remaining.rows[0].count}`);

  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("[Cleanup] Fatal Error:", error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
