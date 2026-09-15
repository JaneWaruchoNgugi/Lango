# Demo Mode D5 — Guided Tour + Completion CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add an optional, skippable 5-step guided tour of the manager flow with a celebratory completion CTA.

**Architecture:** A pure `tourReducer` (TDD'd) holds the transitions; a `DemoTourProvider` React context wraps the demo routes and exposes `useDemoTour()`; a `DemoTourCard` floating overlay reads the context, auto-navigates per step, and renders guidance + completion. Two launch buttons (entry hero + manager dashboard).

**Tech Stack:** React + TS (useReducer/context), react-router-dom, lucide-react, Vitest (node env — pure logic only), Tailwind design-system classes.

**Reference spec:** `docs/superpowers/specs/2026-09-15-demo-mode-d5-guided-tour-design.md`

**Verify commands:**
```
npx tsc -p tsconfig.app.json --noEmit
npx vitest run src/demo
npm run build
grep -rEn "firebase|AuthContext|/services/" src/demo   # expect no hits
```

---

### Task 1: Pure tour state + reducer (TDD)

**Files:**
- Create: `src/demo/tour/tourState.ts`
- Test: `src/demo/tour/tourState.test.ts`

- [ ] **Step 1: Write the failing tests** — create `src/demo/tour/tourState.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { tourReducer, initialTourState, isTourComplete, TOUR_STEPS, TOUR_STEP_COUNT } from './tourState'

describe('tourReducer', () => {
  it('START activates and sets step 0', () => {
    expect(tourReducer(initialTourState, { type: 'START' })).toEqual({ active: true, step: 0 })
  })

  it('NEXT increments the step', () => {
    expect(tourReducer({ active: true, step: 0 }, { type: 'NEXT' }).step).toBe(1)
  })

  it('NEXT from the last step reaches completion (5) and stays active', () => {
    const s = tourReducer({ active: true, step: TOUR_STEP_COUNT - 1 }, { type: 'NEXT' })
    expect(s.step).toBe(TOUR_STEP_COUNT)
    expect(s.active).toBe(true)
    expect(isTourComplete(s)).toBe(true)
  })

  it('NEXT never exceeds TOUR_STEP_COUNT', () => {
    const s = tourReducer({ active: true, step: TOUR_STEP_COUNT }, { type: 'NEXT' })
    expect(s.step).toBe(TOUR_STEP_COUNT)
  })

  it('DISMISS deactivates and resets to step 0', () => {
    expect(tourReducer({ active: true, step: 3 }, { type: 'DISMISS' })).toEqual({ active: false, step: 0 })
  })
})

describe('TOUR_STEPS', () => {
  it('has 5 steps, all targeting the manager surface', () => {
    expect(TOUR_STEPS).toHaveLength(5)
    expect(TOUR_STEP_COUNT).toBe(5)
    expect(TOUR_STEPS.every(s => s.to.startsWith('/demo/manager'))).toBe(true)
  })

  it('isTourComplete is false before the last step', () => {
    expect(isTourComplete({ active: true, step: 4 })).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/demo/tour/tourState.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/demo/tour/tourState.ts`:**

```ts
export const TOUR_STEPS = [
  { title: 'Register a visitor',   body: "A visitor's at the gate. On Visitors, tap “Register the sample visitor.”", to: '/demo/manager/visitors' },
  { title: 'Approve the request',  body: 'Approve them under Pending approvals — they move to Currently Inside instantly.', to: '/demo/manager/visitors' },
  { title: "See who's inside",     body: 'They now appear under Currently Inside — live across every role.', to: '/demo/manager/visitors' },
  { title: 'Check in a delivery',  body: 'Open Deliveries and check in a parcel at the gate.', to: '/demo/manager/deliveries' },
  { title: 'Follow the timeline',  body: 'Everything you did lands on the dashboard activity feed — one connected system.', to: '/demo/manager' },
] as const

export const TOUR_STEP_COUNT = TOUR_STEPS.length

export interface TourState { active: boolean; step: number }
export const initialTourState: TourState = { active: false, step: 0 }

export type TourAction = { type: 'START' } | { type: 'NEXT' } | { type: 'DISMISS' }

export function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case 'START':   return { active: true, step: 0 }
    case 'NEXT':    return { ...state, step: Math.min(state.step + 1, TOUR_STEP_COUNT) }
    case 'DISMISS': return { active: false, step: 0 }
    default:        return state
  }
}

export const isTourComplete = (s: TourState): boolean => s.step >= TOUR_STEP_COUNT
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/demo/tour/tourState.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/demo/tour/tourState.ts src/demo/tour/tourState.test.ts
git commit -m "feat(demo): pure tour state reducer (5-step manager flow)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Tour context provider

**Files:**
- Create: `src/demo/tour/DemoTourContext.tsx`

- [ ] **Step 1: Create `src/demo/tour/DemoTourContext.tsx`:**

```tsx
import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import { useDemoStore } from '../store/demoStore'
import { tourReducer, initialTourState, isTourComplete } from './tourState'

interface DemoTourValue {
  active: boolean
  step: number
  isComplete: boolean
  start: () => void
  next: () => void
  dismiss: () => void
}

const DemoTourContext = createContext<DemoTourValue | null>(null)

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tourReducer, initialTourState)
  const setRole = useDemoStore(s => s.setRole)

  const start = useCallback(() => { setRole('MANAGER'); dispatch({ type: 'START' }) }, [setRole])
  const next = useCallback(() => dispatch({ type: 'NEXT' }), [])
  const dismiss = useCallback(() => dispatch({ type: 'DISMISS' }), [])

  return (
    <DemoTourContext.Provider value={{ active: state.active, step: state.step, isComplete: isTourComplete(state), start, next, dismiss }}>
      {children}
    </DemoTourContext.Provider>
  )
}

