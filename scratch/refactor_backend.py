import sys

start_marker = '  MT5_BACKEND = {'
end_marker = '    async getUiAuthUser(email) {'

with open('webhook/server.js', 'r') as f:
    lines = f.readlines()

new_content = """  MT5_BACKEND = {
    storage: "postgres",
    info: { url: CFG.mt5PostgresUrl.replace(/:[^:@/]+@/, ":***@") },
    async log(objectId, objectTable, metadata = {}, userId = null) {
      await pool.query(`
        INSERT INTO logs (object_id, object_table, metadata, user_id, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [objectId, objectTable, JSON.stringify(metadata), userId]);
    },
    async upsertSignal(signal) {
      const r = await pool.query(`
        INSERT INTO signals (
          signal_id, created_at, user_id, source, source_id, symbol, side, sl, tp,
          signal_tf, chart_tf, rr_planned, note, raw_json, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)
        ON CONFLICT (signal_id) DO NOTHING
        RETURNING signal_id
      `, [
        signal.signal_id,
        signal.created_at,
        signal.user_id,
        signal.source,
        signal.source_id,
        signal.symbol,
        signal.side,
        signal.sl,
        signal.tp,
        signal.signal_tf,
        signal.chart_tf,
        signal.rr_planned,
        signal.note,
        JSON.stringify(signal.raw_json || {}),
        signal.status || 'NEW'
      ]);
      return { inserted: (r.rowCount || 0) > 0 };
    },
    async fanoutSignalTradeV2(payload = {}) {
      const signalId = String(payload.signal_id || "").trim();
      const sourceId = String(payload.source_id || "").trim();
      const userId = String(payload.user_id || CFG.mt5DefaultUserId).trim();
      if (!signalId || !sourceId || !userId) return { created: 0, account_ids: [] };

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const accounts = await client.query(`
          SELECT a.account_id, a.broker_id
          FROM accounts a
          WHERE a.user_id = $1 AND a.status != 'ARCHIVED'
        `, [userId]);

        let created = 0;
        const accountIds = [];
        for (const row of accounts.rows || []) {
          const aid = row.account_id;
          const tradeId = mt5GenerateId("TRD");
          const ins = await client.query(`
            INSERT INTO trades (
              trade_id, account_id, user_id, broker_id, signal_id, source_id, origin_kind,
              symbol, side, intent_entry, intent_sl, intent_tp, intent_volume, intent_note,
              dispatch_status, execution_status, created_at, updated_at
            ) VALUES (
              $1,$2,$3,$4,$5,$6,'SIGNAL',
              $7,$8,$9,$10,$11,$12,$13,
              'NEW','PENDING',$14,$14
            )
            ON CONFLICT (trade_id) DO NOTHING
          `, [
            tradeId, aid, userId, row.broker_id, signalId, sourceId,
            payload.symbol, payload.side, payload.intent_entry, payload.intent_sl,
            payload.intent_tp, payload.intent_volume, payload.intent_note, mt5NowIso()
          ]);
          if ((ins.rowCount || 0) > 0) {
            created++;
            accountIds.push(aid);
            await client.query(`INSERT INTO logs (object_id, object_table, metadata, user_id) VALUES ($1,'trades',$2,$3)`, 
              [tradeId, JSON.stringify({ event: 'SIGNAL_FANOUT', signal_id: signalId }), userId]);
          }
        }
        await client.query("COMMIT");
        return { created, account_ids: accountIds };
      } catch (e) { await client.query("ROLLBACK"); throw e; }
      finally { client.release(); }
    },
    async createAccountV2(payload = {}) {
       const res = await pool.query(`
         INSERT INTO accounts (account_id, user_id, status, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (account_id) DO UPDATE SET
           status = EXCLUDED.status,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()
         RETURNING *
       `, [payload.account_id, payload.user_id || CFG.mt5DefaultUserId, payload.status || 'ACTIVE', payload.metadata || {}]);
       return res.rows[0];
    },
    async listSignals(limit, statusFilter, userId = null) {
      const clauses = ["signal_id NOT LIKE 'SYSTEM_%'"];
      const params = [];
      if (statusFilter) { params.push(statusFilter); clauses.push(`status = $${params.length}`); }
      if (userId) { params.push(userId); clauses.push(`user_id = $${params.length}`); }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      params.push(limit);
      const res = await pool.query(`SELECT * FROM signals ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params);
      return res.rows;
    },
    async listTradesV2(filters = {}, page = 1, pageSize = 50) {
      const safePage = Math.max(1, Number(page) || 1);
      const safePageSize = Math.max(1, Math.min(200, Number(pageSize) || 50));
      const offset = (safePage - 1) * safePageSize;
      const clauses = [];
      const params = [];
      if (filters.user_id) { params.push(filters.user_id); clauses.push(`user_id = $${params.length}`); }
      if (filters.account_id) { params.push(filters.account_id); clauses.push(`account_id = $${params.length}`); }
      if (filters.symbol) { params.push(filters.symbol); clauses.push(`symbol = $${params.length}`); }
      if (filters.execution_status) { params.push(filters.execution_status); clauses.push(`execution_status = $${params.length}`); }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      
      const countRes = await pool.query(`SELECT COUNT(*) FROM trades ${where}`, params);
      const total = parseInt(countRes.rows[0].count);
      
      params.push(safePageSize, offset);
      const res = await pool.query(`SELECT * FROM trades ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      return { items: res.rows, total, page: safePage, pageSize: safePageSize };
    },
    async ackTradeV2(accountId, payload = {}) {
       const now = mt5NowIso();
       const res = await pool.query(`
         UPDATE trades
         SET execution_status = $1,
             broker_trade_id = $2,
             entry_exec = $3,
             pnl_realized = $4,
             closed_at = CASE WHEN $1 = 'CLOSED' THEN $5 ELSE closed_at END,
             updated_at = $5
         WHERE trade_id = $6 AND account_id = $7
         RETURNING user_id
       `, [payload.execution_status, payload.broker_trade_id, payload.entry_exec, payload.pnl_realized, now, payload.trade_id, accountId]);
       if (res.rowCount > 0) {
         const uid = res.rows[0].user_id;
         await pool.query(`INSERT INTO logs (object_id, object_table, metadata, user_id) VALUES ($1,'trades',$2,$3)`,
           [payload.trade_id, JSON.stringify({ event: 'ACK', status: payload.execution_status, pnl: payload.pnl_realized }), uid]);
       }
       return { ok: res.rowCount > 0 };
    },
    async createBrokerTradeV2(accountId, payload = {}) {
       const now = mt5NowIso();
       const tid = payload.trade_id || mt5GenerateId("TRD");
       const acc = await pool.query(`SELECT user_id FROM accounts WHERE account_id = $1`, [accountId]);
       const uid = acc.rows[0]?.user_id || CFG.mt5DefaultUserId;
       const res = await pool.query(`
         INSERT INTO trades (trade_id, account_id, user_id, origin_kind, symbol, side, execution_status, created_at, updated_at)
         VALUES ($1,$2,$3,'BROKER',$4,$5,$6,$7,$7)
         RETURNING *
       `, [tid, accountId, uid, payload.symbol, payload.side, payload.execution_status || 'OPEN', now]);
       return { ok: res.rowCount > 0, trade_id: tid };
    }
  };
"""

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if start_marker in line and start_idx == -1:
        start_idx = i
    if end_marker in line and start_idx != -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    final_lines = lines[:start_idx] + [new_content + "\\n"] + lines[end_idx:]
    with open('webhook/server.js', 'w') as f:
        f.writelines(final_lines)
    print(f"Successfully refactored Postgres backend between lines {start_idx+1} and {end_idx+1}")
else:
    print(f"Could not find markers: start={start_idx}, end={end_idx}")
    sys.exit(1)
