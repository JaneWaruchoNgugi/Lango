# Demo Mode — Foundation (D0) Design

**Date:** 2026-09-11
**Status:** Approved
**Part of:** Interactive Demo Mode initiative (sub-projects D0–D5). This is **D0**.
**Branch:** `feat/demo-mode` (cut from `feat/visitor-detail-fields` HEAD; can rebase onto main later).

## Goal

A polished, isolated "Demo Mode" that lets prospects experience Lango without a real account, using seeded fictional data. D0 delivers the foundation: an in-memory demo store, `/demo/*` routing outside auth, a role-selection entry screen, a persistent DEMO MODE indicator, Reset, a landing CTA, and a fully populated Property Manager dashboard.

## Architecture decision

The existing app is tightly bound to Firestore/auth: every page follows `Page → hook → service → Firestore db singleton`, with no injectable seam, and pages depend on `useAuth`, `propertyId` claims, audit logs, notifications, and photo upload. Making the *real* pages render demo data would require refactoring 9 hooks + `CaretakerDashboard` + write paths — broad production risk.

**Chosen approach (Option B): an isolated demo module.** All demo code lives in `src/demo/`, mounted at `/demo/*` outside `ProtectedRoute` and Firebase. It **reuses the design system** — the shared responsive `AppShell`, `StatusBadge`, `Modal`, CSS component classes (`.card`, `.stat-card`, `.btn-*`, `.badge-*`), theme tokens (`lango-primary`, `lango-dark`, `lango-light`), and lucide icons — so it looks like real Lango while remaining fully decoupled. Production is touched in exactly two places: one route in `App.tsx` and one CTA button in the landing hero. Removing the demo = delete `src/demo/` + revert those two edits.

**Store:** `zustand` (new dependency) with the `persist` middleware backed by **sessionStorage** (`name: 'lango-demo'`): state survives page refresh within a tab; a new tab/session starts from a fresh seed.

**Isolation of types:** Demo state uses lightweight local interfaces with plain `Date`/`string` times — NOT the production Firestore types (which use `Timestamp`). This keeps the demo independent of production model changes.

## Components (all under `src/demo/`)

### 1. `store/demoStore.ts`
Zustand store created via `create(persist(...))`. Full state shape defined now so later slices only add action bodies:

```
DemoState = {
  role: DemoRole | null            // 'MANAGER' | 'GUARD' | 'CARETAKER' | 'RESIDENT'
  property: DemoProperty           // Greenview Apartments, residentCount 142, etc.
  blocks: DemoBlock[]              // 4
  units: DemoUnit[]               // 96
  tenants: DemoTenant[]           // primary tenant per occupied unit
  visitors: DemoVisitor[]         // includes the 2 currently INSIDE + today's log
  deliveries: DemoDelivery[]      // 2 today
  incidents: DemoIncident[]       // 1 OPEN
  staff: DemoStaff[]              // 3 guards + 1 caretaker + manager
  activity: DemoActivity[]        // seeded recent events (newest first)
  shifts: DemoShift[]             // guard shift state
  approvals: DemoApproval[]       // 1 pending visitor approval
}
```

D0 actions: `setRole(role)`, `resetDemo()` (restores a fresh `seed()`), `addActivity(entry)`.
Later slices (D2–D4) add: `approveVisitor`, `declineVisitor`, `checkInVisitor`, `checkOutVisitor`, `registerDelivery`, `collectDelivery`, `createIncident`, `resolveIncident`, `startShift`, `endShift`.

Selectors (pure functions over state, exported for reuse + testing):
- `selectCurrentlyInside(s)` → visitors with `status === 'INSIDE'` (seed: 2).
- `selectOpenIncidents(s)` → incidents with `status === 'OPEN'` (seed: 1).
- `selectVisitorsToday(s)` / `selectExpectedToday(s)` → seed-derived counts (8 / 5).

### 2. `data/seed.ts`
Deterministic (no `Math.random`) factory `seed(): DemoState`:
- **Greenview Apartments**, Nairobi, `residentCount: 142`.
- 4 blocks (A–D), 24 units each (`A01`–`A24`, …) = 96 units. A deterministic subset marked OCCUPIED with a primary tenant drawn from a fixed fictional-name pool; the rest VACANT.
- Staff: **Mercy Njeri** (Property Manager, Active), 3 guards (mix of Active/Inactive per the brief — David Mwangi Inactive, James Mwangi Active, Samuel Kiptoo Inactive), 1 caretaker (Peter Otieno, Active).
- 2 visitors currently INSIDE (e.g. James Mwangi A-204 Personal; Grace Njeri B-103 Service Provider), today's visitor log summing to 8.
- 2 deliveries today (Uber Eats A-204 Waiting; Courier B-102 Waiting) plus later-expected ones (FedEx C-301, Amazon A-103).
- 1 OPEN incident (Suspicious Person, Block B, reported by John Kamau).
- 1 pending approval (James Mwangi → A-204).
- `activity`: the 5 seeded events from the brief (checked in / checked out / delivery / service check-in / incident), newest first.
- All fictional; no real personal data.

