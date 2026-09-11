# Tenant Tenancy Dates & History — Design

**Date:** 2026-09-11
**Status:** Approved
**Scope:** UI + light service changes. No new storage.

## Problem

Property managers want to:
1. Record **when a tenant became a tenant** (move-in date) when adding them — including backdating existing residents.
2. Record the **actual vacate date** when a tenant moves out.
3. Keep and retrieve the **full history of previous tenants** with all their details on demand.

## Key finding: storage & history already exist

The data layer already supports all three needs:

- Every tenant stores `moveInDate: Timestamp` and `moveOutDate: Timestamp | null` (`src/types/index.ts`).
- Tenants are **never deleted**. `moveOutTenant` flips `status` to `MOVED_OUT` and preserves the full record. A separate occupancy-history record is written per tenancy (`occupanciesCol`, via `stageOpenOccupancy` / closed on move-out).
- The Tenants page filter already offers **Active / Moved out / All statuses** (`TenantsPage.tsx`), so previous tenants are already retrievable.

Therefore this is a focused UI enhancement, **not** a new subsystem. The gaps are:

1. Move-in date is hardcoded to `new Date()` at assign time — no field to set/backdate it.
2. Move-out date is hardcoded to `serverTimestamp()` — no field to set the real vacate date.
3. The stored dates are not displayed anywhere, and there is no per-tenant detail view.

## Decisions (from brainstorming)

- **Move-in date:** editable date field, defaults to today.
- **Move-out date:** date field in the move-out confirm dialog, defaults to today, editable.
- **Where dates show:** inline in each tenant row **and** in a tenant detail view **and** editable via the Edit form.

## Design

### 1. Date helpers — `src/utils/format.ts`

Add pure functions alongside the existing `durationMinutes` / `formatDuration`:

- `tsToInputDate(ts: Timestamp | Date): string` — to `"yyyy-mm-dd"` for `<input type="date">`.
- `inputDateToDate(str: string): Date` — parse a `"yyyy-mm-dd"` string to a local-midnight `Date`.
- `formatMonthYear(ts: Timestamp | Date): string` — e.g. `"Jan 2025"`.
- `formatDateLong(ts: Timestamp | Date): string` — e.g. `"12 Jan 2025"`.
- `tenancyLength(from: Timestamp | Date, to?: Timestamp | Date | null): string` — e.g. `"1 yr 3 mo"`; when `to` is null/undefined, measures to now (still-active tenancy).

Each gets unit tests in the existing `src/utils/format.test.ts`.

### 2. Service changes — `src/services/tenantService.ts`

- **`moveOutTenant(tenant, actor, moveOutDate: Date)`** — new `moveOutDate` parameter.
  - Guard: throw if `moveOutDate < tenant.moveInDate.toDate()` (surfaced as a toast on the UI).
  - Write `Timestamp.fromDate(moveOutDate)` to the tenant record's `moveOutDate` (replacing `serverTimestamp()`).
  - Write the same `Timestamp` to the matched open occupancy record's `moveOutDate` (replacing `serverTimestamp()`).
  - `updatedAt` stays `serverTimestamp()`.
- **`UpdateTenantPatch`** — add optional `moveInDate?: Date`.
  - In `updateTenant`, when present, write `Timestamp.fromDate(moveInDate)` to the tenant.
  - Also sync the still-open occupancy record's `moveInDate` to keep history consistent (query the same `propertyId + unitId` open occupancy, matched by `tenantId` + `moveOutDate === null`, mirroring `moveOutTenant`).
- **`assignTenantToUnit`** — already accepts `moveInDate: Date`; no change.

### 3. Add/Edit form — `src/features/property/TenantFormDrawer.tsx`

- Add a **Move-in date** `<input type="date">` field, present in both add and edit modes.
  - Add mode: defaults to today; passed to `assignTenantToUnit`.
  - Edit mode: defaults to the tenant's existing `moveInDate` (via `tsToInputDate`); passed in the patch to `updateTenant`.
  - Wired into the zod schema (required, valid date; parsed via `inputDateToDate`).

### 4. Move-out dialog — new `src/features/property/MoveOutDialog.tsx`

A small dedicated `Modal` replacing the generic `ConfirmDialog` used for move-out:
- Shows tenant name + unit.
- **Vacate date** picker, defaults to today, editable.
- Retains the "The unit becomes vacant; history is preserved." reassurance.
- Confirm calls back with the chosen `Date`; the page passes it to `moveOutTenant`.
- Handles the move-in-date guard error from the service by showing a toast (no crash).

### 5. Tenant detail view — new `src/features/property/TenantDetailDrawer.tsx`

A read-only `Modal` (follows the existing `UnitDetailDrawer` pattern) opened by clicking a tenant row. Displays the full record for any current or past tenant:
- Status badge, block/unit.
- Phone, WhatsApp, email, national ID.
- **Move-in date, move-out date, tenancy length** (via helpers).
- Emergency contact (if present), notes (if present).

This is the "give me all their details" surface.

### 6. List rows — `src/features/property/TenantsPage.tsx`

- Add a dates line under each row:
  - Active: `"Since Jan 2025"` (from `moveInDate`).
  - Moved out: `"Jan 2025 – Aug 2026"` (from `moveInDate` / `moveOutDate`).
- Make the row's text area clickable → opens `TenantDetailDrawer`.
- Replace the current move-out `ConfirmDialog` with `MoveOutDialog`, passing the chosen date to `moveOutTenant`.

## Out of scope (YAGNI)

- No new collections or schema changes.
- No dedicated separate "History" page (the Moved-out filter already covers retrieval).
- No re-occupancy timeline chart or CSV export.
- No editing a moved-out tenant's move-out date after the fact (can be added later if needed).

## Testing

- Unit tests for all new `format.ts` helpers (formatting, parsing round-trip, tenancy-length edge cases: same day, sub-month, multi-year, active/no-end).
- Service-level guard: `moveOutTenant` rejects a vacate date earlier than move-in.
- Manual verification: add tenant with backdated move-in; move out with a chosen date; confirm row line + detail drawer show correct dates and tenancy length; confirm Moved-out filter still lists past tenants.
