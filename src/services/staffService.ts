import { getDocs, query, where } from 'firebase/firestore'
import { usersCol, shiftsCol } from '../firebase/collections'
import type { AppUser, Shift } from '../types'

/** Property staff roster (excludes Super Admin), for the read-only Guards/Staff tab. */
export async function listStaff(propertyId: string): Promise<AppUser[]> {
  const snap = await getDocs(query(usersCol, where('propertyId', '==', propertyId)))
  return snap.docs.map(d => d.data() as AppUser).filter(u => u.role !== 'SUPER_ADMIN')
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Guard uids currently on an active shift for this property. */
export async function listActiveShiftGuardIds(propertyId: string): Promise<Set<string>> {
  const snap = await getDocs(query(shiftsCol, where('propertyId', '==', propertyId), where('status', '==', 'ACTIVE')))
  return new Set(snap.docs.map(d => (d.data() as Shift).guardId))
}
