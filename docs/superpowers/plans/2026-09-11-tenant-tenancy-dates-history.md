# Tenant Tenancy Dates & History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let managers set an editable move-in date when adding/editing a tenant, set an editable vacate date when moving a tenant out, and view full details (including tenancy length) for any current or past tenant.

**Architecture:** Pure UI + light service changes over an existing schema. `moveInDate`/`moveOutDate`/`MOVED_OUT` and per-tenancy occupancy records already exist; we add date converters, thread real dates through `moveOutTenant`/`updateTenant` (syncing the open occupancy record), and add form fields, a move-out dialog, a detail drawer, and inline row dates.

**Tech Stack:** React + TypeScript, Firebase Firestore (`Timestamp`), react-hook-form + zod, Vitest, Tailwind, lucide-react, react-hot-toast.

---

## File Structure

- `src/utils/format.ts` (modify) — add date converters + `tenancyLength`.
- `src/utils/format.test.ts` (modify) — tests for the new helpers.
- `src/services/tenantService.ts` (modify) — `moveOutTenant` date param + guard; `updateTenant`/`UpdateTenantPatch` move-in date + occupancy sync.
- `src/features/property/TenantFormDrawer.tsx` (modify) — move-in date field (add + edit).
- `src/features/property/MoveOutDialog.tsx` (create) — move-out modal with vacate-date picker.
- `src/features/property/TenantDetailDrawer.tsx` (create) — read-only full-details modal.
- `src/features/property/TenantsPage.tsx` (modify) — inline row dates, open detail drawer, wire `MoveOutDialog`.

---

## Task 1: Date helpers in `format.ts`

**Files:**
- Modify: `src/utils/format.ts`
- Test: `src/utils/format.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/utils/format.test.ts` (create the file with this content if it does not exist; if it exists, append these imports/tests to the existing suite):

```typescript
import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { tsToInputDate, inputDateToDate, formatMonthYear, formatDateLong, tenancyLength } from './format'

describe('date helpers', () => {
  const jan2025 = new Date(2025, 0, 12) // 12 Jan 2025, local

  it('tsToInputDate formats a Date as yyyy-mm-dd', () => {
    expect(tsToInputDate(jan2025)).toBe('2025-01-12')
  })

  it('tsToInputDate accepts a Firestore Timestamp', () => {
    expect(tsToInputDate(Timestamp.fromDate(jan2025))).toBe('2025-01-12')
  })

  it('inputDateToDate round-trips with tsToInputDate', () => {
    expect(tsToInputDate(inputDateToDate('2025-01-12'))).toBe('2025-01-12')
  })

  it('formatMonthYear gives "Jan 2025"', () => {
    expect(formatMonthYear(jan2025)).toBe('Jan 2025')
  })

  it('formatDateLong gives "12 Jan 2025"', () => {
    expect(formatDateLong(jan2025)).toBe('12 Jan 2025')
  })

  it('tenancyLength across a year and a quarter', () => {
    expect(tenancyLength(new Date(2024, 0, 1), new Date(2025, 3, 1))).toBe('1 yr 3 mo')
  })

  it('tenancyLength under a month reads in days', () => {
    expect(tenancyLength(new Date(2025, 0, 1), new Date(2025, 0, 10))).toBe('9 days')
  })

  it('tenancyLength same day reads "1 day"', () => {
    expect(tenancyLength(new Date(2025, 0, 1), new Date(2025, 0, 1))).toBe('1 day')
  })

  it('tenancyLength whole months only omits the year part when < 1yr', () => {
    expect(tenancyLength(new Date(2025, 0, 1), new Date(2025, 4, 1))).toBe('4 mo')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Documents/Lango && npx vitest run src/utils/format.test.ts`
Expected: FAIL — `tsToInputDate is not a function` (or import errors).

- [ ] **Step 3: Implement the helpers**

Append to `src/utils/format.ts`:

