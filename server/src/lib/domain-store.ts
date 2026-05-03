import { createId, getPostgresRepositories, isPostgresStoreBackend, storeRepository } from './store'
import type {
  AuthRecord,
  SessionRecord,
  StoredDrawBatch,
  StoredGenerationTask,
  StoredPromptTemplate,
  StoredProviderConfig,
  StoredQuotaProfile,
  StoredWork,
} from '../auth/types'

export type AuthDomainStore = {
  findUserByEmail: (email: string) => Promise<AuthRecord | null>
  findUserById: (id: string) => Promise<AuthRecord | null>
  createUser: (user: AuthRecord) => Promise<void>
  createSession: (session: SessionRecord) => Promise<void>
  revokeSession: (sessionId: string, revokedAt: string) => Promise<boolean>
  revokeSessionsByUserId: (userId: string, revokedAt: string, excludeSessionId?: string) => Promise<number>
  listSessionsByUserId: (userId: string) => Promise<SessionRecord[]>
  findAuthContext: (sessionId: string, userId: string) => Promise<{ user: AuthRecord, session: SessionRecord } | null>
  findProviderConfigByUserId: (userId: string) => Promise<StoredProviderConfig | null>
  upsertProviderConfig: (config: StoredProviderConfig) => Promise<void>
  findQuotaProfileByUserId: (userId: string) => Promise<StoredQuotaProfile | null>
  updateUserProfile: (userId: string, nickname: string, updatedAt: string) => Promise<AuthRecord | null>
  updatePasswordResetToken: (userId: string, token: string | null, expiresAt: string | null, updatedAt: string) => Promise<void>
  resetUserPasswordAndRevokeSessions: (userId: string, passwordHash: string, updatedAt: string, revokeOthersOnly?: { excludeSessionId: string }) => Promise<void>
}

export type ContentDomainStore = {
  listPromptTemplatesByUserId: (userId: string) => Promise<StoredPromptTemplate[]>
  upsertPromptTemplateForUser: (template: StoredPromptTemplate) => Promise<StoredPromptTemplate>
  deletePromptTemplateForUser: (userId: string, id: string) => Promise<boolean>
  listWorksByUserId: (userId: string) => Promise<StoredWork[]>
  replaceWorksByUserId: (userId: string, works: StoredWork[]) => Promise<void>
  listDrawBatchesByUserId: (userId: string) => Promise<StoredDrawBatch[]>
  replaceDrawBatchesByUserId: (userId: string, batches: StoredDrawBatch[]) => Promise<void>
}

export type GenerationTaskDomainStore = {
  listGenerationTasksByUserId: (userId: string) => Promise<StoredGenerationTask[]>
  findGenerationTaskById: (taskId: string) => Promise<StoredGenerationTask | null>
  findGenerationTaskByIdForUser: (taskId: string, userId: string) => Promise<StoredGenerationTask | null>
  insertGenerationTask: (task: StoredGenerationTask) => Promise<void>
  updateGenerationTask: (taskId: string, patch: Partial<StoredGenerationTask>) => Promise<StoredGenerationTask | null>
  claimNextQueuedGenerationTask: (updatedAt: string, excludedIds?: string[]) => Promise<StoredGenerationTask | null>
  completeGenerationTaskAndInsertWork: (taskId: string, taskPatch: Partial<StoredGenerationTask>, work: StoredWork) => Promise<void>
}

function toIsoString(value: string | Date | null | undefined) {
  if (!value) return null
  if (typeof value === 'string') return value
  return value.toISOString()
}

function mapAuthUser(row: Record<string, unknown>): AuthRecord {
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

function mapSession(row: Record<string, unknown>): SessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    expiresAt: new Date(row.expires_at as string | Date).toISOString(),
    revokedAt: toIsoString(row.revoked_at as string | Date | null | undefined),
  }
}

function mapProviderConfig(row: Record<string, unknown>): StoredProviderConfig {
  return {
    userId: String(row.user_id),
    providerId: String(row.provider_id),
    apiUrl: String(row.api_url),
    model: String(row.model),
    apiKey: String(row.api_key),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  }
}

