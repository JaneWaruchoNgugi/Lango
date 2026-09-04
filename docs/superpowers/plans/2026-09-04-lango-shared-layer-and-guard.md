# Shared Domain Layer + Guard Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Lango's shared Firestore domain layer (services + hooks) and the complete Security Guard experience — Register-a-Guest, Currently Inside, Deliveries, Incidents, My Shift — so a guard's registration flows in real time to every role.

**Architecture:** Extract all Firestore access into typed `src/services/*` (mutations + audit) and `src/hooks/*` (realtime `onSnapshot` reads). Components consume hooks/services only; they never call Firestore directly and never trust a client-supplied `propertyId` — scoping always comes from the claim-backed `AuthContext`. DELIVERY registrations write to `deliveries`; the other three visit types write to `visitors`. Security is enforced by `firestore.rules`/`storage.rules`; the emulator suite proves the boundaries.

**Tech Stack:** React 19 + Vite + TypeScript (strict) + Tailwind, Firebase (Firestore/Auth/Storage), react-hook-form + zod, date-fns, lucide-react, react-hot-toast, vitest, `@firebase/rules-unit-testing`.

**Conventions in this codebase (follow exactly):**
- CSS utility classes exist in `src/index.css`: `btn-primary`, `btn-secondary`, `btn-ghost`, `card`, `input`, `label`, `form-error`, `page-title`, `page-subtitle`, `section-title`, `badge`, `badge-{green,red,yellow,gray,blue,orange}`.
- Brand colors: `lango-primary` `#0f4c35`, `lango-secondary` `#1a6b4a`, `lango-accent` `#22c55e`, `lango-light` `#f0fdf4`.
- Typed collection refs live in `src/firebase/collections.ts`. Firestore db is `db` from `src/firebase/config.ts` (named database `default`).
- `useAuth()` returns `{ user }` where `user.propertyId`, `user.uid`, `user.profile?.name` come from server claims.
- Timestamps: write `serverTimestamp()`, read `.toDate()`.

---

## Task 1: Branch + visit-taxonomy migration

**Files:**
- Modify: `src/types/index.ts` (lines 28, 204–231, 476–486)
- Modify: `src/components/ui/StatusBadge.tsx:63-73`
- Modify: `src/services/NotificationService.ts:54`
- Modify: `src/pages/admin/PropertyDetailPage.tsx:293`
- Modify: `src/pages/gate/RegisterVisitorPage.tsx:14,25,42-48,65` (stopgap so it compiles; replaced in Task 12)

- [ ] **Step 1: Create the working branch**

Run:
```bash
cd /home/jane-ngugi/Documents/Lango && git checkout -b feat/guard-experience
```
Expected: `Switched to a new branch 'feat/guard-experience'`

- [ ] **Step 2: Replace `VisitorType` with `VisitType` in types**

In `src/types/index.ts`, replace line 28:
```ts
export type VisitType = 'FRIENDLY_VISIT' | 'WORK' | 'DELIVERY' | 'SERVICE_PROVIDER'
```

- [ ] **Step 3: Extend the `Visitor` interface with conditional fields**

In `src/types/index.ts`, replace the `Visitor` interface body's `visitType` line and add fields (within the interface, after `visitType`):
```ts
  visitType: VisitType
  reason: string
  // Conditional, populated only when relevant to the visit type:
  company?: string              // WORK / SERVICE_PROVIDER employer
  workType?: string             // Plumbing, Electrical, Construction…
  workDescription?: string
  serviceType?: string          // REQUIRED for SERVICE_PROVIDER (e.g. "Internet Installation")
  serviceDescription?: string
  expectedDurationMins?: number
  registeredBy: string          // authed guard uid — asserted by rules
  registeredByRole: 'SECURITY_GUARD'
```
(Keep the existing `guardId`, `guardName`, `status`, timestamps, `notificationSent`, `notes` fields as they are.)

- [ ] **Step 4: Add `registeredBy` to `Delivery` and update form types**

In `src/types/index.ts`, inside `Delivery` add after `guardName`:
```ts
  registeredBy: string
```
Replace `RegisterVisitorForm.visitType` type usage (line ~481) `visitType: VisitorType` → `visitType: VisitType`.

- [ ] **Step 5: Migrate the badge component**

In `src/components/ui/StatusBadge.tsx`, replace the import `VisitorType` (line 6) with `VisitType`, and replace `VisitorTypeBadge` (lines 63-73) with:
```tsx
export function VisitTypeBadge({ type }: { type: VisitType }) {
  const map: Record<VisitType, { variant: BadgeVariant; label: string }> = {
    FRIENDLY_VISIT:   { variant: 'blue',   label: 'Friendly Visit' },
    WORK:             { variant: 'yellow', label: 'Work' },
    DELIVERY:         { variant: 'orange', label: 'Delivery' },
    SERVICE_PROVIDER: { variant: 'green',  label: 'Service Provider' },
  }
  const { variant, label } = map[type]
  return <Badge variant={variant} label={label} />
}
```

- [ ] **Step 6: Fix the two remaining consumers**

In `src/pages/admin/PropertyDetailPage.tsx:293`, the raw `{v.visitType}` render stays valid (string), no change needed unless it imported `VisitorTypeBadge` — if it does, rename to `VisitTypeBadge`. In `src/services/NotificationService.ts` the `d.visitType` string interpolation stays valid; no type import to change.

- [ ] **Step 7: Stopgap-fix the old RegisterVisitorPage so build passes**

In `src/pages/gate/RegisterVisitorPage.tsx`: change import (line 14) `VisitorType` → `VisitType`; change zod enum (line 25) to `z.enum(['FRIENDLY_VISIT','WORK','DELIVERY','SERVICE_PROVIDER'])`; replace `VISIT_TYPES` (lines 42-48) with:
```ts
const VISIT_TYPES: { value: VisitType; label: string; emoji: string }[] = [
  { value: 'FRIENDLY_VISIT',   label: 'Friendly Visit',   emoji: '👤' },
  { value: 'WORK',             label: 'Work',             emoji: '🔧' },
  { value: 'DELIVERY',         label: 'Delivery',         emoji: '📦' },
  { value: 'SERVICE_PROVIDER', label: 'Service Provider', emoji: '🛠️' },
]
```
Change the default (line 65) `visitType: 'VISITOR'` → `visitType: 'FRIENDLY_VISIT'`. Add `registeredBy: guardId, registeredByRole: 'SECURITY_GUARD'` to the `addDoc` payload (near line 119).

- [ ] **Step 8: Typecheck**

Run: `npm run build`
Expected: PASS (tsc + vite) with zero errors.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "refactor(types): migrate VisitorType→VisitType, add conditional visit fields"
```

---

## Task 2: Visit-type domain constants

**Files:**
- Create: `src/domain/visitTypes.ts`

- [ ] **Step 1: Create the constants module**

```ts
import type { VisitType } from '../types'

export const VISIT_TYPE_OPTIONS: { value: VisitType; label: string; emoji: string; hint: string }[] = [
  { value: 'FRIENDLY_VISIT',   label: 'Friendly Visit',   emoji: '👤', hint: 'Visiting a tenant personally' },
  { value: 'WORK',             label: 'Work',             emoji: '🔧', hint: 'Construction, maintenance, repair or other work' },
  { value: 'DELIVERY',         label: 'Delivery',         emoji: '📦', hint: 'Food, parcel, courier or other delivery' },
  { value: 'SERVICE_PROVIDER', label: 'Service Provider', emoji: '🛠️', hint: 'Professional service being provided' },
]

export const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  FRIENDLY_VISIT: 'Friendly Visit',
  WORK: 'Work',
  DELIVERY: 'Delivery',
  SERVICE_PROVIDER: 'Service Provider',
}

export const WORK_TYPES = [
  'Plumbing', 'Electrical', 'Construction', 'Painting', 'Repair', 'Installation', 'Other',
] as const

export const SERVICE_TYPES = [
  'Plumbing', 'Electrical repair', 'Internet installation', 'Cleaning', 'Pest control',
  'Air conditioning', 'Appliance repair', 'Moving service', 'Security system installation', 'Other',
] as const

export const DELIVERY_KINDS = [
  'Food', 'Parcel', 'Groceries', 'Documents', 'Courier', 'Other',
] as const
```

- [ ] **Step 2: Commit**

```bash
git add src/domain/visitTypes.ts && git commit -m "feat(domain): visit-type constants (labels, work/service/delivery kinds)"
```

---

## Task 3: Register-a-Guest validation schemas (TDD, pure)

**Files:**
- Create: `src/domain/registerSchemas.ts`
- Test: `src/domain/registerSchemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { registerGuestSchema } from './registerSchemas'

const base = {
  visitorName: 'John Mwangi', phone: '0712345678', idNumber: '12345678',
  nationality: 'Kenyan', blockId: 'b1', unitId: 'u1',
}

