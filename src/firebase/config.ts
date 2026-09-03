import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase only once (important for hot reload in dev)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// This project's Firestore database is named `default` (not the canonical
// `(default)`), so the database id must be passed explicitly. Configurable via
// VITE_FIREBASE_DATABASE_ID; when unset, the SDK targets the real `(default)`.
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID as string | undefined

export const auth      = getAuth(app)
export const db        = databaseId ? getFirestore(app, databaseId) : getFirestore(app)
export const storage   = getStorage(app)
export const functions = getFunctions(app, 'us-central1')

// Enable Firestore offline persistence (offline-first for guards)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — persistence only works in one tab at a time
    console.warn('Firestore persistence failed: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    // Browser doesn't support persistence
    console.warn('Firestore persistence not supported in this browser')
  }
})

export default app
