import {
  addDoc, updateDoc, doc, collection, query, where, getDocs, onSnapshot,
  serverTimestamp, increment, type Unsubscribe,
} from 'firebase/firestore'
import { shiftsCol } from '../firebase/collections'
import { db } from '../firebase/config'
import type { AppUser, Shift } from '../types'
import { logAudit } from './auditService'

export async function startShift(propertyId: string, guard: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<string> {
  const ref = await addDoc(shiftsCol, {
    shiftId: '', propertyId, guardId: guard.uid, guardName: guard.name,
    status: 'ACTIVE', startTime: serverTimestamp(), endTime: null,
    visitorsRegistered: 0, deliveriesRegistered: 0, incidentsReported: 0,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as never)
  await updateDoc(ref, { shiftId: ref.id })
  await logAudit({ actor: guard, propertyId, action: 'SHIFT_STARTED', entityType: 'shift', entityId: ref.id, description: 'Shift started' })
  return ref.id
}

export async function endShift(shift: Shift, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await updateDoc(doc(shiftsCol, shift.shiftId), { status: 'ENDED', endTime: serverTimestamp(), updatedAt: serverTimestamp() })
  await logAudit({ actor, propertyId: shift.propertyId, action: 'SHIFT_ENDED', entityType: 'shift', entityId: shift.shiftId, description: 'Shift ended' })
}

export async function getActiveShift(guardId: string): Promise<Shift | null> {
  const snap = await getDocs(query(collection(db, 'shifts'), where('guardId', '==', guardId), where('status', '==', 'ACTIVE')))
  return snap.empty ? null : (snap.docs[0].data() as Shift)
}

export function watchActiveShift(guardId: string, cb: (s: Shift | null) => void, onErr: (e: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'shifts'), where('guardId', '==', guardId), where('status', '==', 'ACTIVE')),
    s => cb(s.empty ? null : (s.docs[0].data() as Shift)), onErr)
}

export async function bumpShiftCounter(shiftId: string, field: 'visitorsRegistered' | 'deliveriesRegistered' | 'incidentsReported'): Promise<void> {
  if (!shiftId) return
  await updateDoc(doc(shiftsCol, shiftId), { [field]: increment(1), updatedAt: serverTimestamp() })
}
