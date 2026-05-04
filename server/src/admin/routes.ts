import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { testManagedObjectStorage } from '../assets/object-storage.service'
import {
  assetStorageModeLabel,
  createDefaultAssetStorageConfig,
  materializeWorkAsset,
  normalizeAssetStorageConfig,
} from '../assets/storage.service'
import { requireRole, resolveAuthenticatedContext } from '../auth/routes'
import type {
  AuditLogRecord,
  AuthRecord,
  StoredGenerationTask,
  StoredQuotaProfile,
  StoredWork,
} from '../auth/types'
import { createDefaultQuotaProfile } from '../billing/plans'
import {
  buildLatestTaskMap,
  getTaskRootTaskId,
  sanitizeTask as sanitizeGenerationTask,
  sortTaskAttemptsDesc,
} from '../generation-tasks/state'
import { cancelGenerationTaskProcessing } from '../generation-tasks/worker'
import { appendAuditLogToStore } from '../lib/audit'
import { fail, ok } from '../lib/http'
import { storeRepository } from '../lib/store'
import {
  normalizeManagedProvider,
  normalizeManagedProviderModels,
  validateManagedProvider,
} from '../provider-config/provider.service'
import {
  joinProviderUrl,
  resolveProviderBaseUrl,
  validateProviderApiUrl,
} from '../provider-config/provider.utils'
import { signResetToken } from '../auth/token'
import {
  backendAdminRoles,
  getAdminPolicies,
  getAdminUserManagement,
  getAssignableAdminRoles,
} from './policy'

const roleSchema = z.enum(['user', 'operator', 'admin'])
const userStatusSchema = z.enum(['active', 'frozen', 'disabled'])
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  query: z.string().trim().optional(),
})
const usersQuerySchema = paginationSchema.extend({
  role: roleSchema.optional(),
  status: userStatusSchema.optional(),
  loginState: z.enum(['recent-7d', 'inactive-30d', 'never']).optional(),
})
const tasksQuerySchema = paginationSchema.extend({
  status: z
    .enum(['pending', 'queued', 'running', 'succeeded', 'failed', 'cancelled', 'timeout'])
    .optional(),
  view: z.enum(['current', 'history']).default('current'),
  userId: z.string().trim().optional(),
})
const worksQuerySchema = paginationSchema.extend({
  userId: z.string().trim().optional(),
})
const auditQuerySchema = paginationSchema.extend({
  actorRole: z.enum(['user', 'operator', 'admin']).optional(),
  action: z.string().trim().optional(),
  targetType: z.string().trim().optional(),
  targetId: z.string().trim().optional(),
})
const bulkUserSessionsSchema = z.object({
  userIds: z.array(z.string().trim().min(1)).min(1).max(100),
})
const bulkUserStatusSchema = z.object({
  userIds: z.array(z.string().trim().min(1)).min(1).max(100),
  status: userStatusSchema,
  reason: z.string().trim().max(200).optional(),
})
const bulkTaskCancelSchema = z.object({
  taskIds: z.array(z.string().trim().min(1)).min(1).max(100),
})
const bulkWorkDeleteSchema = z.object({
  workIds: z.array(z.string().trim().min(1)).min(1).max(100),
})
const bulkWorkRetryAssetSchema = z.object({
  workIds: z.array(z.string().trim().min(1)).min(1).max(100),
})
const updateUserRoleSchema = z.object({
  role: roleSchema,
})
const updateUserStatusSchema = z.object({
  status: userStatusSchema,
  reason: z.string().trim().max(200).optional(),
})
const adjustUserQuotaSchema = z.object({
  delta: z.coerce
    .number()
    .int()
    .refine((value) => value !== 0, '额度变更不能为 0'),
  reason: z.string().trim().min(1).max(200),
})
const updateUserProviderPolicySchema = z.object({
  allowManagedProviders: z.boolean(),
  allowCustomProvider: z.boolean(),
  allowedManagedProviderIds: z.array(z.string().trim().min(1)).max(100).default([]),
  allowedModels: z.array(z.string().trim().min(1)).max(200).default([]),
})
const createUserNoteSchema = z.object({
  content: z.string().trim().min(1).max(1000),
})
const managedProviderSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  apiUrl: z.string().trim(),
  apiKey: z.string().trim(),
  models: z.array(z.string().trim().min(1)).min(1),
  defaultModel: z.string().trim().min(1),
  enabled: z.boolean(),
})
const managedProviderTestSchema = z.object({
  apiUrl: z.string().trim(),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().optional(),
  mode: z.enum(['connection', 'model']).default('connection'),
})

function adminProbeSnippet(text: string) {
  return text.trim().replace(/\s+/g, ' ').slice(0, 220)
}

function extractModelIds(payload: unknown) {
  if (!payload || typeof payload !== 'object') return []
  const data = (payload as { data?: unknown }).data
  if (!Array.isArray(data)) return []
  return data
    .map((item) =>
      item && typeof item === 'object' && 'id' in item ? String((item as { id: unknown }).id) : '',
    )
    .filter(Boolean)
}

