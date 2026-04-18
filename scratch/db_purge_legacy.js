const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load env
function loadEnv() {
  const envPath = path.join(__dirname, '../webhook/.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length === 2 && !process.env[parts[0].trim()]) {
        process.env[parts[0].trim()] = parts[1].trim();
      }
    });
  }
}
loadEnv();

const pool = new Pool({ 
  connectionString: process.env.MT5_POSTGRES_URL || process.env.POSTGRE_URL || process.env.POSTGRES_URL 
});

async function purgeLegacy() {
  console.log("Checking for legacy tables...");
  const client = await pool.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log("Current tables:", tables);

    const legacy = ['signal_events', 'trade_events', 'source_events', 'mt5_signals', 'account_sources'];
    for (const table of legacy) {
      if (tables.includes(table)) {
        console.log(`Migrating data from ${table} to logs...`);
        // Basic migration attempt
        try {
          if (table === 'signal_events') {
            await client.query(`
              INSERT INTO logs (object_id, object_table, metadata, created_at)
              SELECT signal_id, 'signals', payload_json || jsonb_build_object('event_type', event_type), event_time
              FROM signal_events
            `);
          } else if (table === 'trade_events') {
             await client.query(`
              INSERT INTO logs (object_id, object_table, metadata, created_at)
              SELECT trade_id, 'trades', payload_json || jsonb_build_object('event_type', event_type), event_time
              FROM trade_events
            `);
          }
        } catch (e) {
          console.warn(`Migration failed for ${table}: ${e.message}`);
        }
        
        console.log(`Dropping table ${table}...`);
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }
    }

    console.log("Cleaning up legacy columns from signals/trades...");
    // Columns to remove from signals
    const signalsCols = ['risk_money_planned', 'pnl_money_realized', 'entry_price_exec', 'sl_exec', 'tp_exec', 'sl_pips', 'tp_pips', 'pip_value_per_lot', 'risk_money_actual', 'reward_money_planned', 'reward_money_actual', 'ack_status', 'ack_ticket', 'ack_error', 'locked_at', 'ack_at', 'opened_at', 'closed_at'];
    for (const col of signalsCols) {
       await client.query(`ALTER TABLE signals DROP COLUMN IF EXISTS ${col}`).catch(() => {});
    }

    console.log("Cleanup complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

purgeLegacy().catch(console.error);
