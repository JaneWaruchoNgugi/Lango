import { randomInt, timingSafeEqual } from 'node:crypto'
import { onCall, onRequest, HttpsError, CallableRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { setGlobalOptions } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { normalizeKenyanPhone } from './lib/phone'
import { writeAuditLog } from './lib/audit'
import { firestore } from './lib/db'

initializeApp()
setGlobalOptions({ region: 'us-central1' })

type Role = 'SUPER_ADMIN' | 'PROPERTY_MANAGER' | 'CARETAKER' | 'SECURITY_GUARD' | 'SALON_OWNER' | 'SALON_RECEPTIONIST' | 'SALON_PROVIDER'
type SalonRole = 'SALON_OWNER' | 'SALON_RECEPTIONIST' | 'SALON_PROVIDER'

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

  const { name, email, phone, role, propertyId: requestedPropertyId, status, password, idNumber, guardNumber } = request.data as {
    name: string; email: string; phone: string
    role: Exclude<Role, 'SUPER_ADMIN'>; propertyId: string; status: string; password?: string
    idNumber?: string; guardNumber?: string
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
    ...(idNumber?.trim() ? { idNumber: idNumber.trim() } : {}),
    ...(guardNumber?.trim() ? { guardNumber: guardNumber.trim() } : {}),
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
// enforcement (enforceAppCheck) is scheduled for the later hardening phase.
// Rate limiting is now enforced via a Firestore-backed token bucket (5 req/min per phone).
// Do NOT enable enforceAppCheck until the web client registers an App Check provider.
// resolvePhoneToEmail — public, lets the login page sign in by phone.
export const resolvePhoneToEmail = onCall(async (request) => {
  const { phone } = request.data as { phone: string }
  const norm = normalizeKenyanPhone(phone ?? '')
  if (!norm) throw new HttpsError('invalid-argument', 'Invalid phone number.')

  // Rate limit: max 5 calls per phone per 60 seconds
  const db = firestore()
  const rateKey = norm.replace(/[^a-zA-Z0-9]/g, '_')
  await db.runTransaction(async tx => {
    const rateRef = db.collection('_rateLimits').doc(rateKey)
    const snap = await tx.get(rateRef)
    const now = Date.now()
    const WINDOW_MS = 60_000
    const MAX = 5
    if (snap.exists) {
      const { windowStart, count } = snap.data()!
      if (now - (windowStart as number) < WINDOW_MS) {
        if ((count as number) >= MAX) {
          throw new HttpsError('resource-exhausted', 'Too many requests. Please try again later.')
        }
        tx.update(rateRef, { count: FieldValue.increment(1) })
      } else {
        tx.set(rateRef, { windowStart: now, count: 1 })
      }
    } else {
      tx.set(rateRef, { windowStart: now, count: 1 })
    }
  })

  const snap = await db.collection('users').where('phone', '==', norm).limit(1).get()
  if (snap.empty) throw new HttpsError('not-found', 'No account found for that phone number.')

  return { email: snap.docs[0].data().email as string }
})

// deleteProperty — Super Admin cascade-deletes a property and ALL related data.
// Deletes: blocks, units, tenants, occupancies, visitors, deliveries, incidents,
// shifts, preApproved, subscriptions, notifications, auditLogs, staff (Auth + Firestore).
export const deleteProperty = onCall(
  { timeoutSeconds: 300 },
  async (request) => {
    assertSuperAdmin(request.auth)
    const { propertyId } = request.data as { propertyId: string }
    if (typeof propertyId !== 'string' || propertyId.length === 0 || propertyId.length > 128) {
      throw new HttpsError('invalid-argument', 'A valid propertyId is required.')
    }

    const db = firestore()
    const BATCH_SIZE = 400

    async function deleteByProperty(colName: string) {
      const snap = await db.collection(colName).where('propertyId', '==', propertyId).get()
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch()
        snap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref))
        await batch.commit()
      }
    }

    // Delete staff Auth accounts first, then their Firestore docs
    const staffSnap = await db.collection('users').where('propertyId', '==', propertyId).get()
    await Promise.all(staffSnap.docs.map(async d => {
      try { await getAuth().deleteUser(d.id) } catch (e: any) {
        if ((e as any)?.code !== 'auth/user-not-found') throw e
      }
    }))
    for (let i = 0; i < staffSnap.docs.length; i += BATCH_SIZE) {
      const batch = db.batch()
      staffSnap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref))
      await batch.commit()
    }

    // Cascade-delete all related collections in parallel
    await Promise.all([
      'blocks', 'units', 'tenants', 'occupancies', 'visitors',
      'deliveries', 'incidents', 'shifts', 'preApproved',
      'subscriptions', 'notifications', 'auditLogs',
    ].map(col => deleteByProperty(col)))

    await db.collection('properties').doc(propertyId).delete()
    return { ok: true }
  },
)

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
// analyzeIdDocument — uses Claude vision to extract structured data from a
// government ID photo. Haiku is used for cost efficiency; the Anthropic API
// key is stored as a Firebase Function secret.
// ---------------------------------------------------------------------------
import Anthropic from '@anthropic-ai/sdk'

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')
const INFOBIP_API_KEY   = defineSecret('INFOBIP_API_KEY')

