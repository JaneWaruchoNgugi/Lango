import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { normalizeKenyanPhone } from './lib/phone'
import { writeAuditLog } from './lib/audit'

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
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)]
  const chars = [pick(upper), pick(lower), pick(nums)]
  for (let i = 0; i < 9; i++) chars.push(pick(all))
  return chars.sort(() => Math.random() - 0.5).join('')
}

// createStaffUser — Super Admin creates a staff account with claims.
export const createStaffUser = onCall(async (request) => {
  assertSuperAdmin(request.auth)
  const { name, email, phone, role, propertyId, status } = request.data as {
    name: string; email: string; phone: string
    role: Exclude<Role, 'SUPER_ADMIN'>; propertyId: string; status: string
  }

  if (!name || !email || !phone || !role || !propertyId) {
    throw new HttpsError('invalid-argument', 'name, email, phone, role and propertyId are required.')
  }
  if (!['PROPERTY_MANAGER', 'CARETAKER', 'SECURITY_GUARD'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role.')
  }
  const normPhone = normalizeKenyanPhone(phone)
  if (!normPhone) throw new HttpsError('invalid-argument', 'Invalid Kenyan phone number.')

  const auth = getAuth()
  const db = getFirestore()
  const tempPassword = generateTempPassword()

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
  if (!uid || !role) throw new HttpsError('invalid-argument', 'uid and role are required.')

  await getAuth().setCustomUserClaims(uid, { role, propertyId: propertyId ?? null })
  await getFirestore().collection('users').doc(uid).update({
    role, propertyId: propertyId ?? null, updatedAt: FieldValue.serverTimestamp(),
  })
  return { ok: true }
})

// resolvePhoneToEmail — public, lets the login page sign in by phone.
export const resolvePhoneToEmail = onCall(async (request) => {
  const { phone } = request.data as { phone: string }
  const norm = normalizeKenyanPhone(phone ?? '')
  if (!norm) throw new HttpsError('invalid-argument', 'Invalid phone number.')

  const snap = await getFirestore()
    .collection('users').where('phone', '==', norm).limit(1).get()
  if (snap.empty) throw new HttpsError('not-found', 'No account found for that phone number.')

  return { email: snap.docs[0].data().email as string }
})

// bootstrapSuperAdmin — one-time, secret-guarded creation of the first admin.
export const bootstrapSuperAdmin = onCall(async (request) => {
  const { secret, email, password, name } = request.data as {
    secret: string; email: string; password: string; name: string
  }
  if (!process.env.BOOTSTRAP_SECRET || secret !== process.env.BOOTSTRAP_SECRET) {
    throw new HttpsError('permission-denied', 'Invalid bootstrap secret.')
  }
  const db = getFirestore()
  const existing = await db.collection('users').where('role', '==', 'SUPER_ADMIN').limit(1).get()
  if (!existing.empty) throw new HttpsError('failed-precondition', 'A Super Admin already exists.')

  const userRecord = await getAuth().createUser({ email, password, displayName: name })
  await getAuth().setCustomUserClaims(userRecord.uid, { role: 'SUPER_ADMIN', propertyId: null })
  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid, name, email, role: 'SUPER_ADMIN', propertyId: null,
    status: 'ACTIVE', tempPasswordSet: false,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  })
  return { uid: userRecord.uid }
})