```typescript
import { Timestamp } from 'firebase/firestore'

type DateLike = Timestamp | Date

function toDate(v: DateLike): Date {
  return v instanceof Date ? v : v.toDate()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** yyyy-mm-dd (local) for <input type="date">. */
export function tsToInputDate(v: DateLike): string {
  const d = toDate(v)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Parse a yyyy-mm-dd string to a local-midnight Date. */
export function inputDateToDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** e.g. "Jan 2025". */
export function formatMonthYear(v: DateLike): string {
  const d = toDate(v)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** e.g. "12 Jan 2025". */
export function formatDateLong(v: DateLike): string {
  const d = toDate(v)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Human tenancy length. `to` defaults to now (still-active tenancy). */
export function tenancyLength(from: DateLike, to?: DateLike | null): string {
  const start = toDate(from)
  const end = to ? toDate(to) : new Date()
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
  if (days < 30) return days <= 1 ? '1 day' : `${days} days`
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) months -= 1
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} mo`
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/Documents/Lango && npx vitest run src/utils/format.test.ts`
Expected: PASS — all date-helper tests green.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Lango
git add src/utils/format.ts src/utils/format.test.ts
git commit -m "feat(utils): tenancy date converters and tenancyLength helper"
```

---

## Task 2: Thread vacate date + guard through `moveOutTenant`

**Files:**
- Modify: `src/services/tenantService.ts:94-114`

- [ ] **Step 1: Update the `moveOutTenant` signature and body**

Replace the existing `moveOutTenant` function (lines 94-114) with:

```typescript
/** Moves a tenant out on `moveOutDate`: tenant→MOVED_OUT, unit→VACANT, close the open occupancy — atomically. Never deletes. */
export async function moveOutTenant(tenant: Tenant, actor: Pick<AppUser, 'uid' | 'name' | 'role'>, moveOutDate: Date): Promise<void> {
  if (moveOutDate.getTime() < tenant.moveInDate.toDate().getTime()) {
    throw new Error('Vacate date cannot be before the move-in date.')
  }
  const moveOutTs = Timestamp.fromDate(moveOutDate)
  // Find the open occupancy via the indexed propertyId+unitId pair, then match tenant + null moveOut in code.
  const occSnap = await getDocs(query(occupanciesCol,
    where('propertyId', '==', tenant.propertyId), where('unitId', '==', tenant.unitId)))
  const batch = writeBatch(db)
  batch.update(tenantDoc(tenant.tenantId), {
    status: 'MOVED_OUT', moveOutDate: moveOutTs, updatedAt: serverTimestamp(),
  })
  batch.update(doc(unitsCol, tenant.unitId), {
    status: 'VACANT', currentTenantId: null, currentTenantName: null, updatedAt: serverTimestamp(),
  })
  occSnap.docs
    .filter(d => { const data = d.data(); return data.tenantId === tenant.tenantId && data.moveOutDate === null })
    .forEach(d => batch.update(d.ref, { moveOutDate: moveOutTs }))
  await batch.commit()
  await logAudit({
    actor, propertyId: tenant.propertyId, action: 'TENANT_MOVED_OUT',
    entityType: 'tenant', entityId: tenant.tenantId,
    description: `Moved out ${tenant.fullName} from ${tenant.unitNumber}`,
  })
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd ~/Documents/Lango && npx tsc --noEmit`
Expected: ONE error only, in `src/features/property/TenantsPage.tsx` — `Expected 3 arguments, but got 2` at the `moveOutTenant(t, actor)` call. (That call is fixed in Task 6.) No errors inside `tenantService.ts`.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/Lango
git add src/services/tenantService.ts
git commit -m "feat(tenants): moveOutTenant takes an editable vacate date with guard"
```

---

## Task 3: Editable move-in date in `updateTenant`

**Files:**
- Modify: `src/services/tenantService.ts:80-91`

- [ ] **Step 1: Extend `UpdateTenantPatch` and `updateTenant`**

Replace the existing `UpdateTenantPatch` interface and `updateTenant` function (lines 80-91) with:

```typescript
export interface UpdateTenantPatch {
  fullName?: string; phoneNumber?: string; whatsappNumber?: string
  email?: string; nationalId?: string; notes?: string
  moveInDate?: Date
}