type OcrDocType = 'national_id' | 'passport' | 'driver_license' | 'unknown'

interface ClaudeIdResult {
  docType: OcrDocType
  name: string | null
  idNumber: string | null
  dateOfBirth: string | null
  nationality: string | null
  sex: string | null
  expiryDate: string | null
  issueDate: string | null
  address: string | null
}

const ID_EXTRACTION_PROMPT = `You are a government ID document reader. Extract text fields from the document image.

Return ONLY a valid JSON object — no markdown, no explanation — with exactly these fields:
{
  "docType": "national_id" | "passport" | "driver_license" | "unknown",
  "name": string | null,
  "idNumber": string | null,
  "dateOfBirth": "YYYY-MM-DD" | null,
  "nationality": string | null,
  "sex": "M" | "F" | null,
  "expiryDate": "YYYY-MM-DD" | null,
  "issueDate": "YYYY-MM-DD" | null,
  "address": string | null
}

Rules:
- Kenyan National ID: idNumber is the 7–8 digit number (NOT the 9-digit serial printed separately)
- Dates must use ISO format YYYY-MM-DD; convert DD/MM/YYYY accordingly
- Name in UPPERCASE as printed on the document
- Use null for any field that is not clearly visible or readable
- If this is not a government ID document, set docType to "unknown" and all other fields to null`

// Realistic mock returned when OCR_DEMO_MODE=true
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
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to scan documents.')

    if (process.env.OCR_DEMO_MODE === 'true') {
      console.log('analyzeIdDocument: demo mode — returning mock result')
      return OCR_MOCK_RESULT
    }

    const { imageBase64, mediaType } = request.data as {
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

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })

    let raw: ClaudeIdResult
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png', data: imageBase64 },
            },
            { type: 'text', text: ID_EXTRACTION_PROMPT },
          ],
        }],
      })

      const text = msg.content.find(b => b.type === 'text')?.text ?? ''
      // Strip any accidental markdown fences Claude might add
      const jsonText = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
      raw = JSON.parse(jsonText) as ClaudeIdResult
    } catch (err) {
      console.error('Claude vision OCR failed', err)
      return { docType: 'unknown', name: null, idNumber: null }
    }

    const validDocTypes: OcrDocType[] = ['national_id', 'passport', 'driver_license', 'unknown']
    const docType: OcrDocType = validDocTypes.includes(raw.docType) ? raw.docType : 'unknown'
    const hasData = Boolean(raw.name || raw.idNumber)

    return {
      docType,
      confidence: hasData ? 0.9 : 0,
      name: raw.name ?? null,
      idNumber: raw.idNumber ?? null,
      dateOfBirth: raw.dateOfBirth ?? null,
      nationality: raw.nationality ?? null,
      sex: raw.sex ?? null,
      expiryDate: raw.expiryDate ?? null,
      issueDate: raw.issueDate ?? null,
      address: raw.address ?? null,
      fieldConfidence: {
        name: raw.name ? 0.9 : 0,
        idNumber: raw.idNumber ? 0.9 : 0,
        dateOfBirth: raw.dateOfBirth ? 0.85 : 0,
        nationality: raw.nationality ? 0.95 : 0,
        sex: raw.sex ? 0.9 : 0,
        expiryDate: raw.expiryDate ? 0.85 : 0,
        issueDate: raw.issueDate ? 0.85 : 0,
        address: raw.address ? 0.8 : 0,
      },
      warnings: [],
    }
  },
)

// ============================================================
// SALON MANAGEMENT
// ============================================================

function generateProviderCode(salonInitials: string, providerName: string, seq: number): string {
  const seqStr = String(seq).padStart(3, '0')
  const parts = providerName.trim().split(/\s+/)
  let letters: string
  if (parts.length >= 2) {
    letters = (parts[0][0] ?? 'X').toUpperCase() + (parts[parts.length - 1][0] ?? 'X').toUpperCase()
  } else {
    const n = parts[0] ?? 'X'
    letters = (n[0] ?? 'X').toUpperCase() + (n[n.length - 1] ?? 'X').toUpperCase()
  }
  return `${salonInitials.toUpperCase()}${seqStr}${letters}`
}

