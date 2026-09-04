# Caretaker Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Caretaker's full operational management surface (Visitors, Tenants, Blocks & Units, Deliveries, Incidents, Guards, Settings, Reports placeholder) on the shared domain layer, with an atomic tenant lifecycle and preserved occupancy history.

**Architecture:** Extend the shared `src/services/*` with tenant-lifecycle batches + occupancy + status actions, add read hooks, and build self-contained section pages under `src/features/property/` that read `role`/`propertyId` from `useAuth()` and derive capabilities from `src/domain/permissions.ts`. Pages use in-page drawers/modals (no sub-routes), so the Property Manager can mount the same pages later. `firestore.rules` remain the security boundary; one rule (occupancies update) is loosened for property staff.

**Tech Stack:** React 19 + Vite + TypeScript (strict) + Tailwind, Firebase (Firestore), react-hook-form + zod, date-fns, lucide-react, react-hot-toast, vitest, `@firebase/rules-unit-testing`.

**Conventions (follow exactly):**
- Base branch: `feat/guard-experience`. Work on a new branch `feat/caretaker-experience`.
- CSS utilities in `src/index.css`: `btn-primary`, `btn-secondary`, `btn-ghost`, `card`, `input`, `label`, `form-error`, `page-title`, `page-subtitle`, `section-title`, `badge`.
- Badges in `src/components/ui/StatusBadge.tsx`: `TenantStatusBadge`, `UnitStatusBadge`, `DeliveryStatusBadge`, `IncidentSeverityBadge`, `VisitTypeBadge`, `VisitorStatusBadge`.
- UI: `Modal({isOpen,onClose,title,children,size?,footer?})`, `ConfirmDialog({isOpen,onClose,onConfirm,title,message,confirmLabel,loading})`, `PageLoader`, `Spinner`, `EmptyState({icon,title,description?})`.
- `useAuth()` → `{ user }` with `user.uid`, `user.propertyId`, `user.profile?.name`, `user.role`.
- `actor` for services = `{ uid: user.uid, name: user.profile?.name ?? 'Caretaker', role: user.role }`.
- Collections/doc helpers in `src/firebase/collections.ts`: `tenantsCol`, `unitsCol`, `blocksCol`, `occupanciesCol`, `usersCol`, `shiftsCol`, `tenantDoc`, `unitDoc`, `occupancyDoc`. `db` from `src/firebase/config.ts`.
- Firestore timestamps: write `serverTimestamp()`; convert JS dates with `Timestamp.fromDate(d)`; read `.toDate()`.
- All mutations go through `logAudit` (from `src/services/auditService.ts`).

---

## Task 1: Branch + foundation (permissions, audit actions, rule change, indexes)

**Files:**
- Create: `src/domain/permissions.ts`
- Test: `src/domain/permissions.test.ts`
- Modify: `src/types/index.ts` (AuditAction union)
- Modify: `firestore.rules` (occupancies update)
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Branch**

Run: `cd /home/jane-ngugi/Documents/Lango && git checkout -b feat/caretaker-experience`
Expected: `Switched to a new branch 'feat/caretaker-experience'`

- [ ] **Step 2: Write the failing permissions test** — `src/domain/permissions.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { canManageTenants, canManageUnits, canResolveIncidents, canManageDeliveries, canManageStaff } from './permissions'

describe('permissions', () => {
  it('caretaker & manager can manage tenants/units/incidents/deliveries', () => {
    for (const r of ['CARETAKER', 'PROPERTY_MANAGER'] as const) {
      expect(canManageTenants(r)).toBe(true)
      expect(canManageUnits(r)).toBe(true)
      expect(canResolveIncidents(r)).toBe(true)
      expect(canManageDeliveries(r)).toBe(true)
    }
  })
  it('guard cannot manage tenants/units', () => {
    expect(canManageTenants('SECURITY_GUARD')).toBe(false)
    expect(canManageUnits('SECURITY_GUARD')).toBe(false)
  })
  it('only super admin can manage staff', () => {
    expect(canManageStaff('SUPER_ADMIN')).toBe(true)
    expect(canManageStaff('CARETAKER')).toBe(false)
  })
})
```

- [ ] **Step 3: Run it — expect FAIL** (module not found)

Run: `npx vitest run src/domain/permissions.test.ts`

- [ ] **Step 4: Implement `src/domain/permissions.ts`**

```ts
import type { UserRole } from '../types'

const MANAGE_ROLES: UserRole[] = ['PROPERTY_MANAGER', 'CARETAKER']

export function canManageTenants(role: UserRole | null | undefined): boolean {
  return !!role && MANAGE_ROLES.includes(role)
}
export function canManageUnits(role: UserRole | null | undefined): boolean {
  return !!role && MANAGE_ROLES.includes(role)
}
export function canResolveIncidents(role: UserRole | null | undefined): boolean {
  return !!role && MANAGE_ROLES.includes(role)
}
export function canManageDeliveries(role: UserRole | null | undefined): boolean {
  return !!role && MANAGE_ROLES.includes(role)
}
export function canManageStaff(role: UserRole | null | undefined): boolean {
  return role === 'SUPER_ADMIN'
}
```

- [ ] **Step 5: Run it — expect PASS (3 tests)**

Run: `npx vitest run src/domain/permissions.test.ts`

- [ ] **Step 6: Extend the AuditAction union** in `src/types/index.ts`

Add these members to the `AuditAction` union (after `'TENANT_MOVED_OUT'`):
```ts
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'UNIT_STATUS_CHANGED'
  | 'INCIDENT_RESOLVED'
  | 'DELIVERY_HELD'
  | 'DELIVERY_RETURNED'
```

- [ ] **Step 7: Loosen the occupancies update rule** in `firestore.rules`

In `match /occupancies/{recordId}`, change `allow update` to:
```
allow update: if isSuperAdmin() || (isPropertyStaff() && getPropertyId() == resource.data.propertyId);
```
(Leave `create` as-is — already allows property staff. Leave `delete: if isSuperAdmin()` unchanged, protecting history.)

- [ ] **Step 8: Add indexes** in `firestore.indexes.json` (append to `indexes`, valid JSON)

```json
{ "collectionGroup": "occupancies", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "propertyId", "order": "ASCENDING" },
  { "fieldPath": "unitId", "order": "ASCENDING" } ] },
{ "collectionGroup": "shifts", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "propertyId", "order": "ASCENDING" },
  { "fieldPath": "status", "order": "ASCENDING" } ] },
{ "collectionGroup": "tenants", "queryScope": "COLLECTION", "fields": [
  { "fieldPath": "propertyId", "order": "ASCENDING" },
  { "fieldPath": "fullName", "order": "ASCENDING" } ] }
```
(The `tenants propertyId+fullName` index backs `listTenants` without a status filter — the "include moved-out" path — which does `where(propertyId) + orderBy(fullName)`; the existing `propertyId+status+fullName` index only covers the status-filtered default.)

- [ ] **Step 9: Validate + build + commit**

Run: `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8')); console.log('JSON OK')"`
Run: `npm run build` → PASS
```bash
git add src/domain/permissions.ts src/domain/permissions.test.ts src/types/index.ts firestore.rules firestore.indexes.json
git commit -m "feat(caretaker): permissions helpers, audit actions, occupancies rule + indexes"
```

---

## Task 2: occupancyService

**Files:**
- Create: `src/services/occupancyService.ts`

- [ ] **Step 1: Implement**

