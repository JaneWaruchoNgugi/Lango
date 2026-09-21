# Visitor Detail Fields — Design (Sub-project A)

**Date:** 2026-09-11
**Status:** Approved
**Part of:** "More visitor-form fields" initiative (sub-projects A–E). This is **A**.
**Branch base:** cut from `feat/tenant-tenancy-dates` HEAD (continuity with explored code); can be rebased onto `main` later.

## Context

The guest-registration form (`src/pages/gate/RegisterGuestPage.tsx`) is a 3-step wizard: pick visit type → details → review & register. Its schema is a discriminated union in `src/domain/registerSchemas.ts` with a shared `guest` base plus per-type objects (`friendly`, `work`, `delivery`, `service`). Non-delivery visits are written by `registerVisitor` (`src/services/visitorService.ts`); deliveries take a separate path via `registerDelivery` (`src/services/deliveryService.ts`) writing a `Delivery` doc.

This sub-project adds three new capture fields for better gate accountability. No new collections, no workflow logic.

## New fields

| Field | Type | Applies to | Purpose |
|---|---|---|---|
| `gatePassNumber` | `string` (optional) | Visitors + Deliveries | Physical badge/pass number handed over at entry; reconciled on exit |
| `vehicleType` | `'CAR' \| 'MOTORBIKE' \| 'VAN' \| 'TRUCK' \| 'OTHER'` (optional) | Visitors + Deliveries | Complements the existing plate (`vehicleRegistration`) |
| `vehicleDescription` | `string` (optional) | Visitors + Deliveries | Free text, e.g. "white Toyota Vitz" |
| `itemsBroughtIn` | `string` (optional) | Visitors only (Friendly / Work / Service) | Notable tools/equipment brought in, for an exit check. Deliveries already have `packageDescription`. |

A `VehicleType` union type is added to `src/types/index.ts` and reused everywhere.

## 1. Data model (`src/types/index.ts`)

- Add `export type VehicleType = 'CAR' | 'MOTORBIKE' | 'VAN' | 'TRUCK' | 'OTHER'`.
- `Visitor`: add `gatePassNumber?: string`, `vehicleType?: VehicleType | null`, `vehicleDescription?: string`, `itemsBroughtIn?: string`.
- `Delivery`: add `gatePassNumber?: string`, `vehicleType?: VehicleType | null`, `vehicleDescription?: string`.

## 2. Services

`src/services/visitorService.ts`
- `RegisterVisitorArgs`: add `gatePassNumber?: string`, `vehicleType?: VehicleType`, `vehicleDescription?: string`, `itemsBroughtIn?: string`.
- `registerVisitor` write: persist each with the existing empty/null defaults pattern (`?? ''` for strings, `?? null` for `vehicleType`).

`src/services/deliveryService.ts`
- `RegisterDeliveryArgs`: add `gatePassNumber?: string`, `vehicleType?: VehicleType`, `vehicleDescription?: string`.
- `registerDelivery` write: persist them (`?? ''` / `?? null`). Not `itemsBroughtIn`.

## 3. Schema (`src/domain/registerSchemas.ts`)

- Add to the shared `guest` base:
  - `gatePassNumber: z.string().optional()`
  - `vehicleType: z.enum(['CAR','MOTORBIKE','VAN','TRUCK','OTHER']).optional()`
  - `vehicleDescription: z.string().optional()`
- Add `itemsBroughtIn: z.string().optional()` to `friendly`, `work`, and `service` only (not `delivery`).

## 4. Form UI (`src/pages/gate/RegisterGuestPage.tsx`)

Step 2 (details), using the existing `Field` row component:
- **Gate pass / badge no.** — text input (`gatePassNumber`), rendered for all visit types, placed just after the ID/passport block.
- **Vehicle group** — keep the existing plate input (`vehicleRegistration`); add directly beneath it:
  - a **Vehicle type** `<select>` (`vehicleType`) with a blank "—" default and the five options,
  - a **Make & colour** text input (`vehicleDescription`).
  All optional, shown for all visit types.
- **Items brought in** — textarea (`itemsBroughtIn`), rendered for Friendly / Work / Service only (not Delivery). Label reads "Items brought in (checked on exit)"; for Work the helper text emphasises tools/equipment.

Submit handler (`onSubmit`): thread the new values into the `registerVisitor` call (non-delivery) and the `registerDelivery` call (delivery, minus `itemsBroughtIn`), guarding `itemsBroughtIn` behind the existing `'itemsBroughtIn' in data` discriminated-union access pattern already used for `reason`/`numberOfVisitors`.

## 5. Display surfaces

- **Review step (step 3)** — add `ReviewRow`s (only when the value is present) for gate pass, vehicle type + description, and items brought in.
- **Success screen / QR pass summary** — add a gate-pass line to the `DoneResult` summary (it is the badge to match on exit). Vehicle is already shown.
- **Currently Inside (`src/pages/gate/CurrentlyInsidePage.tsx`)** and **Visitors history detail (`src/features/property/VisitorsPage.tsx`)** — display gate pass, vehicle type/description, and items brought in where a visitor's details are shown, so the guard can reconcile the badge and items at checkout.

## 6. Testing

Extend `src/domain/registerSchemas.test.ts`:
- New optional fields parse when present and when omitted, for each visit type.
- `itemsBroughtIn` is accepted on friendly/work/service and is **not** part of the delivery schema shape.
- `vehicleType` rejects an invalid enum value (e.g. `'PLANE'`).

## Out of scope (YAGNI / later)

- No exit-time verification workflow for items or badges — they are displayed at checkout, not enforced with a checklist.
- Overstay/valid-until (B), host authorization (C), regular visitors (E), watchlist (D) are separate sub-projects.