// createSalon — Super Admin creates a new salon
export const createSalon = onCall(async (request) => {
  assertSuperAdmin(request.auth)
  const { name, initials, phone, location, ownerName, ownerPhone, ownerEmail, ownerPassword } = request.data as {
    name: string; initials: string; phone: string; location: string
    ownerName: string; ownerPhone: string; ownerEmail: string; ownerPassword?: string
  }
  if (!name || !initials || !phone || !location || !ownerName || !ownerPhone || !ownerEmail) {
    throw new HttpsError('invalid-argument', 'All fields are required.')
  }
  const normOwnerPhone = normalizeKenyanPhone(ownerPhone)
  if (!normOwnerPhone) throw new HttpsError('invalid-argument', 'Invalid owner phone number.')

  const db = firestore()
  const auth = getAuth()

  // Create salon doc first to get the salonId
  const salonRef = db.collection('salons').doc()
  const salonId = salonRef.id

  // Create owner Firebase Auth account
  const tempPassword = ownerPassword && ownerPassword.length >= 8 ? ownerPassword : generateTempPassword()
  let ownerUid: string
  try {
    const record = await auth.createUser({ email: ownerEmail, password: tempPassword, displayName: ownerName, phoneNumber: normOwnerPhone })
    ownerUid = record.uid
  } catch (err: any) {
    if (err?.code === 'auth/email-already-exists') {
      // Only recover from a hollow orphan left by a previous failed run.
      // Hard-reject if: (a) Lango already owns this account (users doc exists),
      //                 (b) another role was assigned (custom claims present).
      // This prevents using createSalon to reset an unrelated account's password.
      const existing = await auth.getUserByEmail(ownerEmail)
      const userDoc = await db.collection('users').doc(existing.uid).get()
      if (userDoc.exists || existing.customClaims?.role) {
        throw new HttpsError('already-exists', 'Owner email already in use.')
      }
      // Truly hollow orphan — delete it and create fresh so we own the UID
      await auth.deleteUser(existing.uid)
      const fresh = await auth.createUser({ email: ownerEmail, password: tempPassword, displayName: ownerName, phoneNumber: normOwnerPhone })
      ownerUid = fresh.uid
    } else if (err?.code === 'auth/phone-number-already-exists') {
      throw new HttpsError('already-exists', 'Owner phone number already in use.')
    } else {
      throw new HttpsError('internal', err?.message ?? 'Failed to create owner account.')
    }
  }

  await auth.setCustomUserClaims(ownerUid, { role: 'SALON_OWNER', salonId, propertyId: null })

  const now = FieldValue.serverTimestamp()
  await Promise.all([
    salonRef.set({
      salonId, name, initials: initials.toUpperCase(), phone, location, status: 'ACTIVE',
      ownerUid, ownerName, ownerPhone: normOwnerPhone, ownerEmail, providerCount: 0,
      createdAt: now, updatedAt: now, createdBy: request.auth!.uid,
    }),
    db.collection('users').doc(ownerUid).set({
      uid: ownerUid, name: ownerName, email: ownerEmail, phone: normOwnerPhone,
      role: 'SALON_OWNER', salonId, propertyId: null, status: 'ACTIVE',
      tempPasswordSet: true, createdBy: request.auth!.uid, createdAt: now, updatedAt: now,
    }),
  ])

  return { salonId, ownerUid, tempPassword }
})

// updateSalon — Super Admin updates salon info
export const updateSalon = onCall(async (request) => {
  assertSuperAdmin(request.auth)
  const { salonId, name, phone, location, status } = request.data as {
    salonId: string; name?: string; phone?: string; location?: string; status?: string
  }
  if (!salonId) throw new HttpsError('invalid-argument', 'salonId required.')
  const db = firestore()
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
  if (name)     updates.name     = name
  if (phone)    updates.phone    = phone
  if (location) updates.location = location
  if (status === 'ACTIVE' || status === 'INACTIVE') updates.status = status
  await db.collection('salons').doc(salonId).update(updates)
  return { ok: true }
})

