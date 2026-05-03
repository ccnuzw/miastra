import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { ProviderConfig } from '@/features/provider/provider.types'
import type { ReferenceImage } from '@/features/references/reference.types'
import { referenceImageToFile } from '@/features/references/reference.utils'
import type { GalleryImage } from '@/features/works/works.types'
import type { GenerationMode, GenerationReferenceSnapshot, GenerationRequestOptions, GenerationSnapshot, GenerationStage } from '@/features/generation/generation.types'
import { singleGenerationTimeoutSec } from '@/features/generation/generation.constants'
import { extractGenerationError, extractImageSrc, isGatewayTimeoutPayload, normalizeGenerationError } from '@/features/generation/generation.parser'
import { postFormImageGeneration, postJsonImageGeneration } from '@/features/generation/generation.api'

type RequestContext = {
  config: ProviderConfig
  requestUrl: string
  editRequestUrl: string
  size: string
  quality: string
  stream: boolean
  referenceImages: ReferenceImage[]
  hasReferenceImage: boolean
  abortRef: MutableRefObject<AbortController | null>
  setStage: Dispatch<SetStateAction<GenerationStage>>
  setResponseText: Dispatch<SetStateAction<string>>
  setLiveImageSrc: Dispatch<SetStateAction<string>>
  setPreviewImage: Dispatch<SetStateAction<GalleryImage | null>>
}

function createReferenceSnapshot(referenceImages: ReferenceImage[]): GenerationReferenceSnapshot | undefined {
  if (!referenceImages.length) return undefined
  return {
    count: referenceImages.length,
    sources: referenceImages.map((reference, index) => ({
      source: reference.source,
      name: reference.name || `${reference.source === 'work' ? '作品区参考图' : '上传参考图'} #${index + 1}`,
    })),
    note: '图生图参考图仅保存数量与来源提示，不保存图片二进制；复用参数时需重新提供参考图。',
  }
}

function createGenerationSnapshot(
  context: RequestContext,
  options: GenerationRequestOptions,
  mode: GenerationMode,
  createdAt: number,
  resolvedQuality: string,
): GenerationSnapshot {
  const requestUrl = mode === 'image2image' || mode === 'draw-image2image' ? context.editRequestUrl : context.requestUrl
  return {
    id: options.snapshotId ?? crypto.randomUUID(),
    createdAt,
    mode,
    prompt: options.promptText,
    requestPrompt: options.promptText,
    workspacePrompt: options.workspacePrompt ?? options.promptText,
    size: context.size,
    quality: resolvedQuality,
    model: context.config.model,
    providerId: context.config.providerId,
    apiUrl: context.config.apiUrl,
    requestUrl,
    stream: options.streamValue ?? context.stream,
    references: createReferenceSnapshot(context.referenceImages),
    draw: options.drawSnapshot,
  }
}

function createGalleryImage(
  context: RequestContext,
  options: GenerationRequestOptions,
  src: string,
  mode: GenerationMode,
) {
  const createdAt = Date.now()
  const resolvedQuality = options.qualityValue ?? context.quality
  const generationSnapshot = createGenerationSnapshot(context, options, mode, createdAt, resolvedQuality)

  return {
    id: crypto.randomUUID(),
    title: options.title,
    src,
    meta: options.meta,
    variation: options.variation,
    batchId: options.batchId,
    drawIndex: options.drawIndex,
    snapshotId: generationSnapshot.id,
    createdAt,
    mode,
    providerModel: context.config.model,
    size: context.size,
    quality: resolvedQuality,
    generationSnapshot,
    promptSnippet: options.promptText.slice(0, 180),
    promptText: options.promptText,
  }
}

function applyPreview(context: RequestContext, options: GenerationRequestOptions, image: GalleryImage) {
  if ((options.previewMode ?? 'live') === 'none') return
  context.setPreviewImage(image)
  if ((options.previewMode ?? 'live') === 'live' && image.src) context.setLiveImageSrc(image.src)
}

