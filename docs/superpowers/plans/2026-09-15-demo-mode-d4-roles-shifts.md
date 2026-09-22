# Demo Mode D4 — Guard / Caretaker / Resident + Shifts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the guard/caretaker/resident placeholders with real interactive dashboards and add a shift lifecycle, all reusing shared demo components.

**Architecture:** Add a `SHIFT` activity kind + `startShift`/`endShift`/`selectShiftFor` to the zustand demo store. Extract repeated UI primitives (stat tile, activity feed, register form, pending-approvals list) into shared components, then compose three role dashboards and three shared role pages. Wire nested routes. Store logic is TDD'd; components are build-verified.

**Tech Stack:** React + TS, zustand (+persist/sessionStorage), react-router-dom, lucide-react, react-hot-toast, Vitest, Tailwind design-system classes.

**Reference spec:** `docs/superpowers/specs/2026-09-15-demo-mode-d4-roles-shifts-design.md`

**Verify commands:**
```
npx tsc -p tsconfig.app.json --noEmit
npx vitest run src/demo
npm run build
grep -rEn "firebase|AuthContext|/services/" src/demo   # expect no hits
```

---

### Task 1: Personas, SHIFT activity kind, seed updates

**Files:**
- Create: `src/demo/data/personas.ts`
- Modify: `src/demo/data/types.ts`
- Modify: `src/demo/data/seed.ts`
- Test: `src/demo/data/seed.test.ts`

- [ ] **Step 1: Write the failing seed tests** — in `src/demo/data/seed.test.ts`, update the existing pending-approvals assertion and add a shift assertion. Change:

```ts
  it('has 2 visitors inside, 1 pending approval, 1 open incident', () => {
    const s = seed()
    expect(s.visitors.filter(v => v.status === 'INSIDE')).toHaveLength(2)
    expect(s.approvals).toHaveLength(1)
    expect(s.incidents.filter(i => i.status === 'OPEN')).toHaveLength(1)
  })
```
to:
```ts
  it('has 2 visitors inside, 2 pending approvals, 1 open incident', () => {
    const s = seed()
    expect(s.visitors.filter(v => v.status === 'INSIDE')).toHaveLength(2)
    expect(s.approvals).toHaveLength(2)
    expect(s.incidents.filter(i => i.status === 'OPEN')).toHaveLength(1)
  })

  it('seeds shifts for both the guard (s-2) and the caretaker (s-5)', () => {
    const s = seed()
    expect(s.shifts.find(x => x.staffId === 's-2')).toBeTruthy()
    expect(s.shifts.find(x => x.staffId === 's-5')).toBeTruthy()
  })

  it('assigns Michael Otieno to A-204 and renames guard s-2 to Anthony Kimani', () => {
    const s = seed()
    expect(s.units.find(u => u.unitNumber === 'A-204')!.tenantName).toBe('Michael Otieno')
    expect(s.staff.find(m => m.id === 's-2')!.name).toBe('Anthony Kimani')
  })
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/demo/data/seed.test.ts`
Expected: FAIL (approvals length, missing shift, A-204/s-2 names).

- [ ] **Step 3: Create `src/demo/data/personas.ts`:**

```ts
// Which seeded records each non-manager demo role "is".
export const GUARD_STAFF_ID = 's-2'      // Anthony Kimani, Security Guard
export const CARETAKER_STAFF_ID = 's-5'  // Peter Otieno, Caretaker
export const RESIDENT_UNIT = 'A-204'     // resident persona = this unit's tenant
```

- [ ] **Step 4: Add `SHIFT` to `DemoActivityKind`** in `src/demo/data/types.ts`:

```ts
export type DemoActivityKind = 'CHECK_IN' | 'CHECK_OUT' | 'DELIVERY' | 'INCIDENT' | 'APPROVAL' | 'SHIFT'
```

- [ ] **Step 5: Update seed** in `src/demo/data/seed.ts`:

(a) In `buildUnits`, add an A-204 case to the special-case ternary:
```ts
            tenantName =
              unitNumber === 'A-101' ? 'John Kamau' :
              unitNumber === 'A-102' ? 'Mary Wanjiku' :
              unitNumber === 'A-103' ? 'Jane Njeri' :
              unitNumber === 'A-204' ? 'Michael Otieno' :
              NAMES[nameIdx % NAMES.length]
```