export async function updateTenant(tenant: Tenant, patch: UpdateTenantPatch, actor: Pick<AppUser, 'uid' | 'name' | 'role'>): Promise<void> {
  const { moveInDate, ...rest } = patch
  const batch = writeBatch(db)
  const tenantPatch: Record<string, unknown> = { ...rest, updatedAt: serverTimestamp() }
  if (moveInDate) {
    const moveInTs = Timestamp.fromDate(moveInDate)
    tenantPatch.moveInDate = moveInTs
    // Keep the still-open occupancy record's move-in date consistent with the tenant.
    if (tenant.status === 'ACTIVE') {
      const occSnap = await getDocs(query(occupanciesCol,
        where('propertyId', '==', tenant.propertyId), where('unitId', '==', tenant.unitId)))
      occSnap.docs
        .filter(d => { const data = d.data(); return data.tenantId === tenant.tenantId && data.moveOutDate === null })
        .forEach(d => batch.update(d.ref, { moveInDate: moveInTs }))
    }
  }
  batch.update(tenantDoc(tenant.tenantId), tenantPatch)
  await batch.commit()
  await logAudit({
    actor, propertyId: tenant.propertyId, action: 'TENANT_UPDATED',
    entityType: 'tenant', entityId: tenant.tenantId, description: `Updated ${tenant.fullName}`,
  })
}
```

Note: `writeBatch`, `getDocs`, `query`, `where`, `occupanciesCol`, `Timestamp` are already imported at the top of this file (used by `moveOutTenant`/`assignTenantToUnit`).

- [ ] **Step 2: Verify it type-checks**

Run: `cd ~/Documents/Lango && npx tsc --noEmit`
Expected: Still only the one known `TenantsPage.tsx` argument error from Task 2. No new errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/Lango
git add src/services/tenantService.ts
git commit -m "feat(tenants): allow editing move-in date, syncing open occupancy record"
```

---

## Task 4: Move-in date field in `TenantFormDrawer`

**Files:**
- Modify: `src/features/property/TenantFormDrawer.tsx`

- [ ] **Step 1: Add the import for the date helper**

At the top of the file, update the format import (add if no import from `../../utils/format` exists):

```typescript
import { tsToInputDate, inputDateToDate } from '../../utils/format'
```

- [ ] **Step 2: Add `moveInDate` to the schema**

Replace the `schema` definition (lines 11-18) with:

```typescript
const schema = z.object({
  fullName: z.string().min(2, 'Name required'),
  phoneNumber: z.string().min(9, 'Phone required'),
  whatsappNumber: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  nationalId: z.string().optional().or(z.literal('')),
  moveInDate: z.string().min(1, 'Move-in date required'),
  notes: z.string().optional(),
})
```

- [ ] **Step 3: Default the field in add and edit modes**

Replace the `useForm` `defaultValues` block (lines 52-57) with:

```typescript
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { fullName: editing.fullName, phoneNumber: editing.phoneNumber, whatsappNumber: editing.whatsappNumber, email: editing.email ?? '', nationalId: editing.nationalId ?? '', moveInDate: tsToInputDate(editing.moveInDate), notes: editing.notes ?? '' }
      : { moveInDate: tsToInputDate(new Date()) },
  })
```

- [ ] **Step 4: Pass the parsed date on submit**

Replace the `submit` function body's `if (editing) { ... } else { ... }` block (lines 63-71) with:

```typescript
      const moveInDate = inputDateToDate(d.moveInDate)
      if (editing) {
        await updateTenant(editing, { fullName: d.fullName, phoneNumber: d.phoneNumber, whatsappNumber, email: d.email, nationalId: d.nationalId, notes: d.notes, moveInDate }, actor)
        toast.success('Tenant updated')
      } else {
        const unit = vacantUnits.find(u => u.unitId === unitId)
        if (!unit) { toast.error('Select a vacant unit'); setBusy(false); return }
        await assignTenantToUnit({ propertyId, actor, unit, fullName: d.fullName, phoneNumber: d.phoneNumber, whatsappNumber, email: d.email, nationalId: d.nationalId, moveInDate, notes: d.notes })
        toast.success('Tenant added')
      }
```

- [ ] **Step 5: Render the date input**

Insert this block immediately after the National ID grid `</div>` (after line 109, before the Notes field on line 110):

```tsx
        <div><label className="label">Move-in date *</label><input type="date" className="input" {...form.register('moveInDate')} />{form.formState.errors.moveInDate && <p className="form-error">{form.formState.errors.moveInDate.message}</p>}</div>
```

- [ ] **Step 6: Verify it type-checks**

