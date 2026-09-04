# Lango — Shared Domain Layer + Guard Experience Design

**Date:** 2026-09-04
**Status:** Approved pending spec review
**Sub-project:** 1 of 5 (see Decomposition). Delivers the shared domain layer plus the complete Security Guard experience — the most important real-world workflow (register a guest → Firestore → visible to all roles → checkout).

---

## 1. Context & Current State

Lango is a multi-tenant apartment **gate-management SaaS**, live on Firebase project `lango-d3ba0` (Firestore database is named `default`, not `(default)`). Phases 1–2 (running app, Super Admin, auth) are complete and deployed:

**Kept as-is and built upon:**
- `src/types/index.ts` — full data model + `SUBSCRIPTION_PLANS`.
- `src/contexts/AuthContext.tsx` — `role`/`propertyId` from **server-set custom claims** (never client-trusted).
- `firestore.rules` — per-property isolation via claims, immutable audit logs, guard restrictions.
- `src/firebase/config.ts` + `collections.ts` — offline persistence, typed collection/doc helpers.
- 4 role layouts, `ProtectedRoute`, UI primitives (`EmptyState`, `LoadingScreen`, `Modal`, `OnlineIndicator`, `StatusBadge`), mock `NotificationService`.
- Cloud Functions: `createStaffUser`, `setUserClaims`, `resolvePhoneToEmail`, `bootstrapSuperAdmin`.
- Seed script (Greenview Apartments + blocks/units/tenants/caretaker/guard).

**Gaps this sub-project closes:**
1. Guard `GateDashboard` links to `/gate/register-delivery`, `/gate/current-visitors`, `/gate/incidents/new` — **none of those pages exist** (broken links).
2. Pages do Firestore reads/writes **inline**; there is no shared `services/` or `hooks/` layer (spec §43).
3. Visit taxonomy conflicts with the task requirement (see §3).
4. No Currently-Inside, Deliveries, Incidents, or My-Shift screens; no photo capture; no automated tests.

### Confirmed decisions (this sub-project)
- **Sequencing:** shared layer + Guard first; Caretaker, Property Manager, Reports/Analytics, hardening follow as separate cycles.
- **Visit taxonomy:** migrate fully to `FRIENDLY_VISIT | WORK | DELIVERY | SERVICE_PROVIDER`.
- **Delivery routing:** DELIVERY registrations write to the `deliveries` collection; the other three types write to `visitors`.
- **Testing:** Firebase emulator suite + `@firebase/rules-unit-testing` (no production impact).
- **Pre-approval:** guard **reads** pre-approved visitors and fast-checks-in; creation UI ships with Caretaker phase. Seed a couple of demo entries.
- **Photos:** build reusable camera capture → Storage now; **optional** per registration so a flaky gate connection never blocks check-in.

---

## 2. Decomposition (full task = Phases 3–7)

1. **Shared domain layer + Guard experience** ← this spec.
2. Caretaker experience (Visitors, Tenants, Blocks & Units, Staff, Deliveries, Incidents, Reports, Settings; pre-approval CRUD).
3. Property Manager experience (all of Caretaker, read-scoped, + Analytics).
4. Reports & Analytics engine (shared; PDF/Excel export architecture).
5. Security-rules hardening + full workflow/boundary test suite.

Each gets its own spec → plan → build cycle.

---

## 3. Data-Model Changes

### 3.1 Visit taxonomy migration
Replace `VisitorType` with:
```ts
export type VisitType = 'FRIENDLY_VISIT' | 'WORK' | 'DELIVERY' | 'SERVICE_PROVIDER'
```
Friendly labels: Friendly Visit · Work · Delivery · Service Provider. Update the 4 consumers: `StatusBadge.tsx` (`VisitorTypeBadge`), `pages/admin/PropertyDetailPage.tsx`, `services/NotificationService.ts`, and the old `RegisterVisitorPage.tsx` (replaced — see §6). `EMERGENCY` as a "visit type" is dropped; emergencies are handled through Incidents.

### 3.2 `Visitor` conditional fields
Add optional, type-specific fields (only populated when relevant — spec §18):
```ts
visitType: VisitType
company?: string             // WORK / SERVICE_PROVIDER employer
workType?: string            // Plumbing, Electrical, Construction, …
workDescription?: string
serviceType?: string         // REQUIRED for SERVICE_PROVIDER (e.g. "Internet Installation")
serviceDescription?: string
expectedDurationMins?: number
registeredBy: string         // authed guard uid (mirrors guardId; used by rules)
registeredByRole: 'SECURITY_GUARD'
```
Rename intent: `guardId`/`guardName` stay (existing); `registeredBy` is added and asserted equal to `request.auth.uid` in rules.

`Delivery` already carries `company`, `riderName`, `riderPhone`, `packageDescription`, `status`. Add `registeredBy`.

