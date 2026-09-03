import { getFirestore, FieldValue } from 'firebase-admin/firestore'

interface AuditInput {
  actorId: string
  actorName: string
  actorRole: string
  propertyId: string | null
  action: string
  entityType: string
  entityId: string
  description: string
  metadata?: Record<string, unknown>
}

/** Write an immutable audit log entry. Never throws into the caller path. */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  const db = getFirestore()
  const ref = db.collection('auditLogs').doc()
  await ref.set({
    logId: ref.id,
    ...input,
    metadata: input.metadata ?? {},
    timestamp: FieldValue.serverTimestamp(),
  })
}
