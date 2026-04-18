  MT5_BACKEND = {
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
        signal.signal_id, signal.created_at, signal.user_id, signal.source, signal.source_id,
        signal.symbol, signal.side, signal.sl, signal.tp, signal.signal_tf, signal.chart_tf,
        signal.rr_planned, signal.note, JSON.stringify(signal.raw_json || {}), signal.status || 'NEW'
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
        const accounts = await client.query(`SELECT account_id, broker_id FROM accounts WHERE user_id = $1 AND status != 'ARCHIVED'`, [userId]);
        let created = 0; const accountIds = [];
        for (const row of accounts.rows || []) {
          const aid = row.account_id;
          const tradeId = mt5GenerateId("TRD");
          const ins = await client.query(`
            INSERT INTO trades (
              trade_id, account_id, user_id, broker_id, signal_id, source_id, origin_kind,
              symbol, side, intent_entry, intent_sl, intent_tp, intent_volume, intent_note,
              dispatch_status, execution_status, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,'SIGNAL',$7,$8,$9,$10,$11,$12,$13,'NEW','PENDING',$14,$14)
          `, [
            tradeId, aid, userId, row.broker_id, signalId, sourceId,
            payload.symbol, payload.side, payload.intent_entry, payload.intent_sl,
            payload.intent_tp, payload.intent_volume, payload.intent_note, mt5NowIso()
          ]);
          if ((ins.rowCount || 0) > 0) {
            created++; accountIds.push(aid);
            await client.query(`INSERT INTO logs (object_id, object_table, metadata, user_id) VALUES ($1,'trades',$2,$3)`, 
              [tradeId, JSON.stringify({ event: 'SIGNAL_FANOUT', signal_id: signalId }), userId]);
          }
        }
        await client.query("COMMIT");
        return { created, account_ids: accountIds };
      } catch (e) { await client.query("ROLLBACK"); throw e; }
      finally { client.release(); }
    },
    async pullLeasedTradesV2(accountId, maxItems = 1, leaseSeconds = 30) {
      const aid = String(accountId || "").trim();
      const leaseSec = Math.max(5, Math.min(300, Number(leaseSeconds) || 30));
      if (!aid) return [];
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const sel = await client.query(`
          SELECT * FROM trades
          WHERE account_id = $1 AND (dispatch_status = 'NEW' OR (dispatch_status = 'LEASED' AND lease_expires_at < NOW()))
          ORDER BY created_at ASC LIMIT $2 FOR UPDATE SKIP LOCKED
        `, [aid, Math.max(1, Math.min(100, Number(maxItems) || 1))]);
        const out = [];
        for (const row of sel.rows || []) {
          const leaseToken = crypto.randomUUID();
          const leaseExpiresAt = new Date(Date.now() + leaseSec * 1000).toISOString();
          await client.query(`UPDATE trades SET dispatch_status = 'LEASED', lease_token = $1, lease_expires_at = $2, updated_at = NOW() WHERE trade_id = $3`, [leaseToken, leaseExpiresAt, row.trade_id]);
          out.push({ ...row, lease_token: leaseToken, lease_expires_at: leaseExpiresAt });
        }
        await client.query("COMMIT"); return out;
      } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
    },
    async ackTradeV2(accountId, payload = {}) {
       const now = mt5NowIso();
       const res = await pool.query(`
         UPDATE trades
         SET execution_status = $1, broker_trade_id = $2, entry_exec = $3, pnl_realized = $4,
             closed_at = CASE WHEN $1 = 'CLOSED' THEN $5 ELSE closed_at END, updated_at = $5
         WHERE trade_id = $6 AND account_id = $7 RETURNING user_id
       `, [payload.execution_status, payload.broker_trade_id, payload.entry_exec, payload.pnl_realized, now, payload.trade_id, accountId]);
       if (res.rowCount > 0) {
         await this.log(payload.trade_id, 'trades', { event: 'ACK', status: payload.execution_status, pnl: payload.pnl_realized }, res.rows[0].user_id);
       }
       return { ok: res.rowCount > 0 };
    },
    async brokerSyncV2(accountId, payload = {}) {
      const aid = String(accountId || "").trim();
      const acc = await pool.query(`SELECT user_id FROM accounts WHERE account_id = $1`, [aid]);
      const uid = acc.rows[0]?.user_id || CFG.mt5DefaultUserId;
      await this.log(aid, 'accounts', { event: 'SYNC', data: payload }, uid);
      return { ok: true };
    },
    async brokerHeartbeatV2(accountId, payload = {}) {
      const aid = String(accountId || "").trim();
      const now = mt5NowIso();
      const acc = await pool.query(`SELECT user_id FROM accounts WHERE account_id = $1`, [aid]);
      const uid = acc.rows[0]?.user_id || CFG.mt5DefaultUserId;
      await pool.query(`UPDATE accounts SET updated_at = $1 WHERE account_id = $2`, [now, aid]);
      await this.log(aid, 'accounts', { event: 'HEARTBEAT', payload }, uid);
      return { ok: true };
    },
    async listSignals(limit, statusFilter, userId = null) {
      const clauses = ["signal_id NOT LIKE 'SYSTEM_%'"]; const params = [];
      if (statusFilter) { params.push(statusFilter); clauses.push(`status = $${params.length}`); }
      if (userId) { params.push(userId); clauses.push(`user_id = $${params.length}`); }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      params.push(limit);
      const res = await pool.query(`SELECT * FROM signals ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params);
      return res.rows;
    },
    async listTradesV2(filters = {}, page = 1, pageSize = 50) {
      const safePage = Math.max(1, Number(page) || 1); const safePageSize = Math.max(1, Math.min(200, Number(pageSize) || 50));
      const offset = (safePage - 1) * safePageSize; const clauses = []; const params = [];
      if (filters.user_id) { params.push(filters.user_id); clauses.push(`user_id = $${params.length}`); }
      if (filters.account_id) { params.push(filters.account_id); clauses.push(`account_id = $${params.length}`); }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const countRes = await pool.query(`SELECT COUNT(*) FROM trades ${where}`, params);
      params.push(safePageSize, offset);
      const res = await pool.query(`SELECT * FROM trades ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      return { items: res.rows, total: parseInt(countRes.rows[0].count), page: safePage, pageSize: safePageSize };
    },
    async listLogs(filters = {}, limit = 200, offset = 0) {
      const clauses = []; const params = [];
      if (filters.user_id) { params.push(filters.user_id); clauses.push(`user_id = $${params.length}`); }
      if (filters.object_id) { params.push(filters.object_id); clauses.push(`object_id = $${params.length}`); }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      params.push(limit, offset);
      const res = await pool.query(`SELECT * FROM logs ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      return res.rows;
    },
    async createAccountV2(payload = {}) {
       const res = await pool.query(`
         INSERT INTO accounts (account_id, user_id, status, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (account_id) DO UPDATE SET status = EXCLUDED.status, metadata = EXCLUDED.metadata, updated_at = NOW()
         RETURNING *
       `, [payload.account_id, payload.user_id || CFG.mt5DefaultUserId, payload.status || 'ACTIVE', payload.metadata || {}]);
       return res.rows[0];
    },
    async getAccountByIdV2(accountId) {
      const res = await pool.query(`SELECT * FROM accounts WHERE account_id = $1 LIMIT 1`, [accountId]);
      return res.rows[0] || null;
    }
  };
