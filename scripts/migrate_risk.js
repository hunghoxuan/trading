
const pg = require('pg');
require('dotenv').config({ path: '/opt/trading/webhook/.env' });

const pool = new pg.Pool({ connectionString: process.env.MT5_POSTGRES_URL });

async function migrate() {
  console.log('Starting History Risk Sync...');
  const { rows } = await pool.query("SELECT signal_id, note, ack_error FROM signals WHERE risk_money_actual IS NULL");
  console.log(`Found ${rows.length} rows to check.`);

  let updated = 0;
  for (const row of rows) {
    const combined = (row.note || "") + " " + (row.ack_error || "");
    const m = combined.match(/risk\$=([\d.]+)/i);
    if (m) {
      const risk = parseFloat(m[1]);
      if (!isNaN(risk)) {
        await pool.query("UPDATE signals SET risk_money_actual = $1 WHERE signal_id = $2", [risk, row.signal_id]);
        updated++;
      }
    }
  }

  console.log(`Finished. Updated ${updated} trades with rescued risk data.`);
  await pool.end();
}

migrate().catch(console.error);
