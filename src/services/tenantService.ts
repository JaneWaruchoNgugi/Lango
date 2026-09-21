import {
  getDocs, query, where, orderBy,
  writeBatch, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { tenantsCol, unitsCol, occupanciesCol, tenantDoc } from '../firebase/collections'
import { db } from '../firebase/config'
import { logAudit } from './auditService'
import { stageOpenOccupancy } from './occupancyService'
import type { AppUser, Tenant, TenantStatus, Unit } from '../types'

/** Loads ACTIVE tenants for a property once; the UI filters this list live. */
export async function loadActiveTenants(propertyId: string): Promise<Tenant[]> {
  const snap = await getDocs(query(tenantsCol,
    where('propertyId', '==', propertyId), where('status', '==', 'ACTIVE'), orderBy('fullName')))
  return snap.docs.map(d => d.data() as Tenant)
}

export function filterTenants(tenants: Tenant[], term: string): Tenant[] {
  const t = term.trim().toLowerCase()
  if (!t) return tenants
  return tenants.filter(x =>
    x.fullName.toLowerCase().includes(t) ||
    x.unitNumber.toLowerCase().includes(t) ||
    (x.blockName ?? '').toLowerCase().includes(t) ||
    x.phoneNumber.includes(t) || (x.whatsappNumber ?? '').includes(t))
}

export async function listTenants(propertyId: string, status?: TenantStatus): Promise<Tenant[]> {
  const q = status
    ? query(tenantsCol, where('propertyId', '==', propertyId), where('status', '==', status), orderBy('fullName'))
    : query(tenantsCol, where('propertyId', '==', propertyId), orderBy('fullName'))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Tenant)
}

export interface AssignTenantArgs {
  propertyId: string
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>
  unit: Unit
  fullName: string
  phoneNumber: string
  whatsappNumber: string
  email?: string
  nationalId?: string
  moveInDate: Date
  notes?: string
}

/** Creates a tenant, occupies the unit, and opens an occupancy record — atomically. */
export async function assignTenantToUnit(a: AssignTenantArgs): Promise<string> {
  const batch = writeBatch(db)
  const tenantRef = doc(tenantsCol)
  batch.set(tenantRef, {
    tenantId: tenantRef.id, propertyId: a.propertyId,
    blockId: a.unit.blockId ?? null, unitId: a.unit.unitId,
    unitNumber: a.unit.unitNumber, blockName: a.unit.blockName ?? null,
    fullName: a.fullName, phoneNumber: a.phoneNumber, whatsappNumber: a.whatsappNumber,
    email: a.email ?? '', nationalId: a.nationalId ?? '',
    moveInDate: Timestamp.fromDate(a.moveInDate), moveOutDate: null,
    status: 'ACTIVE', notes: a.notes ?? '',
    createdBy: a.actor.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as never)
  batch.update(doc(unitsCol, a.unit.unitId), {
    status: 'OCCUPIED', currentTenantId: tenantRef.id, currentTenantName: a.fullName,
    updatedAt: serverTimestamp(),
  })
  stageOpenOccupancy(batch, {
    propertyId: a.propertyId, unit: a.unit, tenantId: tenantRef.id,
    tenantName: a.fullName, tenantPhone: a.phoneNumber, moveInDate: a.moveInDate,
  })
  await batch.commit()
  await logAudit({
    actor: a.actor, propertyId: a.propertyId, action: 'TENANT_ASSIGNED',
    entityType: 'tenant', entityId: tenantRef.id,
    description: `Assigned ${a.fullName} to ${a.unit.unitNumber}`,
  })
  return tenantRef.id
}

export interface UpdateTenantPatch {
  fullName?: string; phoneNumber?: string; whatsappNumber?: string
  email?: string; nationalId?: string; notes?: string
  moveInDate?: Date
}

export async function updateTenant(tenant: Tenant, patch: UpdateTenantPatch, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  const { moveInDate, ...rest } = patch
  const batch = writeBatch(db)
  const tenantPatch: Record<string, unknown> = { ...rest, updatedAt: serverTimestamp() }
  if (moveInDate) {
    const moveInTs = Timestamp.fromDate(moveInDate)
    tenantPatch.moveInDate = moveInTs
    // Keep the still-open occupancy record's move-in date consistent with the tenant.
    if (tenant.status === 'ACTIVE') {
      const occSnap = await getDocs(query(occupanciesCol,
        where('propertyId', '==', tenant.propertyId), where('unitId', '==', tenant.unitId)))
      occSnap.docs
        .filter(d => { const data = d.data(); return data.tenantId === tenant.tenantId && data.moveOutDate === null })
        .forEach(d => batch.update(d.ref, { moveInDate: moveInTs }))
    }
  }
  batch.update(tenantDoc(tenant.tenantId), tenantPatch)
  await batch.commit()
  await logAudit({
    actor, propertyId: tenant.propertyId, action: 'TENANT_UPDATED',
    entityType: 'tenant', entityId: tenant.tenantId, description: `Updated ${tenant.fullName}`,
  })
}

/** Moves a tenant out on `moveOutDate`: tenant→MOVED_OUT, unit→VACANT, close the open occupancy — atomically. Never deletes. */
export async function moveOutTenant(tenant: Tenant, actor: Pick<AppUser, 'uid' | 'name' | 'role'>, moveOutDate: Date): Promise<void> {
  if (moveOutDate.getTime() < tenant.moveInDate.toDate().getTime()) {
    throw new Error('Vacate date cannot be before the move-in date.')
  }
  const moveOutTs = Timestamp.fromDate(moveOutDate)
  // Find the open occupancy via the indexed propertyId+unitId pair, then match tenant + null moveOut in code.
  const occSnap = await getDocs(query(occupanciesCol,
    where('propertyId', '==', tenant.propertyId), where('unitId', '==', tenant.unitId)))
  const batch = writeBatch(db)
  batch.update(tenantDoc(tenant.tenantId), {
    status: 'MOVED_OUT', moveOutDate: moveOutTs, updatedAt: serverTimestamp(),
  })
  batch.update(doc(unitsCol, tenant.unitId), {
    status: 'VACANT', currentTenantId: null, currentTenantName: null, updatedAt: serverTimestamp(),
  })
  occSnap.docs
    .filter(d => { const data = d.data(); return data.tenantId === tenant.tenantId && data.moveOutDate === null })
    .forEach(d => batch.update(d.ref, { moveOutDate: moveOutTs }))
  await batch.commit()
  await logAudit({
    actor, propertyId: tenant.propertyId, action: 'TENANT_MOVED_OUT',
    entityType: 'tenant', entityId: tenant.tenantId,
    description: `Moved out ${tenant.fullName} from ${tenant.unitNumber}`,
  })
}
