# Lango — Caretaker Experience Design

**Date:** 2026-09-04
**Status:** Approved pending spec review
**Sub-project:** 2 of 5. Delivers the Caretaker's full operational management surface on top of the shared domain layer built in sub-project 1. Built to be reused by the Property Manager (sub-project 3).

---

## 1. Context & Current State

Sub-project 1 (`feat/guard-experience`) shipped the shared domain layer and the Guard experience. Reusable pieces this sub-project builds on:

- **Services:** `visitorService` (register/checkout/`watchInside`), `deliveryService` (`registerDelivery`/`markCollected`/`watchDeliveries`), `incidentService` (`reportIncident`/`watchIncidents`), `shiftService`, `tenantService` (`loadActiveTenants`/`filterTenants`), `unitService` (`listBlocks`/`listUnits`), `preApprovalService`, `photoService`, `auditService.logAudit`, `NotificationService`.
- **Hooks:** `useCurrentVisitors`, `useDeliveries`, `useIncidents`, `useShift`, `useTenantSearch`.
- **Types:** full model in `src/types/index.ts` (`Tenant`, `Unit`, `Block`, `OccupancyRecord`, `Visitor`, `Delivery`, `Incident`, `AppUser`, `AuditAction`, …).
- **Rules:** per-property isolation via claims; property staff may create/update `tenants`/`units`, update `incidents`/`deliveries`; `occupancies` create allowed for property staff.
- **`CaretakerLayout`** already renders the sidebar (Dashboard, Visitors, Tenants, Blocks & Units, Deliveries, Incidents, Guards, Reports, Settings), but only `/caretaker` (index dashboard) has a route — the other links currently dead-redirect to the dashboard. This sub-project adds the missing routes/pages.

### Confirmed decisions
- **Reports:** stub with a "coming soon" placeholder now; full reporting/exports = sub-project 4 (shared engine).
- **Staff/Guards tab:** read-only roster + shift activity (staff creation stays Super-Admin-only via the existing Cloud Function).
- **Reuse:** section pages live in `src/features/property/`, parameterized by `basePath` + capabilities, wired into `/caretaker/*` now; sub-project 3 mounts the same pages under `/property`.
- **Occupancy model:** open an `occupancies` record on assign (moveInDate, null moveOutDate); close it on move-out. Never delete.
- **Visitors log filtering:** one indexed date-range query (`propertyId` + `checkInTime` range); block/unit/tenant/type/guard/status filters applied client-side.
- **One rules change:** loosen `occupancies` update to property staff for their own property (needed to close an occupancy on move-out).

---

## 2. Scope

**In scope:** Caretaker sections — Visitors (log + filters + detail), Tenants (list/search/add/edit/move-out/history), Blocks & Units (view + status + occupancy history), Deliveries (management), Incidents (notes/status/resolve), Guards/Staff (read-only), Settings (property basics), Reports (placeholder). Plus the shared service/hook additions, one rules change, indexes, and tests.

**Out of scope (later sub-projects):** Property Manager routing + Analytics (3); full Reports/exports engine (4); rules hardening sweep + broader test suite (5); pre-approval CRUD may land here or in 3 — see §6 Tenants note.

---

## 3. Architecture

### 3.1 Shared feature pages
`src/features/property/` — role-agnostic pages consumed by the caretaker routes now and the property-manager routes later:

```
VisitorsPage.tsx        TenantsPage.tsx        TenantFormDrawer.tsx
BlocksUnitsPage.tsx     UnitDetailDrawer.tsx   StaffPage.tsx
DeliveriesPage.tsx      IncidentsPage.tsx      IncidentDetailDrawer.tsx
SettingsPage.tsx        ReportsPlaceholder.tsx
```
Each page reads `propertyId` from the claim-backed `useAuth()` context and takes a `caps` object (see §3.2). No page hard-codes `/caretaker`; links use a `basePath` prop or `useResolvedPath`. Pages never call Firestore directly — only services/hooks.

