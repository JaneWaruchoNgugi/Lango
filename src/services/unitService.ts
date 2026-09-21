import {
  getDocs, query, where,
  writeBatch, serverTimestamp, increment,
  updateDoc, orderBy, getDoc, doc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { blocksCol, unitsCol, unitDoc, propertyDoc, tenantDoc } from '../firebase/collections'
import type { AppUser, Block, Unit } from '../types'
import { validateUnitCode } from '../domain/unitCode'
import { logAudit } from './auditService'

// ============================================================
// EXISTING FUNCTIONS (preserved)
// ============================================================

export async function listBlocks(propertyId: string): Promise<Block[]> {
  const snap = await getDocs(query(blocksCol, where('propertyId', '==', propertyId), orderBy('name')))
  return snap.docs.map(d => d.data() as Block)
}

export async function listUnits(propertyId: string, blockId?: string): Promise<Unit[]> {
  const q = blockId
    ? query(unitsCol, where('propertyId', '==', propertyId), where('blockId', '==', blockId), orderBy('unitNumber'))
    : query(unitsCol, where('propertyId', '==', propertyId), orderBy('unitNumber'))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Unit)
}

export async function updateUnitStatus(unit: Unit, status: Unit['status'], actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await updateDoc(unitDoc(unit.unitId), { status, updatedAt: serverTimestamp() })
  await logAudit({
    actor, propertyId: unit.propertyId, action: 'UNIT_STATUS_CHANGED',
    entityType: 'unit', entityId: unit.unitId,
    description: `Unit ${unit.unitNumber} → ${status}`,
  })
}

export async function listUnitsWithTenant(propertyId: string): Promise<Unit[]> {
  return listUnits(propertyId)
}

// ============================================================
// NEW UNIT-CODE FUNCTIONS (Task 4b)
// ============================================================

export interface NewUnitInput {
  propertyId: string
  unitCode: string
  displayName?: string
  blockId?: string | null
  blockName?: string | null
  floor?: string
  unitType?: string
  status?: Unit['status']
}

/** All existing unit codes for a property (for uniqueness checks). */
// Firestore SDK has no field projection, so full unit docs are fetched.
export async function fetchUnitCodes(propertyId: string): Promise<string[]> {
  const snap = await getDocs(query(unitsCol, where('propertyId', '==', propertyId)))
  return snap.docs.map((d) => (d.data() as Unit).unitNumber)
}

