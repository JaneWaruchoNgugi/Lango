# Demo Mode — D2: Interactive Visitor Journey Design

**Date:** 2026-09-11
**Status:** Approved
**Part of:** Interactive Demo Mode initiative (D0–D5). This is **D2** — the centerpiece.
**Branch:** `feat/demo-mode` (continues D0/D1).

## Goal

Turn `/demo/manager/visitors` from a placeholder into a fully interactive visitor-management page and wire the complete lifecycle into the demo store, so a prospect can watch the whole chain — register → approve → check in → Currently Inside → check out — with the dashboard's live counts and Recent Activity updating in real time.

## Context

The isolated demo (`src/demo/`) has a zustand store, seeded data, and (from D1) manager read views. The store already has a `visitors` array (statuses `PENDING | INSIDE | CHECKED_OUT`), an `approvals` array, and `activity`. `selectCurrentlyInside` already derives the dashboard's Inside count from `visitors` with status `INSIDE`. This slice adds the visitor lifecycle actions and the interactive page.

## 1. Seed reconciliation (minimal)

The D0 seed lists **James Mwangi both INSIDE (`v-1`, A-204) and pending approval (`ap-1`)** — a contradiction. Minimal fix, preserving every other D0/D1 showcase (the "2 currently inside" stat, and the A-204 unit-detail showing James):

- **Leave the `visitors` array unchanged** (James A-204 INSIDE, Grace B-103 INSIDE).
- **Change the seed's pending approval `ap-1`** to a fresh resident guest not already inside: `Cynthia Wairimu, D-102, Personal` — keeps "Pending Approval: 1" and removes the contradiction.
- The guided journey registers a **fresh** arrival (`Brian Ochieng, A-204, Personal`) so no one is double-listed.
- `DemoApproval` gains a `type: DemoVisitType` field (needed to create the INSIDE visitor on approval).

## 2. Store actions (`src/demo/store/demoStore.ts`)

Lifecycle model: **`approvals`** is the pending queue; **`visitors`** holds admitted/history (INSIDE / CHECKED_OUT).

- `registerVisitor({ name, unitNumber, type })` → pushes to `approvals` (`{ id, visitorId, visitorName: name, unitNumber, purpose: <type label>, type }`) and prepends a `'APPROVAL'`-kind activity "Visitor registered". Returns nothing.
- `approveVisitor(approvalId)` → finds the approval; pushes an INSIDE visitor (`{ id: approval.visitorId, name, unitNumber, type, status: 'INSIDE', checkInLabel: 'Just now' }`); removes the approval; prepends a `'CHECK_IN'` activity "{name} checked in". The Inside count rises via the existing selector.
- `declineVisitor(approvalId)` → removes the approval; prepends a `'CHECK_OUT'` activity "{name}'s entry declined". No INSIDE visitor is created.
- `checkOutVisitor(visitorId)` → sets that visitor's status to `CHECKED_OUT`; prepends a `'CHECK_OUT'` activity "{name} checked out". The Inside count drops.

Ids for new records use `crypto.randomUUID()` (consistent with the D1 hardening). A `selectPendingApprovals(s) => s.approvals` and `selectInsideVisitors(s) => s.visitors.filter(v => v.status === 'INSIDE')` selector pair is exported for the page.

## 3. The Visitors page (`src/demo/pages/manager/DemoVisitorsPage.tsx`)

Replaces the placeholder on `/demo/manager/visitors`. Sections top-to-bottom:

1. **Guided "See how visitor management works" banner** — a short line plus a primary **`Register the sample visitor`** button (one-tap: registers `Brian Ochieng → A-204`, toasts "Visitor registered", shows a success tick). Beside it, a **`Register your own`** button opens a small `Modal` form (name, a unit `<select>`, a visit-type `<select>`) that calls `registerVisitor`.
2. **Pending approvals** — one card per approval (name · unit · purpose) with **`Approve`** / **`Decline`**. Approving shows an inline success ("{name} may enter") then the card leaves the queue and the visitor appears in Currently Inside. Empty state when none.
3. **Currently inside** — the reusable `DemoCurrentlyInside` component: a list of INSIDE visitors (name · unit · type · check-in) each with **`Check Out`**; checking out removes them and drops the count. Empty state when none.
4. **Recent visitors** — a compact read-only list of `CHECKED_OUT` visitors for context.

Every action toasts and mutates the shared store, so switching to **Dashboard** shows the updated Currently-Inside count and new Recent-Activity rows — the "watch the whole chain" effect.

## 4. Reusable component

`src/demo/components/DemoCurrentlyInside.tsx` — renders the INSIDE list + check-out action from the store. Built standalone so D4 can drop it into the dedicated Guard/Caretaker "Currently Inside" pages without change.

## 5. Routing

In `src/demo/DemoApp.tsx`, add `<Route path="visitors" element={<DemoVisitorsPage />} />` under the manager block (before the `*` placeholder). Guard/Caretaker/Resident stay on placeholders until D4.

## 6. Testing

Store tests (`demoStore.test.ts`):
- `registerVisitor` adds one approval and a "Visitor registered" activity; no new INSIDE visitor yet.
- `approveVisitor` removes the approval, adds an INSIDE visitor, raises `selectCurrentlyInside` by one, and logs a "checked in" activity.
- `declineVisitor` removes the approval and adds no INSIDE visitor (count unchanged).
- `checkOutVisitor` sets the visitor to `CHECKED_OUT` and lowers `selectCurrentlyInside` by one.

## Out of scope (later)

Guided step-by-step tour overlay (D5); dedicated Guard/Caretaker/Resident dashboards + shift start/end (D4); delivery and incident workflows (D3).