```ts
import { doc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore'
import type { WriteBatch } from 'firebase/firestore'
import { occupanciesCol } from '../firebase/collections'
import type { OccupancyRecord, Unit } from '../types'

export interface OpenOccupancyArgs {
  propertyId: string
  unit: Pick<Unit, 'unitId' | 'unitNumber' | 'blockId' | 'blockName'>
  tenantId: string
  tenantName: string
  tenantPhone: string
  moveInDate: Date
}

/** Stages an open occupancy row on the caller's batch. Returns the new doc id. */
export function stageOpenOccupancy(batch: WriteBatch, a: OpenOccupancyArgs): string {
  const ref = doc(occupanciesCol)
  batch.set(ref, {
    recordId: ref.id, propertyId: a.propertyId,
    unitId: a.unit.unitId, unitNumber: a.unit.unitNumber,
    blockId: a.unit.blockId, blockName: a.unit.blockName,
    tenantId: a.tenantId, tenantName: a.tenantName, tenantPhone: a.tenantPhone,
    moveInDate: Timestamp.fromDate(a.moveInDate), moveOutDate: null,
    createdAt: serverTimestamp(),
  } as never)
  return ref.id
}

/** Lists occupancy history for one unit (newest first), constrained by property for rules. */
export async function listOccupanciesByUnit(propertyId: string, unitId: string): Promise<OccupancyRecord[]> {
  const snap = await getDocs(query(occupanciesCol,
    where('propertyId', '==', propertyId), where('unitId', '==', unitId)))
  return snap.docs.map(d => d.data() as OccupancyRecord)
    .sort((a, b) => b.moveInDate.toMillis() - a.moveInDate.toMillis())
}
```

- [ ] **Step 2: Build + commit**

Run: `npm run build` → PASS
```bash
git add src/services/occupancyService.ts
git commit -m "feat(services): occupancy staging + unit history"
```

---

## Task 3: tenantService lifecycle (assign / move-out / CRUD)

**Files:**
- Modify: `src/services/tenantService.ts`

- [ ] **Step 1: Add lifecycle functions** (keep existing `loadActiveTenants`/`filterTenants`)