async function testManagedProviderConnection(input: z.infer<typeof managedProviderTestSchema>) {
  const urlError = validateProviderApiUrl(input.apiUrl)
  if (urlError) return { ok: false, summary: urlError.message }

  const resolvedBaseUrl = resolveProviderBaseUrl(input.apiUrl)
  if (!resolvedBaseUrl) {
    return {
      ok: false,
      summary: '当前未配置可用的 Provider API URL，也没有服务端默认上游，无法测试连接。',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  const headers = new Headers({
    authorization: `Bearer ${input.apiKey.trim()}`,
    accept: 'application/json',
  })
  const candidates = ['/v1/models', '/models']

  try {
    for (const candidate of candidates) {
      const requestUrl = joinProviderUrl(resolvedBaseUrl, candidate)
      let response: Response
      try {
        response = await fetch(requestUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
        return {
          ok: false,
          summary: /abort/.test(message)
            ? '连接测试超时，请检查上游网络或稍后重试。'
            : '无法连接到该 Provider 上游，请检查 API URL、网络和服务状态。',
        }
      }

      if (response.ok) {
        const payload = await response.json().catch(() => null)
        const availableModels = extractModelIds(payload)

        if (input.mode === 'model') {
          if (!input.model?.trim()) {
            return {
              ok: false,
              summary: '请先填写默认模型后再执行模型测试。',
              availableModels,
            }
          }
          if (availableModels.length && availableModels.includes(input.model.trim())) {
            return {
              ok: true,
              summary: `模型 ${input.model.trim()} 已在上游模型列表中返回。`,
              availableModels,
            }
          }
          if (availableModels.length) {
            return {
              ok: false,
              summary: `上游已连通，但模型 ${input.model.trim()} 不在返回列表中。`,
              detail: `当前返回 ${availableModels.length} 个模型，可用于进一步核对。`,
              availableModels,
            }
          }
          return {
            ok: true,
            summary: '上游已连通，但未返回可识别的模型列表，暂无法自动校验默认模型。',
          }
        }

        return {
          ok: true,
          summary: '已成功连接到上游，并通过模型列表接口拿到响应。',
          detail: availableModels.length
            ? `共识别到 ${availableModels.length} 个模型。`
            : '上游可访问，但未返回可识别的模型列表。',
          availableModels,
        }
      }

      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          summary: '上游拒绝了当前 API Key，请检查凭证是否正确或是否有访问权限。',
        }
      }

      if (response.status === 404 || response.status === 405) {
        continue
      }

      const text = await response.text().catch(() => '')
      return {
        ok: false,
        summary: `上游返回 ${response.status}，无法完成测试。`,
        detail: adminProbeSnippet(text) || response.statusText,
      }
    }

    return {
      ok: false,
      summary:
        input.mode === 'model'
          ? '上游未开放标准模型列表接口，暂时无法自动验证默认模型。'
          : '上游未开放标准模型列表接口，暂时无法完成连通性探测。',
    }
  } finally {
    clearTimeout(timeout)
  }
}
const assetStorageConfigSchema = z.object({
  mode: z.enum(['inline', 'passthrough', 'managed']),
  provider: z.enum(['s3', 'oss', 'cos', 'r2', 'minio']),
  endpoint: z.string().trim().optional(),
  bucket: z.string().trim().optional(),
  region: z.string().trim().optional(),
  accessKeyId: z.string().trim().optional(),
  secretAccessKey: z.string().trim().optional(),
  publicBaseUrl: z.string().trim().optional(),
  keyPrefix: z.string().trim().optional(),
  forcePathStyle: z.boolean(),
  inlineMaxBytes: z.coerce.number().int().min(32_768).max(20_000_000),
})
const assetStorageTestSchema = assetStorageConfigSchema

function validateManagedAssetStorageConfig(config: z.infer<typeof assetStorageConfigSchema>) {
  if (config.mode !== 'managed') return null
  if (!config.bucket || !config.endpoint) {
    return '对象存储托管模式下必须填写 Endpoint 和 Bucket'
  }
  if (!config.accessKeyId || !config.secretAccessKey) {
    return '对象存储托管模式下必须填写 Access Key 与 Secret Key'
  }
  return null
}

function normalizeStringList(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)))
}

function buildAdminResetPath(email: string, token: string) {
  const params = new URLSearchParams({ email, token })
  return `/forgot-password?${params.toString()}`
}