async function requestTextImage(context: RequestContext, options: GenerationRequestOptions) {
  const controller = options.abortController ?? new AbortController()
  const ownsController = !options.abortController
  if (ownsController) context.abortRef.current = controller
  let didTimeout = false
  const timeoutSec = Math.max(20, options.timeoutSec ?? singleGenerationTimeoutSec)
  const timeout = window.setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutSec * 1000)

  try {
    context.setStage('waiting')
    const { response, debugHeaders, text, latestImageSrc } = await postJsonImageGeneration({
      requestUrl: context.requestUrl,
      apiKey: context.config.apiKey,
      signal: controller.signal,
      body: {
        model: context.config.model,
        prompt: options.promptText,
        size: context.size,
        quality: options.qualityValue ?? context.quality,
        n: 1,
        stream: options.streamValue ?? context.stream,
      },
      onImage: (src) => {
        options.onReceiveImage?.(src)
        if ((options.previewMode ?? 'live') === 'live') context.setLiveImageSrc(src)
        context.setStage('receiving')
      },
      chargeQuota: true,
    })
    context.setStage('finalizing')
    context.setResponseText([`HTTP ${response.status} ${response.statusText}`, debugHeaders, text.slice(0, 1800)].filter(Boolean).join('\n\n'))
    if (isGatewayTimeoutPayload(response.status, text)) throw normalizeGenerationError(new Error('远端 openresty 网关超时 504'))
    const responseError = extractGenerationError(text)
    if (responseError) throw normalizeGenerationError(new Error(responseError))
    if (!response.ok) throw normalizeGenerationError(new Error(`HTTP ${response.status}`))

    const src = latestImageSrc || extractImageSrc(text)
    if (!src) throw normalizeGenerationError(new Error('接口已返回，但未解析到图片数据，请检查响应格式或关闭模型兼容层后重试'))
    const image = createGalleryImage(context, options, src, options.mode ?? 'text2image')
    applyPreview(context, options, image)
    return image
  } catch (error) {
    if (didTimeout) throw normalizeGenerationError(new Error(`生成超过 ${timeoutSec}s，已自动中断以保护队列`))
    throw normalizeGenerationError(error)
  } finally {
    window.clearTimeout(timeout)
    if (ownsController && context.abortRef.current === controller) context.abortRef.current = null
  }
}

async function requestEditImage(context: RequestContext, options: GenerationRequestOptions) {
  if (!context.referenceImages.length) throw normalizeGenerationError(new Error('请先上传或从作品区推送一张参考图'))

  const controller = options.abortController ?? new AbortController()
  const ownsController = !options.abortController
  if (ownsController) context.abortRef.current = controller
  let didTimeout = false
  const timeoutSec = Math.max(20, options.timeoutSec ?? singleGenerationTimeoutSec)
  const timeout = window.setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutSec * 1000)

  try {
    const imageFiles = await Promise.all(context.referenceImages.map((reference) => referenceImageToFile(reference)))
    const formData = new FormData()
    formData.append('model', context.config.model)
    formData.append('prompt', options.promptText)
    for (const imageFile of imageFiles) {
      formData.append('image', imageFile)
    }
    formData.append('size', context.size)
    formData.append('quality', options.qualityValue ?? context.quality)
    formData.append('n', '1')

    context.setStage('waiting')
    const { response, debugHeaders, text, latestImageSrc } = await postFormImageGeneration({
      requestUrl: context.editRequestUrl,
      apiKey: context.config.apiKey,
      signal: controller.signal,
      formData,
      onImage: (src) => {
        options.onReceiveImage?.(src)
        if ((options.previewMode ?? 'live') === 'live') context.setLiveImageSrc(src)
        context.setStage('receiving')
      },
      chargeQuota: true,
    })
    context.setStage('finalizing')
    context.setResponseText([`HTTP ${response.status} ${response.statusText}`, `当前请求地址：${context.editRequestUrl}`, debugHeaders, text.slice(0, 1800)].filter(Boolean).join('\n\n'))
    if (response.status === 404 || response.status === 405) throw normalizeGenerationError(new Error('当前 Provider 不支持标准 /v1/images/edits 图生图接口，或代理未开放该路径'))
    if (isGatewayTimeoutPayload(response.status, text)) throw normalizeGenerationError(new Error('远端 openresty 网关超时 504'))
    const responseError = extractGenerationError(text)
    if (responseError) throw normalizeGenerationError(new Error(responseError))
    if (!response.ok) throw normalizeGenerationError(new Error(`HTTP ${response.status}`))

    const src = latestImageSrc || extractImageSrc(text)
    if (!src) throw normalizeGenerationError(new Error('接口已返回，但未解析到图片数据，请检查图生图响应格式或关闭模型兼容层后重试'))
    const image = createGalleryImage(context, options, src, options.mode ?? 'image2image')
    applyPreview(context, options, image)
    return image
  } catch (error) {
    if (didTimeout) throw normalizeGenerationError(new Error(`图生图超过 ${timeoutSec}s，已自动中断以保护队列`))
    throw normalizeGenerationError(error)
  } finally {
    window.clearTimeout(timeout)
    if (ownsController && context.abortRef.current === controller) context.abortRef.current = null
  }
}

export async function requestGenerationImage(context: RequestContext, options: GenerationRequestOptions) {
  return context.hasReferenceImage ? requestEditImage(context, options) : requestTextImage(context, options)
}
