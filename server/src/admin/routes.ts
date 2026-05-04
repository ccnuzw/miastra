import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole, resolveAuthenticatedContext } from '../auth/routes'
import type { AuditLogRecord, AuthRecord, StoredGenerationTask, StoredWork } from '../auth/types'
import { cancelGenerationTaskProcessing } from '../generation-tasks/worker'
import { appendAuditLogToStore } from '../lib/audit'
import { fail, ok } from '../lib/http'
import { storeRepository } from '../lib/store'
import {
  normalizeManagedProvider,
  normalizeManagedProviderModels,
  validateManagedProvider,
} from '../provider-config/provider.service'
import { validateProviderApiUrl } from '../provider-config/provider.utils'
import {
  backendAdminRoles,
  getAdminPolicies,
  getAdminUserManagement,
  getAssignableAdminRoles,
} from './policy'

const roleSchema = z.enum(['user', 'operator', 'admin'])
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  query: z.string().trim().optional(),
})
const usersQuerySchema = paginationSchema.extend({
  role: roleSchema.optional(),
})
const tasksQuerySchema = paginationSchema.extend({
  status: z
    .enum(['pending', 'queued', 'running', 'succeeded', 'failed', 'cancelled', 'timeout'])
    .optional(),
})
const auditQuerySchema = paginationSchema.extend({
  actorRole: z.enum(['user', 'operator', 'admin']).optional(),
  action: z.string().trim().optional(),
  targetType: z.string().trim().optional(),
})
const bulkUserSessionsSchema = z.object({
  userIds: z.array(z.string().trim().min(1)).min(1).max(100),
})
const bulkTaskCancelSchema = z.object({
  taskIds: z.array(z.string().trim().min(1)).min(1).max(100),
})
const bulkWorkDeleteSchema = z.object({
  workIds: z.array(z.string().trim().min(1)).min(1).max(100),
})
const updateUserRoleSchema = z.object({
  role: roleSchema,
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

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/api/admin/dashboard', async (request, reply) => {
    const user = await requireRole(request, reply, backendAdminRoles)
    if (!user) return

    const store = await storeRepository.read()
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))

    const roleBreakdown = store.users.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.role] = (accumulator[item.role] ?? 0) + 1
      return accumulator
    }, {})

    const taskStatusBreakdown = store.generationTasks.reduce<Record<string, number>>(
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

    const recentTasks = [...store.generationTasks]
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
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
    const filtered = store.users
      .filter((item) => !parsed.data.role || item.role === parsed.data.role)
      .filter((item) => {
        if (!keyword) return true
        return (
          item.nickname.toLowerCase().includes(keyword) ||
          item.email.toLowerCase().includes(keyword)
        )
      })
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .map((item) => toAdminUser(item, store, actor))

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

    return ok(toAdminUser(target, store, actor))
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

    const parsed = paginationSchema.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '分页参数不正确')
    }

    const store = await storeRepository.read()
    const keyword = parsed.data.query?.toLowerCase() ?? ''
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    const filtered = store.works
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

  app.get('/api/admin/tasks', async (request, reply) => {
    const actor = await requireRole(request, reply, backendAdminRoles)
    if (!actor) return

    const parsed = tasksQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '分页参数不正确')
    }

    const store = await storeRepository.read()
    const keyword = parsed.data.query?.toLowerCase() ?? ''
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    const filtered = store.generationTasks
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
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .map((item) => attachTaskOwner(item, userMap))

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

    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))
    return ok(attachTaskOwner(task, userMap))
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
    return ok(attachTaskOwner(latestTask, userMap))
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
    const filtered = [
      ...((store as typeof store & { auditLogs?: AuditLogRecord[] }).auditLogs ?? []),
    ]
      .map((item) => attachAuditActor(item, userMap))
      .filter((item) => !parsed.data.actorRole || item.actorRole === parsed.data.actorRole)
      .filter((item) => !actionKeyword || item.action.toLowerCase().includes(actionKeyword))
      .filter(
        (item) => !targetTypeKeyword || item.targetType.toLowerCase().includes(targetTypeKeyword),
      )
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

function toAdminUser(
  user: AuthRecord,
  store: Awaited<ReturnType<typeof storeRepository.read>>,
  actor: AuthRecord,
) {
  const activeSessionCount = store.sessions.filter(
    (session) => session.userId === user.id && !session.revokedAt,
  ).length
  const workCount = store.works.filter((work) => work.userId === user.id).length
  const taskCount = store.generationTasks.filter((task) => task.userId === user.id).length
  const management = getAdminUserManagement(actor, user)

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    activeSessionCount,
    workCount,
    taskCount,
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

function sanitizeTask(task: StoredGenerationTask) {
  return {
    ...task,
    payload: {
      ...task.payload,
    },
  }
}

function attachTaskOwner(task: StoredGenerationTask, userMap: Map<string, AuthRecord>) {
  const owner = userMap.get(task.userId)
  return {
    ...sanitizeTask(task),
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