### 3. `data/types.ts`
Local demo interfaces: `DemoRole`, `DemoProperty`, `DemoBlock`, `DemoUnit`, `DemoTenant`, `DemoVisitor`, `DemoDelivery`, `DemoIncident`, `DemoStaff`, `DemoActivity`, `DemoShift`, `DemoApproval`, `DemoState`. Status enums mirror production string unions (e.g. visitor `INSIDE | CHECKED_OUT`, incident `OPEN | INVESTIGATING | RESOLVED`) so existing `StatusBadge` components can render them.

### 4. Routing & entry
- `App.tsx`: add `<Route path="/demo/*" element={<DemoApp />} />` as a sibling of `/login` (outside `ProtectedRoute`).
- `src/demo/DemoApp.tsx`: nested `<Routes>` — `index` → `<DemoEntry />`; `manager/*` → `<DemoShell role="MANAGER"><DemoManagerDashboard/></DemoShell>`; `guard/*`, `caretaker/*`, `resident/*` → `<DemoShell><DemoPlaceholder/></DemoShell>` (temporary until D2–D4).
- `src/demo/pages/DemoEntry.tsx`: the **"Experience Lango"** screen — heading + subtitle and 4 role cards (Property Manager, Security Guard, Resident, Caretaker), each `.card` with a lucide icon; clicking calls `setRole` and navigates to that role's demo home. Reuses `lango-dark` hero styling.

### 5. Shell & indicator
- `src/demo/components/DemoShell.tsx`: wraps the existing `AppShell` with role-specific `navItems`/`bottomNav`/`roleLabel`, and renders a sticky **DEMO MODE** banner above the content containing: a "DEMO MODE — sample data" pill, a **Reset Demo** button (calls `resetDemo`, toast), a compact **role switcher**, and **Exit** (react-router `<Link to="/">`). The banner uses `lango-dark` with an amber accent so it's clearly not production.
- `src/demo/components/DemoPlaceholder.tsx`: a friendly card ("This part of the demo is coming up") for the not-yet-built role areas.

### 6. PM dashboard
- `src/demo/pages/manager/DemoManagerDashboard.tsx`: greeting ("Good afternoon, Mercy Njeri 👋 · Greenview Apartments"), a responsive stat-card grid (Visitors Today 8 · Currently Inside [live selector] · Expected Today 5 · Open Incidents [live selector]), and a **Recent Activity** timeline reading `store.activity`. Reuses `.stat-card`, `.card`, `StatusBadge`, theme tokens. Responsive: 1-col mobile → 2-col tablet → 4-col desktop for stats.

### 7. Landing CTA
- `src/pages/landing/sections/Hero.tsx`: add a secondary **"Explore Interactive Demo"** button (react-router `<Link to="/demo">`) in the existing hero CTA row, beside "Book a Free Demo". No other landing change.

## Data flow

Demo pages read state via zustand hooks/selectors and dispatch actions; the store mutates in-memory and persists to sessionStorage. No Firestore, no `useAuth`, no network. Stats that later workflows affect (Currently Inside, Open Incidents) are derived via selectors so D2/D3 automatically update the dashboard.

## Error handling

Pure in-memory; the main risk is a corrupt persisted blob. The store `persist` config uses a `version` and an `onRehydrateStorage`/migrate fallback that reseeds if the persisted shape is invalid, so a stale session can never white-screen the demo.

## Testing

Vitest over the pure store/seed logic (`src/demo/store/demoStore.test.ts`):
- `seed()` yields exactly 4 blocks, 96 units, `residentCount === 142`, 3 guards, 1 caretaker.
- `selectCurrentlyInside(seed())` length === 2; `selectOpenIncidents(seed())` length === 1.
- `selectVisitorsToday` === 8; `selectExpectedToday` === 5.
- After a mutation (e.g. push an activity), `resetDemo()` restores the seeded counts.
- `setRole('MANAGER')` sets `role`.

## Out of scope (D1–D5)

Visitor journey + Currently Inside interactivity (D2), delivery + incident workflows (D3), guard/caretaker/resident full experiences and shift start/end (D4), guided tour + completion CTA (D5), PM read views tenants/blocks/staff (D1).
