# Demo Mode Foundation (D0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an isolated Demo Mode foundation — an in-memory Zustand demo store with seeded Greenview Apartments data, `/demo/*` routing outside auth, a role-selection entry screen, a persistent DEMO MODE indicator with Reset, a landing CTA, and a populated Property Manager dashboard — reusing the existing design system.

**Architecture:** All demo code lives in `src/demo/`. It reuses the shared `AppShell` (via a thin `DemoShell` + a small backward-compatible prop addition), the CSS component classes, `StatusBadge`, and theme tokens. State is a Zustand store (sessionStorage-persisted) seeded from a deterministic `seed()`. Production is touched only in `App.tsx` (one route), `AppShell.tsx` (two optional props), and `Hero.tsx` (one CTA).

**Tech Stack:** React 19 + TypeScript + Vite, react-router-dom v7, **zustand** (new), Tailwind, Vitest, lucide-react.

**Verification commands:** Type-check `npx tsc -p tsconfig.app.json --noEmit` (root `tsc --noEmit` checks nothing — project references). Tests `npx vitest run <path>`.

---

## File Structure

- `src/demo/data/types.ts` — demo domain interfaces (`DemoRole`, `DemoState`, etc.).
- `src/demo/data/seed.ts` — deterministic `seed()` factory + name pools.
- `src/demo/store/demoStore.ts` (+ `.test.ts`) — Zustand store, actions, pure selectors.
- `src/demo/config/nav.ts` — per-role `NavItem[]` for the demo shell.
- `src/demo/components/DemoBanner.tsx` — sticky DEMO MODE bar (Reset, role switcher, Exit).
- `src/demo/components/DemoShell.tsx` — banner + `AppShell` layout wrapper (renders `<Outlet/>`).
- `src/demo/components/DemoPlaceholder.tsx` — "coming up" card for not-yet-built areas.
- `src/demo/pages/DemoEntry.tsx` — role-selection entry screen.
- `src/demo/pages/manager/DemoManagerDashboard.tsx` — PM dashboard.
- `src/demo/DemoApp.tsx` — nested `<Routes>` for the demo.
- `src/components/layouts/AppShell.tsx` — add optional `onSignOut`/`signOutLabel` props (backward compatible).
- `src/App.tsx` — mount `<Route path="/demo/*" element={<DemoApp/>} />`.
- `src/pages/landing/sections/Hero.tsx` — add "Explore Interactive Demo" CTA.

---

## Task 1: Add zustand + demo types

**Files:**
- Modify: `package.json` (via npm)
- Create: `src/demo/data/types.ts`

- [ ] **Step 1: Install zustand**

Run: `cd ~/Documents/Lango && npm install zustand`
Expected: adds `zustand` to dependencies, no errors.

- [ ] **Step 2: Create the demo types**

Create `src/demo/data/types.ts`:

```typescript
export type DemoRole = 'MANAGER' | 'GUARD' | 'CARETAKER' | 'RESIDENT'

export type DemoVisitorStatus = 'PENDING' | 'INSIDE' | 'CHECKED_OUT'
export type DemoVisitType = 'FRIENDLY_VISIT' | 'WORK' | 'DELIVERY' | 'SERVICE_PROVIDER'
export type DemoDeliveryStatus = 'RECEIVED' | 'COLLECTED' | 'HELD'
export type DemoIncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED'
export type DemoUnitStatus = 'OCCUPIED' | 'VACANT'
export type DemoStaffStatus = 'ACTIVE' | 'INACTIVE'
export type DemoShiftStatus = 'ON' | 'OFF'
export type DemoActivityKind = 'CHECK_IN' | 'CHECK_OUT' | 'DELIVERY' | 'INCIDENT' | 'APPROVAL'

export interface DemoProperty { name: string; location: string; residentCount: number }
export interface DemoBlock { id: string; name: string }
export interface DemoUnit { id: string; blockId: string; unitNumber: string; status: DemoUnitStatus; tenantName: string | null }
export interface DemoTenant { id: string; name: string; unitNumber: string; phone: string }
export interface DemoVisitor {
  id: string; name: string; unitNumber: string; type: DemoVisitType
  status: DemoVisitorStatus; checkInLabel: string | null
}
export interface DemoDelivery { id: string; company: string; unitNumber: string; expectedLabel: string; status: DemoDeliveryStatus }
export interface DemoIncident { id: string; type: string; location: string; reportedBy: string; timeLabel: string; status: DemoIncidentStatus }
export interface DemoStaff { id: string; name: string; role: string; status: DemoStaffStatus }
export interface DemoActivity { id: string; kind: DemoActivityKind; title: string; subtitle: string; timeLabel: string }
export interface DemoShift { staffId: string; status: DemoShiftStatus; startedLabel: string | null }
export interface DemoApproval { id: string; visitorId: string; visitorName: string; unitNumber: string; purpose: string }

export interface DemoState {
  role: DemoRole | null
  property: DemoProperty
  blocks: DemoBlock[]
  units: DemoUnit[]
  tenants: DemoTenant[]
  visitors: DemoVisitor[]
  deliveries: DemoDelivery[]
  incidents: DemoIncident[]
  staff: DemoStaff[]
  activity: DemoActivity[]
  shifts: DemoShift[]
  approvals: DemoApproval[]
}
```

