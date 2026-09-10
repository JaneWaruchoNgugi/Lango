import { describe, it, expect } from 'vitest'
import { validateUnitCode } from './unitCode'

describe('validateUnitCode', () => {
  it('accepts a unique non-empty code', () => {
    expect(validateUnitCode('A01', ['B01', 'B02'])).toBeNull()
  })
  it('accepts custom string codes', () => {
    expect(validateUnitCode('Penthouse East', [])).toBeNull()
    expect(validateUnitCode('Shop A', [])).toBeNull()
    expect(validateUnitCode('Office B-203', [])).toBeNull()
  })
  it('rejects empty/whitespace', () => {
    expect(validateUnitCode('   ', [])).toMatch(/required/i)
  })
  it('rejects over-long codes', () => {
    expect(validateUnitCode('X'.repeat(21), [])).toMatch(/20/)
  })
  it('rejects duplicates case-insensitively, trimming', () => {
    expect(validateUnitCode(' a01 ', ['A01'])).toMatch(/already/i)
  })
})
