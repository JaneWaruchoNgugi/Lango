# Lango Landing Page — Design Spec

**Date:** 2026-09-07
**Status:** Approved (pending spec review)
**Goal:** A public marketing landing page convincing enough that owners/managers of *any* property type want to adopt Lango visitor & gate management.

## Context

- Lango is a multi-tenant visitor/gate-management SaaS. Roles: Super Admin, Property Manager, Caretaker, Security Guard.
- **No public landing page exists today** — `/` redirects to `/login` (or the role dashboard when authed).
- Brand: deep green (`--lango-primary #0f4c35`, `secondary #1a6b4a`, `accent #22c55e`, `light #f0fdf4`, `dark #0a2e1f`), Inter font, existing utility classes (`btn-primary`, `card`, `page-title`, etc.). Asset available: `src/assets/hero.png`.
- Pricing already defined in `SUBSCRIPTION_PLANS` (Small KES 4,000 → Medium 8,000 → Large 15,000 → Estate 30,000 /mo).
- No self-signup: accounts are provisioned by an admin. Conversion is demo-request driven.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Positioning | **All-in-one security + experience** |
| Segments featured | Residential, Commercial, Institutional, Industrial |
| Language | **Bilingual EN / SW** with a toggle |
| Primary CTA | **Both** — WhatsApp "Book a Demo" (primary) + lead form (secondary) |
| Lead storage | Firestore-direct (`leads` collection, honeypot + shape-validated rule) |
| Admin viewer | Include a minimal Admin → Leads page |

## Architecture

### Routing (`src/App.tsx`)
- `/` renders `<LandingPage />` for logged-out visitors; logged-in users still redirect to their role dashboard (`roleHome`). `RootRedirect` becomes: `if (loading) spinner; if (user) redirect to roleHome; else <LandingPage/>`.
- `/login`, `/change-password`, and all authed routes unchanged.
- New authed admin route: `/admin/leads` → `LeadsPage`.

### Files
```
src/pages/landing/
  LandingPage.tsx          # composition + lang state, scroll-reveal wiring
  i18n.ts                  # { en, sw } string dictionary + LandingLang type
  config.ts                # LANDING_CONTACT: whatsappNumber, email, phone (PLACEHOLDERS to replace)
  sections/
    LandingNav.tsx         # sticky nav: logo, EN/SW toggle, Sign In, Book Demo
    Hero.tsx
    Segments.tsx           # 4 segment cards
    HowItWorks.tsx         # 3 steps
    Features.tsx           # 6 feature cards
    WhyLango.tsx           # security + experience payoff
    Pricing.tsx            # reads SUBSCRIPTION_PLANS
    Faq.tsx
    LeadForm.tsx           # WhatsApp/call/email + form
    LandingFooter.tsx
src/services/leadService.ts  # createLead(input)
src/pages/admin/LeadsPage.tsx
```
- `Lead` type + `leadsCol`/`leadDoc` added to `src/types/index.ts` and `src/firebase/collections.ts`.

### Data model — `Lead`
```ts
interface Lead {
  leadId: string
  name: string
  propertyName: string
  propertyType: string        // free text from a select (Residential/Commercial/Institutional/Industrial/Other)
  phone: string
  email?: string
  message?: string
  source: 'LANDING_FORM'
  status: 'NEW' | 'CONTACTED' | 'CLOSED'
  createdAt: Timestamp
}
```

### Firestore rules (`firestore.rules`)
```
match /leads/{leadId} {
  allow read, update, delete: if isSuperAdmin();
  allow create: if request.resource.data.keys().hasOnly(
                     ['name','propertyName','propertyType','phone','email','message','source','status','createdAt'])
                && request.resource.data.source == 'LANDING_FORM'
                && request.resource.data.status == 'NEW'
                && request.resource.data.name is string
                && request.resource.data.name.size() > 0
                && request.resource.data.phone is string
                && request.resource.data.phone.size() > 0;
}
```
- Honeypot: a hidden `company_website` input; if non-empty the client silently drops the submit (never written). Not a rule concern.
- **Known limitation:** unauthenticated `create` is spam-exposed until App Check is enabled (phase 2, per project notes). Honeypot + required-field validation mitigates casual abuse.

### Bilingual (EN/SW)
- Lightweight, no i18n library: `i18n.ts` exports `STRINGS: Record<'en'|'sw', {...}>`. `LandingPage` holds `const [lang, setLang] = useState<'en'|'sw'>('en')` and passes `t = STRINGS[lang]` down to sections. Toggle in the nav.

## Data flow
1. Visitor lands on `/` → `LandingPage` (anonymous).
2. Primary CTA → `wa.me/<number>` click-to-chat (from `config.ts`). Secondary → scroll to `LeadForm`.
3. `LeadForm` submit → honeypot check → `leadService.createLead()` → `addDoc(leadsCol, {... status:'NEW', source:'LANDING_FORM', createdAt: serverTimestamp()})` → success toast.
4. Admin → Leads reads `leads` ordered by `createdAt` desc; can mark `CONTACTED`/`CLOSED` (update).

## Error handling
- Form: react-hook-form + zod, inline errors; submit failure → toast, form stays populated.
- `createLead` wraps `addDoc`; throws surface as a toast, logged to console.
- Landing page never depends on auth/Firestore reads to render (fully static except the form POST), so it always paints.

## Testing
- `leadFormSchema` (zod) unit tests: required fields, phone normalization, honeypot rejection — following the existing `visitorFilters.test.ts` / `registerSchemas.test.ts` pattern (vitest).
- `createLead` shape test (payload includes source/status/createdAt, no extra keys) mirroring `preApprovalService.test.ts`.
- Manual: render `/` logged-out; confirm redirect when logged-in; submit a lead; view it in Admin → Leads.

## Out of scope (YAGNI)
- Self-signup / billing checkout.
- Real WhatsApp/SMS provider (mock/deep-link only).
- Blog, multi-page marketing site, analytics/tracking pixels.
- App Check (tracked separately as phase 2).

## Open inputs needed from user
- Real **WhatsApp number**, **contact email**, **contact phone** for `config.ts` (placeholders shipped until provided).
