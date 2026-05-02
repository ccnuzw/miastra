import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { registerAdminRoutes } from './admin/routes'
import { registerAuthRoutes } from './auth/routes'
import { registerDrawBatchRoutes } from './draw-batches/routes'
import { registerGenerationTaskRoutes } from './generation-tasks/routes'
import { startGenerationTaskWorker } from './generation-tasks/worker'
import { registerMigrationRoutes } from './migrations/routes'
import { registerPromptTemplateRoutes } from './prompt-templates/routes'
import { registerProviderConfigRoutes } from './provider-config/routes'
import { registerWorksRoutes } from './works/routes'
import { ok } from './lib/http'
import { storeRepository } from './lib/store'

loadEnv({ path: resolve(__dirname, '../.env') })
loadEnv({ path: resolve(__dirname, '../../.env'), override: false })

async function createServer() {
  const app: FastifyInstance = Fastify({ logger: true })

  await app.register(cookie)
  await app.register(cors, {
    origin: true,
    credentials: true,
  })
  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  app.get('/health', async () => ok({ status: 'ok' }))
  app.get('/health/store', async () => {
    const store = await storeRepository.read()
    return ok({
      status: 'ok',
      backend: (process.env.SERVER_STORE_BACKEND ?? 'json').trim().toLowerCase(),
      counts: {
        users: store.users.length,
        sessions: store.sessions.length,
        promptTemplates: store.promptTemplates.length,
        works: store.works.length,
        providerConfigs: store.providerConfigs.length,
        drawBatches: store.drawBatches.length,
        generationTasks: store.generationTasks.length,
      },
    })
  })

  await registerAuthRoutes(app)
  await registerPromptTemplateRoutes(app)
  await registerWorksRoutes(app)
  await registerMigrationRoutes(app)
  await registerGenerationTaskRoutes(app)
  await registerProviderConfigRoutes(app)
  await registerDrawBatchRoutes(app)
  await registerAdminRoutes(app)

  return app
}

async function start() {
  const app = await createServer()
  startGenerationTaskWorker(app.log)
  const port = Number(process.env.PORT ?? 18081)
  await app.listen({ port, host: '0.0.0.0' })
}

void start()