// createSalonStaff — creates SALON_RECEPTIONIST or SALON_PROVIDER accounts
// Callable by: SUPER_ADMIN (any salon) or SALON_OWNER (own salon only)
export const createSalonStaff = onCall(async (request) => {
  const caller = request.auth
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required.')
  const callerRole = caller.token?.role as Role | undefined
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'SALON_OWNER') {
    throw new HttpsError('permission-denied', 'Only a Super Admin or Salon Owner may create salon staff.')
  }

  const { salonId, role, name, phone, email, password, idNumber, services } = request.data as {
    salonId: string; role: SalonRole; name: string; phone: string
    email?: string; password?: string; idNumber?: string; services?: string[]
  }

  const SALON_ROLES: SalonRole[] = ['SALON_RECEPTIONIST', 'SALON_PROVIDER']
  if (!SALON_ROLES.includes(role)) throw new HttpsError('invalid-argument', 'Invalid salon role.')
  if (!name || !phone || !salonId) throw new HttpsError('invalid-argument', 'name, phone, salonId required.')

  // SALON_OWNER can only manage their own salon
  if (callerRole === 'SALON_OWNER') {
    const ownerSalonId = caller.token?.salonId as string | undefined
    if (ownerSalonId !== salonId) throw new HttpsError('permission-denied', 'You can only manage your own salon.')
    if (role === 'SALON_OWNER') throw new HttpsError('permission-denied', 'Cannot create another owner.')
  }

  const normPhone = normalizeKenyanPhone(phone)
  if (!normPhone) throw new HttpsError('invalid-argument', 'Invalid phone number.')

  const db = firestore()
  const authAdmin = getAuth()

  // Verify salon exists
  const salonSnap = await db.collection('salons').doc(salonId).get()
  if (!salonSnap.exists) throw new HttpsError('not-found', 'Salon not found.')
  const salonData = salonSnap.data() as { initials: string; name: string; providerCount: number }

  // Derive email for Firebase Auth: use provided email or phone-based for providers
  const authEmail = email?.trim() || `${normPhone.replace(/\D/g, '')}@salonstaff.lango.app`
  const tempPassword = password && password.length >= 8 ? password : generateTempPassword()

  let uid: string
  try {
    const record = await authAdmin.createUser({
      email: authEmail, password: tempPassword, displayName: name, phoneNumber: normPhone,
    })
    uid = record.uid
  } catch (err: any) {
    if (err?.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Email already in use.')
    if (err?.code === 'auth/phone-number-already-exists') throw new HttpsError('already-exists', 'Phone already in use.')
    throw new HttpsError('internal', err?.message ?? 'Failed to create user.')
  }

  await authAdmin.setCustomUserClaims(uid, { role, salonId, propertyId: null })

  const now = FieldValue.serverTimestamp()
  let providerCode: string | null = null

  if (role === 'SALON_PROVIDER') {
    // Atomic counter for collision-safe provider code
    const salonRef = db.collection('salons').doc(salonId)
    await db.runTransaction(async tx => {
      const fresh = await tx.get(salonRef)
      const nextSeq = ((fresh.data()?.providerCount ?? 0) as number) + 1
      providerCode = generateProviderCode(salonData.initials, name, nextSeq)
      tx.update(salonRef, { providerCount: nextSeq, updatedAt: now })
      const providerRef = db.collection('salonProviders').doc(uid)
      tx.set(providerRef, {
        providerId: uid, salonId, providerCode, name, phone: normPhone,
        idNumber: idNumber?.trim() || null,
        services: Array.isArray(services) ? services : [],
        status: 'ACTIVE', uid,
        createdBy: caller.uid, createdAt: now, updatedAt: now,
      })
    })
  }

  await db.collection('users').doc(uid).set({
    uid, name, email: authEmail, phone: normPhone,
    role, salonId, propertyId: null, status: 'ACTIVE',
    tempPasswordSet: true, createdBy: caller.uid, createdAt: now, updatedAt: now,
    ...(idNumber?.trim() ? { idNumber: idNumber.trim() } : {}),
  })

  // Initialise default permissions based on role
  const defaultPerms = role === 'SALON_PROVIDER'
    ? {
        isActive: true,
        viewClientName: true, viewServiceHistory: true, viewAllergiesNotes: true,
        viewPhone: false, viewEmail: false, viewAddress: false,
        createClients: false, editClients: false, deleteClients: false,
        createBookings: false, editBookings: false, cancelBookings: false, completeBookings: true,
        viewPrices: false, viewPayments: false, viewRevenue: false, viewReports: false,
        manageStaff: false, manageProviders: false, manageBranches: false,
        manageServices: false, manageMarketing: false, deleteRecords: false,
        dataVisibility: 'OWN_CLIENTS',
      }
    : {
        isActive: true,
        viewClientName: true, viewServiceHistory: true, viewAllergiesNotes: false,
        viewPhone: true, viewEmail: false, viewAddress: false,
        createClients: true, editClients: true, deleteClients: false,
        createBookings: true, editBookings: true, cancelBookings: true, completeBookings: true,
        viewPrices: true, viewPayments: true, viewRevenue: false, viewReports: false,
        manageStaff: false, manageProviders: false, manageBranches: false,
        manageServices: false, manageMarketing: false, deleteRecords: false,
        dataVisibility: 'ALL_CLIENTS',
      }

  await db.collection('salonStaffPermissions').doc(uid).set({
    uid, salonId, staffName: name, role,
    ...defaultPerms,
    updatedAt: now, updatedBy: caller.uid, updatedByName: (caller.token?.name as string | undefined) ?? 'Owner',
  })

  return { uid, tempPassword, providerCode }
})

