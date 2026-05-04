import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { registerAdminRoutes } from './admin/routes'
import { registerAuthRoutes } from './auth/routes'
import { registerBillingRoutes } from './billing/routes'
import { registerDrawBatchRoutes } from './draw-batches/routes'
import { registerGenerationTaskRoutes } from './generation-tasks/routes'
import { startGenerationTaskWorker } from './generation-tasks/worker'
import { registerPromptTemplateRoutes } from './prompt-templates/routes'
import { registerProviderConfigRoutes } from './provider-config/routes'
import { registerProviderProxyRoutes } from './provider-proxy/routes'
import { registerWorksRoutes } from './works/routes'
import { fail, ok } from './lib/http'
import { checkStoreReadiness, probeRuntimeChecks, assertRuntimeReady } from './runtime-checks'
import { readStore } from './lib/store'

loadEnv({ path: resolve(__dirname, '../.env') })
loadEnv({ path: resolve(__dirname, '../../.env'), override: false })

export async function createServer() {
  const app: FastifyInstance = Fastify({
    logger: true,
    bodyLimit: 20 * 1024 * 1024,
  })

  await app.register(cookie)
  await app.register(cors, {
    origin: true,
    credentials: true,
  })
  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  app.addHook('onResponse', async (request, reply) => {
    if (reply.statusCode < 400) return
    request.log.warn({
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
    }, 'request completed with error')
  })

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error, requestId: request.id, method: request.method, url: request.url }, 'unhandled request error')
    if (reply.sent) return
    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : typeof (error as { status?: unknown }).status === 'number'
        ? (error as { status: number }).status
        : 500
    reply.header('x-request-id', request.id)
    reply.code(statusCode)
    reply.send(fail(statusCode >= 500 ? 'UNKNOWN_ERROR' : 'INVALID_OPERATION', statusCode >= 500 ? '服务暂时不可用，请稍后重试。' : '请求处理失败，请稍后重试。'))
  })

  app.get('/health', async () => {
    const report = await probeRuntimeChecks()
    return ok({
      status: report.status === 'fail' ? 'fail' : 'ok',
      runtimeMode: report.runtimeMode,
      checks: report.checks,
    })
  })

  app.get('/ready', async (_request, reply) => {
    const report = await checkStoreReadiness()
    if (report.status === 'fail') {
      reply.code(503)
    }
    return ok({
      ready: report.status !== 'fail',
      status: report.status,
      runtimeMode: report.runtimeMode,
      checks: report.checks,
    })
  })

  app.get('/health/store', async (_request, reply) => {
    const report = await checkStoreReadiness()
    if (report.status === 'fail') {
      reply.code(503)
    }
    const store = report.snapshot ?? await readStore()
    return ok({
      status: report.status,
      backend: report.store.backend,
      checks: report.checks,
      counts: {
        users: store.users.length,
        sessions: store.sessions.length,
        promptTemplates: store.promptTemplates.length,
        works: store.works.length,
        providerConfigs: store.providerConfigs.length,
        drawBatches: store.drawBatches.length,
        generationTasks: store.generationTasks.length,
        quotaProfiles: store.quotaProfiles.length,
        billingInvoices: store.billingInvoices.length,
      },
    })
  })

  await registerAuthRoutes(app)
  await registerPromptTemplateRoutes(app)
  await registerWorksRoutes(app)
  await registerGenerationTaskRoutes(app)
  await registerBillingRoutes(app)
  await registerProviderConfigRoutes(app)
  await registerDrawBatchRoutes(app)
  await registerAdminRoutes(app)
  await registerProviderProxyRoutes(app)

  return app
}

export async function start() {
  await assertRuntimeReady()
  const app = await createServer()
  startGenerationTaskWorker(app.log)
  const port = Number(process.env.PORT ?? 18081)
  await app.listen({ port, host: '0.0.0.0' })
}

const shouldStart = process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('dist/server.js')
if (shouldStart) {
  void start()
}
