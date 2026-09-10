# Flexible Property Structure — Phase 1 (Foundation) — Design

**Date:** 2026-09-10
**Status:** Approved (pending spec review)
**Feature owner:** Super Admin property onboarding / structure

## Context

LANGO's Super Admin property setup is rigid: it asks for **Number of Blocks**
and **Total Units** as fixed integers, and units are auto-generated only as
`{PREFIX}{zero-padded-number}` (e.g. `A01`). Real properties vary far more:
custom codes (`A-101`, `PH01`, `Villa 12`, `Shop A`), no blocks at all,
single buildings with floors, standalone villas, and free-form structures.

This is **Phase 1 of a 3-phase effort**:

- **Phase 1 (this doc) — Foundation.** Flexible schema, backward-compat
  migration, a flexible unit generator, manual string unit entry, and
  occupancy auto-calc. Delivers a functional (if plain) unit-management UI.
- **Phase 2 — Experience.** The 6-step onboarding wizard (4 structure types)
  and the polished structure-management screen (tree view, floor grouping).
- **Phase 3 — Import/Types.** CSV/Excel import with validation preview,
  configurable unit types, and export.

Each phase gets its own spec → plan → implementation cycle.

## Existing architecture (verified before design)

- Firestore uses **flat top-level collections**: `/properties`, `/blocks`,
  `/units`, `/tenants`, `/visitors`, `/deliveries`, `/preApproved`,
  `/occupancies`. Children reference parents by `propertyId` / `blockId`
  fields (no subcollections).
- `Unit.unitNumber` is **already a `string`** (e.g. `"A01"`). The "unit is not
  an integer" principle is already true at the data layer.
- Creating a property does **not** auto-generate blocks/units. Blocks are
  created separately via `BlockFormPage`, which can optionally auto-generate
  units. `Property.numberOfBlocks` / `totalUnits` are therefore just planning
  numbers, independent of the actual `blocks`/`units` docs.
- Firestore security rules gate reads/writes on **`propertyId`** and never
  reference `blockId`, so making blocks optional does not affect any rule.
- `AdminDashboard` and `PropertyDetailPage` already compute occupancy by
  **counting real unit docs**. Only `PropertiesPage` displays the stored
  `numberOfBlocks` / `totalUnits`.
- `generateUnitNumbers(prefix, count)` in `src/utils/units.ts` is the only
  generator and is rigid (forced uppercase, min-2 padding, no start offset,
  no "no prefix"). Its only caller is `BlockFormPage`.
- Stack: `react-hook-form` + `zod` are installed. **No** CSV/Excel library is
  installed (relevant to Phase 3, not Phase 1).

## Design decisions (locked during brainstorming)

1. **Floors = optional string label on `Unit`** (not a new collection).
2. **Migration = lazy-compat read-helpers + an optional backfill script.**
   Existing docs work untouched; the script is opt-in for clean data.
3. **Field naming = keep `unitNumber` as the code + add `displayName` /
   `unitType`.** No renames of the denormalized `unitNumber` across
   tenants/visitors/deliveries/preApproved/occupancies.
4. **Building/Block:** keep the existing `blocks` collection; only relabel to
   "Building / Block" in UI copy where helpful. No collection rename.

## Goal (Phase 1)

The data model can represent any real property structure, occupancy is derived
from real records, and a Super Admin can build blocks / single-building /
villas / custom-code structures via a flexible generator and manual entry —
while **every existing property, tenant, visitor, and delivery keeps working
unchanged.**

## Data model changes (`src/types/index.ts`)

All changes are **additive or constraint-loosening** — no field removals, no
renames.

**Property**
- Add `structureType?: 'BLOCKS' | 'SINGLE_BUILDING' | 'VILLAS' | 'CUSTOM'`.
  Absent ⇒ treated as `BLOCKS` (legacy default).
- Make `numberOfBlocks?: number` and `totalUnits?: number` **optional**
  (retained for compat; no longer required inputs; still written best-effort by
  block/unit creation as today).

