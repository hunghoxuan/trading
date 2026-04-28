#!/usr/bin/env node

const path = require("path");
const crypto = require("crypto");
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

function slugId(input, fallback = "default") {
  const raw = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return raw || fallback;
}

function hashApiKey(raw) {
  return crypto.createHash("sha256").update(String(raw || ""), "utf8").digest("hex");
}

async function main() {
  const mt5Storage = String(process.env.MT5_STORAGE || "sqlite").toLowerCase();
  if (mt5Storage !== "postgres") {
    console.error(`[Backfill] MT5_STORAGE=${mt5Storage} is not supported by this script. Use postgres.`);
    process.exit(1);
  }

  const pgUrl = process.env.MT5_POSTGRES_URL || process.env.POSTGRES_URL || process.env.POSTGRE_URL;
  if (!pgUrl) {
    console.error("[Backfill] Missing MT5_POSTGRES_URL / POSTGRES_URL / POSTGRE_URL");
    process.exit(1);
  }

  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: pgUrl });

  const report = {
    sourcesUpserted: 0,
    accountKeysAssigned: 0,
    accountKeysSkippedMultiAccountUsers: 0,
    accountSubscriptionsInserted: 0,
  };

  try {
    await pool.query("BEGIN");

    const sourceRows = await pool.query(`
      SELECT DISTINCT COALESCE(NULLIF(TRIM(source), ''), 'tradingview') AS source_name
      FROM signals
    `);
    const sourceNames = new Set(sourceRows.rows.map((r) => String(r.source_name || "tradingview")));
    sourceNames.add("tradingview");

    for (const sourceName of sourceNames) {
      const sourceId = slugId(sourceName, "tradingview");
      const kind = sourceId.includes("tv") || sourceId.includes("tradingview") ? "tv" : "api";
      await pool.query(`
        INSERT INTO sources (source_id, name, kind, auth_mode, is_active, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, 'token', TRUE, $4::jsonb, NOW(), NOW())
        ON CONFLICT (source_id) DO UPDATE
        SET name = EXCLUDED.name,
            kind = EXCLUDED.kind,
            updated_at = NOW()
      `, [sourceId, sourceName, kind, JSON.stringify({ backfill: true })]);
      report.sourcesUpserted += 1;
    }

    const keyRows = await pool.query(`
      SELECT DISTINCT ON (k.user_id)
        k.user_id,
        k.key_value,
        k.created_at
      FROM user_api_keys k
      WHERE k.is_active = TRUE
      ORDER BY k.user_id, k.created_at DESC
    `);

    for (const row of keyRows.rows) {
      const userId = String(row.user_id || "").trim();
      const keyValue = String(row.key_value || "").trim();
      if (!userId || !keyValue) continue;

      const accounts = await pool.query(`
        SELECT account_id
        FROM user_accounts
        WHERE user_id = $1
        ORDER BY created_at ASC
      `, [userId]);

      if ((accounts.rowCount || 0) !== 1) {
        report.accountKeysSkippedMultiAccountUsers += 1;
        continue;
      }

      const accountId = String(accounts.rows[0].account_id || "").trim();
      const keyHash = hashApiKey(keyValue);
      const last4 = keyValue.slice(-4);

      const upd = await pool.query(`
        UPDATE user_accounts
        SET api_key_hash = COALESCE(api_key_hash, $1),
            api_key_last4 = COALESCE(api_key_last4, $2),
            api_key_rotated_at = COALESCE(api_key_rotated_at, NOW()),
            updated_at = NOW()
        WHERE account_id = $3
          AND (api_key_hash IS NULL OR api_key_hash = '')
      `, [keyHash, last4, accountId]);

      report.accountKeysAssigned += upd.rowCount || 0;
    }

    const allSources = await pool.query(`SELECT source_id FROM sources WHERE is_active = TRUE`);
    const allAccounts = await pool.query(`SELECT account_id FROM user_accounts`);

    for (const acc of allAccounts.rows) {
      const accountId = String(acc.account_id || "").trim();
      if (!accountId) continue;
      for (const src of allSources.rows) {
        const sourceId = String(src.source_id || "").trim();
        if (!sourceId) continue;
        const ins = await pool.query(`
          INSERT INTO account_sources (account_id, source_id, is_active, created_at, updated_at)
          VALUES ($1, $2, TRUE, NOW(), NOW())
          ON CONFLICT (account_id, source_id) DO NOTHING
        `, [accountId, sourceId]);
        report.accountSubscriptionsInserted += ins.rowCount || 0;
      }
    }

    await pool.query("COMMIT");

    console.log("[Backfill] Completed");
    console.log(JSON.stringify(report, null, 2));
    if (report.accountKeysSkippedMultiAccountUsers > 0) {
      console.log("[Backfill] WARNING: Some users have multiple accounts; api_key_hash was not auto-assigned for them. Rotate per-account keys manually.");
    }
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("[Backfill] Failed:", error?.stack || error?.message || String(error));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
