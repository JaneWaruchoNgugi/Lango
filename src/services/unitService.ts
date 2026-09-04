import { getDocs, query, where, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore'
import { blocksCol, unitsCol, unitDoc } from '../firebase/collections'
import type { AppUser, Block, Unit, UnitStatus } from '../types'
import { logAudit } from './auditService'

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

export async function updateUnitStatus(unit: Unit, status: UnitStatus, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
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