**Unit**
- `blockId: string` → `blockId: string | null`.
- `blockName?: string` → `blockName?: string | null`.
- `floor?: number` → `floor?: string` (label, e.g. `"Ground"`, `"1st Floor"`,
  `"PH"`). Read-time coercion handles existing numeric values.
- Add `displayName?: string` (defaults to `unitNumber` for display).
- Add `unitType?: string` (free-form in P1; managed list in P3).
- `unitNumber` unchanged — remains the string **unit code**.

**Tenant / Visitor / Delivery / PreApprovedVisitor / OccupancyRecord**
- Make `blockId` and `blockName` optional/nullable so block-less units are
  valid. No other changes; no renames.

## Backward-compat read-helpers (new `src/domain/unitHelpers.ts`)

Centralize every fallback so pages never sprinkle conditionals:

- `unitDisplayName(u): string` → `u.displayName || u.unitNumber`
- `unitFloorLabel(u): string` → `typeof u.floor === 'number' ? String(u.floor)
  : (u.floor ?? '')`
- `propertyStructureType(p): StructureType` → `p.structureType ?? 'BLOCKS'`

## Flexible unit generator (`src/utils/units.ts`)

New pure function:

```
generateUnitCodes({
  prefix = '',      // optional; '' → no prefix ("101", "102")
  start = 1,        // starting number ("101" → A-101, A-102, …)
  count,            // how many
  padding = 0,      // leading-zero width; 0 → natural width; 2 → "01"
}): string[]
```

- No forced uppercase (respect what the admin typed).
- `generateUnitNumbers(prefix, count)` is reimplemented as a thin wrapper over
  `generateUnitCodes` (or its single caller in `BlockFormPage` is updated
  directly) so existing behavior is preserved.
- Fully unit-tested, including acceptance numbering (`A01`–`A24`, `A-101`–
  `A-112`, `101`–`106`, no-prefix and `001`-style padding).

## Unit service (`src/services/unitService.ts` — new or extended)

- `createUnit(input)` — validate: `unitCode` required, **unique within the
  property** (query `units where propertyId == … && unitNumber == code`),
  reasonable length. Defaults `displayName ← code`, `status ← 'VACANT'`,
  optional `blockId` / `blockName` / `floor` / `unitType`.
- `createUnitsBatch(units[])` — atomic `writeBatch` for generated sets; updates
  `Property.totalUnits` (and `numberOfBlocks` when a block is created)
  best-effort via `increment`.
- `renameUnit` / `updateUnitCode` — re-check uniqueness; if the unit is
  occupied, update the tenant's denormalized `unitNumber` in the same batch.
- `deleteUnit` — refuse if `currentTenantId` is set unless an explicit
  `confirm` flag is passed; Super-Admin only (matches existing rules).

Uniqueness is enforced at the application layer (Firestore cannot express a
unique constraint) — consistent with existing app patterns.

## Occupancy auto-calc + drop rigid totals

- Add `computeOccupancy(units)` → `{ total, occupied, vacant, reserved,
  maintenance }`.
- `PropertiesPage`: display **real counts** (`blocks.length` / `units.length`
  and occupancy from unit statuses) instead of stored `numberOfBlocks` /
  `totalUnits`. When no units exist, show **"0 Units configured"** rather than
  requiring a fake total.

## Property form change (`src/pages/admin/PropertyFormPage.tsx`)

- Add the **"How is this property organized?"** `structureType` selector
  (Blocks & Buildings / Single Building / Villas / Custom).
- **Remove** the mandatory *Number of Blocks* and *Total Units* inputs (they
  were only planning numbers and nothing was generated from them). Existing
  properties that already have these values keep them; they are simply no
  longer required or shown as inputs.
- The full 6-step wizard is **Phase 2**; Phase 1 only adds the structure-type
  selector and drops the rigid numeric requirement.

## Unit-management UI (Phase-1-sufficient)

Extend `PropertyDetailPage` (and update `BlockFormPage` to use the new
generator) so a Super Admin can:

