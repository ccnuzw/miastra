export type GenerationMode = 'text2image' | 'image2image' | 'draw-text2image' | 'draw-image2image'
export type DrawTaskStatus = 'pending' | 'running' | 'receiving' | 'success' | 'failed' | 'retrying' | 'cancelled'
export type GenerationTaskStatus = 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timeout'
export type DrawStrategy = 'linear' | 'smart' | 'turbo'

export type StoredPromptTemplate = {
  id: string
  userId: string
  title?: string
  name?: string
  content: string
  createdAt: string | number
  updatedAt?: string | number
}

export type StoredWork = {
  id: string
  userId: string
  title: string
  src?: string
  meta: string
  variation?: string
  batchId?: string
  drawIndex?: number
  taskStatus?: DrawTaskStatus
  error?: string
  retryable?: boolean
  retryCount?: number
  createdAt?: number
  mode?: GenerationMode
  providerModel?: string
  size?: string
  quality?: string
  snapshotId?: string
  generationSnapshot?: unknown
  promptSnippet?: string
  promptText?: string
  isFavorite?: boolean
  favorite?: boolean
  tags?: string[]
}

export type StoredProviderConfig = {
  userId: string
  providerId: string
  apiUrl: string
  model: string
  apiKey: string
  updatedAt: string
}

export type StoredDrawBatch = {
  id: string
  userId: string
  title: string
  createdAt: number
  strategy: DrawStrategy
  concurrency: number
  count: number
  successCount: number
  failedCount: number
  snapshotId: string
}

export type StoredGenerationTask = {
  id: string
  userId: string
  status: GenerationTaskStatus
  progress?: number
  createdAt: string
  updatedAt: string
  errorMessage?: string
  payload: {
    mode: GenerationMode
    title: string
    meta: string
    promptText: string
    workspacePrompt: string
    requestPrompt: string
    snapshotId?: string
    size: string
    quality: string
    model: string
    providerId: string
    stream: boolean
    referenceImages?: Array<{
      source: 'upload' | 'work'
      name: string
      src: string
    }>
    draw?: {
      count: number
      strategy: DrawStrategy
      concurrency: number
      delayMs: number
      retries: number
      timeoutSec: number
      safeMode: boolean
      variationStrength: 'low' | 'medium' | 'high'
      dimensions: string[]
      batchId: string
      batchSnapshotId?: string
      drawIndex: number
      variation: string
    }
  }
  result?: {
    imageUrl?: string
    meta?: string
    title?: string
    promptText?: string
    promptSnippet?: string
    size?: string
    quality?: string
    providerModel?: string
    snapshotId?: string
    mode?: GenerationMode
    batchId?: string
    drawIndex?: number
    variation?: string
    generationSnapshot?: unknown
  }
}

export type StoredQuotaProfile = {
  userId: string
  planName: string
  quotaTotal: number
  quotaUsed: number
  quotaRemaining: number
  renewsAt?: string | null
  updatedAt: string
}

export type StoredBillingInvoice = {
  id: string
  userId: string
  planName: string
  amountCents: number
  currency: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  provider: 'mock'
  providerRef?: string
  createdAt: string
  updatedAt: string
}

export type AuthRecord = {
  id: string
  email: string
  nickname: string
  role: 'user' | 'operator' | 'admin'
  passwordHash: string
  createdAt: string
  updatedAt: string
  passwordResetToken?: string | null
  passwordResetExpiresAt?: string | null
}

export type SessionRecord = {
  id: string
  userId: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
}

export type AuditLogRecord = {
  id: string
  actorUserId: string
  actorRole: 'user' | 'operator' | 'admin'
  action: string
  targetType: string
  targetId: string
  payload: unknown
  ip?: string
  createdAt: string
}

export type DataStore = {
  users: AuthRecord[]
  sessions: SessionRecord[]
  promptTemplates: StoredPromptTemplate[]
  works: StoredWork[]
  providerConfigs: StoredProviderConfig[]
  drawBatches: StoredDrawBatch[]
  generationTasks: StoredGenerationTask[]
  auditLogs: AuditLogRecord[]
  quotaProfiles: StoredQuotaProfile[]
  billingInvoices: StoredBillingInvoice[]
}