- [ ] **Step 3: Type-check**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/Lango
git add package.json package-lock.json src/demo/data/types.ts
git commit -m "feat(demo): add zustand and demo state types"
```

---

## Task 2: Seed data (TDD)

**Files:**
- Create: `src/demo/data/seed.ts`
- Test: `src/demo/data/seed.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/demo/data/seed.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { seed } from './seed'

describe('demo seed', () => {
  it('has Greenview Apartments with 142 residents', () => {
    const s = seed()
    expect(s.property.name).toBe('Greenview Apartments')
    expect(s.property.residentCount).toBe(142)
  })

  it('has 4 blocks and 96 units', () => {
    const s = seed()
    expect(s.blocks).toHaveLength(4)
    expect(s.units).toHaveLength(96)
  })

  it('assigns the brief units correctly', () => {
    const u = seed().units
    const byNumber = (n: string) => u.find(x => x.unitNumber === n)!
    expect(byNumber('A01').tenantName).toBe('John Kamau')
    expect(byNumber('A02').tenantName).toBe('Mary Wanjiku')
    expect(byNumber('A03').tenantName).toBe('Jane Njeri')
    expect(byNumber('A04').status).toBe('VACANT')
    expect(byNumber('A05').status).toBe('VACANT')
  })

  it('tenants list matches occupied units', () => {
    const s = seed()
    const occupied = s.units.filter(u => u.status === 'OCCUPIED')
    expect(s.tenants).toHaveLength(occupied.length)
  })

  it('has 3 guards, 1 caretaker and the manager', () => {
    const s = seed()
    expect(s.staff.filter(x => x.role === 'Security Guard')).toHaveLength(3)
    expect(s.staff.filter(x => x.role === 'Caretaker')).toHaveLength(1)
    expect(s.staff.some(x => x.name === 'Mercy Njeri' && x.role === 'Property Manager')).toBe(true)
  })

  it('has 2 visitors inside, 1 pending approval, 1 open incident', () => {
    const s = seed()
    expect(s.visitors.filter(v => v.status === 'INSIDE')).toHaveLength(2)
    expect(s.approvals).toHaveLength(1)
    expect(s.incidents.filter(i => i.status === 'OPEN')).toHaveLength(1)
  })

  it('is deterministic (two seeds are deeply equal)', () => {
    expect(seed()).toEqual(seed())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Documents/Lango && npx vitest run src/demo/data/seed.test.ts`
Expected: FAIL — `seed` not defined.

- [ ] **Step 3: Implement the seed**

Create `src/demo/data/seed.ts`:

```typescript
import type {
  DemoState, DemoUnit, DemoTenant, DemoBlock,
} from './types'

const BLOCKS: DemoBlock[] = [
  { id: 'A', name: 'Block A' }, { id: 'B', name: 'Block B' },
  { id: 'C', name: 'Block C' }, { id: 'D', name: 'Block D' },
]

// Fictional name pool (cycled deterministically for occupied units).
const NAMES = [
  'John Kamau', 'Mary Wanjiku', 'Jane Njeri', 'Peter Otieno', 'Grace Achieng',
  'Samuel Kiptoo', 'Faith Mwende', 'Brian Ochieng', 'Cynthia Wairimu', 'Daniel Mutua',
  'Esther Nyambura', 'Kevin Barasa', 'Lucy Chebet', 'Michael Onyango', 'Nancy Adhiambo',
  'Paul Kariuki', 'Ruth Naliaka', 'Stephen Maina', 'Teresa Akinyi', 'Victor Kimani',
]
const PHONES = ['+254712000001', '+254712000002', '+254712000003', '+254712000004']

// A unit is vacant when its 1-based index within the block is 4 or 5 (mod 6).
// → A04, A05, A10, A11, A16, A17, A22, A23 vacant per block (8 vacant, 16 occupied).
function isVacant(i: number): boolean { const m = i % 6; return m === 4 || m === 5 }

function buildUnits(): { units: DemoUnit[]; tenants: DemoTenant[] } {
  const units: DemoUnit[] = []
  const tenants: DemoTenant[] = []
  let nameIdx = 0
  for (const b of BLOCKS) {
    for (let i = 1; i <= 24; i++) {
      const unitNumber = `${b.id}${String(i).padStart(2, '0')}`
      const vacant = isVacant(i)
      let tenantName: string | null = null
      if (!vacant) {
        // Fixed overrides so the brief's examples hold, else cycle the pool.
        tenantName =
          unitNumber === 'A01' ? 'John Kamau' :
          unitNumber === 'A02' ? 'Mary Wanjiku' :
          unitNumber === 'A03' ? 'Jane Njeri' :
          NAMES[nameIdx % NAMES.length]
        nameIdx++
        tenants.push({ id: `t-${unitNumber}`, name: tenantName, unitNumber, phone: PHONES[tenants.length % PHONES.length] })
      }
      units.push({ id: unitNumber, blockId: b.id, unitNumber, status: vacant ? 'VACANT' : 'OCCUPIED', tenantName })
    }
  }
  return { units, tenants }
}

export function seed(): DemoState {
  const { units, tenants } = buildUnits()
  return {
    role: null,
    property: { name: 'Greenview Apartments', location: 'Nairobi, Kenya', residentCount: 142 },
    blocks: BLOCKS,
    units,
    tenants,
    visitors: [
      { id: 'v-1', name: 'James Mwangi', unitNumber: 'A-204', type: 'FRIENDLY_VISIT', status: 'INSIDE', checkInLabel: '12:42 PM' },
      { id: 'v-2', name: 'Grace Njeri', unitNumber: 'B-103', type: 'SERVICE_PROVIDER', status: 'INSIDE', checkInLabel: '12:18 PM' },
    ],
    deliveries: [
      { id: 'd-1', company: 'Uber Eats', unitNumber: 'A-204', expectedLabel: '12:45 PM', status: 'RECEIVED' },
      { id: 'd-2', company: 'Courier', unitNumber: 'B-102', expectedLabel: '1:15 PM', status: 'RECEIVED' },
      { id: 'd-3', company: 'FedEx', unitNumber: 'C-301', expectedLabel: '2:30 PM', status: 'RECEIVED' },
      { id: 'd-4', company: 'Amazon', unitNumber: 'A-103', expectedLabel: '3:00 PM', status: 'RECEIVED' },
    ],
    incidents: [
      { id: 'i-1', type: 'Suspicious Person', location: 'Block B', reportedBy: 'John Kamau', timeLabel: '12:51 PM', status: 'OPEN' },
    ],
    staff: [
      { id: 's-1', name: 'Mercy Njeri', role: 'Property Manager', status: 'ACTIVE' },
      { id: 's-2', name: 'James Mwangi', role: 'Security Guard', status: 'ACTIVE' },
      { id: 's-3', name: 'David Mwangi', role: 'Security Guard', status: 'INACTIVE' },
      { id: 's-4', name: 'Samuel Kiptoo', role: 'Security Guard', status: 'INACTIVE' },
      { id: 's-5', name: 'Peter Otieno', role: 'Caretaker', status: 'ACTIVE' },
    ],
    activity: [
      { id: 'a-1', kind: 'CHECK_IN', title: 'James Mwangi checked in', subtitle: 'A-204 · Personal', timeLabel: '12:18 PM' },
      { id: 'a-2', kind: 'CHECK_OUT', title: 'Mary Wanjiku checked out', subtitle: 'B-103 · Personal', timeLabel: '12:04 PM' },
      { id: 'a-3', kind: 'DELIVERY', title: 'Delivery registered', subtitle: 'A-103 · Uber Eats', timeLabel: '11:52 AM' },
      { id: 'a-4', kind: 'CHECK_IN', title: 'Peter Otieno checked in', subtitle: 'C-301 · Service Provider', timeLabel: '11:21 AM' },
      { id: 'a-5', kind: 'INCIDENT', title: 'Incident reported', subtitle: 'Block B · Suspicious Person', timeLabel: '09:32 AM' },
    ],
    shifts: [
      { staffId: 's-2', status: 'OFF', startedLabel: null },
    ],
    approvals: [
      { id: 'ap-1', visitorId: 'v-pending-1', visitorName: 'James Mwangi', unitNumber: 'A-204', purpose: 'Personal visit' },
    ],
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/Documents/Lango && npx vitest run src/demo/data/seed.test.ts`
Expected: PASS — all seed tests green.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Lango
git add src/demo/data/seed.ts src/demo/data/seed.test.ts
git commit -m "feat(demo): deterministic Greenview seed data"
```

---

## Task 3: Zustand store + selectors (TDD)

**Files:**
- Create: `src/demo/store/demoStore.ts`
- Test: `src/demo/store/demoStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/demo/store/demoStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { seed } from '../data/seed'
import { useDemoStore, selectCurrentlyInside, selectOpenIncidents, selectVisitorsToday, selectExpectedToday } from './demoStore'

describe('demo store selectors', () => {
  it('selectCurrentlyInside counts INSIDE visitors', () => {
    expect(selectCurrentlyInside(seed())).toBe(2)
  })
  it('selectOpenIncidents counts OPEN incidents', () => {
    expect(selectOpenIncidents(seed())).toBe(1)
  })
  it('selectVisitorsToday is 8 and selectExpectedToday is 5', () => {
    expect(selectVisitorsToday(seed())).toBe(8)
    expect(selectExpectedToday(seed())).toBe(5)
  })
})

describe('demo store actions', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('setRole updates the role', () => {
    useDemoStore.getState().setRole('MANAGER')
    expect(useDemoStore.getState().role).toBe('MANAGER')
  })

  it('addActivity prepends a new activity entry', () => {
    const before = useDemoStore.getState().activity.length
    useDemoStore.getState().addActivity({ id: 'x', kind: 'CHECK_IN', title: 'Test', subtitle: 'A-01', timeLabel: '1:00 PM' })
    const after = useDemoStore.getState().activity
    expect(after).toHaveLength(before + 1)
    expect(after[0].id).toBe('x')
  })

  it('resetDemo restores seeded data but preserves the current role', () => {
    useDemoStore.getState().setRole('GUARD')
    useDemoStore.getState().addActivity({ id: 'y', kind: 'CHECK_IN', title: 'T', subtitle: 's', timeLabel: 't' })
    useDemoStore.getState().resetDemo()
    expect(useDemoStore.getState().activity).toHaveLength(seed().activity.length)
    expect(useDemoStore.getState().role).toBe('GUARD')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Documents/Lango && npx vitest run src/demo/store/demoStore.test.ts`
Expected: FAIL — module not found / exports missing.

- [ ] **Step 3: Implement the store**

Create `src/demo/store/demoStore.ts`:

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { seed } from '../data/seed'
import type { DemoRole, DemoState, DemoActivity } from '../data/types'

// Fixed headline counts for the current demo day (independent of live INSIDE count).
const VISITORS_TODAY = 8
const EXPECTED_TODAY = 5

export const selectCurrentlyInside = (s: DemoState): number => s.visitors.filter(v => v.status === 'INSIDE').length
export const selectOpenIncidents = (s: DemoState): number => s.incidents.filter(i => i.status === 'OPEN').length
export const selectVisitorsToday = (_s: DemoState): number => VISITORS_TODAY
export const selectExpectedToday = (_s: DemoState): number => EXPECTED_TODAY

interface DemoActions {
  setRole: (role: DemoRole) => void
  addActivity: (entry: DemoActivity) => void
  resetDemo: () => void
}

export type DemoStore = DemoState & DemoActions

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...seed(),
      setRole: (role) => set({ role }),
      addActivity: (entry) => set({ activity: [entry, ...get().activity] }),
      resetDemo: () => set({ ...seed(), role: get().role }),
    }),
    {
      name: 'lango-demo',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      // Persist only the data slices, never the action functions.
      partialize: (s) => ({
        role: s.role, property: s.property, blocks: s.blocks, units: s.units, tenants: s.tenants,
        visitors: s.visitors, deliveries: s.deliveries, incidents: s.incidents, staff: s.staff,
        activity: s.activity, shifts: s.shifts, approvals: s.approvals,
      }),
    },
  ),
)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/Documents/Lango && npx vitest run src/demo/store/demoStore.test.ts`
Expected: PASS — selectors and actions green. (jsdom provides `sessionStorage`.)

- [ ] **Step 5: Type-check**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/Lango
git add src/demo/store/demoStore.ts src/demo/store/demoStore.test.ts
git commit -m "feat(demo): zustand demo store with selectors and reset"
```

---

## Task 4: AppShell props + demo shell, banner, nav, placeholder

**Files:**
- Modify: `src/components/layouts/AppShell.tsx`
- Create: `src/demo/config/nav.ts`
- Create: `src/demo/components/DemoBanner.tsx`
- Create: `src/demo/components/DemoShell.tsx`
- Create: `src/demo/components/DemoPlaceholder.tsx`

- [ ] **Step 1: Add backward-compatible props to AppShell**

In `src/components/layouts/AppShell.tsx`, change the `Props` interface (lines 10-15) to:

```typescript
interface Props {
  navItems: NavItem[]
  bottomNav: NavItem[]
  roleLabel: string
  settingsTo?: string
  onSignOut?: () => void
  signOutLabel?: string
}
```

Change the function signature line to destructure them:

```typescript
export function AppShell({ navItems, bottomNav, roleLabel, settingsTo, onSignOut, signOutLabel }: Props) {
```

Directly after the existing `const handleSignOut = async () => { ... }` line, add:

```typescript
  const exit = onSignOut ?? handleSignOut
  const exitLabel = signOutLabel ?? 'Logout'
```

Now replace the three sign-out controls to use `exit`/`exitLabel`:
- Sidebar button (currently `onClick={handleSignOut}` with `<span ...>Logout</span>`): change `onClick={handleSignOut}` → `onClick={exit}`, `title="Logout"` → `title={exitLabel}`, and the span text `Logout` → `{exitLabel}`.
- Mobile top-bar button (`onClick={handleSignOut}`): change to `onClick={exit}`.
- Desktop top-bar button (`onClick={handleSignOut}`): change to `onClick={exit}`.

(Existing callers pass neither prop, so behavior is unchanged.)

- [ ] **Step 2: Type-check (existing layouts unaffected)**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 3: Create the demo nav config**

Create `src/demo/config/nav.ts`:

```typescript
import { LayoutDashboard, Users, Home, Package, ShieldCheck, Clock, UserPlus, DoorOpen, Building2, type LucideIcon } from 'lucide-react'
import type { NavItem } from '../../components/layouts/AppShell'
import type { DemoRole } from '../data/types'

export interface DemoNav { roleLabel: string; navItems: NavItem[]; bottomNav: NavItem[] }

const icon = (i: LucideIcon) => i

export const DEMO_NAV: Record<DemoRole, DemoNav> = {
  MANAGER: {
    roleLabel: 'Property Manager',
    navItems: [
      { to: '/demo/manager', label: 'Dashboard', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/manager/visitors', label: 'Visitors', icon: icon(Users) },
      { to: '/demo/manager/tenants', label: 'Tenants', icon: icon(Home) },
      { to: '/demo/manager/units', label: 'Blocks & Units', icon: icon(Building2) },
      { to: '/demo/manager/deliveries', label: 'Deliveries', icon: icon(Package) },
      { to: '/demo/manager/incidents', label: 'Incidents', icon: icon(ShieldCheck) },
      { to: '/demo/manager/staff', label: 'Staff', icon: icon(Users) },
    ],
    bottomNav: [
      { to: '/demo/manager', label: 'Home', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/manager/visitors', label: 'Visitors', icon: icon(Users) },
      { to: '/demo/manager/deliveries', label: 'Deliveries', icon: icon(Package) },
    ],
  },
  GUARD: {
    roleLabel: 'Security Guard',
    navItems: [
      { to: '/demo/guard', label: 'Home', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/guard/register', label: 'Register Visitor', icon: icon(UserPlus) },
      { to: '/demo/guard/inside', label: 'Currently Inside', icon: icon(DoorOpen) },
      { to: '/demo/guard/shift', label: 'My Shift', icon: icon(Clock) },
    ],
    bottomNav: [
      { to: '/demo/guard', label: 'Home', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/guard/inside', label: 'Inside', icon: icon(DoorOpen) },
      { to: '/demo/guard/shift', label: 'Shift', icon: icon(Clock) },
    ],
  },
  CARETAKER: {
    roleLabel: 'Caretaker',
    navItems: [
      { to: '/demo/caretaker', label: 'Home', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/caretaker/register', label: 'Register Visitor', icon: icon(UserPlus) },
      { to: '/demo/caretaker/inside', label: 'Currently Inside', icon: icon(DoorOpen) },
    ],
    bottomNav: [
      { to: '/demo/caretaker', label: 'Home', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/caretaker/inside', label: 'Inside', icon: icon(DoorOpen) },
    ],
  },
  RESIDENT: {
    roleLabel: 'Resident',
    navItems: [
      { to: '/demo/resident', label: 'Home', icon: icon(Home), end: true },
    ],
    bottomNav: [
      { to: '/demo/resident', label: 'Home', icon: icon(Home), end: true },
    ],
  },
}
```

- [ ] **Step 4: Create the DEMO banner**

Create `src/demo/components/DemoBanner.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { RefreshCw, LogOut, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../store/demoStore'
import type { DemoRole } from '../data/types'

const ROLE_PATH: Record<DemoRole, string> = {
  MANAGER: '/demo/manager', GUARD: '/demo/guard', CARETAKER: '/demo/caretaker', RESIDENT: '/demo/resident',
}
const ROLES: { key: DemoRole; label: string }[] = [
  { key: 'MANAGER', label: 'Manager' }, { key: 'GUARD', label: 'Guard' },
  { key: 'CARETAKER', label: 'Caretaker' }, { key: 'RESIDENT', label: 'Resident' },
]

export function DemoBanner({ role }: { role: DemoRole }) {
  const navigate = useNavigate()
  const setRole = useDemoStore(s => s.setRole)
  const resetDemo = useDemoStore(s => s.resetDemo)

  const switchRole = (r: DemoRole) => { setRole(r); navigate(ROLE_PATH[r]) }
  const reset = () => { resetDemo(); toast.success('Demo reset to sample data') }

  return (
    <div className="bg-lango-dark text-white px-3 sm:px-4 py-2 flex items-center gap-3 flex-wrap">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
        <Sparkles className="w-3.5 h-3.5" /> Demo Mode
      </span>
      <span className="hidden sm:inline text-xs text-white/50">Sample data — nothing here is real</span>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1 mr-1">
          {ROLES.map(r => (
            <button key={r.key} onClick={() => switchRole(r.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${role === r.key ? 'bg-lango-primary text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={reset} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20">
          <LogOut className="w-3.5 h-3.5" /> Exit
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create the DemoShell**

Create `src/demo/components/DemoShell.tsx`:

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layouts/AppShell'
import { DemoBanner } from './DemoBanner'
import { DEMO_NAV } from '../config/nav'
import { useDemoStore } from '../store/demoStore'
import type { DemoRole } from '../data/types'

export function DemoShell({ role }: { role: DemoRole }) {
  const navigate = useNavigate()
  const setRole = useDemoStore(s => s.setRole)
  const nav = DEMO_NAV[role]

  // Keep the store's active role in sync with the mounted shell.
  useEffect(() => { setRole(role) }, [role, setRole])

  return (
    <div className="flex flex-col h-full">
      <DemoBanner role={role} />
      <div className="flex-1 min-h-0">
        <AppShell
          navItems={nav.navItems}
          bottomNav={nav.bottomNav}
          roleLabel={nav.roleLabel}
          onSignOut={() => navigate('/')}
          signOutLabel="Exit demo"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create the placeholder**

Create `src/demo/components/DemoPlaceholder.tsx`:

```tsx
import { Sparkles } from 'lucide-react'

export function DemoPlaceholder({ title = 'Coming up in this demo' }: { title?: string }) {
  return (
    <div className="max-w-md mx-auto card p-8 text-center mt-6">
      <div className="w-14 h-14 rounded-full bg-lango-primary/10 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7 text-lango-primary" />
      </div>
      <h3 className="font-bold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">We're building this part of the interactive demo next. Use the role switcher above to explore the Property Manager experience.</p>
    </div>
  )
}
```

- [ ] **Step 7: Type-check**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
cd ~/Documents/Lango
git add src/components/layouts/AppShell.tsx src/demo/config/nav.ts src/demo/components/DemoBanner.tsx src/demo/components/DemoShell.tsx src/demo/components/DemoPlaceholder.tsx
git commit -m "feat(demo): demo shell, banner, nav config; AppShell sign-out override"
```

---

## Task 5: Entry screen + demo routing + App mount

**Files:**
- Create: `src/demo/pages/DemoEntry.tsx`
- Create: `src/demo/DemoApp.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the entry screen**

Create `src/demo/pages/DemoEntry.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShieldCheck, Home, Wrench, ArrowRight, type LucideIcon } from 'lucide-react'
import { useDemoStore } from '../store/demoStore'
import type { DemoRole } from '../data/types'

const OPTIONS: { role: DemoRole; label: string; hint: string; icon: LucideIcon; path: string }[] = [
  { role: 'MANAGER', label: 'Property Manager', hint: 'Real-time visibility across the whole property', icon: LayoutDashboard, path: '/demo/manager' },
  { role: 'GUARD', label: 'Security Guard', hint: 'Run the gate: register, approve, check in and out', icon: ShieldCheck, path: '/demo/guard' },
  { role: 'RESIDENT', label: 'Resident', hint: 'Approve your visitors and track deliveries', icon: Home, path: '/demo/resident' },
  { role: 'CARETAKER', label: 'Caretaker', hint: 'Day-to-day gate and property operations', icon: Wrench, path: '/demo/caretaker' },
]

export default function DemoEntry() {
  const navigate = useNavigate()
  const setRole = useDemoStore(s => s.setRole)
  const choose = (role: DemoRole, path: string) => { setRole(role); navigate(path) }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-lango-dark text-white px-4 pt-14 pb-20 text-center">
        <span className="inline-block text-xs font-semibold tracking-wide uppercase text-amber-300 mb-3">Interactive Demo</span>
        <h1 className="text-3xl sm:text-4xl font-bold">Experience Lango</h1>
        <p className="mt-3 text-white/70 max-w-xl mx-auto">See how Lango manages your property from the gate to the dashboard. Pick a role to step inside.</p>
      </div>
      <div className="max-w-3xl mx-auto px-4 -mt-12 pb-16 grid sm:grid-cols-2 gap-4">
        {OPTIONS.map(o => (
          <button key={o.role} onClick={() => choose(o.role, o.path)}
            className="card p-5 flex items-center gap-4 text-left hover:shadow-card-hover transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
              <o.icon className="w-6 h-6 text-lango-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{o.label}</p>
              <p className="text-xs text-gray-500">{o.hint}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the demo router**

Create `src/demo/DemoApp.tsx`:

```tsx
import { Routes, Route } from 'react-router-dom'
import DemoEntry from './pages/DemoEntry'
import { DemoShell } from './components/DemoShell'
import { DemoPlaceholder } from './components/DemoPlaceholder'
import DemoManagerDashboard from './pages/manager/DemoManagerDashboard'

export default function DemoApp() {
  return (
    <div className="h-screen">
      <Routes>
        <Route index element={<DemoEntry />} />

        <Route path="manager" element={<DemoShell role="MANAGER" />}>
          <Route index element={<DemoManagerDashboard />} />
          <Route path="*" element={<DemoPlaceholder />} />
        </Route>

        <Route path="guard" element={<DemoShell role="GUARD" />}>
          <Route index element={<DemoPlaceholder title="Security Guard demo — coming up" />} />
          <Route path="*" element={<DemoPlaceholder title="Security Guard demo — coming up" />} />
        </Route>

        <Route path="caretaker" element={<DemoShell role="CARETAKER" />}>
          <Route index element={<DemoPlaceholder title="Caretaker demo — coming up" />} />
          <Route path="*" element={<DemoPlaceholder title="Caretaker demo — coming up" />} />
        </Route>

        <Route path="resident" element={<DemoShell role="RESIDENT" />}>
          <Route index element={<DemoPlaceholder title="Resident demo — coming up" />} />
          <Route path="*" element={<DemoPlaceholder title="Resident demo — coming up" />} />
        </Route>
      </Routes>
    </div>
  )
}
```

Note: `DemoManagerDashboard` is created in Task 6; this task will not type-check until then, so the commit in this task happens AFTER Task 6's file exists. To keep steps ordered, create a minimal stub now and replace it in Task 6. Create `src/demo/pages/manager/DemoManagerDashboard.tsx` as a stub:

```tsx
export default function DemoManagerDashboard() { return null }
```

- [ ] **Step 3: Mount the demo route in App.tsx**

In `src/App.tsx`, add the import after the existing page imports (near line 43, after `import MyShiftPage ...`):

```typescript
import DemoApp from './demo/DemoApp'
```

Then add the demo route as a sibling — directly after the `<Route path="/change-password" ... />` line (line 71):

```tsx
      <Route path="/demo/*" element={<DemoApp />} />
```

- [ ] **Step 4: Type-check**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors (stub dashboard satisfies the import).

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Lango
git add src/demo/pages/DemoEntry.tsx src/demo/DemoApp.tsx src/demo/pages/manager/DemoManagerDashboard.tsx src/App.tsx
git commit -m "feat(demo): entry screen, demo routing, /demo mount"
```

---

## Task 6: Property Manager dashboard

**Files:**
- Modify: `src/demo/pages/manager/DemoManagerDashboard.tsx` (replace the stub)

- [ ] **Step 1: Implement the dashboard**

Replace the entire contents of `src/demo/pages/manager/DemoManagerDashboard.tsx` with:

```tsx
import { Users, DoorOpen, CalendarClock, ShieldAlert, LogIn, LogOut, Package, AlertTriangle, UserCheck, type LucideIcon } from 'lucide-react'
import { useDemoStore, selectCurrentlyInside, selectOpenIncidents, selectVisitorsToday, selectExpectedToday } from '../../store/demoStore'
import type { DemoActivityKind } from '../../data/types'

const STAT_STYLES = 'stat-card'

function Stat({ icon: Icon, label, value, tint }: { icon: LucideIcon; label: string; value: number; tint: string }) {
  return (
    <div className={STAT_STYLES}>
      <div className={`stat-icon ${tint}`}><Icon className="w-5 h-5" /></div>
      <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-sm text-gray-500">{label}</p></div>
    </div>
  )
}

const ACTIVITY_ICON: Record<DemoActivityKind, LucideIcon> = {
  CHECK_IN: LogIn, CHECK_OUT: LogOut, DELIVERY: Package, INCIDENT: AlertTriangle, APPROVAL: UserCheck,
}
const ACTIVITY_TINT: Record<DemoActivityKind, string> = {
  CHECK_IN: 'bg-green-100 text-green-600', CHECK_OUT: 'bg-gray-100 text-gray-600',
  DELIVERY: 'bg-orange-100 text-orange-600', INCIDENT: 'bg-red-100 text-red-600', APPROVAL: 'bg-blue-100 text-blue-600',
}

export default function DemoManagerDashboard() {
  const state = useDemoStore()
  const inside = selectCurrentlyInside(state)
  const open = selectOpenIncidents(state)
  const visitorsToday = selectVisitorsToday(state)
  const expected = selectExpectedToday(state)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good afternoon, Mercy Njeri 👋</h1>
        <p className="text-sm text-gray-500">{state.property.name} · {state.property.location}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Visitors Today" value={visitorsToday} tint="bg-blue-100 text-blue-600" />
        <Stat icon={DoorOpen} label="Currently Inside" value={inside} tint="bg-green-100 text-green-600" />
        <Stat icon={CalendarClock} label="Expected Today" value={expected} tint="bg-purple-100 text-purple-600" />
        <Stat icon={ShieldAlert} label="Open Incidents" value={open} tint="bg-red-100 text-red-600" />
      </div>

      <div className="card p-5">
        <h2 className="section-title">Recent Activity</h2>
        <div className="divide-y divide-gray-50">
          {state.activity.map(a => {
            const Icon = ACTIVITY_ICON[a.kind]
            return (
              <div key={a.id} className="flex items-center gap-3 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${ACTIVITY_TINT[a.kind]}`}><Icon className="w-4 h-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                  <p className="text-xs text-gray-500 truncate">{a.subtitle}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{a.timeLabel}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/Lango
git add src/demo/pages/manager/DemoManagerDashboard.tsx
git commit -m "feat(demo): property manager dashboard with live stats and activity"
```

---

## Task 7: Landing hero CTA

**Files:**
- Modify: `src/pages/landing/sections/Hero.tsx`

- [ ] **Step 1: Add the router import**

At the top of `src/pages/landing/sections/Hero.tsx`, the current first line is:

```typescript
import { CalendarCheck, PlayCircle, ShieldCheck, MessageCircle, Star } from 'lucide-react'
```

Add a second import line directly beneath it:

```typescript
import { Link } from 'react-router-dom'
```

- [ ] **Step 2: Add the "Explore Interactive Demo" CTA**

The current CTA row is:

```tsx
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#demo" className="btn-primary px-6 py-3"><CalendarCheck className="w-4 h-4" /> Book a Free Demo</a>
            <a href="#how" className="btn-secondary px-6 py-3"><PlayCircle className="w-4 h-4" /> See How It Works</a>
          </div>
```

Replace it with (swaps "See How It Works" for the interactive-demo link; keeps Book a Free Demo primary):

```tsx
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#demo" className="btn-primary px-6 py-3"><CalendarCheck className="w-4 h-4" /> Book a Free Demo</a>
            <Link to="/demo" className="btn-secondary px-6 py-3"><PlayCircle className="w-4 h-4" /> Explore Interactive Demo</Link>
          </div>
```

- [ ] **Step 3: Type-check**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/Lango
git add src/pages/landing/sections/Hero.tsx
git commit -m "feat(landing): Explore Interactive Demo CTA in hero"
```

---

## Task 8: Full build + manual verification

**Files:** none (verification).

- [ ] **Step 1: Full type-check, tests, and production build**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit && npx vitest run src/demo && npm run build`
Expected: tsc clean; all demo tests pass; Vite build succeeds (demo compiles into the bundle without breaking the app).

- [ ] **Step 2: Run the dev server** — `cd ~/Documents/Lango && npm run dev`.

- [ ] **Step 3: Verify the flow**
- Landing page → click **Explore Interactive Demo** → lands on `/demo` entry screen with 4 role cards.
- Click **Property Manager** → PM dashboard shows "Good afternoon, Mercy Njeri 👋", Greenview, stats (Visitors Today 8, Currently Inside 2, Expected Today 5, Open Incidents 1) and the 5 recent-activity rows.
- The **DEMO MODE** banner is visible with Reset / role switcher / Exit.
- Click the role switcher (Guard/Caretaker/Resident) → placeholder page renders inside the shell; **Manager** returns to the dashboard.
- Click **Reset** → toast appears; dashboard unchanged (already seeded).
- Resize to mobile width → bottom nav appears, banner wraps, no horizontal overflow.
- Click **Exit** → returns to landing (`/`).
- Visit a real route (e.g. `/login`) → unaffected; production still works.

- [ ] **Step 4: Confirm isolation** — grep the demo folder for accidental production imports:

Run: `cd ~/Documents/Lango && grep -rEn "firebase|AuthContext|/services/" src/demo || echo "CLEAN: no firebase/auth/service imports in demo"`
Expected: `CLEAN: ...` — the demo never imports Firebase, auth, or production services.
