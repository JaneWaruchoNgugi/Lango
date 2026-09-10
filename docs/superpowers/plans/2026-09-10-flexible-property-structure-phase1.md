# Flexible Property Structure — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve LANGO's data model and unit tooling so a property can have optional blocks, optional string floor labels, and custom string unit codes — with occupancy computed from real records — without breaking any existing property, tenant, visitor, or delivery.

**Architecture:** Additive, constraint-loosening changes to the flat Firestore collections (`/properties`, `/blocks`, `/units`, …). New pure helpers centralize backward-compat fallbacks; a flexible generator and a `unitService` support generated + manual string units with app-layer uniqueness. Migration is lazy (read-time fallbacks) with an optional idempotent backfill script.

**Tech Stack:** React + TypeScript, Firebase/Firestore (web SDK, flat collections), react-hook-form + zod, vitest, oxlint, Vite.

**Commands:** test = `npm test` (vitest run) · lint = `npm run lint` (oxlint) · build/typecheck = `npm run build` (tsc -b && vite build).

**Design spec:** `docs/superpowers/specs/2026-09-10-flexible-property-structure-phase1-design.md`

---

## File Structure

**Create:**
- `src/utils/units.test.ts` — tests for the flexible generator.
- `src/domain/unitHelpers.ts` — compat read-helpers + `computeOccupancy`.
- `src/domain/unitHelpers.test.ts` — tests for the helpers.
- `src/domain/unitCode.ts` — pure unit-code validation (`validateUnitCode`).
- `src/domain/unitCode.test.ts` — tests for validation.
- `src/services/unitService.ts` — create/generate-batch/rename/delete units.
- `src/components/units/GenerateUnitsForm.tsx` — generator UI with live preview.
- `src/components/units/ManualUnitForm.tsx` — single-unit manual form.
- `scripts/backfill-structure.ts` — optional idempotent backfill.

**Modify:**
- `src/utils/units.ts` — add `generateUnitCodes`; reimplement `generateUnitNumbers` as a wrapper.
- `src/types/index.ts` — `StructureType`; `Property.structureType`; optional `numberOfBlocks`/`totalUnits`; `Unit` (`blockId`/`blockName` nullable, `floor: string`, `displayName`, `unitType`); nullable `blockId`/`blockName` on `Tenant`/`Visitor`/`Delivery`/`PreApprovedVisitor`/`OccupancyRecord`.
- `src/pages/admin/PropertyFormPage.tsx` — add structure-type selector; drop required blocks/units number fields.
- `src/pages/admin/BlockFormPage.tsx` — use the new generator.
- `src/pages/admin/PropertyDetailPage.tsx` — host the Add-Units UI + occupancy from real docs.
- `src/pages/admin/PropertiesPage.tsx` — show real counts / "0 Units configured".

**TDD note:** Tasks 1, 3, 4 are pure logic → full red/green TDD. Tasks 2, 5–9 are types/Firestore/UI → verified by `tsc` (via `npm run build`), lint, and the manual acceptance tests in Task 10; each still ends in a commit.

---

## Task 1: Flexible unit-code generator

**Files:**
- Test: `src/utils/units.test.ts`
- Modify: `src/utils/units.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/units.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateUnitCodes, generateUnitNumbers } from './units'

describe('generateUnitCodes', () => {
  it('prefix + padded number (A01..A24)', () => {
    const r = generateUnitCodes({ prefix: 'A', start: 1, count: 24, padding: 2 })
    expect(r[0]).toBe('A01')
    expect(r[23]).toBe('A24')
    expect(r).toHaveLength(24)
  })

  it('prefix with dash + custom start (A-101..A-112)', () => {
    const r = generateUnitCodes({ prefix: 'A-', start: 101, count: 12, padding: 0 })
    expect(r[0]).toBe('A-101')
    expect(r[11]).toBe('A-112')
  })

  it('no prefix (101..106)', () => {
    const r = generateUnitCodes({ prefix: '', start: 101, count: 6, padding: 0 })
    expect(r).toEqual(['101', '102', '103', '104', '105', '106'])
  })

  it('three-digit leading zeros (001..003)', () => {
    const r = generateUnitCodes({ prefix: '', start: 1, count: 3, padding: 3 })
    expect(r).toEqual(['001', '002', '003'])
  })

  it('does not force uppercase', () => {
    const r = generateUnitCodes({ prefix: 'villa ', start: 1, count: 2, padding: 2 })
    expect(r).toEqual(['villa 01', 'villa 02'])
  })

  it('returns [] for non-positive count', () => {
    expect(generateUnitCodes({ prefix: 'A', start: 1, count: 0, padding: 2 })).toEqual([])
  })

  it('generateUnitNumbers wrapper preserves legacy behavior', () => {
    expect(generateUnitNumbers('a', 3)).toEqual(['A01', 'A02', 'A03'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/utils/units.test.ts`
