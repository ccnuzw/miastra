import type { DataStore } from '../auth/types'
import { Pool } from 'pg'
import { createPostgresAuthTablesRepository } from './auth-tables.repository'
import { createPostgresAuditLogTablesRepository } from './audit-log-tables.repository'
import { createPostgresContentTablesRepository } from './content-tables.repository'
import { createPostgresGenerationTaskTablesRepository } from './generation-task-tables.repository'
import { createJsonStoreRepository, createPostgresStoreRepository, type StoreRepository } from './store.repository'

let repositoryInstance: StoreRepository | null = null
let postgresPool: Pool | null = null

type StoreBackend = 'json' | 'postgres'

function resolveStoreBackend() {
  const raw = process.env.SERVER_STORE_BACKEND?.trim().toLowerCase()
  if (!raw) {
    return {
      backend: process.env.NODE_ENV === 'production' ? 'postgres' : 'json',
      raw: undefined,
      valid: true,
    }
  }

  if (raw === 'json' || raw === 'postgres') {
    return {
      backend: raw as StoreBackend,
      raw,
      valid: true,
    }
  }

  return {
    backend: process.env.NODE_ENV === 'production' ? 'postgres' : 'json',
    raw,
    valid: false,
    error: `SERVER_STORE_BACKEND 必须是 json 或 postgres，当前值为 ${raw}`,
  }
}

function _getStoreBackend() {
  return resolveStoreBackend().backend
}

function assertStoreBackend() {
  const config = resolveStoreBackend()
  if (!config.valid) {
    throw new Error(config.error)
  }
  return config
}

function getPostgresConnectionString() {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    throw new Error('SERVER_STORE_BACKEND=postgres 时必须提供 DATABASE_URL')
  }
  return connectionString
}

export function isPostgresStoreBackend() {
  return assertStoreBackend().backend === 'postgres'
}

function getStoreRepository(): StoreRepository {
  if (repositoryInstance) return repositoryInstance

  const backend = assertStoreBackend().backend
  if (backend === 'postgres') {
    repositoryInstance = createPostgresStoreRepository({ connectionString: getPostgresConnectionString() })
    return repositoryInstance
  }

  repositoryInstance = createJsonStoreRepository()
  return repositoryInstance
}

function getPostgresPool() {
  if (postgresPool) return postgresPool
  postgresPool = new Pool({ connectionString: getPostgresConnectionString() })
  return postgresPool
}

export function getPostgresRepositories() {
  const pool = getPostgresPool()
  return {
    pool,
    auth: createPostgresAuthTablesRepository(pool),
    audit: createPostgresAuditLogTablesRepository(pool),
    content: createPostgresContentTablesRepository(pool),
    generationTasks: createPostgresGenerationTaskTablesRepository(pool),
  }
}

export const storeRepository: StoreRepository = {
  async read() {
    return await getStoreRepository().read()
  },
  async write(store) {
    await getStoreRepository().write(store)
  },
  async mutate(updater) {
    return await getStoreRepository().mutate(updater)
  },
  createId() {
    return getStoreRepository().createId()
  },
  async close() {
    await repositoryInstance?.close?.()
    repositoryInstance = null
    if (postgresPool) {
      await postgresPool.end()
      postgresPool = null
    }
  },
}

export async function readStore() {
  return await storeRepository.read()
}

export async function writeStore(store: DataStore) {
  await storeRepository.write(store)
}

export function createId() {
  return storeRepository.createId()
}

export function getStoreRuntimeInfo() {
  const resolved = resolveStoreBackend()
  return {
    backend: resolved.backend,
    rawBackend: resolved.raw,
    valid: resolved.valid,
    error: resolved.valid ? undefined : resolved.error,
    isPostgres: resolved.backend === 'postgres',
    isProduction: process.env.NODE_ENV === 'production',
  }
}

export async function resetStoreRepositoryForTests() {
  await storeRepository.close?.()
}