- **Add Units → Generate**: prefix / start / count / padding inputs with a
  **live preview** that updates as they type; creates via `createUnitsBatch`.
- **Add Units → Manual**: single-unit form — Unit Code (required), Display
  Name (defaults to code, editable), Floor label (optional), Unit Type
  (optional), Status.
- Do both **with or without a block selected**, so villas and single-building
  properties work.

This is intentionally plain — the polished tree/structure-management screen and
onboarding wizard are Phase 2. It is enough to satisfy acceptance tests 1–5.

## Migration strategy

- **Primary — lazy compatibility:** the read-helpers above mean existing docs
  render and function with zero changes. Absent `structureType` ⇒ `BLOCKS`;
  numeric `floor` coerced to string on read; missing `displayName` ⇒
  `unitNumber`.
- **Optional — backfill script** `scripts/backfill-structure.ts` (mirrors the
  existing `scripts/sync-claims.ts` admin-SDK pattern): iterate properties and
  units to write `structureType`, `displayName`, and coerce `floor` to string.
  Idempotent; safe to run repeatedly; never deletes.

## Firestore rules

**No changes required.** Rules gate on `propertyId`, never reference `blockId`,
and do not validate field shapes, so the new optional fields are accepted and
block-less units read/write under the existing property-scoped rules.

## Validation (zod)

- **Manual unit form:** `unitCode` (min 1, max ~20, required), `displayName`
  optional, `floor` optional string, `unitType` optional, `status` enum
  (`VACANT | OCCUPIED | RESERVED | MAINTENANCE`). Uniqueness checked
  asynchronously in `unitService`.
- **Generator config:** `count` 1..500, `start` >= 0, `padding` 0..4, `prefix`
  optional string.
- Unit codes are **never** validated as numbers.

## Testing

- **Unit tests:** `generateUnitCodes` across prefix/start/count/padding cases
  incl. acceptance numbering; uniqueness/validation pure logic;
  `computeOccupancy`.
- **Static:** `tsc` clean, lint clean.
- **Manual:** create blocks property (Test 1: 96 units), single-building
  (Test 2: 18 units), villas (Test 3: 4 units), custom codes (Test 4:
  `Penthouse East`, `Shop A`, `Office B-203`), verify an existing property
  (Test 5) still renders with intact tenant/visitor records, tenant
  assignment, and visitor registration.

## Acceptance criteria (Phase 1)

1. A Super Admin can create units with arbitrary string codes (`A01`, `A-101`,
   `101`, `Villa 12`, `PH-East`, `Shop A`) — no integer assumption anywhere.
2. Units can exist with **no block** and with **no floor**.
3. The flexible generator produces the acceptance-test numberings with live
   preview, including no-prefix and configurable leading zeros.
4. Manual single-unit creation works; unit code is required and unique within
   the property; duplicates are rejected with a clear message.
5. Occupancy/unit totals are computed from real docs; the property form no
   longer requires Number of Blocks / Total Units; empty shows
   "0 Units configured".
6. All existing properties, tenants, units, visitors, and deliveries continue
   to work unchanged (verified against a pre-existing property).

## Out of scope (later phases)

- 6-step onboarding wizard and polished structure-management tree (Phase 2).
- CSV/Excel import with validation preview and export (Phase 3).
- Configurable/managed unit-type catalog (Phase 3).

## Backward-compatibility guarantees

- No field renames; `blockId` / `floor` only loosened, never removed.
- Numeric floors coerced on read; absent `structureType` treated as `BLOCKS`.
- Migration/backfill never rewrites denormalized `unitNumber` / `blockName`
  copies on tenants, visitors, deliveries, pre-approvals, or occupancies.
  (The *only* place a denormalized copy changes is an explicit admin
  `renameUnit`/`updateUnitCode` action, which syncs the **active tenant's**
  `unitNumber` in the same batch so the live occupancy link stays correct;
  historical visitor/delivery records keep their point-in-time values.)
- Backfill script is optional; nothing depends on it having run.
