import { getDocs, query, where, orderBy } from 'firebase/firestore'
import { blocksCol, unitsCol } from '../firebase/collections'
import type { Block, Unit } from '../types'

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
