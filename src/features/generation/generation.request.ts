import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { ProviderConfig } from '@/features/provider/provider.types'
import type { ReferenceImage } from '@/features/references/reference.types'
import { referenceImageToFile } from '@/features/references/reference.utils'
import type { GalleryImage } from '@/features/works/works.types'
import type { GenerationRequestOptions, GenerationStage } from '@/features/generation/generation.types'
import { singleGenerationTimeoutSec } from '@/features/generation/generation.constants'
import { extractImageSrc, isGatewayTimeoutPayload } from '@/features/generation/generation.parser'
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

function createGalleryImage(
  context: RequestContext,
  options: GenerationRequestOptions,
  src: string,
  mode: 'text2image' | 'image2image',
): GalleryImage {
  return {
    id: crypto.randomUUID(),
    title: options.title,
    src,
    meta: options.meta,
    variation: options.variation,
    batchId: options.batchId,
    drawIndex: options.drawIndex,
    snapshotId: options.snapshotId,
    createdAt: Date.now(),
    mode,
    providerModel: context.config.model,
    size: context.size,
    quality: options.qualityValue ?? context.quality,
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
    })
    context.setStage('finalizing')
    context.setResponseText([`HTTP ${response.status} ${response.statusText}`, debugHeaders, text.slice(0, 1800)].filter(Boolean).join('\n\n'))
    if (isGatewayTimeoutPayload(response.status, text)) throw new Error('远端 openresty 网关超时 504')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const src = latestImageSrc || extractImageSrc(text)
    if (!src) throw new Error('接口已返回，但未解析到图片数据，请检查响应格式或关闭模型兼容层后重试')
    const image = createGalleryImage(context, options, src, 'text2image')
    applyPreview(context, options, image)
    return image
  } catch (error) {
    if (didTimeout) throw new Error(`生成超过 ${timeoutSec}s，已自动中断以保护队列`)
    throw error
  } finally {
    window.clearTimeout(timeout)
    if (ownsController && context.abortRef.current === controller) context.abortRef.current = null
  }
}

async function requestEditImage(context: RequestContext, options: GenerationRequestOptions) {
  if (!context.referenceImages.length) throw new Error('请先上传或从作品区推送一张参考图')

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
    imageFiles.forEach((imageFile) => formData.append('image', imageFile))
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
    })
    context.setStage('finalizing')
    context.setResponseText([`HTTP ${response.status} ${response.statusText}`, `当前请求地址：${context.editRequestUrl}`, debugHeaders, text.slice(0, 1800)].filter(Boolean).join('\n\n'))
    if (response.status === 404 || response.status === 405) throw new Error('当前 Provider 不支持标准 /v1/images/edits 图生图接口，或代理未开放该路径')
    if (isGatewayTimeoutPayload(response.status, text)) throw new Error('远端 openresty 网关超时 504')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const src = latestImageSrc || extractImageSrc(text)
    if (!src) throw new Error('接口已返回，但未解析到图片数据，请检查图生图响应格式或关闭模型兼容层后重试')
    const image = createGalleryImage(context, options, src, 'image2image')
    applyPreview(context, options, image)
    return image
  } catch (error) {
    if (didTimeout) throw new Error(`图生图超过 ${timeoutSec}s，已自动中断以保护队列`)
    throw error
  } finally {
    window.clearTimeout(timeout)
    if (ownsController && context.abortRef.current === controller) context.abortRef.current = null
  }
}

export async function requestGenerationImage(context: RequestContext, options: GenerationRequestOptions) {
  return context.hasReferenceImage ? requestEditImage(context, options) : requestTextImage(context, options)
}
