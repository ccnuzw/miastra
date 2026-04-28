export type ProviderPreset = {
  id: string
  name: string
  apiUrl: string
  model: string
  note: string
}

export type ProviderConfig = {
  providerId: string
  apiUrl: string
  model: string
  apiKey: string
}
