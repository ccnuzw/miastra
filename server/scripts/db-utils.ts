import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { Pool } from 'pg'

export function loadScriptEnv() {
  loadEnv({ path: resolve(__dirname, '../.env') })
  loadEnv({ path: resolve(__dirname, '../../.env'), override: false })
}

export function requireDatabaseUrl(context: string) {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    throw new Error(`${context} 需要配置 DATABASE_URL。请先在根目录 .env 中设置 SERVER_STORE_BACKEND=postgres 和 DATABASE_URL。`)
  }
  return connectionString
}

export function createDatabasePool(context: string) {
  return new Pool({ connectionString: requireDatabaseUrl(context) })
}