### 3.2 Permissions (`src/domain/permissions.ts`)
Pure functions keyed by `UserRole` (frontend UX only; rules enforce the boundary):
```ts
canManageTenants(role)     // PROPERTY_MANAGER, CARETAKER
canManageUnits(role)       // PROPERTY_MANAGER, CARETAKER
canResolveIncidents(role)  // PROPERTY_MANAGER, CARETAKER
canManageDeliveries(role)  // PROPERTY_MANAGER, CARETAKER
canManageStaff(role)       // SUPER_ADMIN only (roster is read-only for others)
```
Caretaker gets a `caps` object built from these; pages disable/hide mutating controls when a cap is false.

### 3.3 Service additions
- **`tenantService`**: `listTenants(propertyId, {status?})`, `createTenant(args)`, `updateTenant(id, patch, actor)`, `assignTenantToUnit(...)`, `moveOutTenant(tenant, actor)`.
- **`occupancyService` (new)**: `openOccupancy(args)`, `closeOccupancy(record, moveOutDate)`, `listOccupanciesByUnit(propertyId, unitId)`.
- **`unitService`**: `updateUnitStatus(unit, status, actor)`, `listUnitsWithTenant(propertyId)` (units already carry `currentTenantId`/`currentTenantName`).
- **`incidentService`**: `addIncidentNote(...)`, `setIncidentStatus(incident, status, actor)` / `resolveIncident(incident, actor)`.
- **`deliveryService`**: `markHeld(delivery, actor)`, `markReturned(delivery, actor)`.
- **`staffService` (new)**: `listStaff(propertyId)` (read), `listRecentShifts(propertyId)`.
- **`visitorService`**: `watchVisitorsInRange(propertyId, from, to, cb, onErr)`.

### 3.4 Tenant-lifecycle atomicity
`assignTenantToUnit` and `moveOutTenant` mutate three docs and MUST be atomic — use a Firestore `writeBatch`:
- **Assign:** upsert `tenant` (`status:'ACTIVE'`, `moveInDate`), set `unit` `status:'OCCUPIED'` + `currentTenantId`/`currentTenantName`, create `occupancies` record (moveInDate, `moveOutDate:null`). Audit `TENANT_ASSIGNED`.
- **Move-out:** set `tenant` `status:'MOVED_OUT'` + `moveOutDate`, set `unit` `status:'VACANT'` + `currentTenantId:null`, stamp the open `occupancies` record's `moveOutDate`. Audit `TENANT_MOVED_OUT`. Guard against a unit already vacant.

### 3.5 Hooks
`useTenants(propertyId, status?)`, `useUnitsWithTenants(propertyId)`, `useVisitorsInRange(propertyId, range)` (returns raw + a `filter(...)` helper for client-side block/unit/type/guard/status), `useStaff(propertyId)`, `useOccupancyHistory(propertyId, unitId)`. Reuse `useDeliveries`/`useIncidents`.

---

## 4. Routes

Add under the existing `/caretaker` block in `src/App.tsx`:
```
/caretaker                 (index) dashboard        [exists]
/caretaker/visitors        VisitorsPage
/caretaker/tenants         TenantsPage
/caretaker/blocks          BlocksUnitsPage
/caretaker/deliveries      DeliveriesPage
/caretaker/incidents       IncidentsPage
/caretaker/staff           StaffPage
/caretaker/reports         ReportsPlaceholder
/caretaker/settings        SettingsPage
```
(`CaretakerLayout` already links to these exact paths.)

---

## 5. Sections (behavior)