export function useDemoTour(): DemoTourValue {
  const ctx = useContext(DemoTourContext)
  if (!ctx) throw new Error('useDemoTour must be used within a DemoTourProvider')
  return ctx
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/demo/tour/DemoTourContext.tsx
git commit -m "feat(demo): tour context provider (start/next/dismiss)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Floating tour card

**Files:**
- Create: `src/demo/tour/DemoTourCard.tsx`

- [ ] **Step 1: Create `src/demo/tour/DemoTourCard.tsx`:**

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, PartyPopper } from 'lucide-react'
import { useDemoTour } from './DemoTourContext'
import { TOUR_STEPS, TOUR_STEP_COUNT } from './tourState'

export function DemoTourCard() {
  const { active, step, isComplete, next, dismiss } = useDemoTour()
  const navigate = useNavigate()

  // Drive the page to each step's target as the tour advances.
  useEffect(() => {
    if (active && step < TOUR_STEP_COUNT) navigate(TOUR_STEPS[step].to)
  }, [active, step, navigate])

  if (!active) return null

  const wrap = 'fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]'

  if (isComplete) {
    return (
      <div className={wrap}>
        <div className="card p-5 border-lango-primary/30">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase tracking-wide"><PartyPopper className="w-4 h-4" /> You've seen Lango in action</div>
          <p className="mt-2 text-sm text-gray-600">Visitors. Deliveries. Incidents. Access. Accountability. All connected in one system.</p>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary flex-1" onClick={() => { dismiss(); navigate('/') }}>Book a Free Demo</button>
            <button className="btn-secondary" onClick={dismiss}>Keep exploring</button>
          </div>
        </div>
      </div>
    )
  }

  const s = TOUR_STEPS[step]
  const last = step === TOUR_STEP_COUNT - 1
  return (
    <div className={wrap}>
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lango-primary text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> Step {step + 1} of {TOUR_STEP_COUNT}</div>
          <div className="flex gap-1">
            {Array.from({ length: TOUR_STEP_COUNT }).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= step ? 'bg-lango-primary' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
        <p className="mt-2 font-semibold text-gray-900">{s.title}</p>
        <p className="mt-1 text-sm text-gray-600">{s.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button className="text-xs text-gray-400 hover:text-gray-600" onClick={dismiss}>Skip tour</button>
          <button className="btn-primary text-sm" onClick={next}>{last ? 'Finish' : 'Next'} <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/demo/tour/DemoTourCard.tsx
git commit -m "feat(demo): floating guided-tour card + completion CTA

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Wire provider + card; add launch buttons

**Files:**
- Modify: `src/demo/DemoApp.tsx`
- Modify: `src/demo/pages/DemoEntry.tsx`
- Modify: `src/demo/pages/manager/DemoManagerDashboard.tsx`

- [ ] **Step 1: Wrap routes + render the card** in `src/demo/DemoApp.tsx`. Add imports:

```tsx
import { DemoTourProvider } from './tour/DemoTourContext'
import { DemoTourCard } from './tour/DemoTourCard'
```

Then wrap the existing `<Routes>…</Routes>` so the return body becomes:

```tsx
  return (
    <div className="h-screen overflow-y-auto">
      <DemoTourProvider>
        <Routes>
          {/* …all existing routes unchanged… */}
        </Routes>
        <DemoTourCard />
      </DemoTourProvider>
    </div>
  )
```

(Keep every existing `<Route>` exactly as-is; only add the provider wrapper, the imports, and `<DemoTourCard />` after `</Routes>`.)

- [ ] **Step 2: Add the entry launch button** in `src/demo/pages/DemoEntry.tsx`. Add imports:

```tsx
import { PlayCircle } from 'lucide-react'
import { useDemoTour } from '../tour/DemoTourContext'
```

Inside `DemoEntry`, get the tour: `const { start } = useDemoTour()`. Then add a button in the dark hero, immediately after the hero `<p>…step inside.</p>`:

```tsx
        <button onClick={start} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-lango-primary text-white hover:bg-lango-primary/90">
          <PlayCircle className="w-4 h-4" /> Take the 60-second tour
        </button>
```

- [ ] **Step 3: Add the dashboard launch button** in `src/demo/pages/manager/DemoManagerDashboard.tsx`. Add imports:

```tsx
import { PlayCircle } from 'lucide-react'
import { useDemoTour } from '../../tour/DemoTourContext'
```

Get the tour inside the component: `const { start } = useDemoTour()`. Replace the greeting block:

```tsx
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good afternoon, Mercy Njeri 👋</h1>
        <p className="text-sm text-gray-500">{property.name} · {property.location}</p>
      </div>
```
with:
```tsx
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Good afternoon, Mercy Njeri 👋</h1>
          <p className="text-sm text-gray-500">{property.name} · {property.location}</p>
        </div>
        <button onClick={start} className="inline-flex items-center gap-1.5 text-sm font-medium text-lango-primary hover:underline shrink-0">
          <PlayCircle className="w-4 h-4" /> Take the guided tour
        </button>
      </div>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 5: Run all demo tests**

Run: `npx vitest run src/demo`
Expected: PASS.

- [ ] **Step 6: Verify isolation**

Run: `grep -rEn "firebase|AuthContext|/services/" src/demo`
Expected: no hits.

- [ ] **Step 7: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/demo/DemoApp.tsx src/demo/pages/DemoEntry.tsx src/demo/pages/manager/DemoManagerDashboard.tsx
git commit -m "feat(demo): wire guided tour (provider, overlay, launch buttons)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** pure reducer/state (T1), context provider with `start` forcing MANAGER (T2), floating card with per-step navigation + completion CTA (T3), wiring + two launch buttons (T4). ✓
- **Type consistency:** `useDemoTour()` returns `{ active, step, isComplete, start, next, dismiss }` — the exact shape consumed by `DemoTourCard`, `DemoEntry`, and `DemoManagerDashboard`. `TOUR_STEPS`/`TOUR_STEP_COUNT`/`isTourComplete` names match across reducer, tests, context, and card. Card's effect deps `[active, step, navigate]` cover the START (step 0) navigation and stop at completion (`step < TOUR_STEP_COUNT`).
- **Placeholder scan:** no TBD/TODO; every step has complete code.
- **Isolation:** tour files import only the demo store, react-router, lucide, and each other. Verified in T4 Step 6.