function applyUserStatusUpdate(params: {
  store: Awaited<ReturnType<typeof storeRepository.read>>
  actor: AuthRecord
  target: AuthRecord
  status: AuthRecord['status']
  reason?: string
  ip?: string
  requestId?: string
  action?: string
  batchSize?: number
}) {
  const nextStatus = params.status
  const nextReason = params.reason?.trim() || null
  const now = new Date().toISOString()
  const previousStatus = params.target.status
  const previousReason = params.target.statusReason ?? null

  params.target.status = nextStatus
  params.target.statusReason = nextReason
  params.target.statusUpdatedAt = now
  params.target.statusUpdatedBy = params.actor.id
  params.target.updatedAt = now

  let revoked = 0
  if (nextStatus !== 'active') {
    params.store.sessions.forEach((session) => {
      if (session.userId === params.target.id && !session.revokedAt) {
        session.revokedAt = now
        revoked += 1
      }
    })
  }

  appendAuditLogToStore(params.store, {
    actorUserId: params.actor.id,
    actorRole: params.actor.role,
    action: params.action ?? 'user.status.updated',
    targetType: 'user',
    targetId: params.target.id,
    payload: {
      fromStatus: previousStatus,
      toStatus: nextStatus,
      fromReason: previousReason,
      toReason: nextReason,
      revokedSessions: revoked,
      batchSize: params.batchSize,
    },
    ip: params.ip,
    requestId: params.requestId,
    createdAt: now,
  })

  return { revoked, updatedAt: now }
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/api/admin/dashboard', async (request, reply) => {
    const user = await requireRole(request, reply, backendAdminRoles)
    if (!user) return

    const store = await storeRepository.read()
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    const latestGenerationTasks = [...buildLatestTaskMap(store.generationTasks).values()]
    const normalizedProviders = [...store.managedProviders].map(normalizeManagedProvider)

    const roleBreakdown = store.users.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.role] = (accumulator[item.role] ?? 0) + 1
      return accumulator
    }, {})

    const taskStatusBreakdown = latestGenerationTasks.reduce<Record<string, number>>(
      (accumulator, item) => {
        accumulator[item.status] = (accumulator[item.status] ?? 0) + 1
        return accumulator
      },
      {},
    )

    const users = [...store.users]
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .slice(0, 6)
      .map((item) => toAdminUser(item, store, user))

    const recentWorks = [...store.works]
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 6)
      .map((work) => attachWorkOwner(work, userMap))

    const recentTasks = [...latestGenerationTasks]
      .sort((a, b) => {
        const updatedDiff = Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt))
        if (updatedDiff !== 0) return updatedDiff
        return Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))
      })
      .slice(0, 6)
      .map((task) => attachTaskOwner(task, userMap))

    const logs = [...((store as typeof store & { auditLogs?: AuditLogRecord[] }).auditLogs ?? [])]
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .slice(0, 10)
      .map((item) => attachAuditActor(item, userMap))

    return ok({
      overview: {
        currentUser: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        counts: {
          users: store.users.length,
          works: store.works.length,
          generationTasks: store.generationTasks.length,
          promptTemplates: store.promptTemplates.length,
        },
        providerHealth: {
          total: normalizedProviders.length,
          enabled: normalizedProviders.filter((item) => item.enabled).length,
          disabled: normalizedProviders.filter((item) => !item.enabled).length,
          missingApiKey: normalizedProviders.filter((item) => !item.apiKey.trim()).length,
        },
        roleBreakdown,
        taskStatusBreakdown,
      },
      users,
      recentWorks,
      recentTasks,
      logs,
      system: {
        status: 'ok' as const,
        now: new Date().toISOString(),
      },
    })
  })

  app.get('/api/admin/users', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = usersQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '分页参数不正确')
    }

    const store = await storeRepository.read()
    const keyword = parsed.data.query?.toLowerCase() ?? ''
    const quotaProfileMap = new Map<string, StoredQuotaProfile>(
      store.quotaProfiles.map((item) => [item.userId, item]),
    )
    const filtered = store.users
      .filter((item) => !parsed.data.role || item.role === parsed.data.role)
      .filter((item) => !parsed.data.status || item.status === parsed.data.status)
      .filter((item) => {
        if (!keyword) return true
        return (
          item.nickname.toLowerCase().includes(keyword) ||
          item.email.toLowerCase().includes(keyword)
        )
      })
      .filter((item) =>
        matchesUserLoginState(getUserLastLoginAt(item.id, store.sessions), parsed.data.loginState),
      )
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .map((item) => toAdminUser(item, store, actor, { quotaProfileMap }))

    return ok(paginate(filtered, parsed.data.page, parsed.data.limit))
  })

  app.get('/api/admin/users/:id', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '用户 ID 不正确')
    }

    const store = await storeRepository.read()
    const target = store.users.find((item) => item.id === id.data)
    if (!target) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }

    return ok(
      toAdminUser(target, store, actor, {
        includeRecentTasks: true,
        includeRecentAuditLogs: true,
        includeRecentWorks: true,
        includeRecentNotes: true,
      }),
    )
  })

  app.post('/api/admin/users/:id/role', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    const parsed = updateUserRoleSchema.safeParse(request.body)
    if (!id.success || !parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '角色更新参数不正确')
    }

    const store = await storeRepository.read()
    const target = store.users.find((item) => item.id === id.data)
    if (!target) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }

    const management = getAdminUserManagement(actor, target)
    if (target.role === parsed.data.role) {
      return ok(toAdminUser(target, store, actor))
    }

    if (!management.canChangeRole || !management.assignableRoles.includes(parsed.data.role)) {
      appendAuditLogToStore(store, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'admin.user.role.update_denied',
        targetType: 'user',
        targetId: target.id,
        payload: {
          currentRole: target.role,
          requestedRole: parsed.data.role,
          isSelf: management.isSelf,
          reason: management.reason,
          assignableRoles: management.assignableRoles,
        },
        ip: request.ip,
        requestId: request.id,
      })
      await storeRepository.write(store)
      reply.code(management.isSelf ? 409 : 403)
      return fail(
        management.isSelf ? 'INVALID_OPERATION' : 'FORBIDDEN',
        management.reason ?? '当前账号没有修改该用户角色的权限',
      )
    }

    const previousRole = target.role
    target.role = parsed.data.role
    target.updatedAt = new Date().toISOString()
    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'user.role.updated',
      targetType: 'user',
      targetId: target.id,
      payload: { fromRole: previousRole, toRole: parsed.data.role },
      ip: request.ip,
      requestId: request.id,
    })
    await storeRepository.write(store)
    return ok(toAdminUser(target, store, actor))
  })

  app.post('/api/admin/users/:id/status', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    const parsed = updateUserStatusSchema.safeParse(request.body)
    if (!id.success || !parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '状态更新参数不正确')
    }

    const store = await storeRepository.read()
    const target = store.users.find((item) => item.id === id.data)
    if (!target) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }

    const management = getAdminUserManagement(actor, target)
    if (!management.canUpdateStatus) {
      appendAuditLogToStore(store, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'admin.user.status.update_denied',
        targetType: 'user',
        targetId: target.id,
        payload: {
          currentStatus: target.status,
          requestedStatus: parsed.data.status,
          isSelf: management.isSelf,
          reason: management.reason,
        },
        ip: request.ip,
        requestId: request.id,
      })
      await storeRepository.write(store)
      reply.code(management.isSelf ? 409 : 403)
      return fail(
        management.isSelf ? 'INVALID_OPERATION' : 'FORBIDDEN',
        management.reason ?? '当前账号没有修改该用户状态的权限',
      )
    }

    applyUserStatusUpdate({
      store,
      actor,
      target,
      status: parsed.data.status,
      reason: parsed.data.reason,
      ip: request.ip,
      requestId: request.id,
    })
    await storeRepository.write(store)
    return ok(toAdminUser(target, store, actor))
  })

  app.post('/api/admin/users/status-bulk', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = bulkUserStatusSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '批量状态更新参数不正确')
    }

    if (parsed.data.status !== 'active' && !(parsed.data.reason?.trim())) {
      reply.code(400)
      return fail('INVALID_INPUT', '冻结或禁用用户时必须填写原因')
    }

    const store = await storeRepository.read()
    const succeeded: Array<{ id: string; status: AuthRecord['status'] }> = []
    const skipped: Array<{ id: string; reason: string }> = []
    let revokedCount = 0

    for (const userId of uniqueIds(parsed.data.userIds)) {
      const target = store.users.find((item) => item.id === userId)
      if (!target) {
        skipped.push({ id: userId, reason: 'USER_NOT_FOUND' })
        continue
      }

      const management = getAdminUserManagement(actor, target)
      if (!management.canUpdateStatus) {
        skipped.push({ id: userId, reason: management.reason ?? 'FORBIDDEN' })
        continue
      }

      const result = applyUserStatusUpdate({
        store,
        actor,
        target,
        status: parsed.data.status,
        reason: parsed.data.reason,
        ip: request.ip,
        requestId: request.id,
        action: 'user.status.updated.batch',
        batchSize: parsed.data.userIds.length,
      })
      revokedCount += result.revoked
      succeeded.push({ id: userId, status: target.status })
    }

    await storeRepository.write(store)
    return ok({
      success: true,
      processedCount: parsed.data.userIds.length,
      updatedCount: succeeded.length,
      revokedCount,
      succeeded,
      skipped,
    })
  })

  app.post('/api/admin/users/:id/provider-policy', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    const parsed = updateUserProviderPolicySchema.safeParse(request.body)
    if (!id.success || !parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', 'Provider 权限更新参数不正确')
    }

    const store = await storeRepository.read()
    const target = store.users.find((item) => item.id === id.data)
    if (!target) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }

    const management = getAdminUserManagement(actor, target)
    if (!management.canUpdateProviderPolicy) {
      reply.code(management.isSelf ? 409 : 403)
      return fail(
        management.isSelf ? 'INVALID_OPERATION' : 'FORBIDDEN',
        management.reason ?? '当前账号没有修改该用户 Provider 权限的权限',
      )
    }

    const allowedManagedProviderIds = normalizeStringList(parsed.data.allowedManagedProviderIds)
    const allowedModels = normalizeStringList(parsed.data.allowedModels)
    const providerIds = new Set(store.managedProviders.map((item) => normalizeManagedProvider(item).id))
    const invalidProviderIds = allowedManagedProviderIds.filter((providerId) => !providerIds.has(providerId))
    if (invalidProviderIds.length) {
      reply.code(400)
      return fail('INVALID_INPUT', `存在无效的公共 Provider ID：${invalidProviderIds.join('、')}`)
    }

    const previousPolicy = {
      allowManagedProviders: target.allowManagedProviders !== false,
      allowCustomProvider: target.allowCustomProvider !== false,
      allowedManagedProviderIds: target.allowedManagedProviderIds ?? [],
      allowedModels: target.allowedModels ?? [],
    }

    target.allowManagedProviders = parsed.data.allowManagedProviders
    target.allowCustomProvider = parsed.data.allowCustomProvider
    target.allowedManagedProviderIds = allowedManagedProviderIds
    target.allowedModels = allowedModels
    target.updatedAt = new Date().toISOString()

    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'user.provider-policy.updated',
      targetType: 'user',
      targetId: target.id,
      payload: {
        before: previousPolicy,
        after: {
          allowManagedProviders: target.allowManagedProviders,
          allowCustomProvider: target.allowCustomProvider,
          allowedManagedProviderIds,
          allowedModels,
        },
      },
      ip: request.ip,
      requestId: request.id,
      createdAt: target.updatedAt,
    })

    await storeRepository.write(store)
    return ok(
      toAdminUser(target, store, actor, {
        includeRecentTasks: true,
        includeRecentAuditLogs: true,
        includeRecentWorks: true,
        includeRecentNotes: true,
      }),
    )
  })

  app.post('/api/admin/users/:id/notes', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    const parsed = createUserNoteSchema.safeParse(request.body)
    if (!id.success || !parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '备注参数不正确')
    }

    const store = await storeRepository.read()
    const target = store.users.find((item) => item.id === id.data)
    if (!target) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }

    const management = getAdminUserManagement(actor, target)
    if (!management.canAddNotes) {
      reply.code(management.isSelf ? 409 : 403)
      return fail(
        management.isSelf ? 'INVALID_OPERATION' : 'FORBIDDEN',
        management.reason ?? '当前账号没有为该用户添加备注的权限',
      )
    }

    const createdAt = new Date().toISOString()
    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'user.note.added',
      targetType: 'user',
      targetId: target.id,
      payload: { content: parsed.data.content },
      ip: request.ip,
      requestId: request.id,
      createdAt,
    })
    await storeRepository.write(store)
    return ok(
      toAdminUser(target, store, actor, {
        includeRecentTasks: true,
        includeRecentAuditLogs: true,
        includeRecentWorks: true,
        includeRecentNotes: true,
      }),
    )
  })

  app.post('/api/admin/users/:id/password-reset', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '用户 ID 不正确')
    }

    const store = await storeRepository.read()
    const target = store.users.find((item) => item.id === id.data)
    if (!target) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }

    const management = getAdminUserManagement(actor, target)
    if (!management.canTriggerPasswordReset) {
      reply.code(management.isSelf ? 409 : 403)
      return fail(
        management.isSelf ? 'INVALID_OPERATION' : 'FORBIDDEN',
        management.reason ?? '当前账号没有为该用户发起密码重置的权限',
      )
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const token = await signResetToken({ userId: target.id, email: target.email, actorUserId: actor.id })
    const updatedAt = new Date().toISOString()
    target.passwordResetToken = token
    target.passwordResetExpiresAt = expiresAt
    target.updatedAt = updatedAt

    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'admin.user.password-reset.created',
      targetType: 'user',
      targetId: target.id,
      payload: { expiresAt },
      ip: request.ip,
      requestId: request.id,
      createdAt: updatedAt,
    })

    await storeRepository.write(store)
    return ok({
      success: true,
      token,
      expiresAt,
      resetPath: buildAdminResetPath(target.email, token),
    })
  })

  app.post('/api/admin/users/:id/revoke-sessions', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '用户 ID 不正确')
    }

    const store = await storeRepository.read()
    const target = store.users.find((item) => item.id === id.data)
    if (!target) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }

    const management = getAdminUserManagement(actor, target)
    if (!management.canRevokeSessions) {
      appendAuditLogToStore(store, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'admin.user.sessions.revoke_denied',
        targetType: 'user',
        targetId: target.id,
        payload: {
          isSelf: management.isSelf,
          reason: management.reason,
        },
        ip: request.ip,
        requestId: request.id,
      })
      await storeRepository.write(store)
      reply.code(management.isSelf ? 409 : 403)
      return fail(
        management.isSelf ? 'INVALID_OPERATION' : 'FORBIDDEN',
        management.reason ?? '当前账号没有撤销该用户会话的权限',
      )
    }

    const context = await resolveAuthenticatedContext(request)
    const currentSessionId = management.isSelf ? context?.session.id : undefined
    const revokedAt = new Date().toISOString()
    let revoked = 0
    store.sessions.forEach((session) => {
      if (session.userId === target.id && !session.revokedAt && session.id !== currentSessionId) {
        session.revokedAt = revokedAt
        revoked += 1
      }
    })
    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'session.revoked.bulk',
      targetType: 'user',
      targetId: target.id,
      payload: {
        revoked,
        scope: management.isSelf ? 'other-sessions' : 'all-sessions',
        preservedSessionId: currentSessionId,
      },
      ip: request.ip,
      requestId: request.id,
      createdAt: revokedAt,
    })
    await storeRepository.write(store)
    return ok({ success: true, revoked })
  })

  app.post('/api/admin/users/:id/quota-adjustments', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    const parsed = adjustUserQuotaSchema.safeParse(request.body)
    if (!id.success || !parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '额度调整参数不正确')
    }

    const store = await storeRepository.read()
    const target = store.users.find((item) => item.id === id.data)
    if (!target) {
      reply.code(404)
      return fail('USER_NOT_FOUND', '用户不存在')
    }

    const management = getAdminUserManagement(actor, target)
    if (!management.canAdjustQuota) {
      appendAuditLogToStore(store, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'admin.user.quota.adjust_denied',
        targetType: 'user',
        targetId: target.id,
        payload: {
          delta: parsed.data.delta,
          reason: parsed.data.reason,
          isSelf: management.isSelf,
          permissionReason: management.reason,
        },
        ip: request.ip,
        requestId: request.id,
      })
      await storeRepository.write(store)
      reply.code(management.isSelf ? 409 : 403)
      return fail(
        management.isSelf ? 'INVALID_OPERATION' : 'FORBIDDEN',
        management.reason ?? '当前账号没有调整该用户额度的权限',
      )
    }

    const now = new Date().toISOString()
    let profile = store.quotaProfiles.find((item) => item.userId === target.id)
    if (!profile) {
      profile = createDefaultQuotaProfile(target.id, now)
      store.quotaProfiles.push(profile)
    }

    const nextQuotaTotal = profile.quotaTotal + parsed.data.delta
    const nextQuotaRemaining = profile.quotaRemaining + parsed.data.delta
    if (nextQuotaTotal < profile.quotaUsed || nextQuotaRemaining < 0) {
      reply.code(409)
      return fail('INVALID_OPERATION', '调整后额度不能小于已用额度或剩余额度不能为负数')
    }

    const previousQuota = {
      quotaTotal: profile.quotaTotal,
      quotaUsed: profile.quotaUsed,
      quotaRemaining: profile.quotaRemaining,
    }
    profile.quotaTotal = nextQuotaTotal
    profile.quotaRemaining = nextQuotaRemaining
    profile.updatedAt = now

    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'user.quota.adjusted',
      targetType: 'user',
      targetId: target.id,
      payload: {
        delta: parsed.data.delta,
        reason: parsed.data.reason,
        before: previousQuota,
        after: {
          quotaTotal: profile.quotaTotal,
          quotaUsed: profile.quotaUsed,
          quotaRemaining: profile.quotaRemaining,
        },
      },
      ip: request.ip,
      requestId: request.id,
      createdAt: now,
    })

    await storeRepository.write(store)
    return ok(
      toAdminUser(target, store, actor, {
        includeRecentTasks: true,
        includeRecentAuditLogs: true,
      }),
    )
  })

  app.post('/api/admin/users/revoke-sessions-bulk', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = bulkUserSessionsSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '批量撤销参数不正确')
    }

    const store = await storeRepository.read()
    const context = await resolveAuthenticatedContext(request)
    const currentSessionId = context?.session.id
    const revokedAt = new Date().toISOString()
    const succeeded: Array<{ id: string; revoked: number }> = []
    const skipped: Array<{ id: string; reason: string }> = []
    let revokedCount = 0

    for (const userId of uniqueIds(parsed.data.userIds)) {
      const target = store.users.find((item) => item.id === userId)
      if (!target) {
        skipped.push({ id: userId, reason: 'USER_NOT_FOUND' })
        continue
      }

      const management = getAdminUserManagement(actor, target)
      if (!management.canRevokeSessions) {
        skipped.push({ id: userId, reason: management.reason ?? 'FORBIDDEN' })
        continue
      }

      const preservedSessionId = management.isSelf ? currentSessionId : undefined
      let revoked = 0
      store.sessions.forEach((session) => {
        if (
          session.userId === target.id &&
          !session.revokedAt &&
          session.id !== preservedSessionId
        ) {
          session.revokedAt = revokedAt
          revoked += 1
        }
      })

      appendAuditLogToStore(store, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'session.revoked.bulk.batch',
        targetType: 'user',
        targetId: target.id,
        payload: {
          revoked,
          scope: management.isSelf ? 'other-sessions' : 'all-sessions',
          preservedSessionId,
          batchSize: parsed.data.userIds.length,
        },
        ip: request.ip,
        requestId: request.id,
        createdAt: revokedAt,
      })

      succeeded.push({ id: userId, revoked })
      revokedCount += revoked
    }

    await storeRepository.write(store)
    return ok({
      success: true,
      processedCount: parsed.data.userIds.length,
      revokedCount,
      succeeded,
      skipped,
    })
  })

  app.get('/api/admin/works', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = worksQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '分页参数不正确')
    }

    const store = await storeRepository.read()
    const keyword = parsed.data.query?.toLowerCase() ?? ''
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    const filtered = store.works
      .filter((item) => !parsed.data.userId || item.userId === parsed.data.userId)
      .filter((item) => {
        if (!keyword) return true
        const owner = userMap.get(item.userId)
        return [
          item.title,
          item.meta,
          owner?.email,
          owner?.nickname,
          item.promptText,
          item.promptSnippet,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .map((item) => attachWorkOwner(item, userMap))

    return ok(paginate(filtered, parsed.data.page, parsed.data.limit))
  })

  app.get('/api/admin/works/:id', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '作品 ID 不正确')
    }

    const store = await storeRepository.read()
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    const work = store.works.find((item) => item.id === id.data || item.snapshotId === id.data)
    if (!work) {
      reply.code(404)
      return fail('WORK_NOT_FOUND', '作品不存在')
    }

    return ok(attachWorkOwner(work, userMap))
  })

  app.delete('/api/admin/works/:id', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '作品 ID 不正确')
    }

    const store = await storeRepository.read()
    const before = store.works.length
    store.works = store.works.filter((item) => item.id !== id.data && item.snapshotId !== id.data)
    if (store.works.length === before) {
      reply.code(404)
      return fail('WORK_NOT_FOUND', '作品不存在')
    }
    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'work.deleted',
      targetType: 'work',
      targetId: id.data,
      payload: { scope: 'admin' },
      ip: request.ip,
      requestId: request.id,
    })
    await storeRepository.write(store)
    return ok({ success: true })
  })

  app.post('/api/admin/works/delete-bulk', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = bulkWorkDeleteSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '批量删除作品参数不正确')
    }

    const store = await storeRepository.read()
    const succeeded: Array<{ id: string }> = []
    const skipped: Array<{ id: string; reason: string }> = []

    for (const workId of uniqueIds(parsed.data.workIds)) {
      const existing = store.works.find((item) => item.id === workId || item.snapshotId === workId)
      if (!existing) {
        skipped.push({ id: workId, reason: 'WORK_NOT_FOUND' })
        continue
      }

      store.works = store.works.filter((item) => item.id !== workId && item.snapshotId !== workId)
      appendAuditLogToStore(store, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'work.deleted.batch',
        targetType: 'work',
        targetId: workId,
        payload: {
          scope: 'admin',
          batchSize: parsed.data.workIds.length,
        },
        ip: request.ip,
        requestId: request.id,
      })
      succeeded.push({ id: workId })
    }

    await storeRepository.write(store)
    return ok({
      success: true,
      processedCount: parsed.data.workIds.length,
      deletedCount: succeeded.length,
      succeeded,
      skipped,
    })
  })

  app.post('/api/admin/works/:id/retry-asset', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z
      .string()
      .trim()
      .min(1)
      .safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '作品 ID 不正确')
    }

    const store = await storeRepository.read()
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    const workIndex = store.works.findIndex(
      (item) => item.id === id.data || item.snapshotId === id.data,
    )
    if (workIndex < 0) {
      reply.code(404)
      return fail('WORK_NOT_FOUND', '作品不存在')
    }

    const updated = await materializeWorkAsset(store.works[workIndex], store.assetStorageConfig)
    store.works[workIndex] = updated
    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'work.asset.retry',
      targetType: 'work',
      targetId: id.data,
      payload: {
        assetSyncStatus: updated.assetSyncStatus,
        assetStorage: updated.assetStorage,
        assetRemoteKey: updated.assetRemoteKey,
      },
      ip: request.ip,
      requestId: request.id,
    })
    await storeRepository.write(store)
    return ok(attachWorkOwner(updated, userMap))
  })

  app.post('/api/admin/works/retry-asset-bulk', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = bulkWorkRetryAssetSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '批量重试入库参数不正确')
    }

    const store = await storeRepository.read()
    const succeeded: Array<{ id: string; status?: string }> = []
    const skipped: Array<{ id: string; reason: string }> = []

    for (const workId of uniqueIds(parsed.data.workIds)) {
      const workIndex = store.works.findIndex(
        (item) => item.id === workId || item.snapshotId === workId,
      )
      if (workIndex < 0) {
        skipped.push({ id: workId, reason: 'WORK_NOT_FOUND' })
        continue
      }

      const updated = await materializeWorkAsset(store.works[workIndex], store.assetStorageConfig)
      store.works[workIndex] = updated
      appendAuditLogToStore(store, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'work.asset.retry.batch',
        targetType: 'work',
        targetId: workId,
        payload: {
          batchSize: parsed.data.workIds.length,
          assetSyncStatus: updated.assetSyncStatus,
          assetStorage: updated.assetStorage,
          assetRemoteKey: updated.assetRemoteKey,
        },
        ip: request.ip,
        requestId: request.id,
      })
      succeeded.push({ id: workId, status: updated.assetSyncStatus })
    }

    await storeRepository.write(store)
    return ok({
      success: true,
      processedCount: parsed.data.workIds.length,
      succeeded,
      skipped,
    })
  })

  app.get('/api/admin/tasks', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = tasksQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '分页参数不正确')
    }

    const store = await storeRepository.read()
    const latestTaskMap = buildLatestTaskMap(store.generationTasks)
    const keyword = parsed.data.query?.toLowerCase() ?? ''
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    const sourceTasks =
      parsed.data.view === 'current' ? [...latestTaskMap.values()] : store.generationTasks
    const filtered = sourceTasks
      .filter((item) => !parsed.data.userId || item.userId === parsed.data.userId)
      .filter((item) => !parsed.data.status || item.status === parsed.data.status)
      .filter((item) => {
        if (!keyword) return true
        const owner = userMap.get(item.userId)
        return [
          item.payload.title,
          item.payload.promptText,
          item.payload.meta,
          owner?.email,
          owner?.nickname,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((a, b) => {
        const updatedDiff = Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt))
        if (updatedDiff !== 0) return updatedDiff
        return Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))
      })
      .map((item) => attachTaskOwner(item, userMap, latestTaskMap))

    return ok(paginate(filtered, parsed.data.page, parsed.data.limit))
  })

  app.get('/api/admin/tasks/:id', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务 ID 不正确')
    }

    const store = await storeRepository.read()
    const task = store.generationTasks.find((item) => item.id === id.data)
    if (!task) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }

    const latestTaskMap = buildLatestTaskMap(store.generationTasks)
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    return ok(attachTaskOwner(task, userMap, latestTaskMap))
  })

  app.get('/api/admin/tasks/:id/attempts', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务 ID 不正确')
    }

    const store = await storeRepository.read()
    const task = store.generationTasks.find((item) => item.id === id.data)
    if (!task) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }

    const latestTaskMap = buildLatestTaskMap(store.generationTasks)
    const rootTaskId = getTaskRootTaskId(task)
    const attempts = store.generationTasks
      .filter((item) => getTaskRootTaskId(item) === rootTaskId)
      .sort(sortTaskAttemptsDesc)

    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    return ok(attempts.map((item) => attachTaskOwner(item, userMap, latestTaskMap)))
  })

  app.post('/api/admin/tasks/:id/cancel', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z.string().safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '任务 ID 不正确')
    }

    const store = await storeRepository.read()
    const task = store.generationTasks.find((item) => item.id === id.data)
    if (!task) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }
    if (
      task.status === 'succeeded' ||
      task.status === 'failed' ||
      task.status === 'timeout' ||
      task.status === 'cancelled'
    ) {
      reply.code(409)
      return fail('TASK_NOT_CANCELLABLE', '任务已结束，无法取消')
    }

    await cancelGenerationTaskProcessing(task.id)
    const latestStore = await storeRepository.read()
    const latestTask = latestStore.generationTasks.find((item) => item.id === task.id)
    if (!latestTask) {
      reply.code(404)
      return fail('TASK_NOT_FOUND', '任务不存在')
    }

    const userMap = new Map<string, AuthRecord>(latestStore.users.map((item) => [item.id, item]))
    const latestTaskMap = buildLatestTaskMap(latestStore.generationTasks)
    appendAuditLogToStore(latestStore, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'task.cancelled',
      targetType: 'generation_task',
      targetId: task.id,
      payload: { status: latestTask.status },
      ip: request.ip,
      requestId: request.id,
    })
    await storeRepository.write(latestStore)
    return ok(attachTaskOwner(latestTask, userMap, latestTaskMap))
  })

  app.post('/api/admin/tasks/cancel-bulk', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = bulkTaskCancelSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '批量取消任务参数不正确')
    }

    const succeeded: Array<{ id: string }> = []
    const skipped: Array<{ id: string; reason: string }> = []

    for (const taskId of uniqueIds(parsed.data.taskIds)) {
      const store = await storeRepository.read()
      const task = store.generationTasks.find((item) => item.id === taskId)
      if (!task) {
        skipped.push({ id: taskId, reason: 'TASK_NOT_FOUND' })
        continue
      }
      if (
        task.status === 'succeeded' ||
        task.status === 'failed' ||
        task.status === 'timeout' ||
        task.status === 'cancelled'
      ) {
        skipped.push({ id: taskId, reason: 'TASK_NOT_CANCELLABLE' })
        continue
      }

      await cancelGenerationTaskProcessing(task.id)
      const latestStore = await storeRepository.read()
      const latestTask = latestStore.generationTasks.find((item) => item.id === task.id)
      if (!latestTask) {
        skipped.push({ id: taskId, reason: 'TASK_NOT_FOUND' })
        continue
      }

      appendAuditLogToStore(latestStore, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'task.cancelled.batch',
        targetType: 'generation_task',
        targetId: task.id,
        payload: {
          status: latestTask.status,
          batchSize: parsed.data.taskIds.length,
        },
        ip: request.ip,
        requestId: request.id,
      })
      await storeRepository.write(latestStore)
      succeeded.push({ id: taskId })
    }

    return ok({
      success: true,
      processedCount: parsed.data.taskIds.length,
      succeeded,
      skipped,
    })
  })

  app.get('/api/admin/providers', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const store = await storeRepository.read()
    const providers = [...store.managedProviders]
      .map(normalizeManagedProvider)
      .sort((left, right) => Number(new Date(right.updatedAt)) - Number(new Date(left.updatedAt)))
    return ok({ items: providers })
  })

  app.get('/api/admin/asset-storage', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const store = await storeRepository.read()
    return ok(normalizeAssetStorageConfig(store.assetStorageConfig))
  })

  app.put('/api/admin/asset-storage', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = assetStorageConfigSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '资产存储配置格式不正确')
    }

    const nextConfig = normalizeAssetStorageConfig({
      ...createDefaultAssetStorageConfig(),
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    })

    const managedConfigError = validateManagedAssetStorageConfig(nextConfig)
    if (managedConfigError) {
      reply.code(400)
      return fail('INVALID_INPUT', managedConfigError)
    }

    const store = await storeRepository.read()
    store.assetStorageConfig = nextConfig
    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'asset.storage.updated',
      targetType: 'asset_storage',
      targetId: 'default',
      payload: {
        mode: nextConfig.mode,
        modeLabel: assetStorageModeLabel(nextConfig.mode),
        provider: nextConfig.provider,
        endpoint: nextConfig.endpoint,
        bucket: nextConfig.bucket,
        publicBaseUrl: nextConfig.publicBaseUrl,
        keyPrefix: nextConfig.keyPrefix,
        forcePathStyle: nextConfig.forcePathStyle,
        inlineMaxBytes: nextConfig.inlineMaxBytes,
        hasAccessKeyId: Boolean(nextConfig.accessKeyId),
        hasSecretAccessKey: Boolean(nextConfig.secretAccessKey),
      },
      ip: request.ip,
      requestId: request.id,
    })
    await storeRepository.write(store)
    return ok(nextConfig)
  })

  app.post('/api/admin/asset-storage/test', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = assetStorageTestSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '对象存储测试参数不正确')
    }

    const testConfig = normalizeAssetStorageConfig({
      ...createDefaultAssetStorageConfig(),
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    })

    const managedConfigError = validateManagedAssetStorageConfig(testConfig)
    if (managedConfigError) {
      reply.code(400)
      return fail('INVALID_INPUT', managedConfigError)
    }

    if (testConfig.mode !== 'managed') {
      return ok({
        ok: true,
        summary: '当前模式无需对象存储上传测试。',
        detail: `当前为“${assetStorageModeLabel(testConfig.mode)}”，系统不会执行对象存储托管上传。`,
      })
    }

    try {
      const uploaded = await testManagedObjectStorage(testConfig)
      return ok({
        ok: true,
        summary: '对象存储连接与上传测试通过。',
        detail: `已成功写入并删除测试对象：${uploaded.key}`,
      })
    } catch (error) {
      return ok({
        ok: false,
        summary: '对象存储测试失败。',
        detail: error instanceof Error ? error.message : '未知错误',
      })
    }
  })

  app.put('/api/admin/providers/:id', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z
      .string()
      .trim()
      .min(1)
      .safeParse((request.params as { id?: string }).id)
    const parsed = managedProviderSchema.safeParse(request.body)
    if (!id.success || !parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', 'Provider 配置格式不正确')
    }

    const providerId = id.data
    if (!/^[a-z0-9._-]+$/i.test(providerId)) {
      reply.code(400)
      return fail('INVALID_INPUT', 'Provider ID 只允许字母、数字、点、下划线和中划线')
    }

    const normalized = normalizeManagedProvider({
      id: providerId,
      name: parsed.data.name,
      description: parsed.data.description,
      apiUrl: parsed.data.apiUrl,
      apiKey: parsed.data.apiKey,
      models: normalizeManagedProviderModels(parsed.data.models, parsed.data.defaultModel),
      defaultModel: parsed.data.defaultModel,
      enabled: parsed.data.enabled,
      updatedAt: new Date().toISOString(),
    })
    const validationError = validateManagedProvider(normalized)
    if (validationError) {
      reply.code(validationError.code === 'INVALID_INPUT' ? 400 : 409)
      return fail(validationError.code, validationError.message)
    }
    const apiUrlError = validateProviderApiUrl(normalized.apiUrl)
    if (apiUrlError) {
      reply.code(400)
      return fail(apiUrlError.code, apiUrlError.message)
    }

    const store = await storeRepository.read()
    const existing = store.managedProviders.find((item) => item.id === providerId)
    store.managedProviders = [
      ...store.managedProviders.filter((item) => item.id !== providerId),
      normalized,
    ]
    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: existing ? 'provider.managed.updated' : 'provider.managed.created',
      targetType: 'managed_provider',
      targetId: providerId,
      payload: {
        name: normalized.name,
        enabled: normalized.enabled,
        models: normalized.models,
        hasApiKey: Boolean(normalized.apiKey),
      },
      ip: request.ip,
      requestId: request.id,
    })
    await storeRepository.write(store)
    return ok(normalized)
  })

  app.post('/api/admin/providers/test', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = managedProviderTestSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', 'Provider 测试参数不正确')
    }

    return ok(await testManagedProviderConnection(parsed.data))
  })

  app.delete('/api/admin/providers/:id', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const id = z
      .string()
      .trim()
      .min(1)
      .safeParse((request.params as { id?: string }).id)
    if (!id.success) {
      reply.code(400)
      return fail('INVALID_INPUT', 'Provider ID 不正确')
    }

    const store = await storeRepository.read()
    const existing = store.managedProviders.find((item) => item.id === id.data)
    if (!existing) {
      reply.code(404)
      return fail('PROVIDER_CONFIG_REQUIRED', '要删除的 Provider 不存在')
    }
    store.managedProviders = store.managedProviders.filter((item) => item.id !== id.data)
    appendAuditLogToStore(store, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'provider.managed.deleted',
      targetType: 'managed_provider',
      targetId: id.data,
      payload: { name: existing.name },
      ip: request.ip,
      requestId: request.id,
    })
    await storeRepository.write(store)
    return ok({ success: true })
  })

  app.get('/api/admin/audit', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = auditQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '审计查询参数不正确')
    }

    const store = await storeRepository.read()
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    const keyword = parsed.data.query?.toLowerCase() ?? ''
    const actionKeyword = parsed.data.action?.toLowerCase() ?? ''
    const targetTypeKeyword = parsed.data.targetType?.toLowerCase() ?? ''
    const targetIdKeyword = parsed.data.targetId?.toLowerCase() ?? ''
    const filtered = [
      ...((store as typeof store & { auditLogs?: AuditLogRecord[] }).auditLogs ?? []),
    ]
      .map((item) => attachAuditActor(item, userMap))
      .filter((item) => !parsed.data.actorRole || item.actorRole === parsed.data.actorRole)
      .filter((item) => !actionKeyword || item.action.toLowerCase().includes(actionKeyword))
      .filter(
        (item) => !targetTypeKeyword || item.targetType.toLowerCase().includes(targetTypeKeyword),
      )
      .filter((item) => !targetIdKeyword || item.targetId.toLowerCase() === targetIdKeyword)
      .filter((item) => {
        if (!keyword) return true
        const payloadText =
          typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload ?? {})
        return [
          item.actorEmail,
          item.actorNickname,
          item.actorUserId,
          item.action,
          item.targetType,
          item.targetId,
          item.requestId,
          payloadText,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))

    return ok(paginate(filtered, parsed.data.page, parsed.data.limit))
  })

  app.get('/api/admin/roles', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const roles = getAssignableAdminRoles(actor)
    return ok({
      actorRole: actor.role,
      roles: roles.map((role) => ({
        id: role,
        label: toRoleLabel(role),
      })),
    })
  })

  app.get('/api/admin/policies', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    return ok(getAdminPolicies(actor))
  })
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * limit
  return {
    items: items.slice(start, start + limit),
    page: safePage,
    limit,
    total,
    totalPages,
  }
}

