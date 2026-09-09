import type { UserRole } from '../types'

const MANAGE_ROLES: UserRole[] = ['PROPERTY_MANAGER', 'CARETAKER']

export function canManageTenants(role: UserRole | null | undefined): boolean {
  return !!role && MANAGE_ROLES.includes(role)
}
export function canManageUnits(role: UserRole | null | undefined): boolean {
  return !!role && MANAGE_ROLES.includes(role)
}
export function canResolveIncidents(role: UserRole | null | undefined): boolean {
  return !!role && MANAGE_ROLES.includes(role)
}
export function canManageDeliveries(role: UserRole | null | undefined): boolean {
  return !!role && MANAGE_ROLES.includes(role)
}
export function canManageStaff(role: UserRole | null | undefined): boolean {
  return role === 'SUPER_ADMIN'
}
/** Property managers (and admins) may remove staff accounts for their property. */
export function canDeleteStaff(role: UserRole | null | undefined): boolean {
  return role === 'PROPERTY_MANAGER' || role === 'SUPER_ADMIN'
}
/** Property managers (and admins) may create staff. PMs are limited server-side
 * to Caretakers/Security Guards for their own property. */
export function canCreateStaff(role: UserRole | null | undefined): boolean {
  return role === 'PROPERTY_MANAGER' || role === 'SUPER_ADMIN'
}