### 3.3 Validation (spec §38)
Zod schemas, required fields by type:
- FRIENDLY_VISIT: name + tenant/unit.
- WORK: name + tenant/unit + workType + workDescription.
- DELIVERY: riderName + tenant/unit + (company or packageDescription).
- SERVICE_PROVIDER: name + tenant/unit + **serviceType (required)**.

---

## 4. Shared Domain Layer (spec §43)

All Firestore access moves behind services; components/hooks never call Firestore directly.

```
src/services/
  visitorService.ts     registerVisitor · checkOutVisitor · watchInside(propertyId) · listVisitors(filters)
  deliveryService.ts    registerDelivery · markCollected · watchDeliveries(propertyId,status?)
  incidentService.ts    reportIncident · watchIncidents · resolveIncident
  shiftService.ts       startShift · endShift · getActiveShift · incrementCounter
  tenantService.ts      searchTenants(propertyId, term) · getTenantByUnit
  unitService.ts        listUnits · listBlocks
  preApprovalService.ts findPreApproved(propertyId, term)
  photoService.ts       uploadPhoto(path, blob) → downloadURL  (Firebase Storage)
  notificationService   (exists) → also persists a notifications doc
  auditService.ts       log(entry)  — single choke-point for audit writes
```

**Isolation rule:** every service takes `propertyId` from the caller, but the caller passes the **claim-backed** `user.propertyId` from `AuthContext`. Services never read `propertyId` from a form. Firestore rules are the real boundary; services are the ergonomic layer.

```
src/hooks/
  useCurrentVisitors(propertyId)   → realtime onSnapshot, {visitors, loading, error}
  useVisitors(propertyId, filters)
  useDeliveries(propertyId, status?)
  useIncidents(propertyId, status?)
  useShift(guardId)                → active shift + live counters
  useTenantSearch(propertyId)      → debounced search across tenants + preApproved
```

`★ Design intent:` hooks own the realtime listeners (spec §30), services own the mutations + audit. A single write from the Guard therefore fans out to every subscribed dashboard with no refresh.

---

## 5. Guard Routes

```
/gate                 Gate home — dominant "REGISTER A GUEST" (spec §35), 2×2 secondary tiles
/gate/register        Register-a-Guest dynamic flow (replaces RegisterVisitorPage)
/gate/inside          Currently Inside (realtime, checkout)      §22
/gate/deliveries      Deliveries (RECEIVED → COLLECTED)          §23
/gate/incidents       Incidents list                            §24
/gate/incidents/new   Report incident
/gate/shift           My Shift (start/end, live counters)        §25
```
`GateLayout` stays minimal/mobile-first; secondary nav via the home tiles (Gate · Currently Inside · Deliveries · Incidents · My Shift), matching the ASCII target in spec §35.

---

## 6. Register-a-Guest Flow (core workflow — spec §11–§19, §36)

Single component with a `step` state machine — **no separate page per type** (spec §36).

1. **Type of Visit** — four large touch cards with emoji + one-line description (spec §12).
2. **Guest information** — Full Name, Phone, ID/Passport, Nationality, optional **photo** (camera capture → Storage via `photoService`; optional so offline never blocks — spec §40).
3. **Visiting** — fast **tenant/unit search** (`useTenantSearch`): type name · unit · block · phone. Selecting a result auto-fills `propertyId` (from claim, not the result), `blockId/blockName`, `unitId/unitNumber`, `tenantId/tenantName`, tenant phone/WhatsApp (spec §17). Pre-approved matches render a green "✓ PRE-APPROVED" card with access window and a fast **CHECK IN** (spec §21) — informational, never tenant approval.
4. **Visit details** — fields switch on `visitType`:
   - FRIENDLY_VISIT: optional reason.
   - WORK: workType (select + custom), workDescription, expected duration, company.
   - DELIVERY: company, package description, optional package photo.
   - SERVICE_PROVIDER: **"What service are you here to provide?" (required)** shown first, then company, description, duration (spec §16).
5. **Review → Register** — on submit, via services:
   - **DELIVERY** → `deliveryService.registerDelivery` (collection `deliveries`, `status:'RECEIVED'`).
   - others → `visitorService.registerVisitor` (collection `visitors`, `status:'INSIDE'`).
   - Both: set `checkInTime`/`receivedAt` (`serverTimestamp`), authed `guardId`+`registeredBy`, claim `propertyId`, all relevant conditional fields; increment active-shift counter; `auditService.log(...)`; persist a `notifications` doc + fire mock WhatsApp (informational, **no approve/deny** — spec §20); show confirmation card (name · type · block·unit · check-in time — spec §19).

**Confirmation** (spec §19) then offers "Register another" / "Back to gate".

---

## 7. Currently Inside · Deliveries · Incidents · My Shift

