import { describe, it, expect } from 'vitest'
import { generateUnitCodes, generateUnitNumbers } from './units'

describe('generateUnitCodes', () => {
  it('prefix + padded number (A01..A24)', () => {
    const r = generateUnitCodes({ prefix: 'A', start: 1, count: 24, padding: 2 })
    expect(r[0]).toBe('A01')
    expect(r[23]).toBe('A24')
    expect(r).toHaveLength(24)
  })

  it('prefix with dash + custom start (A-101..A-112)', () => {
    const r = generateUnitCodes({ prefix: 'A-', start: 101, count: 12, padding: 0 })
    expect(r[0]).toBe('A-101')
    expect(r[11]).toBe('A-112')
  })

  it('no prefix (101..106)', () => {
    const r = generateUnitCodes({ prefix: '', start: 101, count: 6, padding: 0 })
    expect(r).toEqual(['101', '102', '103', '104', '105', '106'])
  })

  it('three-digit leading zeros (001..003)', () => {
    const r = generateUnitCodes({ prefix: '', start: 1, count: 3, padding: 3 })
    expect(r).toEqual(['001', '002', '003'])
  })

  it('does not force uppercase', () => {
    const r = generateUnitCodes({ prefix: 'villa ', start: 1, count: 2, padding: 2 })
    expect(r).toEqual(['villa 01', 'villa 02'])
  })

  it('returns [] for non-positive count', () => {
    expect(generateUnitCodes({ prefix: 'A', start: 1, count: 0, padding: 2 })).toEqual([])
  })

  it('generateUnitNumbers wrapper preserves legacy behavior', () => {
    expect(generateUnitNumbers('a', 3)).toEqual(['A01', 'A02', 'A03'])
  })
})
