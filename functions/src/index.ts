import { randomInt, timingSafeEqual } from 'node:crypto'
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
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

// createStaffUser — a Super Admin or Property Manager creates a staff account
// with claims. A PM is scoped to their OWN property and may only create
// Caretakers and Security Guards (never managers/admins); the Super Admin can
// create any staff role for any property.
export const createStaffUser = onCall(async (request) => {
  const caller = request.auth
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required.')
  const callerRole = caller.token?.role as Role | undefined
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'PROPERTY_MANAGER') {
    throw new HttpsError('permission-denied', 'Only a Property Manager or administrator may create staff.')
  }

  const { name, email, phone, role, propertyId: requestedPropertyId, status, password } = request.data as {
    name: string; email: string; phone: string
    role: Exclude<Role, 'SUPER_ADMIN'>; propertyId: string; status: string; password?: string
  }

  if (!name || !email || !phone || !role) {
    throw new HttpsError('invalid-argument', 'name, email, phone and role are required.')
  }

  // Resolve the target property + allowed roles from WHO is calling.
  let propertyId: string
  if (callerRole === 'PROPERTY_MANAGER') {
    if (role !== 'CARETAKER' && role !== 'SECURITY_GUARD') {
      throw new HttpsError('permission-denied', 'A Property Manager can only add Caretakers and Security Guards.')
    }
    const claimProperty = caller.token?.propertyId as string | undefined
    if (!claimProperty) throw new HttpsError('failed-precondition', 'Your account is not linked to a property.')
    propertyId = claimProperty // forced from the caller's claim — never trust a client-supplied propertyId
  } else {
    if (!['PROPERTY_MANAGER', 'CARETAKER', 'SECURITY_GUARD'].includes(role)) {
      throw new HttpsError('invalid-argument', 'Invalid role.')
    }
    if (!requestedPropertyId) throw new HttpsError('invalid-argument', 'propertyId is required.')
    propertyId = requestedPropertyId
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
    actorId: caller.uid,
    actorName: (caller.token?.name as string) ?? (callerRole === 'PROPERTY_MANAGER' ? 'Manager' : 'Super Admin'),
    actorRole: callerRole,
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
// analyzeIdDocument — forwards the document image to the Python OCR service
// and maps the structured response to the shape the frontend expects.
// The OCR service URL and bearer token are Firebase Function secrets.
// ---------------------------------------------------------------------------
const OCR_SERVICE_URL = defineSecret('OCR_SERVICE_URL')
const OCR_SERVICE_TOKEN = defineSecret('OCR_SERVICE_TOKEN')

const OCR_TIMEOUT_MS = 30_000

type OcrDocType = 'national_id' | 'passport' | 'driver_license' | 'unknown'

interface OcrField { value: string | null; confidence: number; raw: string | null }

interface OcrServiceFields {
  name?: OcrField
  id_number?: OcrField
  date_of_birth?: OcrField
  nationality?: OcrField
  sex?: OcrField
  expiry_date?: OcrField
  issue_date?: OcrField
  issuing_country?: OcrField
  address?: OcrField
}

interface OcrServiceResponse {
  schema_version: string
  success: boolean
  doc_type: string
  fields: OcrServiceFields
  overall_confidence: number
  warnings?: string[]
  error?: { code: string; message: string; recoverable: boolean }
  processing_ms?: number
}

function mapDocType(raw: string): OcrDocType {
  if (raw === 'national_id') return 'national_id'
  if (raw === 'passport') return 'passport'
  if (raw === 'driver_license') return 'driver_license'
  return 'unknown'
}

// Realistic mock result returned when OCR_DEMO_MODE=true (no Python service needed).
const OCR_MOCK_RESULT = {
  docType: 'national_id' as OcrDocType,
  confidence: 0.91,
  name: 'Jane Warucho Ngugi',
  idNumber: '12345678',
  dateOfBirth: '1994-03-22',
  nationality: 'KENYAN',
  sex: 'F',
  expiryDate: null,
  issueDate: '2015-06-10',
  address: null,
  fieldConfidence: {
    name: 0.96, idNumber: 0.94, dateOfBirth: 0.88,
    nationality: 1.0, sex: 0.93, expiryDate: 0.0,
    issueDate: 0.79, address: 0.0,
  },
  warnings: ['Demo mode — no real OCR was performed.'],
}

export const analyzeIdDocument = onCall(
  { secrets: [OCR_SERVICE_URL, OCR_SERVICE_TOKEN] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to scan documents.')

    // Demo mode: return mock data without calling the Python OCR service.
    // Enable by setting OCR_DEMO_MODE=true in Firebase Function environment config.
    if (process.env.OCR_DEMO_MODE === 'true') {
      console.log('analyzeIdDocument: demo mode — returning mock result')
      return OCR_MOCK_RESULT
    }

    const { imageBase64, mediaType, docType: docTypeHint } = request.data as {
      imageBase64: string
      mediaType: string
      docType?: string
    }

    if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
      throw new HttpsError('invalid-argument', 'A base64 image is required.')
    }
    if (mediaType !== 'image/jpeg' && mediaType !== 'image/png') {
      throw new HttpsError('invalid-argument', 'mediaType must be image/jpeg or image/png.')
    }

    const validDocTypes = ['auto', 'national_id', 'passport', 'driver_license']
    const docType = validDocTypes.includes(docTypeHint ?? '') ? docTypeHint : 'auto'

    let ocrJson: OcrServiceResponse
    try {
      const res = await fetch(`${OCR_SERVICE_URL.value()}/ocr/document`, {
        method: 'POST',
        signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OCR_SERVICE_TOKEN.value()}`,
        },
        body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType, doc_type: docType }),
      })

      if (res.status === 401) throw new HttpsError('internal', 'OCR service authentication failed.')
      if (res.status === 503 || res.status === 504) {
        throw new HttpsError('unavailable', 'OCR service is temporarily unavailable.')
      }
      if (!res.ok) {
        console.error('OCR service error', res.status)
        throw new HttpsError('internal', 'OCR service returned an unexpected error.')
      }

      ocrJson = (await res.json()) as OcrServiceResponse
    } catch (err) {
      const e = err as { code?: string; name?: string }
      if (e.code === 'unauthenticated' || e.code === 'unavailable' || e.code === 'internal') throw err
      if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        console.error('OCR service timeout')
        throw new HttpsError('deadline-exceeded', 'OCR service did not respond in time.')
      }
      console.error('OCR service fetch failed', err)
      throw new HttpsError('internal', 'Could not reach the OCR service.')
    }

    // success:false means OCR ran but couldn't extract fields — return a
    // graceful degraded result so the Guard can enter details manually.
    if (!ocrJson.success) {
      console.warn('OCR returned success:false', ocrJson.error?.code, ocrJson.warnings)
      return { docType: 'unknown', name: null, idNumber: null }
    }

    const f = ocrJson.fields
    return {
      docType: mapDocType(ocrJson.doc_type),
      confidence: ocrJson.overall_confidence,
      name: f.name?.value ?? null,
      idNumber: f.id_number?.value ?? null,
      dateOfBirth: f.date_of_birth?.value ?? null,
      nationality: f.nationality?.value ?? null,
      sex: f.sex?.value ?? null,
      expiryDate: f.expiry_date?.value ?? null,
      issueDate: f.issue_date?.value ?? null,
      address: f.address?.value ?? null,
      fieldConfidence: {
        name: f.name?.confidence ?? 0,
        idNumber: f.id_number?.confidence ?? 0,
        dateOfBirth: f.date_of_birth?.confidence ?? 0,
        nationality: f.nationality?.confidence ?? 0,
        sex: f.sex?.confidence ?? 0,
        expiryDate: f.expiry_date?.confidence ?? 0,
        issueDate: f.issue_date?.confidence ?? 0,
        address: f.address?.confidence ?? 0,
      },
      warnings: ocrJson.warnings ?? [],
    }
  },
)