Run: `cd ~/Documents/Lango && npx tsc --noEmit`
Expected: Still only the one known `TenantsPage.tsx` `moveOutTenant` argument error. No errors in `TenantFormDrawer.tsx`.

- [ ] **Step 7: Commit**

```bash
cd ~/Documents/Lango
git add src/features/property/TenantFormDrawer.tsx
git commit -m "feat(tenants): editable move-in date field in add/edit form"
```

---

## Task 5: `MoveOutDialog` component

**Files:**
- Create: `src/features/property/MoveOutDialog.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/property/MoveOutDialog.tsx`:

```tsx
import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { tsToInputDate, inputDateToDate } from '../../utils/format'
import type { Tenant } from '../../types'

interface Props {
  tenant: Tenant | null
  loading: boolean
  onClose: () => void
  onConfirm: (moveOutDate: Date) => void
}

export function MoveOutDialog({ tenant, loading, onClose, onConfirm }: Props) {
  const [date, setDate] = useState(() => tsToInputDate(new Date()))
  if (!tenant) return null
  return (
    <Modal
      isOpen={!!tenant}
      onClose={onClose}
      title="Move out tenant"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
          <button onClick={() => onConfirm(inputDateToDate(date))} className="btn-danger" disabled={loading || !date}>
            {loading ? 'Please wait...' : 'Move out'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">Move <span className="font-medium">{tenant.fullName}</span> out of {tenant.unitNumber}? The unit becomes vacant; history is preserved.</p>
      <div className="mt-4">
        <label className="label">Vacate date</label>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd ~/Documents/Lango && npx tsc --noEmit`
Expected: Still only the known `TenantsPage.tsx` `moveOutTenant` argument error. No errors in `MoveOutDialog.tsx`.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/Lango
git add src/features/property/MoveOutDialog.tsx
git commit -m "feat(tenants): MoveOutDialog with editable vacate date"
```

---

## Task 6: `TenantDetailDrawer` component

**Files:**
- Create: `src/features/property/TenantDetailDrawer.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/property/TenantDetailDrawer.tsx`:

```tsx
import { Modal } from '../../components/ui/Modal'
import { TenantStatusBadge } from '../../components/ui/StatusBadge'
import { formatDateLong, tenancyLength } from '../../utils/format'
import type { Tenant } from '../../types'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  )
}

