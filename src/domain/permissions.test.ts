import { describe, it, expect } from 'vitest'
import { canManageTenants, canManageUnits, canResolveIncidents, canManageDeliveries, canManageStaff } from './permissions'

describe('permissions', () => {
  it('caretaker & manager can manage tenants/units/incidents/deliveries', () => {
    for (const r of ['CARETAKER', 'PROPERTY_MANAGER'] as const) {
      expect(canManageTenants(r)).toBe(true)
      expect(canManageUnits(r)).toBe(true)
      expect(canResolveIncidents(r)).toBe(true)
      expect(canManageDeliveries(r)).toBe(true)
    }
  })
  it('guard cannot manage tenants/units', () => {
    expect(canManageTenants('SECURITY_GUARD')).toBe(false)
    expect(canManageUnits('SECURITY_GUARD')).toBe(false)
  })
  it('only super admin can manage staff', () => {
    expect(canManageStaff('SUPER_ADMIN')).toBe(true)
    expect(canManageStaff('CARETAKER')).toBe(false)
  })
})
