import { writeBatch, serverTimestamp, increment, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { unitsCol, unitDoc, blockDoc, propertyDoc } from '../firebase/collections'
import type { Block, Unit, AppUser } from '../types'
import { logAudit } from './auditService'

const DELETE_CHUNK = 450 // stay under Firestore's 500-op batch limit

/**
 * Delete a block and ALL of its units (cascade). Refuses if any unit is
 * currently OCCUPIED — those tenants must be moved out first. Re-queries the
 * block's units fresh so the decision isn't based on stale UI state.
 */
export async function deleteBlockCascade(
  block: Block,
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>,
): Promise<number> {
  const snap = await getDocs(query(unitsCol, where('blockId', '==', block.blockId)))
  const blockUnits = snap.docs.map((d) => d.data() as Unit)

  const occupied = blockUnits.filter((u) => u.status === 'OCCUPIED')
  if (occupied.length > 0) {
    throw new Error(
      `${block.name} has ${occupied.length} occupied unit${occupied.length === 1 ? '' : 's'}. Move those tenants out first.`,
    )
  }

  // Delete units in chunks to respect the 500-write batch cap.
  for (let i = 0; i < blockUnits.length; i += DELETE_CHUNK) {
    const batch = writeBatch(db)
    for (const u of blockUnits.slice(i, i + DELETE_CHUNK)) batch.delete(unitDoc(u.unitId))
    await batch.commit()
  }

  // Final batch: delete the block and fix the property counters.
  const batch = writeBatch(db)
  batch.delete(blockDoc(block.blockId))
  batch.update(propertyDoc(block.propertyId), {
    numberOfBlocks: increment(-1),
    totalUnits: increment(-blockUnits.length),
    updatedAt: serverTimestamp(),
  })
  await batch.commit()

  await logAudit({
    actor,
    propertyId: block.propertyId,
    action: 'BLOCK_DELETED',
    entityType: 'block',
    entityId: block.blockId,
    description: `Block ${block.name} deleted with ${blockUnits.length} unit${blockUnits.length === 1 ? '' : 's'}`,
    metadata: { units: blockUnits.length },
  })

  return blockUnits.length
}
