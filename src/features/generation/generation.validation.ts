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
      message: '请先打开“编辑配置”，选择当前模型',
      openSettings: true,
    }
  }

  if (config.mode === 'managed') {
    const providerId = config.managedProviderId.trim() || config.providerId.trim()
    if (!providerId) {
      return {
        ok: false,
        message: '请先打开“编辑配置”，选择当前 Provider',
        openSettings: true,
      }
    }

    return { ok: true }
  }

  if (!config.apiKey.trim()) {
    return {
      ok: false,
      message: '请先打开“编辑配置”，补齐自定义接入的 API Key',
      openSettings: true,
    }
  }

  return { ok: true }
}