Append to `src/services/tenantService.ts` and add the imports shown:
```ts
import {
  getDocs, query, where, orderBy, writeBatch, doc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { tenantsCol, unitsCol, tenantDoc } from '../firebase/collections'
import { db } from '../firebase/config'
import type { AppUser, Tenant, TenantStatus, Unit } from '../types'
import { logAudit } from './auditService'
import { stageOpenOccupancy } from './occupancyService'

export async function listTenants(propertyId: string, status?: TenantStatus): Promise<Tenant[]> {
  const q = status
    ? query(tenantsCol, where('propertyId', '==', propertyId), where('status', '==', status), orderBy('fullName'))
    : query(tenantsCol, where('propertyId', '==', propertyId), orderBy('fullName'))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Tenant)
}

export interface AssignTenantArgs {
  propertyId: string
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>
  unit: Unit
  fullName: string
  phoneNumber: string
  whatsappNumber: string
  email?: string
  nationalId?: string
  moveInDate: Date
  notes?: string
}

/** Creates a tenant, occupies the unit, and opens an occupancy record — atomically. */
export async function assignTenantToUnit(a: AssignTenantArgs): Promise<string> {
  const batch = writeBatch(db)
  const tenantRef = doc(tenantsCol)
  batch.set(tenantRef, {
    tenantId: tenantRef.id, propertyId: a.propertyId,
    blockId: a.unit.blockId, unitId: a.unit.unitId,
    unitNumber: a.unit.unitNumber, blockName: a.unit.blockName,
    fullName: a.fullName, phoneNumber: a.phoneNumber, whatsappNumber: a.whatsappNumber,
    email: a.email ?? '', nationalId: a.nationalId ?? '',
    moveInDate: Timestamp.fromDate(a.moveInDate), moveOutDate: null,
    status: 'ACTIVE', notes: a.notes ?? '',
    createdBy: a.actor.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  } as never)
  batch.update(doc(unitsCol, a.unit.unitId), {
    status: 'OCCUPIED', currentTenantId: tenantRef.id, currentTenantName: a.fullName,
    updatedAt: serverTimestamp(),
  })
  stageOpenOccupancy(batch, {
    propertyId: a.propertyId, unit: a.unit, tenantId: tenantRef.id,
    tenantName: a.fullName, tenantPhone: a.phoneNumber, moveInDate: a.moveInDate,
  })
  await batch.commit()
  await logAudit({
    actor: a.actor, propertyId: a.propertyId, action: 'TENANT_ASSIGNED',
    entityType: 'tenant', entityId: tenantRef.id,
    description: `Assigned ${a.fullName} to ${a.unit.unitNumber}`,
  })
  return tenantRef.id
}

export interface UpdateTenantPatch {
  fullName?: string; phoneNumber?: string; whatsappNumber?: string
  email?: string; nationalId?: string; notes?: string
}
export async function updateTenant(tenant: Tenant, patch: UpdateTenantPatch, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await import('firebase/firestore').then(({ updateDoc }) =>
    updateDoc(tenantDoc(tenant.tenantId), { ...patch, updatedAt: serverTimestamp() }))
  await logAudit({
    actor, propertyId: tenant.propertyId, action: 'TENANT_UPDATED',
    entityType: 'tenant', entityId: tenant.tenantId, description: `Updated ${tenant.fullName}`,
  })
}

/** Moves a tenant out: tenant→MOVED_OUT, unit→VACANT, close the open occupancy — atomically. Never deletes. */
export async function moveOutTenant(tenant: Tenant, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  // Find the open occupancy for this unit (query by propertyId+unitId — the indexed pair — then match tenant + null moveOut in code).
  const occSnap = await getDocs(query(
    (await import('../firebase/collections')).occupanciesCol,
    where('propertyId', '==', tenant.propertyId), where('unitId', '==', tenant.unitId)))
  const batch = writeBatch(db)
  batch.update(tenantDoc(tenant.tenantId), {
    status: 'MOVED_OUT', moveOutDate: serverTimestamp(), updatedAt: serverTimestamp(),
  })
  batch.update(doc(unitsCol, tenant.unitId), {
    status: 'VACANT', currentTenantId: null, currentTenantName: null, updatedAt: serverTimestamp(),
  })
  occSnap.docs
    .filter(d => (d.data() as { tenantId: string; moveOutDate: unknown }).tenantId === tenant.tenantId && d.data().moveOutDate === null)
    .forEach(d => batch.update(d.ref, { moveOutDate: serverTimestamp() }))
  await batch.commit()
  await logAudit({
    actor, propertyId: tenant.propertyId, action: 'TENANT_MOVED_OUT',
    entityType: 'tenant', entityId: tenant.tenantId,
    description: `Moved out ${tenant.fullName} from ${tenant.unitNumber}`,
  })
}
```
(Note: the dynamic `import('firebase/firestore')` for `updateDoc` and the collections import are only to avoid touching the existing top import block's style; if simpler, add `updateDoc` to the top `firebase/firestore` import and `occupanciesCol` to the collections import and call them directly — functionally identical. Prefer the direct static imports.)

- [ ] **Step 2: Prefer static imports (cleanup)**

Replace any dynamic `import(...)` above with static imports at the top: add `updateDoc` to the `firebase/firestore` import and `occupanciesCol` to the `../firebase/collections` import, then call `updateDoc(...)` and use `occupanciesCol` directly.

- [ ] **Step 3: Build + commit**

Run: `npm run build` → PASS
```bash
git add src/services/tenantService.ts
git commit -m "feat(services): tenant assign/move-out (atomic batch) + list/update"
```

---

## Task 4: unit / incident / delivery / staff / visitor service additions

**Files:**
- Modify: `src/services/unitService.ts`
- Modify: `src/services/incidentService.ts`
- Modify: `src/services/deliveryService.ts`
- Create: `src/services/staffService.ts`
- Modify: `src/services/visitorService.ts`

- [ ] **Step 1: unitService** — add status update + tenant-joined list

Append to `src/services/unitService.ts` (add `updateDoc, doc, serverTimestamp` to the firebase import, `unitDoc` to collections import, and the audit/type imports):
```ts
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { unitDoc } from '../firebase/collections'
import type { AppUser, UnitStatus } from '../types'
import { logAudit } from './auditService'

export async function updateUnitStatus(unit: Unit, status: UnitStatus, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await updateDoc(unitDoc(unit.unitId), { status, updatedAt: serverTimestamp() })
  await logAudit({
    actor, propertyId: unit.propertyId, action: 'UNIT_STATUS_CHANGED',
    entityType: 'unit', entityId: unit.unitId,
    description: `Unit ${unit.unitNumber} → ${status}`,
  })
}

export async function listUnitsWithTenant(propertyId: string): Promise<Unit[]> {
  return listUnits(propertyId)
}
```
(`listUnitsWithTenant` is a semantic alias — units already carry `currentTenantId`/`currentTenantName`. Keep it so pages read intent clearly.)

- [ ] **Step 2: incidentService** — add note + status/resolve

Append to `src/services/incidentService.ts` (ensure `updateDoc, doc, serverTimestamp, arrayUnion` from firebase, `incidentDoc`? there is no incidentDoc helper — use `doc(incidentsCol, id)` via imported `incidentsCol`):
```ts
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { incidentsCol } from '../firebase/collections'
import type { AppUser } from '../types'

export async function setIncidentStatus(
  incident: Incident, status: Incident['status'], actor: Pick<AppUser, 'uid' | 'name' | 'role'>,
): Promise<void> {
  const patch: Record<string, unknown> = { status, updatedAt: serverTimestamp() }
  if (status === 'RESOLVED' || status === 'CLOSED') {
    patch.resolvedBy = actor.uid
    patch.resolvedAt = serverTimestamp()
  }
  await updateDoc(doc(incidentsCol, incident.incidentId), patch)
  await logAudit({
    actor, propertyId: incident.propertyId,
    action: status === 'RESOLVED' || status === 'CLOSED' ? 'INCIDENT_RESOLVED' : 'INCIDENT_REPORTED',
    entityType: 'incident', entityId: incident.incidentId,
    description: `Incident ${incident.type} → ${status}`,
  })
}

export async function addIncidentNote(
  incident: Incident, note: string, actor: Pick<AppUser, 'uid' | 'name' | 'role'>,
): Promise<void> {
  const stamped = `${actor.name}: ${note}`
  const existing = incident.description ?? ''
  await updateDoc(doc(incidentsCol, incident.incidentId), {
    description: `${existing}\n— ${stamped}`, updatedAt: serverTimestamp(),
  })
}
```
(`logAudit` is already imported in incidentService from Task 7 of the prior sub-project; if not, add `import { logAudit } from './auditService'`.)

- [ ] **Step 3: deliveryService** — held / returned

Append to `src/services/deliveryService.ts` (reuse existing `updateDoc, doc, serverTimestamp, deliveriesCol, logAudit`):
```ts
export async function markHeld(d: Delivery, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await updateDoc(doc(deliveriesCol, d.deliveryId), { status: 'HELD', updatedAt: serverTimestamp() })
  await logAudit({ actor, propertyId: d.propertyId, action: 'DELIVERY_HELD', entityType: 'delivery', entityId: d.deliveryId, description: `${d.company} delivery held` })
}
export async function markReturned(d: Delivery, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  await updateDoc(doc(deliveriesCol, d.deliveryId), { status: 'RETURNED', updatedAt: serverTimestamp() })
  await logAudit({ actor, propertyId: d.propertyId, action: 'DELIVERY_RETURNED', entityType: 'delivery', entityId: d.deliveryId, description: `${d.company} delivery returned` })
}
```

- [ ] **Step 4: staffService (new)** — `src/services/staffService.ts`

```ts
import { getDocs, query, where } from 'firebase/firestore'
import { usersCol, shiftsCol } from '../firebase/collections'
import type { AppUser, Shift } from '../types'

/** Property staff roster (excludes Super Admin), for the read-only Guards/Staff tab. */
export async function listStaff(propertyId: string): Promise<AppUser[]> {
  const snap = await getDocs(query(usersCol, where('propertyId', '==', propertyId)))
  return snap.docs.map(d => d.data() as AppUser).filter(u => u.role !== 'SUPER_ADMIN')
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Guard uids currently on an active shift for this property. */
export async function listActiveShiftGuardIds(propertyId: string): Promise<Set<string>> {
  const snap = await getDocs(query(shiftsCol, where('propertyId', '==', propertyId), where('status', '==', 'ACTIVE')))
  return new Set(snap.docs.map(d => (d.data() as Shift).guardId))
}
```

- [ ] **Step 5: visitorService** — range watcher

Append to `src/services/visitorService.ts` (reuse existing `query, where, orderBy, onSnapshot, collection, db, Timestamp, Unsubscribe, Visitor` — re-add `Timestamp` to the import since it was removed earlier):
```ts
import { Timestamp } from 'firebase/firestore'

export function watchVisitorsInRange(
  propertyId: string, from: Date, to: Date,
  cb: (v: Visitor[]) => void, onErr: (e: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'visitors'),
    where('propertyId', '==', propertyId),
    where('checkInTime', '>=', Timestamp.fromDate(from)),
    where('checkInTime', '<=', Timestamp.fromDate(to)),
    orderBy('checkInTime', 'desc'))
  return onSnapshot(q, s => cb(s.docs.map(d => d.data() as Visitor)), onErr)
}
```

- [ ] **Step 6: Build + commit**

Run: `npm run build` → PASS (watch for unused/missing imports; add what's needed, remove what isn't)
```bash
git add src/services/unitService.ts src/services/incidentService.ts src/services/deliveryService.ts src/services/staffService.ts src/services/visitorService.ts
git commit -m "feat(services): unit status, incident status/notes, delivery held/returned, staff roster, visitor range"
```

---

## Task 5: Visitor client-side filter helper (TDD, pure)

**Files:**
- Create: `src/features/property/visitorFilters.ts`
- Test: `src/features/property/visitorFilters.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { filterVisitors, type VisitorFilters } from './visitorFilters'
import type { Visitor } from '../../types'

const v = (over: Partial<Visitor>): Visitor => ({
  visitorId: 'x', propertyId: 'p', blockId: 'b1', unitId: 'u1', unitNumber: 'A01', blockName: 'Block A',
  tenantId: 't1', tenantName: 'Jane', guardId: 'g1', guardName: 'Guard', visitorName: 'John',
  idNumber: '', nationality: '', phone: '', visitType: 'FRIENDLY_VISIT', reason: '',
  status: 'INSIDE', checkInTime: { toDate: () => new Date() } as never, notificationSent: false,
  registeredBy: 'g1', registeredByRole: 'SECURITY_GUARD',
  createdAt: {} as never, updatedAt: {} as never,
  ...over,
})

describe('filterVisitors', () => {
  const list = [
    v({ visitorName: 'John', visitType: 'DELIVERY', status: 'CHECKED_OUT', blockId: 'b1', unitId: 'u1', guardId: 'g1' }),
    v({ visitorName: 'Mary', visitType: 'WORK', status: 'INSIDE', blockId: 'b2', unitId: 'u2', guardId: 'g2' }),
  ]
  it('no filters returns all', () => { expect(filterVisitors(list, {} as VisitorFilters)).toHaveLength(2) })
  it('filters by type', () => { expect(filterVisitors(list, { visitType: 'WORK' })).toHaveLength(1) })
  it('filters by status', () => { expect(filterVisitors(list, { status: 'INSIDE' })).toHaveLength(1) })
  it('filters by block and unit', () => { expect(filterVisitors(list, { blockId: 'b1', unitId: 'u1' })).toHaveLength(1) })
  it('filters by guard', () => { expect(filterVisitors(list, { guardId: 'g2' })[0].visitorName).toBe('Mary') })
  it('search matches name/tenant', () => { expect(filterVisitors(list, { term: 'jane' })).toHaveLength(2) })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/features/property/visitorFilters.test.ts`

- [ ] **Step 3: Implement `src/features/property/visitorFilters.ts`**

```ts
import type { Visitor, VisitType, VisitorStatus } from '../../types'

export interface VisitorFilters {
  term?: string
  visitType?: VisitType
  status?: VisitorStatus
  blockId?: string
  unitId?: string
  guardId?: string
  tenantId?: string
}

export function filterVisitors(list: Visitor[], f: VisitorFilters): Visitor[] {
  const term = f.term?.trim().toLowerCase()
  return list.filter(v => {
    if (f.visitType && v.visitType !== f.visitType) return false
    if (f.status && v.status !== f.status) return false
    if (f.blockId && v.blockId !== f.blockId) return false
    if (f.unitId && v.unitId !== f.unitId) return false
    if (f.guardId && v.guardId !== f.guardId) return false
    if (f.tenantId && v.tenantId !== f.tenantId) return false
    if (term && !(
      v.visitorName.toLowerCase().includes(term) ||
      (v.tenantName ?? '').toLowerCase().includes(term) ||
      v.unitNumber.toLowerCase().includes(term)
    )) return false
    return true
  })
}
```

- [ ] **Step 4: Run — expect PASS (6 tests)**; then commit

Run: `npx vitest run src/features/property/visitorFilters.test.ts`
```bash
git add src/features/property/visitorFilters.ts src/features/property/visitorFilters.test.ts
git commit -m "feat(property): pure visitor filter helper"
```

---

## Task 6: Read hooks

**Files:**
- Create: `src/hooks/useTenants.ts`, `src/hooks/useUnitsWithTenants.ts`, `src/hooks/useVisitorsInRange.ts`, `src/hooks/useStaff.ts`, `src/hooks/useOccupancyHistory.ts`

- [ ] **Step 1: useTenants** — `src/hooks/useTenants.ts`

```ts
import { useCallback, useEffect, useState } from 'react'
import { listTenants } from '../services/tenantService'
import type { Tenant, TenantStatus } from '../types'

export function useTenants(propertyId: string | null | undefined, status?: TenantStatus) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    listTenants(propertyId, status).then(setTenants).catch(e => console.error('[useTenants]', e)).finally(() => setLoading(false))
  }, [propertyId, status])
  useEffect(() => { reload() }, [reload])
  return { tenants, loading, reload }
}
```

- [ ] **Step 2: useUnitsWithTenants** — `src/hooks/useUnitsWithTenants.ts`

```ts
import { useCallback, useEffect, useState } from 'react'
import { listUnitsWithTenant, listBlocks } from '../services/unitService'
import type { Block, Unit } from '../types'

export function useUnitsWithTenants(propertyId: string | null | undefined) {
  const [units, setUnits] = useState<Unit[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    Promise.all([listUnitsWithTenant(propertyId), listBlocks(propertyId)])
      .then(([u, b]) => { setUnits(u); setBlocks(b) })
      .catch(e => console.error('[useUnitsWithTenants]', e)).finally(() => setLoading(false))
  }, [propertyId])
  useEffect(() => { reload() }, [reload])
  return { units, blocks, loading, reload }
}
```

- [ ] **Step 3: useVisitorsInRange** — `src/hooks/useVisitorsInRange.ts`

```ts
import { useEffect, useState } from 'react'
import { watchVisitorsInRange } from '../services/visitorService'
import type { Visitor } from '../types'

export function useVisitorsInRange(propertyId: string | null | undefined, from: Date, to: Date) {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const fromMs = from.getTime(); const toMs = to.getTime()
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchVisitorsInRange(propertyId, new Date(fromMs), new Date(toMs),
      v => { setVisitors(v); setLoading(false) },
      e => { console.error('[useVisitorsInRange]', e); setLoading(false) })
    return unsub
  }, [propertyId, fromMs, toMs])
  return { visitors, loading }
}
```

- [ ] **Step 4: useStaff** — `src/hooks/useStaff.ts`

```ts
import { useEffect, useState } from 'react'
import { listStaff, listActiveShiftGuardIds } from '../services/staffService'
import type { AppUser } from '../types'

export function useStaff(propertyId: string | null | undefined) {
  const [staff, setStaff] = useState<AppUser[]>([])
  const [onShift, setOnShift] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    let active = true
    setLoading(true)
    Promise.all([listStaff(propertyId), listActiveShiftGuardIds(propertyId)])
      .then(([s, ids]) => { if (active) { setStaff(s); setOnShift(ids) } })
      .catch(e => console.error('[useStaff]', e))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [propertyId])
  return { staff, onShift, loading }
}
```

- [ ] **Step 5: useOccupancyHistory** — `src/hooks/useOccupancyHistory.ts`

```ts
import { useEffect, useState } from 'react'
import { listOccupanciesByUnit } from '../services/occupancyService'
import type { OccupancyRecord } from '../types'

export function useOccupancyHistory(propertyId: string | null | undefined, unitId: string | null | undefined) {
  const [records, setRecords] = useState<OccupancyRecord[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!propertyId || !unitId) { setRecords([]); setLoading(false); return }
    let active = true
    setLoading(true)
    listOccupanciesByUnit(propertyId, unitId)
      .then(r => { if (active) setRecords(r) })
      .catch(e => console.error('[useOccupancyHistory]', e))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [propertyId, unitId])
  return { records, loading }
}
```

- [ ] **Step 6: Build + commit**

Run: `npm run build` → PASS
```bash
git add src/hooks/useTenants.ts src/hooks/useUnitsWithTenants.ts src/hooks/useVisitorsInRange.ts src/hooks/useStaff.ts src/hooks/useOccupancyHistory.ts
git commit -m "feat(hooks): tenants, units, visitors-range, staff, occupancy history"
```

---

## Task 7: Emulator tests (occupancy rule + move-out atomicity + regression)

**Files:**
- Create: `tests/rules/caretaker-boundaries.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { afterAll, beforeAll, describe, it } from 'vitest'
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { makeEnv, caretakerA, guardA } from './setup'

const caretakerB = { role: 'CARETAKER', propertyId: 'propB' }

let env: RulesTestEnvironment
beforeAll(async () => {
  env = await makeEnv()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'occupancies/oc1'), { propertyId: 'propA', unitId: 'u1', tenantId: 't1', moveOutDate: null })
    await setDoc(doc(db, 'tenants/t1'), { propertyId: 'propA', unitId: 'u1', fullName: 'Jane', status: 'ACTIVE' })
    await setDoc(doc(db, 'units/u1'), { propertyId: 'propA', status: 'OCCUPIED', currentTenantId: 't1' })
  })
})
afterAll(async () => { await env.cleanup() })

describe('caretaker occupancy + tenant boundaries', () => {
  it('caretaker A can close an occupancy in property A', async () => {
    const db = env.authenticatedContext('cA', caretakerA).firestore()
    await assertSucceeds(updateDoc(doc(db, 'occupancies/oc1'), { moveOutDate: 123 }))
  })
  it('caretaker B cannot touch property A occupancy', async () => {
    const db = env.authenticatedContext('cB', caretakerB).firestore()
    await assertFails(updateDoc(doc(db, 'occupancies/oc1'), { moveOutDate: 456 }))
  })
  it('caretaker A can move a tenant out (tenant + unit updates)', async () => {
    const db = env.authenticatedContext('cA', caretakerA).firestore()
    await assertSucceeds(updateDoc(doc(db, 'tenants/t1'), { status: 'MOVED_OUT', moveOutDate: 1 }))
    await assertSucceeds(updateDoc(doc(db, 'units/u1'), { status: 'VACANT', currentTenantId: null }))
  })
  it('guard still cannot edit tenant records (regression)', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(updateDoc(doc(db, 'tenants/t1'), { fullName: 'Hacked' }))
  })
  it('guard cannot close an occupancy', async () => {
    const db = env.authenticatedContext('gA', guardA).firestore()
    await assertFails(updateDoc(doc(db, 'occupancies/oc1'), { moveOutDate: 789 }))
  })
})
```

- [ ] **Step 2: Run the emulator suite**

Run: `npm run test:rules`
Expected: all rules tests pass (the prior sub-project's suites + these 5). If the emulator can't start (Java/CLI unavailable), report DONE_WITH_CONCERNS and confirm test correctness by inspection — do not stub the tests.

- [ ] **Step 3: Commit**

```bash
git add tests/rules/caretaker-boundaries.test.ts
git commit -m "test(rules): caretaker occupancy close + tenant move-out + guard regression"
```

---

## Task 8: Section page shells + route wiring (kills the dead-redirect)

**Files:**
- Create: `src/features/property/VisitorsPage.tsx`, `TenantsPage.tsx`, `BlocksUnitsPage.tsx`, `DeliveriesPage.tsx`, `IncidentsPage.tsx`, `StaffPage.tsx`, `SettingsPage.tsx`, `ReportsPlaceholder.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create minimal placeholder pages** so routing compiles and every tab lands somewhere. Each file initially:

```tsx
// e.g. src/features/property/VisitorsPage.tsx (repeat pattern for each, changing the name/title)
export default function VisitorsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="page-title">Visitors</h1>
      <p className="page-subtitle">Loading…</p>
    </div>
  )
}
```
Create all eight with their titles: Visitors, Tenants, Blocks & Units, Deliveries, Incidents, Guards, Settings, Reports. (`ReportsPlaceholder` default export named `ReportsPlaceholder`.)

- [ ] **Step 2: Wire routes** in `src/App.tsx`

Add imports:
```tsx
import VisitorsPage from './features/property/VisitorsPage'
import TenantsPage from './features/property/TenantsPage'
import BlocksUnitsPage from './features/property/BlocksUnitsPage'
import DeliveriesPage from './features/property/DeliveriesPage'
import IncidentsPage from './features/property/IncidentsPage'
import StaffPage from './features/property/StaffPage'
import SettingsPage from './features/property/SettingsPage'
import ReportsPlaceholder from './features/property/ReportsPlaceholder'
```
Inside the `<Route path="/caretaker" ...>` block, add:
```tsx
<Route path="visitors" element={<VisitorsPage />} />
<Route path="tenants" element={<TenantsPage />} />
<Route path="blocks" element={<BlocksUnitsPage />} />
<Route path="deliveries" element={<DeliveriesPage />} />
<Route path="incidents" element={<IncidentsPage />} />
<Route path="staff" element={<StaffPage />} />
<Route path="reports" element={<ReportsPlaceholder />} />
<Route path="settings" element={<SettingsPage />} />
```

- [ ] **Step 3: Build + manual check + commit**

Run: `npm run build` → PASS. Run `npm run dev`, log in as caretaker, click each sidebar tab — each now lands on its page (no redirect to dashboard).
```bash
git add src/features/property/ src/App.tsx
git commit -m "feat(caretaker): section page shells + route wiring"
```

---

## Task 9: VisitorsPage (log + filters + detail)

**Files:**
- Modify: `src/features/property/VisitorsPage.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useVisitorsInRange } from '../../hooks/useVisitorsInRange'
import { filterVisitors, type VisitorFilters } from './visitorFilters'
import { VisitTypeBadge, VisitorStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { DoorOpen } from 'lucide-react'
import { format } from 'date-fns'
import { formatDuration, durationMinutes } from '../../utils/format'
import type { Visitor, VisitType, VisitorStatus } from '../../types'

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

export default function VisitorsPage() {
  const { user } = useAuth()
  const [days, setDays] = useState(1) // 1 = today, 7 = last 7 days, 30 = last 30
  const from = useMemo(() => startOfDay(new Date(Date.now() - (days - 1) * 86400000)), [days])
  const to = useMemo(() => endOfDay(new Date()), [days])
  const { visitors, loading } = useVisitorsInRange(user?.propertyId, from, to)
  const [f, setF] = useState<VisitorFilters>({})
  const [selected, setSelected] = useState<Visitor | null>(null)

  const filtered = useMemo(() => filterVisitors(visitors, f), [visitors, f])
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">Visitors</h1>
        <div className="flex gap-1">
          {[[1, 'Today'], [7, '7 days'], [30, '30 days']].map(([d, l]) => (
            <button key={d as number} onClick={() => setDays(d as number)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${days === d ? 'bg-lango-primary text-white border-lango-primary' : 'border-gray-200 text-gray-600'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input" placeholder="Search name / tenant / unit…" value={f.term ?? ''} onChange={e => setF({ ...f, term: e.target.value })} />
        <select className="input" value={f.visitType ?? ''} onChange={e => setF({ ...f, visitType: (e.target.value || undefined) as VisitType | undefined })}>
          <option value="">All types</option>
          <option value="FRIENDLY_VISIT">Friendly Visit</option><option value="WORK">Work</option>
          <option value="DELIVERY">Delivery</option><option value="SERVICE_PROVIDER">Service Provider</option>
        </select>
        <select className="input" value={f.status ?? ''} onChange={e => setF({ ...f, status: (e.target.value || undefined) as VisitorStatus | undefined })}>
          <option value="">All statuses</option><option value="INSIDE">Inside</option><option value="CHECKED_OUT">Checked out</option>
        </select>
        <button className="btn-secondary" onClick={() => setF({})}>Clear filters</button>
      </div>

      {filtered.length === 0 ? <EmptyState icon={DoorOpen} title="No visitors" description="No visitors match this range/filters." /> : (
        <div className="card divide-y divide-gray-50">
          {filtered.map(v => (
            <button key={v.visitorId} onClick={() => setSelected(v)} className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50">
              <div>
                <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{v.visitorName}</span><VisitTypeBadge type={v.visitType} /></div>
                <p className="text-xs text-gray-500">{v.blockName} • {v.unitNumber} · {v.tenantName || '—'} · {format(v.checkInTime.toDate(), 'd MMM, h:mm a')}</p>
              </div>
              <VisitorStatusBadge status={v.status} />
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Visitor details">
        {selected && (
          <div className="space-y-2 text-sm">
            <Row k="Name" v={selected.visitorName} />
            <Row k="Type" v={selected.visitType.replace(/_/g, ' ')} />
            <Row k="Visiting" v={`${selected.blockName} ${selected.unitNumber}${selected.tenantName ? ` · ${selected.tenantName}` : ''}`} />
            <Row k="Guard" v={selected.guardName} />
            <Row k="Checked in" v={format(selected.checkInTime.toDate(), 'd MMM yyyy, h:mm a')} />
            <Row k="Checked out" v={selected.checkOutTime ? format(selected.checkOutTime.toDate(), 'd MMM yyyy, h:mm a') : '—'} />
            <Row k="Duration" v={selected.checkOutTime ? formatDuration(durationMinutes(selected.checkInTime.toDate(), selected.checkOutTime.toDate())) : 'In progress'} />
            {selected.reason && <Row k="Reason" v={selected.reason} />}
            {selected.serviceType && <Row k="Service" v={selected.serviceType} />}
            {selected.workType && <Row k="Work" v={`${selected.workType} — ${selected.workDescription ?? ''}`} />}
            {selected.company && <Row k="Company" v={selected.company} />}
          </div>
        )}
      </Modal>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-900 text-right">{v}</span></div>
}
```

- [ ] **Step 2: Build + commit**

Run: `npm run build` → PASS
```bash
git add src/features/property/VisitorsPage.tsx
git commit -m "feat(caretaker): visitors log with filters + detail"
```

---

## Task 10: TenantsPage (list/search/add/edit/move-out)

**Files:**
- Modify: `src/features/property/TenantsPage.tsx`
- Create: `src/features/property/TenantFormDrawer.tsx`

- [ ] **Step 1: TenantFormDrawer** — `src/features/property/TenantFormDrawer.tsx`

```tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/LoadingScreen'
import { assignTenantToUnit, updateTenant } from '../../services/tenantService'
import type { AppUser, Tenant, Unit } from '../../types'
import toast from 'react-hot-toast'

const schema = z.object({
  fullName: z.string().min(2, 'Name required'),
  phoneNumber: z.string().min(9, 'Phone required'),
  whatsappNumber: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  nationalId: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  isOpen: boolean
  onClose: () => void
  onDone: () => void
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>
  propertyId: string
  vacantUnits: Unit[]     // for the add flow
  editing?: Tenant | null // when set, edit mode
}

export function TenantFormDrawer({ isOpen, onClose, onDone, actor, propertyId, vacantUnits, editing }: Props) {
  const [unitId, setUnitId] = useState('')
  const [busy, setBusy] = useState(false)
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { fullName: editing.fullName, phoneNumber: editing.phoneNumber, whatsappNumber: editing.whatsappNumber, email: editing.email ?? '', nationalId: editing.nationalId ?? '', notes: editing.notes ?? '' }
      : {},
  })

  const submit = async (d: FormData) => {
    setBusy(true)
    try {
      if (editing) {
        await updateTenant(editing, { fullName: d.fullName, phoneNumber: d.phoneNumber, whatsappNumber: d.whatsappNumber || d.phoneNumber, email: d.email, nationalId: d.nationalId, notes: d.notes }, actor)
        toast.success('Tenant updated')
      } else {
        const unit = vacantUnits.find(u => u.unitId === unitId)
        if (!unit) { toast.error('Select a vacant unit'); setBusy(false); return }
        await assignTenantToUnit({ propertyId, actor, unit, fullName: d.fullName, phoneNumber: d.phoneNumber, whatsappNumber: d.whatsappNumber || d.phoneNumber, email: d.email, nationalId: d.nationalId, moveInDate: new Date(), notes: d.notes })
        toast.success('Tenant added')
      }
      onDone(); onClose(); form.reset(); setUnitId('')
    } catch (e) { console.error(e); toast.error('Save failed') } finally { setBusy(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit tenant' : 'Add tenant'}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
        {!editing && (
          <div>
            <label className="label">Assign to vacant unit *</label>
            <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)}>
              <option value="">Select unit…</option>
              {vacantUnits.map(u => <option key={u.unitId} value={u.unitId}>{u.blockName} — {u.unitNumber}</option>)}
            </select>
          </div>
        )}
        <div><label className="label">Full name *</label><input className="input" {...form.register('fullName')} />{form.formState.errors.fullName && <p className="form-error">{form.formState.errors.fullName.message}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Phone *</label><input className="input" {...form.register('phoneNumber')} />{form.formState.errors.phoneNumber && <p className="form-error">{form.formState.errors.phoneNumber.message}</p>}</div>
          <div><label className="label">WhatsApp</label><input className="input" {...form.register('whatsappNumber')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Email</label><input className="input" {...form.register('email')} />{form.formState.errors.email && <p className="form-error">{form.formState.errors.email.message}</p>}</div>
          <div><label className="label">National ID</label><input className="input" {...form.register('nationalId')} /></div>
        </div>
        <div><label className="label">Notes</label><textarea rows={2} className="input resize-none" {...form.register('notes')} /></div>
        <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">{busy && <Spinner size="sm" className="text-white" />}{editing ? 'Save changes' : 'Add tenant'}</button>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 2: TenantsPage** — `src/features/property/TenantsPage.tsx`

```tsx
import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTenants } from '../../hooks/useTenants'
import { useUnitsWithTenants } from '../../hooks/useUnitsWithTenants'
import { filterTenants } from '../../services/tenantService'
import { moveOutTenant } from '../../services/tenantService'
import { canManageTenants } from '../../domain/permissions'
import { TenantStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/Modal'
import { TenantFormDrawer } from './TenantFormDrawer'
import { UserCheck, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Tenant } from '../../types'

export default function TenantsPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const canManage = canManageTenants(user?.role)
  const [includeMovedOut, setIncludeMovedOut] = useState(false)
  const { tenants, loading, reload } = useTenants(user?.propertyId, includeMovedOut ? undefined : 'ACTIVE')
  const { units, reload: reloadUnits } = useUnitsWithTenants(user?.propertyId)
  const [term, setTerm] = useState('')
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Tenant | null }>({ open: false, editing: null })
  const [moveOut, setMoveOut] = useState<Tenant | null>(null)
  const [busy, setBusy] = useState(false)

  const vacantUnits = useMemo(() => units.filter(u => u.status === 'VACANT'), [units])
  const shown = useMemo(() => filterTenants(tenants, term), [tenants, term])

  const doMoveOut = async (t: Tenant) => {
    setBusy(true)
    try { await moveOutTenant(t, actor); toast.success(`${t.fullName} moved out`); reload(); reloadUnits() }
    catch (e) { console.error(e); toast.error('Move-out failed') } finally { setBusy(false); setMoveOut(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">Tenants</h1>
        {canManage && <button className="btn-primary" onClick={() => setDrawer({ open: true, editing: null })}><Plus className="w-4 h-4" /> Add tenant</button>}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input className="input max-w-sm" placeholder="Search name / phone / unit…" value={term} onChange={e => setTerm(e.target.value)} />
        <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={includeMovedOut} onChange={e => setIncludeMovedOut(e.target.checked)} /> Include moved-out</label>
      </div>

      {shown.length === 0 ? <EmptyState icon={UserCheck} title="No tenants" description="Add a tenant to a vacant unit." /> : (
        <div className="card divide-y divide-gray-50">
          {shown.map(t => (
            <div key={t.tenantId} className="px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{t.fullName}</span><TenantStatusBadge status={t.status} /></div>
                <p className="text-xs text-gray-500">{t.blockName} • {t.unitNumber} · {t.phoneNumber}</p>
              </div>
              {canManage && (
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn-secondary text-xs" onClick={() => setDrawer({ open: true, editing: t })}>Edit</button>
                  {t.status === 'ACTIVE' && <button className="btn-danger text-xs" onClick={() => setMoveOut(t)}>Move out</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TenantFormDrawer isOpen={drawer.open} editing={drawer.editing} onClose={() => setDrawer({ open: false, editing: null })}
        onDone={() => { reload(); reloadUnits() }} actor={actor} propertyId={user?.propertyId ?? ''} vacantUnits={vacantUnits} />
      <ConfirmDialog isOpen={!!moveOut} onClose={() => setMoveOut(null)} onConfirm={() => moveOut && doMoveOut(moveOut)}
        title="Move out tenant" message={`Move ${moveOut?.fullName} out of ${moveOut?.unitNumber}? The unit becomes vacant; history is preserved.`} confirmLabel="Move out" loading={busy} />
    </div>
  )
}
```
(`btn-danger` exists in `src/index.css`.)

- [ ] **Step 3: Build + commit**

Run: `npm run build` → PASS
```bash
git add src/features/property/TenantsPage.tsx src/features/property/TenantFormDrawer.tsx
git commit -m "feat(caretaker): tenants list/search/add/edit/move-out"
```

---

## Task 11: BlocksUnitsPage (+ unit detail with occupancy history + status change)

**Files:**
- Modify: `src/features/property/BlocksUnitsPage.tsx`
- Create: `src/features/property/UnitDetailDrawer.tsx`

- [ ] **Step 1: UnitDetailDrawer** — `src/features/property/UnitDetailDrawer.tsx`

```tsx
import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { UnitStatusBadge } from '../../components/ui/StatusBadge'
import { useOccupancyHistory } from '../../hooks/useOccupancyHistory'
import { updateUnitStatus } from '../../services/unitService'
import { canManageUnits } from '../../domain/permissions'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { AppUser, Unit, UnitStatus } from '../../types'

const STATUSES: UnitStatus[] = ['OCCUPIED', 'VACANT', 'RESERVED', 'MAINTENANCE']

export function UnitDetailDrawer({ unit, onClose, onChanged, actor }: {
  unit: Unit | null; onClose: () => void; onChanged: () => void; actor: Pick<AppUser, 'uid' | 'name' | 'role'>
}) {
  const { records, loading } = useOccupancyHistory(unit?.propertyId, unit?.unitId)
  const [busy, setBusy] = useState(false)
  const canManage = canManageUnits(actor.role)

  const setStatus = async (s: UnitStatus) => {
    if (!unit) return
    setBusy(true)
    try { await updateUnitStatus(unit, s, actor); toast.success(`Unit → ${s}`); onChanged() }
    catch (e) { console.error(e); toast.error('Update failed') } finally { setBusy(false) }
  }

  return (
    <Modal isOpen={!!unit} onClose={onClose} title={unit ? `Unit ${unit.unitNumber}` : ''}>
      {unit && (
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between"><span className="text-gray-500">Status</span><UnitStatusBadge status={unit.status} /></div>
          <div className="flex items-center justify-between"><span className="text-gray-500">Current tenant</span><span className="font-medium">{unit.currentTenantName ?? '—'}</span></div>
          {canManage && (
            <div>
              <p className="label">Change status</p>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => <button key={s} disabled={busy || s === unit.status} onClick={() => setStatus(s)} className="btn-secondary text-xs disabled:opacity-40">{s}</button>)}
              </div>
            </div>
          )}
          <div>
            <p className="label">Previous tenants</p>
            {loading ? <p className="text-xs text-gray-400">Loading…</p> : records.length === 0 ? <p className="text-xs text-gray-400">No history yet.</p> : (
              <div className="divide-y divide-gray-50">
                {records.map(r => (
                  <div key={r.recordId} className="py-2 flex justify-between">
                    <span className="font-medium text-gray-800">{r.tenantName}</span>
                    <span className="text-xs text-gray-500">{format(r.moveInDate.toDate(), 'MMM yyyy')} – {r.moveOutDate ? format(r.moveOutDate.toDate(), 'MMM yyyy') : 'present'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: BlocksUnitsPage** — `src/features/property/BlocksUnitsPage.tsx`

```tsx
import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUnitsWithTenants } from '../../hooks/useUnitsWithTenants'
import { UnitStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { UnitDetailDrawer } from './UnitDetailDrawer'
import { Building } from 'lucide-react'
import type { Unit } from '../../types'

export default function BlocksUnitsPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const { units, blocks, loading, reload } = useUnitsWithTenants(user?.propertyId)
  const [selected, setSelected] = useState<Unit | null>(null)

  const byBlock = useMemo(() => {
    const map = new Map<string, Unit[]>()
    for (const u of units) { const k = u.blockId; if (!map.has(k)) map.set(k, []); map.get(k)!.push(u) }
    return map
  }, [units])
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="page-title">Blocks & Units</h1>
      {units.length === 0 ? <EmptyState icon={Building} title="No units" description="Blocks and units are set up by the Super Admin." /> : (
        blocks.map(b => (
          <div key={b.blockId} className="space-y-2">
            <h3 className="section-title">{b.name}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(byBlock.get(b.blockId) ?? []).map(u => (
                <button key={u.unitId} onClick={() => setSelected(u)} className="card p-4 text-left hover:shadow-card-hover">
                  <div className="flex items-center justify-between"><span className="font-semibold text-gray-900">{u.unitNumber}</span><UnitStatusBadge status={u.status} /></div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{u.currentTenantName ?? 'Vacant'}</p>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
      <UnitDetailDrawer unit={selected} onClose={() => setSelected(null)} onChanged={() => { reload(); setSelected(null) }} actor={actor} />
    </div>
  )
}
```

- [ ] **Step 3: Build + commit**

Run: `npm run build` → PASS
```bash
git add src/features/property/BlocksUnitsPage.tsx src/features/property/UnitDetailDrawer.tsx
git commit -m "feat(caretaker): blocks & units grid + unit detail with occupancy history"
```

---

## Task 12: DeliveriesPage + IncidentsPage (management)

**Files:**
- Modify: `src/features/property/DeliveriesPage.tsx`
- Modify: `src/features/property/IncidentsPage.tsx`

- [ ] **Step 1: DeliveriesPage** — `src/features/property/DeliveriesPage.tsx`

```tsx
import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDeliveries } from '../../hooks/useDeliveries'
import { markCollected, markHeld, markReturned } from '../../services/deliveryService'
import { canManageDeliveries } from '../../domain/permissions'
import { DeliveryStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Package } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Delivery, DeliveryStatus } from '../../types'

const TABS: (DeliveryStatus | 'ALL')[] = ['ALL', 'RECEIVED', 'COLLECTED', 'HELD', 'RETURNED']

export default function DeliveriesPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const canManage = canManageDeliveries(user?.role)
  const { deliveries, loading } = useDeliveries(user?.propertyId)
  const [tab, setTab] = useState<DeliveryStatus | 'ALL'>('ALL')
  const [busy, setBusy] = useState<string | null>(null)

  const shown = useMemo(() => tab === 'ALL' ? deliveries : deliveries.filter(d => d.status === tab), [deliveries, tab])

  const act = async (fn: () => Promise<void>, id: string) => {
    setBusy(id)
    try { await fn(); toast.success('Updated') } catch (e) { console.error(e); toast.error('Update failed') } finally { setBusy(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <h1 className="page-title">Deliveries</h1>
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-lg border ${tab === t ? 'bg-lango-primary text-white border-lango-primary' : 'border-gray-200 text-gray-600'}`}>{t}</button>)}
      </div>
      {shown.length === 0 ? <EmptyState icon={Package} title="No deliveries" /> : (
        <div className="space-y-3">
          {shown.map(d => (
            <div key={d.deliveryId} className="card p-4">
              <div className="flex items-center justify-between"><p className="font-medium text-gray-900">📦 {d.company}</p><DeliveryStatusBadge status={d.status} /></div>
              <p className="text-xs text-gray-500 mt-1">{d.riderName} · {d.blockName} {d.unitNumber} · {d.tenantName}</p>
              {d.packageDescription && <p className="text-xs text-gray-500">Package: {d.packageDescription}</p>}
              <p className="text-xs text-gray-400 mt-1">Received {format(d.receivedAt.toDate(), 'd MMM, h:mm a')}</p>
              {canManage && d.status === 'RECEIVED' && (
                <div className="flex gap-2 mt-3">
                  <button className="btn-secondary text-xs" disabled={busy === d.deliveryId} onClick={() => act(() => markCollected(d, actor), d.deliveryId)}>Mark collected</button>
                  <button className="btn-secondary text-xs" disabled={busy === d.deliveryId} onClick={() => act(() => markHeld(d, actor), d.deliveryId)}>Hold</button>
                  <button className="btn-secondary text-xs" disabled={busy === d.deliveryId} onClick={() => act(() => markReturned(d, actor), d.deliveryId)}>Return</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: IncidentsPage** — `src/features/property/IncidentsPage.tsx`

```tsx
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useIncidents } from '../../hooks/useIncidents'
import { setIncidentStatus, addIncidentNote } from '../../services/incidentService'
import { canResolveIncidents } from '../../domain/permissions'
import { IncidentSeverityBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Incident } from '../../types'

const STATUSES: Incident['status'][] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']

export default function IncidentsPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const canResolve = canResolveIncidents(user?.role)
  const { incidents, loading } = useIncidents(user?.propertyId)
  const [selected, setSelected] = useState<Incident | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const changeStatus = async (i: Incident, s: Incident['status']) => {
    setBusy(true)
    try { await setIncidentStatus(i, s, actor); toast.success(`Incident → ${s}`); setSelected(null) }
    catch (e) { console.error(e); toast.error('Update failed') } finally { setBusy(false) }
  }
  const saveNote = async (i: Incident) => {
    if (!note.trim()) return
    setBusy(true)
    try { await addIncidentNote(i, note.trim(), actor); toast.success('Note added'); setNote(''); setSelected(null) }
    catch (e) { console.error(e); toast.error('Failed') } finally { setBusy(false) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <h1 className="page-title">Incidents</h1>
      {incidents.length === 0 ? <EmptyState icon={AlertTriangle} title="No incidents" /> : (
        <div className="space-y-3">
          {incidents.map(i => (
            <button key={i.incidentId} onClick={() => setSelected(i)} className="card p-4 w-full text-left hover:shadow-card-hover">
              <div className="flex items-center justify-between"><p className="font-medium text-gray-900">{i.type.replace(/_/g, ' ')}</p><IncidentSeverityBadge severity={i.severity} /></div>
              <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{i.description}</p>
              <p className="text-xs text-gray-400 mt-1">{format(i.createdAt.toDate(), 'd MMM, h:mm a')} · {i.status}</p>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? selected.type.replace(/_/g, ' ') : ''}>
        {selected && (
          <div className="space-y-4 text-sm">
            <p className="whitespace-pre-line text-gray-700">{selected.description}</p>
            <p className="text-xs text-gray-400">Reported by {selected.guardName} · {format(selected.createdAt.toDate(), 'd MMM yyyy, h:mm a')} · {selected.status}</p>
            {canResolve && (<>
              <div>
                <p className="label">Change status</p>
                <div className="flex gap-2 flex-wrap">{STATUSES.map(s => <button key={s} disabled={busy || s === selected.status} onClick={() => changeStatus(selected, s)} className="btn-secondary text-xs disabled:opacity-40">{s}</button>)}</div>
              </div>
              <div>
                <p className="label">Add note</p>
                <textarea rows={2} className="input resize-none" value={note} onChange={e => setNote(e.target.value)} />
                <button className="btn-primary text-xs mt-2" disabled={busy} onClick={() => saveNote(selected)}>Add note</button>
              </div>
            </>)}
          </div>
        )}
      </Modal>
    </div>
  )
}
```

- [ ] **Step 3: Build + commit**

Run: `npm run build` → PASS
```bash
git add src/features/property/DeliveriesPage.tsx src/features/property/IncidentsPage.tsx
git commit -m "feat(caretaker): deliveries management + incident status/notes"
```

---

## Task 13: StaffPage + SettingsPage + ReportsPlaceholder

**Files:**
- Modify: `src/features/property/StaffPage.tsx`, `SettingsPage.tsx`, `ReportsPlaceholder.tsx`

- [ ] **Step 1: StaffPage** — `src/features/property/StaffPage.tsx`

```tsx
import { useAuth } from '../../contexts/AuthContext'
import { useStaff } from '../../hooks/useStaff'
import { StaffStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Users } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = { SECURITY_GUARD: 'Security Guard', CARETAKER: 'Caretaker', PROPERTY_MANAGER: 'Property Manager' }

export default function StaffPage() {
  const { user } = useAuth()
  const { staff, onShift, loading } = useStaff(user?.propertyId)
  if (loading) return <PageLoader />
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div><h1 className="page-title">Staff</h1><p className="page-subtitle">Roster for your property (managed by the administrator).</p></div>
      {staff.length === 0 ? <EmptyState icon={Users} title="No staff yet" /> : (
        <div className="card divide-y divide-gray-50">
          {staff.map(s => (
            <div key={s.uid} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{s.name}</span>{s.role === 'SECURITY_GUARD' && onShift.has(s.uid) && <span className="badge badge-green text-xs">On shift</span>}</div>
                <p className="text-xs text-gray-500">{ROLE_LABEL[s.role] ?? s.role} · {s.phone ?? s.email}</p>
              </div>
              <StaffStatusBadge status={s.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: SettingsPage** — `src/features/property/SettingsPage.tsx`

```tsx
import { useEffect, useState } from 'react'
import { getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { propertyDoc } from '../../firebase/collections'
import { useAuth } from '../../contexts/AuthContext'
import { canManageUnits } from '../../domain/permissions'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { Spinner } from '../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { Property } from '../../types'

export default function SettingsPage() {
  const { user } = useAuth()
  const canEdit = canManageUnits(user?.role)
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ primaryContact: '', phone: '', email: '', address: '' })

  useEffect(() => {
    if (!user?.propertyId) { setLoading(false); return }
    getDoc(propertyDoc(user.propertyId)).then(s => {
      if (s.exists()) { const p = s.data() as Property; setProperty(p); setForm({ primaryContact: p.primaryContact ?? '', phone: p.phone ?? '', email: p.email ?? '', address: p.address ?? '' }) }
    }).catch(e => console.error(e)).finally(() => setLoading(false))
  }, [user?.propertyId])

  const save = async () => {
    if (!user?.propertyId) return
    setBusy(true)
    try { await updateDoc(propertyDoc(user.propertyId), { ...form, updatedAt: serverTimestamp() }); toast.success('Settings saved') }
    catch (e) { console.error(e); toast.error('Save failed') } finally { setBusy(false) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="page-title">Settings</h1>
      <div className="card p-5 space-y-4">
        <div><p className="text-xs text-gray-500">Property</p><p className="font-semibold text-gray-900">{property?.name ?? '—'}</p></div>
        <div><label className="label">Primary contact</label><input className="input" value={form.primaryContact} onChange={e => setForm({ ...form, primaryContact: e.target.value })} disabled={!canEdit} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} disabled={!canEdit} /></div>
          <div><label className="label">Email</label><input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!canEdit} /></div>
        </div>
        <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} disabled={!canEdit} /></div>
        {canEdit && <button className="btn-primary" disabled={busy} onClick={save}>{busy && <Spinner size="sm" className="text-white" />}Save settings</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: ReportsPlaceholder** — `src/features/property/ReportsPlaceholder.tsx`

```tsx
import { BarChart3 } from 'lucide-react'

export default function ReportsPlaceholder() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="page-title">Reports</h1>
      <div className="card p-10 text-center mt-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lango-light mb-4"><BarChart3 className="w-8 h-8 text-lango-primary" /></div>
        <h2 className="text-lg font-semibold text-gray-900">Reports are coming soon</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">Daily/monthly visitor, delivery, incident, occupancy and guard-activity reports with PDF & Excel export are being built as a dedicated reporting module.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Build + commit**

Run: `npm run build` → PASS
```bash
git add src/features/property/StaffPage.tsx src/features/property/SettingsPage.tsx src/features/property/ReportsPlaceholder.tsx
git commit -m "feat(caretaker): staff roster, settings, reports placeholder"
```

---

## Task 14: Final verification

- [ ] **Step 1: Full build + unit tests**

Run: `npm run build` → PASS
Run: `npm test` → PASS (existing + permissions + visitorFilters)

- [ ] **Step 2: Rules tests**

Run: `npm run test:rules` → PASS (prior suites + caretaker-boundaries). If the emulator can't start in this environment, note it and confirm by inspection.

- [ ] **Step 3: Manual pass (`npm run dev`, log in as caretaker)**

Verify: every sidebar tab opens its page (no dead-redirect); Visitors filters + detail work; add a tenant to a vacant unit → unit shows OCCUPIED + tenant appears; edit a tenant; move a tenant out → unit shows VACANT and the unit's detail shows the tenant under "Previous tenants"; change a unit's status; mark a delivery collected/held/returned; open an incident → change status + add a note; Staff roster shows read-only; Settings edits save; Reports shows the placeholder.

- [ ] **Step 4: Final commit (if any manual-fix tweaks)**

```bash
git add -A && git commit -m "chore(caretaker): final verification tweaks" # only if changes were needed
```

---

## Self-Review (coverage vs spec)

- Permissions (§3.2) → Task 1. Occupancy model open-on-assign/close-on-move-out (§3.4, decision) → Tasks 2–3. Tenant CRUD + atomic lifecycle + preserved history (§5 Tenants, §8) → Tasks 3, 10. Unit status + occupancy history view (§9) → Tasks 4, 11.
- Visitors log + client filters (§5, decision) → Tasks 4, 5, 9. Deliveries management (§23) → Tasks 4, 12. Incidents notes/status/resolve (§24) → Tasks 4, 12. Staff read-only roster + shift activity (decision) → Tasks 4, 13. Settings (§5 Settings) → Task 13. Reports placeholder (decision) → Tasks 8, 13.
- Reuse via self-contained feature pages under `src/features/property/` (§3.1) → Tasks 8–13. Audit on every mutation (§6) → Tasks 2–4 services all call `logAudit`. One rules change + indexes (§7) → Task 1. Emulator + unit tests (§8) → Tasks 1, 5, 7. Routes kill the dead-redirect (§4, Success Criteria) → Task 8.
- No mock data as source; Reports is the only placeholder and it is explicit/labeled.