describe('registerGuestSchema', () => {
  it('accepts a valid friendly visit', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'FRIENDLY_VISIT', reason: 'Family' })
    expect(r.success).toBe(true)
  })

  it('rejects a service provider with no serviceType', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'SERVICE_PROVIDER', serviceType: '' })
    expect(r.success).toBe(false)
  })

  it('accepts a service provider with a serviceType', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'SERVICE_PROVIDER', serviceType: 'Internet installation' })
    expect(r.success).toBe(true)
  })

  it('rejects work with no workType/description', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'WORK', workType: '', workDescription: '' })
    expect(r.success).toBe(false)
  })

  it('requires a unit for every type', () => {
    const r = registerGuestSchema.safeParse({ ...base, unitId: '', visitType: 'FRIENDLY_VISIT' })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/registerSchemas.test.ts`
Expected: FAIL — `Cannot find module './registerSchemas'`.

- [ ] **Step 3: Implement the schema**

```ts
import { z } from 'zod'

const guest = {
  visitorName: z.string().min(2, 'Name is required'),
  phone: z.string().min(9, 'Phone is required'),
  idNumber: z.string().optional().or(z.literal('')),
  nationality: z.string().optional().or(z.literal('')),
  blockId: z.string().min(1, 'Select a block'),
  unitId: z.string().min(1, 'Select a unit'),
  notes: z.string().optional(),
}

const friendly = z.object({
  ...guest, visitType: z.literal('FRIENDLY_VISIT'), reason: z.string().optional(),
})
const work = z.object({
  ...guest, visitType: z.literal('WORK'),
  company: z.string().optional(),
  workType: z.string().min(2, 'Type of work is required'),
  workDescription: z.string().min(2, 'Describe the work'),
  expectedDurationMins: z.coerce.number().int().positive().optional(),
})
const delivery = z.object({
  ...guest, visitType: z.literal('DELIVERY'),
  company: z.string().min(1, 'Delivery company is required'),
  packageDescription: z.string().optional(),
  riderName: z.string().optional(), // defaults to visitorName in service
})
const service = z.object({
  ...guest, visitType: z.literal('SERVICE_PROVIDER'),
  serviceType: z.string().min(2, 'The service you are here to provide is required'),
  serviceDescription: z.string().optional(),
  company: z.string().optional(),
  expectedDurationMins: z.coerce.number().int().positive().optional(),
})

export const registerGuestSchema = z.discriminatedUnion('visitType', [friendly, work, delivery, service])
export type RegisterGuestInput = z.infer<typeof registerGuestSchema>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/registerSchemas.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/registerSchemas.ts src/domain/registerSchemas.test.ts
git commit -m "feat(domain): register-a-guest zod schema with per-type required fields"
```

---

## Task 4: Formatting helpers (TDD, pure)

**Files:**
- Create: `src/utils/format.ts`
- Test: `src/utils/format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { formatDuration, durationMinutes } from './format'

describe('formatDuration', () => {
  it('formats sub-hour', () => { expect(formatDuration(32)).toBe('32m') })
  it('formats hours+minutes', () => { expect(formatDuration(95)).toBe('1h 35m') })
  it('handles zero', () => { expect(formatDuration(0)).toBe('0m') })
})

describe('durationMinutes', () => {
  it('computes whole minutes between two dates', () => {
    const a = new Date('2026-09-04T10:00:00Z')
    const b = new Date('2026-09-04T10:32:40Z')
    expect(durationMinutes(a, b)).toBe(33)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/format.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export function durationMinutes(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60000)
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/format.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/format.ts src/utils/format.test.ts
git commit -m "feat(utils): duration formatting helpers"
```

---

## Task 5: Collection refs + audit & notification services

**Files:**
- Modify: `src/firebase/collections.ts` (add `notificationDoc`, `preApprovedDoc`)
- Create: `src/services/auditService.ts`
- Modify: `src/services/NotificationService.ts`

- [ ] **Step 1: Add doc helpers**

In `src/firebase/collections.ts`, after `subscriptionDoc` add:
```ts
export const notificationDoc = (id: string): DocumentReference<Notification> => doc(notificationsCol, id)
export const preApprovedDoc  = (id: string): DocumentReference<PreApprovedVisitor> => doc(preApprovedCol, id)
```

- [ ] **Step 2: Create the audit service**

`src/services/auditService.ts`:
```ts
import { addDoc, serverTimestamp } from 'firebase/firestore'
import { auditLogsCol } from '../firebase/collections'
import type { AppUser, AuditAction } from '../types'

export interface AuditEntryInput {
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>
  propertyId: string | null
  action: AuditAction
  entityType: string
  entityId: string
  description: string
  metadata?: Record<string, unknown>
}

/** Single choke-point for audit writes (spec §33). Never throws into the caller's flow. */
export async function logAudit(entry: AuditEntryInput): Promise<void> {
  try {
    await addDoc(auditLogsCol, {
      actorId: entry.actor.uid,
      actorName: entry.actor.name,
      actorRole: entry.actor.role,
      propertyId: entry.propertyId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      description: entry.description,
      metadata: entry.metadata ?? {},
      timestamp: serverTimestamp(),
    } as never)
  } catch (err) {
    console.error('[audit] failed to write log', err)
  }
}
```

- [ ] **Step 3: Persist a notifications doc in NotificationService**

In `src/services/NotificationService.ts`, add at top:
```ts
import { addDoc, serverTimestamp } from 'firebase/firestore'
import { notificationsCol } from '../firebase/collections'
import type { NotificationType } from '../types'
```
Add an exported function (keep `sendMockWhatsApp` as-is and call it from here):
```ts
export async function sendVisitorNotification(params: {
  propertyId: string
  type: Extract<NotificationType, 'VISITOR_ALERT' | 'DELIVERY_ALERT'>
  recipientPhone: string
  recipientName: string
  relatedEntityId: string
  data: Record<string, string>
}): Promise<void> {
  const message = buildMessage({ to: params.recipientPhone, type: params.type === 'VISITOR_ALERT' ? 'VISITOR_ALERT' : 'DELIVERY_ALERT', data: params.data })
  await addDoc(notificationsCol, {
    propertyId: params.propertyId,
    type: params.type,
    recipientPhone: params.recipientPhone,
    recipientName: params.recipientName,
    message,
    status: 'MOCK',
    provider: 'MOCK',
    relatedEntityId: params.relatedEntityId,
    createdAt: serverTimestamp(),
  } as never)
  await sendMockWhatsApp({ to: params.recipientPhone, type: params.type, data: params.data })
}
```
Change `buildMessage`/`sendMockWhatsApp` `type` union to include only `'VISITOR_ALERT' | 'DELIVERY_ALERT' | 'INCIDENT_ALERT'` (already the case). Ensure `buildMessage` is exported or module-visible to `sendVisitorNotification`.

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/firebase/collections.ts src/services/auditService.ts src/services/NotificationService.ts
git commit -m "feat(services): audit choke-point + persisted notification records"
```

---

## Task 6: Visitor service

**Files:**
- Create: `src/services/visitorService.ts`

- [ ] **Step 1: Implement the service**

```ts
import {
  addDoc, updateDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp,
  type Unsubscribe, Timestamp,
} from 'firebase/firestore'
import { visitorsCol } from '../firebase/collections'
import { db } from '../firebase/config'
import { collection } from 'firebase/firestore'
import type { AppUser, Visitor, VisitType } from '../types'
import { logAudit } from './auditService'
import { durationMinutes } from '../utils/format'

export interface RegisterVisitorArgs {
  propertyId: string
  guard: Pick<AppUser, 'uid' | 'name' | 'role'>
  shiftId?: string
  visitType: Exclude<VisitType, 'DELIVERY'>
  visitorName: string
  phone: string
  idNumber?: string
  nationality?: string
  photoUrl?: string
  blockId: string; blockName: string
  unitId: string; unitNumber: string
  tenantId?: string; tenantName?: string
  reason?: string
  company?: string
  workType?: string; workDescription?: string
  serviceType?: string; serviceDescription?: string
  expectedDurationMins?: number
  notes?: string
}

/** Creates an INSIDE visitor. Scoping propertyId is passed from the claim-backed context, never a form. */
export async function registerVisitor(a: RegisterVisitorArgs): Promise<string> {
  const ref = await addDoc(visitorsCol, {
    visitorId: '',
    propertyId: a.propertyId,
    blockId: a.blockId, blockName: a.blockName,
    unitId: a.unitId, unitNumber: a.unitNumber,
    tenantId: a.tenantId ?? '', tenantName: a.tenantName ?? '',
    guardId: a.guard.uid, guardName: a.guard.name,
    registeredBy: a.guard.uid, registeredByRole: 'SECURITY_GUARD',
    shiftId: a.shiftId ?? '',
    visitorName: a.visitorName, idNumber: a.idNumber ?? '',
    nationality: a.nationality ?? '', phone: a.phone,
    photoUrl: a.photoUrl ?? '',
    visitType: a.visitType, reason: a.reason ?? '',
    company: a.company ?? '',
    workType: a.workType ?? '', workDescription: a.workDescription ?? '',
    serviceType: a.serviceType ?? '', serviceDescription: a.serviceDescription ?? '',
    expectedDurationMins: a.expectedDurationMins ?? null,
    status: 'INSIDE',
    checkInTime: serverTimestamp(), checkOutTime: null, durationMinutes: null,
    notificationSent: false, notes: a.notes ?? '',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as never)
  await updateDoc(ref, { visitorId: ref.id })
  await logAudit({
    actor: a.guard, propertyId: a.propertyId, action: 'VISITOR_REGISTERED',
    entityType: 'visitor', entityId: ref.id,
    description: `Registered ${a.visitorName} (${a.visitType}) for ${a.unitNumber}`,
  })
  return ref.id
}

export async function checkOutVisitor(visitor: Visitor, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  const mins = durationMinutes(visitor.checkInTime.toDate(), new Date())
  await updateDoc(doc(visitorsCol, visitor.visitorId), {
    status: 'CHECKED_OUT', checkOutTime: serverTimestamp(),
    durationMinutes: mins, updatedAt: serverTimestamp(),
  })
  await logAudit({
    actor, propertyId: visitor.propertyId, action: 'VISITOR_CHECKED_OUT',
    entityType: 'visitor', entityId: visitor.visitorId,
    description: `Checked out ${visitor.visitorName} after ${mins}m`,
  })
}

export function watchInside(propertyId: string, cb: (v: Visitor[]) => void, onErr: (e: Error) => void): Unsubscribe {
  const q = query(collection(db, 'visitors'),
    where('propertyId', '==', propertyId), where('status', '==', 'INSIDE'),
    orderBy('checkInTime', 'desc'))
  return onSnapshot(q, s => cb(s.docs.map(d => d.data() as Visitor)), onErr)
}

export function watchVisitorsSince(propertyId: string, since: Date, cb: (v: Visitor[]) => void, onErr: (e: Error) => void): Unsubscribe {
  const q = query(collection(db, 'visitors'),
    where('propertyId', '==', propertyId),
    where('checkInTime', '>=', Timestamp.fromDate(since)),
    orderBy('checkInTime', 'desc'))
  return onSnapshot(q, s => cb(s.docs.map(d => d.data() as Visitor)), onErr)
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: PASS. (Behavior is covered by the emulator tests in Task 15.)

- [ ] **Step 3: Commit**

```bash
git add src/services/visitorService.ts
git commit -m "feat(services): visitor register/checkout/watch"
```

---

## Task 7: Delivery, incident & shift services

**Files:**
- Create: `src/services/deliveryService.ts`
- Create: `src/services/incidentService.ts`
- Create: `src/services/shiftService.ts`

- [ ] **Step 1: Delivery service**

`src/services/deliveryService.ts`:
```ts
import {
  addDoc, updateDoc, doc, collection, query, where, orderBy, onSnapshot,
  serverTimestamp, type Unsubscribe,
} from 'firebase/firestore'
import { deliveriesCol } from '../firebase/collections'
import { db } from '../firebase/config'
import type { AppUser, Delivery, DeliveryStatus } from '../types'
import { logAudit } from './auditService'

export interface RegisterDeliveryArgs {
  propertyId: string
  guard: Pick<AppUser, 'uid' | 'name' | 'role'>
  shiftId?: string
  company: string
  riderName: string
  riderPhone: string
  riderIdNumber?: string
  blockId: string; blockName: string
  unitId: string; unitNumber: string
  tenantId?: string; tenantName?: string
  packageDescription?: string
  photoUrl?: string
  notes?: string
}

export async function registerDelivery(a: RegisterDeliveryArgs): Promise<string> {
  const ref = await addDoc(deliveriesCol, {
    deliveryId: '', propertyId: a.propertyId,
    blockId: a.blockId, blockName: a.blockName,
    unitId: a.unitId, unitNumber: a.unitNumber,
    tenantId: a.tenantId ?? '', tenantName: a.tenantName ?? '',
    guardId: a.guard.uid, guardName: a.guard.name, registeredBy: a.guard.uid,
    shiftId: a.shiftId ?? '',
    company: a.company, riderName: a.riderName, riderPhone: a.riderPhone,
    riderIdNumber: a.riderIdNumber ?? '',
    packageDescription: a.packageDescription ?? '', photoUrl: a.photoUrl ?? '',
    status: 'RECEIVED', receivedAt: serverTimestamp(), collectedAt: null,
    notificationSent: false, notes: a.notes ?? '',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as never)
  await updateDoc(ref, { deliveryId: ref.id })
  await logAudit({
    actor: a.guard, propertyId: a.propertyId, action: 'DELIVERY_REGISTERED',
    entityType: 'delivery', entityId: ref.id,
    description: `Registered ${a.company} delivery for ${a.unitNumber}`,
  })
  return ref.id
}

export async function markCollected(d: Delivery, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await updateDoc(doc(deliveriesCol, d.deliveryId), {
    status: 'COLLECTED', collectedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  await logAudit({
    actor, propertyId: d.propertyId, action: 'DELIVERY_COLLECTED',
    entityType: 'delivery', entityId: d.deliveryId,
    description: `${d.company} delivery for ${d.unitNumber} collected`,
  })
}

export function watchDeliveries(propertyId: string, cb: (d: Delivery[]) => void, onErr: (e: Error) => void, status?: DeliveryStatus): Unsubscribe {
  const base = [where('propertyId', '==', propertyId)]
  const q = status
    ? query(collection(db, 'deliveries'), ...base, where('status', '==', status), orderBy('receivedAt', 'desc'))
    : query(collection(db, 'deliveries'), ...base, orderBy('receivedAt', 'desc'))
  return onSnapshot(q, s => cb(s.docs.map(x => x.data() as Delivery)), onErr)
}
```

- [ ] **Step 2: Incident service**

`src/services/incidentService.ts`:
```ts
import {
  addDoc, updateDoc, doc, collection, query, where, orderBy, onSnapshot,
  serverTimestamp, type Unsubscribe,
} from 'firebase/firestore'
import { incidentsCol } from '../firebase/collections'
import { db } from '../firebase/config'
import type { AppUser, Incident, IncidentType, IncidentSeverity } from '../types'
import { logAudit } from './auditService'

export interface ReportIncidentArgs {
  propertyId: string
  guard: Pick<AppUser, 'uid' | 'name' | 'role'>
  type: IncidentType
  severity: IncidentSeverity
  description: string
  relatedVisitorId?: string
  relatedVisitorName?: string
  photoUrl?: string
}

export async function reportIncident(a: ReportIncidentArgs): Promise<string> {
  const ref = await addDoc(incidentsCol, {
    incidentId: '', propertyId: a.propertyId,
    guardId: a.guard.uid, guardName: a.guard.name,
    type: a.type, description: a.description, severity: a.severity,
    photoUrl: a.photoUrl ?? '',
    relatedVisitorId: a.relatedVisitorId ?? '', relatedVisitorName: a.relatedVisitorName ?? '',
    status: 'OPEN', reportedAt: serverTimestamp(),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as never)
  await updateDoc(ref, { incidentId: ref.id })
  await logAudit({
    actor: a.guard, propertyId: a.propertyId, action: 'INCIDENT_REPORTED',
    entityType: 'incident', entityId: ref.id,
    description: `${a.severity} incident: ${a.type}`,
  })
  return ref.id
}

export function watchIncidents(propertyId: string, cb: (i: Incident[]) => void, onErr: (e: Error) => void, status?: Incident['status']): Unsubscribe {
  const q = status
    ? query(collection(db, 'incidents'), where('propertyId', '==', propertyId), where('status', '==', status), orderBy('createdAt', 'desc'))
    : query(collection(db, 'incidents'), where('propertyId', '==', propertyId), orderBy('createdAt', 'desc'))
  return onSnapshot(q, s => cb(s.docs.map(d => d.data() as Incident)), onErr)
}
```

- [ ] **Step 3: Shift service**

`src/services/shiftService.ts`:
```ts
import {
  addDoc, updateDoc, doc, collection, query, where, getDocs, onSnapshot,
  serverTimestamp, increment, type Unsubscribe,
} from 'firebase/firestore'
import { shiftsCol } from '../firebase/collections'
import { db } from '../firebase/config'
import type { AppUser, Shift } from '../types'
import { logAudit } from './auditService'

export async function startShift(propertyId: string, guard: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<string> {
  const ref = await addDoc(shiftsCol, {
    shiftId: '', propertyId, guardId: guard.uid, guardName: guard.name,
    status: 'ACTIVE', startTime: serverTimestamp(), endTime: null,
    visitorsRegistered: 0, deliveriesRegistered: 0, incidentsReported: 0,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as never)
  await updateDoc(ref, { shiftId: ref.id })
  await logAudit({ actor: guard, propertyId, action: 'SHIFT_STARTED', entityType: 'shift', entityId: ref.id, description: 'Shift started' })
  return ref.id
}

export async function endShift(shift: Shift, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await updateDoc(doc(shiftsCol, shift.shiftId), { status: 'ENDED', endTime: serverTimestamp(), updatedAt: serverTimestamp() })
  await logAudit({ actor, propertyId: shift.propertyId, action: 'SHIFT_ENDED', entityType: 'shift', entityId: shift.shiftId, description: 'Shift ended' })
}

export async function getActiveShift(guardId: string): Promise<Shift | null> {
  const snap = await getDocs(query(collection(db, 'shifts'), where('guardId', '==', guardId), where('status', '==', 'ACTIVE')))
  return snap.empty ? null : (snap.docs[0].data() as Shift)
}

export function watchActiveShift(guardId: string, cb: (s: Shift | null) => void, onErr: (e: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'shifts'), where('guardId', '==', guardId), where('status', '==', 'ACTIVE')),
    s => cb(s.empty ? null : (s.docs[0].data() as Shift)), onErr)
}

export async function bumpShiftCounter(shiftId: string, field: 'visitorsRegistered' | 'deliveriesRegistered' | 'incidentsReported'): Promise<void> {
  if (!shiftId) return
  await updateDoc(doc(shiftsCol, shiftId), { [field]: increment(1), updatedAt: serverTimestamp() })
}
```

- [ ] **Step 4: Typecheck & commit**

Run: `npm run build` → PASS.
```bash
git add src/services/deliveryService.ts src/services/incidentService.ts src/services/shiftService.ts
git commit -m "feat(services): delivery, incident and shift services"
```

---

## Task 8: Tenant search, units/blocks, pre-approval & photo services

**Files:**
- Create: `src/services/tenantService.ts`
- Create: `src/services/unitService.ts`
- Create: `src/services/preApprovalService.ts`
- Create: `src/services/photoService.ts`

- [ ] **Step 1: Tenant service (client-side search across a property's tenants)**

`src/services/tenantService.ts`:
```ts
import { getDocs, query, where, orderBy } from 'firebase/firestore'
import { tenantsCol } from '../firebase/collections'
import type { Tenant } from '../types'

/** Loads ACTIVE tenants for a property once; the UI filters this list live. */
export async function loadActiveTenants(propertyId: string): Promise<Tenant[]> {
  const snap = await getDocs(query(tenantsCol,
    where('propertyId', '==', propertyId), where('status', '==', 'ACTIVE'), orderBy('fullName')))
  return snap.docs.map(d => d.data() as Tenant)
}

export function filterTenants(tenants: Tenant[], term: string): Tenant[] {
  const t = term.trim().toLowerCase()
  if (!t) return tenants
  return tenants.filter(x =>
    x.fullName.toLowerCase().includes(t) ||
    x.unitNumber.toLowerCase().includes(t) ||
    x.blockName.toLowerCase().includes(t) ||
    x.phoneNumber.includes(t) || (x.whatsappNumber ?? '').includes(t))
}
```

- [ ] **Step 2: Unit/block service**

`src/services/unitService.ts`:
```ts
import { getDocs, query, where, orderBy } from 'firebase/firestore'
import { blocksCol, unitsCol } from '../firebase/collections'
import type { Block, Unit } from '../types'

export async function listBlocks(propertyId: string): Promise<Block[]> {
  const snap = await getDocs(query(blocksCol, where('propertyId', '==', propertyId), orderBy('name')))
  return snap.docs.map(d => d.data() as Block)
}

export async function listUnits(propertyId: string, blockId?: string): Promise<Unit[]> {
  const q = blockId
    ? query(unitsCol, where('propertyId', '==', propertyId), where('blockId', '==', blockId), orderBy('unitNumber'))
    : query(unitsCol, where('propertyId', '==', propertyId), orderBy('unitNumber'))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Unit)
}
```

- [ ] **Step 3: Pre-approval service**

`src/services/preApprovalService.ts`:
```ts
import { getDocs, query, where } from 'firebase/firestore'
import { preApprovedCol } from '../firebase/collections'
import type { PreApprovedVisitor } from '../types'

export async function loadPreApproved(propertyId: string): Promise<PreApprovedVisitor[]> {
  const snap = await getDocs(query(preApprovedCol,
    where('propertyId', '==', propertyId), where('isActive', '==', true)))
  return snap.docs.map(d => d.data() as PreApprovedVisitor)
}

/** True if now (local) falls within the pre-approved access window. */
export function isAccessAllowedNow(p: PreApprovedVisitor, now = new Date()): boolean {
  if (!p.accessDays.includes(now.getDay())) return false
  const hhmm = now.toTimeString().slice(0, 5)
  return hhmm >= p.accessStart && hhmm <= p.accessEnd
}

export function matchPreApproved(list: PreApprovedVisitor[], term: string): PreApprovedVisitor[] {
  const t = term.trim().toLowerCase()
  if (!t) return []
  return list.filter(p => p.name.toLowerCase().includes(t) || p.unitNumber.toLowerCase().includes(t))
}
```

- [ ] **Step 4: Photo service (Firebase Storage)**

`src/services/photoService.ts`:
```ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'

/** Uploads under properties/{propertyId}/... so storage.rules can scope by claim. Returns the download URL. */
export async function uploadPhoto(propertyId: string, folder: 'visitors' | 'deliveries' | 'incidents', blob: Blob): Promise<string> {
  const name = `${folder}/${crypto.randomUUID()}.jpg`
  const objectRef = ref(storage, `properties/${propertyId}/${name}`)
  await uploadBytes(objectRef, blob, { contentType: blob.type || 'image/jpeg' })
  return getDownloadURL(objectRef)
}
```

- [ ] **Step 5: Add a pure test for pre-approval window logic**

Create `src/services/preApprovalService.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isAccessAllowedNow, matchPreApproved } from './preApprovalService'
import type { PreApprovedVisitor } from '../types'

const p = { name: 'Susan Akinyi', unitNumber: 'B14', accessDays: [1,2,3,4,5], accessStart: '07:00', accessEnd: '18:00' } as PreApprovedVisitor

describe('isAccessAllowedNow', () => {
  it('allows Wednesday 10:00', () => { expect(isAccessAllowedNow(p, new Date('2026-09-02T10:00:00'))).toBe(true) })
  it('blocks Sunday', () => { expect(isAccessAllowedNow(p, new Date('2026-09-06T10:00:00'))).toBe(false) })
  it('blocks 19:00', () => { expect(isAccessAllowedNow(p, new Date('2026-09-02T19:00:00'))).toBe(false) })
})
describe('matchPreApproved', () => {
  it('matches by name', () => { expect(matchPreApproved([p], 'susan')).toHaveLength(1) })
  it('empty term → none', () => { expect(matchPreApproved([p], '')).toHaveLength(0) })
})
```

- [ ] **Step 6: Run tests, typecheck, commit**

Run: `npx vitest run src/services/preApprovalService.test.ts` → PASS (5).
Run: `npm run build` → PASS.
```bash
git add src/services/tenantService.ts src/services/unitService.ts src/services/preApprovalService.ts src/services/preApprovalService.test.ts src/services/photoService.ts
git commit -m "feat(services): tenant search, units/blocks, pre-approval, photo upload"
```

---

## Task 9: Realtime hooks

**Files:**
- Create: `src/hooks/useCurrentVisitors.ts`
- Create: `src/hooks/useDeliveries.ts`
- Create: `src/hooks/useIncidents.ts`
- Create: `src/hooks/useShift.ts`
- Create: `src/hooks/useTenantSearch.ts`

- [ ] **Step 1: useCurrentVisitors**

`src/hooks/useCurrentVisitors.ts`:
```ts
import { useEffect, useState } from 'react'
import { watchInside } from '../services/visitorService'
import type { Visitor } from '../types'

export function useCurrentVisitors(propertyId: string | null | undefined) {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchInside(propertyId,
      v => { setVisitors(v); setLoading(false) },
      e => { setError(e); setLoading(false) })
    return unsub
  }, [propertyId])
  return { visitors, loading, error }
}
```

- [ ] **Step 2: useDeliveries**

`src/hooks/useDeliveries.ts`:
```ts
import { useEffect, useState } from 'react'
import { watchDeliveries } from '../services/deliveryService'
import type { Delivery, DeliveryStatus } from '../types'

export function useDeliveries(propertyId: string | null | undefined, status?: DeliveryStatus) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchDeliveries(propertyId,
      d => { setDeliveries(d); setLoading(false) },
      e => { setError(e); setLoading(false) }, status)
    return unsub
  }, [propertyId, status])
  return { deliveries, loading, error }
}
```

- [ ] **Step 3: useIncidents**

`src/hooks/useIncidents.ts`:
```ts
import { useEffect, useState } from 'react'
import { watchIncidents } from '../services/incidentService'
import type { Incident } from '../types'

export function useIncidents(propertyId: string | null | undefined, status?: Incident['status']) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchIncidents(propertyId,
      i => { setIncidents(i); setLoading(false) },
      e => { setError(e); setLoading(false) }, status)
    return unsub
  }, [propertyId, status])
  return { incidents, loading, error }
}
```

- [ ] **Step 4: useShift**

`src/hooks/useShift.ts`:
```ts
import { useEffect, useState } from 'react'
import { watchActiveShift } from '../services/shiftService'
import type { Shift } from '../types'