// deleteSalonStaff — removes a salon staff member (Super Admin or Salon Owner)
export const deleteSalonStaff = onCall(async (request) => {
  const caller = request.auth
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required.')
  const callerRole = caller.token?.role as Role | undefined
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'SALON_OWNER') {
    throw new HttpsError('permission-denied', 'Only a Super Admin or Salon Owner may delete salon staff.')
  }
  const { uid } = request.data as { uid: string }
  if (!uid) throw new HttpsError('invalid-argument', 'uid required.')

  const db = firestore()
  const snap = await db.collection('users').doc(uid).get()
  if (!snap.exists) throw new HttpsError('not-found', 'User not found.')
  const target = snap.data() as { role: Role; salonId?: string | null; name?: string }

  if (callerRole === 'SALON_OWNER') {
    const ownerSalonId = caller.token?.salonId as string | undefined
    if (ownerSalonId !== target.salonId) throw new HttpsError('permission-denied', 'That user belongs to another salon.')
    if (target.role === 'SALON_OWNER') throw new HttpsError('permission-denied', 'Cannot delete another owner.')
  }

  try { await getAuth().deleteUser(uid) } catch (e: any) {
    if (e?.code !== 'auth/user-not-found') throw e
  }
  await db.collection('users').doc(uid).delete()
  // If provider, also delete provider record
  if (target.role === 'SALON_PROVIDER') {
    await db.collection('salonProviders').doc(uid).delete().catch(() => {})
  }
  return { ok: true }
})

// resetSalonStaffPassword — owner or super admin resets a staff member's password
export const resetSalonStaffPassword = onCall(async (request) => {
  const caller = request.auth
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required.')
  const callerRole = caller.token?.role as Role | undefined
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'SALON_OWNER') {
    throw new HttpsError('permission-denied', 'Only a Super Admin or Salon Owner may reset passwords.')
  }
  const { uid } = request.data as { uid: string }
  if (!uid) throw new HttpsError('invalid-argument', 'uid required.')

  const db = firestore()
  const snap = await db.collection('users').doc(uid).get()
  if (!snap.exists) throw new HttpsError('not-found', 'User not found.')
  const target = snap.data() as { salonId?: string | null }

  if (callerRole === 'SALON_OWNER') {
    const ownerSalonId = caller.token?.salonId as string | undefined
    if (ownerSalonId !== target.salonId) throw new HttpsError('permission-denied', 'That user belongs to another salon.')
  }

  const newPassword = generateTempPassword()
  await getAuth().updateUser(uid, { password: newPassword })
  await db.collection('users').doc(uid).update({ tempPasswordSet: true, updatedAt: FieldValue.serverTimestamp() })
  return { tempPassword: newPassword }
})

// setSalonStaffPermissions — owner sets granular per-person permissions + writes audit trail
export const setSalonStaffPermissions = onCall(async (request) => {
  const caller = request.auth
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required.')
  const callerRole = caller.token?.role as Role | undefined
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'SALON_OWNER') {
    throw new HttpsError('permission-denied', 'Only a Super Admin or Salon Owner may configure staff permissions.')
  }

  const { targetUid, permissions } = request.data as {
    targetUid: string
    permissions: Record<string, boolean | string>
  }
  if (!targetUid || !permissions) {
    throw new HttpsError('invalid-argument', 'targetUid and permissions are required.')
  }

  const db = firestore()

  // Fetch target staff to verify salon membership
  const targetSnap = await db.collection('users').doc(targetUid).get()
  if (!targetSnap.exists) throw new HttpsError('not-found', 'Staff member not found.')
  const target = targetSnap.data() as { salonId?: string | null; name?: string; role?: Role }

  if (callerRole === 'SALON_OWNER') {
    const ownerSalonId = caller.token?.salonId as string | undefined
    if (ownerSalonId !== target.salonId) {
      throw new HttpsError('permission-denied', 'That staff member belongs to another salon.')
    }
    if (target.role === 'SALON_OWNER') {
      throw new HttpsError('permission-denied', 'Cannot modify owner permissions via this function.')
    }
  }

  const salonId = target.salonId as string
  const now = FieldValue.serverTimestamp()

  // Read previous permissions for audit log
  const prevSnap = await db.collection('salonStaffPermissions').doc(targetUid).get()
  const prevPerms = prevSnap.exists ? prevSnap.data() : {}

  const callerName = (caller.token?.name as string | undefined) ?? 'Owner'

  const batch = db.batch()

  batch.set(db.collection('salonStaffPermissions').doc(targetUid), {
    uid: targetUid,
    salonId,
    staffName: target.name ?? '',
    role: target.role ?? 'SALON_PROVIDER',
    ...permissions,
    updatedAt: now,
    updatedBy: caller.uid,
    updatedByName: callerName,
  }, { merge: true })

  const auditRef = db.collection('salonPermissionAudit').doc()
  batch.set(auditRef, {
    logId: auditRef.id,
    salonId,
    staffId: targetUid,
    staffName: target.name ?? '',
    changedBy: caller.uid,
    changedByName: callerName,
    previousPermissions: prevPerms,
    newPermissions: { ...permissions },
    timestamp: now,
  })

  await batch.commit()
  return { ok: true }
})

