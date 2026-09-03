import { describe, it, expect } from 'vitest'
import { generateUnitNumbers } from './units'

describe('generateUnitNumbers', () => {
  it('pads to two digits for small blocks', () => {
    expect(generateUnitNumbers('A', 3)).toEqual(['A01', 'A02', 'A03'])
  })
  it('generates the exact count requested', () => {
    expect(generateUnitNumbers('B', 24)).toHaveLength(24)
    expect(generateUnitNumbers('B', 24)[23]).toBe('B24')
  })
  it('widens padding when count exceeds 99', () => {
    const units = generateUnitNumbers('C', 100)
    expect(units[0]).toBe('C001')
    expect(units[99]).toBe('C100')
  })
  it('uppercases the prefix and trims whitespace', () => {
    expect(generateUnitNumbers('  a ', 1)).toEqual(['A01'])
  })
  it('returns an empty array for non-positive counts', () => {
    expect(generateUnitNumbers('A', 0)).toEqual([])
    expect(generateUnitNumbers('A', -5)).toEqual([])
  })
})
