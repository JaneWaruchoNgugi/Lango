import {
  addDoc, updateDoc, doc, collection, query, where, orderBy, onSnapshot,
  serverTimestamp, type Unsubscribe,
} from 'firebase/firestore'
import { deliveriesCol } from '../firebase/collections'
import { db } from '../firebase/config'
import type { AppUser, Delivery, DeliveryStatus, VehicleType } from '../types'
import { logAudit } from './auditService'

export interface RegisterDeliveryArgs {
  propertyId: string
  guard: Pick<AppUser, 'uid' | 'name' | 'role'>
  shiftId?: string
  company: string
  riderName: string
  riderPhone: string
  riderIdNumber?: string
  blockId: string | null; blockName: string | null
  unitId: string; unitNumber: string
  tenantId?: string; tenantName?: string
  deliveryType?: string
  trackingNumber?: string
  vehicleRegistration?: string
  vehicleType?: VehicleType
  vehicleDescription?: string
  gatePassNumber?: string
  packageDescription?: string
  photoUrl?: string
  notes?: string
}

export async function registerDelivery(a: RegisterDeliveryArgs): Promise<string> {
  const ref = await addDoc(deliveriesCol, {
    deliveryId: '', propertyId: a.propertyId,
    blockId: a.blockId, blockName: a.blockName,
    unitId: a.unitId, unitNumber: a.unitNumber,
    tenantId: a.tenantId ?? '', tenantName: a.tenantName ?? '',
    guardId: a.guard.uid, guardName: a.guard.name, registeredBy: a.guard.uid,
    shiftId: a.shiftId ?? '',
    company: a.company, riderName: a.riderName, riderPhone: a.riderPhone,
    riderIdNumber: a.riderIdNumber ?? '',
    deliveryType: a.deliveryType ?? '', trackingNumber: a.trackingNumber ?? '',
    vehicleRegistration: a.vehicleRegistration ?? '',
    vehicleType: a.vehicleType ?? null,
    vehicleDescription: a.vehicleDescription ?? '',
    gatePassNumber: a.gatePassNumber ?? '',
    packageDescription: a.packageDescription ?? '', photoUrl: a.photoUrl ?? '',
    status: 'RECEIVED', receivedAt: serverTimestamp(), collectedAt: null,
    notificationSent: false, notes: a.notes ?? '',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as never)
  await updateDoc(ref, { deliveryId: ref.id })
  await logAudit({
    actor: a.guard, propertyId: a.propertyId, action: 'DELIVERY_REGISTERED',
    entityType: 'delivery', entityId: ref.id,
    description: `Registered ${a.company} delivery for ${a.unitNumber}`,
  })
  return ref.id
}

export async function markCollected(d: Delivery, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await updateDoc(doc(deliveriesCol, d.deliveryId), {
    status: 'COLLECTED', collectedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  await logAudit({
    actor, propertyId: d.propertyId, action: 'DELIVERY_COLLECTED',
    entityType: 'delivery', entityId: d.deliveryId,
    description: `${d.company} delivery for ${d.unitNumber} collected`,
  })
}

export function watchDeliveries(propertyId: string, cb: (d: Delivery[]) => void, onErr: (e: Error) => void, status?: DeliveryStatus): Unsubscribe {
  const base = [where('propertyId', '==', propertyId)]
  const q = status
    ? query(collection(db, 'deliveries'), ...base, where('status', '==', status), orderBy('receivedAt', 'desc'))
    : query(collection(db, 'deliveries'), ...base, orderBy('receivedAt', 'desc'))
  return onSnapshot(q, s => cb(s.docs.map(x => x.data() as Delivery)), onErr)
}

export async function markHeld(d: Delivery, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await updateDoc(doc(deliveriesCol, d.deliveryId), { status: 'HELD', updatedAt: serverTimestamp() })
  await logAudit({ actor, propertyId: d.propertyId, action: 'DELIVERY_HELD', entityType: 'delivery', entityId: d.deliveryId, description: `${d.company} delivery held` })
}

export async function markReturned(d: Delivery, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await updateDoc(doc(deliveriesCol, d.deliveryId), { status: 'RETURNED', updatedAt: serverTimestamp() })
  await logAudit({ actor, propertyId: d.propertyId, action: 'DELIVERY_RETURNED', entityType: 'delivery', entityId: d.deliveryId, description: `${d.company} delivery returned` })
}