function mapQuotaProfile(row: Record<string, unknown>): StoredQuotaProfile {
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

function mapPromptTemplate(row: Record<string, unknown>): StoredPromptTemplate {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: row.title ? String(row.title) : undefined,
    name: row.name ? String(row.name) : undefined,
    content: String(row.content ?? ''),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

function mapWork(row: Record<string, unknown>): StoredWork {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title ?? ''),
    src: row.src ? String(row.src) : undefined,
    meta: String(row.meta ?? ''),
    variation: row.variation ? String(row.variation) : undefined,
    batchId: row.batch_id ? String(row.batch_id) : undefined,
    drawIndex: row.draw_index === null || row.draw_index === undefined ? undefined : Number(row.draw_index),
    taskStatus: row.task_status ? String(row.task_status) as StoredWork['taskStatus'] : undefined,
    error: row.error ? String(row.error) : undefined,
    retryable: row.retryable === null || row.retryable === undefined ? undefined : Boolean(row.retryable),
    retryCount: row.retry_count === null || row.retry_count === undefined ? undefined : Number(row.retry_count),
    createdAt: row.created_at === null || row.created_at === undefined ? undefined : Number(row.created_at),
    mode: row.mode ? String(row.mode) as StoredWork['mode'] : undefined,
    providerModel: row.provider_model ? String(row.provider_model) : undefined,
    size: row.size ? String(row.size) : undefined,
    quality: row.quality ? String(row.quality) : undefined,
    snapshotId: row.snapshot_id ? String(row.snapshot_id) : undefined,
    generationSnapshot: row.generation_snapshot_json ?? undefined,
    promptSnippet: row.prompt_snippet ? String(row.prompt_snippet) : undefined,
    promptText: row.prompt_text ? String(row.prompt_text) : undefined,
    isFavorite: row.is_favorite === null || row.is_favorite === undefined ? undefined : Boolean(row.is_favorite),
    favorite: row.favorite === null || row.favorite === undefined ? undefined : Boolean(row.favorite),
    tags: Array.isArray(row.tags_json) ? row.tags_json.map(String) : undefined,
  }
}

function mapDrawBatch(row: Record<string, unknown>): StoredDrawBatch {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title ?? ''),
    createdAt: Number(row.created_at),
    strategy: String(row.strategy) as StoredDrawBatch['strategy'],
    concurrency: Number(row.concurrency),
    count: Number(row.count),
    successCount: Number(row.success_count),
    failedCount: Number(row.failed_count),
    cancelledCount: Number(row.cancelled_count ?? 0),
    interruptedCount: Number(row.interrupted_count ?? 0),
    timeoutCount: Number(row.timeout_count ?? 0),
    snapshotId: String(row.snapshot_id),
  }
}

function mapGenerationTask(row: Record<string, unknown>): StoredGenerationTask {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    status: row.status as StoredGenerationTask['status'],
    progress: row.progress === null || row.progress === undefined ? undefined : Number(row.progress),
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    payload: row.payload_json as StoredGenerationTask['payload'],
    result: (row.result_json ?? undefined) as StoredGenerationTask['result'],
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
  }
}

function workValues(work: StoredWork) {
  return [
    work.id,
    work.userId,
    work.title,
    work.src ?? null,
    work.meta,
    work.variation ?? null,
    work.batchId ?? null,
    work.drawIndex ?? null,
    work.taskStatus ?? null,
    work.error ?? null,
    work.retryable ?? null,
    work.retryCount ?? null,
    work.createdAt ?? null,
    work.mode ?? null,
    work.providerModel ?? null,
    work.size ?? null,
    work.quality ?? null,
    work.snapshotId ?? null,
    work.generationSnapshot ? JSON.stringify(work.generationSnapshot) : null,
    work.promptSnippet ?? null,
    work.promptText ?? null,
    work.isFavorite ?? null,
    work.favorite ?? null,
    work.tags ? JSON.stringify(work.tags) : null,
  ]
}

function promptTemplateValues(template: StoredPromptTemplate) {
  return [
    template.id,
    template.userId,
    template.title ?? null,
    template.name ?? null,
    template.content,
    typeof template.createdAt === 'number' ? new Date(template.createdAt).toISOString() : template.createdAt,
    template.updatedAt ? (typeof template.updatedAt === 'number' ? new Date(template.updatedAt).toISOString() : template.updatedAt) : (typeof template.createdAt === 'number' ? new Date(template.createdAt).toISOString() : template.createdAt),
  ]
}

function drawBatchValues(batch: StoredDrawBatch) {
  return [
    batch.id,
    batch.userId,
    batch.title,
    batch.createdAt,
    batch.strategy,
    batch.concurrency,
    batch.count,
    batch.successCount,
    batch.failedCount,
    batch.cancelledCount,
    batch.interruptedCount,
    batch.timeoutCount,
    batch.snapshotId,
  ]
}

function getJsonStore() {
  return storeRepository
}

