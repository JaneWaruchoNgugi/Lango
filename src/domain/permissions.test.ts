import { describe, it, expect } from 'vitest'
import {
  canManageTenants, canManageUnits, canResolveIncidents,
  canManageDeliveries, canManageStaff, canViewTenantAssignment,
} from './permissions'

describe('permissions', () => {
  it('only property manager can manage tenants and units', () => {
    expect(canManageTenants('PROPERTY_MANAGER')).toBe(true)
    expect(canManageUnits('PROPERTY_MANAGER')).toBe(true)
    expect(canManageTenants('CARETAKER')).toBe(false)
    expect(canManageUnits('CARETAKER')).toBe(false)
  })
  it('caretaker & manager can resolve incidents and manage deliveries', () => {
    for (const r of ['CARETAKER', 'PROPERTY_MANAGER'] as const) {
      expect(canResolveIncidents(r)).toBe(true)
      expect(canManageDeliveries(r)).toBe(true)
    }
  })
  it('guard cannot manage tenants/units/incidents/deliveries', () => {
    expect(canManageTenants('SECURITY_GUARD')).toBe(false)
    expect(canManageUnits('SECURITY_GUARD')).toBe(false)
    expect(canResolveIncidents('SECURITY_GUARD')).toBe(false)
    expect(canManageDeliveries('SECURITY_GUARD')).toBe(false)
  })
  it('only property manager and super admin can view tenant assignment on units', () => {
    expect(canViewTenantAssignment('PROPERTY_MANAGER')).toBe(true)
    expect(canViewTenantAssignment('SUPER_ADMIN')).toBe(true)
    expect(canViewTenantAssignment('CARETAKER')).toBe(false)
    expect(canViewTenantAssignment('SECURITY_GUARD')).toBe(false)
  })
  it('only super admin can manage staff', () => {
    expect(canManageStaff('SUPER_ADMIN')).toBe(true)
    expect(canManageStaff('CARETAKER')).toBe(false)
  })
})
