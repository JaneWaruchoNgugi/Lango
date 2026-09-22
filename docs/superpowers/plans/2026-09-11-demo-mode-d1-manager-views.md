# Demo Mode D1 — Property Manager Read Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Property Manager routes with real demo pages — Tenants (with add/edit), Blocks & Units (with a rich unit-detail modal), and Staff — driven by the demo store, and reconcile the demo unit numbering to a floor-based scheme so per-unit activity matches.

**Architecture:** Extends the isolated `src/demo/` module. New pages read the zustand store via selectors and reuse the production design system (CSS classes, `StatusBadge`, `Modal`). Tenant add/edit mutates the shared store so changes appear on the dashboard activity. No Firestore/auth.

**Tech Stack:** React 19 + TypeScript, react-router-dom v7, zustand, Tailwind, Vitest, lucide-react.

**Verification:** Type-check `npx tsc -p tsconfig.app.json --noEmit`. Tests `npx vitest run <path>`.

---

## File Structure

- `src/demo/data/types.ts` — add `previousTenants` to `DemoUnit`.
- `src/demo/data/seed.ts` (+ `seed.test.ts`) — floor-based numbering + `previousTenants`.
- `src/demo/store/demoStore.ts` (+ `demoStore.test.ts`) — `addTenant`, `updateTenant`, `selectVacantUnits`.
- `src/demo/pages/manager/DemoTenantsPage.tsx` — tenants list + add/edit + detail.
- `src/demo/pages/manager/DemoUnitsPage.tsx` — blocks/units tabs + grid.
- `src/demo/pages/manager/DemoUnitDetailModal.tsx` — per-unit detail.
- `src/demo/pages/manager/DemoStaffPage.tsx` — staff list.
- `src/demo/DemoApp.tsx` — wire the three manager routes.

---

## Task 1: Floor-based unit numbering + `previousTenants` (TDD)

**Files:**
- Modify: `src/demo/data/types.ts`
- Modify: `src/demo/data/seed.ts`
- Test: `src/demo/data/seed.test.ts`

- [ ] **Step 1: Add `previousTenants` to the `DemoUnit` type**

In `src/demo/data/types.ts`, change the `DemoUnit` interface to:

```typescript
export interface DemoUnit { id: string; blockId: string; unitNumber: string; status: DemoUnitStatus; tenantName: string | null; previousTenants: string[] }
```

- [ ] **Step 2: Update the seed tests**

In `src/demo/data/seed.test.ts`, replace the test `it('assigns the brief units correctly', ...)` with these two tests (leave the other tests unchanged):

```typescript
  it('assigns the brief units correctly (floor-based numbering)', () => {
    const u = seed().units
    const byNumber = (n: string) => u.find(x => x.unitNumber === n)!
    expect(byNumber('A-101').tenantName).toBe('John Kamau')
    expect(byNumber('A-102').tenantName).toBe('Mary Wanjiku')
    expect(byNumber('A-103').tenantName).toBe('Jane Njeri')
    expect(byNumber('A-204').status).toBe('OCCUPIED')
    expect(byNumber('B-103').status).toBe('OCCUPIED')
  })

  it('uses floor-based unit numbers', () => {
    const nums = seed().units.map(u => u.unitNumber)
    expect(nums).toContain('A-101')
    expect(nums).toContain('A-604')
    expect(nums).not.toContain('A01')
  })
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd ~/Documents/Lango && npx vitest run src/demo/data/seed.test.ts`
Expected: FAIL — units are still `A01`-style; `A-101` etc. not found.

- [ ] **Step 4: Rewrite the seed generator**

In `src/demo/data/seed.ts`, replace the `isVacant` + `buildUnits` functions (everything from the `// A unit is vacant...` comment down to the end of `buildUnits`) with:

