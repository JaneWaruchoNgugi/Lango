import { getDocs, query, where } from 'firebase/firestore'
import { preApprovedCol } from '../firebase/collections'
import type { PreApprovedVisitor } from '../types'

export async function loadPreApproved(propertyId: string): Promise<PreApprovedVisitor[]> {
  const snap = await getDocs(query(preApprovedCol,
    where('propertyId', '==', propertyId), where('isActive', '==', true)))
  return snap.docs.map(d => d.data() as PreApprovedVisitor)
}

/** True if now (local) falls within the pre-approved access window. */
export function isAccessAllowedNow(p: PreApprovedVisitor, now = new Date()): boolean {
  if (!p.accessDays.includes(now.getDay())) return false
  const hhmm = now.toTimeString().slice(0, 5)
  return hhmm >= p.accessStart && hhmm <= p.accessEnd
}

export function matchPreApproved(list: PreApprovedVisitor[], term: string): PreApprovedVisitor[] {
  const t = term.trim().toLowerCase()
  if (!t) return []
  return list.filter(p => p.name.toLowerCase().includes(t) || p.unitNumber.toLowerCase().includes(t))
}
