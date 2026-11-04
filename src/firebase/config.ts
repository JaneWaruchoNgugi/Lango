import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import {
  initializeFirestore,
  getFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

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

// Local development against the Firebase Emulator Suite (`firebase emulators:start`).
// Opt in with VITE_USE_EMULATORS=true in .env.local; production builds never set it.
if (import.meta.env.VITE_USE_EMULATORS === 'true' && isNewApp) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

export default app
