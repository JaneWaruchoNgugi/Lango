# Block Floor-based Unit Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let the Add-Block form generate units as floors × units-per-floor (e.g. `A101…A604`) with each unit's floor set, alongside the existing flat mode.

**Architecture:** Add a pure `generateFloorUnitCodes()` helper to `src/utils/units.ts` (TDD'd), then extend `src/pages/admin/BlockFormPage.tsx` with a generation-mode toggle (`count` | `floors`) that reuses the existing single `writeBatch` create path.

**Tech Stack:** React + TypeScript, react-hook-form + zod, Firestore `writeBatch`, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-09-15-block-floor-unit-generation-design.md`

**Verify commands:**
```
npx vitest run src/utils/units.test.ts
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

---

### Task 1: `generateFloorUnitCodes` pure helper (TDD)

**Files:**
- Modify: `src/utils/units.ts`
- Test: `src/utils/units.test.ts`

- [ ] **Step 1: Write the failing tests** — append to `src/utils/units.test.ts`:

```ts
import { generateFloorUnitCodes } from './units'

describe('generateFloorUnitCodes', () => {
  it('generates floor-major codes with the floor recorded', () => {
    const out = generateFloorUnitCodes({ prefix: 'A', floors: 6, unitsPerFloor: 4 })
    expect(out).toHaveLength(24)
    expect(out[0]).toEqual({ unitNumber: 'A101', floor: '1' })
    expect(out[3]).toEqual({ unitNumber: 'A104', floor: '1' })
    expect(out[4]).toEqual({ unitNumber: 'A201', floor: '2' })
    expect(out[23]).toEqual({ unitNumber: 'A604', floor: '6' })
  })

  it('defaults the unit part to two digits', () => {
    const out = generateFloorUnitCodes({ prefix: 'B', floors: 1, unitsPerFloor: 2 })
    expect(out.map(u => u.unitNumber)).toEqual(['B101', 'B102'])
  })

  it('widens the unit padding when unitsPerFloor exceeds 99, keeping the floor recoverable', () => {
    const out = generateFloorUnitCodes({ prefix: 'C', floors: 1, unitsPerFloor: 120 })
    expect(out[0].unitNumber).toBe('C1001')   // floor 1, unit 001
    expect(out[0].floor).toBe('1')
    expect(out[119].unitNumber).toBe('C1120')  // floor 1, unit 120
  })

  it('supports a custom floorStart (e.g. ground floor 0)', () => {
    const out = generateFloorUnitCodes({ prefix: 'A', floors: 2, unitsPerFloor: 1, floorStart: 0 })
    expect(out[0]).toEqual({ unitNumber: 'A001', floor: '0' })
    expect(out[1]).toEqual({ unitNumber: 'A101', floor: '1' })
  })

  it('works with an empty prefix', () => {
    const out = generateFloorUnitCodes({ prefix: '', floors: 1, unitsPerFloor: 1 })
    expect(out[0]).toEqual({ unitNumber: '101', floor: '1' })
  })

  it('returns an empty array for non-positive floors or unitsPerFloor', () => {
    expect(generateFloorUnitCodes({ prefix: 'A', floors: 0, unitsPerFloor: 4 })).toEqual([])
    expect(generateFloorUnitCodes({ prefix: 'A', floors: 3, unitsPerFloor: 0 })).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/utils/units.test.ts`
Expected: FAIL — `generateFloorUnitCodes` is not exported.

- [ ] **Step 3: Implement the helper** — append to `src/utils/units.ts`:

```ts
export interface FloorUnitConfig {
  /** Optional prefix, kept verbatim. '' = no prefix. */
  prefix?: string
  /** Number of floors to generate (>= 1). */
  floors: number
  /** Units on each floor (>= 1). */
  unitsPerFloor: number
  /** First floor number. Default 1. */
  floorStart?: number
  /** Min width of the unit part. Default max(2, digits(unitsPerFloor)). */
  unitPadding?: number
}

export interface FloorUnit {
  unitNumber: string
  floor: string
}

/**
 * Generate floor-based unit codes: `${prefix}${floor}${paddedUnit}`.
 * Floor-major order. The unit part has fixed width so the floor stays
 * recoverable from a code (strip prefix, drop the last `unitPadding` chars).
 */
export function generateFloorUnitCodes({
  prefix = '',
  floors,
  unitsPerFloor,
  floorStart = 1,
  unitPadding,
}: FloorUnitConfig): FloorUnit[] {
  if (!Number.isFinite(floors) || floors < 1) return []
  if (!Number.isFinite(unitsPerFloor) || unitsPerFloor < 1) return []
  const pad = unitPadding && unitPadding > 0
    ? unitPadding
    : Math.max(2, String(unitsPerFloor).length)
  const out: FloorUnit[] = []
  for (let f = 0; f < floors; f++) {
    const floorNum = floorStart + f
    for (let u = 1; u <= unitsPerFloor; u++) {
      out.push({
        unitNumber: `${prefix}${floorNum}${String(u).padStart(pad, '0')}`,
        floor: String(floorNum),
      })
    }
  }
  return out
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/utils/units.test.ts`
Expected: PASS (existing + new tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/units.ts src/utils/units.test.ts
git commit -m "feat(units): generateFloorUnitCodes (floors x units-per-floor)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Add-Block form — generation-mode toggle

**Files:**
- Modify: `src/pages/admin/BlockFormPage.tsx`

- [ ] **Step 1: Extend the schema + imports.** In `src/pages/admin/BlockFormPage.tsx`, update the import from utils and the zod schema. Change:

```ts
import { generateUnitCodes } from '../../utils/units'
```
to:
```ts
import { generateUnitCodes, generateFloorUnitCodes } from '../../utils/units'
```

Replace the `schema` and `defaultValues`:

```ts
const schema = z.object({
  name:        z.string().min(1, 'Block name is required'),
  prefix:      z.string().min(1, 'Prefix is required').max(3, 'Max 3 characters'),
  description: z.string().optional(),
  autoGenerateUnits: z.boolean(),
  genMode:     z.enum(['count', 'floors']),
  totalUnits:  z.number({ message: 'Number of units required' }).min(0).max(500),
  floors:      z.number({ message: 'Floors required' }).min(0).max(60),
  unitsPerFloor: z.number({ message: 'Units per floor required' }).min(0).max(100),
}).refine(
  (d) => !d.autoGenerateUnits || d.genMode !== 'floors' || d.floors * d.unitsPerFloor <= 500,
  { message: 'Floors × units per floor cannot exceed 500', path: ['unitsPerFloor'] },
)
type FormData = z.infer<typeof schema>
```

Update `defaultValues` in the `useForm` call:

```ts
    defaultValues: {
      name: '', prefix: '', description: '',
      autoGenerateUnits: true, genMode: 'floors',
      totalUnits: 0, floors: 1, unitsPerFloor: 1,
    },
```

- [ ] **Step 2: Add the watches.** Replace the existing watch block:

```ts
  const auto = watch('autoGenerateUnits')
  const count = watch('totalUnits')
  const prefix = watch('prefix')
```
with:
```ts
  const auto = watch('autoGenerateUnits')
  const genMode = watch('genMode')
  const count = watch('totalUnits')
  const floors = watch('floors')
  const unitsPerFloor = watch('unitsPerFloor')
  const prefix = watch('prefix')
  const prefixUp = prefix.trim().toUpperCase()
```

- [ ] **Step 3: Build both previews.** Replace the existing `const preview = …` block with a computed generation result used by both preview and submit:

```ts
  const flatPreview = auto && genMode === 'count' && count > 0
    ? generateUnitCodes({
        prefix: prefixUp,
        start: 1,
        count: Math.min(count, 500),
        padding: Math.max(2, String(Math.min(count, 500)).length),
      }).map((unitNumber) => ({ unitNumber, floor: null as string | null }))
    : []

  const floorPreview = auto && genMode === 'floors' && floors > 0 && unitsPerFloor > 0
    ? generateFloorUnitCodes({ prefix: prefixUp, floors, unitsPerFloor })
        .slice(0, 500)
        .map((u) => ({ unitNumber: u.unitNumber, floor: u.floor as string | null }))
    : []

  const generated = genMode === 'floors' ? floorPreview : flatPreview
```

- [ ] **Step 4: Use `generated` in submit.** In `onSubmit`, replace the whole `let unitsCreated = 0; if (data.autoGenerateUnits && data.totalUnits > 0) { … }` block with a mode-agnostic loop over a freshly computed list (recompute inside submit from `data`, not the render-time `generated`, to avoid stale closures):

```ts
      let unitsCreated = 0
      if (data.autoGenerateUnits) {
        const list = data.genMode === 'floors'
          ? generateFloorUnitCodes({
              prefix: data.prefix.trim().toUpperCase(),
              floors: data.floors,
              unitsPerFloor: data.unitsPerFloor,
            }).map((u) => ({ unitNumber: u.unitNumber, floor: u.floor as string | null }))
          : generateUnitCodes({
              prefix: data.prefix.trim().toUpperCase(),
              start: 1,
              count: data.totalUnits,
              padding: Math.max(2, String(Math.max(data.totalUnits, 1)).length),
            }).map((unitNumber) => ({ unitNumber, floor: null as string | null }))

        for (const { unitNumber, floor } of list.slice(0, 500)) {
          const unitRef = doc(collection(db, 'units'))
          batch.set(unitRef, {
            unitId: unitRef.id,
            propertyId,
            blockId: blockRef.id,
            blockName: data.name,
            unitNumber,
            displayName: unitNumber,
            floor,
            unitType: null,
            status: 'VACANT',
            currentTenantId: null,
            currentTenantName: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
        unitsCreated = list.slice(0, 500).length
      }
```

Also update the block doc's `totalUnits` to use the generated count. Change:
```ts
        totalUnits: data.autoGenerateUnits ? data.totalUnits : 0,
```
to:
```ts
        totalUnits: 0, // set below after generation
```
and after the generation loop (before `batch.update(... properties ...)`) add:
```ts
      batch.update(blockRef, { totalUnits: unitsCreated })
```

(The property `totalUnits: increment(unitsCreated)` line already uses `unitsCreated` — unchanged.)

- [ ] **Step 5: Replace the auto-generate UI section.** Replace the whole `{auto && ( … )}` block (the "Number of Units" section) with the mode toggle + both field sets + preview:

```tsx
        {auto && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['floors', 'count'] as const).map((m) => (
                <label key={m} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm text-center ${genMode === m ? 'border-lango-primary bg-blue-50 text-lango-primary font-medium' : 'border-gray-200 text-gray-600'}`}>
                  <input type="radio" value={m} {...register('genMode')} className="sr-only" />
                  {m === 'floors' ? 'By floor' : 'Flat count'}
                </label>
              ))}
            </div>

            {genMode === 'floors' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Floors *</label>
                  <input {...register('floors', { valueAsNumber: true })} type="number" min={1} max={60} className="input" />
                  {errors.floors && <p className="form-error">{errors.floors.message}</p>}
                </div>
                <div>
                  <label className="label">Units per floor *</label>
                  <input {...register('unitsPerFloor', { valueAsNumber: true })} type="number" min={1} max={100} className="input" />
                  {errors.unitsPerFloor && <p className="form-error">{errors.unitsPerFloor.message}</p>}
                </div>
              </div>
            ) : (
              <div>
                <label className="label">Number of Units *</label>
                <input {...register('totalUnits', { valueAsNumber: true })} type="number" min={0} max={500} className="input" />
                {errors.totalUnits && <p className="form-error">{errors.totalUnits.message}</p>}
              </div>
            )}

            {generated.length > 0 && (
              <p className="text-xs text-gray-500">
                Will create <span className="font-medium">{generated.length}</span> units
                {genMode === 'floors' ? ` across ${floors} floor${floors === 1 ? '' : 's'}` : ''}:{' '}
                <span className="font-medium">{generated.slice(0, 4).map((u) => u.unitNumber).join(', ')}
                {generated.length > 4 ? ` … ${generated[generated.length - 1].unitNumber}` : ''}</span>
              </p>
            )}
          </div>
        )}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/BlockFormPage.tsx
git commit -m "feat(blocks): by-floor unit generation in Add Block (floors x units-per-floor)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** helper (T1) ✓; A101 numbering + floor recorded (T1) ✓; mode toggle keep-both (T2 Step 5) ✓; floor written to unit docs (T2 Step 4) ✓; 500 cap + validation (T2 Steps 1,4) ✓; block/property counters use generated count (T2 Step 4) ✓; TDD util (T1) ✓.
- **Type consistency:** `generateFloorUnitCodes` returns `{ unitNumber, floor }[]` in T1 and is consumed with that exact shape in T2. `genMode` values `'count' | 'floors'` match between schema, watch, preview, submit, and UI. Both preview lists are normalised to `{ unitNumber, floor: string | null }` so `generated` has one shape.
- **Placeholder scan:** every step has full code; no TBD/loose "handle validation".
- **Note:** submit recomputes the unit list from `data` (not the render-time `generated`) to avoid stale-closure bugs; both use the same helpers so output matches the preview.
