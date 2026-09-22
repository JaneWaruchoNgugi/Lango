# Demo Mode D3 — Delivery + Incident Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Property Manager Deliveries and Incidents pages fully interactive — every action mutates the demo store and logs activity, so dashboard stats update live.

**Architecture:** Extend the existing zustand demo store (`src/demo/store/demoStore.ts`) with delivery/incident lifecycle actions following the established action shape. Add two isolated badge components and two pages that mirror `DemoVisitorsPage`. Wire two new manager routes. Store logic is TDD'd; pages are build-verified.

**Tech Stack:** React + TypeScript, zustand (+persist/sessionStorage), react-router-dom, lucide-react, react-hot-toast, Vitest, Tailwind design-system classes.

**Reference spec:** `docs/superpowers/specs/2026-09-15-demo-mode-d3-deliveries-incidents-design.md`

**Verify commands (this repo uses project-reference tsconfigs):**
```
npx tsc -p tsconfig.app.json --noEmit
npx vitest run src/demo
npm run build
grep -rEn "firebase|AuthContext|/services/" src/demo   # expect no hits
```

---

### Task 1: Data model + seed (EXPECTED deliveries, incident assignee)

**Files:**
- Modify: `src/demo/data/types.ts` (DemoDeliveryStatus, DemoIncident)
- Modify: `src/demo/data/seed.ts` (deliveries d-1..d-4 → EXPECTED)
- Test: `src/demo/data/seed.test.ts`

- [ ] **Step 1: Write the failing test** — append to `src/demo/data/seed.test.ts`, inside the existing `describe('demo seed', ...)` block (before its closing `})`):

```ts
  it('seeds all four deliveries as EXPECTED', () => {
    const s = seed()
    expect(s.deliveries).toHaveLength(4)
    expect(s.deliveries.every(d => d.status === 'EXPECTED')).toBe(true)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/demo/data/seed.test.ts`
Expected: FAIL — deliveries are currently `RECEIVED`.

- [ ] **Step 3: Update types** in `src/demo/data/types.ts`:

Change:
```ts
export type DemoDeliveryStatus = 'RECEIVED' | 'COLLECTED' | 'HELD'
```
to:
```ts
export type DemoDeliveryStatus = 'EXPECTED' | 'RECEIVED' | 'COLLECTED' | 'HELD'
```

Change the `DemoIncident` interface:
```ts
export interface DemoIncident { id: string; type: string; location: string; reportedBy: string; timeLabel: string; status: DemoIncidentStatus }
```
to:
```ts
export interface DemoIncident { id: string; type: string; location: string; reportedBy: string; timeLabel: string; status: DemoIncidentStatus; assignedTo?: string }
```

- [ ] **Step 4: Update seed** in `src/demo/data/seed.ts` — change the four deliveries' `status` from `'RECEIVED'` to `'EXPECTED'`:

```ts
    deliveries: [
      { id: 'd-1', company: 'Uber Eats', unitNumber: 'A-204', expectedLabel: '12:45 PM', status: 'EXPECTED' },
      { id: 'd-2', company: 'Courier', unitNumber: 'B-102', expectedLabel: '1:15 PM', status: 'EXPECTED' },
      { id: 'd-3', company: 'FedEx', unitNumber: 'C-301', expectedLabel: '2:30 PM', status: 'EXPECTED' },
      { id: 'd-4', company: 'Amazon', unitNumber: 'A-103', expectedLabel: '3:00 PM', status: 'EXPECTED' },
    ],
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/demo/data/seed.test.ts`
Expected: PASS (all seed tests, including the new one).

- [ ] **Step 6: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/demo/data/types.ts src/demo/data/seed.ts src/demo/data/seed.test.ts
git commit -m "feat(demo): EXPECTED delivery state + incident assignee, seed deliveries as expected

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Delivery lifecycle actions

**Files:**
- Modify: `src/demo/store/demoStore.ts` (DemoActions interface + implementations)
- Test: `src/demo/store/demoStore.test.ts`

- [ ] **Step 1: Write the failing tests** — append a new describe block to `src/demo/store/demoStore.test.ts` (after the visitor-lifecycle block):

