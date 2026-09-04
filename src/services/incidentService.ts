import {
  addDoc, updateDoc, doc, collection, query, where, orderBy, onSnapshot,
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

export async function setIncidentStatus(
  incident: Incident, status: Incident['status'], actor: Pick<AppUser, 'uid' | 'name' | 'role'>,
): Promise<void> {
  const patch: Record<string, unknown> = { status, updatedAt: serverTimestamp() }
  if (status === 'RESOLVED' || status === 'CLOSED') {
    patch.resolvedBy = actor.uid
    patch.resolvedAt = serverTimestamp()
  }
  await updateDoc(doc(incidentsCol, incident.incidentId), patch)
  await logAudit({
    actor, propertyId: incident.propertyId,
    action: status === 'RESOLVED' || status === 'CLOSED' ? 'INCIDENT_RESOLVED' : 'INCIDENT_REPORTED',
    entityType: 'incident', entityId: incident.incidentId,
    description: `Incident ${incident.type} → ${status}`,
  })
}

export async function addIncidentNote(
  incident: Incident, note: string, actor: Pick<AppUser, 'uid' | 'name' | 'role'>,
): Promise<void> {
  const stamped = `${actor.name}: ${note}`
  const existing = incident.description ?? ''
  await updateDoc(doc(incidentsCol, incident.incidentId), {
    description: `${existing}\n— ${stamped}`, updatedAt: serverTimestamp(),
  })
}