```typescript
// A unit is vacant when its 1-based index within the block is 4 or 5 (mod 6).
// 8 vacant / 16 occupied per block. Keeps A-101/102/103 and A-204 occupied.
function isVacant(idx: number): boolean { const m = idx % 6; return m === 4 || m === 5 }

// A few showcase units carry a light previous-tenant history; the rest are empty.
const PREVIOUS: Record<string, string[]> = {
  'A-204': ['Kevin Barasa (2022–2024)'],
  'B-103': ['Nancy Adhiambo (2021–2023)'],
}

function buildUnits(): { units: DemoUnit[]; tenants: DemoTenant[] } {
  const units: DemoUnit[] = []
  const tenants: DemoTenant[] = []
  let nameIdx = 0
  for (const b of BLOCKS) {
    let idx = 0
    for (let floor = 1; floor <= 6; floor++) {
      for (let n = 1; n <= 4; n++) {
        idx++
        const unitNumber = `${b.id}-${floor}${String(n).padStart(2, '0')}`
        const vacant = isVacant(idx)
        let tenantName: string | null = null
        if (!vacant) {
          tenantName =
            unitNumber === 'A-101' ? 'John Kamau' :
            unitNumber === 'A-102' ? 'Mary Wanjiku' :
            unitNumber === 'A-103' ? 'Jane Njeri' :
            NAMES[nameIdx % NAMES.length]
          nameIdx++
          tenants.push({ id: `t-${unitNumber}`, name: tenantName, unitNumber, phone: PHONES[tenants.length % PHONES.length] })
        }
        units.push({ id: unitNumber, blockId: b.id, unitNumber, status: vacant ? 'VACANT' : 'OCCUPIED', tenantName, previousTenants: PREVIOUS[unitNumber] ?? [] })
      }
    }
  }
  return { units, tenants }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ~/Documents/Lango && npx vitest run src/demo/data/seed.test.ts`
Expected: PASS — all seed tests green (still 4 blocks / 96 units / residentCount 142; tenants === occupied units).

- [ ] **Step 6: Type-check**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors (the required `previousTenants` field is set for every unit).

- [ ] **Step 7: Commit**

```bash
cd ~/Documents/Lango
git add src/demo/data/types.ts src/demo/data/seed.ts src/demo/data/seed.test.ts
git commit -m "feat(demo): floor-based unit numbers and previous-tenant history"
```

---

## Task 2: Store — tenant mutations + vacant-unit selector (TDD)

**Files:**
- Modify: `src/demo/store/demoStore.ts`
- Test: `src/demo/store/demoStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/demo/store/demoStore.test.ts` a new describe block (keep existing content):

```typescript
import { selectVacantUnits } from './demoStore'

describe('demo store tenant mutations', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('selectVacantUnits returns only VACANT units', () => {
    const vacant = selectVacantUnits(useDemoStore.getState())
    expect(vacant.length).toBeGreaterThan(0)
    expect(vacant.every(u => u.status === 'VACANT')).toBe(true)
  })

  it('addTenant occupies a vacant unit, adds a tenant, and logs activity', () => {
    const s0 = useDemoStore.getState()
    const unit = selectVacantUnits(s0)[0]
    const tenantsBefore = s0.tenants.length
    const activityBefore = s0.activity.length
    useDemoStore.getState().addTenant({ name: 'Test Tenant', phone: '+254700000000', unitNumber: unit.unitNumber })
    const s1 = useDemoStore.getState()
    expect(s1.tenants).toHaveLength(tenantsBefore + 1)
    expect(s1.units.find(u => u.unitNumber === unit.unitNumber)!.status).toBe('OCCUPIED')
    expect(s1.units.find(u => u.unitNumber === unit.unitNumber)!.tenantName).toBe('Test Tenant')
    expect(s1.activity).toHaveLength(activityBefore + 1)
    expect(s1.activity[0].title).toBe('Tenant added')
  })

  it('updateTenant edits the tenant and syncs the unit tenantName', () => {
    const t = useDemoStore.getState().tenants.find(x => x.unitNumber === 'A-101')!
    useDemoStore.getState().updateTenant(t.id, { name: 'Renamed Person', phone: '+254711111111' })
    const s1 = useDemoStore.getState()
    const updated = s1.tenants.find(x => x.id === t.id)!
    expect(updated.name).toBe('Renamed Person')
    expect(updated.phone).toBe('+254711111111')
    expect(s1.units.find(u => u.unitNumber === 'A-101')!.tenantName).toBe('Renamed Person')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Documents/Lango && npx vitest run src/demo/store/demoStore.test.ts`
