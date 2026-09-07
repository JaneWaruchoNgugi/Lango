# Lango Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, bilingual (EN/SW) marketing landing page at `/` that convinces owners/managers of any property type to adopt Lango, with a WhatsApp CTA and a Firestore-backed lead form viewable by admins.

**Architecture:** A new `src/pages/landing/` module composes focused section components driven by an in-memory EN/SW string dictionary (no i18n library). The lead form validates with zod + react-hook-form and writes to a locked-down `leads` Firestore collection through a thin service that reuses a pure, unit-tested payload builder. `/` renders the landing page for anonymous visitors and redirects authenticated users to their role dashboard. A minimal Admin → Leads page reads and triages submissions.

**Tech Stack:** React + TypeScript, Vite, Tailwind (existing `lango` palette + utility classes), react-hook-form, zod, firebase/firestore, lucide-react, react-hot-toast, vitest.

---

## File Structure

```
src/pages/landing/
  LandingPage.tsx            # composition, lang state
  i18n.ts                    # STRINGS { en, sw }, LandingLang, LandingCopy
  config.ts                  # LANDING_CONTACT + waLink/telLink/mailtoLink helpers
  leadForm.ts                # leadFormSchema (zod), buildLeadPayload, isHoneypotTripped  [pure, tested]
  leadForm.test.ts           # tests for leadForm.ts
  i18n.test.ts               # EN/SW key-parity test
  components/Reveal.tsx      # IntersectionObserver fade-in wrapper
  sections/LandingNav.tsx
  sections/Hero.tsx
  sections/Segments.tsx
  sections/HowItWorks.tsx
  sections/Features.tsx
  sections/WhyLango.tsx
  sections/Pricing.tsx
  sections/Faq.tsx
  sections/LeadForm.tsx
  sections/LandingFooter.tsx
src/services/leadService.ts  # createLead()
src/pages/admin/LeadsPage.tsx
```
Modified: `src/types/index.ts`, `src/firebase/collections.ts`, `firestore.rules`, `src/App.tsx`, `src/components/layouts/AdminLayout.tsx`.

---

## Task 1: Lead type + typed collection

**Files:**
- Modify: `src/types/index.ts` (append after the `Notification` interface, ~line 445)
- Modify: `src/firebase/collections.ts`

- [ ] **Step 1: Add the `Lead` type**

In `src/types/index.ts`, after the `Notification` interface block, add:

```ts
// ============================================================
// LEAD (public landing-page demo requests)
// ============================================================

export type LeadStatus = 'NEW' | 'CONTACTED' | 'CLOSED'

export interface Lead {
  leadId: string
  name: string
  propertyName: string
  propertyType: string   // Residential | Commercial | Institutional | Industrial | Other
  phone: string
  email?: string
  message?: string
  source: 'LANDING_FORM'
  status: LeadStatus
  createdAt: Timestamp
}
```

- [ ] **Step 2: Add the typed collection + doc helper**

In `src/firebase/collections.ts`: add `Lead` to the type import from `../types`, then add near the other collection refs:

```ts
export const leadsCol = collection(db, 'leads') as CollectionReference<Lead>
```

and near the doc helpers:

```ts
export const leadDoc = (id: string): DocumentReference<Lead> => doc(leadsCol, id)
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc -b`
Expected: exit 0 (no errors).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/firebase/collections.ts
git commit -m "feat(leads): add Lead type and leads collection"
```

---

## Task 2: Firestore rules for `/leads`

**Files:**
- Modify: `firestore.rules` (add a `match` block before the closing braces of the `/documents` match)

- [ ] **Step 1: Add the leads rule block**

Insert directly after the `notifications` match block:

```
    // ============================================================
    // LEADS (public demo requests from the landing page)
    // ============================================================
    match /leads/{leadId} {
      allow read, update, delete: if isSuperAdmin();
      allow create: if request.resource.data.keys().hasOnly(
                         ['name','propertyName','propertyType','phone','email','message','source','status','createdAt'])
                    && request.resource.data.source == 'LANDING_FORM'
                    && request.resource.data.status == 'NEW'
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 120
                    && request.resource.data.phone is string
                    && request.resource.data.phone.size() > 0
                    && request.resource.data.phone.size() <= 20;
    }
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat(leads): public create + admin-read firestore rule"
```

> Note: deploying rules (`firebase deploy --only firestore:rules`) is a manual step for the user; not part of this plan.

---

## Task 3: i18n dictionary + key-parity test

**Files:**
- Create: `src/pages/landing/i18n.ts`
- Create: `src/pages/landing/i18n.test.ts`

- [ ] **Step 1: Write the dictionary**

Create `src/pages/landing/i18n.ts`:

```ts
export type LandingLang = 'en' | 'sw'

export interface Segment { title: string; blurb: string }
export interface Step { title: string; blurb: string }
export interface Feature { title: string; blurb: string }
export interface FaqItem { q: string; a: string }

export interface LandingCopy {
  nav: { signIn: string; bookDemo: string }
  hero: { badge: string; title: string; subtitle: string; ctaPrimary: string; ctaSecondary: string; trust: string }
  segmentsHeading: string
  segments: Segment[]
  howHeading: string
  steps: Step[]
  featuresHeading: string
  features: Feature[]
  whyHeading: string
  whyPoints: string[]
  pricingHeading: string
  pricingSub: string
  pricingCta: string
  perMonth: string
  faqHeading: string
  faqs: FaqItem[]
  form: {
    heading: string; sub: string
    name: string; propertyName: string; propertyType: string; phone: string; email: string; message: string
    submit: string; success: string; error: string
    or: string; whatsapp: string; call: string; emailUs: string
    typeOptions: string[]
  }
  footerTagline: string
}

