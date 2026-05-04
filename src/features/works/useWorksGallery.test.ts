import { describe, expect, it } from 'vitest'
import { filterWorksGallery, mergeGalleryWithLocalChanges } from './useWorksGallery'

describe('filterWorksGallery', () => {
  const gallery = [
    {
      id: 'work-1',
      title: '封面人像',
      meta: '暖色杂志风格',
      promptText: 'amber skyline portrait',
      promptSnippet: 'amber skyline',
      providerModel: 'gpt-image-1',
      size: '1024x1024',
      quality: 'high',
      batchId: 'batch-a',
      taskStatus: 'success' as const,
      isFavorite: true,
      tags: ['portrait', 'warm'],
    },
    {
      id: 'work-2',
      title: '夜雨街景',
      meta: '电影感城市夜景',
      promptText: 'night rain city',
      promptSnippet: 'noir city',
      providerModel: 'gpt-image-1',
      size: '1536x1024',
      quality: 'medium',
      batchId: 'batch-b',
      taskStatus: 'failed' as const,
      isFavorite: true,
      tags: ['city', 'noir'],
    },
    {
      id: 'work-3',
      title: '产品静物',
      meta: '白底产品图',
      promptText: 'clean product hero shot',
      providerModel: 'gpt-image-1',
      size: '1024x1024',
      quality: 'high',
      batchId: 'batch-a',
      taskStatus: 'success' as const,
      tags: ['product'],
    },
  ]

  it('matches multiple search terms across prompt, tags and metadata', () => {
    expect(filterWorksGallery(gallery, { searchQuery: 'amber warm 杂志' }).map((item) => item.id)).toEqual(['work-1'])
    expect(filterWorksGallery(gallery, { searchQuery: 'night noir failed' }).map((item) => item.id)).toEqual(['work-2'])
  })

  it('combines favorites, tag and batch filters', () => {
    expect(filterWorksGallery(gallery, {
      favoritesOnly: true,
      tag: 'warm',
      batchId: 'batch-a',
    }).map((item) => item.id)).toEqual(['work-1'])

    expect(filterWorksGallery(gallery, {
      favoritesOnly: true,
      tag: 'noir',
      batchId: 'batch-b',
    }).map((item) => item.id)).toEqual(['work-2'])
  })

  it('treats "all" as no-op filters', () => {
    expect(filterWorksGallery(gallery, {
      batchId: 'all',
      tag: 'all',
      searchQuery: '',
    })).toEqual(gallery)
  })

  it('keeps newer local works when a stale server gallery response arrives', () => {
    const merged = mergeGalleryWithLocalChanges([
      {
        id: 'work-1',
        title: '封面人像',
        meta: '暖色杂志风格',
      },
    ], [
      {
        id: 'work-local',
        title: '刚生成的新图',
        meta: '本地新图',
        src: 'https://example.com/generated.png',
      },
    ])

    expect(merged).toHaveLength(2)
    expect(merged[0]).toMatchObject({
      id: 'work-local',
      title: '刚生成的新图',
      meta: '本地新图',
      src: 'https://example.com/generated.png',
      assetId: 'work:work-local:primary',
    })
    expect(merged[1]).toMatchObject({
      id: 'work-1',
      title: '封面人像',
      meta: '暖色杂志风格',
    })
  })
})