Expected: FAIL — `selectVacantUnits`, `addTenant`, `updateTenant` not defined.

- [ ] **Step 3: Add the selector, action types, and implementations**

In `src/demo/store/demoStore.ts`:

(a) Add a selector next to the existing ones:

```typescript
export const selectVacantUnits = (s: DemoState) => s.units.filter(u => u.status === 'VACANT')
```

(b) Extend the `DemoActions` interface (add three members):

```typescript
interface DemoActions {
  setRole: (role: DemoRole) => void
  addActivity: (entry: DemoActivity) => void
  resetDemo: () => void
  addTenant: (input: { name: string; phone: string; unitNumber: string }) => void
  updateTenant: (id: string, patch: { name?: string; phone?: string }) => void
}
```

(c) Add the two action implementations inside the store creator, directly after the `addActivity` line:

```typescript
      addTenant: ({ name, phone, unitNumber }) => set((s) => ({
        tenants: [...s.tenants, { id: `t-${unitNumber}`, name, unitNumber, phone }],
        units: s.units.map(u => u.unitNumber === unitNumber ? { ...u, status: 'OCCUPIED' as const, tenantName: name } : u),
        activity: [{ id: `act-${unitNumber}`, kind: 'APPROVAL' as const, title: 'Tenant added', subtitle: `${unitNumber} · ${name}`, timeLabel: 'Just now' }, ...s.activity],
      })),
      updateTenant: (id, patch) => set((s) => {
        const t = s.tenants.find(x => x.id === id)
        return {
          tenants: s.tenants.map(x => x.id === id ? { ...x, ...patch } : x),
          units: (patch.name && t) ? s.units.map(u => u.unitNumber === t.unitNumber ? { ...u, tenantName: patch.name! } : u) : s.units,
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
git commit -m "feat(demo): addTenant/updateTenant actions and vacant-unit selector"
```

---

## Task 3: Tenants page (list + add/edit + detail)

**Files:**
- Create: `src/demo/pages/manager/DemoTenantsPage.tsx`

- [ ] **Step 1: Create the page**

