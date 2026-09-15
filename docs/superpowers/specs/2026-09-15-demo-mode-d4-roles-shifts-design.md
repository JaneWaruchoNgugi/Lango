# Demo Mode D4 — Guard / Caretaker / Resident + Shifts (Design)

**Date:** 2026-09-15
**Branch:** feat/demo-mode
**Slice:** D4 of the Lango Interactive Demo Mode roadmap.

## Goal

Replace the guard / caretaker / resident placeholders with real, interactive
dashboards that reuse the D2/D3 building blocks, and add a shift lifecycle. This
lights up the role-switcher fully: a request approved by a resident appears in the
guard's Currently-Inside and on the manager's activity feed, because every role
reads and writes the **same** demo store.

## Constraints (unchanged)

- Everything under `src/demo/`; no `firebase` / `AuthContext` / `/services/` imports.
- Reuse the design system and existing demo components. Store mutations only;
  ids via `crypto.randomUUID()`; new activity prepended with `timeLabel: 'Just now'`.
- TDD the store/logic (shift actions + selector). Pages are build-verified.

## Personas (`src/demo/data/personas.ts`, new)

A single source of truth for which seeded records each non-manager role "is":

```ts
export const GUARD_STAFF_ID = 's-2'      // Anthony Kimani, Security Guard
export const CARETAKER_STAFF_ID = 's-5'  // Peter Otieno, Caretaker
export const RESIDENT_UNIT = 'A-204'     // resident persona = this unit's tenant
```

## Data model change (`src/demo/data/types.ts`)

- `DemoActivityKind` gains `'SHIFT'`:
  `'CHECK_IN' | 'CHECK_OUT' | 'DELIVERY' | 'INCIDENT' | 'APPROVAL' | 'SHIFT'`.

## Seed changes (`src/demo/data/seed.ts`)

- Rename staff `s-2` from `'James Mwangi'` to `'Anthony Kimani'` (avoids a
  name collision with the inside visitor `v-1` "James Mwangi", so the guard
  persona reads cleanly).
- Give unit `A-204` an explicit tenant name `'Michael Otieno'` (add a case to the
  `buildUnits` special-case ternary alongside A-101/102/103), so the resident
  greeting is a fixed, friendly name instead of a pool-cycled one.
- `shifts`: add the caretaker's shift `{ staffId: 's-5', status: 'OFF', startedLabel: null }`
  (keep the existing `s-2` OFF entry).
- `approvals`: add a second pending approval at the resident's unit so the
  resident has a request to approve:
  `{ id: 'ap-2', visitorId: 'v-pending-2', visitorName: 'Samuel Kariuki', unitNumber: 'A-204', purpose: 'Personal visit', type: 'FRIENDLY_VISIT' }`.

Seed-test update: `approvals` length assertion `1 → 2`.

## Store: shift lifecycle (`src/demo/store/demoStore.ts`)

Selector:
- `selectShiftFor(staffId)`: `s.shifts.find(x => x.staffId === staffId)`
  (returns `DemoShift | undefined`).

Actions (log to the activity feed per the D4 decision; look up the staff name for
the entry):
- `startShift(staffId)`: set that staff's shift `status: 'ON'`,
  `startedLabel: 'Started 8:02 AM'`. Activity: `SHIFT` ·
  `${name} started their shift` · `${staffRole}`.
- `endShift(staffId)`: set `status: 'OFF'`, `startedLabel: null`.
  Activity: `SHIFT` · `${name} ended their shift` · `${staffRole}`.

Both are guarded: if no shift/staff matches the id, `return {}` (no-op).

## Shared presentation components (extract + new)

To keep the three dashboards DRY, extract the primitives currently duplicated
inside existing pages, then reuse them:

- **`src/demo/components/DemoStat.tsx`** (extract from `DemoManagerDashboard`):
  the `.stat-card` tile `{ icon, label, value, tint }`.
- **`src/demo/components/DemoActivityFeed.tsx`** (extract from
  `DemoManagerDashboard`): the activity list plus the `ACTIVITY_ICON` /
  `ACTIVITY_TINT` maps, now including `SHIFT` (Clock icon, gray/`bg-gray-100 text-gray-600`).
  Props: `{ activity, limit? }`.
- **`src/demo/components/DemoRegisterVisitorForm.tsx`** (extract the modal from
  `DemoVisitorsPage`): `{ onClose }`; calls `registerVisitor`.
- **`src/demo/components/DemoPendingApprovals.tsx`** (extract the list from
  `DemoVisitorsPage`): approve/decline rows. Prop `{ unitNumber?: string }` —
  when provided, filters approvals to that unit (used by the resident). When
  absent, shows all (used by manager/guard/caretaker).
- **`src/demo/components/DemoShiftPanel.tsx`** (new): a shift banner for a given
  `{ staffId, staffName }` — shows ON (green, with `startedLabel`) or OFF (gray)
  and a Start Shift / End Shift button wired to `startShift`/`endShift`, plus a toast.