Expected: FAIL — `generateUnitCodes` is not exported.

- [ ] **Step 3: Implement**

Replace the contents of `src/utils/units.ts`:

```typescript
export interface UnitCodeConfig {
  /** Optional prefix, kept verbatim (no forced case). '' = no prefix. */
  prefix?: string
  /** First number in the sequence. Default 1. */
  start?: number
  /** How many codes to produce. */
  count: number
  /** Leading-zero width for the numeric part. 0 = natural width. Default 0. */
  padding?: number
}

/**
 * Generate a list of string unit codes from a numbering config.
 * Codes are strings — never treated as integers by the rest of the app.
 */
export function generateUnitCodes({
  prefix = '',
  start = 1,
  count,
  padding = 0,
}: UnitCodeConfig): string[] {
  if (!Number.isFinite(count) || count < 1) return []
  const from = Number.isFinite(start) ? start : 1
  return Array.from({ length: count }, (_, i) => {
    const n = from + i
    const num = padding > 0 ? String(n).padStart(padding, '0') : String(n)
    return `${prefix}${num}`
  })
}

/**
 * Legacy helper kept for existing callers: uppercased prefix, min-2 padding,
 * starting at 1. Implemented on top of generateUnitCodes.
 */
export function generateUnitNumbers(prefix: string, count: number): string[] {
  const clean = prefix.trim().toUpperCase()
  const padding = Math.max(2, String(Math.max(count, 1)).length)
  return generateUnitCodes({ prefix: clean, start: 1, count, padding })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/utils/units.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/units.ts src/utils/units.test.ts
git commit -m "feat(units): flexible generateUnitCodes generator with tests"
```

---

## Task 2: Schema / type changes

**Files:**
- Modify: `src/types/index.ts`

No unit test (type-only). Verified by `npm run build` at the end of the task.

- [ ] **Step 1: Add the StructureType union**

In `src/types/index.ts`, next to the other unions (near `PropertyType`), add:

```typescript
export type StructureType = 'BLOCKS' | 'SINGLE_BUILDING' | 'VILLAS' | 'CUSTOM'
```

- [ ] **Step 2: Loosen Property fields**

In the `Property` interface: make totals optional and add `structureType`.

Change:
```typescript
  numberOfBlocks: number
  totalUnits: number
```
to:
```typescript
  numberOfBlocks?: number
  totalUnits?: number
  structureType?: StructureType   // absent ⇒ treated as 'BLOCKS'
```

- [ ] **Step 3: Evolve the Unit interface**

Change these lines in `Unit`:
```typescript
  blockId: string
  blockName: string      // denormalized for display
```
to:
```typescript
  blockId?: string | null
  blockName?: string | null   // denormalized for display; null when block-less
```
Change:
```typescript
  floor?: number
```
to:
```typescript
  floor?: string          // label, e.g. 'Ground', '1st Floor', 'PH'
  displayName?: string    // defaults to unitNumber for display
  unitType?: string       // free-form in P1; managed catalog in P3
```

- [ ] **Step 4: Loosen denormalized block fields on child records**

In `Tenant`, `Visitor`, `Delivery`, `PreApprovedVisitor`, and `OccupancyRecord`, change each `blockId: string` / `blockName: string` pair to optional-nullable:
```typescript
  blockId?: string | null
  blockName?: string | null
```
(Leave `unitId`, `unitNumber`, and all other fields exactly as they are.)

- [ ] **Step 5: Typecheck and fix ripple**

Run: `npm run build`
Expected: TypeScript errors ONLY where code passes a now-optional `blockId`/`blockName` into a `string` parameter, or reads `unit.floor` as a number.

Fix each reported site with the minimal change:
- When building a Firestore payload that needs a value, use `?? null` (Firestore rejects `undefined`, accepts `null`): e.g. `blockId: unit.blockId ?? null`.
- When passing to a `string`-typed argument, use `?? ''`.
- Do NOT change denormalized values already stored on existing docs.

