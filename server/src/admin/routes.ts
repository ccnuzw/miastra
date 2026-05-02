import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireRole } from '../auth/routes'
import { fail, ok } from '../lib/http'
import { storeRepository } from '../lib/store'
import { cancelGenerationTaskProcessing } from '../generation-tasks/worker'
import type { AuditLogRecord, AuthRecord, StoredGenerationTask, StoredWork } from '../auth/types'

const adminRoleSchema = z.enum(['operator', 'admin'])
const adminOnlyRoleSchema = z.enum(['admin'])
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
  status: z.enum(['pending', 'queued', 'running', 'succeeded', 'failed', 'cancelled', 'timeout']).optional(),
})
const updateUserRoleSchema = z.object({
  role: roleSchema,
})

async function appendAuditLog(input: {
  actorUserId: string
  actorRole: 'user' | 'operator' | 'admin'
  action: string
  targetType: string
  targetId: string
  payload?: unknown
  ip?: string
}) {
  const store = await storeRepository.read()
  store.auditLogs = [
    ...(store.auditLogs ?? []),
    {
      id: storeRepository.createId(),
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      payload: input.payload ?? {},
      ip: input.ip,
      createdAt: new Date().toISOString(),
    },
  ]
  await storeRepository.write(store)
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/api/admin/dashboard', async (request, reply) => {
    const user = await requireRole(request, reply, adminRoleSchema.options)
    if (!user) return

    const store = await storeRepository.read()
    const userMap = new Map<string, AuthRecord>(store.users.map((item) => [item.id, item]))

    const roleBreakdown = store.users.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.role] = (accumulator[item.role] ?? 0) + 1
      return accumulator
    }, {})

    const taskStatusBreakdown = store.generationTasks.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.status] = (accumulator[item.status] ?? 0) + 1
      return accumulator
    }, {})

    const users = [...store.users]
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .slice(0, 6)
      .map((item) => toAdminUser(item, store))

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
    const actor = await requireRole(request, reply, adminRoleSchema.options)
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
        return item.nickname.toLowerCase().includes(keyword) || item.email.toLowerCase().includes(keyword)
      })
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .map((item) => toAdminUser(item, store))

    return ok(paginate(filtered, parsed.data.page, parsed.data.limit))
  })

  app.get('/api/admin/users/:id', async (request, reply) => {
    const actor = await requireRole(request, reply, adminRoleSchema.options)
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

    return ok(toAdminUser(target, store))
  })

  app.post('/api/admin/users/:id/role', async (request, reply) => {
    const actor = await requireRole(request, reply, adminRoleSchema.options)
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

    if (target.role === parsed.data.role) {
      return ok(toAdminUser(target, store))
    }

    if (actor.role !== 'admin') {
      if (target.role === 'admin' || parsed.data.role === 'admin') {
        reply.code(403)
        return fail('FORBIDDEN', '只有 admin 可以管理 admin 角色')
      }
    }

    if (actor.id === target.id && parsed.data.role !== 'admin') {
      reply.code(409)
      return fail('INVALID_OPERATION', '不能移除自己当前的后台权限')
    }

    target.role = parsed.data.role
    target.updatedAt = new Date().toISOString()
    await storeRepository.write(store)
    await appendAuditLog({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'user.role.updated',
      targetType: 'user',
      targetId: target.id,
      payload: { role: parsed.data.role },
      ip: request.ip,
    })
    return ok(toAdminUser(target, store))
  })

  app.post('/api/admin/users/:id/revoke-sessions', async (request, reply) => {
    const actor = await requireRole(request, reply, adminRoleSchema.options)
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

    if (actor.role !== 'admin' && target.role === 'admin') {
      reply.code(403)
      return fail('FORBIDDEN', '只有 admin 可以管理 admin 账号')
    }

    let revoked = 0
    store.sessions.forEach((session) => {
      if (session.userId === target.id && !session.revokedAt) {
        session.revokedAt = new Date().toISOString()
        revoked += 1
      }
    })
    if (revoked > 0) {
      await storeRepository.write(store)
      await appendAuditLog({
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'session.revoked.bulk',
        targetType: 'user',
        targetId: target.id,
        payload: { revoked },
        ip: request.ip,
      })
    }
    return ok({ success: true, revoked })
  })

  app.get('/api/admin/works', async (request, reply) => {
    const actor = await requireRole(request, reply, adminRoleSchema.options)
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
        return [item.title, item.meta, owner?.email, owner?.nickname, item.promptText, item.promptSnippet]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .map((item) => attachWorkOwner(item, userMap))

    return ok(paginate(filtered, parsed.data.page, parsed.data.limit))
  })

  app.get('/api/admin/works/:id', async (request, reply) => {
    const actor = await requireRole(request, reply, adminRoleSchema.options)
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
    const actor = await requireRole(request, reply, adminRoleSchema.options)
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
    await storeRepository.write(store)
    await appendAuditLog({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'work.deleted',
      targetType: 'work',
      targetId: id.data,
      payload: { scope: 'admin' },
      ip: request.ip,
    })
    return ok({ success: true })
  })

  app.get('/api/admin/tasks', async (request, reply) => {
    const actor = await requireRole(request, reply, adminRoleSchema.options)
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
        return [item.payload.title, item.payload.promptText, item.payload.meta, owner?.email, owner?.nickname]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))
      })
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .map((item) => attachTaskOwner(item, userMap))

    return ok(paginate(filtered, parsed.data.page, parsed.data.limit))
  })

  app.get('/api/admin/tasks/:id', async (request, reply) => {
    const actor = await requireRole(request, reply, adminRoleSchema.options)
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
    const actor = await requireRole(request, reply, adminRoleSchema.options)
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
    if (task.status === 'succeeded' || task.status === 'failed' || task.status === 'timeout' || task.status === 'cancelled') {
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
    await appendAuditLog({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'task.cancelled',
      targetType: 'generation_task',
      targetId: task.id,
      payload: { status: latestTask.status },
      ip: request.ip,
    })
    return ok(attachTaskOwner(latestTask, userMap))
  })

  app.get('/api/admin/roles', async (request, reply) => {
    const actor = await requireRole(request, reply, adminRoleSchema.options)
    if (!actor) return

    const roles: Array<'user' | 'operator' | 'admin'> = actor.role === 'admin' ? ['user', 'operator', 'admin'] : ['user', 'operator']
    return ok({ roles })
  })

  app.get('/api/admin/policies', async (request, reply) => {
    const actor = await requireRole(request, reply, adminRoleSchema.options)
    if (!actor) return

    return ok({
      canAssignAdmin: actor.role === adminOnlyRoleSchema.enum.admin,
      canManageAdmins: actor.role === adminOnlyRoleSchema.enum.admin,
    })
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

function toAdminUser(user: AuthRecord, store: Awaited<ReturnType<typeof storeRepository.read>>) {
  const activeSessionCount = store.sessions.filter((session) => session.userId === user.id && !session.revokedAt).length
  const workCount = store.works.filter((work) => work.userId === user.id).length
  const taskCount = store.generationTasks.filter((task) => task.userId === user.id).length

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
