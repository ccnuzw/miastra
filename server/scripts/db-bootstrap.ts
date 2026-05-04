import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createDefaultQuotaProfile } from '../src/billing/plans'
import { createDatabasePool, loadScriptEnv } from './db-utils'

loadScriptEnv()

async function initializeSchema(pool: Awaited<ReturnType<typeof createDatabasePool>>) {
  const initSql = await readFile(resolve(__dirname, '../data/postgres-init.sql'), 'utf8')
  const coreSql = await readFile(resolve(__dirname, '../data/postgres-core-schema.sql'), 'utf8')
  const contentSql = await readFile(resolve(__dirname, '../data/postgres-content-schema.sql'), 'utf8')
  await pool.query(initSql)
  await pool.query(coreSql)
  await pool.query(contentSql)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quota_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      plan_name TEXT NOT NULL,
      quota_total INTEGER NOT NULL,
      quota_used INTEGER NOT NULL,
      quota_remaining INTEGER NOT NULL,
      renews_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS quota_profiles_updated_at_idx ON quota_profiles(updated_at DESC);
  `)
}

async function ensureFirstAdmin(pool: Awaited<ReturnType<typeof createDatabasePool>>) {
  const now = new Date().toISOString()
  const passwordHash = await bcrypt.hash('admin123', 10)
  const adminEmail = 'admin@miastra.local'
  const adminNickname = 'admin'

  const existing = await pool.query(`
    SELECT id, email, nickname
    FROM users
    WHERE lower(email) = lower($1) OR lower(nickname) = lower($2)
    LIMIT 1
  `, [adminEmail, adminNickname])

  if (existing.rows[0]) {
    await pool.query(`
      UPDATE users
      SET email = $2, nickname = $3, role = 'admin', password_hash = $4, updated_at = $5
      WHERE id = $1
    `, [existing.rows[0].id, adminEmail, adminNickname, passwordHash, now])
  } else {
    await pool.query(`
      INSERT INTO users (id, email, nickname, role, password_hash, password_reset_token, password_reset_expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, 'admin', $4, NULL, NULL, $5, $5)
    `, [randomUUID(), adminEmail, adminNickname, passwordHash, now])
  }

  const adminUser = await pool.query(`
    SELECT id
    FROM users
    WHERE lower(email) = lower($1) OR lower(nickname) = lower($2)
    LIMIT 1
  `, [adminEmail, adminNickname])
  const adminUserId = String(adminUser.rows[0].id)
  const quotaProfile = createDefaultQuotaProfile(adminUserId, now)

  await pool.query(`
    INSERT INTO quota_profiles (user_id, plan_name, quota_total, quota_used, quota_remaining, renews_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id) DO UPDATE
    SET plan_name = EXCLUDED.plan_name,
        quota_total = EXCLUDED.quota_total,
        quota_used = EXCLUDED.quota_used,
        quota_remaining = EXCLUDED.quota_remaining,
        renews_at = EXCLUDED.renews_at,
        updated_at = EXCLUDED.updated_at
  `, [quotaProfile.userId, quotaProfile.planName, quotaProfile.quotaTotal, quotaProfile.quotaUsed, quotaProfile.quotaRemaining, quotaProfile.renewsAt ?? null, quotaProfile.updatedAt])
}

export async function bootstrapDatabase() {
  const pool = createDatabasePool('数据库初始化')
  try {
    await initializeSchema(pool)
    await ensureFirstAdmin(pool)
    console.log('数据库结构和首个管理员已初始化。')
    console.log('管理员：admin / admin123')
  } finally {
    await pool.end()
  }
}

async function main() {
  await bootstrapDatabase()
}

if (process.argv[1]?.endsWith('db-bootstrap.ts')) {
  void main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
