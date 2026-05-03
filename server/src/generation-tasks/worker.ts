import { createId, getPostgresRepositories, isPostgresStoreBackend, storeRepository } from '../lib/store'
import { getAuthDomainStore, getGenerationTaskDomainStore } from '../lib/domain-store'
import type { GenerationMode, StoredGenerationTask, StoredProviderConfig, StoredWork } from '../auth/types'

const generationEndpoint = '/v1/images/generations'
const editEndpoint = '/v1/images/edits'
const workerIntervalMs = Number(process.env.GENERATION_WORKER_INTERVAL_MS ?? 1200)
const workerConcurrency = Math.max(1, Number(process.env.GENERATION_WORKER_CONCURRENCY ?? 2))
const fallbackProxyOrigin = process.env.GENERATION_PROXY_ORIGIN ?? 'http://127.0.0.1:5173'
const activeTaskIds = new Set<string>()
const activeControllers = new Map<string, AbortController>()
let started = false
let tickTimer: NodeJS.Timeout | null = null
let draining = false

type WorkerLogger = {
  info?: (payload: unknown, message?: string) => void
  warn?: (payload: unknown, message?: string) => void
  error?: (payload: unknown, message?: string) => void
}

export function startGenerationTaskWorker(_logger?: WorkerLogger) {}
export function cancelGenerationTaskProcessing(_taskId?: string) { return Promise.resolve() }