```ts
describe('demo store delivery lifecycle', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('checkInDelivery moves an EXPECTED delivery to RECEIVED and logs activity', () => {
    const d = useDemoStore.getState().deliveries.find(x => x.status === 'EXPECTED')!
    useDemoStore.getState().checkInDelivery(d.id)
    const s = useDemoStore.getState()
    expect(s.deliveries.find(x => x.id === d.id)!.status).toBe('RECEIVED')
    expect(s.activity[0].title).toBe('Delivery checked in')
    expect(s.activity[0].kind).toBe('DELIVERY')
  })

  it('checkInDelivery is a no-op on a non-EXPECTED delivery', () => {
    const d = useDemoStore.getState().deliveries.find(x => x.status === 'EXPECTED')!
    useDemoStore.getState().checkInDelivery(d.id)          // -> RECEIVED
    const activityLen = useDemoStore.getState().activity.length
    useDemoStore.getState().checkInDelivery(d.id)          // no-op
    const s = useDemoStore.getState()
    expect(s.deliveries.find(x => x.id === d.id)!.status).toBe('RECEIVED')
    expect(s.activity).toHaveLength(activityLen)
  })

  it('collectDelivery moves a RECEIVED delivery to COLLECTED and logs activity', () => {
    const d = useDemoStore.getState().deliveries.find(x => x.status === 'EXPECTED')!
    useDemoStore.getState().checkInDelivery(d.id)          // -> RECEIVED
    useDemoStore.getState().collectDelivery(d.id)          // -> COLLECTED
    const s = useDemoStore.getState()
    expect(s.deliveries.find(x => x.id === d.id)!.status).toBe('COLLECTED')
    expect(s.activity[0].title).toBe('Delivery collected')
  })

  it('collectDelivery is a no-op on a non-RECEIVED delivery', () => {
    const d = useDemoStore.getState().deliveries.find(x => x.status === 'EXPECTED')!
    const activityLen = useDemoStore.getState().activity.length
    useDemoStore.getState().collectDelivery(d.id)          // still EXPECTED -> no-op
    const s = useDemoStore.getState()
    expect(s.deliveries.find(x => x.id === d.id)!.status).toBe('EXPECTED')
    expect(s.activity).toHaveLength(activityLen)
  })

  it('registerDelivery appends an EXPECTED delivery and logs activity', () => {
    const before = useDemoStore.getState().deliveries.length
    useDemoStore.getState().registerDelivery({ company: 'Glovo', unitNumber: 'A-101' })
    const s = useDemoStore.getState()
    expect(s.deliveries).toHaveLength(before + 1)
    const added = s.deliveries[s.deliveries.length - 1]
    expect(added.company).toBe('Glovo')
    expect(added.status).toBe('EXPECTED')
    expect(s.activity[0].title).toBe('Delivery registered')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/demo/store/demoStore.test.ts`
Expected: FAIL — `checkInDelivery`/`collectDelivery`/`registerDelivery` are not functions.

- [ ] **Step 3: Add action signatures** to the `DemoActions` interface in `src/demo/store/demoStore.ts` (after `checkOutVisitor`):

```ts
  checkInDelivery: (id: string) => void
  collectDelivery: (id: string) => void
  registerDelivery: (input: { company: string; unitNumber: string }) => void
```

- [ ] **Step 4: Implement the actions** in the store object (after the `checkOutVisitor` implementation, before `resetDemo`):