export function getAuthDomainStore(): AuthDomainStore {
  if (isPostgresStoreBackend()) {
    const { auth } = getPostgresRepositories()
    return {
      findUserByEmail: auth.findUserByEmail,
      findUserById: auth.findUserById,
      createUser: auth.createUser,
      createSession: auth.createSession,
      revokeSession: auth.revokeSession,
      revokeSessionsByUserId: auth.revokeSessionsByUserId,
      listSessionsByUserId: auth.listSessionsByUserId,
      findAuthContext: auth.findAuthContext,
      findProviderConfigByUserId: auth.findProviderConfigByUserId,
      upsertProviderConfig: auth.upsertProviderConfig,
      findQuotaProfileByUserId: auth.findQuotaProfileByUserId,
      updateUserProfile: auth.updateUserProfile,
      updatePasswordResetToken: auth.updatePasswordResetToken,
      resetUserPasswordAndRevokeSessions: auth.resetUserPasswordAndRevokeSessions,
    }
  }

  return {
    async findUserByEmail(email) {
      const store = await getJsonStore().read()
      return store.users.find((user) => user.email === email) ?? null
    },
    async findUserById(id) {
      const store = await getJsonStore().read()
      return store.users.find((user) => user.id === id) ?? null
    },
    async createUser(user) {
      const store = await getJsonStore().read()
      store.users.push(user)
      await getJsonStore().write(store)
    },
    async createSession(session) {
      const store = await getJsonStore().read()
      store.sessions.push(session)
      await getJsonStore().write(store)
    },
    async revokeSession(sessionId, revokedAt) {
      const store = await getJsonStore().read()
      const session = store.sessions.find((item) => item.id === sessionId)
      if (!session) return false
      session.revokedAt = revokedAt
      await getJsonStore().write(store)
      return true
    },
    async revokeSessionsByUserId(userId, revokedAt, excludeSessionId) {
      const store = await getJsonStore().read()
      let revoked = 0
      store.sessions.forEach((session) => {
        if (session.userId === userId && session.id !== excludeSessionId && !session.revokedAt) {
          session.revokedAt = revokedAt
          revoked += 1
        }
      })
      await getJsonStore().write(store)
      return revoked
    },
    async listSessionsByUserId(userId) {
      const store = await getJsonStore().read()
      return store.sessions.filter((session) => session.userId === userId)
    },
    async findAuthContext(sessionId, userId) {
      const store = await getJsonStore().read()
      const session = store.sessions.find((item) => item.id === sessionId && item.userId === userId) ?? null
      if (!session) return null
      const user = store.users.find((item) => item.id === userId) ?? null
      if (!user) return null
      return { user, session }
    },
    async findProviderConfigByUserId(userId) {
      const store = await getJsonStore().read()
      return store.providerConfigs.find((item) => item.userId === userId) ?? null
    },
    async upsertProviderConfig(config) {
      const store = await getJsonStore().read()
      store.providerConfigs = [...store.providerConfigs.filter((item) => item.userId !== config.userId), config]
      await getJsonStore().write(store)
    },
    async findQuotaProfileByUserId(userId) {
      const store = await getJsonStore().read()
      return store.quotaProfiles.find((item) => item.userId === userId) ?? null
    },
    async updateUserProfile(userId, nickname, updatedAt) {
      const store = await getJsonStore().read()
      const user = store.users.find((item) => item.id === userId)
      if (!user) return null
      user.nickname = nickname
      user.updatedAt = updatedAt
      await getJsonStore().write(store)
      return user
    },
    async updatePasswordResetToken(userId, token, expiresAt, updatedAt) {
      const store = await getJsonStore().read()
      const user = store.users.find((item) => item.id === userId)
      if (!user) return
      user.passwordResetToken = token
      user.passwordResetExpiresAt = expiresAt
      user.updatedAt = updatedAt
      await getJsonStore().write(store)
    },
    async resetUserPasswordAndRevokeSessions(userId, passwordHash, updatedAt, revokeOthersOnly) {
      const store = await getJsonStore().read()
      const user = store.users.find((item) => item.id === userId)
      if (!user) return
      user.passwordHash = passwordHash
      user.passwordResetToken = null
      user.passwordResetExpiresAt = null
      user.updatedAt = updatedAt
      store.sessions.forEach((session) => {
        if (session.userId === userId && session.id !== revokeOthersOnly?.excludeSessionId && !session.revokedAt) {
          session.revokedAt = updatedAt
        }
      })
      await getJsonStore().write(store)
    },
  }
}

