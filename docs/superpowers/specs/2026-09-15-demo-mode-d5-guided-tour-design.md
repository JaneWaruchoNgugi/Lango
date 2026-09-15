# Demo Mode D5 — Guided Tour + Completion CTA (Design)

**Date:** 2026-09-15
**Branch:** feat/demo-mode
**Slice:** D5 (final) of the Lango Interactive Demo Mode roadmap.

## Goal

An optional, skippable 5-step guided tour that walks a prospect through the
highest-value flow, then a celebratory completion card with a "Book a Free Demo"
call to action. The tour must never block free navigation — it is dismissible at
every step.

## Decisions

- **Manager-only flow.** The tour drives the Property Manager experience (the
  richest surface). Starting the tour sets `role = 'MANAGER'`.
- **Manual advance.** The floating card auto-navigates to each step's page; the
  user reads the guidance, optionally performs the action, and clicks **Next**.
  No action-detection magic (keeps it robust and simple).
- **Ephemeral UI state via React context** (not the zustand data store), so tour
  state stays out of `partialize`/`resetDemo`. Transitions live in a pure
  `tourReducer` so they can be unit-tested in the `node` vitest env (no DOM libs
  are installed).
- **Two launch points:** the demo entry screen hero and a small "Take the tour"
  button on the manager dashboard.

## Constraints (unchanged)

- Everything under `src/demo/`; no `firebase` / `AuthContext` / `/services/`.
- Reuse the design system (`.card`, `.btn-primary`, `.btn-secondary`, `lango-dark`,
  `lango-primary`, lucide icons).

## Tour state (`src/demo/tour/tourState.ts`, new — pure, TDD'd)

```ts
export const TOUR_STEPS = [
  { title: 'Register a visitor',   body: "A visitor's at the gate. On Visitors, tap “Register the sample visitor.”", to: '/demo/manager/visitors' },
  { title: 'Approve the request',  body: 'Approve them under Pending approvals — they move to Currently Inside instantly.', to: '/demo/manager/visitors' },
  { title: "See who's inside",     body: 'They now appear under Currently Inside — live across every role.', to: '/demo/manager/visitors' },
  { title: 'Check in a delivery',  body: 'Open Deliveries and check in a parcel at the gate.', to: '/demo/manager/deliveries' },
  { title: 'Follow the timeline',  body: 'Everything you did lands on the dashboard activity feed — one connected system.', to: '/demo/manager' },
] as const

export const TOUR_STEP_COUNT = TOUR_STEPS.length          // 5

export interface TourState { active: boolean; step: number }  // step 0..5; 5 = completion
export const initialTourState: TourState = { active: false, step: 0 }

export type TourAction = { type: 'START' } | { type: 'NEXT' } | { type: 'DISMISS' }

export function tourReducer(state: TourState, action: TourAction): TourState
// START   -> { active: true, step: 0 }
// NEXT    -> step = min(step + 1, TOUR_STEP_COUNT)   (5 => completion; stays active)
// DISMISS -> { active: false, step: 0 }

export const isTourComplete = (s: TourState): boolean => s.step >= TOUR_STEP_COUNT
```

## Context (`src/demo/tour/DemoTourContext.tsx`, new)

- `DemoTourProvider` wraps the demo routes, holding `useReducer(tourReducer, …)`.
- Exposes `useDemoTour()` → `{ active, step, isComplete, start, next, dismiss }`.
- `start()` also sets the demo role to `MANAGER` (via the store's `setRole`) so the
  tour always runs the manager surface. Navigation to each step's page is handled
  by the card's effect (below), keeping the provider free of routing concerns —
  except `start()` which triggers the first navigation through the same effect
  (step 0 change).

## Floating card (`src/demo/tour/DemoTourCard.tsx`, new)

- Renders `null` when `!active`.
- A `useEffect` on `step`: when `active` and `step < TOUR_STEP_COUNT`, navigate to
  `TOUR_STEPS[step].to`. (This drives page changes as the user advances.)
- Fixed, bottom-center, above the mobile bottom-nav (`fixed bottom-20 sm:bottom-6
  left-1/2 -translate-x-1/2 z-50`, `max-w-md w-[calc(100%-2rem)]`), styled `.card`.
- **Steps 0–4:** header "STEP {step+1} OF 5" + a 5-dot progress row; step title
  (bold) + body; footer buttons: `Skip tour` (secondary, calls `dismiss`) and
  `Next →` / on the last step `Finish →` (primary, calls `next`).
- **Completion (step === 5):** amber "🎉" header "You've seen Lango in action";
  body "Visitors. Deliveries. Incidents. Access. Accountability. All connected in
  one system."; buttons: `Book a Free Demo` (primary → `navigate('/')`, then
  `dismiss`) and `Keep exploring` (secondary → `dismiss`).

## Wiring

- `src/demo/DemoApp.tsx`: wrap the `<Routes>` in `<DemoTourProvider>` and render
  `<DemoTourCard />` as a sibling after `<Routes>` (so it overlays every demo page
  while staying inside the Router and provider).
- `src/demo/pages/DemoEntry.tsx`: add a "▶ Take the 60-second tour" button in the
  dark hero that calls `useDemoTour().start()`.
- `src/demo/pages/manager/DemoManagerDashboard.tsx`: add a small, unobtrusive
  "Take the guided tour" text button near the greeting that calls `start()`.

## Testing (`src/demo/tour/tourState.test.ts`, new)

- `START` activates and sets step 0.
- `NEXT` increments; from step 4 it reaches 5 (completion) and stays active;
  further `NEXT` never exceeds `TOUR_STEP_COUNT`.
- `DISMISS` deactivates and resets to step 0.
- `isTourComplete` is true only at step 5; `TOUR_STEPS` has length 5 and every
  step has a `to` under `/demo/manager`.

(Context/card are build-verified; no DOM test libs are installed.)

## Verification commands

```
npx tsc -p tsconfig.app.json --noEmit
npx vitest run src/demo
npm run build
grep -rEn "firebase|AuthContext|/services/" src/demo   # expect no hits
```

## Out of scope

Action auto-detection, multi-role tours, and persisting tour progress across
reloads (tour resets on reload by design — it is a lightweight overlay).
