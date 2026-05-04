import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createDatabasePool, loadScriptEnv } from './db-utils'

loadScriptEnv()

export async function initializeDatabase() {
  const pool = createDatabasePool('数据库结构初始化')
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
    console.log('数据库结构已初始化。')
  } finally {
    await pool.end()
  }
}

async function main() {
  await initializeDatabase()
}

if (process.argv[1]?.endsWith('db-init.ts')) {
  void main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
