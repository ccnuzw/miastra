import type { AuditLogRecord, DataStore } from '../auth/types'
import { storeRepository } from './store'

export type AppendAuditLogInput = {
  actorUserId: string
  actorRole: 'user' | 'operator' | 'admin'
  action: string
  targetType: string
  targetId: string
  payload?: unknown
  ip?: string
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
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
}

export function appendAuditLogToStore(store: DataStore, input: AppendAuditLogInput) {
  const log = createAuditLogRecord(input)
  store.auditLogs = [...(store.auditLogs ?? []), log]
  return log
}

export async function appendAuditLog(input: AppendAuditLogInput) {
  await storeRepository.mutate((store) => {
    appendAuditLogToStore(store, input)
  })
}
