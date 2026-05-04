import { storeRepository } from '../lib/store'
import { applyBillingPlan, billingPlans, createBillingInvoice, createDefaultQuotaProfile, getBillingPlan, type BillingMode } from './plans'

export function listBillingPlans() {
  return billingPlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    quotaTotal: plan.quotaTotal,
    amountCents: plan.amountCents,
    currency: plan.currency,
    periodDays: plan.periodDays,
    description: plan.description,
  }))
}

export async function ensureQuotaProfile(userId: string) {
  return await storeRepository.mutate((store) => {
    const now = new Date().toISOString()
    const existing = store.quotaProfiles.find((item) => item.userId === userId)
    if (existing) return existing

    const profile = createDefaultQuotaProfile(userId, now)
    store.quotaProfiles.push(profile)
    return profile
  })
}

export async function consumeQuota(userId: string, units = 1) {
  return await storeRepository.mutate((store) => {
    const now = new Date().toISOString()
    let profile = store.quotaProfiles.find((item) => item.userId === userId)
    if (!profile) {
      profile = createDefaultQuotaProfile(userId, now)
      store.quotaProfiles.push(profile)
    }

    if (profile.quotaRemaining < units) {
      return { ok: false as const, profile }
    }

    profile.quotaUsed += units
    profile.quotaRemaining = Math.max(0, profile.quotaRemaining - units)
    profile.updatedAt = now
    return { ok: true as const, profile }
  })
}

export async function refundQuota(userId: string, units = 1) {
  return await storeRepository.mutate((store) => {
    const now = new Date().toISOString()
    let profile = store.quotaProfiles.find((item) => item.userId === userId)
    if (!profile) {
      profile = createDefaultQuotaProfile(userId, now)
      store.quotaProfiles.push(profile)
    }

    profile.quotaUsed = Math.max(0, profile.quotaUsed - units)
    profile.quotaRemaining = Math.min(profile.quotaTotal, profile.quotaRemaining + units)
    profile.updatedAt = now
    return profile
  })
}

export async function checkoutBillingPlan(userId: string, planId: string, mode: BillingMode) {
  const plan = getBillingPlan(planId)
  if (!plan) return null

  return await storeRepository.mutate((store) => {
    const now = new Date().toISOString()
    let profile = store.quotaProfiles.find((item) => item.userId === userId)
    if (!profile) {
      profile = createDefaultQuotaProfile(userId, now)
      store.quotaProfiles.push(profile)
    }

    const nextProfile = applyBillingPlan(profile, plan, mode, now)
    profile.planName = nextProfile.planName
    profile.quotaTotal = nextProfile.quotaTotal
    profile.quotaUsed = nextProfile.quotaUsed
    profile.quotaRemaining = nextProfile.quotaRemaining
    profile.renewsAt = nextProfile.renewsAt
    profile.updatedAt = nextProfile.updatedAt

    const invoice = createBillingInvoice(userId, plan, mode, now)
    store.billingInvoices.unshift(invoice)
    return { profile, invoice, plan }
  })
}

export async function listUserBillingInvoices(userId: string) {
  const store = await storeRepository.read()
  return store.billingInvoices.filter((invoice) => invoice.userId === userId)
}