export function useShift(guardId: string | null | undefined) {
  const [shift, setShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!guardId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchActiveShift(guardId,
      s => { setShift(s); setLoading(false) },
      () => setLoading(false))
    return unsub
  }, [guardId])
  return { shift, loading }
}
```

- [ ] **Step 5: useTenantSearch**

`src/hooks/useTenantSearch.ts`:
```ts
import { useEffect, useMemo, useState } from 'react'
import { loadActiveTenants, filterTenants } from '../services/tenantService'
import { loadPreApproved, matchPreApproved } from '../services/preApprovalService'
import type { Tenant, PreApprovedVisitor } from '../types'

export function useTenantSearch(propertyId: string | null | undefined) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [preApproved, setPreApproved] = useState<PreApprovedVisitor[]>([])
  const [term, setTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    let active = true
    setLoading(true)
    Promise.all([loadActiveTenants(propertyId), loadPreApproved(propertyId)])
      .then(([t, p]) => { if (active) { setTenants(t); setPreApproved(p) } })
      .catch(err => console.error('[useTenantSearch]', err))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [propertyId])

  const results = useMemo(() => filterTenants(tenants, term), [tenants, term])
  const preApprovedMatches = useMemo(() => matchPreApproved(preApproved, term), [preApproved, term])
  return { term, setTerm, results, preApprovedMatches, loading }
}
```

- [ ] **Step 6: Typecheck & commit**

Run: `npm run build` → PASS.
```bash
git add src/hooks/
git commit -m "feat(hooks): realtime visitors/deliveries/incidents/shift + tenant search"
```

---

## Task 10: Refactor existing dashboards onto the shared layer (no behavior change)

**Files:**
- Modify: `src/pages/gate/GateDashboard.tsx`
- Modify: `src/pages/caretaker/CaretakerDashboard.tsx`

- [ ] **Step 1: Refactor GateDashboard realtime + actions**

In `src/pages/gate/GateDashboard.tsx`, replace the inline `onSnapshot` current-visitors effect with `useCurrentVisitors`, the shift effect/handlers with `useShift` + `startShift`/`endShift` from `shiftService`, and `checkOut` with `checkOutVisitor` from `visitorService`. Keep the existing JSX/layout. Example head:
```tsx
import { useCurrentVisitors } from '../../hooks/useCurrentVisitors'
import { useShift } from '../../hooks/useShift'
import { startShift, endShift } from '../../services/shiftService'
import { checkOutVisitor } from '../../services/visitorService'
// …
const { user } = useAuth()
const actor = { uid: user!.uid, name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
const { visitors, loading } = useCurrentVisitors(user?.propertyId)
const { shift } = useShift(user?.uid)
```
Wire the shift button to `shift ? endShift(shift, actor) : startShift(user!.propertyId!, actor)` and the check-out confirm to `checkOutVisitor(v, actor)`. Update the four Gate home tiles' `to=` targets to the Task 13 routes: `/gate/register`, `/gate/inside`, `/gate/deliveries`, `/gate/incidents`, and add a fifth `My Shift → /gate/shift`.

- [ ] **Step 2: Refactor CaretakerDashboard current-visitors listener**

In `src/pages/caretaker/CaretakerDashboard.tsx`, replace the inline current-visitors `onSnapshot` with `useCurrentVisitors(propertyId)` and use its `visitors` for the "Currently Inside" card and the `currentlyInside` stat. Leave the `Promise.all` day-stats block as-is.

- [ ] **Step 3: Typecheck, run, manual check**

Run: `npm run build` → PASS.
Run: `npm run dev`, log in as the seeded guard, confirm the Gate dashboard still shows current visitors and shift toggles work.

- [ ] **Step 4: Commit**

```bash
git add src/pages/gate/GateDashboard.tsx src/pages/caretaker/CaretakerDashboard.tsx
git commit -m "refactor: move dashboards onto shared services/hooks"
```

---

## Task 11: PhotoCapture component

**Files:**
- Create: `src/components/ui/PhotoCapture.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

interface Props {
  label?: string
  onCapture: (blob: Blob | null) => void
  disabled?: boolean
}

/** Optional photo capture. Uses the device camera on mobile via capture="environment". */
export function PhotoCapture({ label = 'Add photo (optional)', onCapture, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    onCapture(file)
  }
  const clear = () => { setPreview(null); onCapture(null); if (inputRef.current) inputRef.current.value = '' }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only"
        onChange={e => handleFile(e.target.files?.[0])} disabled={disabled} />
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="capture" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
          <button type="button" onClick={clear} className="absolute -top-2 -right-2 bg-white rounded-full shadow p-1">
            <X className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm w-full justify-center">
          <Camera className="w-4 h-4" /> {label}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck & commit**

Run: `npm run build` → PASS.
```bash
git add src/components/ui/PhotoCapture.tsx
git commit -m "feat(ui): optional camera photo capture component"
```

---

## Task 12: Register-a-Guest flow (core workflow)

**Files:**
- Create: `src/pages/gate/RegisterGuestPage.tsx`
- Create: `src/components/gate/TenantSearchField.tsx`
- Delete: `src/pages/gate/RegisterVisitorPage.tsx`
- Modify: `src/App.tsx` (route `register-visitor` → `register`, import)

- [ ] **Step 1: TenantSearchField component**

`src/components/gate/TenantSearchField.tsx`:
```tsx
import { Search, CheckCircle2 } from 'lucide-react'
import { useTenantSearch } from '../../hooks/useTenantSearch'
import { isAccessAllowedNow } from '../../services/preApprovalService'
import type { Tenant, PreApprovedVisitor } from '../../types'

interface Props {
  propertyId: string
  onSelectTenant: (t: Tenant) => void
  onSelectPreApproved: (p: PreApprovedVisitor) => void
  selectedLabel?: string
}

export function TenantSearchField({ propertyId, onSelectTenant, onSelectPreApproved, selectedLabel }: Props) {
  const { term, setTerm, results, preApprovedMatches, loading } = useTenantSearch(propertyId)
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input pl-9" placeholder="Search tenant, unit, block or phone…"
          value={term} onChange={e => setTerm(e.target.value)} />
      </div>
      {selectedLabel && <p className="text-xs text-green-700">✓ {selectedLabel}</p>}
      {loading && <p className="text-xs text-gray-400">Loading tenants…</p>}

      {preApprovedMatches.map(p => {
        const allowed = isAccessAllowedNow(p)
        return (
          <button key={p.id} type="button" onClick={() => onSelectPreApproved(p)}
            className="w-full text-left p-3 rounded-xl border border-green-200 bg-green-50">
            <p className="text-xs font-semibold text-green-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> PRE-APPROVED</p>
            <p className="text-sm font-medium text-gray-900">{p.name}</p>
            <p className="text-xs text-gray-600">{p.unitNumber} · {p.relationship ?? 'Visitor'}</p>
            <p className={`text-xs mt-1 ${allowed ? 'text-green-700' : 'text-red-600'}`}>
              {allowed ? '🟢 Access allowed now' : '🔴 Outside access window'} · {p.accessStart}-{p.accessEnd}
            </p>
          </button>
        )
      })}

      {term && results.length === 0 && preApprovedMatches.length === 0 && (
        <p className="text-xs text-gray-400">No tenant found. You can still register against a unit below.</p>
      )}
      {results.slice(0, 8).map(t => (
        <button key={t.tenantId} type="button" onClick={() => onSelectTenant(t)}
          className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-lango-primary">
          <p className="text-sm font-medium text-gray-900">{t.fullName}</p>
          <p className="text-xs text-gray-500">{t.blockName} • Unit {t.unitNumber} • {t.phoneNumber}</p>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: RegisterGuestPage — type step + guest step + visiting step**

Create `src/pages/gate/RegisterGuestPage.tsx`. Full component:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { useShift } from '../../hooks/useShift'
import { VISIT_TYPE_OPTIONS, WORK_TYPES, SERVICE_TYPES, VISIT_TYPE_LABEL } from '../../domain/visitTypes'
import { registerGuestSchema, type RegisterGuestInput } from '../../domain/registerSchemas'
import { registerVisitor } from '../../services/visitorService'
import { registerDelivery } from '../../services/deliveryService'
import { bumpShiftCounter } from '../../services/shiftService'
import { sendVisitorNotification } from '../../services/NotificationService'
import { uploadPhoto } from '../../services/photoService'
import { TenantSearchField } from '../../components/gate/TenantSearchField'
import { PhotoCapture } from '../../components/ui/PhotoCapture'
import { Spinner } from '../../components/ui/LoadingScreen'
import type { VisitType, Tenant, PreApprovedVisitor } from '../../types'

type Visiting = { blockId: string; blockName: string; unitId: string; unitNumber: string; tenantId?: string; tenantName?: string; tenantPhone?: string }

export default function RegisterGuestPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const propertyId = user?.propertyId ?? ''
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { shift } = useShift(user?.uid)

  const [step, setStep] = useState(0)
  const [visitType, setVisitType] = useState<VisitType | null>(null)
  const [visiting, setVisiting] = useState<Visiting | null>(null)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ name: string; type: VisitType } | null>(null)

  const form = useForm<RegisterGuestInput>({ resolver: zodResolver(registerGuestSchema) })

  const chooseType = (t: VisitType) => {
    setVisitType(t)
    form.reset({ visitType: t, nationality: 'Kenyan' } as never)
    setStep(1)
  }

  const applyTenant = (t: Tenant) => {
    setVisiting({ blockId: t.blockId, blockName: t.blockName, unitId: t.unitId, unitNumber: t.unitNumber, tenantId: t.tenantId, tenantName: t.fullName, tenantPhone: t.whatsappNumber || t.phoneNumber })
    form.setValue('blockId', t.blockId); form.setValue('unitId', t.unitId)
  }
  const applyPreApproved = (p: PreApprovedVisitor) => {
    setVisiting({ blockId: '', blockName: '', unitId: p.unitId, unitNumber: p.unitNumber, tenantId: p.tenantId, tenantName: p.tenantName })
    form.setValue('unitId', p.unitId); form.setValue('blockId', 'preapproved')
    form.setValue('visitorName', p.name)
  }

  const onSubmit = async (data: RegisterGuestInput) => {
    if (!propertyId || !visiting) { toast.error('Select who is being visited'); return }
    setSubmitting(true)
    try {
      let photoUrl: string | undefined
      if (photo) { try { photoUrl = await uploadPhoto(propertyId, data.visitType === 'DELIVERY' ? 'deliveries' : 'visitors', photo) } catch { toast('Photo upload skipped (offline)') } }

      if (data.visitType === 'DELIVERY') {
        const id = await registerDelivery({
          propertyId, guard: actor, shiftId: shift?.shiftId,
          company: data.company, riderName: data.visitorName, riderPhone: data.phone, riderIdNumber: data.idNumber || undefined,
          blockId: visiting.blockId, blockName: visiting.blockName, unitId: visiting.unitId, unitNumber: visiting.unitNumber,
          tenantId: visiting.tenantId, tenantName: visiting.tenantName,
          packageDescription: data.packageDescription, photoUrl, notes: data.notes,
        })
        await bumpShiftCounter(shift?.shiftId ?? '', 'deliveriesRegistered')
        if (visiting.tenantPhone) await sendVisitorNotification({ propertyId, type: 'DELIVERY_ALERT', recipientPhone: visiting.tenantPhone, recipientName: visiting.tenantName ?? '', relatedEntityId: id, data: { unitNumber: visiting.unitNumber, company: data.company, riderName: data.visitorName, description: data.packageDescription ?? '' } })
      } else {
        const id = await registerVisitor({
          propertyId, guard: actor, shiftId: shift?.shiftId, visitType: data.visitType,
          visitorName: data.visitorName, phone: data.phone, idNumber: data.idNumber || undefined, nationality: data.nationality || undefined, photoUrl,
          blockId: visiting.blockId, blockName: visiting.blockName, unitId: visiting.unitId, unitNumber: visiting.unitNumber,
          tenantId: visiting.tenantId, tenantName: visiting.tenantName,
          reason: data.visitType === 'FRIENDLY_VISIT' ? data.reason : undefined,
          company: 'company' in data ? data.company : undefined,
          workType: data.visitType === 'WORK' ? data.workType : undefined,
          workDescription: data.visitType === 'WORK' ? data.workDescription : undefined,
          serviceType: data.visitType === 'SERVICE_PROVIDER' ? data.serviceType : undefined,
          serviceDescription: data.visitType === 'SERVICE_PROVIDER' ? data.serviceDescription : undefined,
          expectedDurationMins: 'expectedDurationMins' in data ? data.expectedDurationMins : undefined,
          notes: data.notes,
        })
        await bumpShiftCounter(shift?.shiftId ?? '', 'visitorsRegistered')
        if (visiting.tenantPhone) await sendVisitorNotification({ propertyId, type: 'VISITOR_ALERT', recipientPhone: visiting.tenantPhone, recipientName: visiting.tenantName ?? '', relatedEntityId: id, data: { visitorName: data.visitorName, unitNumber: visiting.unitNumber, visitType: VISIT_TYPE_LABEL[data.visitType], reason: ('reason' in data ? data.reason : '') ?? '', idNumber: data.idNumber ?? '' } })
      }
      setDone({ name: data.visitorName, type: data.visitType })
      toast.success('Guest registered')
    } catch (err) {
      console.error(err); toast.error('Unable to register guest. Check your connection and try again.')
    } finally { setSubmitting(false) }
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full"><CheckCircle className="w-10 h-10 text-green-600" /></div>
        <h2 className="text-xl font-bold text-gray-900">Guest Registered</h2>
        <p className="text-gray-600">{done.name} · {VISIT_TYPE_LABEL[done.type]}{visiting ? ` · ${visiting.blockName} ${visiting.unitNumber}` : ''}</p>
        <div className="flex flex-col gap-3 pt-2">
          <button className="btn-primary w-full py-3" onClick={() => { setDone(null); setStep(0); setVisitType(null); setVisiting(null); setPhoto(null); form.reset() }}>Register Another Guest</button>
          <button className="btn-secondary w-full py-3" onClick={() => navigate('/gate')}>Back to Gate</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => step === 0 ? navigate('/gate') : setStep(s => s - 1)} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div><h1 className="page-title">Register a Guest</h1><p className="page-subtitle">Step {step + 1} of 3</p></div>
      </div>

      {/* Step 0 — Type of visit */}
      {step === 0 && (
        <div className="space-y-3">
          <h3 className="section-title">Type of Visit</h3>
          {VISIT_TYPE_OPTIONS.map(o => (
            <button key={o.value} onClick={() => chooseType(o.value)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-lango-primary text-left">
              <span className="text-2xl">{o.emoji}</span>
              <div><p className="font-semibold text-gray-900">{o.label}</p><p className="text-xs text-gray-500">{o.hint}</p></div>
            </button>
          ))}
        </div>
      )}

      {/* Step 1 — Guest info + visiting */}
      {step === 1 && visitType && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="section-title mb-0">{visitType === 'DELIVERY' ? 'Delivery Person' : 'Guest Information'}</h3>
            <div><label className="label">{visitType === 'DELIVERY' ? 'Rider/Driver Name *' : 'Full Name *'}</label>
              <input className="input" {...form.register('visitorName')} autoFocus />
              {form.formState.errors.visitorName && <p className="form-error">{form.formState.errors.visitorName.message}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Phone *</label><input className="input" inputMode="tel" {...form.register('phone')} />
                {form.formState.errors.phone && <p className="form-error">{form.formState.errors.phone.message}</p>}</div>
              <div><label className="label">ID / Passport</label><input className="input" {...form.register('idNumber')} /></div>
            </div>
            {visitType !== 'DELIVERY' && <div><label className="label">Nationality</label><input className="input" {...form.register('nationality')} /></div>}
            <PhotoCapture onCapture={setPhoto} />
          </div>
          <div className="card p-5 space-y-3">
            <h3 className="section-title mb-0">Visiting</h3>
            <TenantSearchField propertyId={propertyId} onSelectTenant={applyTenant} onSelectPreApproved={applyPreApproved}
              selectedLabel={visiting ? `${visiting.tenantName ?? 'Unit'} · ${visiting.blockName} ${visiting.unitNumber}` : undefined} />
            {form.formState.errors.unitId && <p className="form-error">{form.formState.errors.unitId.message}</p>}
          </div>
          <button className="btn-primary w-full py-3" onClick={() => { if (!visiting) { toast.error('Select who is being visited'); return } setStep(2) }}>Next <ArrowRight className="w-4 h-4" /></button>
        </div>
      )}

      {/* Step 2 — Visit details (dynamic) + submit */}
      {step === 2 && visitType && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="section-title mb-0">Visit Details</h3>

            {visitType === 'FRIENDLY_VISIT' && (
              <div><label className="label">Reason (optional)</label><input className="input" placeholder="Personal visit, family…" {...form.register('reason')} /></div>
            )}

            {visitType === 'WORK' && (<>
              <div><label className="label">Type of Work *</label>
                <select className="input" {...form.register('workType')}>
                  <option value="">Select…</option>{WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>{form.formState.errors.workType && <p className="form-error">{form.formState.errors.workType.message}</p>}</div>
              <div><label className="label">Description *</label><textarea rows={2} className="input resize-none" placeholder="e.g. Replacing kitchen sink" {...form.register('workDescription')} />
                {form.formState.errors.workDescription && <p className="form-error">{form.formState.errors.workDescription.message}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Company</label><input className="input" {...form.register('company')} /></div>
                <div><label className="label">Duration (mins)</label><input className="input" inputMode="numeric" {...form.register('expectedDurationMins')} /></div>
              </div>
            </>)}

            {visitType === 'DELIVERY' && (<>
              <div><label className="label">Delivery Company *</label><input className="input" placeholder="DHL, Glovo, Jumia…" {...form.register('company')} />
                {form.formState.errors.company && <p className="form-error">{form.formState.errors.company.message}</p>}</div>
              <div><label className="label">Package Description</label><input className="input" placeholder="Food, parcel, documents…" {...form.register('packageDescription')} /></div>
            </>)}

            {visitType === 'SERVICE_PROVIDER' && (<>
              <div><label className="label">What service are you here to provide? *</label>
                <input className="input" list="service-types" placeholder="e.g. Internet Installation" {...form.register('serviceType')} />
                <datalist id="service-types">{SERVICE_TYPES.map(s => <option key={s} value={s} />)}</datalist>
                {form.formState.errors.serviceType && <p className="form-error">{form.formState.errors.serviceType.message}</p>}</div>
              <div><label className="label">Description</label><textarea rows={2} className="input resize-none" placeholder="e.g. Installing a new fiber connection" {...form.register('serviceDescription')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Company</label><input className="input" {...form.register('company')} /></div>
                <div><label className="label">Duration (mins)</label><input className="input" inputMode="numeric" {...form.register('expectedDurationMins')} /></div>
              </div>
            </>)}
          </div>

          {/* Review summary */}
          <div className="card p-4 bg-gray-50 space-y-1 text-sm">
            <p className="text-gray-500">Guest: <span className="font-medium text-gray-900">{form.watch('visitorName')}</span></p>
            <p className="text-gray-500">Type: <span className="font-medium text-gray-900">{VISIT_TYPE_LABEL[visitType]}</span></p>
            {visiting && <p className="text-gray-500">Visiting: <span className="font-medium text-gray-900">{visiting.blockName} {visiting.unitNumber}{visiting.tenantName ? ` · ${visiting.tenantName}` : ''}</span></p>}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting && <Spinner size="sm" className="text-white" />}{submitting ? 'Registering…' : 'Register Guest'}
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Swap the route and delete the old page**

In `src/App.tsx`: replace the import `RegisterVisitorPage` with `RegisterGuestPage from './pages/gate/RegisterGuestPage'`; change the gate child route `<Route path="register-visitor" element={<RegisterVisitorPage />} />` to `<Route path="register" element={<RegisterGuestPage />} />`. Then:
```bash
git rm src/pages/gate/RegisterVisitorPage.tsx
```

- [ ] **Step 4: Typecheck & manual check**

Run: `npm run build` → PASS.
Run `npm run dev`; as guard, open Register a Guest, verify: the four type cards; Service Provider blocks submit without a service; each type shows only its fields.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(gate): Register-a-Guest dynamic flow + tenant search; retire old page"
```

---

## Task 13: Guard screens — Currently Inside, Deliveries, Incidents, My Shift

**Files:**
- Create: `src/pages/gate/CurrentlyInsidePage.tsx`
- Create: `src/pages/gate/DeliveriesPage.tsx`
- Create: `src/pages/gate/IncidentsPage.tsx`
- Create: `src/pages/gate/ReportIncidentPage.tsx`
- Create: `src/pages/gate/MyShiftPage.tsx`
- Modify: `src/App.tsx` (add the five routes)

- [ ] **Step 1: Currently Inside**

`src/pages/gate/CurrentlyInsidePage.tsx`:
```tsx
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrentVisitors } from '../../hooks/useCurrentVisitors'
import { checkOutVisitor } from '../../services/visitorService'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/Modal'
import { VisitTypeBadge } from '../../components/ui/StatusBadge'
import { formatDuration, durationMinutes } from '../../utils/format'
import { Users } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Visitor } from '../../types'

export default function CurrentlyInsidePage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { visitors, loading } = useCurrentVisitors(user?.propertyId)
  const [confirm, setConfirm] = useState<Visitor | null>(null)
  const [busy, setBusy] = useState(false)

  const doCheckout = async (v: Visitor) => {
    setBusy(true)
    try { await checkOutVisitor(v, actor); toast.success(`${v.visitorName} checked out`) }
    catch { toast.error('Checkout failed') }
    finally { setBusy(false); setConfirm(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <h1 className="page-title">Currently Inside ({visitors.length})</h1>
      {visitors.length === 0 ? <EmptyState icon={Users} title="No visitors inside" description="All clear." /> : (
        <div className="space-y-3">
          {visitors.map(v => (
            <div key={v.visitorId} className="card p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><p className="font-medium text-gray-900">{v.visitorName}</p><VisitTypeBadge type={v.visitType} /></div>
                <p className="text-xs text-gray-500">{v.blockName} • {v.unitNumber} · in {format(v.checkInTime.toDate(), 'h:mm a')} · {formatDuration(durationMinutes(v.checkInTime.toDate(), new Date()))}</p>
              </div>
              <button className="btn-secondary text-sm" onClick={() => setConfirm(v)}>Check Out</button>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => confirm && doCheckout(confirm)}
        title="Check Out Visitor" message={`Check out ${confirm?.visitorName}?`} confirmLabel="Check Out" loading={busy} />
    </div>
  )
}
```

- [ ] **Step 2: Deliveries**

`src/pages/gate/DeliveriesPage.tsx`:
```tsx
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDeliveries } from '../../hooks/useDeliveries'
import { markCollected } from '../../services/deliveryService'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { DeliveryStatusBadge } from '../../components/ui/StatusBadge'
import { Package } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Delivery } from '../../types'

export default function DeliveriesPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { deliveries, loading } = useDeliveries(user?.propertyId)
  const [busy, setBusy] = useState<string | null>(null)

  const collect = async (d: Delivery) => {
    setBusy(d.deliveryId)
    try { await markCollected(d, actor); toast.success('Marked collected') }
    catch { toast.error('Update failed') } finally { setBusy(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <h1 className="page-title">Deliveries</h1>
      {deliveries.length === 0 ? <EmptyState icon={Package} title="No deliveries" /> : (
        <div className="space-y-3">
          {deliveries.map(d => (
            <div key={d.deliveryId} className="card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">📦 {d.company}</p><DeliveryStatusBadge status={d.status} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{d.riderName} · {d.blockName} {d.unitNumber} · {d.tenantName}</p>
              {d.packageDescription && <p className="text-xs text-gray-500">Package: {d.packageDescription}</p>}
              <p className="text-xs text-gray-400 mt-1">Received {format(d.receivedAt.toDate(), 'h:mm a')}</p>
              {d.status === 'RECEIVED' && <button className="btn-secondary text-sm mt-3" disabled={busy === d.deliveryId} onClick={() => collect(d)}>Mark Collected</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Incidents list**

`src/pages/gate/IncidentsPage.tsx`:
```tsx
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useIncidents } from '../../hooks/useIncidents'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { IncidentSeverityBadge } from '../../components/ui/StatusBadge'
import { AlertTriangle, Plus } from 'lucide-react'
import { format } from 'date-fns'

export default function IncidentsPage() {
  const { user } = useAuth()
  const { incidents, loading } = useIncidents(user?.propertyId)
  if (loading) return <PageLoader />
  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Incidents</h1>
        <Link to="/gate/incidents/new" className="btn-primary text-sm"><Plus className="w-4 h-4" /> Report</Link>
      </div>
      {incidents.length === 0 ? <EmptyState icon={AlertTriangle} title="No incidents" description="Report one if something happens." /> : (
        <div className="space-y-3">
          {incidents.map(i => (
            <div key={i.incidentId} className="card p-4">
              <div className="flex items-center justify-between"><p className="font-medium text-gray-900">{i.type.replace(/_/g, ' ')}</p><IncidentSeverityBadge severity={i.severity} /></div>
              <p className="text-xs text-gray-500 mt-1">{i.description}</p>
              <p className="text-xs text-gray-400 mt-1">{format(i.createdAt.toDate(), 'd MMM, h:mm a')} · {i.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Report incident**

`src/pages/gate/ReportIncidentPage.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { reportIncident } from '../../services/incidentService'
import { bumpShiftCounter, getActiveShift } from '../../services/shiftService'
import { uploadPhoto } from '../../services/photoService'
import { PhotoCapture } from '../../components/ui/PhotoCapture'
import { Spinner } from '../../components/ui/LoadingScreen'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import type { IncidentType, IncidentSeverity } from '../../types'

const schema = z.object({
  type: z.enum(['SUSPICIOUS_VISITOR', 'UNAUTHORIZED_ENTRY', 'DISPUTE', 'THEFT', 'EMERGENCY', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(4, 'Describe what happened'),
})
type Form = z.infer<typeof schema>
const TYPES: IncidentType[] = ['SUSPICIOUS_VISITOR', 'UNAUTHORIZED_ENTRY', 'DISPUTE', 'THEFT', 'EMERGENCY', 'OTHER']
const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function ReportIncidentPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { severity: 'MEDIUM', type: 'SUSPICIOUS_VISITOR' } })

  const onSubmit = async (data: Form) => {
    if (!user?.propertyId) return
    setBusy(true)
    try {
      let photoUrl: string | undefined
      if (photo) { try { photoUrl = await uploadPhoto(user.propertyId, 'incidents', photo) } catch { /* optional */ } }
      await reportIncident({ propertyId: user.propertyId, guard: actor, type: data.type, severity: data.severity, description: data.description, photoUrl })
      const shift = await getActiveShift(user.uid); if (shift) await bumpShiftCounter(shift.shiftId, 'incidentsReported')
      toast.success('Incident reported'); navigate('/gate/incidents')
    } catch { toast.error('Failed to report incident') } finally { setBusy(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/gate/incidents')} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
        <h1 className="page-title">Report Incident</h1>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="card p-5 space-y-4">
        <div><label className="label">Type *</label><select className="input" {...form.register('type')}>{TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></div>
        <div><label className="label">Severity *</label><select className="input" {...form.register('severity')}>{SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div><label className="label">Description *</label><textarea rows={3} className="input resize-none" {...form.register('description')} />{form.formState.errors.description && <p className="form-error">{form.formState.errors.description.message}</p>}</div>
        <PhotoCapture onCapture={setPhoto} label="Add photo (optional)" />
        <button type="submit" disabled={busy} className="btn-primary w-full py-3">{busy && <Spinner size="sm" className="text-white" />}{busy ? 'Reporting…' : 'Report Incident'}</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: My Shift**

`src/pages/gate/MyShiftPage.tsx`:
```tsx
import { useAuth } from '../../contexts/AuthContext'
import { useShift } from '../../hooks/useShift'
import { startShift, endShift } from '../../services/shiftService'
import { LogIn, LogOut } from 'lucide-react'
import { format } from 'date-fns'
import { formatDuration, durationMinutes } from '../../utils/format'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function MyShiftPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { shift } = useShift(user?.uid)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    setBusy(true)
    try {
      if (shift) { await endShift(shift, actor); toast.success('Shift ended') }
      else { await startShift(user!.propertyId!, actor); toast.success('Shift started') }
    } catch { toast.error('Action failed') } finally { setBusy(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <h1 className="page-title">My Shift</h1>
      <div className={`card p-5 ${shift ? 'border-l-4 border-l-green-500' : ''}`}>
        <p className="text-sm font-semibold text-gray-900">{shift ? 'On Shift' : 'Not on Shift'}</p>
        {shift && <p className="text-xs text-gray-500">Started {format(shift.startTime.toDate(), 'h:mm a')} · {formatDuration(durationMinutes(shift.startTime.toDate(), new Date()))}</p>}
      </div>
      {shift && (
        <div className="grid grid-cols-3 gap-3">
          {[['Visitors', shift.visitorsRegistered], ['Deliveries', shift.deliveriesRegistered], ['Incidents', shift.incidentsReported]].map(([l, v]) => (
            <div key={l as string} className="card p-4 text-center"><p className="text-2xl font-bold text-gray-900">{v as number}</p><p className="text-xs text-gray-500">{l}</p></div>
          ))}
        </div>
      )}
      <button onClick={toggle} disabled={busy} className={`${shift ? 'btn-secondary' : 'btn-primary'} w-full py-3`}>
        {shift ? <><LogOut className="w-4 h-4" /> End Shift</> : <><LogIn className="w-4 h-4" /> Start Shift</>}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Register the routes**

In `src/App.tsx`, add imports and, inside the `/gate` route block, these children:
```tsx
import CurrentlyInsidePage from './pages/gate/CurrentlyInsidePage'
import DeliveriesPage from './pages/gate/DeliveriesPage'
import IncidentsPage from './pages/gate/IncidentsPage'
import ReportIncidentPage from './pages/gate/ReportIncidentPage'
import MyShiftPage from './pages/gate/MyShiftPage'
// …inside <Route path="/gate" …>
<Route path="inside" element={<CurrentlyInsidePage />} />
<Route path="deliveries" element={<DeliveriesPage />} />
<Route path="incidents" element={<IncidentsPage />} />
<Route path="incidents/new" element={<ReportIncidentPage />} />
<Route path="shift" element={<MyShiftPage />} />
```

- [ ] **Step 7: Typecheck, manual check, commit**

Run: `npm run build` → PASS. `npm run dev`; verify each new gate page renders and the home tiles navigate correctly.
```bash
git add -A && git commit -m "feat(gate): Currently Inside, Deliveries, Incidents, Report, My Shift"
```

---

## Task 14: Security rules tightening + indexes

**Files:**
- Modify: `firestore.rules` (visitors/deliveries create; units guard update)
- Modify: `firestore.indexes.json`
- Modify: `firebase.json` (add storage emulator port)

- [ ] **Step 1: Require `registeredBy == uid` on guard creates**

In `firestore.rules`, change the `visitors` and `deliveries` `create` rules to:
```
// visitors
allow create: if isAuth() && ownsProperty(request.resource.data.propertyId)
              && request.resource.data.registeredBy == request.auth.uid;
// deliveries
allow create: if isAuth() && ownsProperty(request.resource.data.propertyId)
              && request.resource.data.registeredBy == request.auth.uid;
```

- [ ] **Step 2: Restrict a guard's unit update to status only**

In `firestore.rules`, replace the `units` `allow update` with a helper + rule:
```
function onlyStatusChanged() {
  return request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly(['status', 'updatedAt']);
}
allow update: if isSuperAdmin()
              || (isPropertyStaff() && getPropertyId() == resource.data.propertyId)
              || (isGuard() && getPropertyId() == resource.data.propertyId && onlyStatusChanged());
```

- [ ] **Step 2b: Harden `notifications` and `auditLogs` create rules (client cannot forge tenant/identity)**

The client now writes `notifications` and `auditLogs` docs. The existing rules only require `isAnyStaff()`, which lets a staff member write into another property or forge an actor. Bind both to the caller's claim.

In `firestore.rules`, change the `notifications` `create` rule to:
```
allow create: if isAnyStaff() && ownsProperty(request.resource.data.propertyId);
```
Change the `auditLogs` `create` rule to bind actor + property to the caller's claim (Super Admin may log against any property; other staff only their own):
```
allow create: if isAnyStaff()
              && request.resource.data.actorId == request.auth.uid
              && request.resource.data.actorRole == getRole()
              && (isSuperAdmin() || request.resource.data.propertyId == getPropertyId());
```
(Leave `auditLogs` update/delete as `false`. The server-side Cloud Function audit path uses the Admin SDK and bypasses these rules, so it is unaffected.)

- [ ] **Step 3: Add indexes**

In `firestore.indexes.json`, add to `indexes`:
```json
{ "collectionGroup": "deliveries", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "propertyId", "order": "ASCENDING" },
  { "fieldPath": "receivedAt", "order": "DESCENDING" } ] },
{ "collectionGroup": "deliveries", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "propertyId", "order": "ASCENDING" },
  { "fieldPath": "status", "order": "ASCENDING" },
  { "fieldPath": "receivedAt", "order": "DESCENDING" } ] },
{ "collectionGroup": "incidents", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "propertyId", "order": "ASCENDING" },
  { "fieldPath": "status", "order": "ASCENDING" },
  { "fieldPath": "createdAt", "order": "DESCENDING" } ] },
{ "collectionGroup": "shifts", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "guardId", "order": "ASCENDING" },
  { "fieldPath": "status", "order": "ASCENDING" } ] },
{ "collectionGroup": "preApproved", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "propertyId", "order": "ASCENDING" },
  { "fieldPath": "isActive", "order": "ASCENDING" } ] }
```

- [ ] **Step 4: Add the storage emulator port**

In `firebase.json`, under `emulators`, add: `"storage": { "port": 9199 },`.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules firestore.indexes.json firebase.json
git commit -m "security(rules): assert registeredBy on guard writes; guard unit status-only; add indexes"
```

---

## Task 15: Emulator setup + rules & workflow tests

**Files:**
- Modify: `package.json` (add dev deps + scripts)
- Create: `tests/rules/setup.ts`
- Create: `tests/rules/guard-boundaries.test.ts`
- Create: `tests/rules/workflow.test.ts`
- Create: `vitest.rules.config.ts`

- [ ] **Step 1: Install rules-testing dependency**

Run:
```bash
npm i -D @firebase/rules-unit-testing
```
Expected: added to devDependencies.

- [ ] **Step 2: Add scripts to package.json**

In `package.json` `scripts`, add:
```json
"test:rules": "firebase emulators:exec --only firestore,storage,auth \"vitest run --config vitest.rules.config.ts\""
```

- [ ] **Step 3: Rules test vitest config**

`vitest.rules.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'node', include: ['tests/rules/**/*.test.ts'], testTimeout: 20000, fileParallelism: false },
})
```

- [ ] **Step 4: Test harness**

`tests/rules/setup.ts`:
```ts
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'

export async function makeEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: 'lango-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
}

export const guardA = { role: 'SECURITY_GUARD', propertyId: 'propA' }
export const guardB = { role: 'SECURITY_GUARD', propertyId: 'propB' }
export const caretakerA = { role: 'CARETAKER', propertyId: 'propA' }
```

- [ ] **Step 5: Boundary tests**

`tests/rules/guard-boundaries.test.ts`:
```ts
import { afterAll, beforeAll, describe, it } from 'vitest'
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { makeEnv, guardA, guardB } from './setup'

let env: RulesTestEnvironment
beforeAll(async () => {
  env = await makeEnv()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'tenants/t1'), { propertyId: 'propA', fullName: 'Jane', status: 'ACTIVE' })
    await setDoc(doc(db, 'units/u1'), { propertyId: 'propA', status: 'VACANT', currentTenantId: 't1', updatedAt: 0 })
    await setDoc(doc(db, 'visitors/vB'), { propertyId: 'propB', status: 'INSIDE' })
    await setDoc(doc(db, 'auditLogs/a1'), { propertyId: 'propA', action: 'LOGIN' })
  })
})
afterAll(async () => { await env.cleanup() })

describe('guard property isolation', () => {
  it('guard A cannot read property B visitor', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(getDoc(doc(db, 'visitors/vB')))
  })
  it('guard A can create a visitor in property A with own registeredBy', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(setDoc(doc(db, 'visitors/vNew'), { propertyId: 'propA', registeredBy: 'gA', status: 'INSIDE' }))
  })
  it('guard A cannot forge registeredBy', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(setDoc(doc(db, 'visitors/vFake'), { propertyId: 'propA', registeredBy: 'someoneElse', status: 'INSIDE' }))
  })
  it('guard A cannot edit tenant records', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(updateDoc(doc(db, 'tenants/t1'), { fullName: 'Hacked' }))
  })
  it('guard A can flip unit status but not tenant fields', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(updateDoc(doc(db, 'units/u1'), { status: 'OCCUPIED', updatedAt: 1 }))
    await assertFails(updateDoc(doc(db, 'units/u1'), { currentTenantId: 'zzz' }))
  })
  it('nobody can modify audit logs', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(updateDoc(doc(db, 'auditLogs/a1'), { action: 'TAMPER' }))
  })
  it('guard A cannot create a notification for property B', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(setDoc(doc(db, 'notifications/nB'), { propertyId: 'propB', type: 'VISITOR_ALERT', recipientPhone: '0700', recipientName: 'x', message: 'm', status: 'MOCK', provider: 'MOCK' }))
  })
  it('guard A can create a notification for property A', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(setDoc(doc(db, 'notifications/nA'), { propertyId: 'propA', type: 'VISITOR_ALERT', recipientPhone: '0700', recipientName: 'x', message: 'm', status: 'MOCK', provider: 'MOCK' }))
  })
  it('guard A cannot forge an audit log actor', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(setDoc(doc(db, 'auditLogs/forge'), { actorId: 'someoneElse', actorRole: 'SECURITY_GUARD', propertyId: 'propA', action: 'LOGIN', entityType: 'x', entityId: 'y', description: 'd' }))
  })
  it('guard A can create a well-formed audit log for itself', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(setDoc(doc(db, 'auditLogs/ok'), { actorId: 'gA', actorRole: 'SECURITY_GUARD', propertyId: 'propA', action: 'VISITOR_REGISTERED', entityType: 'visitor', entityId: 'v', description: 'd' }))
  })
})
```

- [ ] **Step 6: Workflow test (register → checkout, per-type fields)**

`tests/rules/workflow.test.ts`:
```ts
import { afterAll, beforeAll, describe, it, expect } from 'vitest'
import { assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { makeEnv, guardA, caretakerA } from './setup'

let env: RulesTestEnvironment
beforeAll(async () => { env = await makeEnv() })
afterAll(async () => { await env.cleanup() })

describe('guest workflow', () => {
  it('service provider registration persists serviceType and is visible to caretaker', async () => {
    const gdb = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(setDoc(doc(gdb, 'visitors/vSvc'), {
      propertyId: 'propA', registeredBy: 'gA', status: 'INSIDE',
      visitType: 'SERVICE_PROVIDER', serviceType: 'Internet Installation', visitorName: 'Tech Guy',
    }))
    const cdb = env.authenticatedContext('cA', caretakerA).firestore()
    const snap = await getDoc(doc(cdb, 'visitors/vSvc'))
    expect(snap.data()?.serviceType).toBe('Internet Installation')
  })
  it('guard can check a visitor out', async () => {
    const gdb = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(updateDoc(doc(gdb, 'visitors/vSvc'), { status: 'CHECKED_OUT', durationMinutes: 30 }))
  })
  it('delivery registration lands in deliveries', async () => {
    const gdb = env.authenticatedContext('gA', guardA).firestore()
    await assertSucceeds(setDoc(doc(gdb, 'deliveries/dX'), { propertyId: 'propA', registeredBy: 'gA', status: 'RECEIVED', company: 'DHL' }))
  })
})
```

- [ ] **Step 7: Run the emulator-backed tests**

Run: `npm run test:rules`
Expected: emulator boots; both suites PASS (all boundary + workflow assertions). If `firebase` CLI is missing: `npm i -D firebase-tools` and retry.

- [ ] **Step 8: Run the pure unit tests too**

Run: `npm test`
Expected: PASS (schemas, format, preApproval, existing phone/units tests).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.rules.config.ts tests/
git commit -m "test(rules): emulator boundary + workflow tests"
```

---

## Task 16: Seed demo pre-approved visitors + final verification

**Files:**
- Modify: `scripts/seed.ts` (append pre-approved demo entries)

- [ ] **Step 1: Append pre-approved seed**

In `scripts/seed.ts`, after the tenants are created (near line 96, using the first seeded unit/tenant's ids as `unitId`/`tenantId`/`unitNumber`), add:
```ts
  await db.collection('preApproved').add({
    propertyId, unitId: firstUnitId, unitNumber: firstUnitNumber,
    tenantId: firstTenantId, tenantName: firstTenantName,
    name: 'Susan Akinyi', idNumber: '29384756', phone: '0722000111',
    relationship: 'House Help', accessDays: [1, 2, 3, 4, 5],
    accessStart: '07:00', accessEnd: '18:00', isActive: true,
    createdAt: FieldValue.serverTimestamp(),
  })
```
(Capture `firstUnitId`/`firstUnitNumber`/`firstTenantId`/`firstTenantName` from the first tenant/unit created in the existing loop — assign them to local variables when that first record is written.)

- [ ] **Step 2: Run the seed against the emulator or project**

Run (dev): `cd scripts && npm run seed` (or the existing seed command in `scripts/package.json`).
Expected: a `preApproved` document exists for Susan Akinyi.

- [ ] **Step 3: Full build + test gate**

Run: `npm run build` → PASS.
Run: `npm test` → PASS.
Run: `npm run test:rules` → PASS.

- [ ] **Step 4: Manual end-to-end (spec §47)**

As the seeded guard: Start Shift → Register a Guest → Friendly Visit → search "Susan" (pre-approved card shows) OR pick a tenant → register → appears in Currently Inside; open a second tab as caretaker and confirm the visitor appears in real time; check the guest out → status CHECKED_OUT with a duration. Repeat for Work, Delivery (lands in Deliveries), and Service Provider (blocks submit without a service; stored serviceType).

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts && git commit -m "chore(seed): demo pre-approved visitor (Susan Akinyi)"
```

---

## Self-Review Notes (coverage vs. spec)

- Shared services/hooks (spec §43) → Tasks 5–9. Realtime fan-out (§30) → Task 9 + Task 10 refactor.
- Visit taxonomy migration (§5, decision) → Task 1. Register-a-Guest single dynamic flow (§11–§16, §36) → Task 12; per-type required fields incl. Service Provider (§16, §38) → Tasks 3 + 12.
- Delivery routed to `deliveries` (decision, §15/§23) → Task 12 + Task 7 + Task 13. Currently Inside/checkout (§22) → Task 13. Incidents (§24) → Task 13. My Shift (§25) → Task 13.
- Tenant/unit search auto-fill from trusted data (§17) → Tasks 8, 12. Pre-approval read + fast check-in (§21) → Tasks 8, 12, 16.
- Tenant does NOT approve (§20) → informational notifications only, no approve/deny (Task 12 + §9). Notifications honest (§32) → Task 5.
- Photos → Storage (§31) → Tasks 8, 11, 12, 13. Offline (§40) → existing persistence + optional-photo handling (Task 12).
- Audit logging (§33) → Task 5 choke-point, called by every mutation (Tasks 6–8). Security rules/isolation (§27, §45, §46) → Task 14; boundary tests (§48) → Task 15.
- Data model (§18) → Task 1 types. No mock data as source, no core TODOs (§44, §51) → services read/write Firestore throughout.