Re-run `npm run build` until it is clean.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src
git commit -m "feat(types): flexible property structure schema (optional blocks, string floors, unit code/type)"
```

---

## Task 3: Compat read-helpers + occupancy

**Files:**
- Create: `src/domain/unitHelpers.ts`
- Test: `src/domain/unitHelpers.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/domain/unitHelpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { unitDisplayName, unitFloorLabel, propertyStructureType, computeOccupancy } from './unitHelpers'

describe('unitHelpers', () => {
  it('unitDisplayName prefers displayName, falls back to unitNumber', () => {
    expect(unitDisplayName({ unitNumber: 'A01' } as any)).toBe('A01')
    expect(unitDisplayName({ unitNumber: 'A01', displayName: 'Apartment A01' } as any)).toBe('Apartment A01')
  })

  it('unitFloorLabel coerces legacy numeric floor and handles missing', () => {
    expect(unitFloorLabel({ floor: 2 } as any)).toBe('2')
    expect(unitFloorLabel({ floor: 'Ground' } as any)).toBe('Ground')
    expect(unitFloorLabel({} as any)).toBe('')
  })

  it('propertyStructureType defaults to BLOCKS when absent', () => {
    expect(propertyStructureType({} as any)).toBe('BLOCKS')
    expect(propertyStructureType({ structureType: 'VILLAS' } as any)).toBe('VILLAS')
  })

  it('computeOccupancy counts by status', () => {
    const units = [
      { status: 'OCCUPIED' }, { status: 'OCCUPIED' },
      { status: 'VACANT' }, { status: 'RESERVED' }, { status: 'MAINTENANCE' },
    ] as any[]
    expect(computeOccupancy(units)).toEqual({
      total: 5, occupied: 2, vacant: 1, reserved: 1, maintenance: 1,
    })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/domain/unitHelpers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/domain/unitHelpers.ts`:

```typescript
import type { Unit, Property, StructureType, UnitStatus } from '../types'

/** Display label for a unit: explicit displayName, else the unit code. */
export function unitDisplayName(u: Pick<Unit, 'unitNumber' | 'displayName'>): string {
  return u.displayName || u.unitNumber
}

/** Floor label; coerces legacy numeric floors stored before the string migration. */
export function unitFloorLabel(u: { floor?: string | number | null }): string {
  if (typeof u.floor === 'number') return String(u.floor)
  return u.floor ?? ''
}

/** Structure type with the legacy default. */
export function propertyStructureType(p: Pick<Property, 'structureType'>): StructureType {
  return p.structureType ?? 'BLOCKS'
}

export interface Occupancy {
  total: number
  occupied: number
  vacant: number
  reserved: number
  maintenance: number
}

/** Occupancy counts derived from real unit docs. */
export function computeOccupancy(units: Array<{ status: UnitStatus }>): Occupancy {
  const by = (s: UnitStatus) => units.filter((u) => u.status === s).length
  return {
    total: units.length,
    occupied: by('OCCUPIED'),
    vacant: by('VACANT'),
    reserved: by('RESERVED'),
    maintenance: by('MAINTENANCE'),
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/domain/unitHelpers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/unitHelpers.ts src/domain/unitHelpers.test.ts
git commit -m "feat(domain): unit compat helpers and computeOccupancy"
```

---

## Task 4: Unit-code validation + unitService

**Files:**
- Create: `src/domain/unitCode.ts`
- Test: `src/domain/unitCode.test.ts`
- Create: `src/services/unitService.ts`

### 4a — Pure validation (TDD)

- [ ] **Step 1: Write the failing tests**

Create `src/domain/unitCode.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateUnitCode } from './unitCode'

describe('validateUnitCode', () => {
  it('accepts a unique non-empty code', () => {
    expect(validateUnitCode('A01', ['B01', 'B02'])).toBeNull()
  })
  it('accepts custom string codes', () => {
    expect(validateUnitCode('Penthouse East', [])).toBeNull()
    expect(validateUnitCode('Shop A', [])).toBeNull()
    expect(validateUnitCode('Office B-203', [])).toBeNull()
  })
  it('rejects empty/whitespace', () => {
    expect(validateUnitCode('   ', [])).toMatch(/required/i)
  })
  it('rejects over-long codes', () => {
    expect(validateUnitCode('X'.repeat(21), [])).toMatch(/20/)
  })
  it('rejects duplicates case-insensitively, trimming', () => {
    expect(validateUnitCode(' a01 ', ['A01'])).toMatch(/already/i)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/domain/unitCode.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/domain/unitCode.ts`:

```typescript
export const MAX_UNIT_CODE_LENGTH = 20

/**
 * Validate a unit code against existing codes in the same property.
 * Returns an error message, or null when valid. Codes are strings, never
 * validated as numbers. Uniqueness is case-insensitive and trims whitespace.
 */
export function validateUnitCode(code: string, existingCodes: string[]): string | null {
  const trimmed = code.trim()
  if (!trimmed) return 'Unit code is required'
  if (trimmed.length > MAX_UNIT_CODE_LENGTH) {
    return `Unit code must be at most ${MAX_UNIT_CODE_LENGTH} characters`
  }
  const norm = trimmed.toLowerCase()
  if (existingCodes.some((c) => c.trim().toLowerCase() === norm)) {
    return 'That unit code already exists in this property'
  }
  return null
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/domain/unitCode.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/unitCode.ts src/domain/unitCode.test.ts
git commit -m "feat(domain): validateUnitCode with uniqueness/length rules"
```

### 4b — unitService (Firestore; verified by build + Task 10)

- [ ] **Step 6: Implement the service**

Create `src/services/unitService.ts`:

```typescript
import {
  collection, doc, getDocs, query, where, writeBatch, serverTimestamp, increment,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Unit } from '../types'
import { validateUnitCode } from '../domain/unitCode'

export interface NewUnitInput {
  propertyId: string
  unitCode: string
  displayName?: string
  blockId?: string | null
  blockName?: string | null
  floor?: string
  unitType?: string
  status?: Unit['status']
}

/** All existing unit codes for a property (for uniqueness checks). */
export async function fetchUnitCodes(propertyId: string): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'units'), where('propertyId', '==', propertyId)))
  return snap.docs.map((d) => (d.data() as Unit).unitNumber)
}

function unitDocPayload(input: NewUnitInput) {
  return {
    propertyId: input.propertyId,
    unitNumber: input.unitCode.trim(),
    displayName: (input.displayName?.trim() || input.unitCode.trim()),
    blockId: input.blockId ?? null,
    blockName: input.blockName ?? null,
    floor: input.floor?.trim() || null,
    unitType: input.unitType?.trim() || null,
    status: input.status ?? 'VACANT',
    currentTenantId: null,
    currentTenantName: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

/** Create a single unit after validating its code is unique in the property. */
export async function createUnit(input: NewUnitInput): Promise<string> {
  const existing = await fetchUnitCodes(input.propertyId)
  const err = validateUnitCode(input.unitCode, existing)
  if (err) throw new Error(err)

  const batch = writeBatch(db)
  const ref = doc(collection(db, 'units'))
  batch.set(ref, { unitId: ref.id, ...unitDocPayload(input) })
  batch.update(doc(db, 'properties', input.propertyId), {
    totalUnits: increment(1), updatedAt: serverTimestamp(),
  })
  await batch.commit()
  return ref.id
}

/**
 * Create many units atomically. Rejects if any code collides with existing
 * codes or with another code in the same batch.
 */
export async function createUnitsBatch(inputs: NewUnitInput[]): Promise<number> {
  if (inputs.length === 0) return 0
  const propertyId = inputs[0].propertyId
  const existing = await fetchUnitCodes(propertyId)
  const seen = new Set(existing.map((c) => c.trim().toLowerCase()))
  for (const input of inputs) {
    const err = validateUnitCode(input.unitCode, [...seen])
    if (err) throw new Error(`${input.unitCode}: ${err}`)
    seen.add(input.unitCode.trim().toLowerCase())
  }

  const batch = writeBatch(db)
  for (const input of inputs) {
    const ref = doc(collection(db, 'units'))
    batch.set(ref, { unitId: ref.id, ...unitDocPayload(input) })
  }
  batch.update(doc(db, 'properties', propertyId), {
    totalUnits: increment(inputs.length), updatedAt: serverTimestamp(),
  })
  await batch.commit()
  return inputs.length
}

/**
 * Rename a unit's code (and/or display name). Re-checks uniqueness and, when the
 * unit is occupied, syncs the active tenant's denormalized unitNumber.
 */
export async function renameUnit(
  unit: Unit,
  next: { unitCode: string; displayName?: string },
): Promise<void> {
  const existing = (await fetchUnitCodes(unit.propertyId)).filter(
    (c) => c.trim().toLowerCase() !== unit.unitNumber.trim().toLowerCase(),
  )
  const err = validateUnitCode(next.unitCode, existing)
  if (err) throw new Error(err)

  const batch = writeBatch(db)
  batch.update(doc(db, 'units', unit.unitId), {
    unitNumber: next.unitCode.trim(),
    displayName: next.displayName?.trim() || next.unitCode.trim(),
    updatedAt: serverTimestamp(),
  })
  if (unit.currentTenantId) {
    batch.update(doc(db, 'tenants', unit.currentTenantId), {
      unitNumber: next.unitCode.trim(), updatedAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

/** Delete a unit. Refuses to delete an occupied unit unless force=true. */
export async function deleteUnit(unit: Unit, opts?: { force?: boolean }): Promise<void> {
  if (unit.currentTenantId && !opts?.force) {
    throw new Error('This unit has an active tenant. Confirm to delete anyway.')
  }
  const batch = writeBatch(db)
  batch.delete(doc(db, 'units', unit.unitId))
  batch.update(doc(db, 'properties', unit.propertyId), {
    totalUnits: increment(-1), updatedAt: serverTimestamp(),
  })
  await batch.commit()
}
```

Note (confirmed): `db` is exported from `src/firebase/config` (`import { db } from '../firebase/config'`). For consistency with existing services (`tenantService.ts`), you may optionally use the collection-ref helpers in `src/firebase/collections.ts` (`unitsCol`, `propertyDoc`, etc.) instead of raw `collection(db, 'units')` — functionally equivalent.

- [ ] **Step 7: Typecheck**

Run: `npm run build`
Expected: PASS (no type errors).

- [ ] **Step 8: Commit**

```bash
git add src/services/unitService.ts
git commit -m "feat(units): unitService create/batch/rename/delete with uniqueness"
```

---

## Task 5: PropertyFormPage — structure selector, drop rigid totals

**Files:**
- Modify: `src/pages/admin/PropertyFormPage.tsx`

- [ ] **Step 1: Update the zod schema**

Remove `numberOfBlocks` and `totalUnits` from the schema, and add `structureType`:
```typescript
  structureType: z.enum(['BLOCKS', 'SINGLE_BUILDING', 'VILLAS', 'CUSTOM']),
```
Delete these two lines from the schema:
```typescript
  numberOfBlocks: z.number().min(1, 'At least 1 block required').max(50),
  totalUnits:     z.number().min(1, 'At least 1 unit required').max(9999),
```

- [ ] **Step 2: Update defaultValues**

In the `useForm` defaults, remove `numberOfBlocks`/`totalUnits` and add:
```typescript
  structureType: 'BLOCKS',
```

- [ ] **Step 3: Replace the number inputs with the structure selector**

Delete the two form fields that render Number of Blocks and Total Units. Add, near Property Type:
```tsx
<div className="sm:col-span-2">
  <label className="label">How is this property organized? *</label>
  <select {...register('structureType')} className="input">
    <option value="BLOCKS">Blocks &amp; Buildings</option>
    <option value="SINGLE_BUILDING">Single Building</option>
    <option value="VILLAS">Villas / Individual Units</option>
    <option value="CUSTOM">Custom</option>
  </select>
  <p className="text-xs text-gray-500 mt-1">You'll add buildings and units after creating the property.</p>
</div>
```

- [ ] **Step 4: Update the create/update payload**

In the submit handler, remove `numberOfBlocks`/`totalUnits` from the create payload and add `structureType: data.structureType`. Keep `occupiedUnits: 0` if present. Do not set `totalUnits` on create (it defaults via unit creation increments); existing edit flows keep whatever value is stored.

- [ ] **Step 5: Typecheck + manual smoke**

Run: `npm run build`
Expected: PASS.
Manual: open the Create Property form; confirm the structure selector shows and the two number inputs are gone; create a property successfully.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/PropertyFormPage.tsx
git commit -m "feat(property): structure-type selector; drop rigid block/unit counts"
```

---

## Task 6: BlockFormPage — use the flexible generator

**Files:**
- Modify: `src/pages/admin/BlockFormPage.tsx`

- [ ] **Step 1: Switch generation to generateUnitCodes**

At line ~59 (create) and line ~95 (preview), replace `generateUnitNumbers(prefix, count)` calls. Keep the block `prefix` field, but generate with configurable padding:
```typescript
import { generateUnitCodes } from '../../utils/units'
```
Create path:
```typescript
const numbers = generateUnitCodes({
  prefix: data.prefix.trim(),
  start: 1,
  count: data.totalUnits,
  padding: Math.max(2, String(Math.max(data.totalUnits, 1)).length),
})
```
Preview path:
```typescript
const preview = auto && count > 0
  ? generateUnitCodes({
      prefix: prefix.trim(),
      start: 1,
      count: Math.min(count, 500),
      padding: Math.max(2, String(Math.min(count, 500)).length),
    })
  : []
```
(This preserves the existing A01-style output while routing through the new generator.)

- [ ] **Step 2: Ensure generated unit docs include new fields**

Where the batch sets each unit doc, add `displayName` defaulting to the code and `blockName` from the block (already present). Add:
```typescript
displayName: number,   // the generated code
floor: null,
unitType: null,
```
(so newly generated units carry the new fields explicitly).

- [ ] **Step 3: Typecheck + manual**

Run: `npm run build`
Expected: PASS.
Manual: create a block with auto-generate on; confirm units A01.. appear as before.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/BlockFormPage.tsx
git commit -m "refactor(blocks): route unit generation through generateUnitCodes"
```

---

## Task 7: Unit-management UI on PropertyDetailPage

**Files:**
- Create: `src/components/units/GenerateUnitsForm.tsx`
- Create: `src/components/units/ManualUnitForm.tsx`
- Modify: `src/pages/admin/PropertyDetailPage.tsx`

### 7a — GenerateUnitsForm (live preview)

- [ ] **Step 1: Create the component**

Create `src/components/units/GenerateUnitsForm.tsx`:

```tsx
import { useState } from 'react'
import { generateUnitCodes } from '../../utils/units'
import { createUnitsBatch } from '../../services/unitService'
import toast from 'react-hot-toast'

interface Props {
  propertyId: string
  blockId?: string | null
  blockName?: string | null
  onCreated: () => void
}

export function GenerateUnitsForm({ propertyId, blockId, blockName, onCreated }: Props) {
  const [prefix, setPrefix] = useState('')
  const [start, setStart] = useState(1)
  const [count, setCount] = useState(1)
  const [padding, setPadding] = useState(2)
  const [floor, setFloor] = useState('')
  const [unitType, setUnitType] = useState('')
  const [busy, setBusy] = useState(false)

  const preview = generateUnitCodes({ prefix, start, count: Math.min(count, 500), padding })

  async function submit() {
    setBusy(true)
    try {
      const n = await createUnitsBatch(
        preview.map((code) => ({
          propertyId, unitCode: code,
          blockId: blockId ?? null, blockName: blockName ?? null,
          floor: floor || undefined, unitType: unitType || undefined,
        })),
      )
      toast.success(`${n} units created`)
      onCreated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create units')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><label className="label">Prefix</label>
          <input className="input" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="A- (optional)" /></div>
        <div><label className="label">Start #</label>
          <input className="input" type="number" value={start} onChange={(e) => setStart(Number(e.target.value))} /></div>
        <div><label className="label">Count</label>
          <input className="input" type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
        <div><label className="label">Leading zeros</label>
          <input className="input" type="number" value={padding} onChange={(e) => setPadding(Number(e.target.value))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Floor (optional)</label>
          <input className="input" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. Ground" /></div>
        <div><label className="label">Unit type (optional)</label>
          <input className="input" value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="e.g. 2 Bedroom" /></div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-blue-50/40 p-3">
        <p className="text-xs font-medium text-gray-600 mb-1">Preview ({preview.length})</p>
        <p className="text-sm text-gray-800 break-words">{preview.slice(0, 30).join(', ')}{preview.length > 30 ? ' …' : ''}</p>
      </div>
      <button className="btn-primary" disabled={busy || preview.length === 0} onClick={submit}>
        {busy ? 'Creating…' : `Create ${preview.length} Units`}
      </button>
    </div>
  )
}
```

Note (confirmed): the codebase uses `import toast from 'react-hot-toast'` (e.g. `StaffPage.tsx`, `RegisterGuestPage.tsx`). Match existing CSS utility classes (`input`, `label`, `btn-primary`) used across the admin pages — adjust names if a given class isn't defined in `cabinet.css`/the shared styles.

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: PASS.

### 7b — ManualUnitForm

- [ ] **Step 3: Create the component**

Create `src/components/units/ManualUnitForm.tsx`:

```tsx
import { useState } from 'react'
import { createUnit } from '../../services/unitService'
import toast from 'react-hot-toast'

interface Props {
  propertyId: string
  blockId?: string | null
  blockName?: string | null
  onCreated: () => void
}

export function ManualUnitForm({ propertyId, blockId, blockName, onCreated }: Props) {
  const [unitCode, setUnitCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [floor, setFloor] = useState('')
  const [unitType, setUnitType] = useState('')
  const [status, setStatus] = useState<'VACANT' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE'>('VACANT')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await createUnit({
        propertyId, unitCode,
        displayName: displayName || undefined,
        blockId: blockId ?? null, blockName: blockName ?? null,
        floor: floor || undefined, unitType: unitType || undefined, status,
      })
      toast.success('Unit created')
      setUnitCode(''); setDisplayName(''); setFloor(''); setUnitType('')
      onCreated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create unit')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div><label className="label">Unit Code *</label>
        <input className="input" value={unitCode} onChange={(e) => setUnitCode(e.target.value)} placeholder="e.g. A-101, PH01, Villa 12" /></div>
      <div><label className="label">Display Name</label>
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Defaults to unit code" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Floor</label>
          <input className="input" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="optional" /></div>
        <div><label className="label">Unit Type</label>
          <input className="input" value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="optional" /></div>
      </div>
      <div><label className="label">Status</label>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="VACANT">Vacant</option>
          <option value="OCCUPIED">Occupied</option>
          <option value="RESERVED">Reserved</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select></div>
      <button className="btn-primary" disabled={busy || !unitCode.trim()} onClick={submit}>
        {busy ? 'Saving…' : 'Save Unit'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: PASS.

### 7c — Wire into PropertyDetailPage

- [ ] **Step 5: Add an "Add Units" section + occupancy from real docs**

In `src/pages/admin/PropertyDetailPage.tsx`:
- Import the two components and `computeOccupancy`, `propertyStructureType` from helpers.
- Add local state `const [mode, setMode] = useState<'generate' | 'manual' | null>(null)` and an optional selected block (default null so block-less works).
- Render a card "Add Units" with two buttons (Generate / Enter Manually) toggling `mode`, and render the chosen form, passing `propertyId`, the selected `blockId`/`blockName` (or null), and an `onCreated` that re-fetches units.
- Replace any occupancy display with `computeOccupancy(units)` results, and show "0 Units configured" when `units.length === 0`.

Keep the existing block list and per-block unit views intact; the new section works with or without a block selected.

- [ ] **Step 6: Typecheck + manual**

Run: `npm run build`
Expected: PASS.
Manual: on a property, generate a set of units (watch the live preview), and add one manual custom-code unit (e.g. `Shop A`). Confirm both appear and occupancy updates.

- [ ] **Step 7: Commit**

```bash
git add src/components/units src/pages/admin/PropertyDetailPage.tsx
git commit -m "feat(units): generate + manual unit management on property detail"
```

---

## Task 8: PropertiesPage — real counts

**Files:**
- Modify: `src/pages/admin/PropertiesPage.tsx`

- [ ] **Step 1: Show computed counts / empty state**

At lines ~108 and ~112, the page prints `prop.numberOfBlocks` and `prop.totalUnits` from the (now optional) stored fields. Replace with a graceful display:
```tsx
<p className="text-sm font-bold text-gray-900">{prop.numberOfBlocks ?? 0}</p>
```
and for units:
```tsx
<p className="text-sm font-bold text-gray-900">
  {prop.totalUnits && prop.totalUnits > 0 ? prop.totalUnits : '0 Units configured'}
</p>
```
(The authoritative live counts already render on `PropertyDetailPage`/`AdminDashboard`, which count real docs. This keeps the list resilient to the now-optional fields.)

- [ ] **Step 2: Typecheck + manual**

Run: `npm run build`
Expected: PASS.
Manual: the properties list renders without errors for both old and new properties.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/PropertiesPage.tsx
git commit -m "fix(properties): tolerate optional block/unit totals in list"
```

---

## Task 9: Optional backfill script

**Files:**
- Create: `scripts/backfill-structure.ts`

- [ ] **Step 1: Create the script**

Create `scripts/backfill-structure.ts` (mirrors `scripts/sync-claims.ts`):

```typescript
/**
 * Optional, idempotent backfill for the flexible-structure migration.
 * - properties: set structureType='BLOCKS' where missing.
 * - units: set displayName (from unitNumber) where missing; coerce numeric
 *   floor to a string label. Never deletes.
 *
 * Prereqs:  export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccount.json
 * Run:      cd scripts && npx tsx backfill-structure.ts
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const app = initializeApp({ credential: applicationDefault() })
const db = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || 'default')

async function run() {
  const props = await db.collection('properties').get()
  let p = 0
  for (const d of props.docs) {
    if (!d.data().structureType) { await d.ref.update({ structureType: 'BLOCKS' }); p++ }
  }
  console.log(`properties updated: ${p}`)

  const units = await db.collection('units').get()
  let u = 0
  for (const d of units.docs) {
    const data = d.data()
    const patch: Record<string, unknown> = {}
    if (!data.displayName && data.unitNumber) patch.displayName = data.unitNumber
    if (typeof data.floor === 'number') patch.floor = String(data.floor)
    if (Object.keys(patch).length) { await d.ref.update(patch); u++ }
  }
  console.log(`units updated: ${u}`)
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

Note: match the `FIRESTORE_DATABASE_ID` / database name convention already used by `scripts/sync-claims.ts` (the project uses a Firestore db named `default`).

- [ ] **Step 2: Typecheck the script (no run required)**

Run: `cd scripts && npx tsc --noEmit backfill-structure.ts` (or rely on the existing scripts tsconfig if present). Expected: no type errors. Do NOT run against production data as part of the plan; running is the Super Admin's opt-in choice.

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-structure.ts
git commit -m "chore(scripts): optional idempotent structure backfill"
```

---

## Task 10: Full verification + acceptance tests

**Files:** none (verification only)

- [ ] **Step 1: Static checks**

Run: `npm test`  → Expected: all suites pass (incl. units, unitHelpers, unitCode, existing registerSchemas).
Run: `npm run lint` → Expected: clean.
Run: `npm run build` → Expected: clean typecheck + build.

- [ ] **Step 2: Acceptance TEST 1 — Blocks (96 units)**

Create "LANGO Apartments" (structure: Blocks). Add blocks A–D, each generating 24 units (A01–A24 …). Confirm 96 units total and occupancy shows 96 vacant.

- [ ] **Step 3: Acceptance TEST 2 — Single building (18 units)**

Create "Palm Apartments" (structure: Single Building, no blocks). Generate G01–G06 (floor "Ground"), 101–106 (floor "1st"), 201–206 (floor "2nd") via three generate runs. Confirm 18 units, all block-less.

- [ ] **Step 4: Acceptance TEST 3 — Villas (4 units)**

Create "Green Villas" (structure: Villas). Manually add `Villa 01`–`Villa 04`, no block, no floor. Confirm 4 units.

- [ ] **Step 5: Acceptance TEST 4 — Custom codes**

Add `Penthouse East`, `Penthouse West`, `Shop A`, `Shop B`, `Office B-203`. Confirm all save and none are rejected as non-numeric. Re-adding `Shop A` is rejected as a duplicate.

- [ ] **Step 6: Acceptance TEST 5 — Existing property intact**

Open a pre-existing property (with Block A: A01, A02, A03). Confirm it renders, its tenant assignments show, and registering a visitor for one of its units still works end-to-end.

- [ ] **Step 7: Responsive spot-check**

At mobile / tablet / desktop widths, confirm the Add-Units forms and property detail are single-column on mobile, usable on tablet, and full-width on desktop (uses existing LANGO classes).

- [ ] **Step 8: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "test: Phase 1 flexible structure acceptance verification"
```

---

## Self-Review Notes (author)

- **Spec coverage:** optional blocks/floors (Task 2), string floor labels (Task 2/3), unit_code-as-unitNumber + displayName/unitType (Task 2), structureType selector (Task 5), flexible generator w/ preview & no-prefix & padding (Tasks 1, 7), manual string entry + uniqueness (Tasks 4, 7), occupancy auto-calc + drop rigid totals (Tasks 3, 5, 8), lazy-compat + backfill (Tasks 3, 9), rules unchanged (spec §Firestore rules — no task needed), acceptance tests 1–5 (Task 10). CSV import, wizard, managed unit-type catalog are explicitly Phase 2/3 (out of scope).
- **Naming consistency:** `generateUnitCodes`, `validateUnitCode`, `createUnit`/`createUnitsBatch`/`renameUnit`/`deleteUnit`, `unitDisplayName`/`unitFloorLabel`/`propertyStructureType`/`computeOccupancy` are used consistently across tasks.
- **Verify-on-first-use:** the Firebase `db` import path, toast library, and CSS utility class names must be confirmed against the codebase at implementation time (flagged inline in Tasks 4b/7).
