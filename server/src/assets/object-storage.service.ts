import { createHash, createHmac } from 'node:crypto'
import type { StoredAssetStorageConfig, StoredWork } from '../auth/types'

type PreparedAsset = {
  bytes: Uint8Array
  mimeType: string
  extension: string
}

type UploadedAsset = {
  key: string
  url: string
  contentType: string
}

type SignedRequestTarget = {
  host: string
  pathname: string
  url: string
  publicUrl: string
}

function sha256Hex(value: Uint8Array | string) {
  return createHash('sha256').update(value).digest('hex')
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest()
}

function toAmzDate(date: Date) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '')
  return `${iso.slice(0, 15)}Z`
}

function toDateStamp(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function encodeS3Path(value: string) {
  return value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

function fileExtensionFromMime(mimeType: string) {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  if (mimeType === 'image/avif') return 'avif'
  if (mimeType === 'image/svg+xml') return 'svg'
  return 'bin'
}

function mimeTypeFromUrl(url: string) {
  const pathname = new URL(url).pathname.toLowerCase()
  if (pathname.endsWith('.png')) return 'image/png'
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg'
  if (pathname.endsWith('.webp')) return 'image/webp'
  if (pathname.endsWith('.gif')) return 'image/gif'
  if (pathname.endsWith('.avif')) return 'image/avif'
  if (pathname.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

function buildObjectKey(work: StoredWork, mimeType: string, prefix: string) {
  const extension = fileExtensionFromMime(mimeType)
  const createdAt = new Date(work.createdAt ?? Date.now())
  const year = String(createdAt.getUTCFullYear())
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0')
  const safePrefix = prefix.replace(/^\/+/, '').replace(/\/+$/, '')
  const segments = [safePrefix, work.userId, year, month, `${work.id}.${extension}`].filter(Boolean)
  return segments.join('/')
}

async function dataUrlToPreparedAsset(src: string): Promise<PreparedAsset> {
  const match = src.match(/^data:([^;,]+)?(;base64)?,(.*)$/)
  if (!match) throw new Error('图片数据格式不正确，无法上传到对象存储')
  const mimeType = match[1] || 'application/octet-stream'
  const payload = match[3] || ''
  const bytes = Uint8Array.from(Buffer.from(payload, 'base64'))
  return {
    bytes,
    mimeType,
    extension: fileExtensionFromMime(mimeType),
  }
}

async function remoteUrlToPreparedAsset(src: string): Promise<PreparedAsset> {
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`远端图片拉取失败：HTTP ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || mimeTypeFromUrl(src)
  return {
    bytes: new Uint8Array(arrayBuffer),
    mimeType,
    extension: fileExtensionFromMime(mimeType),
  }
}

async function prepareAssetFromWork(work: StoredWork) {
  const src = normalizeOptionalString(work.src)
  if (!src) return null
  if (src.startsWith('data:')) return await dataUrlToPreparedAsset(src)
  if (/^https?:\/\//i.test(src)) return await remoteUrlToPreparedAsset(src)
  if (src.startsWith('blob:')) return null
  return null
}

function resolveUploadTarget(config: StoredAssetStorageConfig, key: string) {
  const endpoint = trimTrailingSlash(config.endpoint)
  if (!endpoint) throw new Error('对象存储 Endpoint 未配置')
  if (!config.bucket) throw new Error('对象存储 Bucket 未配置')

  const endpointUrl = new URL(endpoint)
  const encodedKey = encodeS3Path(key)
  const usePathStyle = config.forcePathStyle
  const bucketHost = usePathStyle ? endpointUrl.host : `${config.bucket}.${endpointUrl.host}`
  const pathname = usePathStyle
    ? `/${encodeURIComponent(config.bucket)}/${encodedKey}`
    : `/${encodedKey}`
  const url = `${endpointUrl.protocol}//${bucketHost}${pathname}`
  const publicUrl = config.publicBaseUrl
    ? `${trimTrailingSlash(config.publicBaseUrl)}/${encodedKey}`
    : url

  return {
    host: bucketHost,
    pathname,
    url,
    publicUrl,
  } satisfies SignedRequestTarget
}

async function sendSignedS3Request(params: {
  config: StoredAssetStorageConfig
  method: 'PUT' | 'DELETE'
  key: string
  contentType?: string
  body?: Uint8Array
}) {
  const { config, method, key } = params
  const now = new Date()
  const amzDate = toAmzDate(now)
  const dateStamp = toDateStamp(now)
  const region = config.region?.trim() || 'auto'
  const service = 's3'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const body = params.body ?? new Uint8Array()
  const payloadHash = sha256Hex(body)
  const target = resolveUploadTarget(config, key)

  const headerEntries = [
    ['host', target.host],
    ['x-amz-content-sha256', payloadHash],
    ['x-amz-date', amzDate],
  ] as Array<[string, string]>
  if (params.contentType) headerEntries.push(['content-type', params.contentType])

  const canonicalHeaders = headerEntries
    .map(([name, value]) => `${name}:${value}`)
    .sort((left, right) => left.localeCompare(right))
    .join('\n')
  const signedHeaders = headerEntries
    .map(([name]) => name)
    .sort((left, right) => left.localeCompare(right))
    .join(';')
  const canonicalRequest = [
    method,
    target.pathname,
    '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join('\n')
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const signingKey = hmac(
    hmac(
      hmac(
        hmac(`AWS4${config.secretAccessKey ?? ''}`, dateStamp),
        region,
      ),
      service,
    ),
    'aws4_request',
  )
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const headers = new Headers({
    authorization,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  })
  if (params.contentType) headers.set('content-type', params.contentType)

  const response = await fetch(target.url, {
    method,
    headers,
    body: method === 'PUT' ? Buffer.from(body) : undefined,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(`对象存储请求失败：HTTP ${response.status}${message ? ` · ${message.slice(0, 240)}` : ''}`)
  }

  return target
}

async function putObjectSigned(params: {
  config: StoredAssetStorageConfig
  key: string
  bytes: Uint8Array
  contentType: string
}) {
  const { config, key, bytes, contentType } = params
  const target = await sendSignedS3Request({
    config,
    method: 'PUT',
    key,
    contentType,
    body: bytes,
  })

  return {
    key,
    url: target.publicUrl,
    contentType,
  } satisfies UploadedAsset
}

export async function uploadWorkToManagedStorage(work: StoredWork, configLike?: StoredAssetStorageConfig | null) {
  const config = configLike
  if (!config) return null
  if (config.mode !== 'managed') return null

  const prepared = await prepareAssetFromWork(work)
  if (!prepared) return null

  const key = buildObjectKey(work, prepared.mimeType, config.keyPrefix || 'works/')
  return await putObjectSigned({
    config,
    key,
    bytes: prepared.bytes,
    contentType: prepared.mimeType,
  })
}

export async function testManagedObjectStorage(configLike?: StoredAssetStorageConfig | null) {
  const config = configLike
  if (!config) throw new Error('对象存储配置不存在')
  if (config.mode !== 'managed') throw new Error('当前不是对象存储托管模式')
  if (!config.endpoint || !config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('对象存储测试缺少 Endpoint、Bucket 或密钥配置')
  }

  const probeKey = buildObjectKey({
    id: `asset-probe-${Date.now()}`,
    userId: 'system',
    title: 'asset-probe',
    meta: 'asset-probe',
    createdAt: Date.now(),
  }, 'text/plain', `${config.keyPrefix || 'works/'}/__healthchecks__`)
  const probeBody = new TextEncoder().encode(`miastra asset probe ${new Date().toISOString()}`)
  const uploaded = await putObjectSigned({
    config,
    key: probeKey,
    bytes: probeBody,
    contentType: 'text/plain',
  })
  await sendSignedS3Request({
    config,
    method: 'DELETE',
    key: probeKey,
  })
  return uploaded
}
