# Security Team & Shift Management

**Date:** 2026-09-22
**Status:** Approved
**Branch:** feat/security-team-shift-management

---

## 1. Overview

Introduces a professional Security Team and Shift Management system for Lango. The core product distinction:

- A **Security Guard** is registered once and belongs to the property's Security Team.
- A **Shift** is created every time that guard reports for duty.

The system operates on a **shared kiosk model**: the gate tablet is logged in as the Property Manager. Guards identify themselves each shift using a lightweight phone-number verification step — no new Firebase Auth users required.

### Key Terminology

| Term | Meaning |
|---|---|
| Security Team | All guards registered to a property |
| Security Guard | An `AppUser` with `role: 'SECURITY_GUARD'` |
| Shift Type | DAY (06:00–18:00) or NIGHT (18:00–06:00+1) |
| Security Post | Named gate position (Main Gate, Back Gate, etc.) |
| Start Shift | Guard verifies identity and reports for duty |
| Active Shift | A running shift with `status: 'ACTIVE'` |
| End Shift | Guard closes their shift; optionally writes handover |
| Shift Handover | Notes passed from outgoing to incoming guard |
| Shift History | Completed shift records with activity summaries |

---

## 2. Architecture Integration

### Existing pieces reused (not replaced)

| Existing | How it is used |
|---|---|
| `AppUser` with `role: 'SECURITY_GUARD'` | Guards — extend with `employeeNumber?` |
| `Shift` type + `shifts` collection | Core shift record — extend with new fields |
| `startShift` / `endShift` (client services) | Replaced by Cloud Functions for server-side validation |
| `useShift(guardId)` | Unchanged — guard watches own active shift |
| `bumpShiftCounter` | Unchanged |
| `useStaff` + `onShift: Set<string>` | PM already sees who is on shift |
| `StaffPage` | Unchanged — Security Team is a new dedicated section |
| `CaretakerDashboard` shift banner | Reused inside Kiosk Dashboard |
| Visitors / Deliveries already store `shiftId` | No change |
| `createStaffUser` Cloud Function | Reused for adding guards (extended with `employeeNumber`) |
| Demo store + seed data | Extended with more guards, posts, shift history |

### Kiosk Guard Session Layer

The gate tablet holds a PM Firebase Auth session. On top of this, a `GuardSessionContext` tracks which guard has verified themselves for the current shift. This is **not a second auth system** — it is an identity overlay.

```
Firebase Auth Session (PM / Caretaker)
            ↓
  GuardSessionContext
  { guardId, guardName, shiftId, postId, postName, startTime, … }
            ↓
  Kiosk Dashboard (gate-ops UI only)
```

On page refresh: the context provider queries Firestore for `shifts WHERE propertyId = X AND status = 'ACTIVE'` to restore the session from the server record. No state is lost.

---

## 3. Data Model

### 3.1 Extend `Shift` (src/types/index.ts)

Add to the existing `Shift` interface. All new fields are optional on old records (Firestore is schemaless).

```typescript
// NEW additions
shiftType: 'DAY' | 'NIGHT'
shiftTypeName: string                  // "Day Shift" (denormalized)
postId?: string
postName?: string                      // "Main Gate" (denormalized)
scheduledStart?: Timestamp             // from schedule if assigned
scheduledEnd?: Timestamp
verificationMethod: 'PHONE' | 'NONE'
handoverNotes?: string
handoverCompleted: boolean             // default false
handoverCompletedAt?: Timestamp
```

### 3.2 Extend `AppUser` (src/types/index.ts)

```typescript
employeeNumber?: string                // guard badge / employee number
profilePhoto?: string                  // storage URL; optional, shown in kiosk guard list
```

### 3.3 New collection: `securityPosts`

