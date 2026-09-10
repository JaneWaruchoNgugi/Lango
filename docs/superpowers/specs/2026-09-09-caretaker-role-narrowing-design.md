# Caretaker Role Narrowing — Design

**Date:** 2026-09-09
**Status:** Approved (pending spec review)

## Problem

In the current model the only capability separating a **Caretaker** from a
**Property Manager** is staff create/delete. Every other property-management
power (tenants, units, incidents, deliveries) is granted to both via the shared
`MANAGE_ROLES = ['PROPERTY_MANAGER', 'CARETAKER']` set. This makes the Caretaker
role nearly redundant with the Property Manager.

## Goal

Give the Caretaker a genuinely narrower set. Two powers become
**Property-Manager-only** (Super Admin retains both, as they sit above the PM):

1. **Move-out a tenant** — i.e. changing a tenant's `status` to `MOVED_OUT`.
   (Note: there is no hard-delete of tenants in the app — `moveOutTenant` never
   deletes, and the `tenants` `delete` rule is already Super-Admin-only and
   stays that way. So "delete tenant" in the original ask maps to move-out.)
2. **Resolve / change an incident's `status`** — treated as PM-only for *all*
   status transitions (OPEN → INVESTIGATING → RESOLVED → CLOSED), not just the
   final "Resolve". Rationale: "the caretaker reports, the manager works the case."

The Caretaker **keeps** everything else: add/edit tenant details, manage
units & blocks, deliveries, reports, settings, all gate operations, and
**reporting + viewing** incidents.

## Capability Matrix (after change)

| Action | Guard | Caretaker | Property Manager | Super Admin |
|---|:--:|:--:|:--:|:--:|
| Add / edit tenant details | ❌ | ✅ | ✅ | ✅ |
| Move-out / delete tenant (`status` change) | ❌ | **❌** | ✅ | ✅ |
| Report & view incidents | ✅ | ✅ | ✅ | ✅ |
| Change incident `status` (resolve/triage) | ❌ | **❌** | ✅ | ✅ |
| Manage units / blocks | ❌ | ✅ | ✅ | ✅ |
| Create / delete staff | ❌ | ❌ | ✅ | ✅ |

## Enforcement — two layers

Both layers are required. Layer A is the security boundary; Layer B is UX so
Caretakers don't see buttons that would fail.

### Layer A — Firestore rules (`firestore.rules`)

Add a helper that detects whether the `status` field is being modified:

```
// A caretaker may edit a doc's other fields but not flip its lifecycle status.
function statusUnchanged() {
  return request.resource.data.status == resource.data.status;
}
```

Tighten the `update` rule on **tenants** and **incidents** so a Caretaker may
update only when `status` is unchanged:

```
allow update: if isSuperAdmin()
  || (isPropertyManager() && getPropertyId() == resource.data.propertyId)
  || (isCaretaker()       && getPropertyId() == resource.data.propertyId && statusUnchanged());
```

Notes:
- Move-out (`moveOutTenant`) is an atomic `writeBatch` touching tenant + unit +
  occupancy. Blocking the tenant `status` write fails the **entire** batch, so
  no partial state results. Unit/occupancy rules are unchanged.
- Adding a tenant (`assignTenantToUnit`) is a tenant **create** plus a unit
  update to `OCCUPIED`; it contains no tenant `status` *change*, so it still
  works for Caretakers.
- Incident resolution (`setIncidentStatus`) is a single-doc `status` update,
  now blocked for Caretakers.

### Layer B — Client UI

`src/domain/permissions.ts`:
- **Add** `canMoveOutTenant(role)` → `PROPERTY_MANAGER || SUPER_ADMIN`.
- **Change** `canResolveIncidents(role)` from the shared `MANAGE_ROLES` set to
  `PROPERTY_MANAGER || SUPER_ADMIN` (removes Caretaker).
- **Keep** `canManageTenants` (add/edit) as `PROPERTY_MANAGER || CARETAKER`.

`src/features/property/TenantsPage.tsx`:
- Gate the **"Move out"** button with `canMoveOutTenant` instead of the current
  `canManage`. The "Edit" button keeps using `canManage`.

`src/features/property/IncidentsPage.tsx`:
- Status-change controls are already gated by `canResolveIncidents`; because that
  helper now excludes Caretakers, a Caretaker sees incidents read-only. Verify
  the status buttons are hidden (not merely disabled) when `!canResolve`.

## Testing

Extend the existing Firestore rules test harness (`npm run test:rules`,
`vitest.rules.config.ts`) with cases:

1. Caretaker move-out (tenant `status` → `MOVED_OUT`) → **denied**.
2. Caretaker incident `status` change → **denied**.
3. Caretaker tenant detail edit (name/phone, `status` unchanged) → **allowed**.
4. Property Manager move-out and incident status change → **allowed**.
5. Super Admin both → **allowed**.

Also run the standard suite (`npm run test`, `tsc`, lint). Deploy the updated
rules (`firebase deploy --only firestore:rules --project lango-d3ba0`).

## Out of scope / non-goals

- No change to Guard, Property Manager, or Super Admin capabilities beyond the
  two powers above.
- No change to which pages appear in each role's nav — the Caretaker still sees
  Tenants and Incidents (view + permitted actions).
- No granular per-transition incident permissions (all status changes are
  PM-only), per the confirmed decision.
- Units/blocks, deliveries, reports, settings remain available to the Caretaker.
