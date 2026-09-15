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

  it('generateUnitNumbers widens padding to 3 digits at count 100', () => {
    const r = generateUnitNumbers('C', 100)
    expect(r[0]).toBe('C001')
    expect(r[99]).toBe('C100')
    expect(r).toHaveLength(100)
  })

  it('generateUnitNumbers trims and uppercases the prefix', () => {
    expect(generateUnitNumbers('  a ', 1)).toEqual(['A01'])
  })

  it('generateUnitNumbers returns [] for negative count', () => {
    expect(generateUnitNumbers('A', -5)).toEqual([])
  })
})

import { generateFloorUnitCodes } from './units'

describe('generateFloorUnitCodes', () => {
  it('generates floor-major codes with the floor recorded', () => {
    const out = generateFloorUnitCodes({ prefix: 'A', floors: 6, unitsPerFloor: 4 })
    expect(out).toHaveLength(24)
    expect(out[0]).toEqual({ unitNumber: 'A101', floor: '1' })
    expect(out[3]).toEqual({ unitNumber: 'A104', floor: '1' })
    expect(out[4]).toEqual({ unitNumber: 'A201', floor: '2' })
    expect(out[23]).toEqual({ unitNumber: 'A604', floor: '6' })
  })

  it('defaults the unit part to two digits', () => {
    const out = generateFloorUnitCodes({ prefix: 'B', floors: 1, unitsPerFloor: 2 })
    expect(out.map(u => u.unitNumber)).toEqual(['B101', 'B102'])
  })

  it('widens the unit padding when unitsPerFloor exceeds 99, keeping the floor recoverable', () => {
    const out = generateFloorUnitCodes({ prefix: 'C', floors: 1, unitsPerFloor: 120 })
    expect(out[0].unitNumber).toBe('C1001')   // floor 1, unit 001
    expect(out[0].floor).toBe('1')
    expect(out[119].unitNumber).toBe('C1120')  // floor 1, unit 120
  })

  it('supports a custom floorStart (e.g. ground floor 0)', () => {
    const out = generateFloorUnitCodes({ prefix: 'A', floors: 2, unitsPerFloor: 1, floorStart: 0 })
    expect(out[0]).toEqual({ unitNumber: 'A001', floor: '0' })
    expect(out[1]).toEqual({ unitNumber: 'A101', floor: '1' })
  })

  it('works with an empty prefix', () => {
    const out = generateFloorUnitCodes({ prefix: '', floors: 1, unitsPerFloor: 1 })
    expect(out[0]).toEqual({ unitNumber: '101', floor: '1' })
  })

  it('returns an empty array for non-positive floors or unitsPerFloor', () => {
    expect(generateFloorUnitCodes({ prefix: 'A', floors: 0, unitsPerFloor: 4 })).toEqual([])
    expect(generateFloorUnitCodes({ prefix: 'A', floors: 3, unitsPerFloor: 0 })).toEqual([])
  })
})
