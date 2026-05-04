import type {
  StoredAssetStorageConfig,
  StoredAssetStorageMode,
  StoredAssetStorageProvider,
  StoredWork,
} from '../auth/types'
import { uploadWorkToManagedStorage } from './object-storage.service'

const validModes: StoredAssetStorageMode[] = ['inline', 'passthrough', 'managed']
const validProviders: StoredAssetStorageProvider[] = ['s3', 'oss', 'cos', 'r2', 'minio']

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

function normalizeBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false
}

function normalizePositiveInt(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value)
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return fallback
}

export function createDefaultAssetStorageConfig(): StoredAssetStorageConfig {
  return {
    mode: 'passthrough',
    provider: 's3',
    endpoint: '',
    bucket: '',
    region: '',
    accessKeyId: '',
    secretAccessKey: '',
    publicBaseUrl: '',
    keyPrefix: 'works/',
    forcePathStyle: false,
    inlineMaxBytes: 1_000_000,
    updatedAt: new Date(0).toISOString(),
  }
}

export function normalizeAssetStorageConfig(
  value?: Partial<StoredAssetStorageConfig> | null,
): StoredAssetStorageConfig {
  const fallback = createDefaultAssetStorageConfig()
  return {
    mode: typeof value?.mode === 'string' && validModes.includes(value.mode as StoredAssetStorageMode)
      ? value.mode as StoredAssetStorageMode
      : fallback.mode,
    provider: typeof value?.provider === 'string' && validProviders.includes(value.provider as StoredAssetStorageProvider)
      ? value.provider as StoredAssetStorageProvider
      : fallback.provider,
    endpoint: normalizeOptionalString(value?.endpoint) ?? '',
    bucket: normalizeOptionalString(value?.bucket) ?? '',
    region: normalizeOptionalString(value?.region) ?? '',
    accessKeyId: normalizeOptionalString(value?.accessKeyId) ?? '',
    secretAccessKey: normalizeOptionalString(value?.secretAccessKey) ?? '',
    publicBaseUrl: normalizeOptionalString(value?.publicBaseUrl) ?? '',
    keyPrefix: normalizeOptionalString(value?.keyPrefix) ?? fallback.keyPrefix,
    forcePathStyle: normalizeBoolean(value?.forcePathStyle),
    inlineMaxBytes: normalizePositiveInt(value?.inlineMaxBytes, fallback.inlineMaxBytes),
    updatedAt: normalizeOptionalString(value?.updatedAt) ?? fallback.updatedAt,
  }
}

function detectAssetStorage(src?: string): StoredWork['assetStorage'] {
  if (!src) return undefined
  if (src.startsWith('data:image/')) return 'inline'
  if (src.startsWith('blob:')) return 'blob'
  return 'remote'
}

function isHttpUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value))
}

function deriveAssetStateFromSource(
  src: string | undefined,
  mode: StoredAssetStorageMode,
): Pick<StoredWork, 'assetStorage' | 'assetSyncStatus' | 'assetRemoteUrl'> {
  const storage = detectAssetStorage(src)
  if (!src) {
    return {
      assetStorage: storage,
      assetSyncStatus: undefined,
      assetRemoteUrl: undefined,
    }
  }

  if (mode === 'managed') {
    return {
      assetStorage: storage,
      assetSyncStatus: 'pending-sync',
      assetRemoteUrl: undefined,
    }
  }

  if (isHttpUrl(src)) {
    return {
      assetStorage: 'remote',
      assetSyncStatus: 'synced',
      assetRemoteUrl: src,
    }
  }

  return {
    assetStorage: storage,
    assetSyncStatus: 'local-only',
    assetRemoteUrl: undefined,
  }
}

export function applyAssetStoragePolicy(
  work: StoredWork,
  config?: StoredAssetStorageConfig | null,
): StoredWork {
  const resolvedConfig = normalizeAssetStorageConfig(config)
  const src = normalizeOptionalString(work.src)
  const existingRemoteKey = normalizeOptionalString(work.assetRemoteKey)
  const existingRemoteUrl = normalizeOptionalString(work.assetRemoteUrl)
  const hasManagedRemoteAsset = Boolean(existingRemoteKey || (resolvedConfig.mode !== 'managed' && existingRemoteUrl))
  const now = Date.now()

  if (hasManagedRemoteAsset) {
    return {
      ...work,
      src: src ?? existingRemoteUrl,
      assetId: normalizeOptionalString(work.assetId) ?? `work:${work.id}:primary`,
      assetStorage: work.assetStorage ?? detectAssetStorage(src ?? existingRemoteUrl),
      assetSyncStatus: 'synced',
      assetRemoteKey: existingRemoteKey,
      assetRemoteUrl: existingRemoteUrl,
      assetUpdatedAt: work.assetUpdatedAt ?? now,
    }
  }

  const next = deriveAssetStateFromSource(src, resolvedConfig.mode)

  return {
    ...work,
    src,
    assetId: normalizeOptionalString(work.assetId) ?? (src ? `work:${work.id}:primary` : undefined),
    assetStorage: next.assetStorage ?? work.assetStorage,
    assetSyncStatus: next.assetSyncStatus ?? work.assetSyncStatus,
    assetRemoteKey: undefined,
    assetRemoteUrl: next.assetRemoteUrl,
    assetUpdatedAt: src ? (work.assetUpdatedAt ?? now) : work.assetUpdatedAt,
  }
}

export function assetStorageModeLabel(mode: StoredAssetStorageMode) {
  if (mode === 'inline') return '数据库内联'
  if (mode === 'managed') return '对象存储托管'
  return '外部 URL 透传'
}

export async function materializeWorkAsset(
  work: StoredWork,
  config?: StoredAssetStorageConfig | null,
): Promise<StoredWork> {
  const resolvedConfig = normalizeAssetStorageConfig(config)
  const normalizedWork = applyAssetStoragePolicy(work, resolvedConfig)
  if (resolvedConfig.mode !== 'managed') return normalizedWork

  try {
    const uploaded = await uploadWorkToManagedStorage(normalizedWork, resolvedConfig)
    if (!uploaded) return normalizedWork
    return {
      ...normalizedWork,
      src: uploaded.url,
      assetStorage: 'remote',
      assetSyncStatus: 'synced',
      assetRemoteKey: uploaded.key,
      assetRemoteUrl: uploaded.url,
      assetUpdatedAt: Date.now(),
    }
  } catch {
    return {
      ...normalizedWork,
      assetSyncStatus: 'pending-sync',
      assetUpdatedAt: normalizedWork.assetUpdatedAt ?? Date.now(),
    }
  }
}
