# Visitor Detail Fields Implementation Plan (Sub-project A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add gate-pass/badge number, richer vehicle details (type + make/colour), and an "items brought in" note to the guest-registration flow, persisted for both visitors and deliveries and shown on review, success, currently-inside, and history views.

**Architecture:** Additive fields threaded through the existing discriminated-union schema (`registerSchemas.ts`), the two write services (`registerVisitor`, `registerDelivery`), the 3-step form, and the read surfaces. No new collections or workflows.

**Tech Stack:** React + TypeScript, Firebase Firestore, react-hook-form + zod, Vitest, Tailwind, lucide-react.

**Verification commands (this repo):**
- Type-check: `npx tsc -p tsconfig.app.json --noEmit` (root `tsc --noEmit` checks nothing — project references).
- Tests: `npx vitest run <path>`.

---

## File Structure

- `src/types/index.ts` — `VehicleType` union; new fields on `Visitor` and `Delivery`.
- `src/domain/registerSchemas.ts` (+ `registerSchemas.test.ts`) — new optional schema fields.
- `src/services/visitorService.ts` — `RegisterVisitorArgs` + write.
- `src/services/deliveryService.ts` — `RegisterDeliveryArgs` + write.
- `src/pages/gate/RegisterGuestPage.tsx` — capture inputs, submit threading, success summary, review rows.
- `src/pages/gate/CurrentlyInsidePage.tsx` — reconciliation line per row.
- `src/features/property/VisitorsPage.tsx` — detail-modal rows.

---

## Task 1: Types — `VehicleType` + new fields

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add the `VehicleType` union**

Immediately above the `export interface Visitor {` line, add:

```typescript
export type VehicleType = 'CAR' | 'MOTORBIKE' | 'VAN' | 'TRUCK' | 'OTHER'
```

- [ ] **Step 2: Add fields to `Visitor`**

In `export interface Visitor { ... }`, directly after the existing line `vehicleRegistration?: string  // any type — vehicle plate`, add:

```typescript
  vehicleType?: VehicleType | null   // complements the plate
  vehicleDescription?: string        // make / colour, e.g. "white Toyota"
  gatePassNumber?: string            // physical badge/pass handed over at entry
  itemsBroughtIn?: string            // notable tools/equipment, checked on exit
```

- [ ] **Step 3: Add fields to `Delivery`**

In `export interface Delivery { ... }`, directly after its existing line `vehicleRegistration?: string`, add:

```typescript
  vehicleType?: VehicleType | null
  vehicleDescription?: string
  gatePassNumber?: string
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors (fields are optional; no consumers require them yet).

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Lango
git add src/types/index.ts
git commit -m "feat(types): VehicleType and visitor/delivery detail fields"
```

---

## Task 2: Schema fields + tests (TDD)

**Files:**
- Modify: `src/domain/registerSchemas.ts`
- Test: `src/domain/registerSchemas.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/domain/registerSchemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { registerGuestSchema } from './registerSchemas'

const baseFriendly = { visitType: 'FRIENDLY_VISIT', visitorName: 'Jane', phone: '0712345678', blockId: 'b1', unitId: 'u1' }

describe('visitor detail fields', () => {
  it('accepts gatePassNumber, vehicleType, vehicleDescription, itemsBroughtIn on friendly', () => {
    const r = registerGuestSchema.safeParse({ ...baseFriendly, gatePassNumber: 'P12', vehicleType: 'CAR', vehicleDescription: 'white Toyota', itemsBroughtIn: 'laptop' })
    expect(r.success).toBe(true)
  })

  it('accepts omitting all new fields', () => {
    expect(registerGuestSchema.safeParse(baseFriendly).success).toBe(true)
  })

  it('rejects an invalid vehicleType', () => {
    expect(registerGuestSchema.safeParse({ ...baseFriendly, vehicleType: 'PLANE' }).success).toBe(false)
  })

  it('treats an empty vehicleType string as omitted (blank select)', () => {
    const r = registerGuestSchema.safeParse({ ...baseFriendly, vehicleType: '' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.vehicleType).toBeUndefined()
  })

  it('accepts itemsBroughtIn on work and service', () => {
    expect(registerGuestSchema.safeParse({ visitType: 'WORK', visitorName: 'Bob', phone: '0712345678', blockId: 'b1', unitId: 'u1', workType: 'Plumbing', itemsBroughtIn: 'wrench' }).success).toBe(true)
    expect(registerGuestSchema.safeParse({ visitType: 'SERVICE_PROVIDER', visitorName: 'Sue', phone: '0712345678', blockId: 'b1', unitId: 'u1', serviceType: 'Internet', itemsBroughtIn: 'router' }).success).toBe(true)
  })

  it('strips itemsBroughtIn from a delivery (not part of its schema)', () => {
    const r = registerGuestSchema.safeParse({ visitType: 'DELIVERY', visitorName: 'Rider', phone: '0712345678', blockId: 'b1', unitId: 'u1', company: 'Glovo', itemsBroughtIn: 'x', gatePassNumber: 'P9' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect('itemsBroughtIn' in r.data).toBe(false)
      expect('gatePassNumber' in r.data).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/registerSchemas.test.ts`
