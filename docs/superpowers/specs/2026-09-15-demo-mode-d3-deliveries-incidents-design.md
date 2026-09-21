# Demo Mode D3 — Delivery + Incident Workflows (Design)

**Date:** 2026-09-15
**Branch:** feat/demo-mode
**Slice:** D3 of the Lango Interactive Demo Mode roadmap (see `docs/superpowers/DEMO-MODE-D3-D5-HANDOFF.txt`)

## Goal

Make the Property Manager **Deliveries** and **Incidents** pages fully interactive,
removing their placeholders. Every button mutates the demo store and logs an
activity entry, so the dashboard's live stats and Recent Activity update in real
time — reinforcing the "everything is connected in one system" sales story.

## Constraints (unchanged from the roadmap)

- Everything lives under `src/demo/`. Nothing in `src/demo` may import
  `firebase`, `AuthContext`, or `/services/`.
  Verify: `grep -rEn "firebase|AuthContext|/services/" src/demo` → no hits.
- Reuse the design system: `DemoShell`, `Modal`, `.card` / `.stat-card` /
  `.btn-primary` / `.btn-secondary` / `.input` / `.label` / `.section-title` /
  `.badge badge-{variant}`, theme tokens (`lango-primary` #2563eb, `lango-dark`),
  `lucide-react` icons, `react-hot-toast`.
- Store mutations only; new ids via `crypto.randomUUID()`; activity entries are
  prepended with `timeLabel: 'Just now'`.
- TDD the store/logic. Reuse existing selectors so dashboard counts stay live.

## Data model changes (`src/demo/data/types.ts`)

- `DemoDeliveryStatus` gains `'EXPECTED'`:
  `'EXPECTED' | 'RECEIVED' | 'COLLECTED' | 'HELD'`.
  Flow: **Expected → [Check In] → Received → [Mark Collected] → Collected.**
- `DemoIncident` gains an optional assignee:
  `assignedTo?: string` (staff member's display name; absent = unassigned).

No other type changes. `DemoActivityKind` already includes `'DELIVERY'` and
`'INCIDENT'` (icons/tints already mapped in `DemoManagerDashboard`).

## Seed changes (`src/demo/data/seed.ts`)

- Deliveries `d-1`..`d-4`: change `status` from `'RECEIVED'` to `'EXPECTED'`
  so each has a full lifecycle to demonstrate. Companies/units/expectedLabels
  unchanged (Uber Eats A-204, Courier B-102, FedEx C-301, Amazon A-103).
- Incident `i-1` (Suspicious Person, Block B, OPEN) unchanged; `assignedTo`
  omitted (unassigned).

## Store actions (`src/demo/store/demoStore.ts`)

All follow the established lifecycle-action shape: find the target; if missing
return `{}`; otherwise return the updated list plus a prepended activity entry
`{ id: 'act-${uuid}', kind, title, subtitle, timeLabel: 'Just now' }`.

### Deliveries
- `checkInDelivery(id)`: `EXPECTED → RECEIVED`.
  Activity: `DELIVERY` · "Delivery checked in" · `${unitNumber} · ${company}`.
- `collectDelivery(id)`: `RECEIVED → COLLECTED`.
  Activity: `DELIVERY` · "Delivery collected" · `${unitNumber} · ${company}`.
- `registerDelivery({ company, unitNumber })`: append a new delivery
  `{ id: 'd-${uuid}', company, unitNumber, expectedLabel: 'Just now', status: 'EXPECTED' }`.
  Activity: `DELIVERY` · "Delivery registered" · `${unitNumber} · ${company}`.

Guarded: `checkInDelivery` only acts on an `EXPECTED` delivery; `collectDelivery`
only on a `RECEIVED` one (mirrors `checkOutVisitor`'s status guard). Wrong-state
or unknown ids are no-ops (`return {}`).

### Incidents
- `createIncident({ type, location, reportedBy })`: append
  `{ id: 'i-${uuid}', type, location, reportedBy, timeLabel: 'Just now', status: 'OPEN' }`.
  Activity: `INCIDENT` · "Incident reported" · `${location} · ${type}`.
  Raises `selectOpenIncidents`.
- `setIncidentStatus(id, status)`: set the incident's `status` to the given
  `DemoIncidentStatus`. Activity title reflects the transition:
  `INVESTIGATING` → "Incident under investigation", `RESOLVED` → "Incident resolved",
  `OPEN` → "Incident reopened". Subtitle `${location} · ${type}`.
  Resolving lowers `selectOpenIncidents`.
- `assignIncident(id, staffName)`: set `assignedTo = staffName`.
  Activity: `INCIDENT` · "Incident assigned" · `${staffName} · ${location}`.

### Selectors
No new selectors required for the dashboard. `selectOpenIncidents` already drives
the Open-Incidents stat. (A `selectPendingDeliveries` helper may be introduced in
D4 for the guard/caretaker dashboards; out of scope here.)

## Presentation components

### `src/demo/components/DemoBadges.tsx` (new)
Small, isolated badges using the global `.badge badge-{variant}` classes, typed to
the demo unions so the new `EXPECTED` and incident-lifecycle states render without
touching the production `StatusBadge` (whose `DeliveryStatus` has no `EXPECTED` and
which offers only `IncidentSeverityBadge`, not a status pill).

- `DemoDeliveryBadge({ status })`:
  EXPECTED → gray "Expected", RECEIVED → blue "Received",
  COLLECTED → green "Collected", HELD → yellow "Held".
- `DemoIncidentBadge({ status })`:
  OPEN → red "Open", INVESTIGATING → yellow "Investigating",
  RESOLVED → green "Resolved".

### `src/demo/pages/manager/DemoDeliveriesPage.tsx` (new)
Mirrors `DemoVisitorsPage` structure:
- Header (icon + title + subtitle).
- `lango-dark` hero explainer card: "See how parcel handling works" + a
  "Register a delivery" button (opens the modal) and a one-click "Register the
  sample delivery" convenience button.
- List of deliveries as `.card` rows: `company` · `unitNumber` · `expectedLabel`,
  a `DemoDeliveryBadge`, and a contextual action button:
  - `EXPECTED` → **Check In** (`checkInDelivery`)
  - `RECEIVED` → **Mark Collected** (`collectDelivery`)
  - `COLLECTED`/`HELD` → no button (terminal for the demo).
  Each action fires a toast.
- Register-a-delivery `Modal`: company text input + unit `<select>` (from
  `store.units`). Validates non-empty company; calls `registerDelivery`.

### `src/demo/pages/manager/DemoIncidentsPage.tsx` (new)
- Header + `lango-dark` hero explainer: "See how incidents are tracked" +
  "Report an incident" button.
- List of incidents as `.card` rows: `type`, `location · reportedBy · timeLabel`,
  a `DemoIncidentBadge`, an "Assigned to {name}" line when assigned, and
  contextual buttons by status:
  - `OPEN` → **Mark Investigating** (`setIncidentStatus(id,'INVESTIGATING')`)
  - `INVESTIGATING` → **Resolve** (`setIncidentStatus(id,'RESOLVED')`)
  - `OPEN`/`INVESTIGATING` → **Assign** (opens a small staff picker → `assignIncident`)
  - `RESOLVED` → no action (terminal).
- Report-an-incident `Modal`: type text input + location text input;
  `reportedBy` defaults to the manager ("Mercy Njeri"). Calls `createIncident`.
- Assign picker: a `Modal` (or inline `<select>`) listing `store.staff` names.

## Routing (`src/demo/DemoApp.tsx`)

Add to the manager block, before the `*` placeholder:
```tsx
<Route path="deliveries" element={<DemoDeliveriesPage />} />
<Route path="incidents" element={<DemoIncidentsPage />} />
```
Nav already lists both (`DEMO_NAV.MANAGER`), so no nav change is needed.

## Testing (Vitest, `src/demo/store/demoStore.test.ts` additions)

Deliveries:
- `checkInDelivery` moves an EXPECTED delivery to RECEIVED and logs
  "Delivery checked in"; is a no-op on a non-EXPECTED delivery.
- `collectDelivery` moves a RECEIVED delivery to COLLECTED and logs
  "Delivery collected"; is a no-op on a non-RECEIVED delivery.
- `registerDelivery` appends an EXPECTED delivery and logs "Delivery registered".

Incidents:
- `createIncident` appends an OPEN incident and raises `selectOpenIncidents`.
- `setIncidentStatus(id,'RESOLVED')` lowers `selectOpenIncidents`; INVESTIGATING
  does not.
- `assignIncident` sets `assignedTo` and logs "Incident assigned".

Seed test (`src/demo/data/seed.test.ts` addition): all four seed deliveries are
`EXPECTED`.

## Verification commands

```
npx tsc -p tsconfig.app.json --noEmit
npx vitest run src/demo
npm run build
grep -rEn "firebase|AuthContext|/services/" src/demo   # expect no hits
```

## Out of scope (later slices)

- Guard/caretaker/resident dashboards and shift actions (D4).
- Guided tour + completion CTA (D5).
- Any delivery "Held/Returned" workflow beyond rendering the badge.
```