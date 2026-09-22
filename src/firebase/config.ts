import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey:            import.meta.env.FIREBASE_API_KEY,
  authDomain:        import.meta.env.FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.FIREBASE_APP_ID,
}

// Initialize Firebase only once (important for hot reload in dev)
const isNewApp = getApps().length === 0
const app      = isNewApp ? initializeApp(firebaseConfig) : getApp()

// This project's Firestore database is named `default` (not the canonical
// `(default)`), so the database id must be passed explicitly. Configurable via
// VITE_FIREBASE_DATABASE_ID; when unset, the SDK targets the real `(default)`.
const databaseId = import.meta.env.FIREBASE_DATABASE_ID as string | undefined

const persistenceCache = { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }

export const auth      = getAuth(app)
// initializeFirestore must only be called once per app; on HMR re-runs fall back to getFirestore
export const db        = isNewApp
  ? (databaseId ? initializeFirestore(app, persistenceCache, databaseId) : initializeFirestore(app, persistenceCache))
  : (databaseId ? getFirestore(app, databaseId) : getFirestore(app))
export const storage   = getStorage(app)
export const functions = getFunctions(app, 'us-central1')

export default app