Expected: FAIL — the "rejects an invalid vehicleType" test fails (currently `vehicleType` is stripped as unknown, so it parses successfully), and the itemsBroughtIn assertions fail.

- [ ] **Step 3: Add fields to the schema**

In `src/domain/registerSchemas.ts`, replace the `guest` base object (currently ending at the `notes` line) with:

```typescript
const guest = {
  visitorName: z.string().min(2, 'Name is required'),
  phone: z.string().min(9, 'Phone is required'),
  idNumber: z.string().optional(),
  nationality: z.string().optional(),
  vehicleRegistration: z.string().optional(),
  vehicleType: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : v),
    z.enum(['CAR', 'MOTORBIKE', 'VAN', 'TRUCK', 'OTHER']).optional(),
  ),
  vehicleDescription: z.string().optional(),
  gatePassNumber: z.string().optional(),
  blockId: z.string().min(1, 'Select a block'),
  unitId: z.string().min(1, 'Select a unit'),
  notes: z.string().optional(),
}
```

Then add `itemsBroughtIn: z.string().optional(),` inside the `friendly`, `work`, and `service` `z.object({ ... })` definitions (NOT `delivery`). For example `friendly` becomes:

```typescript
const friendly = z.object({
  ...guest, visitType: z.literal('FRIENDLY_VISIT'), reason: z.string().optional(),
  company: z.string().optional(),
  itemsBroughtIn: z.string().optional(),
  numberOfVisitors: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1).optional(),
  ),
})
```

