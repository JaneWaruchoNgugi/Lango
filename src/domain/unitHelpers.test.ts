import { describe, it, expect } from 'vitest'
import { unitDisplayName, unitFloorLabel, propertyStructureType, computeOccupancy } from './unitHelpers'

describe('unitHelpers', () => {
  it('unitDisplayName prefers displayName, falls back to unitNumber', () => {
    expect(unitDisplayName({ unitNumber: 'A01' } as any)).toBe('A01')
    expect(unitDisplayName({ unitNumber: 'A01', displayName: 'Apartment A01' } as any)).toBe('Apartment A01')
  })

  it('unitFloorLabel coerces legacy numeric floor and handles missing', () => {
    expect(unitFloorLabel({ floor: 2 } as any)).toBe('2')
    expect(unitFloorLabel({ floor: 'Ground' } as any)).toBe('Ground')
    expect(unitFloorLabel({} as any)).toBe('')
  })

  it('propertyStructureType defaults to BLOCKS when absent', () => {
    expect(propertyStructureType({} as any)).toBe('BLOCKS')
    expect(propertyStructureType({ structureType: 'VILLAS' } as any)).toBe('VILLAS')
  })

  it('computeOccupancy counts by status', () => {
    const units = [
      { status: 'OCCUPIED' }, { status: 'OCCUPIED' },
      { status: 'VACANT' }, { status: 'RESERVED' }, { status: 'MAINTENANCE' },
    ] as any[]
    expect(computeOccupancy(units)).toEqual({
      total: 5, occupied: 2, vacant: 1, reserved: 1, maintenance: 1,
    })
  })
})