// updateSalonProviderServices — owner updates which services a provider can perform
export const updateSalonProviderServices = onCall(async (request) => {
  const caller = request.auth
  if (!caller) throw new HttpsError('unauthenticated', 'Sign in required.')
  const callerRole = caller.token?.role as Role | undefined
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'SALON_OWNER') {
    throw new HttpsError('permission-denied', 'Only a Super Admin or Salon Owner may update providers.')
  }
  const { uid, services, status } = request.data as { uid: string; services?: string[]; status?: string }
  if (!uid) throw new HttpsError('invalid-argument', 'uid required.')

  const db = firestore()
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
  if (Array.isArray(services)) updates.services = services
  if (status === 'ACTIVE' || status === 'INACTIVE') updates.status = status
  await db.collection('salonProviders').doc(uid).update(updates)
  return { ok: true }
})

// Notify Super Admin whenever a new consultation lead is submitted from the landing page.
// Writes an adminAlert document that the admin UI listens to in real-time.
// `database: 'default'` is required because this project uses a named DB, not `(default)`.
export const onLeadCreated = onDocumentCreated({ document: 'leads/{leadId}', database: 'default' }, async (event) => {
  const snap = event.data
  if (!snap) return
  const lead = snap.data() as {
    name: string; phone: string; propertyType: string; propertyName?: string; email?: string
  }
  const db = firestore()
  await db.collection('adminAlerts').add({
    type: 'NEW_LEAD',
    leadId: event.params.leadId,
    name: lead.name,
    phone: lead.phone,
    propertyType: lead.propertyType,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  })
  console.log(`adminAlert created for lead ${event.params.leadId} — ${lead.name}`)
})

// ── Infobip SMS 2FA ──────────────────────────────────────────────────────────

