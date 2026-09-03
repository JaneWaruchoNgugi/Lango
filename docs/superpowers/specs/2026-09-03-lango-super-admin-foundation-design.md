# Lango — Running Foundation + Super Admin (Phases 1–2) Design

**Date:** 2026-09-03
**Status:** Approved pending spec review
**Milestone scope:** Make the app run end-to-end, then complete the Super Admin experience (Properties, Blocks, Units, Staff). Later phases (Caretaker/Tenants, Guard Gate, Notifications/Offline, Polish) get their own spec + plan cycles.

---

## 1. Context & Current State

Lango is a multi-tenant apartment **gate management SaaS**. A previous session built a strong but **non-running** foundation (~4,000 lines):

**Solid and kept as-is:**
- `src/types/index.ts` (547 lines) — complete data model for every entity + `SUBSCRIPTION_PLANS` config (pricing decoupled from UI).
- `src/contexts/AuthContext.tsx` — reads `role`/`propertyId` from **custom claims** (server-controlled, never client-trusted).
- `firestore.rules` (208 lines) — strict property isolation via claims, immutable audit logs, guard restrictions.
- `src/firebase/config.ts` + `collections.ts` — offline persistence enabled, typed collection/doc helpers.
- 4 role layouts, `ProtectedRoute`, UI primitives (`EmptyState`, `LoadingScreen`, `Modal`, `OnlineIndicator`, `StatusBadge`), `NotificationService`.
- Admin pages (Dashboard, Properties, PropertyDetail, PropertyForm, Staff), LoginPage, CaretakerDashboard, Gate (Dashboard + RegisterVisitor).

**Blockers this milestone fixes:**
1. **App does not run as Lango** — `main.tsx → App.tsx` is the default Vite template. No router, no providers mounted.
2. **No Cloud Functions** — custom claims can only be minted server-side, but there is no `createStaffUser` to set them. Without this the entire auth model is inert.
3. **Typecheck fails** — ~8 unused-import errors + a `react-hook-form`/`zod` resolver type mismatch in `PropertyFormPage`.
4. **No Firebase project scaffolding** — missing `firebase.json`, `.firebaserc`, `firestore.indexes.json`, `storage.rules`, `functions/`.
5. **Not its own git repo** — lives inside the parent home-dir repo.
6. Feature folders (`blocks`, `units`, `tenants`, etc.) empty; no seed script or indexes.

**Confirmed decisions:**
- Backend: **real Firebase project on Blaze** → build & deploy real Cloud Functions.
- Version control: **dedicated `git init` inside `Documents/Lango`**.
- First milestone: **running app + complete Super Admin (Phases 1–2)**.
- Phone login: **`resolvePhoneToEmail` callable + synthesized staff emails** (approved).
- First Super Admin: **guarded one-time seed/callable** (chicken-and-egg bootstrap).

---

## 2. Architecture

### 2.1 Client
React 19 + Vite + TypeScript + Tailwind. Providers wrap the router in `App.tsx`:
`AuthProvider → OnlineProvider → QueryClientProvider (react-query) → RouterProvider`, with a global `<Toaster/>` (react-hot-toast). Data access via typed collection helpers and react-query hooks per feature.

### 2.2 Server (Cloud Functions, `functions/`, TS, Node 20, Admin SDK)
All privileged logic is server-side; the browser never uses the Admin SDK.

| Function | Type | Auth guard | Responsibility |
|---|---|---|---|
| `createStaffUser` | callable | caller `SUPER_ADMIN` | Create Auth user, generate temp password, **set claims `{role, propertyId}`**, write `users/{uid}` (`tempPasswordSet:true`), write audit log. Returns temp password once. |
| `setUserClaims` | callable | caller `SUPER_ADMIN` | Re-set claims on reassignment/role change; mirror to `users/{uid}`. |
| `resolvePhoneToEmail` | callable | unauthenticated (rate-limited) | Map a phone number → the account's login email so the client can sign in by phone. Returns only the email (no PII). |
| `bootstrapSuperAdmin` | callable | shared-secret guard, one-time | Mint the very first Super Admin (breaks chicken-and-egg). Disabled once an admin exists. |

A local **`seed`** script (Admin SDK) provisions Greenview Apartments + blocks/units/tenants/guards/caretaker (spec §43) for development.

### 2.3 Data model — top-level collections (unchanged)
Keep flat top-level collections (`properties`, `blocks`, `units`, `tenants`, `occupancies`, `visitors`, `preApproved`, `deliveries`, `incidents`, `shifts`, `subscriptions`, `auditLogs`, `notifications`), each carrying `propertyId`. Rationale: already matches the written rules and typed helpers; simplifies Super Admin cross-property queries and reporting vs. collection-group queries. Add composite indexes as query needs surface (e.g. `units` by `propertyId`+`blockId`, `visitors` by `propertyId`+`checkInTime desc`, `staff/users` by `propertyId`+`role`).

