import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

describe('fast-check setup verification', () => {
  it('fast-check property test runs correctly', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(a + b).toBe(b + a)
      })
    )
  })
})