export function TenantDetailDrawer({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  if (!tenant) return null
  const activeDash = tenant.status === 'ACTIVE'
  return (
    <Modal isOpen={!!tenant} onClose={onClose} title={tenant.fullName}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 pb-2"><TenantStatusBadge status={tenant.status} /></div>
        <Row label="Unit" value={`${tenant.blockName ? tenant.blockName + ' • ' : ''}${tenant.unitNumber}`} />
        <Row label="Phone" value={tenant.phoneNumber} />
        {tenant.whatsappNumber && tenant.whatsappNumber !== tenant.phoneNumber && <Row label="WhatsApp" value={tenant.whatsappNumber} />}
        {tenant.email && <Row label="Email" value={tenant.email} />}
        {tenant.nationalId && <Row label="National ID" value={tenant.nationalId} />}
        <Row label="Move-in date" value={formatDateLong(tenant.moveInDate)} />
        <Row label="Move-out date" value={tenant.moveOutDate ? formatDateLong(tenant.moveOutDate) : '—'} />
        <Row label={activeDash ? 'Tenancy so far' : 'Tenancy length'} value={tenancyLength(tenant.moveInDate, tenant.moveOutDate)} />
        {tenant.emergencyContact && <Row label="Emergency contact" value={`${tenant.emergencyContact.name} (${tenant.emergencyContact.relationship}) · ${tenant.emergencyContact.phone}`} />}
        {tenant.notes && (
          <div className="pt-3">
            <p className="text-sm text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{tenant.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd ~/Documents/Lango && npx tsc --noEmit`
Expected: Still only the known `TenantsPage.tsx` `moveOutTenant` argument error. No errors in `TenantDetailDrawer.tsx`.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/Lango
git add src/features/property/TenantDetailDrawer.tsx
git commit -m "feat(tenants): read-only TenantDetailDrawer with full details"
```

---

## Task 7: Wire dates, detail drawer, and MoveOutDialog into `TenantsPage`

**Files:**
- Modify: `src/features/property/TenantsPage.tsx`

- [ ] **Step 1: Update imports**

Replace the import of `moveOutTenant` line (line 5) and the `ConfirmDialog` import (line 9), and add the new ones. After edits the relevant imports read:

```typescript
import { filterTenants, moveOutTenant } from '../../services/tenantService'
```
(unchanged — keep it)

Replace line 9:
```typescript
import { ConfirmDialog } from '../../components/ui/Modal'
```
with:
```typescript
import { MoveOutDialog } from './MoveOutDialog'
import { TenantDetailDrawer } from './TenantDetailDrawer'
import { formatMonthYear } from '../../utils/format'
```

- [ ] **Step 2: Add detail-drawer state**

After the `moveOut` state line (line 26), add:

```typescript
  const [detail, setDetail] = useState<Tenant | null>(null)
```

- [ ] **Step 3: Update `doMoveOut` to take a date**

Replace the `doMoveOut` function (lines 35-39) with:

```typescript
  const doMoveOut = async (t: Tenant, moveOutDate: Date) => {
    setBusy(true)
    try { await moveOutTenant(t, actor, moveOutDate); toast.success(`${t.fullName} moved out`); reload(); reloadUnits() }
    catch (e) { console.error(e); toast.error(e instanceof Error ? e.message : 'Move-out failed') } finally { setBusy(false); setMoveOut(null) }
  }
```

- [ ] **Step 4: Show dates in the row and make it clickable**

Replace the row's info block (lines 98-101) with:

```tsx
              <button type="button" className="min-w-0 text-left" onClick={() => setDetail(t)}>
                <div className="flex items-center gap-2"><span className="font-medium text-gray-900 truncate hover:text-lango-primary">{t.fullName}</span><TenantStatusBadge status={t.status} /></div>
                <p className="text-xs text-gray-500 truncate">{t.blockName} • {t.unitNumber} · {t.phoneNumber}</p>
                <p className="text-xs text-gray-400 truncate">
                  {t.status === 'MOVED_OUT' && t.moveOutDate
                    ? `${formatMonthYear(t.moveInDate)} – ${formatMonthYear(t.moveOutDate)}`
                    : `Since ${formatMonthYear(t.moveInDate)}`}
                </p>
              </button>
```

- [ ] **Step 5: Replace the ConfirmDialog with MoveOutDialog and mount the detail drawer**

Replace the `<ConfirmDialog ... />` element (lines 115-116) with:

```tsx
      <MoveOutDialog tenant={moveOut} loading={busy} onClose={() => setMoveOut(null)} onConfirm={(date) => moveOut && doMoveOut(moveOut, date)} />
      <TenantDetailDrawer tenant={detail} onClose={() => setDetail(null)} />
```

- [ ] **Step 6: Verify the whole project type-checks clean**

Run: `cd ~/Documents/Lango && npx tsc --noEmit`
Expected: PASS — zero errors (the previously-known `moveOutTenant` argument error is now resolved).

- [ ] **Step 7: Run the full test suite**

Run: `cd ~/Documents/Lango && npx vitest run`
Expected: PASS — including the new `format.test.ts` date-helper tests.

- [ ] **Step 8: Commit**

```bash
cd ~/Documents/Lango
git add src/features/property/TenantsPage.tsx
git commit -m "feat(tenants): inline tenancy dates, detail drawer, dated move-out"
```

---

## Task 8: Manual verification

**Files:** none (manual QA).

- [ ] **Step 1: Run the app**

Run: `cd ~/Documents/Lango && npm run dev`

- [ ] **Step 2: Verify the flows**

- Add a tenant with a **backdated** move-in date → row shows `Since <month year>` matching the chosen date.
- Open the tenant (click the row) → detail drawer shows move-in date, move-out `—`, and a "Tenancy so far" length.
- Edit the tenant, change the move-in date → detail drawer + row update.
- Move the tenant out with a chosen vacate date → toast success; switch the filter to **Moved out** → row shows `<move-in> – <vacate>`; detail drawer shows both dates + total tenancy length.
- Attempt a move-out with a vacate date **before** the move-in date → error toast "Vacate date cannot be before the move-in date." and no change.

- [ ] **Step 3: Confirm no regression in the Moved-out filter**

Switch filter Active / Moved out / All statuses → lists populate as before.
