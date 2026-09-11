# Demo Mode D2 — Interactive Visitor Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/demo/manager/visitors` a fully interactive page — register (scripted + form) → approve/decline → Currently Inside → check out — with the demo store driving live dashboard counts and Recent Activity.

**Architecture:** Extends the isolated `src/demo/` module. Adds visitor-lifecycle actions to the zustand store (`approvals` = pending queue, `visitors` = admitted/history), a reusable Currently-Inside component, and the interactive Visitors page. Reuses `Modal`, CSS classes, and existing selectors. No Firestore/auth.

**Tech Stack:** React 19 + TypeScript, react-router-dom v7, zustand, Tailwind, Vitest, lucide-react.

**Verification:** `npx tsc -p tsconfig.app.json --noEmit`; `npx vitest run <path>`.

---

## File Structure

- `src/demo/data/types.ts` — add `type` to `DemoApproval`.
- `src/demo/data/seed.ts` — fix the contradictory pending approval `ap-1`.
- `src/demo/store/demoStore.ts` (+ `.test.ts`) — lifecycle actions + selectors.
- `src/demo/components/DemoCurrentlyInside.tsx` — reusable inside-list + check-out.
- `src/demo/pages/manager/DemoVisitorsPage.tsx` — the interactive page.
- `src/demo/DemoApp.tsx` — wire the `visitors` route.

---

## Task 1: Types + seed reconciliation

**Files:**
- Modify: `src/demo/data/types.ts`
- Modify: `src/demo/data/seed.ts`

- [ ] **Step 1: Add `type` to `DemoApproval`**

In `src/demo/data/types.ts`, change the `DemoApproval` interface to:

```typescript
export interface DemoApproval { id: string; visitorId: string; visitorName: string; unitNumber: string; purpose: string; type: DemoVisitType }
```

(`DemoVisitType` is already declared in this file.)

- [ ] **Step 2: Fix the seed's contradictory pending approval**

In `src/demo/data/seed.ts`, the `approvals` array currently is:

```typescript
    approvals: [
      { id: 'ap-1', visitorId: 'v-pending-1', visitorName: 'James Mwangi', unitNumber: 'A-204', purpose: 'Personal visit' },
    ],
```