Create `src/demo/pages/manager/DemoTenantsPage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Users, Plus, Search, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore, selectVacantUnits } from '../../store/demoStore'
import { TenantStatusBadge } from '../../../components/ui/StatusBadge'
import { Modal } from '../../../components/ui/Modal'
import type { DemoTenant } from '../../data/types'

function TenantForm({ editing, onClose }: { editing: DemoTenant | null; onClose: () => void }) {
  const addTenant = useDemoStore(s => s.addTenant)
  const updateTenant = useDemoStore(s => s.updateTenant)
  const vacant = useDemoStore(selectVacantUnits)
  const [name, setName] = useState(editing?.name ?? '')
  const [phone, setPhone] = useState(editing?.phone ?? '')
  const [unitNumber, setUnitNumber] = useState(vacant[0]?.unitNumber ?? '')

  const submit = () => {
    if (name.trim().length < 2) { toast.error('Enter a name'); return }
    if (editing) { updateTenant(editing.id, { name, phone }); toast.success('Tenant updated') }
    else {
      if (!unitNumber) { toast.error('Pick a vacant unit'); return }
      addTenant({ name, phone, unitNumber }); toast.success('Tenant added')
    }
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Edit tenant' : 'Add tenant'}
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>{editing ? 'Save' : 'Add tenant'}</button>
      </>}>
      <div className="space-y-3">
        <div><label className="label">Full name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Kamau" /></div>
        <div><label className="label">Phone</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+2547…" /></div>
        {!editing && (
          <div><label className="label">Vacant unit</label>
            <select className="input" value={unitNumber} onChange={e => setUnitNumber(e.target.value)}>
              {vacant.length === 0 && <option value="">No vacant units</option>}
              {vacant.map(u => <option key={u.id} value={u.unitNumber}>{u.unitNumber}</option>)}
            </select>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function DemoTenantsPage() {
  const tenants = useDemoStore(s => s.tenants)
  const [term, setTerm] = useState('')
  const [form, setForm] = useState<{ open: boolean; editing: DemoTenant | null }>({ open: false, editing: null })
  const [detail, setDetail] = useState<DemoTenant | null>(null)

  const shown = useMemo(() => {
    const q = term.trim().toLowerCase()
    return tenants.filter(t => !q || t.name.toLowerCase().includes(q) || t.unitNumber.toLowerCase().includes(q) || t.phone.includes(q))
  }, [tenants, term])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-lango-primary" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Tenants</h1><p className="text-sm text-gray-500">{tenants.length} tenants at Greenview Apartments.</p></div>
        </div>
        <button className="btn-primary" onClick={() => setForm({ open: true, editing: null })}><Plus className="w-4 h-4" /> Add Tenant</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search by name, unit or phone…" value={term} onChange={e => setTerm(e.target.value)} />
      </div>

      <div className="card divide-y divide-gray-50">
        {shown.map(t => (
          <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-4">
            <button className="min-w-0 text-left" onClick={() => setDetail(t)}>
              <div className="flex items-center gap-2"><span className="font-medium text-gray-900 truncate hover:text-lango-primary">{t.name}</span><TenantStatusBadge status="ACTIVE" /></div>
              <p className="text-xs text-gray-500 truncate">{t.unitNumber} · {t.phone}</p>
            </button>
            <button className="btn-secondary text-xs" onClick={() => setForm({ open: true, editing: t })}><Pencil className="w-3.5 h-3.5" /> Edit</button>
          </div>
        ))}
        {shown.length === 0 && <div className="px-4 py-10 text-center text-sm text-gray-500">No tenants match your search.</div>}
      </div>

      {form.open && <TenantForm key={form.editing?.id ?? 'new'} editing={form.editing} onClose={() => setForm({ open: false, editing: null })} />}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''}>
        {detail && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Unit</span><span className="font-medium">{detail.unitNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{detail.phone}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-500">Status</span><TenantStatusBadge status="ACTIVE" /></div>
          </div>
        )}
      </Modal>
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
git add src/demo/pages/manager/DemoTenantsPage.tsx
git commit -m "feat(demo): tenants page with add/edit and detail"
```

---

## Task 4: Blocks & Units page + unit detail modal

**Files:**
- Create: `src/demo/pages/manager/DemoUnitDetailModal.tsx`
- Create: `src/demo/pages/manager/DemoUnitsPage.tsx`

- [ ] **Step 1: Create the unit detail modal**

Create `src/demo/pages/manager/DemoUnitDetailModal.tsx`:

