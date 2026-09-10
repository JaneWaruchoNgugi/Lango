import { doc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore'
import type { WriteBatch } from 'firebase/firestore'
import { occupanciesCol } from '../firebase/collections'
import type { OccupancyRecord, Unit } from '../types'

export interface OpenOccupancyArgs {
  propertyId: string
  unit: Pick<Unit, 'unitId' | 'unitNumber' | 'blockId' | 'blockName'>
  tenantId: string
  tenantName: string
  tenantPhone: string
  moveInDate: Date
}

/** Stages an open occupancy row on the caller's batch. Returns the new doc id. */
export function stageOpenOccupancy(batch: WriteBatch, a: OpenOccupancyArgs): string {
  const ref = doc(occupanciesCol)
  batch.set(ref, {
    recordId: ref.id, propertyId: a.propertyId,
    unitId: a.unit.unitId, unitNumber: a.unit.unitNumber,
    blockId: a.unit.blockId ?? null, blockName: a.unit.blockName ?? null,
    tenantId: a.tenantId, tenantName: a.tenantName, tenantPhone: a.tenantPhone,
    moveInDate: Timestamp.fromDate(a.moveInDate), moveOutDate: null,
    createdAt: serverTimestamp(),
  } as never)
  return ref.id
}

/** Lists occupancy history for one unit (newest first), constrained by property for rules. */
export async function listOccupanciesByUnit(propertyId: string, unitId: string): Promise<OccupancyRecord[]> {
  const snap = await getDocs(query(occupanciesCol,
    where('propertyId', '==', propertyId), where('unitId', '==', unitId)))
  return snap.docs.map(d => d.data() as OccupancyRecord)
    .sort((a, b) => b.moveInDate.toMillis() - a.moveInDate.toMillis())
}
