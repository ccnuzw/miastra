import type { Pool } from 'pg'
import type { AuthRecord, SessionRecord, StoredBillingInvoice, StoredProviderConfig, StoredQuotaProfile } from '../auth/types'

export type AuthContextRecord = {
  user: AuthRecord
  session: SessionRecord
}

export type AuthTablesRepository = {
  listUsers: () => Promise<AuthRecord[]>
  listSessions: () => Promise<SessionRecord[]>
  listProviderConfigs: () => Promise<StoredProviderConfig[]>
  findUserByEmail: (email: string) => Promise<AuthRecord | null>
  findUserByLoginIdentifier: (identifier: string) => Promise<AuthRecord | null>
  findUserById: (id: string) => Promise<AuthRecord | null>
  createUser: (user: AuthRecord) => Promise<void>
  updateUserProfile: (userId: string, nickname: string, updatedAt: string) => Promise<AuthRecord | null>
  updatePasswordResetToken: (userId: string, token: string | null, expiresAt: string | null, updatedAt: string) => Promise<void>
  resetUserPassword: (userId: string, passwordHash: string, updatedAt: string) => Promise<void>
  resetUserPasswordAndRevokeSessions: (userId: string, passwordHash: string, updatedAt: string, revokeOthersOnly?: { excludeSessionId: string }) => Promise<void>
  updateSessionExpiresAt: (sessionId: string, userId: string, expiresAt: string) => Promise<boolean>
  findSessionById: (id: string) => Promise<SessionRecord | null>
  createSession: (session: SessionRecord) => Promise<void>
  revokeSession: (sessionId: string, revokedAt: string) => Promise<boolean>
  revokeSessionsByUserId: (userId: string, revokedAt: string, excludeSessionId?: string) => Promise<number>
  listSessionsByUserId: (userId: string) => Promise<SessionRecord[]>
  findAuthContext: (sessionId: string, userId: string) => Promise<AuthContextRecord | null>
  findProviderConfigByUserId: (userId: string) => Promise<StoredProviderConfig | null>
  upsertProviderConfig: (config: StoredProviderConfig) => Promise<void>
  findQuotaProfileByUserId: (userId: string) => Promise<StoredQuotaProfile | null>
  upsertQuotaProfile: (profile: StoredQuotaProfile) => Promise<void>
  listQuotaProfiles: () => Promise<StoredQuotaProfile[]>
  listBillingInvoices: () => Promise<StoredBillingInvoice[]>
  listBillingInvoicesByUserId: (userId: string) => Promise<StoredBillingInvoice[]>
}

function toIsoString(value: string | Date | null | undefined) {
  if (!value) return null
  if (typeof value === 'string') return value
  return value.toISOString()
}

function mapUserRow(row: Record<string, unknown>): AuthRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    nickname: String(row.nickname),
    role: row.role as AuthRecord['role'],
    passwordHash: String(row.password_hash),
    passwordResetToken: row.password_reset_token ? String(row.password_reset_token) : null,
    passwordResetExpiresAt: toIsoString(row.password_reset_expires_at as string | Date | null | undefined),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  }
}

function mapSessionRow(row: Record<string, unknown>): SessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    expiresAt: new Date(row.expires_at as string | Date).toISOString(),
    revokedAt: toIsoString(row.revoked_at as string | Date | null | undefined),
  }
}

function mapProviderConfigRow(row: Record<string, unknown>): StoredProviderConfig {
  return {
    userId: String(row.user_id),
    mode: row.mode === 'managed' ? 'managed' : 'custom',
    providerId: String(row.provider_id),
    managedProviderId: row.managed_provider_id ? String(row.managed_provider_id) : undefined,
    apiUrl: String(row.api_url),
    model: String(row.model),
    apiKey: String(row.api_key),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  }
}

function mapQuotaProfileRow(row: Record<string, unknown>): StoredQuotaProfile {
  return {
    userId: String(row.user_id),
    planName: String(row.plan_name),
    quotaTotal: Number(row.quota_total),
    quotaUsed: Number(row.quota_used),
    quotaRemaining: Number(row.quota_remaining),
    renewsAt: toIsoString(row.renews_at as string | Date | null | undefined),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  }
}

function mapBillingInvoiceRow(row: Record<string, unknown>): StoredBillingInvoice {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    planName: String(row.plan_name),
    amountCents: Number(row.amount_cents),
    currency: String(row.currency),
    status: row.status as StoredBillingInvoice['status'],
    provider: row.provider as StoredBillingInvoice['provider'],
    providerRef: row.provider_ref ? String(row.provider_ref) : undefined,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  }
}

