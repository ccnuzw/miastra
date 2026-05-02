import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { readFile } from 'node:fs/promises'

loadEnv({ path: resolve(__dirname, '../.env') })
loadEnv({ path: resolve(__dirname, '../../.env'), override: false })

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    throw new Error('DATABASE_URL 未配置')
  }

  const pool = new Pool({ connectionString })
  try {
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
    console.log('Database schema initialized.')
  } finally {
    await pool.end()
  }
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