const en: LandingCopy = {
  nav: { signIn: 'Sign In', bookDemo: 'Book a Demo' },
  hero: {
    badge: 'Visitor & Gate Management',
    title: 'Know exactly who is on your property.',
    subtitle: 'Lango replaces the paper gate book with instant WhatsApp alerts, digital visitor records and full incident tracking — tighter security and a smoother experience, for every kind of property.',
    ctaPrimary: 'Book a Free Demo',
    ctaSecondary: 'See pricing',
    trust: 'Built for Kenyan properties · Works on any phone',
  },
  segmentsHeading: 'One system for every property',
  segments: [
    { title: 'Residential', blurb: 'Apartments, gated estates and communities — welcome residents and their guests without the queue.' },
    { title: 'Commercial', blurb: 'Offices, malls and business parks — manage tenants, staff and daily deliveries with a clean audit trail.' },
    { title: 'Institutional', blurb: 'Schools, campuses and hospitals — control access, log every visitor and keep people accountable.' },
    { title: 'Industrial', blurb: 'Warehouses, factories and yards — track contractors, trucks and deliveries in and out, all shift long.' },
  ],
  howHeading: 'How it works',
  steps: [
    { title: 'Register the visitor', blurb: 'The guard captures the visitor and the unit they are visiting in seconds.' },
    { title: 'Resident gets an alert', blurb: 'An instant WhatsApp message lets the host approve or deny before entry.' },
    { title: 'Everything is recorded', blurb: 'Check-in, check-out, deliveries and incidents build a searchable digital record.' },
  ],
  featuresHeading: 'Everything you need at the gate',
  features: [
    { title: 'Visitor check-in / out', blurb: 'Fast registration with photo and ID, and a live view of who is currently inside.' },
    { title: 'Instant WhatsApp alerts', blurb: 'Residents and tenants are notified the moment a visitor or delivery arrives.' },
    { title: 'Delivery management', blurb: 'Log parcels and riders, notify recipients, and track collection.' },
    { title: 'Incident reporting', blurb: 'Guards report incidents with severity and photos; managers track to resolution.' },
    { title: 'Shift accountability', blurb: 'Every action is tied to a guard and a shift, so nothing is untraceable.' },
    { title: 'Live dashboard', blurb: 'Managers and owners see activity across one or many properties in real time.' },
  ],
  whyHeading: 'Security and experience, together',
  whyPoints: [
    'No more paper gate books — every entry is digital and searchable.',
    'Works on the phones your guards already carry.',
    'Role-based access for owners, managers, caretakers and guards.',
    'Manage a single block or a whole portfolio from one account.',
  ],
  pricingHeading: 'Simple, transparent pricing',
  pricingSub: 'Pick the plan that matches your property size. No hidden fees.',
  pricingCta: 'Book a Demo',
  perMonth: '/month',
  faqHeading: 'Frequently asked questions',
  faqs: [
    { q: 'How long does setup take?', a: 'Most properties are live within a day — we create your account, add your blocks and units, and train your guards.' },
    { q: 'Do we need special hardware?', a: 'No. Lango runs on any modern smartphone or tablet the guards already use.' },
    { q: 'Who owns the data?', a: 'You do. Your visitor and resident records belong to your property and are never sold.' },
    { q: 'Can it handle more than one property?', a: 'Yes. Owners and managers can oversee multiple properties from a single login.' },
  ],
  form: {
    heading: 'Book a free demo',
    sub: 'Tell us about your property and we will show you Lango in action.',
    name: 'Your name', propertyName: 'Property name', propertyType: 'Property type',
    phone: 'Phone number', email: 'Email (optional)', message: 'Anything else? (optional)',
    submit: 'Request Demo', success: 'Thanks! We will be in touch shortly.', error: 'Something went wrong. Please try WhatsApp instead.',
    or: 'or reach us directly', whatsapp: 'Chat on WhatsApp', call: 'Call us', emailUs: 'Email us',
    typeOptions: ['Residential', 'Commercial', 'Institutional', 'Industrial', 'Other'],
  },
  footerTagline: 'Visitor & gate management for every property.',
}

