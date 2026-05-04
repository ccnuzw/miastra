import type { Pool } from 'pg'
import type { AuditLogRecord } from '../auth/types'

export type AuditLogTablesRepository = {
  listAuditLogs: () => Promise<AuditLogRecord[]>
  insertAuditLog: (log: AuditLogRecord) => Promise<void>
}

export function createPostgresAuditLogTablesRepository(pool: Pool): AuditLogTablesRepository {
  return {
    async listAuditLogs() {
      const result = await pool.query(`
        SELECT id, actor_user_id, actor_role, action, target_type, target_id, payload_json, ip, request_id, created_at
        FROM audit_logs
        ORDER BY created_at DESC
      `)
      return result.rows.map((row) => ({
        id: String(row.id),
        actorUserId: String(row.actor_user_id),
        actorRole: row.actor_role as AuditLogRecord['actorRole'],
        action: String(row.action),
        targetType: String(row.target_type),
        targetId: String(row.target_id),
        payload: row.payload_json,
        ip: row.ip ? String(row.ip) : undefined,
        requestId: row.request_id ? String(row.request_id) : undefined,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      }))
    },
    async insertAuditLog(log: AuditLogRecord) {
      await pool.query(
        `INSERT INTO audit_logs (id, actor_user_id, actor_role, action, target_type, target_id, payload_json, ip, request_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)`,
        [log.id, log.actorUserId, log.actorRole, log.action, log.targetType, log.targetId, JSON.stringify(log.payload), log.ip ?? null, log.requestId ?? null, log.createdAt],
      )
    },
  }
}