function infobipHeaders(apiKey: string) {
  return {
    'Authorization': `App ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

/**
 * Send a 4-digit OTP to a phone number via Infobip 2FA.
 * Binds pinId → normalizedPhone in Firestore so signInWithPhoneOtp can
 * look up the phone server-side rather than trusting the client-supplied value.
 */
export const sendSmsOtp = onCall(
  { secrets: [INFOBIP_API_KEY] },
  async (req) => {
    const rawPhone = req.data?.phone
    if (typeof rawPhone !== 'string') {
      throw new HttpsError('invalid-argument', 'A valid phone number is required.')
    }
    const normPhone = normalizeKenyanPhone(rawPhone)
    if (!normPhone) throw new HttpsError('invalid-argument', 'Invalid Kenyan phone number.')

    const baseUrl    = process.env.INFOBIP_BASE_URL
    const appId      = process.env.INFOBIP_APP_ID
    const messageId  = process.env.INFOBIP_MESSAGE_ID
    const from       = process.env.INFOBIP_FROM
    const apiKey     = INFOBIP_API_KEY.value()

    if (!baseUrl || !appId || !messageId || !from) {
      console.error('Infobip env vars not configured', { baseUrl, appId, messageId, from })
      throw new HttpsError('internal', 'SMS service not configured.')
    }

    const res = await fetch(`${baseUrl}/2fa/2/pin`, {
      method: 'POST',
      headers: infobipHeaders(apiKey),
      body: JSON.stringify({ applicationId: appId, messageId, from, to: normPhone }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('Infobip sendPin failed', res.status, body)
      throw new HttpsError('internal', 'Failed to send verification code.')
    }

    const data = await res.json() as { pinId: string }

    // Bind pinId → phone server-side; prevents a caller from supplying a different
    // phone in signInWithPhoneOtp to hijack another account.
    const db = firestore()
    await db.collection('otpSessions').doc(data.pinId).set({
      phone: normPhone,
      used: false,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
    })

    return { pinId: data.pinId }
  }
)

/**
 * Verify the OTP the user typed against Infobip.
 * Returns { verified: true } on success.
 */
export const verifySmsOtp = onCall(
  { secrets: [INFOBIP_API_KEY] },
  async (req) => {
    const { pinId, pin } = req.data ?? {}
    if (typeof pinId !== 'string' || typeof pin !== 'string') {
      throw new HttpsError('invalid-argument', 'pinId and pin are required.')
    }

    const baseUrl = process.env.INFOBIP_BASE_URL
    const apiKey  = INFOBIP_API_KEY.value()

    if (!baseUrl) throw new HttpsError('internal', 'SMS service not configured.')

    const res = await fetch(`${baseUrl}/2fa/2/pin/${encodeURIComponent(pinId)}/verify`, {
      method: 'POST',
      headers: infobipHeaders(apiKey),
      body: JSON.stringify({ pin }),
    })

    const data = await res.json() as { verified?: boolean; pinError?: string }

    if (!res.ok || !data.verified) {
      console.warn('OTP verification failed', { pinId, pinError: data.pinError })
      return { verified: false, reason: data.pinError ?? 'WRONG_PIN' }
    }

    return { verified: true }
  }
)

/**
 * signInWithPhoneOtp — verify OTP with Infobip and mint a Firebase custom token.
 * The client signs into Firebase with signInWithCustomToken(customToken).
 *
 * Security: the phone number is read from the Firestore otpSessions document
 * that was written by sendSmsOtp. The client never supplies the phone here —
 * this prevents a caller from presenting a valid pinId for their own number
 * while claiming a different phone to obtain another account's custom token.
 */
export const signInWithPhoneOtp = onCall(
  { secrets: [INFOBIP_API_KEY] },
  async (req) => {
    const { pinId, pin } = req.data ?? {}
    if (typeof pinId !== 'string' || typeof pin !== 'string') {
      throw new HttpsError('invalid-argument', 'pinId and pin are required.')
    }

    const db = firestore()

    // Atomically read, validate, and consume the OTP session
    const sessionRef = db.collection('otpSessions').doc(pinId)
    let sessionPhone: string

    await db.runTransaction(async tx => {
      const sessionSnap = await tx.get(sessionRef)
      if (!sessionSnap.exists) throw new HttpsError('not-found', 'Verification session not found.')

      const session = sessionSnap.data() as { phone: string; used: boolean; expiresAt: Timestamp }
      if (session.used) throw new HttpsError('unauthenticated', 'Verification code has already been used.')
      if (session.expiresAt.toMillis() < Date.now()) {
        throw new HttpsError('unauthenticated', 'Verification code has expired. Please request a new one.')
      }

      sessionPhone = session.phone
      tx.update(sessionRef, { used: true })
    })

    const baseUrl = process.env.INFOBIP_BASE_URL
    const apiKey  = INFOBIP_API_KEY.value()
    if (!baseUrl) throw new HttpsError('internal', 'SMS service not configured.')

    // Verify OTP with Infobip using the server-stored phone
    const verifyRes = await fetch(`${baseUrl}/2fa/2/pin/${encodeURIComponent(pinId)}/verify`, {
      method: 'POST',
      headers: infobipHeaders(apiKey),
      body: JSON.stringify({ pin }),
    })
    const verifyData = await verifyRes.json() as { verified?: boolean; pinError?: string }
    if (!verifyRes.ok || !verifyData.verified) {
      // Undo consume so the user can retry with a new OTP request
      await sessionRef.update({ used: false })
      console.warn('signInWithPhoneOtp: OTP not verified', { pinId, pinError: verifyData.pinError })
      throw new HttpsError('unauthenticated', 'Incorrect or expired verification code.')
    }

    // Resolve the server-stored phone → Firebase user
    const snap = await db.collection('users').where('phone', '==', sessionPhone!).limit(1).get()
    if (snap.empty) throw new HttpsError('not-found', 'No Lango account found for that phone number.')

    const uid = snap.docs[0].id
    const customToken = await getAuth().createCustomToken(uid)
    return { customToken }
  }
)

/**
 * onVisitorCreated — when a visitor is logged, SMS the tenant for approval.
 * Skips if the visitor has no tenantId (walk-ins, deliveries, etc.).
 */
export const onVisitorCreated = onDocumentCreated(
  { document: 'visitors/{visitorId}', database: 'default', secrets: [INFOBIP_API_KEY] },
  async (event) => {
    const snap = event.data
    if (!snap) return

    const visitor = snap.data() as {
      tenantId?: string
      tenantName?: string
      visitorName?: string
      name?: string
      unitName?: string
      unitNumber?: string
      propertyId?: string
      notificationSent?: boolean
    }

    if (!visitor.tenantId) return

    const db = firestore()

    // Look up tenant's phone number
    const tenantSnap = await db.collection('tenants').doc(visitor.tenantId).get()
    if (!tenantSnap.exists) {
      console.warn(`onVisitorCreated: tenant ${visitor.tenantId} not found`)
      return
    }
    const tenantData = tenantSnap.data() as { phoneNumber?: string; fullName?: string }
    if (!tenantData.phoneNumber) {
      console.warn(`onVisitorCreated: tenant ${visitor.tenantId} has no phoneNumber`)
      return
    }

    const normTenantPhone = normalizeKenyanPhone(tenantData.phoneNumber)
    if (!normTenantPhone) {
      console.warn(`onVisitorCreated: tenant ${visitor.tenantId} has invalid phoneNumber: ${tenantData.phoneNumber}`)
      return
    }

    const baseUrl = process.env.INFOBIP_BASE_URL
    const from    = process.env.INFOBIP_FROM
    const apiKey  = INFOBIP_API_KEY.value()

    if (!baseUrl || !from) {
      console.error('onVisitorCreated: Infobip env vars not configured')
      return
    }

    const guestName = visitor.visitorName ?? visitor.name ?? 'A visitor'
    const unit      = visitor.unitName ?? visitor.unitNumber ?? 'your unit'
    const message   = `LANGO: ${guestName} is at the gate for ${unit}. Reply YES to allow entry or NO to deny.`

    try {
      const smsRes = await fetch(`${baseUrl}/sms/2/text/advanced`, {
        method: 'POST',
        headers: infobipHeaders(apiKey),
        body: JSON.stringify({
          messages: [{
            from,
            destinations: [{ to: normTenantPhone }],
            text: message,
          }],
        }),
      })

      if (!smsRes.ok) {
        const body = await smsRes.text()
        console.error('onVisitorCreated: SMS send failed', smsRes.status, body)
        return
      }

      await snap.ref.update({
        tenantPhone: normTenantPhone,
        smsNotifiedAt: FieldValue.serverTimestamp(),
        notificationSent: true,
        tenantApproval: null,  // explicit null so the inbound webhook query matches
      })
      console.log(`onVisitorCreated: SMS sent to ${normTenantPhone} for visitor ${event.params.visitorId}`)
    } catch (err) {
      console.error('onVisitorCreated: unexpected error', err)
    }
  }
)

/**
 * smsInboundWebhook — Infobip posts here when a tenant replies YES/NO.
 * Configure this URL in the Infobip portal as the inbound webhook endpoint.
 * Set a custom "Authorization: Bearer <INFOBIP_WEBHOOK_SECRET>" header in
 * the Infobip portal → Forward SMS → HTTP Forwarding → Custom Headers.
 */
export const smsInboundWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed')
    return
  }

  // Verify Basic auth — Infobip sends Authorization: Basic base64(username:password)
  // Set username=lango, password=<INFOBIP_WEBHOOK_SECRET> in the Infobip portal
  const webhookSecret = process.env.INFOBIP_WEBHOOK_SECRET
  if (webhookSecret) {
    const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
    let authenticated = false
    if (authHeader.startsWith('Basic ')) {
      try {
        const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8')
        const colonIdx = decoded.indexOf(':')
        const password = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : ''
        authenticated = secretsMatch(password, webhookSecret)
      } catch { authenticated = false }
    }
    if (!authenticated) {
      console.warn('smsInboundWebhook: unauthorized request rejected')
      res.status(401).send('Unauthorized')
      return
    }
  } else {
    console.warn('smsInboundWebhook: INFOBIP_WEBHOOK_SECRET not set — running unauthenticated')
  }

  type InfobipInboundResult = { from: string; text: string; receivedAt: string }
  const results: InfobipInboundResult[] = req.body?.results ?? []

  if (!Array.isArray(results) || results.length === 0) {
    res.status(200).send('ok')
    return
  }

  const db = firestore()

  for (const msg of results) {
    const rawFrom = typeof msg.from === 'string' ? msg.from.trim() : ''
    const text    = typeof msg.text === 'string' ? msg.text.trim().toUpperCase() : ''

    if (!rawFrom) continue
    const from = normalizeKenyanPhone(rawFrom) ?? rawFrom

    let approval: 'APPROVED' | 'DENIED' | null = null
    if (text === 'YES' || text.startsWith('YES ')) approval = 'APPROVED'
    else if (text === 'NO' || text.startsWith('NO ')) approval = 'DENIED'

    if (!approval) {
      console.log(`smsInboundWebhook: unrecognised reply "${msg.text}" from ${from}`)
      continue
    }

    // Find the most-recent pending visitor notification for this phone
    const visitorSnap = await db
      .collection('visitors')
      .where('tenantPhone', '==', from)
      .where('tenantApproval', '==', null)
      .orderBy('smsNotifiedAt', 'desc')
      .limit(1)
      .get()

    if (visitorSnap.empty) {
      console.log(`smsInboundWebhook: no pending visitor found for ${from}`)
      continue
    }

    const visitorRef = visitorSnap.docs[0].ref
    const visitorData = visitorSnap.docs[0].data() as { visitorName?: string; name?: string; propertyId?: string }

    await visitorRef.update({
      tenantApproval: approval,
      tenantApprovalAt: FieldValue.serverTimestamp(),
    })

    // Create a guard-facing alert so the kiosk/app notifies the guard
    await db.collection('adminAlerts').add({
      type: 'VISITOR_APPROVAL',
      visitorId: visitorRef.id,
      visitorName: visitorData.visitorName ?? visitorData.name ?? 'Visitor',
      approval,
      propertyId: visitorData.propertyId ?? null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    })

    console.log(`smsInboundWebhook: ${from} replied ${approval} for visitor ${visitorRef.id}`)
  }

  res.status(200).send('ok')
})

// B6 — Auto-suspend TRIAL properties whose trialEndDate has passed
export const scheduledAutoSuspend = onSchedule('every 24 hours', async () => {
  const db   = firestore()
  const now  = Timestamp.now()
  const snap = await db
    .collection('properties')
    .where('status', '==', 'TRIAL')
    .where('trialEndDate', '<=', now)
    .get()

  if (snap.empty) return

  const batch = db.batch()
  snap.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
    batch.update(d.ref, { status: 'SUSPENDED', updatedAt: FieldValue.serverTimestamp() })
  })
  await batch.commit()
  console.log(`Auto-suspended ${snap.size} trial properties.`)
})
