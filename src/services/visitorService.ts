import {
  addDoc, updateDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp,
  collection, Timestamp, type Unsubscribe,
} from 'firebase/firestore'
import { visitorsCol } from '../firebase/collections'
import { db } from '../firebase/config'
import type { AppUser, Visitor, VisitType } from '../types'
import { logAudit } from './auditService'
import { durationMinutes } from '../utils/format'

export interface RegisterVisitorArgs {
  propertyId: string
  guard: Pick<AppUser, 'uid' | 'name' | 'role'>
  shiftId?: string
  visitType: Exclude<VisitType, 'DELIVERY'>
  visitorName: string
  phone: string
  idNumber?: string
  nationality?: string
  photoUrl?: string
  blockId: string | null; blockName: string | null
  unitId: string; unitNumber: string
  tenantId?: string; tenantName?: string
  reason?: string
  company?: string
  workType?: string; workDescription?: string
  serviceType?: string; serviceDescription?: string
  expectedDurationMins?: number
  appointment?: 'SCHEDULED' | 'UNSCHEDULED'
  vehicleRegistration?: string
  numberOfVisitors?: number
  notes?: string
}

/** Creates an INSIDE visitor. propertyId comes from the claim-backed context, never a form. */
export async function registerVisitor(a: RegisterVisitorArgs): Promise<string> {
  const ref = await addDoc(visitorsCol, {
    visitorId: '',
    propertyId: a.propertyId,
    blockId: a.blockId, blockName: a.blockName,
    unitId: a.unitId, unitNumber: a.unitNumber,
    tenantId: a.tenantId ?? '', tenantName: a.tenantName ?? '',
    guardId: a.guard.uid, guardName: a.guard.name,
    registeredBy: a.guard.uid, registeredByRole: 'SECURITY_GUARD',
    shiftId: a.shiftId ?? '',
    visitorName: a.visitorName, idNumber: a.idNumber ?? '',
    nationality: a.nationality ?? '', phone: a.phone,
    photoUrl: a.photoUrl ?? '',
    visitType: a.visitType, reason: a.reason ?? '',
    company: a.company ?? '',
    workType: a.workType ?? '', workDescription: a.workDescription ?? '',
    serviceType: a.serviceType ?? '', serviceDescription: a.serviceDescription ?? '',
    expectedDurationMins: a.expectedDurationMins ?? null,
    appointment: a.appointment ?? null,
    vehicleRegistration: a.vehicleRegistration ?? '',
    numberOfVisitors: a.numberOfVisitors ?? null,
    status: 'INSIDE',
    checkInTime: serverTimestamp(), checkOutTime: null, durationMinutes: null,
    notificationSent: false, notes: a.notes ?? '',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as never)
  await updateDoc(ref, { visitorId: ref.id })
  await logAudit({
    actor: a.guard, propertyId: a.propertyId, action: 'VISITOR_REGISTERED',
    entityType: 'visitor', entityId: ref.id,
    description: `Registered ${a.visitorName} (${a.visitType}) for ${a.unitNumber}`,
  })
  return ref.id
}

export async function checkOutVisitor(visitor: Visitor, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  const mins = durationMinutes(visitor.checkInTime.toDate(), new Date())
  await updateDoc(doc(visitorsCol, visitor.visitorId), {
    status: 'CHECKED_OUT', checkOutTime: serverTimestamp(),
    durationMinutes: mins, updatedAt: serverTimestamp(),
  })
  await logAudit({
    actor, propertyId: visitor.propertyId, action: 'VISITOR_CHECKED_OUT',
    entityType: 'visitor', entityId: visitor.visitorId,
    description: `Checked out ${visitor.visitorName} after ${mins}m`,
  })
}

export function watchInside(propertyId: string, cb: (v: Visitor[]) => void, onErr: (e: Error) => void): Unsubscribe {
  const q = query(collection(db, 'visitors'),
    where('propertyId', '==', propertyId), where('status', '==', 'INSIDE'),
    orderBy('checkInTime', 'desc'))
  return onSnapshot(q, s => cb(s.docs.map(d => d.data() as Visitor)), onErr)
}

export function watchVisitorsInRange(
  propertyId: string, from: Date, to: Date,
  cb: (v: Visitor[]) => void, onErr: (e: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'visitors'),
    where('propertyId', '==', propertyId),
    where('checkInTime', '>=', Timestamp.fromDate(from)),
    where('checkInTime', '<=', Timestamp.fromDate(to)),
    orderBy('checkInTime', 'desc'))
  return onSnapshot(q, s => cb(s.docs.map(d => d.data() as Visitor)), onErr)
}