const sw: LandingCopy = {
  nav: { signIn: 'Ingia', bookDemo: 'Omba Demo' },
  hero: {
    badge: 'Usimamizi wa Wageni na Lango',
    title: 'Jua hasa nani yuko kwenye mali yako.',
    subtitle: 'Lango inabadilisha daftari la lango kwa arifa za papo hapo za WhatsApp, rekodi za kidijitali za wageni na ufuatiliaji kamili wa matukio — usalama zaidi na urahisi, kwa kila aina ya mali.',
    ctaPrimary: 'Omba Demo Bila Malipo',
    ctaSecondary: 'Angalia bei',
    trust: 'Imejengwa kwa mali za Kenya · Inafanya kazi kwa simu yoyote',
  },
  segmentsHeading: 'Mfumo mmoja kwa kila mali',
  segments: [
    { title: 'Makazi', blurb: 'Apartments, mitaa iliyofungwa na jamii — karibisha wakazi na wageni wao bila foleni.' },
    { title: 'Biashara', blurb: 'Ofisi, maduka makubwa na mbuga za biashara — simamia wapangaji, wafanyakazi na vifurushi kwa rekodi safi.' },
    { title: 'Taasisi', blurb: 'Shule, vyuo na hospitali — dhibiti ufikiaji, andika kila mgeni na hakikisha uwajibikaji.' },
    { title: 'Viwanda', blurb: 'Maghala, viwanda na maeneo — fuatilia wakandarasi, malori na vifurushi vinavyoingia na kutoka.' },
  ],
  howHeading: 'Inavyofanya kazi',
  steps: [
    { title: 'Sajili mgeni', blurb: 'Mlinzi anaandika mgeni na nyumba anayotembelea kwa sekunde chache.' },
    { title: 'Mkazi anapata arifa', blurb: 'Ujumbe wa papo hapo wa WhatsApp humruhusu mwenyeji kukubali au kukataa kabla ya kuingia.' },
    { title: 'Kila kitu kinarekodiwa', blurb: 'Kuingia, kutoka, vifurushi na matukio hujenga rekodi ya kidijitali inayotafutika.' },
  ],
  featuresHeading: 'Kila kitu unachohitaji langoni',
  features: [
    { title: 'Kuingia / kutoka kwa wageni', blurb: 'Usajili wa haraka wenye picha na kitambulisho, na mwonekano wa nani yuko ndani sasa.' },
    { title: 'Arifa za papo hapo za WhatsApp', blurb: 'Wakazi na wapangaji hujulishwa mara mgeni au kifurushi kinapowasili.' },
    { title: 'Usimamizi wa vifurushi', blurb: 'Andika vifurushi na waendeshaji, arifu wapokeaji, na fuatilia ukusanyaji.' },
    { title: 'Kuripoti matukio', blurb: 'Walinzi huripoti matukio kwa uzito na picha; wasimamizi hufuatilia hadi utatuzi.' },
    { title: 'Uwajibikaji wa zamu', blurb: 'Kila hatua imeunganishwa na mlinzi na zamu, hakuna lisilofuatilika.' },
    { title: 'Dashibodi ya moja kwa moja', blurb: 'Wasimamizi na wamiliki huona shughuli za mali moja au nyingi papo hapo.' },
  ],
  whyHeading: 'Usalama na urahisi, pamoja',
  whyPoints: [
    'Hakuna tena daftari la karatasi — kila kuingia ni kidijitali na kunatafutika.',
    'Inafanya kazi kwa simu ambazo walinzi wako tayari wanazo.',
    'Ufikiaji kulingana na majukumu kwa wamiliki, wasimamizi, walinzi.',
    'Simamia block moja au mali nyingi kutoka akaunti moja.',
  ],
  pricingHeading: 'Bei rahisi na wazi',
  pricingSub: 'Chagua mpango unaolingana na ukubwa wa mali yako. Hakuna ada zilizofichwa.',
  pricingCta: 'Omba Demo',
  perMonth: '/mwezi',
  faqHeading: 'Maswali yanayoulizwa mara kwa mara',
  faqs: [
    { q: 'Usanidi huchukua muda gani?', a: 'Mali nyingi huanza kutumia ndani ya siku moja — tunaunda akaunti, tunaongeza block na nyumba, na kufundisha walinzi.' },
    { q: 'Tunahitaji vifaa maalum?', a: 'Hapana. Lango inafanya kazi kwa simu janja au tableti yoyote ya kisasa ambayo walinzi tayari wanatumia.' },
    { q: 'Nani anamiliki data?', a: 'Wewe. Rekodi za wageni na wakazi ni za mali yako na haziuzwi kamwe.' },
    { q: 'Inaweza kushughulikia mali zaidi ya moja?', a: 'Ndiyo. Wamiliki na wasimamizi wanaweza kusimamia mali nyingi kutoka kuingia kumoja.' },
  ],
  form: {
    heading: 'Omba demo bila malipo',
    sub: 'Tuambie kuhusu mali yako nasi tutakuonyesha Lango ikifanya kazi.',
    name: 'Jina lako', propertyName: 'Jina la mali', propertyType: 'Aina ya mali',
    phone: 'Namba ya simu', email: 'Barua pepe (si lazima)', message: 'Kitu kingine? (si lazima)',
    submit: 'Omba Demo', success: 'Asante! Tutawasiliana nawe hivi karibuni.', error: 'Kuna hitilafu. Tafadhali jaribu WhatsApp.',
    or: 'au wasiliana nasi moja kwa moja', whatsapp: 'Piga soga WhatsApp', call: 'Tupigie simu', emailUs: 'Tutumie barua pepe',
    typeOptions: ['Makazi', 'Biashara', 'Taasisi', 'Viwanda', 'Nyingine'],
  },
  footerTagline: 'Usimamizi wa wageni na lango kwa kila mali.',
}

export const STRINGS: Record<LandingLang, LandingCopy> = { en, sw }
```

- [ ] **Step 2: Write the failing key-parity test**

Create `src/pages/landing/i18n.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { STRINGS } from './i18n'

function keyShape(obj: unknown): unknown {
  if (Array.isArray(obj)) return `array:${obj.length}`
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.keys(obj).sort().map(k => [k, keyShape((obj as Record<string, unknown>)[k])]))
  }
  return typeof obj
}