```typescript
interface SecurityPost {
  id: string
  propertyId: string
  name: string                         // "Main Gate"
  description?: string
  maxGuards: number                    // default 1; 0 = unlimited
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 3.4 New collection: `shiftHandovers`

```typescript
interface ShiftHandover {
  id: string
  shiftId: string
  guardId: string
  guardName: string
  propertyId: string
  postId?: string
  postName?: string
  notes: string
  noIssues: boolean
  createdAt: Timestamp
}
```

### 3.5 New collection: `shiftSchedules`

```typescript
interface ShiftSchedule {
  id: string
  propertyId: string
  guardId: string
  guardName: string                    // denormalized
  shiftType: 'DAY' | 'NIGHT'
  shiftTypeName: string
  date: string                         // ISO "2026-09-22"
  scheduledStart: Timestamp
  scheduledEnd: Timestamp
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'LATE' | 'MISSED' | 'CANCELLED'
  shiftId?: string                     // populated when guard starts
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 3.6 Shift Type constants (src/domain/shiftTypes.ts)

Hardcoded for initial implementation. Property-level configuration deferred to a future phase.

```typescript
export const SHIFT_TYPES = {
  DAY: {
    key: 'DAY',
    name: 'Day Shift',
    startHour: 6, startMinute: 0,
    endHour: 18, endMinute: 0,
    crossesMidnight: false,
  },
  NIGHT: {
    key: 'NIGHT',
    name: 'Night Shift',
    startHour: 18, startMinute: 0,
    endHour: 6,  endMinute: 0,
    crossesMidnight: true,
  },
} as const

export type ShiftTypeKey = keyof typeof SHIFT_TYPES
```

### 3.7 GuardSessionContext (src/contexts/GuardSessionContext.tsx)

```typescript
interface GuardSession {
  guardId: string
  guardName: string
  employeeNumber?: string
  shiftId: string
  shiftType: ShiftTypeKey
  shiftTypeName: string
  postId?: string
  postName?: string
  startTime: Timestamp
  visitorsRegistered: number
  deliveriesRegistered: number
  incidentsReported: number
}

interface GuardSessionContextValue {
  session: GuardSession | null
  startSession: (session: GuardSession) => void
  clearSession: () => void
}
```

On mount: query Firestore for `shifts WHERE propertyId = X AND status = 'ACTIVE'`. If exactly one result matches the guard expected by the kiosk session (stored in `sessionStorage`), restore the context. If none found, show the guard-selection screen. If multiple active shifts exist (multiple guards on duty), the kiosk shows the guard-selection screen so the next guard can identify themselves — existing active shifts are unaffected.

---

## 4. Cloud Functions

### 4.1 `startGuardShift`

Callable. Authorized roles: `PROPERTY_MANAGER`, `CARETAKER`, `SUPER_ADMIN`.

**Input:**
```typescript
{
  propertyId: string
  guardId: string
  phone: string          // guard's phone for verification
  shiftType: 'DAY' | 'NIGHT'
  postId?: string
}
```

**Validations (in order, reject with appropriate HttpsError):**
1. Caller is authenticated and `ownsProperty(propertyId)`
2. Guard user exists and `role === 'SECURITY_GUARD'`
3. Guard `status === 'ACTIVE'`
4. Guard `propertyId` matches caller's `propertyId`
5. No existing `Shift` with `guardId === X AND status === 'ACTIVE'`
6. Normalised phone matches guard's registered phone
7. If `postId` provided: post exists, is active, belongs to property
8. If `maxGuards === 1`: no other ACTIVE shift currently on that post

**On success:**
- Creates `Shift` doc with all fields including new `shiftType`, `postId`, `verificationMethod: 'PHONE'`
- If a `shiftSchedule` exists for this guard + date + shiftType: updates its `status → 'ACTIVE'`, sets `shiftId`
- Writes audit log `SHIFT_STARTED`
- Returns `{ shiftId, guardName, shiftTypeName, postName, startTime }`

### 4.2 `endGuardShift`

Callable. Authorized roles: `PROPERTY_MANAGER`, `CARETAKER`, `SUPER_ADMIN`.

**Input:**
```typescript
{
  shiftId: string
  handoverNotes?: string
  noIssues?: boolean
}
```

**Validations:**
1. Shift exists and `status === 'ACTIVE'`
2. Shift `propertyId` matches caller's property
3. Shift is not already ended (idempotency guard)

**On success:**
- Sets `status → 'ENDED'`, `endTime = now`, `handoverNotes`, `handoverCompleted = true` if notes provided
- Creates `shiftHandovers` doc if `handoverNotes` is non-empty
- If matching `shiftSchedule` exists: updates `status → 'COMPLETED'`
- Writes audit log `SHIFT_ENDED`
- Returns `{ endTime, durationMins, visitorsRegistered, deliveriesRegistered, incidentsReported }`

---

## 5. New Permissions (src/domain/permissions.ts)

```typescript
canManageSecurityTeam(role)     // PROPERTY_MANAGER | SUPER_ADMIN
canViewSecurityShifts(role)     // PROPERTY_MANAGER | CARETAKER | SUPER_ADMIN
canStartGuardShift(role)        // PROPERTY_MANAGER | CARETAKER | SUPER_ADMIN
canEndGuardShift(role)          // PROPERTY_MANAGER | CARETAKER | SUPER_ADMIN
canManageSecurityPosts(role)    // PROPERTY_MANAGER | SUPER_ADMIN
canManageSchedule(role)         // PROPERTY_MANAGER | SUPER_ADMIN
```

---

## 6. Firestore Rules — New Collections

```
match /securityPosts/{postId} {
  allow read:   if isAuth() && ownsProperty(resource.data.propertyId);
  allow create: if isAuth() && isPropertyManager() && ownsProperty(request.resource.data.propertyId);
  allow update: if isAuth() && isPropertyManager() && ownsProperty(resource.data.propertyId);
  allow delete: if isSuperAdmin();
}

match /shiftHandovers/{handoverId} {
  allow read:   if isAuth() && ownsProperty(resource.data.propertyId);
  allow create: if isAuth() && ownsProperty(request.resource.data.propertyId);
  allow update: if false;
  allow delete: if isSuperAdmin();
}

match /shiftSchedules/{scheduleId} {
  allow read:   if isAuth() && ownsProperty(resource.data.propertyId);
  allow create: if isAuth() && isPropertyManager() && ownsProperty(request.resource.data.propertyId);
  allow update: if isAuth() && (isPropertyManager() || isSuperAdmin()) && ownsProperty(resource.data.propertyId);
  allow delete: if isSuperAdmin();
}
```

The existing `shifts` rules are sufficient for the new fields (update already allows PM/Caretaker/SuperAdmin).

---

## 7. Routes

### Guard kiosk routes (new)

```
/gate/kiosk             KioskPage           — guard selection → verification → confirmation
/gate/kiosk/active      KioskDashboard      — gate ops wrapped in GuardSessionContext
```

`KioskPage` is accessible from the PM session. `GuardSessionContext` provider wraps `/gate/kiosk/*`.

### PM security routes (new, under PropertyLayout)

```
/property/security                SecurityPage         — overview + active shifts
/property/security/team           SecurityTeamPage     — guard list + add/edit guard
/property/security/schedule       ShiftSchedulePage    — assign guards to shifts by date
/property/security/shifts         ShiftHistoryPage     — full history + daily/weekly/monthly tabs
```

Add "Security" nav item to PM sidebar, pointing to `/property/security`.

---

## 8. UI — Kiosk Start Shift Flow

Four-screen mobile-first flow. All screens at `/gate/kiosk`.

### Screen 1 — Select Guard

Header: "Good [morning/afternoon/evening] · Start Your Shift"
Search input: filters by name, employee number, ID last 4.
List of eligible guards: `ACTIVE`, `status !== 'ON_SHIFT'`, not currently in an `ACTIVE` shift.

Guard card:
```
👤 John Kamau
   Security Guard  ·  EMP-001
   Last shift: Yesterday 06:01 PM
                           [ Select ]
```

Inactive guards and guards already on shift are hidden.

### Screen 2 — Verify Identity

```
John Kamau
ID ending ·4821

Enter your phone number to verify
[ __________________ ]
[ Verify & Continue ]
```

Compares normalized input against stored `phoneNumber`. Shows generic error on mismatch (does not reveal the stored number).

### Screen 3 — Confirm Shift

```
Shift:
[ Day Shift ▼ ]   06:00 AM – 06:00 PM

Security Post:
[ Main Gate ▼ ]

Today: Monday, 22 September 2026

[ Start Shift ]
```

Shift type is pre-selected based on current hour (`hour >= 6 && hour < 18` → DAY, otherwise → NIGHT). PM/Caretaker may change it. Calls `startGuardShift` Cloud Function on submit.

### Screen 4 — Success

```
✓  Shift Started

John Kamau
Day Shift  ·  Main Gate
Started 06:02 AM

[ Go to Gate Dashboard ]
```

Activates `GuardSessionContext`, navigates to `/gate/kiosk/active`.

---

## 9. UI — Kiosk Gate Dashboard

Renders the existing gate operations (register visitor, deliveries, currently inside, incidents). Changes:

- **Shift banner** (always visible at top): `🟢 John Kamau · Day Shift · Main Gate · Started 06:02 AM · 2h 14m`
  - Timer updates every second from `session.startTime`
- **`[End Shift]`** button in top-right
- All `guardId` / `registeredBy` fields use `session.guardId`, not Firebase Auth uid
- No navigation links to PM-only routes

---

## 10. UI — End Shift Flow

### Confirmation dialog

```
End Shift?

John Kamau  ·  Day Shift  ·  Main Gate
Started 06:02 AM  ·  Now 06:01 PM  ·  Duration 11h 59m

Today's activity
Visitors processed: 42  ·  Deliveries: 18  ·  Incidents: 2

[ Cancel ]                         [ End Shift ]
```

Calls `endGuardShift` Cloud Function.

### Handover screen (shown after end)

```
Shift Handover

Is there anything the next guard should know?
[ _________________________________________ ]

☐ No outstanding issues

[ Complete Handover ]
```

Handover notes are stored in `shiftHandovers`. If an incoming guard is active on the same post, the handover is surfaced in their dashboard.
After completing: `clearSession()` → returns to Screen 1.

---

## 11. UI — PM Security Views

### `/property/security` — Security Overview

Two sections:

**Shift Overview card (today)**
- Day Shift row: Scheduled N · Started N · Not Started N · Late N
- Night Shift row: Scheduled N · Upcoming N
- Status chips: green = Active, orange = Late/Not Started, grey = Off duty

**Active Shifts section**
- Real-time listener on `shifts WHERE propertyId = X AND status = 'ACTIVE'`
- Grouped by shift type (DAY / NIGHT)
- Each card: guard name, post, start time, live duration
- Refreshes via Firestore `onSnapshot`

Quick links to Team · Schedule · History.

### `/property/security/team` — Security Team

```
SECURITY TEAM
[ + Add Guard ]   [ Search guards... ]   [ Status ▼ ]   [ Shift ▼ ]

John Kamau
Security Guard · EMP-001 · ID ending ·4821 · ••••0123
● Active   🟢 On Shift · Main Gate
[ View ]

Peter Mwangi
Security Guard · EMP-002 · ID ending ·9172
● Active   Available
[ View ]
```

Add Guard form extends existing staff creation modal with `employeeNumber` field (optional).
Duplicate ID check at function level (Cloud Function `createStaffUser` already validates; add guard-level uniqueness check).

### `GuardDetailDrawer`

- Guard info: full name, ID masked, phone masked, employee number, date added, status
- Current Shift (if active): type, start time, expected end, post, live duration
- Recent Shifts (last 5): date, type, start, end, duration, post, status, visitor/delivery/incident counts
- Actions: `[Edit]` (employee number only, status toggle) · `[Deactivate]`

Deactivating a guard with an active shift: show warning "This guard has an active shift. End the shift first or it will remain active." Do not force-end the shift automatically.

### `/property/security/shifts` — Shift History

Tabs: **Daily** · **Weekly** · **Monthly**

Filters: guard dropdown, shift type, post, status, date-range picker.

Table columns: Guard · Shift · Date · Start · End · Duration · Post · Visitors · Deliveries · Incidents · Status

Pagination: 25 rows per page.

Summary bar (above table): Total · Completed · Active · Late · Missed · Avg Duration.

### `/property/security/schedule` — Shift Schedule

Date navigation (← Today →).

Per day:
```
DAY SHIFT   06:00 AM – 06:00 PM
  ✓ John Kamau     🟢 Active  (started 06:02 AM)
  ⊙ Brian Otieno   🟠 Late    (12 min)
  [ + Assign Guard ]

NIGHT SHIFT  06:00 PM – 06:00 AM
  ○ Peter Mwangi   Scheduled
  [ + Assign Guard ]
```

Late threshold: 15 minutes after scheduled start (constant, configurable in a future settings phase).
Late detection: computed on read from `(now - scheduledStart > 15min) && status === 'SCHEDULED'`.

### PM Dashboard — Security card (add to existing dashboard)

```
Security
On Shift 2  ·  Available 1  ·  Scheduled tonight 2
→ View Security
```

---

## 12. Demo Mode

### New demo guards (extend `src/demo/data/seed.ts`)

```
John Kamau      ACTIVE  EMP-001  On Shift (Day, Main Gate, started 2h ago)
Peter Mwangi    ACTIVE  EMP-002  Available
Brian Otieno    ACTIVE  EMP-003  Available
David Kariuki   INACTIVE EMP-004
```

### Demo security posts

Main Gate · Back Gate · Service Gate

### Demo shift history (seed 7 days)

2–3 completed shifts per day spread across guards, mix of COMPLETED / LATE statuses.

### Demo phone verification

In demo mode, phone verification accepts the last 4 digits of the guard's registered demo phone number (or any valid-format number for frictionless demo experience — controlled by `isDemoMode` flag).

### Demo reset

Resets: active shifts → only John Kamau on shift; shift history → seed state; guard statuses → seed values; handovers → cleared.

---

## 13. Visitor / Delivery / Incident Integration

No schema changes required — `shiftId` is already stored on Visitor and Delivery records.

Changes:
- **Kiosk Dashboard**: passes `session.guardId` and `session.shiftId` (not Firebase Auth uid) to all registration calls
- **Incident**: add `shiftId?: string` to `Incident` type; `ReportIncidentPage` reads from `GuardSessionContext` and attaches `shiftId` when present
- **Shift History table**: shows visitor / delivery / incident counts per shift (already tracked via `visitorsRegistered`, `deliveriesRegistered`, `incidentsReported` counters on the `Shift` doc)

---

## 14. Testing Plan

### Security Guard management
- Create guard (valid)
- Duplicate ID number on same property → rejected
- Duplicate phone normalized before check
- Deactivate guard
- Inactive guard → `startGuardShift` returns error

### Shift lifecycle
- Start shift → creates ACTIVE record
- Start shift when already on shift → rejected
- End shift → status ENDED, endTime set
- End already-ended shift → rejected (idempotency)
- Night shift: `endTime` is next calendar day → duration computed correctly
- Shift associated with correct `propertyId`
- Shift associated with correct `postId`

### Cloud Function authorization
- Unauthenticated caller → rejected
- Wrong-property caller → rejected
- Phone mismatch → rejected
- Post at capacity (maxGuards=1, another guard active) → rejected

### Handover
- Creates `shiftHandovers` doc with correct fields
- Retrieved by next guard on same post

### PM views
- Active shifts list reflects Firestore `onSnapshot` in real time
- Shift history filters (date, guard, type, status) return correct subsets
- Daily / weekly / monthly tabs aggregate correctly

### Demo mode
- All 4 demo guards seeded correctly
- Start shift in demo (phone verification passes)
- End shift in demo
- Reset returns to seed state

### Integration
- Visitor registered via kiosk stores `guardId = session.guardId` (not PM uid)
- Delivery registered via kiosk stores `guardId = session.guardId`
- Incident reported via kiosk stores `shiftId` from `GuardSessionContext`

---

## 15. Deferred (out of scope for this phase)

- Configurable shift types per property (beyond DAY/NIGHT)
- QR guard badge / NFC / biometric verification
- Guard PIN (separate from phone verification)
- Export shift history to CSV
- Payroll / HR integrations
- Push notifications for late arrivals
- Property-level late-threshold settings (hardcoded at 15 min for now)
- Guard profile photo upload
- Shift reporting charts / graphs (beyond summary counts)

---

## 16. Files to Create / Modify

### Create
- `src/domain/shiftTypes.ts`
- `src/contexts/GuardSessionContext.tsx`
- `src/services/securityPostService.ts`
- `src/services/shiftScheduleService.ts`
- `src/hooks/useSecurityPosts.ts`
- `src/hooks/useShiftSchedule.ts`
- `src/hooks/useActiveShifts.ts`
- `src/hooks/useShiftHistory.ts`
- `src/pages/gate/KioskPage.tsx`
- `src/pages/gate/KioskDashboard.tsx`
- `src/features/security/SecurityPage.tsx`
- `src/features/security/SecurityTeamPage.tsx`
- `src/features/security/GuardDetailDrawer.tsx`
- `src/features/security/ShiftSchedulePage.tsx`
- `src/features/security/ShiftHistoryPage.tsx`
- `src/features/security/ActiveShiftsSection.tsx`
- `src/features/security/ShiftOverviewCard.tsx`
- `src/components/security/GuardCard.tsx`
- `src/components/security/ShiftBanner.tsx`
- `src/components/security/ShiftTimer.tsx`
- `src/components/security/EndShiftDialog.tsx`
- `src/components/security/HandoverForm.tsx`
- `functions/src/startGuardShift.ts`
- `functions/src/endGuardShift.ts`

### Modify
- `src/types/index.ts` — extend `Shift`, `AppUser`; add `SecurityPost`, `ShiftHandover`, `ShiftSchedule`
- `src/domain/permissions.ts` — add 6 new permission functions
- `src/firebase/collections.ts` — add `securityPostsCol`, `shiftHandoversCol`, `shiftSchedulesCol`
- `firestore.rules` — add rules for 3 new collections
- `functions/src/index.ts` — export `startGuardShift`, `endGuardShift`
- `src/App.tsx` — add `/gate/kiosk`, `/gate/kiosk/active`, `/property/security/*` routes
- `src/components/layouts/PropertyLayout.tsx` — add Security nav item
- `src/features/property/StaffPage.tsx` — minor: surface `employeeNumber` in guard cards
- `src/demo/data/seed.ts` — extend with 4 guards, posts, shift history
- `src/demo/store/demoStore.ts` — extend with shift/post/schedule demo actions
- `src/pages/caretaker/CaretakerDashboard.tsx` — add Security Overview card for PM role
