import type { ProviderConfig, ProviderPreset } from './provider.types'

export const providerPresets: ProviderPreset[] = [
  {
    id: 'sub2api',
    name: 'Sub2API / OpenAI Images',
    apiUrl: '',
    model: 'gpt-image-2',
    note: '本地 sub2api 推荐配置，支持 gpt-image-* 模型。',
  },
  {
    id: 'openai',
    name: 'OpenAI Compatible',
    apiUrl: 'https://api.openai.com',
    model: 'gpt-image-2',
    note: '兼容 OpenAI Images API 的服务。',
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    apiUrl: '',
    model: '',
    note: '自定义兼容接口地址、模型和路径。',
  },
]

export const defaultConfig: ProviderConfig = {
  providerId: providerPresets[0].id,
  apiUrl: providerPresets[0].apiUrl,
  model: providerPresets[0].model,
  apiKey: '',
}