(b) Rename staff `s-2`:
```ts
      { id: 's-2', name: 'Anthony Kimani', role: 'Security Guard', status: 'ACTIVE' },
```

(c) Add the caretaker shift:
```ts
    shifts: [
      { staffId: 's-2', status: 'OFF', startedLabel: null },
      { staffId: 's-5', status: 'OFF', startedLabel: null },
    ],
```

(d) Add the second approval (resident's unit):
```ts
    approvals: [
      { id: 'ap-1', visitorId: 'v-pending-1', visitorName: 'Cynthia Wairimu', unitNumber: 'D-102', purpose: 'Personal visit', type: 'FRIENDLY_VISIT' },
      { id: 'ap-2', visitorId: 'v-pending-2', visitorName: 'Samuel Kariuki', unitNumber: 'A-204', purpose: 'Personal visit', type: 'FRIENDLY_VISIT' },
    ],
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/demo/data/seed.test.ts`
Expected: PASS.

> Note: The `A-204` tenant rename means one extra name from `NAMES` goes unused; the "tenants list matches occupied units" test only checks counts, so it still passes. Run the whole seed file to confirm.

- [ ] **Step 7: Typecheck + commit**

Run: `npx tsc -p tsconfig.app.json --noEmit` (expect no errors), then:
```bash
git add src/demo/data/personas.ts src/demo/data/types.ts src/demo/data/seed.ts src/demo/data/seed.test.ts
git commit -m "feat(demo): personas, SHIFT activity kind, seed shifts + resident request

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Shift store actions + selector

**Files:**
- Modify: `src/demo/store/demoStore.ts`
- Test: `src/demo/store/demoStore.test.ts`

- [ ] **Step 1: Write the failing tests** — append to `src/demo/store/demoStore.test.ts`:

```ts
import { selectShiftFor } from './demoStore'

describe('demo store shift lifecycle', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('selectShiftFor returns the seeded shift and undefined for unknown ids', () => {
    expect(selectShiftFor('s-2')(useDemoStore.getState())!.status).toBe('OFF')
    expect(selectShiftFor('nope')(useDemoStore.getState())).toBeUndefined()
  })

  it('startShift flips OFF->ON, sets startedLabel, logs a SHIFT activity', () => {
    useDemoStore.getState().startShift('s-2')
    const s = useDemoStore.getState()
    const shift = selectShiftFor('s-2')(s)!
    expect(shift.status).toBe('ON')
    expect(shift.startedLabel).toBeTruthy()
    expect(s.activity[0].kind).toBe('SHIFT')
    expect(s.activity[0].title).toContain('started their shift')
  })

  it('endShift flips ON->OFF, clears startedLabel, logs a SHIFT activity', () => {
    useDemoStore.getState().startShift('s-2')
    useDemoStore.getState().endShift('s-2')
    const s = useDemoStore.getState()
    const shift = selectShiftFor('s-2')(s)!
    expect(shift.status).toBe('OFF')
    expect(shift.startedLabel).toBeNull()
    expect(s.activity[0].title).toContain('ended their shift')
  })

  it('startShift/endShift are no-ops for an unknown staff id', () => {
    const before = useDemoStore.getState().activity.length
    useDemoStore.getState().startShift('nope')
    useDemoStore.getState().endShift('nope')
    expect(useDemoStore.getState().activity).toHaveLength(before)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/demo/store/demoStore.test.ts`
Expected: FAIL — `selectShiftFor`/`startShift`/`endShift` undefined.

- [ ] **Step 3: Add the selector** in `src/demo/store/demoStore.ts` (near the other selectors). Note it is a curried selector to accept a `staffId`:

```ts
export const selectShiftFor = (staffId: string) => (s: DemoState) => s.shifts.find(x => x.staffId === staffId)
```

- [ ] **Step 4: Add action signatures** to `DemoActions` (after `assignIncident`):

```ts
  startShift: (staffId: string) => void
  endShift: (staffId: string) => void
```

- [ ] **Step 5: Implement the actions** (after `assignIncident`, before `resetDemo`):

```ts
      startShift: (staffId) => set((s) => {
        const shift = s.shifts.find(x => x.staffId === staffId)
        const member = s.staff.find(x => x.id === staffId)
        if (!shift || !member) return {}
        return {
          shifts: s.shifts.map(x => x.staffId === staffId ? { ...x, status: 'ON' as const, startedLabel: 'Started 8:02 AM' } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'SHIFT' as const, title: `${member.name} started their shift`, subtitle: member.role, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      endShift: (staffId) => set((s) => {
        const shift = s.shifts.find(x => x.staffId === staffId)
        const member = s.staff.find(x => x.id === staffId)
        if (!shift || !member) return {}
        return {
          shifts: s.shifts.map(x => x.staffId === staffId ? { ...x, status: 'OFF' as const, startedLabel: null } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'SHIFT' as const, title: `${member.name} ended their shift`, subtitle: member.role, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/demo/store/demoStore.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/demo/store/demoStore.ts src/demo/store/demoStore.test.ts
git commit -m "feat(demo): shift lifecycle actions + selectShiftFor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Extract DemoStat + DemoActivityFeed; refactor manager dashboard

**Files:**
- Create: `src/demo/components/DemoStat.tsx`
- Create: `src/demo/components/DemoActivityFeed.tsx`
- Modify: `src/demo/pages/manager/DemoManagerDashboard.tsx`

- [ ] **Step 1: Create `src/demo/components/DemoStat.tsx`:**

```tsx
import type { LucideIcon } from 'lucide-react'

export function DemoStat({ icon: Icon, label, value, tint }: { icon: LucideIcon; label: string; value: number; tint: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tint}`}><Icon className="w-5 h-5" /></div>
      <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-sm text-gray-500">{label}</p></div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/demo/components/DemoActivityFeed.tsx`:**

```tsx
import { LogIn, LogOut, Package, AlertTriangle, UserCheck, Clock, type LucideIcon } from 'lucide-react'
import type { DemoActivity, DemoActivityKind } from '../data/types'

const ACTIVITY_ICON: Record<DemoActivityKind, LucideIcon> = {
  CHECK_IN: LogIn, CHECK_OUT: LogOut, DELIVERY: Package, INCIDENT: AlertTriangle, APPROVAL: UserCheck, SHIFT: Clock,
}
const ACTIVITY_TINT: Record<DemoActivityKind, string> = {
  CHECK_IN: 'bg-green-100 text-green-600', CHECK_OUT: 'bg-gray-100 text-gray-600',
  DELIVERY: 'bg-orange-100 text-orange-600', INCIDENT: 'bg-red-100 text-red-600',
  APPROVAL: 'bg-blue-100 text-blue-600', SHIFT: 'bg-gray-100 text-gray-600',
}

export function DemoActivityFeed({ activity, limit }: { activity: DemoActivity[]; limit?: number }) {
  const rows = limit ? activity.slice(0, limit) : activity
  return (
    <div className="divide-y divide-gray-50">
      {rows.map(a => {
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
  )
}
```

- [ ] **Step 3: Refactor `src/demo/pages/manager/DemoManagerDashboard.tsx`** to use them. Replace the whole file with:

```tsx
import { Users, DoorOpen, CalendarClock, ShieldAlert } from 'lucide-react'
import { useDemoStore, selectCurrentlyInside, selectOpenIncidents, selectVisitorsToday, selectExpectedToday } from '../../store/demoStore'
import { DemoStat } from '../../components/DemoStat'
import { DemoActivityFeed } from '../../components/DemoActivityFeed'

export default function DemoManagerDashboard() {
  const property = useDemoStore(s => s.property)
  const activity = useDemoStore(s => s.activity)
  const inside = useDemoStore(selectCurrentlyInside)
  const open = useDemoStore(selectOpenIncidents)
  const visitorsToday = useDemoStore(selectVisitorsToday)
  const expected = useDemoStore(selectExpectedToday)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good afternoon, Mercy Njeri 👋</h1>
        <p className="text-sm text-gray-500">{property.name} · {property.location}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DemoStat icon={Users} label="Visitors Today" value={visitorsToday} tint="bg-blue-100 text-blue-600" />
        <DemoStat icon={DoorOpen} label="Currently Inside" value={inside} tint="bg-green-100 text-green-600" />
        <DemoStat icon={CalendarClock} label="Expected Today" value={expected} tint="bg-purple-100 text-purple-600" />
        <DemoStat icon={ShieldAlert} label="Open Incidents" value={open} tint="bg-red-100 text-red-600" />
      </div>

      <div className="card p-5">
        <h2 className="section-title">Recent Activity</h2>
        <DemoActivityFeed activity={activity} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/demo/components/DemoStat.tsx src/demo/components/DemoActivityFeed.tsx src/demo/pages/manager/DemoManagerDashboard.tsx
git commit -m "refactor(demo): extract DemoStat + DemoActivityFeed (SHIFT-aware)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Extract DemoRegisterVisitorForm + DemoPendingApprovals; refactor visitors page

**Files:**
- Create: `src/demo/components/DemoRegisterVisitorForm.tsx`
- Create: `src/demo/components/DemoPendingApprovals.tsx`
- Modify: `src/demo/pages/manager/DemoVisitorsPage.tsx`

- [ ] **Step 1: Create `src/demo/components/DemoRegisterVisitorForm.tsx`:**

```tsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../store/demoStore'
import { Modal } from '../../components/ui/Modal'
import type { DemoVisitType } from '../data/types'

const TYPE_OPTIONS: { value: DemoVisitType; label: string }[] = [
  { value: 'FRIENDLY_VISIT', label: 'Personal visit' },
  { value: 'WORK', label: 'Work' },
  { value: 'SERVICE_PROVIDER', label: 'Service provider' },
  { value: 'DELIVERY', label: 'Delivery' },
]

export function DemoRegisterVisitorForm({ onClose }: { onClose: () => void }) {
  const registerVisitor = useDemoStore(s => s.registerVisitor)
  const units = useDemoStore(s => s.units)
  const [name, setName] = useState('')
  const [unitNumber, setUnitNumber] = useState(units[0]?.unitNumber ?? '')
  const [type, setType] = useState<DemoVisitType>('FRIENDLY_VISIT')
  const submit = () => {
    if (name.trim().length < 2) { toast.error('Enter a name'); return }
    registerVisitor({ name, unitNumber, type }); toast.success('Visitor registered'); onClose()
  }
  return (
    <Modal isOpen onClose={onClose} title="Register a visitor"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Register</button></>}>
      <div className="space-y-3">
        <div><label className="label">Visitor name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice Wanjiru" /></div>
        <div><label className="label">Visiting unit</label>
          <select className="input" value={unitNumber} onChange={e => setUnitNumber(e.target.value)}>
            {units.map(u => <option key={u.id} value={u.unitNumber}>{u.unitNumber}</option>)}
          </select>
        </div>
        <div><label className="label">Visit type</label>
          <select className="input" value={type} onChange={e => setType(e.target.value as DemoVisitType)}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Create `src/demo/components/DemoPendingApprovals.tsx`:**

```tsx
import { Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore, selectPendingApprovals } from '../store/demoStore'

export function DemoPendingApprovals({ unitNumber }: { unitNumber?: string }) {
  const all = useDemoStore(selectPendingApprovals)
  const approvals = unitNumber ? all.filter(a => a.unitNumber === unitNumber) : all
  const approveVisitor = useDemoStore(s => s.approveVisitor)
  const declineVisitor = useDemoStore(s => s.declineVisitor)
  const approve = (id: string, name: string) => { approveVisitor(id); toast.success(`${name} approved`) }
  const decline = (id: string, name: string) => { declineVisitor(id); toast(`${name} declined`) }

  if (approvals.length === 0) {
    return <div className="card px-4 py-8 text-center text-sm text-gray-500">No pending approvals.</div>
  }
  return (
    <div className="space-y-2">
      {approvals.map(a => (
        <div key={a.id} className="card p-4 flex items-center justify-between gap-4">
          <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{a.visitorName}</p><p className="text-xs text-gray-500 truncate">{a.unitNumber} · {a.purpose}</p></div>
          <div className="flex gap-2 shrink-0">
            <button className="btn-primary text-xs" onClick={() => approve(a.id, a.visitorName)}><Check className="w-3.5 h-3.5" /> Approve</button>
            <button className="btn-secondary text-xs" onClick={() => decline(a.id, a.visitorName)}><X className="w-3.5 h-3.5" /> Decline</button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Refactor `src/demo/pages/manager/DemoVisitorsPage.tsx`** to reuse them. Replace the whole file with:

```tsx
import { useState } from 'react'
import { Users, UserPlus, Check, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../../store/demoStore'
import { DemoCurrentlyInside } from '../../components/DemoCurrentlyInside'
import { DemoRegisterVisitorForm } from '../../components/DemoRegisterVisitorForm'
import { DemoPendingApprovals } from '../../components/DemoPendingApprovals'
import type { DemoVisitType } from '../../data/types'

const SAMPLE = { name: 'Brian Ochieng', unitNumber: 'A-204', type: 'FRIENDLY_VISIT' as DemoVisitType }

export default function DemoVisitorsPage() {
  const recent = useDemoStore(s => s.visitors.filter(v => v.status === 'CHECKED_OUT'))
  const registerVisitor = useDemoStore(s => s.registerVisitor)
  const [formOpen, setFormOpen] = useState(false)

  const registerSample = () => { registerVisitor(SAMPLE); toast.success(`${SAMPLE.name} registered`) }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Visitors</h1><p className="text-sm text-gray-500">Register, approve, and track everyone at the gate.</p></div>
      </div>

      <div className="rounded-2xl bg-lango-dark text-white p-5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> See how visitor management works</div>
        <p className="mt-2 text-sm text-white/70 max-w-xl">A visitor arrives at the gate. Register them, then approve the request — watch them appear in Currently Inside and on your dashboard activity.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={registerSample}><UserPlus className="w-4 h-4" /> Register the sample visitor</button>
          <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20" onClick={() => setFormOpen(true)}>Register your own</button>
        </div>
      </div>

      <div>
        <h2 className="section-title">Pending approvals</h2>
        <DemoPendingApprovals />
      </div>

      <div>
        <h2 className="section-title">Currently inside</h2>
        <DemoCurrentlyInside />
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="section-title">Recent (checked out)</h2>
          <div className="card divide-y divide-gray-50">
            {recent.map(v => (
              <div key={v.id} className="px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-900 truncate">{v.name}</span>
                <span className="text-gray-400 shrink-0">{v.unitNumber}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {formOpen && <DemoRegisterVisitorForm onClose={() => setFormOpen(false)} />}
    </div>
  )
}
```

> Note: this removes the page-local `justApproved` banner (its logic now lives in `DemoPendingApprovals` toasts). The `Check` import is retained only if used; if `tsc` flags it as unused, delete `Check` from the import. (It is unused here — remove it.)

- [ ] **Step 4: Fix the import** — since `Check` is no longer used, the import line should be:
```tsx
import { Users, UserPlus, Sparkles } from 'lucide-react'
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 6: Run demo tests** (nothing should break)

Run: `npx vitest run src/demo`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/demo/components/DemoRegisterVisitorForm.tsx src/demo/components/DemoPendingApprovals.tsx src/demo/pages/manager/DemoVisitorsPage.tsx
git commit -m "refactor(demo): extract register form + pending approvals (unit-filterable)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Shift panel + shared role pages

**Files:**
- Create: `src/demo/components/DemoShiftPanel.tsx`
- Create: `src/demo/components/DemoRegisterVisitorPage.tsx`
- Create: `src/demo/components/DemoInsidePage.tsx`
- Create: `src/demo/components/DemoShiftPage.tsx`

- [ ] **Step 1: Create `src/demo/components/DemoShiftPanel.tsx`:**

```tsx
import { Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore, selectShiftFor } from '../store/demoStore'

export function DemoShiftPanel({ staffId, staffName }: { staffId: string; staffName: string }) {
  const shift = useDemoStore(selectShiftFor(staffId))
  const startShift = useDemoStore(s => s.startShift)
  const endShift = useDemoStore(s => s.endShift)
  const on = shift?.status === 'ON'

  const start = () => { startShift(staffId); toast.success('Shift started') }
  const end = () => { endShift(staffId); toast('Shift ended') }

  return (
    <div className={`rounded-2xl p-5 flex items-center justify-between gap-4 ${on ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}><Clock className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{on ? 'On shift' : 'Off shift'}</p>
          <p className="text-xs text-gray-500 truncate">{staffName}{on && shift?.startedLabel ? ` · ${shift.startedLabel}` : ''}</p>
        </div>
      </div>
      {on
        ? <button className="btn-secondary shrink-0" onClick={end}>End Shift</button>
        : <button className="btn-primary shrink-0" onClick={start}>Start Shift</button>}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/demo/components/DemoRegisterVisitorPage.tsx`:**

```tsx
import { useState } from 'react'
import { UserPlus, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../store/demoStore'
import { DemoCurrentlyInside } from './DemoCurrentlyInside'
import { DemoRegisterVisitorForm } from './DemoRegisterVisitorForm'
import { DemoPendingApprovals } from './DemoPendingApprovals'
import type { DemoVisitType } from '../data/types'

const SAMPLE = { name: 'Brian Ochieng', unitNumber: 'A-204', type: 'FRIENDLY_VISIT' as DemoVisitType }

export default function DemoRegisterVisitorPage() {
  const registerVisitor = useDemoStore(s => s.registerVisitor)
  const [formOpen, setFormOpen] = useState(false)
  const registerSample = () => { registerVisitor(SAMPLE); toast.success(`${SAMPLE.name} registered`) }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><UserPlus className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Register a visitor</h1><p className="text-sm text-gray-500">Log an arrival, then approve to let them in.</p></div>
      </div>

      <div className="rounded-2xl bg-lango-dark text-white p-5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> Try it</div>
        <p className="mt-2 text-sm text-white/70 max-w-xl">Register a visitor at the gate, then approve the request below — they'll move into Currently Inside instantly.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={registerSample}><UserPlus className="w-4 h-4" /> Register the sample visitor</button>
          <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20" onClick={() => setFormOpen(true)}>Register your own</button>
        </div>
      </div>

      <div>
        <h2 className="section-title">Pending approvals</h2>
        <DemoPendingApprovals />
      </div>

      <div>
        <h2 className="section-title">Currently inside</h2>
        <DemoCurrentlyInside />
      </div>

      {formOpen && <DemoRegisterVisitorForm onClose={() => setFormOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/demo/components/DemoInsidePage.tsx`:**

```tsx
import { DoorOpen } from 'lucide-react'
import { DemoCurrentlyInside } from './DemoCurrentlyInside'

export default function DemoInsidePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><DoorOpen className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Currently inside</h1><p className="text-sm text-gray-500">Everyone on the property right now. Check them out on exit.</p></div>
      </div>
      <DemoCurrentlyInside />
    </div>
  )
}
```

- [ ] **Step 4: Create `src/demo/components/DemoShiftPage.tsx`:**

```tsx
import { useDemoStore } from '../store/demoStore'
import { DemoShiftPanel } from './DemoShiftPanel'

export default function DemoShiftPage({ staffId }: { staffId: string }) {
  const staffName = useDemoStore(s => s.staff.find(m => m.id === staffId)?.name ?? 'Staff member')
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My shift</h1>
        <p className="text-sm text-gray-500">Clock in when you arrive; clock out when you leave. Your status shows on the manager's activity feed.</p>
      </div>
      <DemoShiftPanel staffId={staffId} staffName={staffName} />
    </div>
  )
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/demo/components/DemoShiftPanel.tsx src/demo/components/DemoRegisterVisitorPage.tsx src/demo/components/DemoInsidePage.tsx src/demo/components/DemoShiftPage.tsx
git commit -m "feat(demo): shift panel + shared register/inside/shift pages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Role dashboards (Guard, Caretaker, Resident)

**Files:**
- Create: `src/demo/pages/guard/DemoGuardDashboard.tsx`
- Create: `src/demo/pages/caretaker/DemoCaretakerDashboard.tsx`
- Create: `src/demo/pages/resident/DemoResidentDashboard.tsx`

- [ ] **Step 1: Create `src/demo/pages/guard/DemoGuardDashboard.tsx`:**

```tsx
import { Link } from 'react-router-dom'
import { Users, DoorOpen, CalendarClock, UserCheck, UserPlus } from 'lucide-react'
import { useDemoStore, selectCurrentlyInside, selectVisitorsToday, selectExpectedToday, selectPendingApprovals } from '../../store/demoStore'
import { DemoStat } from '../../components/DemoStat'
import { DemoShiftPanel } from '../../components/DemoShiftPanel'
import { DemoCurrentlyInside } from '../../components/DemoCurrentlyInside'
import { GUARD_STAFF_ID } from '../../data/personas'

export default function DemoGuardDashboard() {
  const guardName = useDemoStore(s => s.staff.find(m => m.id === GUARD_STAFF_ID)?.name ?? 'Guard')
  const inside = useDemoStore(selectCurrentlyInside)
  const visitorsToday = useDemoStore(selectVisitorsToday)
  const expected = useDemoStore(selectExpectedToday)
  const pending = useDemoStore(selectPendingApprovals).length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good day, {guardName} 👋</h1>
        <p className="text-sm text-gray-500">Greenview Apartments · Security Gate</p>
      </div>

      <DemoShiftPanel staffId={GUARD_STAFF_ID} staffName={guardName} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DemoStat icon={Users} label="Visitors Today" value={visitorsToday} tint="bg-blue-100 text-blue-600" />
        <DemoStat icon={DoorOpen} label="Currently Inside" value={inside} tint="bg-green-100 text-green-600" />
        <DemoStat icon={CalendarClock} label="Expected" value={expected} tint="bg-purple-100 text-purple-600" />
        <DemoStat icon={UserCheck} label="Pending Approval" value={pending} tint="bg-amber-100 text-amber-600" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/demo/guard/register" className="btn-primary"><UserPlus className="w-4 h-4" /> Register visitor</Link>
        <Link to="/demo/guard/inside" className="btn-secondary"><DoorOpen className="w-4 h-4" /> Currently inside</Link>
      </div>

      <div>
        <h2 className="section-title">Currently inside</h2>
        <DemoCurrentlyInside />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/demo/pages/caretaker/DemoCaretakerDashboard.tsx`:**

```tsx
import { Link } from 'react-router-dom'
import { DoorOpen, UserPlus } from 'lucide-react'
import { useDemoStore } from '../../store/demoStore'
import { DemoShiftPanel } from '../../components/DemoShiftPanel'
import { DemoActivityFeed } from '../../components/DemoActivityFeed'
import { CARETAKER_STAFF_ID } from '../../data/personas'

export default function DemoCaretakerDashboard() {
  const caretakerName = useDemoStore(s => s.staff.find(m => m.id === CARETAKER_STAFF_ID)?.name ?? 'Caretaker')
  const activity = useDemoStore(s => s.activity)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hi, {caretakerName} 👋</h1>
        <p className="text-sm text-gray-500">Greenview Apartments · Caretaker</p>
      </div>

      <DemoShiftPanel staffId={CARETAKER_STAFF_ID} staffName={caretakerName} />

      <div className="flex flex-wrap gap-2">
        <Link to="/demo/caretaker/register" className="btn-primary"><UserPlus className="w-4 h-4" /> Register visitor</Link>
        <Link to="/demo/caretaker/inside" className="btn-secondary"><DoorOpen className="w-4 h-4" /> Currently inside</Link>
      </div>

      <div className="card p-5">
        <h2 className="section-title">Recent activity</h2>
        <DemoActivityFeed activity={activity} limit={6} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/demo/pages/resident/DemoResidentDashboard.tsx`:**

```tsx
import { Home, Package, DoorOpen } from 'lucide-react'
import { useDemoStore, selectInsideVisitors } from '../../store/demoStore'
import { DemoPendingApprovals } from '../../components/DemoPendingApprovals'
import { DemoDeliveryBadge } from '../../components/DemoBadges'
import { RESIDENT_UNIT } from '../../data/personas'

export default function DemoResidentDashboard() {
  const residentName = useDemoStore(s => s.tenants.find(t => t.unitNumber === RESIDENT_UNIT)?.name ?? 'Resident')
  const myVisitors = useDemoStore(selectInsideVisitors).filter(v => v.unitNumber === RESIDENT_UNIT)
  const myDeliveries = useDemoStore(s => s.deliveries.filter(d => d.unitNumber === RESIDENT_UNIT))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Home className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Welcome, {residentName} 👋</h1><p className="text-sm text-gray-500">Apartment {RESIDENT_UNIT} · Greenview Apartments</p></div>
      </div>

      <div>
        <h2 className="section-title">Visitor requests</h2>
        <DemoPendingApprovals unitNumber={RESIDENT_UNIT} />
      </div>

      <div>
        <h2 className="section-title">Currently visiting you</h2>
        <div className="card divide-y divide-gray-50">
          {myVisitors.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-500">No visitors inside right now.</div>}
          {myVisitors.map(v => (
            <div key={v.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><DoorOpen className="w-4 h-4" /></div>
              <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{v.name}</p><p className="text-xs text-gray-500 truncate">{v.type.replace(/_/g, ' ').toLowerCase()}{v.checkInLabel ? ` · ${v.checkInLabel}` : ''}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="section-title">Your deliveries</h2>
        <div className="card divide-y divide-gray-50">
          {myDeliveries.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-500">No deliveries expected.</div>}
          {myDeliveries.map(d => (
            <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Package className="w-4 h-4" /></div>
                <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{d.company}</p><p className="text-xs text-gray-500 truncate">{d.expectedLabel}</p></div>
              </div>
              <DemoDeliveryBadge status={d.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/demo/pages/guard/DemoGuardDashboard.tsx src/demo/pages/caretaker/DemoCaretakerDashboard.tsx src/demo/pages/resident/DemoResidentDashboard.tsx
git commit -m "feat(demo): guard, caretaker, and resident dashboards

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Wire routes + full verification

**Files:**
- Modify: `src/demo/DemoApp.tsx`

- [ ] **Step 1: Update imports** in `src/demo/DemoApp.tsx` (after the existing manager-page imports):

```tsx
import DemoGuardDashboard from './pages/guard/DemoGuardDashboard'
import DemoCaretakerDashboard from './pages/caretaker/DemoCaretakerDashboard'
import DemoResidentDashboard from './pages/resident/DemoResidentDashboard'
import DemoRegisterVisitorPage from './components/DemoRegisterVisitorPage'
import DemoInsidePage from './components/DemoInsidePage'
import DemoShiftPage from './components/DemoShiftPage'
import { GUARD_STAFF_ID } from './data/personas'
```

- [ ] **Step 2: Replace the guard/caretaker/resident route blocks** in `src/demo/DemoApp.tsx`:

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

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 4: Run all demo tests**

Run: `npx vitest run src/demo`
Expected: PASS.

- [ ] **Step 5: Verify isolation**

Run: `grep -rEn "firebase|AuthContext|/services/" src/demo`
Expected: no hits.

- [ ] **Step 6: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/demo/DemoApp.tsx
git commit -m "feat(demo): wire guard/caretaker/resident routes (placeholders removed)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** personas (T1), SHIFT kind + seed (T1), shift actions + selector (T2), DemoStat/DemoActivityFeed + manager refactor (T3), register form + pending-approvals extraction + visitors refactor (T4), shift panel + shared pages (T5), three role dashboards (T6), routing (T7). Nav unchanged (spec). ✓
- **Type consistency:** `selectShiftFor(staffId)` is curried → used as `useDemoStore(selectShiftFor(staffId))` in `DemoShiftPanel` and as `selectShiftFor('s-2')(state)` in tests — consistent. `DemoActivityFeed` prop `activity`/`limit` matches all call sites. `DemoPendingApprovals` optional `unitNumber` matches manager (none) and resident (`RESIDENT_UNIT`). `DemoShiftPage`/`DemoStat`/`DemoShiftPanel` prop names match their usages.
- **Placeholder scan:** no TBD/TODO; every code step is complete; `Check` import removal called out explicitly in T4.
- **Isolation:** all new files import only demo store/components + shared `Modal`/lucide/react-router/toast. Verified in T7 Step 5.
