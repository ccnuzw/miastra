import type { ProviderConfig } from '@/features/provider/provider.types'

type GenerationInputValidationResult =
  | { ok: true }
  | {
      ok: false
      message: string
      openSettings: boolean
    }

export function validateGenerationInputState(
  config: ProviderConfig,
  prompt: string,
): GenerationInputValidationResult {
  if (!prompt.trim()) {
    return {
      ok: false,
      message: '请先填写提示词',
      openSettings: false,
    }
  }

  if (!config.model.trim()) {
    return {
      ok: false,
      message: '请先在右上角设置里选择 Provider Model',
      openSettings: true,
    }
  }

  if (config.mode === 'managed') {
    const providerId = config.managedProviderId.trim() || config.providerId.trim()
    if (!providerId) {
      return {
        ok: false,
        message: '请先在右上角设置里选择公共 Provider',
        openSettings: true,
      }
    }

    return { ok: true }
  }

  if (!config.apiKey.trim()) {
    return {
      ok: false,
      message: '请先在右上角设置里填写 Provider API Key',
      openSettings: true,
    }
  }

  return { ok: true }
}
