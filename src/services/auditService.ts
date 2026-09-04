import { addDoc, serverTimestamp } from 'firebase/firestore'
import { auditLogsCol } from '../firebase/collections'
import type { AppUser, AuditAction } from '../types'

export interface AuditEntryInput {
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>
  propertyId: string | null
  action: AuditAction
  entityType: string
  entityId: string
  description: string
  metadata?: Record<string, unknown>
}

/** Single choke-point for audit writes (spec §33). Never throws into the caller's flow. */
export async function logAudit(entry: AuditEntryInput): Promise<void> {
  try {
    await addDoc(auditLogsCol, {
      actorId: entry.actor.uid,
      actorName: entry.actor.name,
      actorRole: entry.actor.role,
      propertyId: entry.propertyId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      description: entry.description,
      metadata: entry.metadata ?? {},
      timestamp: serverTimestamp(),
    } as never)
  } catch (err) {
    console.error('[audit] failed to write log', err)
  }
}
