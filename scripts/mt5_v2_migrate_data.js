#!/usr/bin/env node

const path = require("path");
const fs = require("fs");

/**
 * MT5 V2 Data Migration Script
 * Migrates historical trade data from 'signals' table to the new 'trades' ledger.
 * This ensures that the Execution Hub V2 and new Dashboard show accurate historical stats.
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

function mt5MapActionToSide(action) {
  const a = String(action || "").toUpperCase();
  if (a.includes("BUY")) return "BUY";
  if (a.includes("SELL")) return "SELL";
  return "BUY";
}

function mt5MapStatusToExecution(status) {
  const s = String(status || "").toUpperCase();
  if (["TP", "SL", "FAIL", "CANCEL", "EXPIRED", "CLOSED"].includes(s)) return "CLOSED";
  if (["OK", "PLACED", "START", "OPEN"].includes(s)) return "OPEN";
  return "PENDING";
}

async function main() {
  const pgUrl = process.env.MT5_POSTGRES_URL || process.env.POSTGRES_URL;
  if (!pgUrl) {
    console.error("[Migrate] Missing MT5_POSTGRES_URL");
    process.exit(1);
  }

  let pg;
  try {
    pg = require("pg");
  } catch {
    // Attempt to load from webhook node_modules
    pg = require(path.resolve(__dirname, "../webhook/node_modules/pg"));
  }
  const { Pool } = pg;
  const pool = new Pool({ connectionString: pgUrl });

  const report = {
    signalsRead: 0,
    tradesMigrated: 0,
    skippedMissingAccount: 0,
    errors: 0
  };

  try {
    console.log("[Migrate] Fetching accounts for mapping...");
    const accountRows = await pool.query("SELECT account_id, user_id FROM accounts");
    const accountMap = new Map(); // user_id -> account_id
    for (const acc of accountRows.rows) {
      // If multiple accounts per user, we pick the first one seen (backfill logic)
      if (!accountMap.has(acc.user_id)) {
        accountMap.set(String(acc.user_id), acc.account_id);
      }
    }

    console.log("[Migrate] Fetching signals...");
    const signalRows = await pool.query("SELECT * FROM signals ORDER BY created_at ASC");
    report.signalsRead = signalRows.rowCount;

    console.log(`[Migrate] Found ${report.signalsRead} signals. Starting migration...`);

    for (const s of signalRows.rows) {
      const userId = String(s.user_id || "default").trim();
      const accountId = accountMap.get(userId);

      if (!accountId) {
        report.skippedMissingAccount += 1;
        continue;
      }

      const tradeId = `MIG_${s.signal_id}_${accountId}`;
      const side = mt5MapActionToSide(s.action);
      const exStatus = mt5MapStatusToExecution(s.status);
      const now = new Date().toISOString();

      try {
        await pool.query(`
          INSERT INTO trades (
            trade_id, account_id, signal_id, source_id, origin_kind,
            symbol, side, intent_entry, intent_sl, intent_tp, intent_volume, intent_note,
            dispatch_status, execution_status, broker_trade_id, broker_order_id,
            entry_exec, sl_exec, tp_exec, opened_at, closed_at, pnl_realized,
            metadata, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, 'SIGNAL',
            $5, $6, $7, $8, $9, $10, $11,
            'CONSUMED', $12, $13, $14,
            $15, $16, $17, $18, $19, $20,
            $21, $22, $23
          ) ON CONFLICT (trade_id) DO NOTHING
        `, [
          tradeId,
          accountId,
          s.signal_id,
          s.source || 'tradingview',
          s.symbol,
          side,
          s.price || null,
          s.sl || null,
          s.tp || null,
          s.volume || null,
          s.note || '',
          exStatus,
          s.ack_ticket || null,
          null, // broker_order_id
          s.price || null, // entry_exec (guess)
          s.sl || null,
          s.tp || null,
          s.created_at, // opened_at
          exStatus === 'CLOSED' ? (s.updated_at || s.created_at) : null,
          s.pnl_money_realized || 0,
          JSON.stringify({ migrated: true, original_status: s.status, raw: s.raw_json }),
          s.created_at,
          s.updated_at || s.created_at
        ]);
        report.tradesMigrated += 1;
      } catch (e) {
        console.error(`[Migrate] Error migrating signal ${s.signal_id}:`, e.message);
        report.errors += 1;
      }

      if (report.tradesMigrated % 50 === 0) {
        console.log(`[Migrate] Progress... ${report.tradesMigrated}/${report.signalsRead}`);
      }
    }

    console.log("[Migrate] Migration complete!");
    console.log(JSON.stringify(report, null, 2));

  } catch (error) {
    console.error("[Migrate] Fatal Error:", error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