Add the same `itemsBroughtIn: z.string().optional(),` line to `work` (after `expectedDurationMins`) and `service` (after `expectedDurationMins`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/registerSchemas.test.ts`
Expected: PASS — all new tests plus the pre-existing ones.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Lango
git add src/domain/registerSchemas.ts src/domain/registerSchemas.test.ts
git commit -m "feat(schema): capture gate pass, vehicle type/description, items brought in"
```

---

## Task 3: Services — persist the new fields

**Files:**
- Modify: `src/services/visitorService.ts`
- Modify: `src/services/deliveryService.ts`

- [ ] **Step 1: Extend `RegisterVisitorArgs` and import `VehicleType`**

In `src/services/visitorService.ts`, change the type import on line 7 from:

```typescript
import type { AppUser, Visitor, VisitType } from '../types'
```
to:
```typescript
import type { AppUser, Visitor, VisitType, VehicleType } from '../types'
```

Then in `RegisterVisitorArgs`, directly after the line `vehicleRegistration?: string`, add:

```typescript
  vehicleType?: VehicleType
  vehicleDescription?: string
  gatePassNumber?: string
  itemsBroughtIn?: string
```

- [ ] **Step 2: Persist them in `registerVisitor`**

In the `addDoc(visitorsCol, { ... })` object, directly after the line `vehicleRegistration: a.vehicleRegistration ?? '',`, add:

```typescript
    vehicleType: a.vehicleType ?? null,
    vehicleDescription: a.vehicleDescription ?? '',
    gatePassNumber: a.gatePassNumber ?? '',
    itemsBroughtIn: a.itemsBroughtIn ?? '',
```

- [ ] **Step 3: Extend `RegisterDeliveryArgs` and import `VehicleType`**

In `src/services/deliveryService.ts`, change the type import on line 7 from:

```typescript
import type { AppUser, Delivery, DeliveryStatus } from '../types'
```
to:
```typescript
import type { AppUser, Delivery, DeliveryStatus, VehicleType } from '../types'
```

Then in `RegisterDeliveryArgs`, directly after the line `vehicleRegistration?: string`, add:

```typescript
  vehicleType?: VehicleType
  vehicleDescription?: string
  gatePassNumber?: string
```

- [ ] **Step 4: Persist them in `registerDelivery`**

In the `addDoc(deliveriesCol, { ... })` object, directly after the line `vehicleRegistration: a.vehicleRegistration ?? '',`, add:

```typescript
    vehicleType: a.vehicleType ?? null,
    vehicleDescription: a.vehicleDescription ?? '',
    gatePassNumber: a.gatePassNumber ?? '',
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/Lango
git add src/services/visitorService.ts src/services/deliveryService.ts
git commit -m "feat(services): persist gate pass, vehicle type/description, items brought in"
```

---

## Task 4: Form capture, submit threading, success summary

**Files:**
- Modify: `src/pages/gate/RegisterGuestPage.tsx`

- [ ] **Step 1: Add the two new icons**

In the lucide import block (lines 5-9), add `Ticket` and `Boxes`. The block's last content line becomes:

```typescript
  Briefcase, Minus, Plus, CalendarClock, Ticket, Boxes, type LucideIcon,
```

- [ ] **Step 2: Add `gatePass` to the `DoneResult` type**

In the `type DoneResult = { ... }` definition, add `gatePass?: string` to the first line group. It becomes:

```typescript
type DoneResult = {
  id: string; name: string; type: VisitType; subtitle: string
  visiting: string; vehicle?: string; validUntil: string; arrival: string
  phone: string; idNumber?: string; duration?: string; qrValue: string; passId: string
  gatePass?: string
}
```

- [ ] **Step 3: Thread new fields into the `registerDelivery` call**

In `onSubmit`, inside the `registerDelivery({ ... })` call, directly after the line `vehicleRegistration: data.vehicleRegistration || undefined,`, add:

```typescript
          vehicleType: data.vehicleType || undefined,
          vehicleDescription: data.vehicleDescription || undefined,
          gatePassNumber: data.gatePassNumber || undefined,
```

- [ ] **Step 4: Thread new fields into the `registerVisitor` call**

In `onSubmit`, inside the `registerVisitor({ ... })` call, directly after the line `vehicleRegistration: data.vehicleRegistration || undefined,`, add:

```typescript
          vehicleType: data.vehicleType || undefined,
          vehicleDescription: data.vehicleDescription || undefined,
          gatePassNumber: data.gatePassNumber || undefined,
          itemsBroughtIn: data.itemsBroughtIn || undefined,
```

(In the `else` branch, `data` is already narrowed to the non-delivery members, all of which carry `itemsBroughtIn`.)

- [ ] **Step 5: Include the gate pass in the success result**

In the `setDone({ ... })` object, directly after the line `visiting: visitingLabel, vehicle: data.vehicleRegistration || undefined,`, add:

```typescript
        gatePass: data.gatePassNumber || undefined,
```

- [ ] **Step 6: Show the gate pass on the success summary**

In the success card, directly after the line `{done.vehicle && <SummaryRow icon={Car} label="Vehicle" value={done.vehicle} />}`, add:

```tsx
            {done.gatePass && <SummaryRow icon={Ticket} label="Gate Pass" value={done.gatePass} />}
```

- [ ] **Step 7: Add the Gate Pass capture field (all visit types)**

In step 2, replace the existing vehicle block (the `{(visitType === 'DELIVERY' || visitType === 'SERVICE_PROVIDER' || visitType === 'FRIENDLY_VISIT') && ( <Field icon={Car} label="Vehicle Registration"> ... </Field> )}` block) with the following, which adds a gate-pass field, shows the vehicle group for ALL types, and adds an items textarea for non-delivery types:

```tsx
            <Field icon={Ticket} label="Gate Pass / Badge No.">
              <input className="input" placeholder="Optional" {...form.register('gatePassNumber')} />
            </Field>

            <div className="md:col-span-2 grid md:grid-cols-3 gap-x-5 gap-y-4">
              <Field icon={Car} label="Vehicle Registration">
                <input className="input" placeholder="Optional" {...form.register('vehicleRegistration')} />
              </Field>
              <Field icon={Car} label="Vehicle Type">
                <select className="input" {...form.register('vehicleType')}>
                  <option value="">—</option>
                  <option value="CAR">Car</option>
                  <option value="MOTORBIKE">Motorbike</option>
                  <option value="VAN">Van</option>
                  <option value="TRUCK">Truck</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
              <Field icon={Car} label="Make & Colour">
                <input className="input" placeholder="e.g. white Toyota" {...form.register('vehicleDescription')} />
              </Field>
            </div>

            {visitType !== 'DELIVERY' && (
              <div className="md:col-span-2">
                <Field icon={Boxes} label={visitType === 'WORK' ? 'Tools / equipment brought in (checked on exit)' : 'Items brought in (checked on exit)'}>
                  <textarea rows={2} className="input resize-none" placeholder="Optional" {...form.register('itemsBroughtIn')} />
                </Field>
              </div>
            )}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 9: Commit**

```bash
cd ~/Documents/Lango
git add src/pages/gate/RegisterGuestPage.tsx
git commit -m "feat(register): capture gate pass, vehicle type/description, items brought in"
```

---

## Task 5: Review rows + read surfaces

**Files:**
- Modify: `src/pages/gate/RegisterGuestPage.tsx` (review step)
- Modify: `src/pages/gate/CurrentlyInsidePage.tsx`
- Modify: `src/features/property/VisitorsPage.tsx`

- [ ] **Step 1: Add review rows (step 3)**

In `src/pages/gate/RegisterGuestPage.tsx`, in the step-3 review card, directly after the line `{form.watch('vehicleRegistration') && <ReviewRow icon={Car} title="Vehicle" lines={[form.watch('vehicleRegistration')]} />}`, add:

```tsx
            {form.watch('vehicleType') && <ReviewRow icon={Car} title="Vehicle Type" lines={[String(form.watch('vehicleType'))]} />}
            {form.watch('vehicleDescription') && <ReviewRow icon={Car} title="Vehicle Description" lines={[form.watch('vehicleDescription')]} />}
            {form.watch('gatePassNumber') && <ReviewRow icon={Ticket} title="Gate Pass" lines={[form.watch('gatePassNumber')]} />}
            {form.watch('itemsBroughtIn') && <ReviewRow icon={Boxes} title="Items Brought In" lines={[form.watch('itemsBroughtIn')]} />}
```

- [ ] **Step 2: Add a reconciliation line to Currently Inside rows**

In `src/pages/gate/CurrentlyInsidePage.tsx`, directly after the line:

```tsx
                <p className="text-xs text-gray-500 truncate">{v.unitNumber} · in {format(v.checkInTime.toDate(), 'h:mm a')} · {formatDuration(durationMinutes(v.checkInTime.toDate(), new Date()))}</p>
```

add:

```tsx
                {(v.gatePassNumber || v.itemsBroughtIn) && (
                  <p className="text-xs text-gray-400 truncate">
                    {v.gatePassNumber ? `Pass ${v.gatePassNumber}` : ''}{v.gatePassNumber && v.itemsBroughtIn ? ' · ' : ''}{v.itemsBroughtIn ? `Items: ${v.itemsBroughtIn}` : ''}
                  </p>
                )}
```

- [ ] **Step 3: Add rows to the Visitors history detail modal**

In `src/features/property/VisitorsPage.tsx`, directly after the line `{selected.company && <Row k="Company" v={selected.company} />}`, add:

```tsx
            {selected.gatePassNumber && <Row k="Gate pass" v={selected.gatePassNumber} />}
            {(selected.vehicleRegistration || selected.vehicleType || selected.vehicleDescription) && <Row k="Vehicle" v={[selected.vehicleRegistration, selected.vehicleType, selected.vehicleDescription].filter(Boolean).join(' · ')} />}
            {selected.itemsBroughtIn && <Row k="Items brought in" v={selected.itemsBroughtIn} />}
```

- [ ] **Step 4: Type-check the whole project**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 5: Run the schema tests once more**

Run: `npx vitest run src/domain/registerSchemas.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/Lango
git add src/pages/gate/RegisterGuestPage.tsx src/pages/gate/CurrentlyInsidePage.tsx src/features/property/VisitorsPage.tsx
git commit -m "feat(visitors): show gate pass, vehicle details, items on review/inside/history"
```

---

## Task 6: Manual verification

**Files:** none (manual QA).

- [ ] **Step 1: Run the app** — `cd ~/Documents/Lango && npm run dev`.
- [ ] **Step 2:** Register a **Personal Visit** with a gate pass, vehicle type + make/colour, and items brought in → step-3 review shows all of them; success screen shows the Gate Pass line.
- [ ] **Step 3:** Open **Currently Inside** → the new visitor row shows the "Pass … · Items: …" line.
- [ ] **Step 4:** Register a **Delivery** with a gate pass + vehicle type → it saves without error (no items field shown for delivery).
- [ ] **Step 5:** Open **Visitors** history → click the visitor → detail modal shows Gate pass, Vehicle (plate · type · description), and Items brought in.
