import bcrypt from 'bcryptjs'
import { createDefaultQuotaProfile } from '../billing/plans'
import type { AuthRecord } from './types'
import { createId, getPostgresRepositories, getStoreRuntimeInfo, storeRepository } from '../lib/store'

const defaultAdminEmail = 'admin@miastra.local'
const defaultAdminNickname = 'admin'
const defaultAdminPassword = 'admin123'

async function ensureJsonDefaultAdminAccount(passwordHash: string, now: string) {
  await storeRepository.mutate(async (store) => {
    const existingUser =
      store.users.find(
        (user) =>
          user.email.toLowerCase() === defaultAdminEmail ||
          user.nickname.toLowerCase() === defaultAdminNickname,
      ) ?? null

    if (existingUser) {
      existingUser.email = defaultAdminEmail
      existingUser.nickname = defaultAdminNickname
      existingUser.role = 'admin'
      existingUser.status = 'active'
      existingUser.statusReason = null
      existingUser.statusUpdatedAt = now
      existingUser.statusUpdatedBy = null
      existingUser.allowManagedProviders = true
      existingUser.allowCustomProvider = true
      existingUser.allowedManagedProviderIds = []
      existingUser.allowedModels = []
      existingUser.passwordHash = passwordHash
      existingUser.passwordResetToken = null
      existingUser.passwordResetExpiresAt = null
      existingUser.updatedAt = now
    } else {
      const user: AuthRecord = {
        id: createId(),
        email: defaultAdminEmail,
        nickname: defaultAdminNickname,
        role: 'admin',
        status: 'active',
        statusReason: null,
        statusUpdatedAt: now,
        statusUpdatedBy: null,
        allowManagedProviders: true,
        allowCustomProvider: true,
        allowedManagedProviderIds: [],
        allowedModels: [],
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      }
      store.users.unshift(user)
    }

    const adminUser = store.users.find(
      (user) =>
        user.email.toLowerCase() === defaultAdminEmail &&
        user.nickname.toLowerCase() === defaultAdminNickname,
    )
    if (!adminUser) return

    const defaultQuota = createDefaultQuotaProfile(adminUser.id, now)
    const quotaIndex = store.quotaProfiles.findIndex((profile) => profile.userId === adminUser.id)

    if (quotaIndex >= 0) {
      store.quotaProfiles[quotaIndex] = {
        ...store.quotaProfiles[quotaIndex],
        planName: defaultQuota.planName,
        quotaTotal: defaultQuota.quotaTotal,
        quotaUsed: defaultQuota.quotaUsed,
        quotaRemaining: defaultQuota.quotaRemaining,
        renewsAt: defaultQuota.renewsAt ?? null,
        updatedAt: defaultQuota.updatedAt,
      }
      return
    }

    store.quotaProfiles.unshift(defaultQuota)
  })
}

async function ensurePostgresDefaultAdminAccount(passwordHash: string, now: string) {
  const { pool } = getPostgresRepositories()
  const existing = await pool.query(
    `
      SELECT id
      FROM users
      WHERE lower(email) = lower($1) OR lower(nickname) = lower($2)
      LIMIT 1
    `,
    [defaultAdminEmail, defaultAdminNickname],
  )

  let adminUserId = existing.rows[0]?.id ? String(existing.rows[0].id) : null

  if (adminUserId) {
    await pool.query(
      `
        UPDATE users
        SET email = $2,
            nickname = $3,
            role = 'admin',
            status = 'active',
            status_reason = NULL,
            status_updated_at = $5,
            status_updated_by = NULL,
            allow_managed_providers = TRUE,
            allow_custom_provider = TRUE,
            allowed_managed_provider_ids_json = '[]'::jsonb,
            allowed_models_json = '[]'::jsonb,
            password_hash = $4,
            password_reset_token = NULL,
            password_reset_expires_at = NULL,
            updated_at = $5
        WHERE id = $1
      `,
      [adminUserId, defaultAdminEmail, defaultAdminNickname, passwordHash, now],
    )
  } else {
    adminUserId = createId()
    await pool.query(
      `
        INSERT INTO users (
          id,
          email,
          nickname,
          role,
          status,
          status_reason,
          status_updated_at,
          status_updated_by,
          allow_managed_providers,
          allow_custom_provider,
          allowed_managed_provider_ids_json,
          allowed_models_json,
          password_hash,
          password_reset_token,
          password_reset_expires_at,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          'admin',
          'active',
          NULL,
          $5,
          NULL,
          TRUE,
          TRUE,
          '[]'::jsonb,
          '[]'::jsonb,
          $4,
          NULL,
          NULL,
          $5,
          $5
        )
      `,
      [adminUserId, defaultAdminEmail, defaultAdminNickname, passwordHash, now],
    )
  }

  const quotaProfile = createDefaultQuotaProfile(adminUserId, now)
  await pool.query(
    `
      INSERT INTO quota_profiles (user_id, plan_name, quota_total, quota_used, quota_remaining, renews_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE
      SET plan_name = EXCLUDED.plan_name,
          quota_total = EXCLUDED.quota_total,
          quota_used = EXCLUDED.quota_used,
          quota_remaining = EXCLUDED.quota_remaining,
          renews_at = EXCLUDED.renews_at,
          updated_at = EXCLUDED.updated_at
    `,
    [
      quotaProfile.userId,
      quotaProfile.planName,
      quotaProfile.quotaTotal,
      quotaProfile.quotaUsed,
      quotaProfile.quotaRemaining,
      quotaProfile.renewsAt ?? null,
      quotaProfile.updatedAt,
    ],
  )
}

export async function ensureDefaultAdminAccount() {
  if (process.env.NODE_ENV === 'test') return

  const runtime = getStoreRuntimeInfo()
  const now = new Date().toISOString()
  const passwordHash = await bcrypt.hash(defaultAdminPassword, 10)

  if (runtime.backend === 'postgres') {
    await ensurePostgresDefaultAdminAccount(passwordHash, now)
    return
  }

  await ensureJsonDefaultAdminAccount(passwordHash, now)
}