export function createPostgresAuthTablesRepository(pool: Pool): AuthTablesRepository {
  return {
    async listUsers() {
      const result = await pool.query(`
        SELECT id, email, nickname, role, password_hash, password_reset_token, password_reset_expires_at, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
      `)
      return result.rows.map(mapUserRow)
    },
    async listSessions() {
      const result = await pool.query(`
        SELECT id, user_id, created_at, expires_at, revoked_at
        FROM sessions
        ORDER BY created_at DESC
      `)
      return result.rows.map(mapSessionRow)
    },
    async listProviderConfigs() {
      const result = await pool.query(`
        SELECT user_id, mode, provider_id, managed_provider_id, api_url, model, api_key, updated_at
        FROM provider_configs
        ORDER BY updated_at DESC
      `)
      return result.rows.map(mapProviderConfigRow)
    },
    async findUserByEmail(email) {
      const result = await pool.query(`
        SELECT id, email, nickname, role, password_hash, password_reset_token, password_reset_expires_at, created_at, updated_at
        FROM users
        WHERE email = $1
        LIMIT 1
      `, [email])
      return result.rows[0] ? mapUserRow(result.rows[0]) : null
    },
    async findUserByLoginIdentifier(identifier) {
      const result = await pool.query(`
        SELECT id, email, nickname, role, password_hash, password_reset_token, password_reset_expires_at, created_at, updated_at
        FROM users
        WHERE lower(email) = lower($1) OR lower(nickname) = lower($1)
        LIMIT 1
      `, [identifier])
      return result.rows[0] ? mapUserRow(result.rows[0]) : null
    },
    async findUserById(id) {
      const result = await pool.query(`
        SELECT id, email, nickname, role, password_hash, password_reset_token, password_reset_expires_at, created_at, updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `, [id])
      return result.rows[0] ? mapUserRow(result.rows[0]) : null
    },
    async createUser(user) {
      await pool.query(
        `INSERT INTO users (id, email, nickname, role, password_hash, password_reset_token, password_reset_expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [user.id, user.email, user.nickname, user.role, user.passwordHash, user.passwordResetToken ?? null, user.passwordResetExpiresAt ?? null, user.createdAt, user.updatedAt],
      )
    },
    async updateUserProfile(userId, nickname, updatedAt) {
      const result = await pool.query(`
        UPDATE users
        SET nickname = $2, updated_at = $3
        WHERE id = $1
        RETURNING id, email, nickname, role, password_hash, password_reset_token, password_reset_expires_at, created_at, updated_at
      `, [userId, nickname, updatedAt])
      return result.rows[0] ? mapUserRow(result.rows[0]) : null
    },
    async updatePasswordResetToken(userId, token, expiresAt, updatedAt) {
      await pool.query(`
        UPDATE users
        SET password_reset_token = $2, password_reset_expires_at = $3, updated_at = $4
        WHERE id = $1
      `, [userId, token, expiresAt, updatedAt])
    },
    async resetUserPassword(userId, passwordHash, updatedAt) {
      await pool.query(`
        UPDATE users
        SET password_hash = $2, password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = $3
        WHERE id = $1
      `, [userId, passwordHash, updatedAt])
    },
    async resetUserPasswordAndRevokeSessions(userId, passwordHash, updatedAt, revokeOthersOnly) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(`
          UPDATE users
          SET password_hash = $2, password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = $3
          WHERE id = $1
        `, [userId, passwordHash, updatedAt])
        if (revokeOthersOnly?.excludeSessionId) {
          await client.query(`
            UPDATE sessions
            SET revoked_at = $2
            WHERE user_id = $1 AND id <> $3 AND revoked_at IS NULL
          `, [userId, updatedAt, revokeOthersOnly.excludeSessionId])
        } else {
          await client.query(`
            UPDATE sessions
            SET revoked_at = $2
            WHERE user_id = $1 AND revoked_at IS NULL
          `, [userId, updatedAt])
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    async updateSessionExpiresAt(sessionId, userId, expiresAt) {
      const result = await pool.query(`
        UPDATE sessions
        SET expires_at = $3
        WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
      `, [sessionId, userId, expiresAt])
      return result.rowCount > 0
    },
    async findSessionById(id) {
      const result = await pool.query(`
        SELECT id, user_id, created_at, expires_at, revoked_at
        FROM sessions
        WHERE id = $1
        LIMIT 1
      `, [id])
      return result.rows[0] ? mapSessionRow(result.rows[0]) : null
    },
    async createSession(session) {
      await pool.query(
        `INSERT INTO sessions (id, user_id, created_at, expires_at, revoked_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [session.id, session.userId, session.createdAt, session.expiresAt, session.revokedAt ?? null],
      )
    },
    async revokeSession(sessionId, revokedAt) {
      const result = await pool.query(`
        UPDATE sessions
        SET revoked_at = $2
        WHERE id = $1 AND revoked_at IS NULL
      `, [sessionId, revokedAt])
      return result.rowCount > 0
    },
    async revokeSessionsByUserId(userId, revokedAt, excludeSessionId) {
      const result = await pool.query(`
        UPDATE sessions
        SET revoked_at = $2
        WHERE user_id = $1 AND revoked_at IS NULL AND ($3::text IS NULL OR id <> $3)
      `, [userId, revokedAt, excludeSessionId ?? null])
      return result.rowCount
    },
    async listSessionsByUserId(userId) {
      const result = await pool.query(`
        SELECT id, user_id, created_at, expires_at, revoked_at
        FROM sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId])
      return result.rows.map(mapSessionRow)
    },
    async findAuthContext(sessionId, userId) {
      const result = await pool.query(`
        SELECT
          s.id AS session_id,
          s.user_id AS session_user_id,
          s.created_at AS session_created_at,
          s.expires_at AS session_expires_at,
          s.revoked_at AS session_revoked_at,
          u.id,
          u.email,
          u.nickname,
          u.role,
          u.password_hash,
          u.password_reset_token,
          u.password_reset_expires_at,
          u.created_at,
          u.updated_at
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = $1 AND s.user_id = $2
        LIMIT 1
      `, [sessionId, userId])
      const row = result.rows[0]
      if (!row) return null
      return {
        user: mapUserRow(row),
        session: {
          id: String(row.session_id),
          userId: String(row.session_user_id),
          createdAt: new Date(row.session_created_at as string | Date).toISOString(),
          expiresAt: new Date(row.session_expires_at as string | Date).toISOString(),
          revokedAt: toIsoString(row.session_revoked_at as string | Date | null | undefined),
        },
      }
    },
    async findProviderConfigByUserId(userId) {
      const result = await pool.query(`
        SELECT user_id, mode, provider_id, managed_provider_id, api_url, model, api_key, updated_at
        FROM provider_configs
        WHERE user_id = $1
        LIMIT 1
      `, [userId])
      return result.rows[0] ? mapProviderConfigRow(result.rows[0]) : null
    },
    async upsertProviderConfig(config) {
      await pool.query(`
        INSERT INTO provider_configs (user_id, mode, provider_id, managed_provider_id, api_url, model, api_key, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id)
        DO UPDATE SET mode = EXCLUDED.mode, provider_id = EXCLUDED.provider_id, managed_provider_id = EXCLUDED.managed_provider_id, api_url = EXCLUDED.api_url, model = EXCLUDED.model, api_key = EXCLUDED.api_key, updated_at = EXCLUDED.updated_at
      `, [config.userId, config.mode, config.providerId, config.managedProviderId ?? null, config.apiUrl, config.model, config.apiKey, config.updatedAt])
    },
    async findQuotaProfileByUserId(userId) {
      const result = await pool.query(`
        SELECT user_id, plan_name, quota_total, quota_used, quota_remaining, renews_at, updated_at
        FROM quota_profiles
        WHERE user_id = $1
        LIMIT 1
      `, [userId])
      return result.rows[0] ? mapQuotaProfileRow(result.rows[0]) : null
    },
    async upsertQuotaProfile(profile) {
      await pool.query(
        `INSERT INTO quota_profiles (user_id, plan_name, quota_total, quota_used, quota_remaining, renews_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id)
         DO UPDATE SET plan_name = EXCLUDED.plan_name, quota_total = EXCLUDED.quota_total, quota_used = EXCLUDED.quota_used, quota_remaining = EXCLUDED.quota_remaining, renews_at = EXCLUDED.renews_at, updated_at = EXCLUDED.updated_at`,
        [profile.userId, profile.planName, profile.quotaTotal, profile.quotaUsed, profile.quotaRemaining, profile.renewsAt ?? null, profile.updatedAt],
      )
    },
    async listQuotaProfiles() {
      const result = await pool.query(`
        SELECT user_id, plan_name, quota_total, quota_used, quota_remaining, renews_at, updated_at
        FROM quota_profiles
        ORDER BY updated_at DESC
      `)
      return result.rows.map(mapQuotaProfileRow)
    },
    async listBillingInvoices() {
      const result = await pool.query(`
        SELECT id, user_id, plan_name, amount_cents, currency, status, provider, provider_ref, created_at, updated_at
        FROM billing_invoices
        ORDER BY created_at DESC
      `)
      return result.rows.map(mapBillingInvoiceRow)
    },
    async listBillingInvoicesByUserId(userId) {
      const result = await pool.query(`
        SELECT id, user_id, plan_name, amount_cents, currency, status, provider, provider_ref, created_at, updated_at
        FROM billing_invoices
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId])
      return result.rows.map(mapBillingInvoiceRow)
    },
  }
}
