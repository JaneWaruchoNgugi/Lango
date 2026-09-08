import { randomInt, timingSafeEqual } from 'node:crypto'
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'
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

// deleteStaffUser — a Property Manager (or Super Admin) removes a staff account.
// Deletes the Auth user + the Firestore profile. PMs are scoped to their own
// property and cannot delete admins or other managers.
export const deleteStaffUser = onCall(async (request) => {
  const auth = request.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required.')
  const callerRole = auth.token?.role as Role | undefined
  if (callerRole !== 'PROPERTY_MANAGER' && callerRole !== 'SUPER_ADMIN') {
    throw new HttpsError('permission-denied', 'Only a Property Manager or administrator may delete staff.')
  }

  const { uid } = request.data as { uid: string }
  if (typeof uid !== 'string' || uid.length === 0 || uid.length > 128) {
    throw new HttpsError('invalid-argument', 'A valid uid is required.')
  }
  if (uid === auth.uid) throw new HttpsError('failed-precondition', 'You cannot delete your own account.')

  const db = firestore()
  const snap = await db.collection('users').doc(uid).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Staff member not found.')
  const target = snap.data() as { role: Role; propertyId?: string | null; name?: string }

  if (callerRole === 'PROPERTY_MANAGER') {
    if ((auth.token?.propertyId ?? null) !== (target.propertyId ?? null)) {
      throw new HttpsError('permission-denied', 'That staff member belongs to another property.')
    }
    if (target.role === 'SUPER_ADMIN' || target.role === 'PROPERTY_MANAGER') {
      throw new HttpsError('permission-denied', 'You cannot delete an administrator or another manager.')
    }
  }

  // Remove the Auth account first (ignore if it was already gone), then the profile.
  try {
    await getAuth().deleteUser(uid)
  } catch (err) {
    if ((err as { code?: string })?.code !== 'auth/user-not-found') throw err
  }
  await db.collection('users').doc(uid).delete()

  await writeAuditLog({
    actorId: auth.uid,
    actorName: (auth.token?.name as string) ?? 'Manager',
    actorRole: callerRole,
    propertyId: (target.propertyId as string) ?? (auth.token?.propertyId as string) ?? null,
    action: 'STAFF_DELETED',
    entityType: 'user',
    entityId: uid,
    description: `Deleted ${target.name ?? uid} (${target.role})`,
  })

  return { ok: true }
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

// ---------------------------------------------------------------------------
// analyzeIdDocument — reads a Kenyan National ID or passport photo with Claude
// vision and returns the guest's full name + document number. The API key is a
// Functions secret; the function deploys fine before the secret is set — it is
// only needed at scan time.
// ---------------------------------------------------------------------------
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

const ID_PROMPT = `You are reading a photo of a Kenyan identity document — either a Kenyan National ID card or a passport data page. Extract exactly two things: the person's full name and their document number.

Rules:
- Kenyan National ID: "idNumber" is the value labelled "ID NUMBER" (7-8 digits). Do NOT return the "SERIAL NUMBER" (9 digits). Set docType to "national_id".
- Passport: "idNumber" is the passport number (from the data page or the machine-readable zone). Set docType to "passport".
- "name" is the full name in normal Title Case (e.g. "Jane Warucho Ngugi").
- If the image is not a recognizable ID or passport, or a field is unreadable, set that field to null and docType to "unknown".
Return only the structured fields.`

const ID_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    docType: { type: 'string', enum: ['national_id', 'passport', 'unknown'] },
    name: { type: ['string', 'null'] },
    idNumber: { type: ['string', 'null'] },
  },
  required: ['docType', 'name', 'idNumber'],
} as const

export const analyzeIdDocument = onCall({ secrets: [ANTHROPIC_API_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to scan documents.')

  const { imageBase64, mediaType } = request.data as { imageBase64: string; mediaType: string }
  if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    throw new HttpsError('invalid-argument', 'A base64 image is required.')
  }
  if (mediaType !== 'image/jpeg' && mediaType !== 'image/png') {
    throw new HttpsError('invalid-argument', 'mediaType must be image/jpeg or image/png.')
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
  let response
  try {
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: ID_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: ID_PROMPT },
          ],
        },
      ],
    })
  } catch (err) {
    console.error('Anthropic vision call failed', err)
    throw new HttpsError('internal', 'Could not read the document. Please try again.')
  }

  const block = response.content.find((b) => b.type === 'text')
  const text = block && block.type === 'text' ? block.text : ''
  try {
    const parsed = JSON.parse(text) as { docType?: string; name?: string | null; idNumber?: string | null }
    return {
      docType: parsed.docType ?? 'unknown',
      name: parsed.name ?? null,
      idNumber: parsed.idNumber ?? null,
    }
  } catch {
    return { docType: 'unknown', name: null, idNumber: null }
  }
})