describe('landing i18n', () => {
  it('EN and SW have identical key structure', () => {
    expect(keyShape(STRINGS.sw)).toEqual(keyShape(STRINGS.en))
  })
  it('every array has matching length across languages', () => {
    expect(STRINGS.sw.segments).toHaveLength(STRINGS.en.segments.length)
    expect(STRINGS.sw.features).toHaveLength(STRINGS.en.features.length)
    expect(STRINGS.sw.faqs).toHaveLength(STRINGS.en.faqs.length)
    expect(STRINGS.sw.form.typeOptions).toHaveLength(STRINGS.en.form.typeOptions.length)
  })
})
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run src/pages/landing/i18n.test.ts`
Expected: PASS (both languages authored above with matching shape).

- [ ] **Step 4: Commit**

```bash
git add src/pages/landing/i18n.ts src/pages/landing/i18n.test.ts
git commit -m "feat(landing): bilingual EN/SW copy dictionary with parity test"
```

---

## Task 4: Lead form schema + payload builder (pure, TDD)

**Files:**
- Create: `src/pages/landing/leadForm.ts`
- Create: `src/pages/landing/leadForm.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/pages/landing/leadForm.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { leadFormSchema, buildLeadPayload, isHoneypotTripped } from './leadForm'

const valid = { name: 'Jane', propertyName: 'Palm Court', propertyType: 'Residential', phone: '0712345678', email: '', message: '', company_website: '' }

