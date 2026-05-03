import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { requireAuthenticatedUser } from '../auth/routes'
import { fail, ok } from '../lib/http'
import { storeRepository } from '../lib/store'
import { getBillingConfig } from '../runtime-config'
import { checkoutBillingPlan, listBillingPlans, listUserBillingInvoices } from './ledger'

const checkoutSchema = z.object({
  planId: z.string().trim().min(1),
  mode: z.enum(['upgrade', 'renew']),
})

export async function registerBillingRoutes(app: FastifyInstance) {
  app.get('/api/billing/config', async () => ok(getBillingConfig()))

  app.get('/api/billing/plans', async () => ok(listBillingPlans()))

  app.get('/api/billing/invoices', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    return ok(await listUserBillingInvoices(user.id))
  })

  app.post('/api/billing/checkout', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const billingConfig = getBillingConfig()
    if (!billingConfig.checkoutEnabled) {
      reply.code(503)
      return fail('BILLING_CHECKOUT_UNAVAILABLE', billingConfig.notice)
    }

    const parsed = checkoutSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return fail('INVALID_INPUT', '请选择正确的套餐和操作类型')
    }

    const result = await checkoutBillingPlan(user.id, parsed.data.planId, parsed.data.mode)
    if (!result) {
      reply.code(404)
      return fail('PLAN_NOT_FOUND', '套餐不存在')
    }

    return ok({
      plan: result.plan,
      profile: result.profile,
      invoice: result.invoice,
      plans: listBillingPlans(),
      config: billingConfig,
    })
  })

  app.post('/api/billing/restore', async (request, reply) => {
    const user = await requireAuthenticatedUser(request, reply)
    if (!user) return

    const store = await storeRepository.read()
    const profile = store.quotaProfiles.find((item) => item.userId === user.id) ?? null
    if (!profile) {
      reply.code(404)
      return fail('QUOTA_NOT_FOUND', '额度档案不存在')
    }

    return ok(profile)
  })
}
