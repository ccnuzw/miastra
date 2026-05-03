const imageExtensionByMime: Record<string, string> = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}

const knownImageExtensions = new Set(Object.values(imageExtensionByMime))

export function sanitizeFileName(value: string, fallback = 'untitled') {
  const normalized = value
    .normalize('NFKD')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .trim()

  const safe = normalized || fallback
  const reservedWindowsName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(safe)
  const fileName = reservedWindowsName ? `${safe}-file` : safe

  return fileName.slice(0, 120)
}

export function inferImageExtension(src?: string, mimeType?: string) {
  const extensionFromMime = getExtensionFromMime(mimeType)
  if (extensionFromMime) return extensionFromMime

  if (src?.startsWith('data:')) {
    const mimeMatch = src.match(/^data:([^;,]+)/i)
    const dataUrlExtension = getExtensionFromMime(mimeMatch?.[1])
    if (dataUrlExtension) return dataUrlExtension
  }

  const extensionFromUrl = getExtensionFromUrl(src)
  if (extensionFromUrl) return extensionFromUrl

  return 'png'
}

export function stripKnownImageExtension(value: string) {
  const extension = value.split('.').pop()?.toLowerCase()
  return extension && knownImageExtensions.has(extension) ? value.slice(0, -(extension.length + 1)) : value
}

export function ensureZipExtension(value: string) {
  return value.toLowerCase().endsWith('.zip') ? value : `${value}.zip`
}

export function sanitizeDirectoryName(value: string, defaultDirectory: string) {
  const trimmed = (value || defaultDirectory).replace(/^\/+|\/+$/g, '')
  return sanitizeFileName(trimmed, defaultDirectory).replace(/^\/+|\/+$/g, '') || defaultDirectory
}

function getExtensionFromMime(mimeType?: string) {
  if (!mimeType) return undefined
  return imageExtensionByMime[mimeType.toLowerCase().split(';')[0].trim()]
}

function getExtensionFromUrl(src?: string) {
  if (!src || src.startsWith('data:')) return undefined

  try {
    const url = new URL(src, window.location.href)
    const extension = url.pathname.split('.').pop()?.toLowerCase()
    return extension && knownImageExtensions.has(extension) ? extension : undefined
  } catch {
    const extension = src.split(/[?#]/)[0].split('.').pop()?.toLowerCase()
    return extension && knownImageExtensions.has(extension) ? extension : undefined
  }
}