function unitDocPayload(input: NewUnitInput) {
  return {
    propertyId: input.propertyId,
    unitNumber: input.unitCode.trim(),
    displayName: (input.displayName?.trim() || input.unitCode.trim()),
    blockId: input.blockId ?? null,
    blockName: input.blockName ?? null,
    floor: input.floor?.trim() || null,
    unitType: input.unitType?.trim() || null,
    status: input.status ?? 'VACANT',
    currentTenantId: null,
    currentTenantName: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

/** Create a single unit after validating its code is unique in the property. */
export async function createUnit(input: NewUnitInput, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<string> {
  const existing = await fetchUnitCodes(input.propertyId)
  const err = validateUnitCode(input.unitCode, existing)
  if (err) throw new Error(err)

  const batch = writeBatch(db)
  const ref = doc(unitsCol)
  batch.set(ref, { unitId: ref.id, ...unitDocPayload(input) } as never)
  batch.update(propertyDoc(input.propertyId), {
    totalUnits: increment(1), updatedAt: serverTimestamp(),
  })
  await batch.commit()
  await logAudit({
    actor, propertyId: input.propertyId, action: 'UNIT_CREATED',
    entityType: 'unit', entityId: ref.id,
    description: `Unit ${input.unitCode.trim()} created`,
  })
  return ref.id
}

const MAX_BATCH = 499 // 499 unit writes + 1 property-counter update = Firestore's 500 cap

/**
 * Create many units atomically. Rejects if any code collides with existing
 * codes or with another code in the same batch.
 */
export async function createUnitsBatch(inputs: NewUnitInput[], actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<number> {
  if (inputs.length === 0) return 0
  const propertyId = inputs[0].propertyId

  if (inputs.length > MAX_BATCH) throw new Error(`Cannot create more than ${MAX_BATCH} units at once`)

  if (!inputs.every((i) => i.propertyId === propertyId)) {
    throw new Error('All units in a batch must belong to the same property')
  }

  const existing = await fetchUnitCodes(propertyId)
  const seen = new Set(existing.map((c) => c.trim().toLowerCase()))
  for (const input of inputs) {
    const err = validateUnitCode(input.unitCode, [...seen])
    if (err) throw new Error(`${input.unitCode}: ${err}`)
    seen.add(input.unitCode.trim().toLowerCase())
  }

  const batch = writeBatch(db)
  for (const input of inputs) {
    const ref = doc(unitsCol)
    batch.set(ref, { unitId: ref.id, ...unitDocPayload(input) } as never)
  }
  batch.update(propertyDoc(propertyId), {
    totalUnits: increment(inputs.length), updatedAt: serverTimestamp(),
  })
  await batch.commit()
  await logAudit({
    actor, propertyId, action: 'UNITS_BULK_CREATED',
    entityType: 'unit', entityId: propertyId,
    description: `${inputs.length} units created`,
    metadata: { count: inputs.length },
  })
  return inputs.length
}

/**
 * Rename a unit's code (and/or display name). Re-checks uniqueness and, when the
 * unit is occupied, syncs the active tenant's denormalized unitNumber.
 */
export async function renameUnit(
  unit: Unit,
  next: { unitCode: string; displayName?: string },
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>,
): Promise<void> {
  const existing = (await fetchUnitCodes(unit.propertyId)).filter(
    (c) => c.trim().toLowerCase() !== unit.unitNumber.trim().toLowerCase(),
  )
  const err = validateUnitCode(next.unitCode, existing)
  if (err) throw new Error(err)

  const batch = writeBatch(db)
  batch.update(unitDoc(unit.unitId), {
    unitNumber: next.unitCode.trim(),
    displayName: next.displayName?.trim() || next.unitCode.trim(),
    updatedAt: serverTimestamp(),
  })
  if (unit.currentTenantId) {
    const tSnap = await getDoc(tenantDoc(unit.currentTenantId))
    if (
      tSnap.exists() &&
      tSnap.data().propertyId === unit.propertyId &&
      tSnap.data().unitId === unit.unitId
    ) {
      batch.update(tenantDoc(unit.currentTenantId), {
        unitNumber: next.unitCode.trim(), updatedAt: serverTimestamp(),
      })
    }
  }
  await batch.commit()
  await logAudit({
    actor, propertyId: unit.propertyId, action: 'UNIT_RENAMED',
    entityType: 'unit', entityId: unit.unitId,
    description: `Unit ${unit.unitNumber} → ${next.unitCode.trim()}`,
  })
}

/** Delete a unit. Refuses to delete an occupied unit unless force=true. */
export async function deleteUnit(unit: Unit, actor: Pick<AppUser, 'uid' | 'name' | 'role'>, opts?: { force?: boolean }): Promise<void> {
  if (unit.currentTenantId && !opts?.force) {
    throw new Error('This unit has an active tenant. Confirm to delete anyway.')
  }
  const batch = writeBatch(db)
  batch.delete(unitDoc(unit.unitId))
  batch.update(propertyDoc(unit.propertyId), {
    totalUnits: increment(-1), updatedAt: serverTimestamp(),
  })
  await batch.commit()
  await logAudit({
    actor, propertyId: unit.propertyId, action: 'UNIT_DELETED',
    entityType: 'unit', entityId: unit.unitId,
    description: `Unit ${unit.unitNumber} deleted`,
  })
}
