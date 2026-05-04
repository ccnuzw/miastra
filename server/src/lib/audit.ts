import type { AuditLogRecord, DataStore } from '../auth/types'
import { getPostgresRepositories, isPostgresStoreBackend, storeRepository } from './store'

export type AppendAuditLogInput = {
  actorUserId: string
  actorRole: 'user' | 'operator' | 'admin'
  action: string
  targetType: string
  targetId: string
  payload?: unknown
  ip?: string
  requestId?: string
  createdAt?: string
}

export function createAuditLogRecord(input: AppendAuditLogInput): AuditLogRecord {
  return {
    id: storeRepository.createId(),
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    payload: input.payload ?? {},
    ip: input.ip,
    requestId: input.requestId,
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
}

export function appendAuditLogToStore(store: DataStore, input: AppendAuditLogInput) {
  const log = createAuditLogRecord(input)
  store.auditLogs = [...(store.auditLogs ?? []), log]
  return log
}

export async function appendAuditLog(input: AppendAuditLogInput) {
  const log = createAuditLogRecord(input)
  if (isPostgresStoreBackend()) {
    await getPostgresRepositories().audit.insertAuditLog(log)
    return log
  }

  await storeRepository.mutate((store) => {
    store.auditLogs = [...(store.auditLogs ?? []), log]
  })
  return log
}
