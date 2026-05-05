import { createAppErrorFromApi } from '@/shared/errors/app-error'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { buildProviderEditFormData, buildProviderJsonBody } from '@/features/provider/provider.utils'
import type { ProviderConfig } from '@/features/provider/provider.types'
import type { ReferenceImage } from '@/features/references/reference.types'
import { referenceImageToFile } from '@/features/references/reference.utils'
import type { GalleryImage } from '@/features/works/works.types'
import {
  buildGenerationReferenceSnapshot,
  buildGenerationSnapshotFromContract,
  resolveGenerationContractSnapshot,
} from '@/features/generation/generation.contract'
import type {
  GenerationContractSnapshot,
  GenerationMode,
  GenerationRequestOptions,
  GenerationSnapshot,
  GenerationStage,
} from '@/features/generation/generation.types'
import { singleGenerationTimeoutSec } from '@/features/generation/generation.constants'
import { extractGenerationErrorDetails, extractImageSrc, isGatewayTimeoutPayload, normalizeGenerationError } from '@/features/generation/generation.parser'
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

function resolveRequestContract(
  context: RequestContext,
  options: GenerationRequestOptions,
  mode: GenerationMode,
  resolvedQuality: string,
): GenerationContractSnapshot {
  const references = buildGenerationReferenceSnapshot(context.referenceImages)
  return resolveGenerationContractSnapshot(
    options.contract ? { contract: options.contract } : undefined,
    {
      scene: options.contract?.scene ?? options.scene,
      requestPrompt: options.contract?.prompt.request ?? options.promptText,
      workspacePrompt:
        options.contract?.prompt.workspace ?? options.workspacePrompt ?? options.promptText,
      mode,
      size: options.contract?.parameters.size ?? context.size,
      quality: options.contract?.parameters.quality ?? resolvedQuality,
      model: options.contract?.parameters.model ?? context.config.model,
      providerId: options.contract?.parameters.providerId ?? context.config.providerId,
      stream: options.contract?.parameters.stream ?? options.streamValue ?? context.stream,
      references: options.contract?.references ?? references,
      draw: options.contract?.draw ?? options.drawSnapshot,
      guidedFlow: options.contract?.guidedFlow ?? options.guidedFlow ?? null,
    },
  )
}

function createGenerationSnapshot(
  context: RequestContext,
  contract: GenerationContractSnapshot,
  snapshotId: string | undefined,
  createdAt: number,
): GenerationSnapshot {
  const requestUrl =
    contract.parameters.mode === 'image2image' || contract.parameters.mode === 'draw-image2image'
      ? context.editRequestUrl
      : context.requestUrl
  return buildGenerationSnapshotFromContract(contract, {
    id: snapshotId,
    createdAt,
    apiUrl: context.config.apiUrl,
    requestUrl,
  })
}

function createGalleryImage(
  context: RequestContext,
  options: GenerationRequestOptions,
  src: string,
  contract: GenerationContractSnapshot,
) {
  const createdAt = Date.now()
  const generationSnapshot = createGenerationSnapshot(
    context,
    contract,
    options.snapshotId,
    createdAt,
  )

  return {
    id: crypto.randomUUID(),
    title: options.title,
    src,
    meta: options.meta,
    variation: options.variation ?? contract.draw?.variation,
    batchId: options.batchId ?? contract.draw?.batchId,
    drawIndex: options.drawIndex ?? contract.draw?.drawIndex,
    snapshotId: generationSnapshot.id,
    createdAt,
    mode: contract.parameters.mode,
    providerModel: contract.parameters.model,
    size: contract.parameters.size,
    quality: contract.parameters.quality,
    generationSnapshot,
    promptSnippet: contract.prompt.request.slice(0, 180),
    promptText: contract.prompt.request,
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
  const contract = resolveRequestContract(
    context,
    options,
    options.contract?.parameters.mode ?? options.mode ?? 'text2image',
    options.contract?.parameters.quality ?? options.qualityValue ?? context.quality,
  )

  try {
    context.setStage('waiting')
    const { response, debugHeaders, text, latestImageSrc } = await postJsonImageGeneration({
      requestUrl: context.requestUrl,
      apiKey: context.config.apiKey,
      signal: controller.signal,
      body: buildProviderJsonBody({
        model: contract.parameters.model,
        prompt: contract.prompt.request,
        size: contract.parameters.size,
        quality: contract.parameters.quality,
        n: 1,
        stream: contract.parameters.stream,
      }),
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
    const responseError = extractGenerationErrorDetails(text)
    if (responseError) throw normalizeGenerationError(createAppErrorFromApi({ error: responseError }, response.status))
    if (!response.ok) throw normalizeGenerationError(createAppErrorFromApi(null, response.status))

    const src = latestImageSrc || extractImageSrc(text)
    if (!src) throw normalizeGenerationError(new Error('接口已返回，但未解析到图片数据，请检查响应格式后重试'))
    const image = createGalleryImage(context, options, src, contract)
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
  const contract = resolveRequestContract(
    context,
    options,
    options.contract?.parameters.mode ?? options.mode ?? 'image2image',
    options.contract?.parameters.quality ?? options.qualityValue ?? context.quality,
  )

  try {
    const imageFiles = await Promise.all(context.referenceImages.map((reference) => referenceImageToFile(reference)))
    const formData = buildProviderEditFormData({
      model: contract.parameters.model,
      prompt: contract.prompt.request,
      images: imageFiles,
      size: contract.parameters.size,
      quality: contract.parameters.quality,
      n: 1,
    })

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
    const responseError = extractGenerationErrorDetails(text)
    if (responseError) throw normalizeGenerationError(createAppErrorFromApi({ error: responseError }, response.status))
    if (!response.ok) throw normalizeGenerationError(createAppErrorFromApi(null, response.status))

    const src = latestImageSrc || extractImageSrc(text)
    if (!src) throw normalizeGenerationError(new Error('接口已返回，但未解析到图片数据，请检查图生图响应格式后重试'))
    const image = createGalleryImage(context, options, src, contract)
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
  const contract = resolveRequestContract(
    context,
    options,
    options.contract?.parameters.mode ?? options.mode ?? (context.hasReferenceImage ? 'image2image' : 'text2image'),
    options.contract?.parameters.quality ?? options.qualityValue ?? context.quality,
  )
  return contract.parameters.mode.includes('image2image')
    ? requestEditImage(context, { ...options, contract })
    : requestTextImage(context, { ...options, contract })
}
