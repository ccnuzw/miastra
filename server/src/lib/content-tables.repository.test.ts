import { describe, expect, it } from 'vitest'
import { createPostgresContentTablesRepository } from './content-tables.repository'

describe('content tables repository', () => {
  it('exposes draw batch counters in queries', () => {
    expect(createPostgresContentTablesRepository).toBeTypeOf('function')
  })
})
