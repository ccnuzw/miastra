import { randomUUID } from 'node:crypto'
import type { StoredBillingInvoice, StoredQuotaProfile } from '../auth/types'

export type BillingMode = 'upgrade' | 'renew'

export type BillingPlan = {
  id: string
  name: string
  quotaTotal: number
  amountCents: number
  currency: 'CNY'
  periodDays: number
  description: string
}

export const billingPlans: BillingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    quotaTotal: 100,
    amountCents: 9900,
    currency: 'CNY',
    periodDays: 30,
    description: '适合日常轻量生成，支持基础额度补充。',
  },
  {
    id: 'pro',
    name: 'Pro',
    quotaTotal: 500,
    amountCents: 29900,
    currency: 'CNY',
    periodDays: 30,
    description: '适合高频生成与抽卡，额度更充足。',
  },
  {
    id: 'team',
    name: 'Team',
    quotaTotal: 2000,
    amountCents: 89900,
    currency: 'CNY',
    periodDays: 30,
    description: '适合团队连续生成与批量抽卡。',
  },
]

export function getBillingPlan(planId: string) {
  return billingPlans.find((plan) => plan.id === planId) ?? null
}

export function createDefaultQuotaProfile(userId: string, now = new Date().toISOString()): StoredQuotaProfile {
  const plan = billingPlans[0]
  return {
    userId,
    planName: plan.name,
    quotaTotal: plan.quotaTotal,
    quotaUsed: 0,
    quotaRemaining: plan.quotaTotal,
    renewsAt: new Date(Date.parse(now) + plan.periodDays * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now,
  }
}

export function applyBillingPlan(profile: StoredQuotaProfile, plan: BillingPlan, mode: BillingMode, now = new Date().toISOString()): StoredQuotaProfile {
  if (mode === 'renew') {
    return {
      ...profile,
      planName: plan.name,
      quotaTotal: plan.quotaTotal,
      quotaUsed: 0,
      quotaRemaining: plan.quotaTotal,
      renewsAt: new Date(Date.parse(now) + plan.periodDays * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now,
    }
  }

  const nextUsed = Math.max(0, profile.quotaUsed)
  const nextTotal = plan.quotaTotal
  return {
    ...profile,
    planName: plan.name,
    quotaTotal: nextTotal,
    quotaUsed: nextUsed,
    quotaRemaining: Math.max(0, nextTotal - nextUsed),
    renewsAt: new Date(Date.parse(now) + plan.periodDays * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now,
  }
}

export function createBillingInvoice(userId: string, plan: BillingPlan, mode: BillingMode, now = new Date().toISOString()): StoredBillingInvoice {
  return {
    id: randomUUID(),
    userId,
    planName: `${plan.name} ${mode === 'renew' ? '续费' : '升级'}`,
    amountCents: plan.amountCents,
    currency: plan.currency,
    status: 'paid',
    provider: 'mock',
    providerRef: `${mode}-${plan.id}-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
}
