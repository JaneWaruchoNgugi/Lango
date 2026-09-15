# Block Creation — Floor-based Unit Generation (Design)

**Date:** 2026-09-15
**Branch:** feat/block-floor-generation (off main)

## Goal

Let an admin define a block as **floors × units-per-floor** and have the units
auto-generated with floor-based numbers (e.g. `A101…A104, A201…A204, … A604`),
each unit's `floor` populated — instead of only the current flat "number of
units" list. Keep the flat mode too (a toggle).

## Current state (what exists)

`src/pages/admin/BlockFormPage.tsx` already creates a block **and** auto-generates
its units in a single Firestore `writeBatch` (block doc + unit docs + property
counter increments). Today the generation is **flat**: an "Auto-generate units"
checkbox + "Number of Units" field → `generateUnitCodes({prefix, start:1, count,
padding})` → `A01, A02, … A12`, with each unit written as `floor: null`.

- `generateUnitCodes` (`src/utils/units.ts`) is a pure flat generator.
- `Unit.floor` (`src/types/index.ts`) is an optional display label string.
- `Block.prefix` (uppercased, e.g. "A") drives unit numbering.

The gap: no "floors × units-per-floor" concept, and `floor` is never populated.

## Decisions (agreed)

- **Number format:** `A101` — `prefix + floorNumber + unit(zero-padded)`. Floor 1
  unit 1 → `A101`; floor 6 unit 4 → `A604`. Consistent with the app's dash-less
  flat codes (`A01`).
- **Keep both modes:** a generation-mode toggle — **Flat count** (existing) and
  **By floor** (new).

## Data model

No schema changes. In **By floor** mode each generated unit is written with its
`floor` set to the floor number as a string (`"1"`, `"2"`, …) instead of `null`;
`unitNumber` uses the floor-based code. Everything else (block doc, property
`numberOfBlocks`/`totalUnits` increments) is unchanged.

Floor is always recoverable from a code because the unit part has fixed padding:
strip the prefix, drop the last `unitPadding` chars → the remainder is the floor
(so `A1001` = block A, floor 10, unit 01 — unambiguous).

## New pure helper (`src/utils/units.ts`)

```ts
export interface FloorUnitConfig {
  prefix?: string        // block prefix, e.g. 'A' ('' allowed)
  floors: number         // number of floors (>= 1)
  unitsPerFloor: number  // units on each floor (>= 1)
  floorStart?: number    // first floor number, default 1
  unitPadding?: number   // min width of the unit part; default max(2, digits(unitsPerFloor))
}
export interface FloorUnit { unitNumber: string; floor: string }

export function generateFloorUnitCodes(cfg: FloorUnitConfig): FloorUnit[]
```

Behaviour:
- Returns `[]` if `floors < 1` or `unitsPerFloor < 1` (mirrors `generateUnitCodes`).
- `unitPadding` defaults to `Math.max(2, String(unitsPerFloor).length)`.
- For floor `f` in `floorStart … floorStart+floors-1`, unit `u` in `1…unitsPerFloor`:
  `unitNumber = \`${prefix}${f}${String(u).padStart(unitPadding,'0')}\``, `floor = String(f)`.
- Order: floor-major, then unit (`A101,A102,…,A201,…`).

## UI (`src/pages/admin/BlockFormPage.tsx`)

Extend the existing zod schema + form:
- Add `genMode: 'count' | 'floors'` (default `'floors'`), `floors: number`,
  `unitsPerFloor: number`.
- Replace the single auto-generate section with a mode toggle:
  - **Flat count** → the existing "Number of Units" field (unchanged path).
  - **By floor** → two fields, **Floors** and **Units per floor**, with a live
    preview grouped by floor (e.g. "Floor 1: A101, A102, A103, A104 … Floor 6:
    A601–A604") and a computed total ("Will create 24 units across 6 floors").
- `autoGenerateUnits` stays; when off, no units are generated (either mode).

On submit:
- **Flat:** unchanged — `generateUnitCodes(...)`, `floor: null`.
- **By floor:** `generateFloorUnitCodes({ prefix, floors, unitsPerFloor })`; write
  each unit with its `unitNumber` and `floor`. `block.totalUnits` and the property
  `totalUnits` increment use the generated count (`floors × unitsPerFloor`).

## Validation / limits

- Both modes cap the total at **500** units (existing flat limit; keeps parity).
  By-floor validates `floors × unitsPerFloor ≤ 500` and `floors ≥ 1`,
  `unitsPerFloor ≥ 1`. (Note: the single `writeBatch` also holds the block +
  property writes; 500-unit blocks are an existing edge and out of scope to
  re-architect here.)
- `prefix` validation unchanged (required, ≤ 3 chars, uppercased).

## Testing (TDD, pure logic — `src/utils/units.test.ts`)

- `generateFloorUnitCodes({prefix:'A', floors:6, unitsPerFloor:4})` → 24 codes,
  first `A101` (floor `'1'`), last `A604` (floor `'6'`); floor-major order.
- Defaults `unitPadding` to 2; `unitsPerFloor: 12` pads units to 2 (`A101…A112`).
- `unitsPerFloor: 120` → 3-wide unit part (`A1001…`); floor still recoverable.
- Returns `[]` for `floors: 0` or `unitsPerFloor: 0`.
- `floorStart: 0` supported (ground floor `A001…`), if provided.

The `BlockFormPage` wiring is build-verified (`npx tsc -p tsconfig.app.json
--noEmit`, `npm run build`); no automated component test infra for this page.

## Verification commands

```
npx vitest run src/utils/units.test.ts
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

## Out of scope

- Floor-ownership / landlord-per-floor (a separate concern the user raised for the
  demo).
- Editing floors after creation, non-uniform floors (some floors with different
  unit counts), and re-architecting the 500-write batch limit.
