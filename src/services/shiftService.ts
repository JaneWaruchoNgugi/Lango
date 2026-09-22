import {
  addDoc, updateDoc, doc, collection, query, where, getDocs, onSnapshot,
  serverTimestamp, increment, type Unsubscribe,
} from 'firebase/firestore'
import { shiftsCol } from '../firebase/collections'
import { db } from '../firebase/config'
import type { AppUser, Shift, ShiftType } from '../types'
import { logAudit } from './auditService'

export async function startShift(
  propertyId: string,
  guard: Pick<AppUser, 'uid' | 'name' | 'role'>,
  options?: { shiftType?: ShiftType; securityPost?: string },
): Promise<string> {
  // Enforce: one active shift per guard
  const existing = await getActiveShift(guard.uid, propertyId)
  if (existing) throw new Error('You already have an active shift')

  const ref = await addDoc(shiftsCol, {
    shiftId: '',
    propertyId,
    guardId: guard.uid,
    guardName: guard.name,
    status: 'ACTIVE',
    shiftType: options?.shiftType ?? 'DAY',
    securityPost: options?.securityPost ?? '',
    startTime: serverTimestamp(),
    endTime: null,
    handoverNote: null,
    visitorsRegistered: 0,
    deliveriesRegistered: 0,
    incidentsReported: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as never)
  await updateDoc(ref, { shiftId: ref.id })
  await logAudit({
    actor: guard, propertyId, action: 'SHIFT_STARTED', entityType: 'shift', entityId: ref.id,
    description: `${options?.shiftType ?? 'DAY'} shift started at ${options?.securityPost ?? 'Unknown post'}`,
  })
  return ref.id
}

export async function endShift(
  shift: Shift,
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>,
  handoverNote?: string,
): Promise<void> {
  if (shift.status !== 'ACTIVE') throw new Error('Shift is not active')
  await updateDoc(doc(shiftsCol, shift.shiftId), {
    status: 'ENDED',
    endTime: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(handoverNote?.trim() ? { handoverNote: handoverNote.trim() } : {}),
  })
  await logAudit({ actor, propertyId: shift.propertyId, action: 'SHIFT_ENDED', entityType: 'shift', entityId: shift.shiftId, description: 'Shift ended' })
}

export async function addHandover(shiftId: string, note: string): Promise<void> {
  await updateDoc(doc(shiftsCol, shiftId), { handoverNote: note, updatedAt: serverTimestamp() })
}

export async function getActiveShift(guardId: string, propertyId: string): Promise<Shift | null> {
  const snap = await getDocs(query(collection(db, 'shifts'), where('propertyId', '==', propertyId), where('status', '==', 'ACTIVE')))
  const doc = snap.docs.find(d => d.data().guardId === guardId)
  return doc ? (doc.data() as Shift) : null
}

export function watchActiveShift(guardId: string, propertyId: string, cb: (s: Shift | null) => void, onErr: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'shifts'), where('propertyId', '==', propertyId), where('status', '==', 'ACTIVE')),
    s => {
      const match = s.docs.find(d => d.data().guardId === guardId)
      cb(match ? (match.data() as Shift) : null)
    },
    onErr,
  )
}

export function watchActiveShifts(propertyId: string, cb: (shifts: Shift[]) => void, onErr: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'shifts'), where('propertyId', '==', propertyId), where('status', '==', 'ACTIVE')),
    snap => cb(snap.docs.map(d => d.data() as Shift)), onErr,
  )
}

export async function listShifts(propertyId: string, options?: { guardId?: string; status?: 'ACTIVE' | 'ENDED' }): Promise<Shift[]> {
  const constraints = [where('propertyId', '==', propertyId)]
  if (options?.status) constraints.push(where('status', '==', options.status))
  const snap = await getDocs(query(shiftsCol as ReturnType<typeof collection>, ...constraints))
  let results = snap.docs.map(d => d.data() as Shift)
  if (options?.guardId) results = results.filter(s => s.guardId === options.guardId)
  return results.sort((a, b) => (b.startTime?.toMillis() ?? 0) - (a.startTime?.toMillis() ?? 0))
}

export async function bumpShiftCounter(shiftId: string, field: 'visitorsRegistered' | 'deliveriesRegistered' | 'incidentsReported'): Promise<void> {
  if (!shiftId) return
  await updateDoc(doc(shiftsCol, shiftId), { [field]: increment(1), updatedAt: serverTimestamp() })
}
