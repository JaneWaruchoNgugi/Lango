import { getApp } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

/**
 * This project's Firestore database is named `default` (not the canonical
 * `(default)`), so the database id must be passed explicitly. Overridable via
 * the FIRESTORE_DATABASE_ID env var for other environments.
 */
export function firestore(): Firestore {
  return getFirestore(getApp(), process.env.FIRESTORE_DATABASE_ID || 'default')
}