- **Currently Inside** (`/gate/inside`, spec §22): `useCurrentVisitors` realtime cards (name · type · block·unit · check-in · live duration) with **CHECK OUT** → `visitorService.checkOutVisitor` sets `status:'CHECKED_OUT'`, `checkOutTime`, computes `durationMinutes`, audit log.
- **Deliveries** (`/gate/deliveries`, spec §23): `useDeliveries` grouped by status; **MARK COLLECTED** → `status:'COLLECTED'`, `collectedAt`, `collectedBy`, audit log.
- **Incidents** (`/gate/incidents`, `/new`, spec §24): report with type/severity/description/related-visitor/optional photo → `incidentService.reportIncident` (`status:'OPEN'`), audit log. List shows severity badges. (Resolve/notes belong to Caretaker/PM — sub-project 2.)
- **My Shift** (`/gate/shift`, spec §25): start/end shift; live counters (visitors, deliveries, incidents, checkouts) read from the active shift doc; audit `SHIFT_STARTED`/`SHIFT_ENDED`.

---

## 8. Security Rules, Indexes, Storage

- **Rules:** visitors/deliveries/incidents/shifts already allow guard create/update within their property. Tighten guard `create` to require `request.resource.data.registeredBy == request.auth.uid`. Units: guard may update **status only** (add field-level guard so a guard cannot rewrite tenant fields). Confirm audit logs remain create-only/immutable.
- **Indexes** (add to `firestore.indexes.json`): `deliveries` by `propertyId`+`status`+`receivedAt desc`; `deliveries` by `propertyId`+`receivedAt desc`; `shifts` by `guardId`+`status`; `incidents` by `propertyId`+`status`+`createdAt desc`; `preApproved` by `propertyId`+`isActive`.
- **Storage (`storage.rules`):** allow authenticated staff to write under `photos/{propertyId}/...` only when `propertyId` matches their claim; enforce image content-type and a size cap; public-readable within property scope. URLs stored on the Firestore record (never binaries in Firestore — spec §31).

---

## 9. Notifications (spec §32 — honest, no secrets)

Keep the provider-agnostic `NotificationService` abstraction. On each registration, `notificationService`:
1. Builds the informational WhatsApp message (spec §20 copy — no approve/deny).
2. **Persists a `notifications` doc** (`status:'MOCK'` in dev, `provider:'MOCK'`) so dashboards show real data.
3. Calls the mock sender. Real WhatsApp provider stays behind a future Cloud Function; we never mark `SENT` for an unwired provider. No secrets in the frontend.

---

## 10. Offline-First (spec §40)

Firestore IndexedDB persistence is already enabled. Registration writes work offline and sync on reconnect; the `OnlineIndicator` shows Online/Offline. Photo upload requires connectivity — when offline the form clearly marks the photo as pending and still lets the guard register (photo optional). We never claim a server-validated success we don't have.

---

## 11. Testing (emulator — spec §47–§48)

- Add `firebase.json` emulator config (Firestore, Auth, Storage) + `@firebase/rules-unit-testing` (dev dep).
- **Rules/boundary tests:** guard of Property A cannot read/write Property B; guard cannot edit tenant records, cannot change units beyond `status`, cannot manage staff; no one can update/delete audit logs; client cannot forge `registeredBy`.
- **Workflow tests:** register (each of the 4 types) → correct collection + fields (assert `serviceType` persists for SERVICE_PROVIDER); checkout flips status + duration; delivery mark-collected.
- **Unit tests (vitest):** services (scoping, audit calls) and validation schemas.

---

## 12. Build Order (each step keeps the app runnable)

1. Branch `feat/guard-experience`. Types migration + fix 4 consumers; typecheck clean.
2. Shared `services/` + `hooks/`; refactor existing `GateDashboard`/`CaretakerDashboard` onto them (no behavior change).
3. `photoService` + `storage.rules`; reusable `PhotoCapture` component.
4. Register-a-Guest flow (`/gate/register`) with dynamic fields + tenant search + pre-approval read.
5. Currently Inside, Deliveries, Incidents, My Shift pages; fix Gate home tiles/links.
6. Rules tightening + indexes; deploy rules/indexes to `lango-d3ba0`.
7. Emulator + tests; seed demo pre-approved entries; manual end-to-end pass.

---

## 13. Out of Scope (later sub-projects)

- Caretaker/Property-Manager full sections; pre-approval CRUD; incident resolve/notes UI.
- Reports (PDF/Excel), Analytics dashboards.
- Real WhatsApp provider Cloud Function; App Check; M-Pesa/subscription billing.

---

## 14. Success Criteria (this sub-project)

- `npm run build` (tsc + vite) passes with zero errors.
- Guard logs in → `/gate`; "REGISTER A GUEST" dominant; four types register with correct dynamic fields; SERVICE_PROVIDER cannot submit without `serviceType`.
- DELIVERY lands in `deliveries` and shows on the Deliveries screen; the other three land in `visitors` and appear in Currently Inside in real time.
- Checkout flips status to `CHECKED_OUT` with duration; every privileged action writes an immutable audit log; a `notifications` doc is persisted.
- Emulator rules tests prove cross-property and role boundaries; workflow tests pass.
- No fake/mock data as a data source; no TODO placeholders for core functionality.