describe('leadFormSchema', () => {
  it('accepts a valid submission', () => {
    expect(leadFormSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects a missing name', () => {
    expect(leadFormSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })
  it('rejects an invalid Kenyan phone', () => {
    expect(leadFormSchema.safeParse({ ...valid, phone: '123' }).success).toBe(false)
  })
})

describe('isHoneypotTripped', () => {
  it('is true when the honeypot is filled', () => {
    expect(isHoneypotTripped({ ...valid, company_website: 'bot' })).toBe(true)
  })
  it('is false when empty', () => {
    expect(isHoneypotTripped(valid)).toBe(false)
  })
})

describe('buildLeadPayload', () => {
  it('builds a well-formed payload and drops the honeypot + empty optionals', () => {
    const p = buildLeadPayload(valid)
    expect(p).toEqual({
      name: 'Jane', propertyName: 'Palm Court', propertyType: 'Residential',
      phone: '+254712345678', source: 'LANDING_FORM', status: 'NEW',
    })
    expect('company_website' in p).toBe(false)
  })
  it('includes email and message when provided', () => {
    const p = buildLeadPayload({ ...valid, email: 'a@b.com', message: 'hi' })
    expect(p.email).toBe('a@b.com')
    expect(p.message).toBe('hi')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/pages/landing/leadForm.test.ts`
Expected: FAIL ("Cannot find module './leadForm'").

- [ ] **Step 3: Implement `leadForm.ts`**

```ts
import { z } from 'zod'
import { normalizeKenyanPhone } from '../../utils/phone'

export const leadFormSchema = z.object({
  name:         z.string().trim().min(1, 'Your name is required').max(120),
  propertyName: z.string().trim().min(1, 'Property name is required').max(120),
  propertyType: z.string().trim().min(1, 'Select a property type'),
  phone:        z.string().trim().refine(v => normalizeKenyanPhone(v) !== null, 'Enter a valid Kenyan phone number'),
  email:        z.string().trim().email('Enter a valid email').or(z.literal('')).optional(),
  message:      z.string().trim().max(1000).optional(),
  company_website: z.string().optional(), // honeypot — must stay empty
})

export type LeadFormValues = z.infer<typeof leadFormSchema>

export function isHoneypotTripped(v: Pick<LeadFormValues, 'company_website'>): boolean {
  return !!v.company_website && v.company_website.trim().length > 0
}

export interface LeadPayload {
  name: string
  propertyName: string
  propertyType: string
  phone: string
  email?: string
  message?: string
  source: 'LANDING_FORM'
  status: 'NEW'
}

export function buildLeadPayload(v: LeadFormValues): LeadPayload {
  const payload: LeadPayload = {
    name: v.name.trim(),
    propertyName: v.propertyName.trim(),
    propertyType: v.propertyType.trim(),
    phone: normalizeKenyanPhone(v.phone) ?? v.phone.trim(),
    source: 'LANDING_FORM',
    status: 'NEW',
  }
  if (v.email && v.email.trim()) payload.email = v.email.trim()
  if (v.message && v.message.trim()) payload.message = v.message.trim()
  return payload
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/pages/landing/leadForm.test.ts`
Expected: PASS (6 tests).

> If the payload phone assertion fails, confirm `normalizeKenyanPhone('0712345678')` returns `'+254712345678'` by checking `src/utils/phone.ts`; adjust the expected value in the test to match the util's actual output.

- [ ] **Step 5: Commit**

```bash
git add src/pages/landing/leadForm.ts src/pages/landing/leadForm.test.ts
git commit -m "feat(landing): lead form schema, honeypot, payload builder"
```

---

## Task 5: Lead service

**Files:**
- Create: `src/services/leadService.ts`

- [ ] **Step 1: Implement the service**

```ts
import { addDoc, serverTimestamp } from 'firebase/firestore'
import { leadsCol } from '../firebase/collections'
import { buildLeadPayload, type LeadFormValues } from '../pages/landing/leadForm'

/** Writes a demo-request lead from the public landing form. */
export async function createLead(values: LeadFormValues): Promise<void> {
  const payload = buildLeadPayload(values)
  await addDoc(leadsCol, { ...payload, createdAt: serverTimestamp() } as never)
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/services/leadService.ts
git commit -m "feat(landing): createLead service"
```

---

## Task 6: Contact config + link helpers

**Files:**
- Create: `src/pages/landing/config.ts`

- [ ] **Step 1: Implement config + helpers**

```ts
// ⚠️ REPLACE these placeholders with real Lango contact details before launch.
export const LANDING_CONTACT = {
  whatsappNumber: '254700000000', // international format, no '+'
  phone: '+254 700 000 000',
  email: 'hello@lango.co.ke',
}

export function waLink(message?: string): string {
  const base = `https://wa.me/${LANDING_CONTACT.whatsappNumber}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export const telLink = `tel:${LANDING_CONTACT.phone.replace(/\s/g, '')}`
export const mailtoLink = `mailto:${LANDING_CONTACT.email}`
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/landing/config.ts
git commit -m "feat(landing): contact config and link helpers (placeholders)"
```

---

## Task 7: Reveal wrapper

**Files:**
- Create: `src/pages/landing/components/Reveal.tsx`

- [ ] **Step 1: Implement Reveal**

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Fades + lifts children into view once on scroll. Degrades to visible if unsupported. */
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); obs.disconnect() }
    }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/landing/components/Reveal.tsx
git commit -m "feat(landing): scroll-reveal wrapper"
```

---

## Task 8: Section components (nav, hero, segments, how-it-works)

**Files:**
- Create: `src/pages/landing/sections/LandingNav.tsx`, `Hero.tsx`, `Segments.tsx`, `HowItWorks.tsx`

All sections receive `t: LandingCopy` (and nav also `lang`/`setLang`).

- [ ] **Step 1: LandingNav**

```tsx
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import type { LandingCopy, LandingLang } from '../i18n'
import { waLink } from '../config'

export function LandingNav({ t, lang, setLang }: { t: LandingCopy; lang: LandingLang; setLang: (l: LandingLang) => void }) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-lango-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="font-bold text-lango-dark tracking-wide">LANGO</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {(['en', 'sw'] as LandingLang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1.5 font-medium ${lang === l ? 'bg-lango-primary text-white' : 'text-gray-600'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-lango-primary px-2">{t.nav.signIn}</Link>
          <a href={waLink(t.form.heading)} target="_blank" rel="noreferrer" className="btn-primary text-sm hidden sm:inline-flex">{t.nav.bookDemo}</a>
          <a href="#demo" className="btn-primary text-sm sm:hidden p-2" aria-label={t.nav.bookDemo}><Menu className="w-4 h-4" /></a>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Hero**

```tsx
import { MessageCircle } from 'lucide-react'
import type { LandingCopy } from '../i18n'
import { waLink } from '../config'
import { Reveal } from '../components/Reveal'
import hero from '../../../assets/hero.png'

export function Hero({ t }: { t: LandingCopy }) {
  return (
    <section className="bg-gradient-to-b from-lango-light to-white">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-lango-secondary bg-white px-3 py-1 rounded-full border border-lango-primary/10">{t.hero.badge}</span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-lango-dark leading-tight">{t.hero.title}</h1>
          <p className="mt-4 text-lg text-gray-600">{t.hero.subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={waLink(t.form.heading)} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> {t.hero.ctaPrimary}
            </a>
            <a href="#pricing" className="btn-secondary">{t.hero.ctaSecondary}</a>
          </div>
          <p className="mt-4 text-xs text-gray-400">{t.hero.trust}</p>
        </Reveal>
        <Reveal delay={120} className="hidden lg:block">
          <img src={hero} alt="Lango gate management" className="w-full rounded-2xl shadow-card-hover" />
        </Reveal>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Segments**

```tsx
import { Home, Building2, GraduationCap, Factory, type LucideIcon } from 'lucide-react'
import type { LandingCopy } from '../i18n'
import { Reveal } from '../components/Reveal'

const icons: LucideIcon[] = [Home, Building2, GraduationCap, Factory]

export function Segments({ t }: { t: LandingCopy }) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <Reveal><h2 className="text-3xl font-bold text-lango-dark text-center">{t.segmentsHeading}</h2></Reveal>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {t.segments.map((s, i) => {
          const Icon = icons[i] ?? Home
          return (
            <Reveal key={s.title} delay={i * 80}>
              <div className="card p-6 h-full">
                <div className="w-11 h-11 rounded-xl bg-lango-light flex items-center justify-center"><Icon className="w-5 h-5 text-lango-primary" /></div>
                <h3 className="mt-4 font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500">{s.blurb}</p>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: HowItWorks**

```tsx
import type { LandingCopy } from '../i18n'
import { Reveal } from '../components/Reveal'

export function HowItWorks({ t }: { t: LandingCopy }) {
  return (
    <section className="bg-lango-dark text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <Reveal><h2 className="text-3xl font-bold text-center">{t.howHeading}</h2></Reveal>
        <div className="mt-10 grid sm:grid-cols-3 gap-6">
          {t.steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <div className="text-center px-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-lango-accent text-lango-dark font-bold flex items-center justify-center text-lg">{i + 1}</div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-white/70">{s.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Verify typecheck & commit**

Run: `npx tsc -b` → Expected: exit 0.

```bash
git add src/pages/landing/sections/LandingNav.tsx src/pages/landing/sections/Hero.tsx src/pages/landing/sections/Segments.tsx src/pages/landing/sections/HowItWorks.tsx
git commit -m "feat(landing): nav, hero, segments, how-it-works sections"
```

---

## Task 9: Section components (features, why, pricing, faq, footer)

**Files:**
- Create: `src/pages/landing/sections/Features.tsx`, `WhyLango.tsx`, `Pricing.tsx`, `Faq.tsx`, `LandingFooter.tsx`

- [ ] **Step 1: Features**

```tsx
import { UserCheck, MessageCircle, Package, AlertTriangle, ClipboardList, LayoutDashboard, type LucideIcon } from 'lucide-react'
import type { LandingCopy } from '../i18n'
import { Reveal } from '../components/Reveal'

const icons: LucideIcon[] = [UserCheck, MessageCircle, Package, AlertTriangle, ClipboardList, LayoutDashboard]

export function Features({ t }: { t: LandingCopy }) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <Reveal><h2 className="text-3xl font-bold text-lango-dark text-center">{t.featuresHeading}</h2></Reveal>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {t.features.map((f, i) => {
          const Icon = icons[i] ?? UserCheck
          return (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <div className="card p-6 h-full">
                <Icon className="w-6 h-6 text-lango-primary" />
                <h3 className="mt-3 font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500">{f.blurb}</p>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: WhyLango**

```tsx
import { CheckCircle2 } from 'lucide-react'
import type { LandingCopy } from '../i18n'
import { Reveal } from '../components/Reveal'

export function WhyLango({ t }: { t: LandingCopy }) {
  return (
    <section className="bg-lango-light">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <Reveal><h2 className="text-3xl font-bold text-lango-dark text-center">{t.whyHeading}</h2></Reveal>
        <div className="mt-10 max-w-2xl mx-auto grid sm:grid-cols-2 gap-4">
          {t.whyPoints.map((p, i) => (
            <Reveal key={p} delay={(i % 2) * 80}>
              <div className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-100">
                <CheckCircle2 className="w-5 h-5 text-lango-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Pricing** (reads real `SUBSCRIPTION_PLANS`)

```tsx
import { Check } from 'lucide-react'
import type { LandingCopy } from '../i18n'
import { SUBSCRIPTION_PLANS } from '../../../types'
import { waLink } from '../config'
import { Reveal } from '../components/Reveal'

export function Pricing({ t }: { t: LandingCopy }) {
  const plans = Object.values(SUBSCRIPTION_PLANS)
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-4 py-16">
      <Reveal>
        <h2 className="text-3xl font-bold text-lango-dark text-center">{t.pricingHeading}</h2>
        <p className="mt-2 text-center text-gray-500">{t.pricingSub}</p>
      </Reveal>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((p, i) => (
          <Reveal key={p.planId} delay={i * 70}>
            <div className={`card p-6 h-full flex flex-col ${p.planId === 'MEDIUM' ? 'ring-2 ring-lango-primary' : ''}`}>
              <h3 className="font-semibold text-gray-900">{p.name}</h3>
              <p className="mt-2 text-2xl font-bold text-lango-primary">KES {p.monthlyPrice.toLocaleString()}<span className="text-xs font-normal text-gray-400">{t.perMonth}</span></p>
              <ul className="mt-4 space-y-2 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600"><Check className="w-3.5 h-3.5 text-lango-accent flex-shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <a href={waLink(`${t.pricingCta}: ${p.name}`)} target="_blank" rel="noreferrer" className="btn-primary text-sm mt-5 justify-center">{t.pricingCta}</a>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Faq**

```tsx
import type { LandingCopy } from '../i18n'
import { Reveal } from '../components/Reveal'

export function Faq({ t }: { t: LandingCopy }) {
  return (
    <section className="bg-lango-light">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Reveal><h2 className="text-3xl font-bold text-lango-dark text-center">{t.faqHeading}</h2></Reveal>
        <div className="mt-8 space-y-3">
          {t.faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="card p-5 group">
                <summary className="font-medium text-gray-900 cursor-pointer list-none flex justify-between items-center">
                  {f.q}<span className="text-lango-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-2 text-sm text-gray-500">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: LandingFooter**

```tsx
import { Link } from 'react-router-dom'
import type { LandingCopy } from '../i18n'
import { LANDING_CONTACT, waLink, telLink, mailtoLink } from '../config'

export function LandingFooter({ t }: { t: LandingCopy }) {
  return (
    <footer className="bg-lango-dark text-white/80">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center"><span className="font-bold text-sm text-white">L</span></div>
            <span className="font-bold text-white tracking-wide">LANGO</span>
          </div>
          <p className="mt-3 text-sm max-w-xs">{t.footerTagline}</p>
        </div>
        <div className="text-sm space-y-2">
          <a href={waLink()} target="_blank" rel="noreferrer" className="block hover:text-white">WhatsApp</a>
          <a href={telLink} className="block hover:text-white">{LANDING_CONTACT.phone}</a>
          <a href={mailtoLink} className="block hover:text-white">{LANDING_CONTACT.email}</a>
          <Link to="/login" className="block hover:text-white">{t.nav.signIn}</Link>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">© 2026 Lango. All rights reserved.</div>
    </footer>
  )
}
```

- [ ] **Step 6: Verify typecheck & commit**

Run: `npx tsc -b` → Expected: exit 0.

```bash
git add src/pages/landing/sections/Features.tsx src/pages/landing/sections/WhyLango.tsx src/pages/landing/sections/Pricing.tsx src/pages/landing/sections/Faq.tsx src/pages/landing/sections/LandingFooter.tsx
git commit -m "feat(landing): features, why, pricing, faq, footer sections"
```

---

## Task 10: LeadForm section

**Files:**
- Create: `src/pages/landing/sections/LeadForm.tsx`

- [ ] **Step 1: Implement the form**

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MessageCircle, Phone, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import type { LandingCopy } from '../i18n'
import { leadFormSchema, isHoneypotTripped, type LeadFormValues } from '../leadForm'
import { createLead } from '../../../services/leadService'
import { waLink, telLink, mailtoLink } from '../config'
import { Spinner } from '../../../components/ui/LoadingScreen'

export function LeadForm({ t }: { t: LandingCopy }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<LeadFormValues>({ resolver: zodResolver(leadFormSchema) })

  const onSubmit = async (values: LeadFormValues) => {
    if (isHoneypotTripped(values)) { reset(); return } // silently drop bots
    try {
      await createLead(values)
      toast.success(t.form.success)
      reset()
    } catch (err) {
      console.error('Lead submit failed', err)
      toast.error(t.form.error)
    }
  }

  return (
    <section id="demo" className="max-w-5xl mx-auto px-4 py-16">
      <div className="card p-6 sm:p-10 grid lg:grid-cols-2 gap-10">
        <div>
          <h2 className="text-3xl font-bold text-lango-dark">{t.form.heading}</h2>
          <p className="mt-2 text-gray-500">{t.form.sub}</p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-400">{t.form.or}</p>
          <div className="mt-3 space-y-2">
            <a href={waLink(t.form.heading)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-lango-primary font-medium"><MessageCircle className="w-4 h-4" /> {t.form.whatsapp}</a>
            <a href={telLink} className="flex items-center gap-2 text-sm text-gray-700"><Phone className="w-4 h-4" /> {t.form.call}</a>
            <a href={mailtoLink} className="flex items-center gap-2 text-sm text-gray-700"><Mail className="w-4 h-4" /> {t.form.emailUs}</a>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* honeypot — visually hidden, off-screen; bots fill it */}
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
            className="absolute -left-[9999px] w-px h-px" {...register('company_website')} />

          <Field label={t.form.name} error={errors.name?.message}>
            <input className="input" {...register('name')} />
          </Field>
          <Field label={t.form.propertyName} error={errors.propertyName?.message}>
            <input className="input" {...register('propertyName')} />
          </Field>
          <Field label={t.form.propertyType} error={errors.propertyType?.message}>
            <select className="input" defaultValue="" {...register('propertyType')}>
              <option value="" disabled>—</option>
              {t.form.typeOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label={t.form.phone} error={errors.phone?.message}>
            <input className="input" inputMode="tel" {...register('phone')} />
          </Field>
          <Field label={t.form.email} error={errors.email?.message}>
            <input className="input" {...register('email')} />
          </Field>
          <Field label={t.form.message} error={errors.message?.message}>
            <textarea rows={3} className="input" {...register('message')} />
          </Field>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
            {isSubmitting ? <Spinner /> : t.form.submit}
          </button>
        </form>
      </div>
    </section>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <span className="text-xs text-red-500 mt-0.5 block">{error}</span>}
    </label>
  )
}
```

- [ ] **Step 2: Ensure an `.input` utility exists**

Run: `grep -n "\.input" src/index.css src/assets/*.css 2>/dev/null`
- If it exists, do nothing.
- If it does NOT exist, add to the global stylesheet that holds `.btn-primary` (find with `grep -rln "btn-primary" src --include="*.css"`), inside the same `@layer components` block:

```css
.input { @apply w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-lango-primary/30 focus:border-lango-primary; }
```

- [ ] **Step 3: Verify typecheck & commit**

Run: `npx tsc -b` → Expected: exit 0.

```bash
git add src/pages/landing/sections/LeadForm.tsx src/index.css
git commit -m "feat(landing): lead form with WhatsApp/call/email + honeypot"
```

> If `.input` already existed and no CSS changed, drop `src/index.css` from the `git add`.

---

## Task 11: LandingPage composition

**Files:**
- Create: `src/pages/landing/LandingPage.tsx`

- [ ] **Step 1: Implement composition**

```tsx
import { useState } from 'react'
import { STRINGS, type LandingLang } from './i18n'
import { LandingNav } from './sections/LandingNav'
import { Hero } from './sections/Hero'
import { Segments } from './sections/Segments'
import { HowItWorks } from './sections/HowItWorks'
import { Features } from './sections/Features'
import { WhyLango } from './sections/WhyLango'
import { Pricing } from './sections/Pricing'
import { Faq } from './sections/Faq'
import { LeadForm } from './sections/LeadForm'
import { LandingFooter } from './sections/LandingFooter'

export default function LandingPage() {
  const [lang, setLang] = useState<LandingLang>('en')
  const t = STRINGS[lang]
  return (
    <div className="min-h-screen bg-white">
      <LandingNav t={t} lang={lang} setLang={setLang} />
      <main>
        <Hero t={t} />
        <Segments t={t} />
        <HowItWorks t={t} />
        <Features t={t} />
        <WhyLango t={t} />
        <Pricing t={t} />
        <Faq t={t} />
        <LeadForm t={t} />
      </main>
      <LandingFooter t={t} />
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck & commit**

Run: `npx tsc -b` → Expected: exit 0.

```bash
git add src/pages/landing/LandingPage.tsx
git commit -m "feat(landing): compose landing page"
```

---

## Task 12: Route the landing page at `/`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import LandingPage**

Add near the other page imports:

```tsx
import LandingPage from './pages/landing/LandingPage'
```

- [ ] **Step 2: Render landing for anonymous visitors**

Replace the existing `RootRedirect` function body so it shows the landing page when logged out:

```tsx
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to={roleHome(user.role)} replace />
  return <LandingPage />
}
```

Leave the `<Route path="/" element={<RootRedirect />} />` and `<Route path="*" ... />` as-is (the `*` route keeps redirecting unknown paths; that's fine).

- [ ] **Step 3: Verify build**

Run: `npx vite build`
Expected: `✓ built` with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(landing): serve landing page at / for logged-out visitors"
```

---

## Task 13: Admin Leads page + nav

**Files:**
- Create: `src/pages/admin/LeadsPage.tsx`
- Modify: `src/components/layouts/AdminLayout.tsx` (navItems + icon import)
- Modify: `src/App.tsx` (import + route)

- [ ] **Step 1: Implement LeadsPage**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, orderBy, limit, updateDoc } from 'firebase/firestore'
import { leadsCol, leadDoc } from '../../firebase/collections'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Inbox } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Lead, LeadStatus } from '../../types'

const statusBadge: Record<LeadStatus, string> = { NEW: 'badge-blue', CONTACTED: 'badge-yellow', CLOSED: 'badge-gray' }

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | LeadStatus>('ALL')

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(query(leadsCol, orderBy('createdAt', 'desc'), limit(200)))
        setLeads(snap.docs.map(d => ({ ...d.data(), leadId: d.id })))
      } catch (err) {
        console.error('Leads load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const shown = useMemo(() => filter === 'ALL' ? leads : leads.filter(l => l.status === filter), [leads, filter])

  const setStatus = async (lead: Lead, status: LeadStatus) => {
    try {
      await updateDoc(leadDoc(lead.leadId), { status })
      setLeads(prev => prev.map(l => l.leadId === lead.leadId ? { ...l, status } : l))
    } catch (err) {
      console.error(err); toast.error('Could not update lead')
    }
  }

  if (loading) return <PageLoader />
  const filters: ('ALL' | LeadStatus)[] = ['ALL', 'NEW', 'CONTACTED', 'CLOSED']

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Demo requests from the landing page.</p>
        </div>
        <div className="flex gap-1">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${filter === f ? 'bg-lango-primary text-white border-lango-primary' : 'border-gray-200 text-gray-600'}`}>
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50"><h3 className="section-title mb-0">Requests ({shown.length})</h3></div>
        {shown.length === 0 ? (
          <EmptyState icon={Inbox} title="No leads yet" description="Demo requests from the landing page will appear here." />
        ) : (
          <div className="divide-y divide-gray-50">
            {shown.map(l => (
              <div key={l.leadId} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{l.name}</p>
                    <span className={`badge ${statusBadge[l.status]}`}>{l.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{l.propertyName} · {l.propertyType} · {l.phone}{l.email ? ` · ${l.email}` : ''}</p>
                  {l.message && <p className="text-xs text-gray-400 mt-1">{l.message}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">{l.createdAt ? format(l.createdAt.toDate(), 'dd MMM yyyy, h:mm a') : ''}</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {l.status !== 'CONTACTED' && <button onClick={() => setStatus(l, 'CONTACTED')} className="btn-secondary text-xs">Mark contacted</button>}
                  {l.status !== 'CLOSED' && <button onClick={() => setStatus(l, 'CLOSED')} className="btn-ghost text-xs">Close</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the Admin nav item**

In `src/components/layouts/AdminLayout.tsx`, add `Inbox` to the lucide-react import, then add to `navItems` after the Subscriptions entry:

```tsx
  { to: '/admin/leads',         label: 'Leads',         icon: Inbox },
```

- [ ] **Step 3: Register the route**

In `src/App.tsx`, add the import:

```tsx
import LeadsPage from './pages/admin/LeadsPage'
```

and inside the `/admin` route block add:

```tsx
        <Route path="leads" element={<LeadsPage />} />
```

- [ ] **Step 4: Verify build**

Run: `npx vite build`
Expected: `✓ built` with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/LeadsPage.tsx src/components/layouts/AdminLayout.tsx src/App.tsx
git commit -m "feat(admin): leads inbox for landing-page demo requests"
```

---

## Task 14: Final verification

- [ ] **Step 1: Full typecheck**

Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 2: Lint (no new warnings in landing/admin)**

Run: `npx oxlint src/pages/landing/ src/pages/admin/ src/services/leadService.ts`
Expected: no errors; no new warnings beyond the pre-existing `BlockFormPage` one.

- [ ] **Step 3: Tests**

Run: `npx vitest run`
Expected: all pass (existing 38 + new i18n + leadForm tests).

- [ ] **Step 4: Build**

Run: `npx vite build`
Expected: `✓ built`.

- [ ] **Step 5: Manual smoke (user-run)**

Run: `npm run dev`, then:
- Visit `/` logged out → landing page renders; toggle EN/SW flips all copy.
- Click "Book a Free Demo" → opens WhatsApp to the configured number.
- Submit the lead form → success toast.
- Log in as Super Admin → `/admin/leads` shows the submission; "Mark contacted"/"Close" update the badge.
- Log in as any role and visit `/` → redirected to the role dashboard (no landing page).

- [ ] **Step 6: Final commit (if any CSS/tweaks pending)**

```bash
git add -A && git commit -m "chore(landing): final verification pass"
```

---

## Self-Review Notes

- **Spec coverage:** routing (T12), bilingual EN/SW (T3), all four segments (T8), all-in-one positioning copy (T3), WhatsApp + form CTA (T6/T10), Firestore-direct lead storage + honeypot (T2/T4/T5), admin viewer (T13), pricing from `SUBSCRIPTION_PLANS` (T9), FAQ (T9). All present.
- **Type consistency:** `LeadFormValues`/`buildLeadPayload`/`LeadPayload` (T4) consumed unchanged in `createLead` (T5); `Lead`/`LeadStatus` (T1) consumed in `LeadsPage` (T13); `LandingCopy`/`LandingLang` (T3) consumed by every section. `leadDoc`/`leadsCol` (T1) used in T5/T13.
- **Known placeholder (intentional):** `LANDING_CONTACT` values in T6 are flagged for the user to replace; not a plan defect.