### Refactors (no behavior change)
- `DemoManagerDashboard` uses `DemoStat` + `DemoActivityFeed`.
- `DemoVisitorsPage` uses `DemoRegisterVisitorForm` + `DemoPendingApprovals`.
  (Its `justApproved` banner and hero stay in the page.)

## Shared role pages (new, reused across guard + caretaker)

- **`src/demo/components/DemoRegisterVisitorPage.tsx`**: header + `lango-dark`
  hero (register-sample + register-your-own buttons) + `DemoPendingApprovals`
  + `DemoCurrentlyInside`. Used at `guard/register` and `caretaker/register`.
- **`src/demo/components/DemoInsidePage.tsx`**: header + `DemoCurrentlyInside`.
  Used at `guard/inside` and `caretaker/inside`.
- **`src/demo/components/DemoShiftPage.tsx`**: header + `DemoShiftPanel` for a
  given staff. Used at `guard/shift` (props supplied by a thin wrapper).

## Role dashboards (new)

### `DemoGuardDashboard` (`/demo/guard`)
- Greeting from `staff[GUARD_STAFF_ID].name` ("Good day, Anthony Kimani 👋 · Security Gate").
- `DemoShiftPanel` for the guard (Start/End Shift).
- Four `DemoStat` tiles: Visitors Today (`selectVisitorsToday`), Currently Inside
  (`selectCurrentlyInside`), Expected (`selectExpectedToday`), Pending Approval
  (`selectPendingApprovals().length`).
- Quick-action buttons: Register Visitor → `guard/register`, Currently Inside →
  `guard/inside` (react-router `Link`s styled as buttons).
- `DemoCurrentlyInside` preview.

### `DemoCaretakerDashboard` (`/demo/caretaker`)
- Greeting from `staff[CARETAKER_STAFF_ID].name`.
- `DemoShiftPanel` for the caretaker (shift lives on Home — caretaker nav has no
  separate shift route).
- Quick actions: Register Visitor → `caretaker/register`, Currently Inside →
  `caretaker/inside`.
- `DemoActivityFeed` (recent activity), `limit` ~6.

### `DemoResidentDashboard` (`/demo/resident`)
- Greeting: "Welcome, {A-204 tenant name} 👋" + "Apartment A-204".
- **Visitor requests**: `DemoPendingApprovals` scoped `unitNumber={RESIDENT_UNIT}`
  → resident approves/declines; approving pushes the visitor INSIDE in the shared
  store (visible to guard + manager).
- **Currently visiting you**: read-only list of INSIDE visitors whose
  `unitNumber === RESIDENT_UNIT`.
- **Your deliveries**: read-only list of deliveries whose
  `unitNumber === RESIDENT_UNIT`, each with a `DemoDeliveryBadge`.

## Routing (`src/demo/DemoApp.tsx`)

Replace the guard/caretaker/resident placeholder blocks:

```tsx
<Route path="guard" element={<DemoShell role="GUARD" />}>
  <Route index element={<DemoGuardDashboard />} />
  <Route path="register" element={<DemoRegisterVisitorPage />} />
  <Route path="inside" element={<DemoInsidePage />} />
  <Route path="shift" element={<DemoShiftPage staffId={GUARD_STAFF_ID} />} />
  <Route path="*" element={<DemoPlaceholder />} />
</Route>

<Route path="caretaker" element={<DemoShell role="CARETAKER" />}>
  <Route index element={<DemoCaretakerDashboard />} />
  <Route path="register" element={<DemoRegisterVisitorPage />} />
  <Route path="inside" element={<DemoInsidePage />} />
  <Route path="*" element={<DemoPlaceholder />} />
</Route>

<Route path="resident" element={<DemoShell role="RESIDENT" />}>
  <Route index element={<DemoResidentDashboard />} />
  <Route path="*" element={<DemoPlaceholder />} />
</Route>
```

`DemoShiftPage` accepts a `staffId` prop and looks up the staff name from the
store. Nav (`src/demo/config/nav.ts`) is unchanged — the existing per-role nav
already matches these routes.

## Testing (Vitest, `src/demo/store/demoStore.test.ts` additions)

- `selectShiftFor` returns the seeded shift for a staff id; `undefined` for unknown.
- `startShift` flips OFF→ON, sets `startedLabel`, and logs a `SHIFT` activity
  titled "… started their shift".
- `endShift` flips ON→OFF, clears `startedLabel`, logs "… ended their shift".
- `startShift`/`endShift` are no-ops for an unknown staff id.

Seed test: `approvals` length is 2; both `s-2` and `s-5` have a shift entry.

## Verification commands

```
npx tsc -p tsconfig.app.json --noEmit
npx vitest run src/demo
npm run build
grep -rEn "firebase|AuthContext|/services/" src/demo   # expect no hits
```

## Out of scope (D5)

Guided tour + completion CTA. No delivery/incident routes for caretaker (kept to
its nav). Residents cannot check visitors out (read-only there by design).
