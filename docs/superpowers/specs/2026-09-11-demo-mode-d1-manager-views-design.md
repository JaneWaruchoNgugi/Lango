# Demo Mode — D1: Property Manager Read Views Design

**Date:** 2026-09-11
**Status:** Approved
**Part of:** Interactive Demo Mode initiative (D0–D5). This is **D1**.
**Branch:** `feat/demo-mode` (continues D0).

## Goal

Replace the three placeholder Property Manager routes (Tenants, Blocks & Units, Staff) with real demo pages driven by the demo store, reusing the production design system. Include light tenant add/edit that mutates the shared demo store so changes surface on the dashboard's Recent Activity.

## Context

D0 shipped the demo foundation: `src/demo/` with a zustand store (`useDemoStore`), a deterministic `seed()`, `DemoShell` (reuses `AppShell`), and a PM dashboard. The manager nav (`src/demo/config/nav.ts`) already lists Tenants (`/demo/manager/tenants`), Blocks & Units (`/demo/manager/units`), and Staff (`/demo/manager/staff`); today they render `DemoPlaceholder` via the `*` route in `src/demo/DemoApp.tsx`. Production read pages (`BlocksUnitsPage`, `TenantsPage`, `StaffPage`) provide the visual pattern to mirror; the demo pages reuse the same CSS classes (`.card`, `.input`, `.badge-*`), `StatusBadge` components, and `Modal`.

## 1. Seed reconciliation — floor-based unit numbering

D0 numbered units `A01…A24`, but visitor/delivery/dashboard data uses `A-204`, `B-103`, `C-301`, `A-103`. To let the unit-detail modal filter per-unit activity, the demo standardizes on **floor-based numbering**:

- Each block A–D has floors 1–6, 4 units per floor → `${block}-${floor}${unit:02}` = `A-101 … A-604`, 24 units/block, 96 total.
- Tenant overrides move to the first three units: `A-101` John Kamau, `A-102` Mary Wanjiku, `A-103` Jane Njeri.
- `A-204` must be OCCUPIED (visitors and a delivery reference it).
- Vacancy pattern stays deterministic (a fixed rule over the per-block unit index) so counts remain stable and `seed()` stays deterministic.
- `DemoUnit` gains `previousTenants: string[]`. A few showcase units get a light history (e.g. `A-204`: `['Kevin Barasa (2022–2024)']`); the rest are `[]`.

The D0 seed generator (`src/demo/data/seed.ts`) and its tests (`seed.test.ts`) are updated for the new numbering. Headline counts are unchanged: 4 blocks, 96 units, residentCount 142, tenants === occupied units.

## 2. Store additions (`src/demo/store/demoStore.ts`)

- `DemoUnit.previousTenants: string[]` (via the type change in §1).
- New actions:
  - `addTenant({ name, phone, unitNumber })`: pushes a new `DemoTenant`, flips that unit (matched by `unitNumber`) to `OCCUPIED` with `tenantName = name`, and prepends an activity entry with the existing kind `'APPROVAL'` (UserCheck icon) titled "Tenant added". (Reuses `addActivity` semantics — no new `DemoActivityKind` needed, so the dashboard's icon/tint maps are untouched.)
  - `updateTenant(id, { name, phone })`: updates the tenant; if the name changed, syncs the matching unit's `tenantName`.
- Both are pure state transitions on the store; no Firestore, no network.
- A selector/helper `selectVacantUnits(state)` returns units with status `VACANT` (for the add-tenant unit picker).

## 3. Pages

All under `src/demo/pages/manager/`, each a default-exported component reading the store via selectors.

### `DemoTenantsPage.tsx`
- Header ("Tenants") + **Add Tenant** button.
- Search input filtering by name/unit/phone.
- List rows: name, `block • unit · phone`, `TenantStatusBadge status="ACTIVE"`, an **Edit** button, and a click target opening a read-only tenant detail modal (name, unit, phone, status).
- **Add/Edit modal** (`DemoTenantForm`): `Modal` with name + phone inputs; add-mode also has a vacant-unit `<select>` (from `selectVacantUnits`). Submit calls `addTenant`/`updateTenant`, toasts, closes. New tenant appears in the list and on the dashboard activity.

### `DemoUnitsPage.tsx`
- Blocks/Units tabs mirroring the production `BlocksUnitsPage`.
- Blocks tab: block summary cards (occupied/total, a block status pill).
- Units tab: responsive unit grid, each tile shows unit number + `UnitStatusBadge`; search by unit/tenant; optional block filter.
- Clicking a unit opens `DemoUnitDetailModal`.

### `DemoUnitDetailModal.tsx`
`Modal` titled by unit number showing: `UnitStatusBadge`, current tenant (or "Vacant"), **Previous tenants** (from `unit.previousTenants`, else "None on record"), **Recent visitors** (store visitors filtered by `unitNumber`, else empty state), **Recent deliveries** (store deliveries filtered by `unitNumber`, else empty state).

### `DemoStaffPage.tsx`
- List of the seeded staff: name, role, `StaffStatusBadge`. View-only. Reuses `.card` list styling.

## 4. Routing (`src/demo/DemoApp.tsx`)

Replace the manager block's single `*`→placeholder with explicit nested routes:

```
<Route path="manager" element={<DemoShell role="MANAGER" />}>
  <Route index element={<DemoManagerDashboard />} />
  <Route path="tenants" element={<DemoTenantsPage />} />
  <Route path="units" element={<DemoUnitsPage />} />
  <Route path="staff" element={<DemoStaffPage />} />
  <Route path="*" element={<DemoPlaceholder />} />
</Route>
```

The remaining manager nav items (visitors, deliveries, incidents) still fall through to `DemoPlaceholder` until D2/D3.

## 5. Testing

- `seed.test.ts`: updated for floor-based numbering — `A-101`/`A-102`/`A-103` tenant overrides, `A-204` exists and is OCCUPIED, still 4 blocks / 96 units / residentCount 142, tenants length === occupied units, deterministic.
- `demoStore.test.ts`: `addTenant` adds a tenant, flips the target unit to OCCUPIED, and prepends an activity entry; `updateTenant` edits name/phone and syncs the unit's `tenantName`; `selectVacantUnits` returns only VACANT units and shrinks by one after `addTenant`.

## Out of scope (later)

Visitors/Deliveries/Incidents interactive pages (D2/D3); tenant move-out and unit reassignment; staff add/edit; guided tour (D5).