```tsx
import { Modal } from '../../../components/ui/Modal'
import { UnitStatusBadge } from '../../../components/ui/StatusBadge'
import { useDemoStore } from '../../store/demoStore'
import type { DemoUnit } from '../../data/types'

export function DemoUnitDetailModal({ unit, onClose }: { unit: DemoUnit | null; onClose: () => void }) {
  const visitors = useDemoStore(s => s.visitors)
  const deliveries = useDemoStore(s => s.deliveries)
  if (!unit) return null
  const unitVisitors = visitors.filter(v => v.unitNumber === unit.unitNumber)
  const unitDeliveries = deliveries.filter(d => d.unitNumber === unit.unitNumber)

  return (
    <Modal isOpen onClose={onClose} title={`Unit ${unit.unitNumber}`}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between"><span className="text-gray-500">Status</span><UnitStatusBadge status={unit.status} /></div>
        <div className="flex items-center justify-between"><span className="text-gray-500">Current tenant</span><span className="font-medium">{unit.tenantName ?? '—'}</span></div>

        <div>
          <p className="text-gray-500 mb-1">Previous tenants</p>
          {unit.previousTenants.length ? unit.previousTenants.map(p => <p key={p} className="font-medium text-gray-800">{p}</p>) : <p className="text-gray-400">None on record</p>}
        </div>

        <div>
          <p className="text-gray-500 mb-1">Recent visitors</p>
          {unitVisitors.length ? unitVisitors.map(v => <p key={v.id} className="text-gray-800">{v.name} · {v.status === 'INSIDE' ? 'Inside' : 'Checked out'}{v.checkInLabel ? ` · ${v.checkInLabel}` : ''}</p>) : <p className="text-gray-400">No recent visitors</p>}
        </div>

        <div>
          <p className="text-gray-500 mb-1">Recent deliveries</p>
          {unitDeliveries.length ? unitDeliveries.map(d => <p key={d.id} className="text-gray-800">{d.company} · {d.status === 'COLLECTED' ? 'Collected' : 'Received'}</p>) : <p className="text-gray-400">No recent deliveries</p>}
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Create the units page**

Create `src/demo/pages/manager/DemoUnitsPage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Building2, Search } from 'lucide-react'
import { useDemoStore } from '../../store/demoStore'
import { UnitStatusBadge } from '../../../components/ui/StatusBadge'
import { DemoUnitDetailModal } from './DemoUnitDetailModal'
import type { DemoUnit } from '../../data/types'

