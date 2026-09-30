import { randomInt, timingSafeEqual } from 'node:crypto'
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https'
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
