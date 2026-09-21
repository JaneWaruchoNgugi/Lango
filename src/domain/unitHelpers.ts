import type { Unit, Property, StructureType, UnitStatus } from '../types'

/** Display label for a unit: explicit displayName, else the unit code. */
export function unitDisplayName(u: Pick<Unit, 'unitNumber' | 'displayName'>): string {
  return u.displayName || u.unitNumber
}

/** Floor label; coerces legacy numeric floors stored before the string migration. */
export function unitFloorLabel(u: { floor?: string | number | null }): string {
  if (typeof u.floor === 'number') return String(u.floor)
  return u.floor ?? ''
}

/** Structure type with the legacy default. */
export function propertyStructureType(p: Pick<Property, 'structureType'>): StructureType {
  return p.structureType ?? 'BLOCKS'
}

export interface Occupancy {
  total: number
  occupied: number
  vacant: number
  reserved: number
  maintenance: number
}

/** Occupancy counts derived from real unit docs. */
export function computeOccupancy(units: Array<{ status: UnitStatus }>): Occupancy {
  const by = (s: UnitStatus) => units.filter((u) => u.status === s).length
  return {
    total: units.length,
    occupied: by('OCCUPIED'),
    vacant: by('VACANT'),
    reserved: by('RESERVED'),
    maintenance: by('MAINTENANCE'),
  }
}