export default function DemoUnitsPage() {
  const units = useDemoStore(s => s.units)
  const blocks = useDemoStore(s => s.blocks)
  const [tab, setTab] = useState<'blocks' | 'units'>('blocks')
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<DemoUnit | null>(null)

  const summaries = useMemo(() => blocks.map(b => {
    const us = units.filter(u => u.blockId === b.id)
    return { block: b, total: us.length, occ: us.filter(u => u.status === 'OCCUPIED').length }
  }), [blocks, units])

  const shownUnits = useMemo(() => {
    const q = term.trim().toLowerCase()
    return units.filter(u => !q || u.unitNumber.toLowerCase().includes(q) || (u.tenantName?.toLowerCase().includes(q) ?? false))
  }, [units, term])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Blocks &amp; Units</h1><p className="text-sm text-gray-500">{blocks.length} blocks · {units.length} units.</p></div>
      </div>

      <div className="flex gap-2">
        {(['blocks', 'units'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-lango-primary text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}>{t}</button>
        ))}
      </div>

      {tab === 'blocks' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {summaries.map(s => (
            <div key={s.block.id} className="card p-4">
              <p className="font-semibold text-gray-900">{s.block.name}</p>
              <p className="text-sm text-gray-500 mt-1">{s.occ}/{s.total} occupied</p>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-lango-primary" style={{ width: `${(s.occ / s.total) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search unit or tenant…" value={term} onChange={e => setTerm(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {shownUnits.map(u => (
              <button key={u.id} onClick={() => setSelected(u)} className="card p-4 text-left hover:shadow-card-hover transition-shadow">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold text-gray-900">{u.unitNumber}</span><UnitStatusBadge status={u.status} /></div>
                <p className="text-xs text-gray-500 truncate mt-1">{u.tenantName ?? 'Vacant'}</p>
              </button>
            ))}
          </div>
        </>
      )}

      <DemoUnitDetailModal unit={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/Lango
git add src/demo/pages/manager/DemoUnitDetailModal.tsx src/demo/pages/manager/DemoUnitsPage.tsx
git commit -m "feat(demo): blocks & units page with rich unit-detail modal"
```

---

## Task 5: Staff page

**Files:**
- Create: `src/demo/pages/manager/DemoStaffPage.tsx`

- [ ] **Step 1: Create the page**

Create `src/demo/pages/manager/DemoStaffPage.tsx`:

```tsx
import { Users } from 'lucide-react'
import { useDemoStore } from '../../store/demoStore'
import { StaffStatusBadge } from '../../../components/ui/StatusBadge'

export default function DemoStaffPage() {
  const staff = useDemoStore(s => s.staff)
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Staff</h1><p className="text-sm text-gray-500">{staff.length} team members.</p></div>
      </div>
      <div className="card divide-y divide-gray-50">
        {staff.map(s => (
          <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-lango-primary/10 flex items-center justify-center text-xs font-semibold text-lango-primary shrink-0">{s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
              <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{s.name}</p><p className="text-xs text-gray-500">{s.role}</p></div>
            </div>
            <StaffStatusBadge status={s.status} />
          </div>
        ))}
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
git add src/demo/pages/manager/DemoStaffPage.tsx
git commit -m "feat(demo): staff page"
```

---

## Task 6: Wire the manager routes + full verification

**Files:**
- Modify: `src/demo/DemoApp.tsx`

- [ ] **Step 1: Add the imports**

In `src/demo/DemoApp.tsx`, directly after the existing line `import DemoManagerDashboard from './pages/manager/DemoManagerDashboard'`, add:

```tsx
import DemoTenantsPage from './pages/manager/DemoTenantsPage'
import DemoUnitsPage from './pages/manager/DemoUnitsPage'
import DemoStaffPage from './pages/manager/DemoStaffPage'
```

- [ ] **Step 2: Add the three nested routes**

Replace the manager route block:

```tsx
        <Route path="manager" element={<DemoShell role="MANAGER" />}>
          <Route index element={<DemoManagerDashboard />} />
          <Route path="*" element={<DemoPlaceholder />} />
        </Route>
```

with:

```tsx
        <Route path="manager" element={<DemoShell role="MANAGER" />}>
          <Route index element={<DemoManagerDashboard />} />
          <Route path="tenants" element={<DemoTenantsPage />} />
          <Route path="units" element={<DemoUnitsPage />} />
          <Route path="staff" element={<DemoStaffPage />} />
          <Route path="*" element={<DemoPlaceholder />} />
        </Route>
```

- [ ] **Step 3: Full type-check, tests, build**

Run: `cd ~/Documents/Lango && npx tsc -p tsconfig.app.json --noEmit && npx vitest run src/demo && npm run build`
Expected: tsc clean; all demo tests pass; build succeeds.

- [ ] **Step 4: Confirm isolation is intact**

Run: `cd ~/Documents/Lango && grep -rEn "firebase|AuthContext|/services/" src/demo || echo "CLEAN"`
Expected: `CLEAN`.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Lango
git add src/demo/DemoApp.tsx
git commit -m "feat(demo): wire manager tenants/units/staff routes"
```

---

## Task 7: Manual verification

**Files:** none (manual QA).

- [ ] **Step 1: Run the app** — `cd ~/Documents/Lango && npm run dev`.
- [ ] **Step 2:** Demo → Property Manager → **Tenants**: list populated; search works; **Add Tenant** to a vacant unit → it appears in the list; open **Dashboard** → "Tenant added" is in Recent Activity and Currently Inside unchanged; **Edit** a tenant → name updates.
- [ ] **Step 3:** **Blocks & Units**: Blocks tab shows 4 block cards with occupancy bars; Units tab grid shows floor-based numbers (A-101…); click **A-204** → detail modal shows current tenant, a previous tenant, James Mwangi under recent visitors, and Uber Eats under recent deliveries.
- [ ] **Step 4:** **Staff**: shows the five seeded members with correct active/inactive badges.
- [ ] **Step 5:** Resize to mobile → bottom nav works, no horizontal overflow on any of the three pages.