- **Visitors** (spec §5): `useVisitorsInRange` (default: today; adjustable range). Search + client filters: block, unit, tenant, visitor type, guard, status (INSIDE/CHECKED_OUT). Row → detail drawer: name, type badge, block·unit, tenant, guard, check-in/out, duration, reason/service/work fields.
- **Tenants** (spec §8): list `ACTIVE` by default with a toggle to include `MOVED_OUT`; search name·phone·unit. **Add** (TenantFormDrawer → `assignTenantToUnit` picking a VACANT unit). **Edit** (`updateTenant`). **Move out** (confirm → `moveOutTenant`). Row → history (occupancy rows for that tenant's units). Historical records preserved.
- **Blocks & Units** (spec §9): blocks with their units; unit status badge + status change (`updateUnitStatus`). Unit → `UnitDetailDrawer`: current tenant + **previous tenants** via `listOccupanciesByUnit`. Move-out sets VACANT (never deletes the unit).
- **Deliveries** (spec §23): `useDeliveries` filtered by status tab; actions mark collected/held/returned.
- **Incidents** (spec §24): `useIncidents`; detail drawer to add notes, change status, resolve. Severity/status badges.
- **Guards/Staff**: `useStaff` read-only roster (name, role, status, last shift). No create/edit.
- **Settings**: view property (`properties/{propertyId}`) + edit basic contact fields (rules allow property-staff update). 
- **Reports**: `ReportsPlaceholder` — branded "coming soon", links noted as sub-project 4.

---

## 6. Data Model Notes

- No new collections beyond existing `occupancies`. `OccupancyRecord` already has moveIn/out + denormalized unit/tenant fields.
- Extend `AuditAction` union with: `TENANT_CREATED`, `TENANT_UPDATED`, `UNIT_STATUS_CHANGED`, `INCIDENT_RESOLVED`, `DELIVERY_HELD`, `DELIVERY_RETURNED` (reuse existing `TENANT_ASSIGNED`, `TENANT_MOVED_OUT`, `DELIVERY_COLLECTED`).
- Tenants note: pre-approval CRUD (spec §21 write side) is a natural fit for the Tenants section but is **deferred to sub-project 3** unless it proves trivial here; the guard already reads pre-approved entries.

---

## 7. Security Rules & Indexes

- **Change:** `occupancies` `allow update` → `isSuperAdmin() || (isPropertyStaff() && getPropertyId() == resource.data.propertyId)`. Keep `delete` Super-Admin-only (protect history). Create already allowed for property staff.
- No other rule changes: tenants/units/incidents/deliveries updates by property staff already permitted within their property.
- **Indexes:** `tenants` `propertyId+status+fullName` (exists). Add `occupancies` `propertyId+unitId` (+`moveInDate desc`) for unit history; `tenants` `propertyId+unitId` if needed for tenant history. Visitors range uses the existing `propertyId+checkInTime` index.

---

## 8. Testing

- **Pure unit tests:** visitor client-filter logic; permissions helpers; occupancy open/close field shaping.
- **Emulator tests:** caretaker CAN close an `occupancies` record for own property; caretaker CANNOT for another property; guard still CANNOT edit tenants (regression); tenant move-out batch leaves unit VACANT + tenant MOVED_OUT + occupancy closed; cross-property tenant/unit reads denied.
- Existing 42 tests (29 unit + 13 rules) stay green.

---

## 9. Build Order (each step keeps the app runnable)

1. Branch off `feat/guard-experience`. `permissions.ts` + `AuditAction` extension + one rules change + indexes; typecheck.
2. Service additions: occupancyService; tenantService lifecycle batches; unitService status; incident/delivery status actions; staffService; visitorService range. Emulator + unit tests for lifecycle/rules.
3. Hooks.
4. Shared feature pages + drawers under `src/features/property/`; wire `/caretaker/*` routes.
5. Reports placeholder + Settings.
6. Verify: build clean, tests green, manual pass of the tenant assign→move-out→history flow and the Visitors filters.

---

## 10. Success Criteria

- Every Caretaker sidebar tab routes to a real page (no dead-redirect).
- Caretaker can: filter the visitor log; add a tenant into a VACANT unit (unit flips OCCUPIED, occupancy opened); edit a tenant; move a tenant out (unit flips VACANT, tenant MOVED_OUT, occupancy closed, history preserved); change unit status; view a unit's previous tenants; mark deliveries collected/held/returned; add notes to and resolve incidents; view the guard roster read-only; edit property settings.
- All mutations write immutable audit logs; property isolation holds (emulator-proven).
- `npm run build` clean; unit + rules tests green; no mock data as a data source; no core TODO placeholders (Reports is an explicit, labeled placeholder).