---

## 3. Authentication & Authorization

- **Custom claims are the single source of truth** for `role` + `propertyId`; both `firestore.rules` and `AuthContext` already consume them. Client role state is advisory only — rules enforce server-side, so URL/param tampering cannot escalate access.
- **Login (email or phone):** email → `signInWithEmailAndPassword`; phone → `resolvePhoneToEmail` → sign in with resolved email. Staff created by `createStaffUser` get a real or synthesized email (`<slug>@<propertyId>.lango.local`) plus their phone stored for lookup.
- **Temp password:** `users/{uid}.tempPasswordSet === true` forces `/change-password` before any dashboard is reachable; cleared on successful change.
- **Redirects:** `SUPER_ADMIN → /admin`, `PROPERTY_MANAGER → /property`, `CARETAKER → /caretaker`, `SECURITY_GUARD → /gate`. `ProtectedRoute` gates by role; unknown/unmatched → role-aware redirect.

---

## 4. Route Structure (`App.tsx`)

```
/login                         public
/change-password               auth required; forced when tempPasswordSet
/admin                         SUPER_ADMIN
  ├─ (index) dashboard
  ├─ properties
  ├─ properties/new
  ├─ properties/:id            (tabs: Overview/Blocks/Units/Staff/… )
  ├─ staff
  ├─ subscriptions             (basic this milestone)
  ├─ reports                   (stub → later phase)
  └─ settings                  (stub → later phase)
/property/*                    PROPERTY_MANAGER   (stub this milestone)
/caretaker/*                   CARETAKER          (existing dashboard)
/gate/*                        SECURITY_GUARD     (existing dashboard + register-visitor)
*                              role-aware redirect
```

---

## 5. Milestone Build Order (each step keeps the app runnable)

1. **Repo + Firebase scaffold** — `git init` + `.gitignore`; add `firebase.json`, `.firebaserc`, `firestore.indexes.json`, `storage.rules`, `functions/` (TS). First commit = existing foundation baseline.
2. **Make it run** — replace Vite-template `App.tsx` with router + providers; fix all typecheck errors (unused imports + zod resolver mismatch). *Checkpoint: app boots to real login screen.*
3. **Cloud Functions** — `createStaffUser`, `setUserClaims`, `resolvePhoneToEmail`, `bootstrapSuperAdmin` + audit logging; deploy. *Checkpoint: functions callable.*
4. **Seed** — provision Greenview + first Super Admin. *Checkpoint: login → `/admin` end-to-end.*
5. **Super Admin CRUD** —
   - **Properties:** create/edit/suspend, detail page with tabs, dashboard stat cards wired to live aggregates.
   - **Blocks:** create/edit/archive; **auto-generate units** (e.g. 24 → A01…A24).
   - **Units:** list, status (OCCUPIED/VACANT/RESERVED/MAINTENANCE); units persist independent of tenants.
   - **Staff:** create via `createStaffUser` (temp-password display), activate/deactivate, list by property/role.
6. **Verify** — typecheck clean, rules + indexes deploy, manual end-to-end pass; commit per feature.

---

## 6. Dependencies

Client deps already present (react-router 7, react-hook-form, zod, react-query, recharts, date-fns, react-hot-toast, firebase). **New:** `firebase-tools` (dev); `functions/` package (`firebase-admin`, `firebase-functions`). No other runtime deps.

---

## 7. Out of Scope (future spec/plan cycles)

- Caretaker/Property-Manager full dashboards; Tenants + Occupancy history flows.
- Guard gate: visitor registration polish, checkout, deliveries, contractors, incidents, shifts, pre-approved visitors.
- WhatsApp provider integration behind `NotificationService`; audit-log UI; offline queueing UX.
- Reports (PDF/Excel export), subscriptions/M-Pesa billing, App Check, ID-scanner/hardware hooks.

---

## 8. Success Criteria (this milestone)

- `npm run build` (tsc + vite) passes with zero errors.
- Seeded Super Admin logs in (email **and** phone) → lands on `/admin`; temp-password change enforced on first login.
- Super Admin can create a property, add blocks with auto-generated units, and create staff (guard/caretaker/manager) who receive working credentials with correct claims.
- A non-admin cannot reach `/admin` or read another property's data (verified against rules).
- Every privileged action writes an immutable `auditLogs` entry.