Replace it with (James is already INSIDE at A-204, so the pending guest becomes a different resident's visitor, and gains a `type`):

```typescript
    approvals: [
      { id: 'ap-1', visitorId: 'v-pending-1', visitorName: 'Cynthia Wairimu', unitNumber: 'D-102', purpose: 'Personal visit', type: 'FRIENDLY_VISIT' },
    ],
```

- [ ] **Step 3: Type-check + seed tests still pass**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit && npx vitest run src/demo/data/seed.test.ts`
Expected: tsc clean; seed tests still pass (they assert counts + inside visitors, which are unchanged; `approvals` still length 1).

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/Lango
git add src/demo/data/types.ts src/demo/data/seed.ts
git commit -m "feat(demo): typed approvals; fix contradictory seed pending approval"
```

---

## Task 2: Store visitor-lifecycle actions + selectors (TDD)

**Files:**
- Modify: `src/demo/store/demoStore.ts`
- Test: `src/demo/store/demoStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/demo/store/demoStore.test.ts` (keep existing content):

```typescript
import { selectInsideVisitors, selectPendingApprovals } from './demoStore'

describe('demo store visitor lifecycle', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('registerVisitor adds an approval and a "Visitor registered" activity, no inside visitor', () => {
    const insideBefore = selectCurrentlyInside(useDemoStore.getState())
    const apBefore = selectPendingApprovals(useDemoStore.getState()).length
    useDemoStore.getState().registerVisitor({ name: 'Brian Ochieng', unitNumber: 'A-204', type: 'FRIENDLY_VISIT' })
    const s = useDemoStore.getState()
    expect(selectPendingApprovals(s)).toHaveLength(apBefore + 1)
    expect(selectCurrentlyInside(s)).toBe(insideBefore)
    expect(s.activity[0].title).toBe('Visitor registered')
  })

  it('approveVisitor moves the visitor inside and removes the approval', () => {
    useDemoStore.getState().registerVisitor({ name: 'Brian Ochieng', unitNumber: 'A-204', type: 'FRIENDLY_VISIT' })
    const ap = selectPendingApprovals(useDemoStore.getState()).find(a => a.visitorName === 'Brian Ochieng')!
    const insideBefore = selectCurrentlyInside(useDemoStore.getState())
    useDemoStore.getState().approveVisitor(ap.id)
    const s = useDemoStore.getState()
    expect(selectPendingApprovals(s).some(a => a.id === ap.id)).toBe(false)
    expect(selectCurrentlyInside(s)).toBe(insideBefore + 1)
    expect(selectInsideVisitors(s).some(v => v.name === 'Brian Ochieng')).toBe(true)
    expect(s.activity[0].title).toBe('Brian Ochieng checked in')
  })

  it('declineVisitor removes the approval without adding an inside visitor', () => {
    const ap = selectPendingApprovals(useDemoStore.getState())[0]
    const insideBefore = selectCurrentlyInside(useDemoStore.getState())
    useDemoStore.getState().declineVisitor(ap.id)
    const s = useDemoStore.getState()
    expect(selectPendingApprovals(s).some(a => a.id === ap.id)).toBe(false)
    expect(selectCurrentlyInside(s)).toBe(insideBefore)
  })

  it('checkOutVisitor lowers the inside count and marks CHECKED_OUT', () => {
    const inside = selectInsideVisitors(useDemoStore.getState())[0]
    const insideBefore = selectCurrentlyInside(useDemoStore.getState())
    useDemoStore.getState().checkOutVisitor(inside.id)
    const s = useDemoStore.getState()
    expect(selectCurrentlyInside(s)).toBe(insideBefore - 1)
    expect(s.visitors.find(v => v.id === inside.id)!.status).toBe('CHECKED_OUT')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Documents/Lango && npx vitest run src/demo/store/demoStore.test.ts`
Expected: FAIL — `selectInsideVisitors`/`selectPendingApprovals`/lifecycle actions undefined.

- [ ] **Step 3: Implement the store changes**

In `src/demo/store/demoStore.ts`:

(a) Change the type import on line 4 to add `DemoVisitType`:

```typescript
import type { DemoRole, DemoState, DemoActivity, DemoVisitType } from '../data/types'
```

(b) Add a purpose-label map directly after the `EXPECTED_TODAY` constant:

```typescript
const VISIT_PURPOSE: Record<DemoVisitType, string> = {
  FRIENDLY_VISIT: 'Personal visit', WORK: 'Work', DELIVERY: 'Delivery', SERVICE_PROVIDER: 'Service provider',
}
```

(c) Add two selectors next to the existing ones:

```typescript
export const selectPendingApprovals = (s: DemoState) => s.approvals
export const selectInsideVisitors = (s: DemoState) => s.visitors.filter(v => v.status === 'INSIDE')
```

(d) Extend the `DemoActions` interface (add four members):

```typescript
  registerVisitor: (input: { name: string; unitNumber: string; type: DemoVisitType }) => void
  approveVisitor: (approvalId: string) => void
  declineVisitor: (approvalId: string) => void
  checkOutVisitor: (visitorId: string) => void
```

(e) Add the four action implementations inside the store creator, directly after the `updateTenant: ...` action (before `resetDemo`):

```typescript
      registerVisitor: ({ name, unitNumber, type }) => set((s) => {
        const uid = crypto.randomUUID()
        return {
          approvals: [...s.approvals, { id: `ap-${uid}`, visitorId: `v-${uid}`, visitorName: name, unitNumber, purpose: VISIT_PURPOSE[type], type }],
          activity: [{ id: `act-${uid}`, kind: 'APPROVAL' as const, title: 'Visitor registered', subtitle: `${unitNumber} · ${name}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      approveVisitor: (approvalId) => set((s) => {
        const a = s.approvals.find(x => x.id === approvalId)
        if (!a) return {}
        return {
          approvals: s.approvals.filter(x => x.id !== approvalId),
          visitors: [{ id: a.visitorId, name: a.visitorName, unitNumber: a.unitNumber, type: a.type, status: 'INSIDE' as const, checkInLabel: 'Just now' }, ...s.visitors],
          activity: [{ id: `act-${a.visitorId}`, kind: 'CHECK_IN' as const, title: `${a.visitorName} checked in`, subtitle: `${a.unitNumber} · ${a.purpose}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      declineVisitor: (approvalId) => set((s) => {
        const a = s.approvals.find(x => x.id === approvalId)
        if (!a) return {}
        return {
          approvals: s.approvals.filter(x => x.id !== approvalId),
          activity: [{ id: `act-dec-${a.id}`, kind: 'CHECK_OUT' as const, title: `${a.visitorName}'s entry declined`, subtitle: a.unitNumber, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      checkOutVisitor: (visitorId) => set((s) => {
        const v = s.visitors.find(x => x.id === visitorId)
        return {
          visitors: s.visitors.map(x => x.id === visitorId ? { ...x, status: 'CHECKED_OUT' as const } : x),
          activity: v ? [{ id: `act-out-${visitorId}`, kind: 'CHECK_OUT' as const, title: `${v.name} checked out`, subtitle: v.unitNumber, timeLabel: 'Just now' }, ...s.activity] : s.activity,
        }
      }),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/Documents/Lango && npx vitest run src/demo/store/demoStore.test.ts`
Expected: PASS — all store tests green.

- [ ] **Step 5: Type-check**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/Lango
git add src/demo/store/demoStore.ts src/demo/store/demoStore.test.ts
git commit -m "feat(demo): visitor lifecycle actions (register/approve/decline/checkout)"
```

---

## Task 3: Reusable Currently-Inside component

**Files:**
- Create: `src/demo/components/DemoCurrentlyInside.tsx`

- [ ] **Step 1: Create the component**

Create `src/demo/components/DemoCurrentlyInside.tsx`:

```tsx
import { DoorOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore, selectInsideVisitors } from '../store/demoStore'

export function DemoCurrentlyInside() {
  const inside = useDemoStore(selectInsideVisitors)
  const checkOut = useDemoStore(s => s.checkOutVisitor)
  const doCheckout = (id: string, name: string) => { checkOut(id); toast.success(`${name} checked out`) }

  return (
    <div className="card divide-y divide-gray-50">
      {inside.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-500">No one is currently inside.</div>}
      {inside.map(v => (
        <div key={v.id} className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><DoorOpen className="w-4 h-4" /></div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{v.name}</p>
              <p className="text-xs text-gray-500 truncate">{v.unitNumber} · {v.type.replace(/_/g, ' ').toLowerCase()}{v.checkInLabel ? ` · ${v.checkInLabel}` : ''}</p>
            </div>
          </div>
          <button className="btn-secondary text-xs" onClick={() => doCheckout(v.id, v.name)}>Check Out</button>
        </div>
      ))}
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
git add src/demo/components/DemoCurrentlyInside.tsx
git commit -m "feat(demo): reusable Currently-Inside list with check-out"
```

---

## Task 4: Interactive Visitors page

**Files:**
- Create: `src/demo/pages/manager/DemoVisitorsPage.tsx`

- [ ] **Step 1: Create the page**

Create `src/demo/pages/manager/DemoVisitorsPage.tsx`:

```tsx
import { useState } from 'react'
import { Users, UserPlus, Check, X, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore, selectPendingApprovals } from '../../store/demoStore'
import { DemoCurrentlyInside } from '../../components/DemoCurrentlyInside'
import { Modal } from '../../../components/ui/Modal'
import type { DemoVisitType } from '../../data/types'

const SAMPLE = { name: 'Brian Ochieng', unitNumber: 'A-204', type: 'FRIENDLY_VISIT' as DemoVisitType }
const TYPE_OPTIONS: { value: DemoVisitType; label: string }[] = [
  { value: 'FRIENDLY_VISIT', label: 'Personal visit' },
  { value: 'WORK', label: 'Work' },
  { value: 'SERVICE_PROVIDER', label: 'Service provider' },
  { value: 'DELIVERY', label: 'Delivery' },
]

function RegisterOwnForm({ onClose }: { onClose: () => void }) {
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

export default function DemoVisitorsPage() {
  const approvals = useDemoStore(selectPendingApprovals)
  const recent = useDemoStore(s => s.visitors.filter(v => v.status === 'CHECKED_OUT'))
  const registerVisitor = useDemoStore(s => s.registerVisitor)
  const approveVisitor = useDemoStore(s => s.approveVisitor)
  const declineVisitor = useDemoStore(s => s.declineVisitor)
  const [formOpen, setFormOpen] = useState(false)
  const [justApproved, setJustApproved] = useState<string | null>(null)

  const registerSample = () => { registerVisitor(SAMPLE); toast.success(`${SAMPLE.name} registered`) }
  const approve = (id: string, name: string) => { approveVisitor(id); setJustApproved(name); toast.success(`${name} approved`) }
  const decline = (id: string, name: string) => { declineVisitor(id); toast(`${name} declined`) }

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

      {justApproved && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
          <Check className="w-4 h-4" /> {justApproved} approved — they may enter.
        </div>
      )}

      <div>
        <h2 className="section-title">Pending approvals</h2>
        {approvals.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-gray-500">No pending approvals.</div>
        ) : (
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
        )}
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

      {formOpen && <RegisterOwnForm onClose={() => setFormOpen(false)} />}
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
git add src/demo/pages/manager/DemoVisitorsPage.tsx
git commit -m "feat(demo): interactive visitors page (register/approve/inside/checkout)"
```

---

## Task 5: Wire the route + full verification

**Files:**
- Modify: `src/demo/DemoApp.tsx`

- [ ] **Step 1: Add the import**

In `src/demo/DemoApp.tsx`, directly after the line `import DemoStaffPage from './pages/manager/DemoStaffPage'`, add:

```tsx
import DemoVisitorsPage from './pages/manager/DemoVisitorsPage'
```

- [ ] **Step 2: Add the route**

In the manager route block, directly after the line `<Route index element={<DemoManagerDashboard />} />`, add:

```tsx
          <Route path="visitors" element={<DemoVisitorsPage />} />
```

- [ ] **Step 3: Full type-check, tests, build**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit && npx vitest run src/demo && npm run build`
Expected: tsc clean; all demo tests pass; build succeeds.

- [ ] **Step 4: Confirm isolation**

Run: `cd ~/Documents/Lango && grep -rEn "firebase|AuthContext|/services/" src/demo || echo "CLEAN"`
Expected: `CLEAN`.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Lango
git add src/demo/DemoApp.tsx
git commit -m "feat(demo): wire interactive visitors route"
```

---

## Task 6: Manual verification

**Files:** none (manual QA).

- [ ] **Step 1: Run the app** — `cd ~/Documents/Lango && npm run dev`.
- [ ] **Step 2:** Demo → Property Manager → **Visitors**: seed shows 1 pending approval (Cynthia Wairimu) and 2 currently inside (James, Grace).
- [ ] **Step 3:** Click **Register the sample visitor** → toast; a "Brian Ochieng" card appears under Pending approvals.
- [ ] **Step 4:** Click **Approve** on Brian → green "Brian Ochieng approved — they may enter" banner; he moves to **Currently inside** (now 3); open **Dashboard** → Currently Inside = 3 and "Brian Ochieng checked in" is in Recent Activity.
- [ ] **Step 5:** **Check Out** someone → they leave the inside list; Dashboard count drops and a "checked out" activity appears.
- [ ] **Step 6:** **Register your own** → fill the form → new pending approval appears. **Decline** it → it disappears with no inside change.
- [ ] **Step 7:** Click **Reset** in the DEMO banner → back to 1 pending / 2 inside. Resize to mobile → no overflow, buttons reachable.
