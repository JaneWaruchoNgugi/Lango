import { randomInt, timingSafeEqual } from 'node:crypto'
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import { normalizeKenyanPhone } from './lib/phone'
import { writeAuditLog } from './lib/audit'
import { firestore } from './lib/db'

initializeApp()
setGlobalOptions({ region: 'us-central1' })

type Role = 'SUPER_ADMIN' | 'PROPERTY_MANAGER' | 'CARETAKER' | 'SECURITY_GUARD'

function assertSuperAdmin(auth: CallableRequest['auth']) {
  if (!auth || auth.token?.role !== 'SUPER_ADMIN') {
    throw new HttpsError('permission-denied', 'Only a Super Admin may perform this action.')
  }
}

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const nums = '23456789'
  const all = upper + lower + nums
  const pick = (set: string) => set[randomInt(0, set.length)]
  const chars = [pick(upper), pick(lower), pick(nums)]
  for (let i = 0; i < 9; i++) chars.push(pick(all))
  // Fisher–Yates shuffle with a CSPRNG
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

// createStaffUser — Super Admin creates a staff account with claims.
export const createStaffUser = onCall(async (request) => {
  assertSuperAdmin(request.auth)
  const { name, email, phone, role, propertyId, status, password } = request.data as {
    name: string; email: string; phone: string
    role: Exclude<Role, 'SUPER_ADMIN'>; propertyId: string; status: string; password?: string
  }

  if (!name || !email || !phone || !role || !propertyId) {
    throw new HttpsError('invalid-argument', 'name, email, phone, role and propertyId are required.')
  }
  if (!['PROPERTY_MANAGER', 'CARETAKER', 'SECURITY_GUARD'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role.')
  }
  const normPhone = normalizeKenyanPhone(phone)
  if (!normPhone) throw new HttpsError('invalid-argument', 'Invalid Kenyan phone number.')

  // Use the admin-provided temporary password when supplied (min 8 chars);
  // otherwise fall back to a generated one. Either way the staff member must
  // change it on first login (tempPasswordSet: true below).
  let tempPassword: string
  if (password !== undefined && password !== '') {
    if (typeof password !== 'string' || password.length < 8) {
      throw new HttpsError('invalid-argument', 'Temporary password must be at least 8 characters.')
    }
    tempPassword = password
  } else {
    tempPassword = generateTempPassword()
  }

  const auth = getAuth()
  const db = firestore()

  let uid: string
  try {
    const userRecord = await auth.createUser({
      email, password: tempPassword, displayName: name, phoneNumber: normPhone,
    })
    uid = userRecord.uid
  } catch (err: any) {
    if (err?.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'A user with this email already exists.')
    }
    if (err?.code === 'auth/phone-number-already-exists') {
      throw new HttpsError('already-exists', 'A user with this phone number already exists.')
    }
    throw new HttpsError('internal', err?.message ?? 'Failed to create user.')
  }

  await auth.setCustomUserClaims(uid, { role, propertyId })

  await db.collection('users').doc(uid).set({
    uid, name, email, phone: normPhone, role, propertyId,
    status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    tempPasswordSet: true,
    createdBy: request.auth!.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  await writeAuditLog({
    actorId: request.auth!.uid,
    actorName: (request.auth!.token.name as string) ?? 'Super Admin',
    actorRole: 'SUPER_ADMIN',
    propertyId,
    action: 'STAFF_CREATED',
    entityType: 'user',
    entityId: uid,
    description: `Created ${role} account for ${name}`,
  })

  return { uid, tempPassword }
})

// setUserClaims — reassign role/property; re-mints claims + mirrors profile.
export const setUserClaims = onCall(async (request) => {
  assertSuperAdmin(request.auth)
  const { uid, role, propertyId } = request.data as { uid: string; role: Role; propertyId: string | null }

  const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'CARETAKER', 'SECURITY_GUARD']
  if (typeof uid !== 'string' || uid.length === 0 || uid.length > 128) {
    throw new HttpsError('invalid-argument', 'Invalid uid.')
  }
  if (!ALL_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role.')
  }
  const normalizedPropertyId = propertyId ?? null
  if (normalizedPropertyId !== null && (typeof normalizedPropertyId !== 'string' || normalizedPropertyId.length === 0 || normalizedPropertyId.length > 128)) {
    throw new HttpsError('invalid-argument', 'Invalid propertyId.')
  }
  // Non-SUPER_ADMIN roles must be scoped to a property.
  if (role !== 'SUPER_ADMIN' && normalizedPropertyId === null) {
    throw new HttpsError('invalid-argument', 'A property is required for this role.')
  }
  // Guard against the acting admin demoting themselves out of SUPER_ADMIN.
  if (uid === request.auth!.uid && role !== 'SUPER_ADMIN') {
    throw new HttpsError('failed-precondition', 'You cannot remove your own Super Admin role.')
  }

  await getAuth().setCustomUserClaims(uid, { role, propertyId: normalizedPropertyId })
  await firestore().collection('users').doc(uid).update({
    role, propertyId: normalizedPropertyId, updatedAt: FieldValue.serverTimestamp(),
  })
  return { ok: true }
})

// SECURITY NOTE (deferred per milestone spec §7): resolvePhoneToEmail is an
// unauthenticated callable that maps phone -> login email to enable phone login.
// This permits phone/email enumeration. The accepted mitigation — App Check
// enforcement (enforceAppCheck) + per-phone/IP rate limiting — is scheduled for
// the later "Notifications / App Check / hardening" phase. Do NOT enable
// enforceAppCheck until the web client registers an App Check provider, or all
// callable traffic (including login) will be rejected.
// resolvePhoneToEmail — public, lets the login page sign in by phone.
export const resolvePhoneToEmail = onCall(async (request) => {
  const { phone } = request.data as { phone: string }
  const norm = normalizeKenyanPhone(phone ?? '')
  if (!norm) throw new HttpsError('invalid-argument', 'Invalid phone number.')

  const snap = await firestore()
    .collection('users').where('phone', '==', norm).limit(1).get()
  if (snap.empty) throw new HttpsError('not-found', 'No account found for that phone number.')

  return { email: snap.docs[0].data().email as string }
})

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// bootstrapSuperAdmin — one-time, secret-guarded creation of the first admin.
export const bootstrapSuperAdmin = onCall(async (request) => {
  const { secret, email, password, name } = request.data as {
    secret: string; email: string; password: string; name: string
  }
  if (!process.env.BOOTSTRAP_SECRET || typeof secret !== 'string' || !secretsMatch(secret, process.env.BOOTSTRAP_SECRET)) {
    throw new HttpsError('permission-denied', 'Invalid bootstrap secret.')
  }
  if (!email || !name || typeof password !== 'string' || password.length < 12) {
    throw new HttpsError('invalid-argument', 'email, name and a password of at least 12 characters are required.')
  }

  const db = firestore()
  const bootstrapRef = db.collection('system').doc('bootstrap')

  // Transactionally claim the singleton so concurrent calls cannot both proceed.
  await db.runTransaction(async (tx) => {
    const existingAdmin = await db.collection('users').where('role', '==', 'SUPER_ADMIN').limit(1).get()
    const bootstrapDoc = await tx.get(bootstrapRef)
    if (!existingAdmin.empty || bootstrapDoc.exists) {
      throw new HttpsError('failed-precondition', 'A Super Admin already exists.')
    }
    tx.set(bootstrapRef, { claimedAt: FieldValue.serverTimestamp() })
  })

  const userRecord = await getAuth().createUser({ email, password, displayName: name })
  await getAuth().setCustomUserClaims(userRecord.uid, { role: 'SUPER_ADMIN', propertyId: null })
  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid, name, email, role: 'SUPER_ADMIN', propertyId: null,
    status: 'ACTIVE', tempPasswordSet: false,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  })
  await bootstrapRef.update({ uid: userRecord.uid })
  return { uid: userRecord.uid }
})
