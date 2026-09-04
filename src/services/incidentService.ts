import {
  addDoc, updateDoc, collection, query, where, orderBy, onSnapshot,
  serverTimestamp, type Unsubscribe,
} from 'firebase/firestore'
import { incidentsCol } from '../firebase/collections'
import { db } from '../firebase/config'
import type { AppUser, Incident, IncidentType, IncidentSeverity } from '../types'
import { logAudit } from './auditService'

export interface ReportIncidentArgs {
  propertyId: string
  guard: Pick<AppUser, 'uid' | 'name' | 'role'>
  type: IncidentType
  severity: IncidentSeverity
  description: string
  relatedVisitorId?: string
  relatedVisitorName?: string
  photoUrl?: string
}

export async function reportIncident(a: ReportIncidentArgs): Promise<string> {
  const ref = await addDoc(incidentsCol, {
    incidentId: '', propertyId: a.propertyId,
    guardId: a.guard.uid, guardName: a.guard.name,
    type: a.type, description: a.description, severity: a.severity,
    photoUrl: a.photoUrl ?? '',
    relatedVisitorId: a.relatedVisitorId ?? '', relatedVisitorName: a.relatedVisitorName ?? '',
    status: 'OPEN', reportedAt: serverTimestamp(),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as never)
  await updateDoc(ref, { incidentId: ref.id })
  await logAudit({
    actor: a.guard, propertyId: a.propertyId, action: 'INCIDENT_REPORTED',
    entityType: 'incident', entityId: ref.id,
    description: `${a.severity} incident: ${a.type}`,
  })
  return ref.id
}

export function watchIncidents(propertyId: string, cb: (i: Incident[]) => void, onErr: (e: Error) => void, status?: Incident['status']): Unsubscribe {
  const q = status
    ? query(collection(db, 'incidents'), where('propertyId', '==', propertyId), where('status', '==', status), orderBy('createdAt', 'desc'))
    : query(collection(db, 'incidents'), where('propertyId', '==', propertyId), orderBy('createdAt', 'desc'))
  return onSnapshot(q, s => cb(s.docs.map(d => d.data() as Incident)), onErr)
}
