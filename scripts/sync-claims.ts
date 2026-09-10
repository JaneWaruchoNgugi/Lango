/**
 * Backfill Firebase Auth custom claims (`role`, `propertyId`) from each user's
 * Firestore profile.
 *
 * Why this exists: Firestore security rules gate reads on the TOKEN claim
 * (`request.auth.token.propertyId`), but the app can fall back to the profile
 * value client-side. If a user has `propertyId` in their profile but not in
 * their claim, queries look valid yet every read is DENIED — surfacing as empty
 * lists (e.g. "No tenants"). This resyncs claims so the token matches the profile.
 *
 * Prereqs (same as seed):
 *   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json
 *
 * Run:
 *   cd scripts && npm install && npx tsx sync-claims.ts            # all users
 *   cd scripts && npx tsx sync-claims.ts caretaker@greenview.dev   # one user
 *
 * Users must sign out and back in (or the app must refresh the token) for the
 * new claims to take effect.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const app = initializeApp({ credential: applicationDefault() })
const auth = getAuth()
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || 'default')

interface Profile {
  role?: string | null
  propertyId?: string | null
  email?: string | null
}

async function syncOne(uid: string, email: string | undefined, profile: Profile): Promise<boolean> {
  const desired = { role: profile.role ?? null, propertyId: profile.propertyId ?? null }
  const user = await auth.getUser(uid)
  const current = (user.customClaims ?? {}) as Record<string, unknown>
  const inSync = current.role === desired.role && (current.propertyId ?? null) === desired.propertyId
  if (inSync) {
    console.log(`= ${email ?? uid} already in sync (role=${desired.role}, propertyId=${desired.propertyId})`)
    return false
  }
  await auth.setCustomUserClaims(uid, desired)
  console.log(`✔ ${email ?? uid} → role=${desired.role}, propertyId=${desired.propertyId}`)
  return true
}

async function main() {
  const targetEmail = process.argv[2]?.trim()
  let fixed = 0

  if (targetEmail) {
    const record = await auth.getUserByEmail(targetEmail)
    const snap = await db.collection('users').doc(record.uid).get()
    if (!snap.exists) throw new Error(`No Firestore profile for ${targetEmail} (uid ${record.uid})`)
    if (await syncOne(record.uid, record.email, snap.data() as Profile)) fixed++
  } else {
    const users = await db.collection('users').get()
    console.log(`Scanning ${users.size} user profiles…`)
    for (const doc of users.docs) {
      const profile = doc.data() as Profile
      try {
        if (await syncOne(doc.id, profile.email ?? undefined, profile)) fixed++
      } catch (e) {
        console.warn(`! Skipped ${profile.email ?? doc.id}: ${(e as Error).message}`)
      }
    }
  }

  console.log(`\nDone. Updated ${fixed} user(s). Affected users must re-login for claims to apply.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