export function getContentDomainStore(): ContentDomainStore {
  if (isPostgresStoreBackend()) {
    const { content } = getPostgresRepositories()
    return {
      listPromptTemplatesByUserId: content.listPromptTemplatesByUserId,
      upsertPromptTemplateForUser: content.upsertPromptTemplateForUser,
      deletePromptTemplateForUser: content.deletePromptTemplateForUser,
      listWorksByUserId: content.listWorksByUserId,
      replaceWorksByUserId: content.replaceWorksByUserId,
      listDrawBatchesByUserId: content.listDrawBatchesByUserId,
      replaceDrawBatchesByUserId: content.replaceDrawBatchesByUserId,
    }
  }

  return {
    async listPromptTemplatesByUserId(userId) {
      const store = await getJsonStore().read()
      return store.promptTemplates.filter((item) => item.userId === userId)
    },
    async upsertPromptTemplateForUser(template) {
      const store = await getJsonStore().read()
      store.promptTemplates = [
        ...store.promptTemplates.filter((item) => !(item.id === template.id && item.userId === template.userId)),
        template,
      ]
      await getJsonStore().write(store)
      return template
    },
    async deletePromptTemplateForUser(userId, id) {
      const store = await getJsonStore().read()
      const before = store.promptTemplates.length
      store.promptTemplates = store.promptTemplates.filter((item) => !(item.userId === userId && item.id === id))
      await getJsonStore().write(store)
      return store.promptTemplates.length !== before
    },
    async listWorksByUserId(userId) {
      const store = await getJsonStore().read()
      return store.works.filter((item) => item.userId === userId)
    },
    async replaceWorksByUserId(userId, works) {
      const store = await getJsonStore().read()
      store.works = [...store.works.filter((item) => item.userId !== userId), ...works]
      await getJsonStore().write(store)
    },
    async listDrawBatchesByUserId(userId) {
      const store = await getJsonStore().read()
      return store.drawBatches.filter((item) => item.userId === userId)
    },
    async replaceDrawBatchesByUserId(userId, batches) {
      const store = await getJsonStore().read()
      store.drawBatches = [...store.drawBatches.filter((item) => item.userId !== userId), ...batches]
      await getJsonStore().write(store)
    },
  }
}

export function getGenerationTaskDomainStore(): GenerationTaskDomainStore {
  if (isPostgresStoreBackend()) {
    const { generationTasks } = getPostgresRepositories()
    return {
      listGenerationTasksByUserId: generationTasks.listGenerationTasksByUserId,
      findGenerationTaskById: generationTasks.findGenerationTaskById,
      findGenerationTaskByIdForUser: generationTasks.findGenerationTaskByIdForUser,
      insertGenerationTask: generationTasks.insertGenerationTask,
      updateGenerationTask: generationTasks.updateGenerationTask,
      claimNextQueuedGenerationTask: generationTasks.claimNextQueuedGenerationTask,
      completeGenerationTaskAndInsertWork: generationTasks.completeGenerationTaskAndInsertWork,
    }
  }

  return {
    async listGenerationTasksByUserId(userId) {
      const store = await getJsonStore().read()
      return store.generationTasks.filter((item) => item.userId === userId).sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
    },
    async findGenerationTaskById(taskId) {
      const store = await getJsonStore().read()
      return store.generationTasks.find((item) => item.id === taskId) ?? null
    },
    async findGenerationTaskByIdForUser(taskId, userId) {
      const store = await getJsonStore().read()
      return store.generationTasks.find((item) => item.id === taskId && item.userId === userId) ?? null
    },
    async insertGenerationTask(task) {
      const store = await getJsonStore().read()
      store.generationTasks.unshift(task)
      await getJsonStore().write(store)
    },
    async updateGenerationTask(taskId, patch) {
      const store = await getJsonStore().read()
      const task = store.generationTasks.find((item) => item.id === taskId)
      if (!task) return null
      task.status = patch.status ?? task.status
      task.progress = patch.progress ?? task.progress
      task.errorMessage = patch.errorMessage ?? task.errorMessage
      task.payload = patch.payload ?? task.payload
      task.result = patch.result ?? task.result
      task.updatedAt = (patch.updatedAt as string) ?? new Date().toISOString()
      await getJsonStore().write(store)
      return task
    },
    async claimNextQueuedGenerationTask(updatedAt, excludedIds = []) {
      const store = await getJsonStore().read()
      const nextTask = store.generationTasks.find((item) => item.status === 'queued' && !excludedIds.includes(item.id)) ?? null
      if (!nextTask) return null
      nextTask.status = 'running'
      nextTask.progress = Math.max(nextTask.progress ?? 0, 15)
      nextTask.errorMessage = undefined
      nextTask.updatedAt = updatedAt
      await getJsonStore().write(store)
      return nextTask
    },
    async completeGenerationTaskAndInsertWork(taskId, taskPatch, work) {
      const store = await getJsonStore().read()
      const task = store.generationTasks.find((item) => item.id === taskId)
      if (!task) return
      task.status = taskPatch.status ?? task.status
      task.progress = taskPatch.progress ?? task.progress
      task.errorMessage = taskPatch.errorMessage ?? task.errorMessage
      task.payload = taskPatch.payload ?? task.payload
      task.result = taskPatch.result ?? task.result
      task.updatedAt = taskPatch.updatedAt ?? new Date().toISOString()
      const exists = store.works.some((item) => item.userId === work.userId && item.snapshotId === work.snapshotId)
      if (!exists) store.works.unshift(work)
      await getJsonStore().write(store)
    },
  }
}
