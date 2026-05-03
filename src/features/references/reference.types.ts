export type ReferenceImage = {
  id: string
  src: string
  name: string
  source: 'upload' | 'work'
  assetId?: string
  assetRemoteKey?: string
  file?: File
  workId?: string
  workTitle?: string
}