```ts
      checkInDelivery: (id) => set((s) => {
        const d = s.deliveries.find(x => x.id === id && x.status === 'EXPECTED')
        if (!d) return {}
        return {
          deliveries: s.deliveries.map(x => x.id === id ? { ...x, status: 'RECEIVED' as const } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'DELIVERY' as const, title: 'Delivery checked in', subtitle: `${d.unitNumber} · ${d.company}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      collectDelivery: (id) => set((s) => {
        const d = s.deliveries.find(x => x.id === id && x.status === 'RECEIVED')
        if (!d) return {}
        return {
          deliveries: s.deliveries.map(x => x.id === id ? { ...x, status: 'COLLECTED' as const } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'DELIVERY' as const, title: 'Delivery collected', subtitle: `${d.unitNumber} · ${d.company}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      registerDelivery: ({ company, unitNumber }) => set((s) => {
        const uid = crypto.randomUUID()
        return {
          deliveries: [...s.deliveries, { id: `d-${uid}`, company, unitNumber, expectedLabel: 'Just now', status: 'EXPECTED' as const }],
          activity: [{ id: `act-${uid}`, kind: 'DELIVERY' as const, title: 'Delivery registered', subtitle: `${unitNumber} · ${company}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/demo/store/demoStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/demo/store/demoStore.ts src/demo/store/demoStore.test.ts
git commit -m "feat(demo): delivery lifecycle actions (check-in/collect/register)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Incident lifecycle actions

**Files:**
- Modify: `src/demo/store/demoStore.ts` (DemoActions interface + implementations)
- Test: `src/demo/store/demoStore.test.ts`

- [ ] **Step 1: Write the failing tests** — append a new describe block to `src/demo/store/demoStore.test.ts`:

```ts
describe('demo store incident lifecycle', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('createIncident adds an OPEN incident and raises selectOpenIncidents', () => {
    const openBefore = selectOpenIncidents(useDemoStore.getState())
    useDemoStore.getState().createIncident({ type: 'Noise Complaint', location: 'Block C', reportedBy: 'Mercy Njeri' })
    const s = useDemoStore.getState()
    expect(selectOpenIncidents(s)).toBe(openBefore + 1)
    expect(s.incidents[s.incidents.length - 1].status).toBe('OPEN')
    expect(s.activity[0].title).toBe('Incident reported')
    expect(s.activity[0].kind).toBe('INCIDENT')
  })

  it('setIncidentStatus RESOLVED lowers selectOpenIncidents; INVESTIGATING does not', () => {
    const inc = useDemoStore.getState().incidents.find(i => i.status === 'OPEN')!
    const openBefore = selectOpenIncidents(useDemoStore.getState())
    useDemoStore.getState().setIncidentStatus(inc.id, 'INVESTIGATING')
    expect(selectOpenIncidents(useDemoStore.getState())).toBe(openBefore) // OPEN count unchanged
    useDemoStore.getState().setIncidentStatus(inc.id, 'RESOLVED')
    const s = useDemoStore.getState()
    expect(s.incidents.find(i => i.id === inc.id)!.status).toBe('RESOLVED')
    expect(selectOpenIncidents(s)).toBe(openBefore - 1)
    expect(s.activity[0].title).toBe('Incident resolved')
  })

  it('assignIncident sets assignedTo and logs activity', () => {
    const inc = useDemoStore.getState().incidents.find(i => i.status === 'OPEN')!
    useDemoStore.getState().assignIncident(inc.id, 'James Mwangi')
    const s = useDemoStore.getState()
    expect(s.incidents.find(i => i.id === inc.id)!.assignedTo).toBe('James Mwangi')
    expect(s.activity[0].title).toBe('Incident assigned')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/demo/store/demoStore.test.ts`
Expected: FAIL — the three incident actions are not functions.

- [ ] **Step 3: Add action signatures** to the `DemoActions` interface (after the delivery signatures from Task 2). Note the `DemoIncidentStatus` import:

At the top import line, extend the type import:
```ts
import type { DemoRole, DemoState, DemoActivity, DemoVisitType, DemoIncidentStatus } from '../data/types'
```

Add to `DemoActions`:
```ts
  createIncident: (input: { type: string; location: string; reportedBy: string }) => void
  setIncidentStatus: (id: string, status: DemoIncidentStatus) => void
  assignIncident: (id: string, staffName: string) => void
```

- [ ] **Step 4: Implement the actions** in the store object (after the delivery actions, before `resetDemo`):

```ts
      createIncident: ({ type, location, reportedBy }) => set((s) => {
        const uid = crypto.randomUUID()
        return {
          incidents: [...s.incidents, { id: `i-${uid}`, type, location, reportedBy, timeLabel: 'Just now', status: 'OPEN' as const }],
          activity: [{ id: `act-${uid}`, kind: 'INCIDENT' as const, title: 'Incident reported', subtitle: `${location} · ${type}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      setIncidentStatus: (id, status) => set((s) => {
        const inc = s.incidents.find(x => x.id === id)
        if (!inc) return {}
        const title = status === 'RESOLVED' ? 'Incident resolved'
          : status === 'INVESTIGATING' ? 'Incident under investigation'
          : 'Incident reopened'
        return {
          incidents: s.incidents.map(x => x.id === id ? { ...x, status } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'INCIDENT' as const, title, subtitle: `${inc.location} · ${inc.type}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      assignIncident: (id, staffName) => set((s) => {
        const inc = s.incidents.find(x => x.id === id)
        if (!inc) return {}
        return {
          incidents: s.incidents.map(x => x.id === id ? { ...x, assignedTo: staffName } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'INCIDENT' as const, title: 'Incident assigned', subtitle: `${staffName} · ${inc.location}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/demo/store/demoStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc -p tsconfig.app.json --noEmit` (expect no errors), then:
```bash
git add src/demo/store/demoStore.ts src/demo/store/demoStore.test.ts
git commit -m "feat(demo): incident lifecycle actions (create/status/assign)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Demo badge components

**Files:**
- Create: `src/demo/components/DemoBadges.tsx`

- [ ] **Step 1: Create the file** `src/demo/components/DemoBadges.tsx`:

```tsx
import type { DemoDeliveryStatus, DemoIncidentStatus } from '../data/types'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'gray' | 'blue' | 'orange'

function Badge({ variant, label }: { variant: BadgeVariant; label: string }) {
  return <span className={`badge badge-${variant}`}>{label}</span>
}

export function DemoDeliveryBadge({ status }: { status: DemoDeliveryStatus }) {
  const map: Record<DemoDeliveryStatus, { variant: BadgeVariant; label: string }> = {
    EXPECTED:  { variant: 'gray',   label: 'Expected' },
    RECEIVED:  { variant: 'blue',   label: 'Received' },
    COLLECTED: { variant: 'green',  label: 'Collected' },
    HELD:      { variant: 'yellow', label: 'Held' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}

export function DemoIncidentBadge({ status }: { status: DemoIncidentStatus }) {
  const map: Record<DemoIncidentStatus, { variant: BadgeVariant; label: string }> = {
    OPEN:          { variant: 'red',    label: 'Open' },
    INVESTIGATING: { variant: 'yellow', label: 'Investigating' },
    RESOLVED:      { variant: 'green',  label: 'Resolved' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/demo/components/DemoBadges.tsx
git commit -m "feat(demo): isolated delivery + incident status badges

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Deliveries page

**Files:**
- Create: `src/demo/pages/manager/DemoDeliveriesPage.tsx`

- [ ] **Step 1: Create the file** `src/demo/pages/manager/DemoDeliveriesPage.tsx`:

```tsx
import { useState } from 'react'
import { Package, PackagePlus, Sparkles, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../../store/demoStore'
import { DemoDeliveryBadge } from '../../components/DemoBadges'
import { Modal } from '../../../components/ui/Modal'

const SAMPLE = { company: 'Glovo', unitNumber: 'A-101' }

function RegisterDeliveryForm({ onClose }: { onClose: () => void }) {
  const registerDelivery = useDemoStore(s => s.registerDelivery)
  const units = useDemoStore(s => s.units)
  const [company, setCompany] = useState('')
  const [unitNumber, setUnitNumber] = useState(units[0]?.unitNumber ?? '')
  const submit = () => {
    if (company.trim().length < 2) { toast.error('Enter a company'); return }
    registerDelivery({ company, unitNumber }); toast.success('Delivery registered'); onClose()
  }
  return (
    <Modal isOpen onClose={onClose} title="Register a delivery"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Register</button></>}>
      <div className="space-y-3">
        <div><label className="label">Company / courier</label><input className="input" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. DHL" /></div>
        <div><label className="label">Destination unit</label>
          <select className="input" value={unitNumber} onChange={e => setUnitNumber(e.target.value)}>
            {units.map(u => <option key={u.id} value={u.unitNumber}>{u.unitNumber}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}

export default function DemoDeliveriesPage() {
  const deliveries = useDemoStore(s => s.deliveries)
  const registerDelivery = useDemoStore(s => s.registerDelivery)
  const checkInDelivery = useDemoStore(s => s.checkInDelivery)
  const collectDelivery = useDemoStore(s => s.collectDelivery)
  const [formOpen, setFormOpen] = useState(false)

  const registerSample = () => { registerDelivery(SAMPLE); toast.success(`${SAMPLE.company} delivery registered`) }
  const checkIn = (id: string, company: string) => { checkInDelivery(id); toast.success(`${company} checked in`) }
  const collect = (id: string, company: string) => { collectDelivery(id); toast.success(`${company} collected`) }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Package className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Deliveries</h1><p className="text-sm text-gray-500">Log parcels at the gate and hand them off cleanly.</p></div>
      </div>

      <div className="rounded-2xl bg-lango-dark text-white p-5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> See how parcel handling works</div>
        <p className="mt-2 text-sm text-white/70 max-w-xl">A courier arrives with a parcel. Check it in at the gate, then mark it collected when the resident picks it up — each step lands on your dashboard activity.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={registerSample}><PackagePlus className="w-4 h-4" /> Register the sample delivery</button>
          <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20" onClick={() => setFormOpen(true)}>Register your own</button>
        </div>
      </div>

      <div>
        <h2 className="section-title">Today's deliveries</h2>
        {deliveries.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-gray-500">No deliveries logged.</div>
        ) : (
          <div className="space-y-2">
            {deliveries.map(d => (
              <div key={d.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{d.company}</p>
                  <p className="text-xs text-gray-500 truncate">{d.unitNumber} · {d.expectedLabel}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <DemoDeliveryBadge status={d.status} />
                  {d.status === 'EXPECTED' && <button className="btn-primary text-xs" onClick={() => checkIn(d.id, d.company)}>Check In</button>}
                  {d.status === 'RECEIVED' && <button className="btn-primary text-xs" onClick={() => collect(d.id, d.company)}><Check className="w-3.5 h-3.5" /> Mark Collected</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && <RegisterDeliveryForm onClose={() => setFormOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/demo/pages/manager/DemoDeliveriesPage.tsx
git commit -m "feat(demo): interactive deliveries page (check-in/collect/register)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Incidents page

**Files:**
- Create: `src/demo/pages/manager/DemoIncidentsPage.tsx`

- [ ] **Step 1: Create the file** `src/demo/pages/manager/DemoIncidentsPage.tsx`:

```tsx
import { useState } from 'react'
import { ShieldCheck, ShieldPlus, Sparkles, Search, CheckCircle2, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../../store/demoStore'
import { DemoIncidentBadge } from '../../components/DemoBadges'
import { Modal } from '../../../components/ui/Modal'

const MANAGER_NAME = 'Mercy Njeri'

function ReportIncidentForm({ onClose }: { onClose: () => void }) {
  const createIncident = useDemoStore(s => s.createIncident)
  const [type, setType] = useState('')
  const [location, setLocation] = useState('')
  const submit = () => {
    if (type.trim().length < 2) { toast.error('Describe the incident'); return }
    if (location.trim().length < 1) { toast.error('Enter a location'); return }
    createIncident({ type, location, reportedBy: MANAGER_NAME }); toast.success('Incident reported'); onClose()
  }
  return (
    <Modal isOpen onClose={onClose} title="Report an incident"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Report</button></>}>
      <div className="space-y-3">
        <div><label className="label">What happened?</label><input className="input" value={type} onChange={e => setType(e.target.value)} placeholder="e.g. Noise complaint" /></div>
        <div><label className="label">Location</label><input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Block C" /></div>
      </div>
    </Modal>
  )
}

function AssignForm({ incidentId, onClose }: { incidentId: string; onClose: () => void }) {
  const staff = useDemoStore(s => s.staff)
  const assignIncident = useDemoStore(s => s.assignIncident)
  const [name, setName] = useState(staff[0]?.name ?? '')
  const submit = () => { assignIncident(incidentId, name); toast.success(`Assigned to ${name}`); onClose() }
  return (
    <Modal isOpen onClose={onClose} title="Assign incident"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Assign</button></>}>
      <div><label className="label">Assign to staff member</label>
        <select className="input" value={name} onChange={e => setName(e.target.value)}>
          {staff.map(m => <option key={m.id} value={m.name}>{m.name} · {m.role}</option>)}
        </select>
      </div>
    </Modal>
  )
}

export default function DemoIncidentsPage() {
  const incidents = useDemoStore(s => s.incidents)
  const setIncidentStatus = useDemoStore(s => s.setIncidentStatus)
  const [reportOpen, setReportOpen] = useState(false)
  const [assignId, setAssignId] = useState<string | null>(null)

  const investigate = (id: string) => { setIncidentStatus(id, 'INVESTIGATING'); toast('Marked as investigating') }
  const resolve = (id: string) => { setIncidentStatus(id, 'RESOLVED'); toast.success('Incident resolved') }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Incidents</h1><p className="text-sm text-gray-500">Track and resolve security incidents across the property.</p></div>
      </div>

      <div className="rounded-2xl bg-lango-dark text-white p-5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> See how incidents are tracked</div>
        <p className="mt-2 text-sm text-white/70 max-w-xl">Report an incident, assign it to a guard, then walk it from open to investigating to resolved — resolving it clears the alert on your dashboard.</p>
        <div className="mt-4">
          <button className="btn-primary" onClick={() => setReportOpen(true)}><ShieldPlus className="w-4 h-4" /> Report an incident</button>
        </div>
      </div>

      <div>
        <h2 className="section-title">Incidents</h2>
        {incidents.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-gray-500">No incidents reported.</div>
        ) : (
          <div className="space-y-2">
            {incidents.map(i => (
              <div key={i.id} className="card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><p className="font-medium text-gray-900 truncate">{i.type}</p><DemoIncidentBadge status={i.status} /></div>
                  <p className="text-xs text-gray-500 truncate">{i.location} · {i.reportedBy} · {i.timeLabel}</p>
                  {i.assignedTo && <p className="text-xs text-lango-primary mt-0.5">Assigned to {i.assignedTo}</p>}
                </div>
                <div className="flex flex-wrap justify-end gap-2 shrink-0">
                  {i.status === 'OPEN' && <button className="btn-primary text-xs" onClick={() => investigate(i.id)}><Search className="w-3.5 h-3.5" /> Investigate</button>}
                  {i.status === 'INVESTIGATING' && <button className="btn-primary text-xs" onClick={() => resolve(i.id)}><CheckCircle2 className="w-3.5 h-3.5" /> Resolve</button>}
                  {i.status !== 'RESOLVED' && <button className="btn-secondary text-xs" onClick={() => setAssignId(i.id)}><UserPlus className="w-3.5 h-3.5" /> Assign</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reportOpen && <ReportIncidentForm onClose={() => setReportOpen(false)} />}
      {assignId && <AssignForm incidentId={assignId} onClose={() => setAssignId(null)} />}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/demo/pages/manager/DemoIncidentsPage.tsx
git commit -m "feat(demo): interactive incidents page (report/investigate/resolve/assign)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Wire routes + full verification

**Files:**
- Modify: `src/demo/DemoApp.tsx`

- [ ] **Step 1: Import the pages** at the top of `src/demo/DemoApp.tsx` (after the `DemoVisitorsPage` import):

```tsx
import DemoDeliveriesPage from './pages/manager/DemoDeliveriesPage'
import DemoIncidentsPage from './pages/manager/DemoIncidentsPage'
```

- [ ] **Step 2: Add the routes** inside the manager `<Route path="manager" ...>` block, immediately before `<Route path="*" element={<DemoPlaceholder />} />`:

```tsx
          <Route path="deliveries" element={<DemoDeliveriesPage />} />
          <Route path="incidents" element={<DemoIncidentsPage />} />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 4: Run all demo tests**

Run: `npx vitest run src/demo`
Expected: PASS (seed + store suites).

- [ ] **Step 5: Verify isolation**

Run: `grep -rEn "firebase|AuthContext|/services/" src/demo`
Expected: no hits.

- [ ] **Step 6: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/demo/DemoApp.tsx
git commit -m "feat(demo): wire manager deliveries + incidents routes

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** types+seed (Task 1) ✓, delivery actions (Task 2) ✓, incident actions (Task 3) ✓, badges (Task 4) ✓, deliveries page (Task 5) ✓, incidents page (Task 6) ✓, routing (Task 7) ✓. Selectors: none added (spec says none required) ✓.
- **Type consistency:** action names `checkInDelivery`/`collectDelivery`/`registerDelivery`/`createIncident`/`setIncidentStatus`/`assignIncident` are used identically in interface, implementation, tests, and pages. `DemoIncidentStatus` imported into the store for `setIncidentStatus`. `assignedTo?` added in Task 1, read in Task 6.
- **No placeholders:** every code step contains full code; commands include expected output.
- **Isolation:** pages import only `useDemoStore`, `DemoBadges`, and the shared `Modal` (`../../../components/ui/Modal`) — no firebase/AuthContext/services. Verified in Task 7 Step 5.
```