function getUserLastLoginAt(
  userId: string,
  sessions: Array<{ userId: string; createdAt: string }>,
) {
  const timestamps = sessions
    .filter((session) => session.userId === userId)
    .map((session) => Number(new Date(session.createdAt)))
    .filter((value) => Number.isFinite(value))

  if (!timestamps.length) return null
  return new Date(Math.max(...timestamps)).toISOString()
}

function matchesUserLoginState(
  lastLoginAt: string | null,
  loginState?: 'recent-7d' | 'inactive-30d' | 'never',
) {
  if (!loginState) return true
  if (loginState === 'never') return !lastLoginAt
  if (!lastLoginAt) return false

  const lastLoginTs = Number(new Date(lastLoginAt))
  if (!Number.isFinite(lastLoginTs)) return false
  const diffMs = Date.now() - lastLoginTs
  const dayMs = 24 * 60 * 60 * 1000

  if (loginState === 'recent-7d') return diffMs <= 7 * dayMs
  return diffMs >= 30 * dayMs
}

function toAdminUser(
  user: AuthRecord,
  store: Awaited<ReturnType<typeof storeRepository.read>>,
  actor: AuthRecord,
  options: {
    includeRecentTasks?: boolean
    includeRecentAuditLogs?: boolean
    includeRecentWorks?: boolean
    includeRecentNotes?: boolean
    quotaProfileMap?: Map<string, StoredQuotaProfile>
  } = {},
) {
  const activeSessionCount = store.sessions.filter(
    (session) => session.userId === user.id && !session.revokedAt,
  ).length
  const workCount = store.works.filter((work) => work.userId === user.id).length
  const taskCount = store.generationTasks.filter((task) => task.userId === user.id).length
  const management = getAdminUserManagement(actor, user)
  const lastLoginAt = getUserLastLoginAt(user.id, store.sessions)
  const quotaProfile =
    options.quotaProfileMap?.get(user.id) ??
    store.quotaProfiles.find((item) => item.userId === user.id) ??
    null
  const recentTasks = options.includeRecentTasks
    ? store.generationTasks
        .filter((task) => task.userId === user.id)
        .sort((a, b) => Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt)))
        .slice(0, 10)
        .map((task) => attachTaskOwner(task, new Map(store.users.map((item) => [item.id, item]))))
    : undefined
  const recentAuditLogs = options.includeRecentAuditLogs
    ? store.auditLogs
        .filter((log) => log.targetType === 'user' && log.targetId === user.id)
        .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
        .slice(0, 10)
        .map((log) => attachAuditActor(log, new Map(store.users.map((item) => [item.id, item]))))
    : undefined
  const recentWorks = options.includeRecentWorks
    ? store.works
        .filter((work) => work.userId === user.id)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, 10)
        .map((work) => attachWorkOwner(work, new Map(store.users.map((item) => [item.id, item]))))
    : undefined
  const recentNotes = options.includeRecentNotes
    ? store.auditLogs
        .filter(
          (log) =>
            log.targetType === 'user' &&
            log.targetId === user.id &&
            log.action === 'user.note.added',
        )
        .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
        .slice(0, 10)
        .map((log) => attachAuditActor(log, new Map(store.users.map((item) => [item.id, item]))))
    : undefined

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    status: user.status,
    statusReason: user.statusReason ?? null,
    statusUpdatedAt: user.statusUpdatedAt ?? null,
    statusUpdatedBy: user.statusUpdatedBy ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt,
    activeSessionCount,
    workCount,
    taskCount,
    quotaProfile,
    recentTasks,
    recentAuditLogs,
    recentWorks,
    recentNotes,
    providerPolicy: {
      allowManagedProviders: user.allowManagedProviders !== false,
      allowCustomProvider: user.allowCustomProvider !== false,
      allowedManagedProviderIds: user.allowedManagedProviderIds ?? [],
      allowedModels: user.allowedModels ?? [],
    },
    management,
  }
}

function attachWorkOwner(work: StoredWork, userMap: Map<string, AuthRecord>) {
  const owner = userMap.get(work.userId)
  return {
    ...work,
    userEmail: owner?.email,
    userNickname: owner?.nickname,
  }
}

function attachTaskOwner(
  task: StoredGenerationTask,
  userMap: Map<string, AuthRecord>,
  latestTaskMap?: Map<string, StoredGenerationTask>,
) {
  const owner = userMap.get(task.userId)
  return {
    ...sanitizeGenerationTask(task, latestTaskMap),
    userEmail: owner?.email,
    userNickname: owner?.nickname,
  }
}

function attachAuditActor(log: AuditLogRecord, userMap: Map<string, AuthRecord>) {
  const actor = userMap.get(log.actorUserId)
  return {
    ...log,
    actorEmail: actor?.email,
    actorNickname: actor?.nickname,
  }
}

function toRoleLabel(role: AuthRecord['role']) {
  switch (role) {
    case 'admin':
      return '管理员'
    case 'operator':
      return '运营'
    default:
      return '普通用户'
  }
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids))
}
