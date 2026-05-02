import type { DataStore } from '../auth/types'
import { Pool } from 'pg'
import { createPostgresAuthTablesRepository } from './auth-tables.repository'
import { createPostgresContentTablesRepository } from './content-tables.repository'
import { createPostgresGenerationTaskTablesRepository } from './generation-task-tables.repository'
import { createJsonStoreRepository, createPostgresStoreRepository, type StoreRepository } from './store.repository'

let repositoryInstance: StoreRepository | null = null
let postgresPool: Pool | null = null

function getStoreBackend() {
  return (process.env.SERVER_STORE_BACKEND ?? 'json').trim().toLowerCase()
}

function getPostgresConnectionString() {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    throw new Error('SERVER_STORE_BACKEND=postgres 时必须提供 DATABASE_URL')
  }
  return connectionString
}

export function isPostgresStoreBackend() {
  return getStoreBackend() === 'postgres'
}

function getStoreRepository(): StoreRepository {
  if (repositoryInstance) return repositoryInstance

  if (isPostgresStoreBackend()) {
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
