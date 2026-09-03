# Lango — Running Foundation + Super Admin (Phases 1–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing non-running Lango scaffolding into a working multi-tenant SaaS where a seeded Super Admin logs in (email or phone), is forced to change a temp password, and can fully manage Properties, Blocks (with auto-generated Units), and Staff — all backed by real Cloud Functions that mint custom claims server-side.

**Architecture:** React 19 + Vite + Tailwind client (already ~90% built as isolated pages) gets wired together in `App.tsx` behind a role-gated router. Privileged operations (creating staff, setting `{role, propertyId}` custom claims, phone→email resolution) run in Firebase v2 Callable Cloud Functions using the Admin SDK. Firestore uses flat top-level collections keyed by `propertyId`, isolated by existing security rules that read claims. A local Admin-SDK seed script provisions the first Super Admin and a demo property.

**Tech Stack:** React 19, react-router-dom 7, react-hook-form 7 + zod 4, react-query 5, Firebase 12 (Auth/Firestore/Functions/Storage), firebase-functions v2 + firebase-admin (Node 20), Vitest (utils only), Tailwind 3.

**Testing note:** TDD is applied to the pure, deterministic utilities (`generateUnitNumbers`, `normalizeKenyanPhone`) where it adds real value. Cloud Functions and UI wiring are verified via a strict typecheck + build gate and explicit manual end-to-end checkpoints, because component/emulator integration tests would be brittle and out of scope for this milestone.

**Assumed environment facts (verified during brainstorming):**
- Existing files are correct and kept: `src/types/index.ts`, `src/contexts/AuthContext.tsx`, `src/contexts/OnlineContext.tsx`, `firestore.rules`, `src/firebase/config.ts`, `src/firebase/collections.ts`, all `src/components/ui/*`, all `src/components/layouts/*`, `src/components/ProtectedRoute.tsx`, and all existing pages.
- Export shapes to rely on: layouts are **named** exports (`AdminLayout`, `CaretakerLayout`, `GuardLayout`, `PropertyManagerLayout`); pages are **default** exports; `OnlineProvider`/`useOnline` from `OnlineContext`; `Spinner`/`PageLoader`/`LoadingScreen` from `ui/LoadingScreen`.
- `.env` already contains real Firebase config values. `VITE_FIREBASE_PROJECT_ID` holds the real project id.
- Dedicated git repo already initialised at `Documents/Lango` (baseline committed).

---

## Stage 0 — Firebase project scaffold & test tooling

### Task 0.1: Add Vitest for utility TDD

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Add dev deps and test script**

Run:
```bash
cd /home/jane-ngugi/Documents/Lango
npm install -D vitest@^2.1.0
```

- [ ] **Step 2: Add `test` script to `package.json`**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Verify runner works (no tests yet = success)**

Run: `npx vitest run`
Expected: exits 0 with "No test files found" (acceptable) OR passes. If it errors on config, fix before continuing.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for utility tests"
```

### Task 0.2: Firebase project config files

**Files:**
- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `firestore.indexes.json`
- Create: `storage.rules`

- [ ] **Step 1: Create `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "ui": { "enabled": true }
  }
}
```

- [ ] **Step 2: Create `.firebaserc` with the real project id**

Run (reads the project id from `.env` and writes `.firebaserc`):
```bash
cd /home/jane-ngugi/Documents/Lango
PID=$(grep VITE_FIREBASE_PROJECT_ID .env | cut -d= -f2 | tr -d '"' | xargs)
printf '{\n  "projects": {\n    "default": "%s"\n  }\n}\n' "$PID" > .firebaserc
cat .firebaserc
```
Expected: prints JSON with the real project id (not `your-project-id`).

- [ ] **Step 3: Create `firestore.indexes.json`**

```json
{
  "indexes": [
    { "collectionGroup": "blocks", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "propertyId", "order": "ASCENDING" },
      { "fieldPath": "name", "order": "ASCENDING" } ] },
    { "collectionGroup": "units", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "propertyId", "order": "ASCENDING" },
      { "fieldPath": "unitNumber", "order": "ASCENDING" } ] },
    { "collectionGroup": "visitors", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "propertyId", "order": "ASCENDING" },
      { "fieldPath": "checkInTime", "order": "DESCENDING" } ] },
    { "collectionGroup": "incidents", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "propertyId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" } ] }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 4: Create `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Authenticated staff can read/write photos scoped to their property folder.
    match /properties/{propertyId}/{allPaths=**} {
      allow read: if request.auth != null &&
        (request.auth.token.role == 'SUPER_ADMIN' || request.auth.token.propertyId == propertyId);
      allow write: if request.auth != null &&
        (request.auth.token.role == 'SUPER_ADMIN' || request.auth.token.propertyId == propertyId);
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add firebase.json .firebaserc firestore.indexes.json storage.rules
git commit -m "chore: add firebase project config (firestore, functions, storage, emulators)"
```

---

## Stage 1 — Pure utilities (TDD)

### Task 1.1: `generateUnitNumbers` (auto-generate units)

**Files:**
- Create: `src/utils/units.ts`
- Test: `src/utils/units.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { generateUnitNumbers } from './units'

describe('generateUnitNumbers', () => {
  it('pads to two digits for small blocks', () => {
    expect(generateUnitNumbers('A', 3)).toEqual(['A01', 'A02', 'A03'])
  })
  it('generates the exact count requested', () => {
    expect(generateUnitNumbers('B', 24)).toHaveLength(24)
    expect(generateUnitNumbers('B', 24)[23]).toBe('B24')
  })
  it('widens padding when count exceeds 99', () => {
    const units = generateUnitNumbers('C', 100)
    expect(units[0]).toBe('C001')
    expect(units[99]).toBe('C100')
  })
  it('uppercases the prefix and trims whitespace', () => {
    expect(generateUnitNumbers('  a ', 1)).toEqual(['A01'])
  })
  it('returns an empty array for non-positive counts', () => {
    expect(generateUnitNumbers('A', 0)).toEqual([])
    expect(generateUnitNumbers('A', -5)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/units.test.ts`
Expected: FAIL — "Failed to resolve import './units'".

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * Generate sequential unit numbers for a block, e.g. ('A', 24) -> ['A01' ... 'A24'].
 * Padding widens automatically so numbers stay fixed-width (min 2 digits).
 */
export function generateUnitNumbers(prefix: string, count: number): string[] {
  if (!Number.isFinite(count) || count < 1) return []
  const clean = prefix.trim().toUpperCase()
  const width = Math.max(2, String(count).length)
  return Array.from({ length: count }, (_, i) =>
    `${clean}${String(i + 1).padStart(width, '0')}`,
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/units.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/units.ts src/utils/units.test.ts
git commit -m "feat: add generateUnitNumbers utility with tests"
```

### Task 1.2: `normalizeKenyanPhone` + `isValidKenyanPhone`

**Files:**
- Create: `src/utils/phone.ts`
- Test: `src/utils/phone.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { normalizeKenyanPhone, isValidKenyanPhone } from './phone'

describe('normalizeKenyanPhone', () => {
  it('converts 07xx to +2547xx', () => {
    expect(normalizeKenyanPhone('0712345678')).toBe('+254712345678')
  })
  it('converts 01xx to +2541xx', () => {
    expect(normalizeKenyanPhone('0112345678')).toBe('+254112345678')
  })
  it('accepts already-normalised +254 numbers', () => {
    expect(normalizeKenyanPhone('+254712345678')).toBe('+254712345678')
  })
  it('accepts 254xxx without plus', () => {
    expect(normalizeKenyanPhone('254712345678')).toBe('+254712345678')
  })
  it('strips spaces, dashes and parentheses', () => {
    expect(normalizeKenyanPhone('0712 345 678')).toBe('+254712345678')
    expect(normalizeKenyanPhone('0712-345-678')).toBe('+254712345678')
  })
  it('returns null for invalid input', () => {
    expect(normalizeKenyanPhone('12345')).toBeNull()
    expect(normalizeKenyanPhone('abcdefghij')).toBeNull()
    expect(normalizeKenyanPhone('')).toBeNull()
  })
})

describe('isValidKenyanPhone', () => {
  it('is true for valid numbers, false otherwise', () => {
    expect(isValidKenyanPhone('0712345678')).toBe(true)
    expect(isValidKenyanPhone('nonsense')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/phone.test.ts`
Expected: FAIL — cannot resolve `./phone`.

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * Normalise a Kenyan mobile number to E.164 (+254XXXXXXXXX).
 * Accepts 07../01.. local, 2547../2541.., and +2547../+2541.. forms.
 * Returns null when the input is not a valid Kenyan mobile number.
 */
export function normalizeKenyanPhone(input: string): string | null {
  if (!input) return null
  const digits = input.replace(/[\s()\-]/g, '')
  // 07XXXXXXXX or 01XXXXXXXX  (10 digits, leading 0)
  let m = digits.match(/^0(7\d{8}|1\d{8})$/)
  if (m) return `+254${m[1]}`
  // 2547XXXXXXXX / 2541XXXXXXXX with optional leading +
  m = digits.match(/^\+?254(7\d{8}|1\d{8})$/)
  if (m) return `+254${m[1]}`
  return null
}

export function isValidKenyanPhone(input: string): boolean {
  return normalizeKenyanPhone(input) !== null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/phone.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/phone.ts src/utils/phone.test.ts
git commit -m "feat: add Kenyan phone normalisation utility with tests"
```

---

## Stage 2 — Cloud Functions (the custom-claims keystone)

### Task 2.1: Scaffold the `functions/` workspace

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/.gitignore`

- [ ] **Step 1: Create `functions/package.json`**

```json
{
  "name": "lango-functions",
  "private": true,
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "deploy": "firebase deploy --only functions"
  },
  "dependencies": {
    "firebase-admin": "^12.7.0",
    "firebase-functions": "^6.1.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `functions/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2021",
    "moduleResolution": "node",
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `functions/.gitignore`**

```
node_modules/
lib/
```

- [ ] **Step 4: Install function deps**

Run:
```bash
cd /home/jane-ngugi/Documents/Lango/functions && npm install
```
Expected: installs firebase-admin + firebase-functions with no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/jane-ngugi/Documents/Lango
git add functions/package.json functions/tsconfig.json functions/.gitignore functions/package-lock.json
git commit -m "chore: scaffold cloud functions workspace"
```

### Task 2.2: Shared helpers (phone + audit)

**Files:**
- Create: `functions/src/lib/phone.ts`
- Create: `functions/src/lib/audit.ts`

- [ ] **Step 1: Create `functions/src/lib/phone.ts`** (mirror of client util; functions build separately so cannot import from `src`)

```ts
export function normalizeKenyanPhone(input: string): string | null {
  if (!input) return null
  const digits = input.replace(/[\s()\-]/g, '')
  let m = digits.match(/^0(7\d{8}|1\d{8})$/)
  if (m) return `+254${m[1]}`
  m = digits.match(/^\+?254(7\d{8}|1\d{8})$/)
  if (m) return `+254${m[1]}`
  return null
}
```

- [ ] **Step 2: Create `functions/src/lib/audit.ts`**

```ts
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

interface AuditInput {
  actorId: string
  actorName: string
  actorRole: string
  propertyId: string | null
  action: string
  entityType: string
  entityId: string
  description: string
  metadata?: Record<string, unknown>
}

/** Write an immutable audit log entry. Never throws into the caller path. */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  const db = getFirestore()
  const ref = db.collection('auditLogs').doc()
  await ref.set({
    logId: ref.id,
    ...input,
    metadata: input.metadata ?? {},
    timestamp: FieldValue.serverTimestamp(),
  })
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /home/jane-ngugi/Documents/Lango/functions && npx tsc --noEmit`
Expected: no output (success). (Unused-in-isolation files are fine; they are imported next task.)

- [ ] **Step 4: Commit**

```bash
cd /home/jane-ngugi/Documents/Lango
git add functions/src/lib/phone.ts functions/src/lib/audit.ts
git commit -m "feat(functions): add phone + audit log helpers"
```

### Task 2.3: `createStaffUser` + `setUserClaims` + `resolvePhoneToEmail` + `bootstrapSuperAdmin`

**Files:**
- Create: `functions/src/index.ts`

- [ ] **Step 1: Create `functions/src/index.ts`**

```ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { normalizeKenyanPhone } from './lib/phone'
import { writeAuditLog } from './lib/audit'

initializeApp()
setGlobalOptions({ region: 'us-central1' })

type Role = 'SUPER_ADMIN' | 'PROPERTY_MANAGER' | 'CARETAKER' | 'SECURITY_GUARD'

function assertSuperAdmin(auth: { token?: { role?: string } } | undefined) {
  if (!auth || auth.token?.role !== 'SUPER_ADMIN') {
    throw new HttpsError('permission-denied', 'Only a Super Admin may perform this action.')
  }
}

function generateTempPassword(): string {
  // 12 chars: uppercase, lowercase, digits — always includes at least one of each.
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const nums = '23456789'
  const all = upper + lower + nums
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)]
  const chars = [pick(upper), pick(lower), pick(nums)]
  for (let i = 0; i < 9; i++) chars.push(pick(all))
  return chars.sort(() => Math.random() - 0.5).join('')
}

// ------------------------------------------------------------------
// createStaffUser — Super Admin creates a staff account with claims.
// ------------------------------------------------------------------
export const createStaffUser = onCall(async (request) => {
  assertSuperAdmin(request.auth)
  const { name, email, phone, role, propertyId, status } = request.data as {
    name: string; email: string; phone: string
    role: Exclude<Role, 'SUPER_ADMIN'>; propertyId: string; status: string
  }

  if (!name || !email || !phone || !role || !propertyId) {
    throw new HttpsError('invalid-argument', 'name, email, phone, role and propertyId are required.')
  }
  if (!['PROPERTY_MANAGER', 'CARETAKER', 'SECURITY_GUARD'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role.')
  }
  const normPhone = normalizeKenyanPhone(phone)
  if (!normPhone) throw new HttpsError('invalid-argument', 'Invalid Kenyan phone number.')

  const auth = getAuth()
  const db = getFirestore()
  const tempPassword = generateTempPassword()

  let uid: string
  try {
    const userRecord = await auth.createUser({
      email, password: tempPassword, displayName: name, phoneNumber: normPhone,
    })
    uid = userRecord.uid
  } catch (err: any) {
    if (err?.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'A user with this email already exists.')
    }
    if (err?.code === 'auth/phone-number-already-exists') {
      throw new HttpsError('already-exists', 'A user with this phone number already exists.')
    }
    throw new HttpsError('internal', err?.message ?? 'Failed to create user.')
  }

  // Custom claims are the ONLY trusted source of role/propertyId.
  await auth.setCustomUserClaims(uid, { role, propertyId })

  await db.collection('users').doc(uid).set({
    uid, name, email, phone: normPhone, role, propertyId,
    status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    tempPasswordSet: true,
    createdBy: request.auth!.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  await writeAuditLog({
    actorId: request.auth!.uid,
    actorName: (request.auth!.token.name as string) ?? 'Super Admin',
    actorRole: 'SUPER_ADMIN',
    propertyId,
    action: 'STAFF_CREATED',
    entityType: 'user',
    entityId: uid,
    description: `Created ${role} account for ${name}`,
  })

  return { uid, tempPassword }
})

// ------------------------------------------------------------------
// setUserClaims — reassign role/property; re-mints claims + mirrors profile.
// ------------------------------------------------------------------
export const setUserClaims = onCall(async (request) => {
  assertSuperAdmin(request.auth)
  const { uid, role, propertyId } = request.data as { uid: string; role: Role; propertyId: string | null }
  if (!uid || !role) throw new HttpsError('invalid-argument', 'uid and role are required.')

  await getAuth().setCustomUserClaims(uid, { role, propertyId: propertyId ?? null })
  await getFirestore().collection('users').doc(uid).update({
    role, propertyId: propertyId ?? null, updatedAt: FieldValue.serverTimestamp(),
  })
  return { ok: true }
})

// ------------------------------------------------------------------
// resolvePhoneToEmail — public, lets the login page sign in by phone.
// Returns ONLY the login email (no other PII).
// ------------------------------------------------------------------
export const resolvePhoneToEmail = onCall(async (request) => {
  const { phone } = request.data as { phone: string }
  const norm = normalizeKenyanPhone(phone ?? '')
  if (!norm) throw new HttpsError('invalid-argument', 'Invalid phone number.')

  const snap = await getFirestore()
    .collection('users').where('phone', '==', norm).limit(1).get()
  if (snap.empty) throw new HttpsError('not-found', 'No account found for that phone number.')

  return { email: snap.docs[0].data().email as string }
})

// ------------------------------------------------------------------
// bootstrapSuperAdmin — one-time, secret-guarded creation of the first admin.
// Disabled once any SUPER_ADMIN exists. Secret from env BOOTSTRAP_SECRET.
// ------------------------------------------------------------------
export const bootstrapSuperAdmin = onCall(async (request) => {
  const { secret, email, password, name } = request.data as {
    secret: string; email: string; password: string; name: string
  }
  if (!process.env.BOOTSTRAP_SECRET || secret !== process.env.BOOTSTRAP_SECRET) {
    throw new HttpsError('permission-denied', 'Invalid bootstrap secret.')
  }
  const db = getFirestore()
  const existing = await db.collection('users').where('role', '==', 'SUPER_ADMIN').limit(1).get()
  if (!existing.empty) throw new HttpsError('failed-precondition', 'A Super Admin already exists.')

  const userRecord = await getAuth().createUser({ email, password, displayName: name })
  await getAuth().setCustomUserClaims(userRecord.uid, { role: 'SUPER_ADMIN', propertyId: null })
  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid, name, email, role: 'SUPER_ADMIN', propertyId: null,
    status: 'ACTIVE', tempPasswordSet: false,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  })
  return { uid: userRecord.uid }
})
```

- [ ] **Step 2: Build the functions**

Run: `cd /home/jane-ngugi/Documents/Lango/functions && npm run build`
Expected: compiles to `lib/` with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd /home/jane-ngugi/Documents/Lango
git add functions/src/index.ts
git commit -m "feat(functions): createStaffUser, setUserClaims, resolvePhoneToEmail, bootstrapSuperAdmin"
```

- [ ] **Step 4: Deploy (requires the operator to be logged into firebase-tools)**

Run:
```bash
cd /home/jane-ngugi/Documents/Lango
npx firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```
Expected: deploys 4 callable functions + rules + indexes. If `firebase login` is required, the operator runs `! npx firebase login` in the session first.

---

## Stage 3 — Make the app run (wiring + typecheck fixes)

### Task 3.1: Fix all existing typecheck errors

**Files:**
- Modify: `src/pages/admin/AdminDashboard.tsx:4-5`
- Modify: `src/pages/admin/PropertyDetailPage.tsx:8-9`
- Modify: `src/pages/gate/RegisterVisitorPage.tsx:7`
- Modify: `src/pages/admin/PropertyFormPage.tsx:20-21,163-168`

- [ ] **Step 1: Remove unused imports in `AdminDashboard.tsx`**

Remove `UserCheck`, `Package` (line 4) and `TrendingUp` (line 5) from the `lucide-react` import list. Keep every icon that is actually referenced in JSX.

- [ ] **Step 2: Remove unused imports in `PropertyDetailPage.tsx`**

In the `lucide-react` import (lines 8–10) remove `Phone`, `Mail`, `Package`, `Activity` (they are imported but never used).

- [ ] **Step 3: Remove unused `doc` import in `RegisterVisitorPage.tsx:7`**

Remove `doc` from the `firebase/firestore` import list on line 7 (keep the others).

- [ ] **Step 4: Fix the zod resolver mismatch in `PropertyFormPage.tsx`**

Change the two numeric schema fields (lines 20–21) from coercion to plain numbers:
```ts
  numberOfBlocks: z.number({ message: 'At least 1 block required' }).min(1, 'At least 1 block required').max(50),
  totalUnits:     z.number({ message: 'At least 1 unit required' }).min(1, 'At least 1 unit required').max(9999),
```
Then register those inputs with `valueAsNumber` so RHF hands zod a real number (lines 163 & 168):
```tsx
<input {...register('numberOfBlocks', { valueAsNumber: true })} type="number" min={1} max={50} className="input" />
```
```tsx
<input {...register('totalUnits', { valueAsNumber: true })} type="number" min={1} className="input" />
```

- [ ] **Step 5: Run the full typecheck**

Run: `cd /home/jane-ngugi/Documents/Lango && npx tsc -b`
Expected: exits 0 with **no** errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/AdminDashboard.tsx src/pages/admin/PropertyDetailPage.tsx src/pages/gate/RegisterVisitorPage.tsx src/pages/admin/PropertyFormPage.tsx
git commit -m "fix: resolve typecheck errors (unused imports + zod number resolver)"
```

### Task 3.2: Wire providers in `main.tsx`

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Replace `src/main.tsx` entirely**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { OnlineProvider } from './contexts/OnlineContext'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OnlineProvider>
            <App />
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          </OnlineProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: 0 errors (App.tsx still the template — replaced next task).

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat: mount router + auth/online/query providers in main"
```

### Task 3.3: Replace `App.tsx` with the role-gated router

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/App.css` import (no longer used)

- [ ] **Step 1: Replace `src/App.tsx` entirely**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoadingScreen } from './components/ui/LoadingScreen'

import { AdminLayout } from './components/layouts/AdminLayout'
import { CaretakerLayout } from './components/layouts/CaretakerLayout'
import { GuardLayout } from './components/layouts/GuardLayout'
import { PropertyManagerLayout } from './components/layouts/PropertyManagerLayout'

import LoginPage from './pages/auth/LoginPage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'

import AdminDashboard from './pages/admin/AdminDashboard'
import PropertiesPage from './pages/admin/PropertiesPage'
import PropertyFormPage from './pages/admin/PropertyFormPage'
import PropertyDetailPage from './pages/admin/PropertyDetailPage'
import BlockFormPage from './pages/admin/BlockFormPage'
import StaffPage from './pages/admin/StaffPage'

import CaretakerDashboard from './pages/caretaker/CaretakerDashboard'
import GateDashboard from './pages/gate/GateDashboard'
import RegisterVisitorPage from './pages/gate/RegisterVisitorPage'

import type { UserRole } from './types'

function roleHome(role: UserRole | null): string {
  switch (role) {
    case 'SUPER_ADMIN':      return '/admin'
    case 'PROPERTY_MANAGER': return '/property'
    case 'CARETAKER':        return '/caretaker'
    case 'SECURITY_GUARD':   return '/gate'
    default:                 return '/login'
  }
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* SUPER ADMIN */}
      <Route
        path="/admin"
        element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminLayout /></ProtectedRoute>}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/new" element={<PropertyFormPage />} />
        <Route path="properties/:id" element={<PropertyDetailPage />} />
        <Route path="properties/:id/edit" element={<PropertyFormPage />} />
        <Route path="properties/:id/blocks/new" element={<BlockFormPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="staff/new" element={<StaffPage />} />
      </Route>

      {/* PROPERTY MANAGER (stubbed this milestone) */}
      <Route
        path="/property"
        element={<ProtectedRoute allowedRoles={['PROPERTY_MANAGER']}><PropertyManagerLayout /></ProtectedRoute>}
      >
        <Route index element={<CaretakerDashboard />} />
      </Route>

      {/* CARETAKER */}
      <Route
        path="/caretaker"
        element={<ProtectedRoute allowedRoles={['CARETAKER']}><CaretakerLayout /></ProtectedRoute>}
      >
        <Route index element={<CaretakerDashboard />} />
      </Route>

      {/* SECURITY GUARD */}
      <Route
        path="/gate"
        element={<ProtectedRoute allowedRoles={['SECURITY_GUARD']}><GuardLayout /></ProtectedRoute>}
      >
        <Route index element={<GateDashboard />} />
        <Route path="register" element={<RegisterVisitorPage />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
```

- [ ] **Step 2: Verify each layout renders an `<Outlet/>`**

Run: `grep -l Outlet src/components/layouts/*.tsx`
Expected: all four layout files listed. If any layout is missing `<Outlet />`, add `import { Outlet } from 'react-router-dom'` and place `<Outlet />` where page content belongs (inside the main content area).

- [ ] **Step 3: Typecheck (ChangePasswordPage & BlockFormPage not yet created — expect 2 missing-module errors)**

Run: `npx tsc -b`
Expected: FAILS with "Cannot find module './pages/auth/ChangePasswordPage'" and "./pages/admin/BlockFormPage". These are resolved in Stage 4 & 5. Do **not** commit yet.

- [ ] **Step 4: (No commit — App.tsx depends on pages created next.)**

### Task 3.4: Remove dead template assets

**Files:**
- Delete: `src/App.css`

- [ ] **Step 1: Delete the unused template stylesheet**

Run: `git rm src/App.css`
Expected: removed (App.tsx no longer imports it).

- [ ] **Step 2: Commit later with Stage 5** (App.tsx won't typecheck until pages exist).

---

## Stage 4 — Auth flows (phone login + forced password change)

### Task 4.1: Phone-or-email login + reactive redirect

**Files:**
- Modify: `src/pages/auth/LoginPage.tsx`

- [ ] **Step 1: Replace the schema, redirect, and submit logic**

Replace lines 1–68 of `LoginPage.tsx` (imports through the end of `onSubmit`) with the version below. This removes the `window.__lango_role`/`setTimeout` hack (a render-time `navigate` side effect — a bug), adds email-or-phone support via `resolvePhoneToEmail`, and redirects reactively with `<Navigate>`.

```tsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, User, Shield } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { useAuth } from '../../contexts/AuthContext'
import { functions } from '../../firebase/config'
import { Spinner } from '../../components/ui/LoadingScreen'
import { normalizeKenyanPhone } from '../../utils/phone'
import toast from 'react-hot-toast'
import type { UserRole } from '../../types'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password:   z.string().min(1, 'Password is required'),
})
type LoginForm = z.infer<typeof loginSchema>

function getRolePath(role: UserRole | null): string {
  switch (role) {
    case 'SUPER_ADMIN':      return '/admin'
    case 'PROPERTY_MANAGER': return '/property'
    case 'CARETAKER':        return '/caretaker'
    case 'SECURITY_GUARD':   return '/gate'
    default:                 return '/login'
  }
}

export default function LoginPage() {
  const { signIn, user } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  // Reactive redirect once auth state resolves. tempPassword users are then
  // bounced to /change-password by ProtectedRoute.
  if (user) return <Navigate to={getRolePath(user.role)} replace />

  const onSubmit = async (data: LoginForm) => {
    try {
      let email = data.identifier.trim()
      // If it isn't an email, treat it as a phone number and resolve it.
      if (!email.includes('@')) {
        const phone = normalizeKenyanPhone(email)
        if (!phone) { toast.error('Enter a valid email or Kenyan phone number'); return }
        const resolve = httpsCallable<{ phone: string }, { email: string }>(functions, 'resolvePhoneToEmail')
        const res = await resolve({ phone })
        email = res.data.email
      }
      await signIn(email, data.password)
      // AuthContext updates `user`; the <Navigate> above then redirects.
    } catch (error: any) {
      const code = error?.code as string
      if (code === 'functions/not-found') {
        toast.error('No account found for that phone number')
      } else if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(code)) {
        toast.error('Invalid credentials')
      } else if (code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later.')
      } else if (code === 'auth/user-disabled') {
        toast.error('This account has been disabled. Contact your administrator.')
      } else {
        toast.error('Login failed. Please try again.')
      }
    }
  }
```

- [ ] **Step 2: Update the identifier input field**

In the form JSX, change the email field so it binds to `identifier`, uses the `User` icon, and no longer forces `type="email"`:
```tsx
<label className="label">Email or phone number</label>
<div className="relative">
  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  <input
    {...register('identifier')}
    type="text"
    autoComplete="username"
    placeholder="you@example.com or 0712345678"
    className={`input pl-9 ${errors.identifier ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
  />
</div>
{errors.identifier && <p className="form-error">{errors.identifier.message}</p>}
```
Remove the now-unused `Mail` import (replaced by `User`).

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: still only the two missing-module errors (ChangePasswordPage, BlockFormPage). No new errors from LoginPage.

- [ ] **Step 4: Commit**

```bash
git add src/pages/auth/LoginPage.tsx
git commit -m "feat: email-or-phone login with reactive redirect"
```

### Task 4.2: Forced password change

**Files:**
- Create: `src/pages/auth/ChangePasswordPage.tsx`
- Modify: `src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Create `src/pages/auth/ChangePasswordPage.tsx`**

```tsx
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updatePassword } from 'firebase/auth'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { KeyRound } from 'lucide-react'
import { auth, db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { UserRole } from '../../types'

const schema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })
type FormData = z.infer<typeof schema>

function rolePath(role: UserRole | null): string {
  switch (role) {
    case 'SUPER_ADMIN':      return '/admin'
    case 'PROPERTY_MANAGER': return '/property'
    case 'CARETAKER':        return '/caretaker'
    case 'SECURITY_GUARD':   return '/gate'
    default:                 return '/login'
  }
}

export default function ChangePasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  if (!user) return <Navigate to="/login" replace />

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      if (!auth.currentUser) throw new Error('no-session')
      await updatePassword(auth.currentUser, data.password)
      await updateDoc(doc(db, 'users', user.uid), { tempPasswordSet: false, updatedAt: serverTimestamp() })
      await auth.currentUser.getIdToken(true) // refresh claims/profile view
      toast.success('Password updated')
      navigate(rolePath(user.role), { replace: true })
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log in again, then change your password.')
      } else {
        toast.error('Could not update password. Try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lango-dark via-lango-primary to-lango-secondary flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-lango-primary px-8 py-7 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-2xl mb-3">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">Set a new password</h1>
          <p className="text-white/70 text-xs mt-1">You must change your temporary password to continue</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-7 space-y-4">
          <div>
            <label className="label">New password</label>
            <input {...register('password')} type="password" autoComplete="new-password" className="input" placeholder="••••••••" />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input {...register('confirm')} type="password" autoComplete="new-password" className="input" placeholder="••••••••" />
            {errors.confirm && <p className="form-error">{errors.confirm.message}</p>}
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
            {saving && <Spinner size="sm" className="text-white" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Enforce the temp-password gate in `ProtectedRoute.tsx`**

After the existing role check (before `return <>{children}</>`), add a redirect so any staff whose `tempPasswordSet` is true are forced to `/change-password`:
```tsx
  if (user.profile?.tempPasswordSet) {
    return <Navigate to="/change-password" replace />
  }

  return <>{children}</>
```
(`Navigate` and `user` are already imported/available in this file.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: only the single missing-module error for `./pages/admin/BlockFormPage` remains.

- [ ] **Step 4: Commit**

```bash
git add src/pages/auth/ChangePasswordPage.tsx src/components/ProtectedRoute.tsx
git commit -m "feat: forced temporary-password change flow"
```

---

## Stage 5 — Blocks & Units management (BlockFormPage)

### Task 5.1: Create block with auto-generated units

**Files:**
- Create: `src/pages/admin/BlockFormPage.tsx`

- [ ] **Step 1: Create `src/pages/admin/BlockFormPage.tsx`**

This page is reached from PropertyDetailPage's Blocks tab (`/admin/properties/:id/blocks/new`). It creates a `blocks` doc and, when requested, batch-creates `units` using `generateUnitNumbers`, then updates the property's `numberOfBlocks`/`totalUnits` counts.

```tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { doc, collection, writeBatch, serverTimestamp, getDoc, increment } from 'firebase/firestore'
import { ArrowLeft } from 'lucide-react'
import { db } from '../../firebase/config'
import { Spinner } from '../../components/ui/LoadingScreen'
import { generateUnitNumbers } from '../../utils/units'
import toast from 'react-hot-toast'
import type { Property } from '../../types'

const schema = z.object({
  name:        z.string().min(1, 'Block name is required'),
  prefix:      z.string().min(1, 'Prefix is required').max(3, 'Max 3 characters'),
  description: z.string().optional(),
  totalUnits:  z.number({ message: 'Number of units required' }).min(0).max(500),
  autoGenerateUnits: z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function BlockFormPage() {
  const { id: propertyId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', prefix: '', totalUnits: 0, autoGenerateUnits: true },
  })

  const auto = watch('autoGenerateUnits')
  const count = watch('totalUnits')
  const prefix = watch('prefix')

  const onSubmit = async (data: FormData) => {
    if (!propertyId) return
    setSaving(true)
    try {
      const propSnap = await getDoc(doc(db, 'properties', propertyId))
      if (!propSnap.exists()) { toast.error('Property not found'); return }
      const property = propSnap.data() as Property

      const batch = writeBatch(db)
      const blockRef = doc(collection(db, 'blocks'))
      batch.set(blockRef, {
        blockId: blockRef.id,
        propertyId,
        name: data.name,
        prefix: data.prefix.trim().toUpperCase(),
        description: data.description ?? '',
        totalUnits: data.autoGenerateUnits ? data.totalUnits : 0,
        status: 'ACTIVE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      let unitsCreated = 0
      if (data.autoGenerateUnits && data.totalUnits > 0) {
        const numbers = generateUnitNumbers(data.prefix, data.totalUnits)
        for (const unitNumber of numbers) {
          const unitRef = doc(collection(db, 'units'))
          batch.set(unitRef, {
            unitId: unitRef.id,
            propertyId,
            blockId: blockRef.id,
            blockName: data.name,
            unitNumber,
            status: 'VACANT',
            currentTenantId: null,
            currentTenantName: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
        unitsCreated = numbers.length
      }

      batch.update(doc(db, 'properties', propertyId), {
        numberOfBlocks: increment(1),
        totalUnits: increment(unitsCreated),
        updatedAt: serverTimestamp(),
      })

      await batch.commit()
      toast.success(`Block "${data.name}" created${unitsCreated ? ` with ${unitsCreated} units` : ''}`)
      navigate(`/admin/properties/${propertyId}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to create block')
    } finally {
      setSaving(false)
    }
  }

  const preview = auto && prefix && count > 0 ? generateUnitNumbers(prefix, Math.min(count, 500)) : []

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="page-title">Add Block</h1>
          <p className="page-subtitle">Create a block and optionally auto-generate its units</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Block Name *</label>
            <input {...register('name')} className="input" placeholder="e.g. Block A" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Unit Prefix *</label>
            <input {...register('prefix')} className="input" placeholder="e.g. A" />
            {errors.prefix && <p className="form-error">{errors.prefix.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <input {...register('description')} className="input" placeholder="Optional" />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('autoGenerateUnits')} className="rounded border-gray-300" />
          Auto-generate units
        </label>

        {auto && (
          <div>
            <label className="label">Number of Units *</label>
            <input {...register('totalUnits', { valueAsNumber: true })} type="number" min={0} max={500} className="input" />
            {errors.totalUnits && <p className="form-error">{errors.totalUnits.message}</p>}
            {preview.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Will create: <span className="font-medium">{preview.slice(0, 4).join(', ')}
                {preview.length > 4 ? ` … ${preview[preview.length - 1]}` : ''}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Spinner size="sm" className="text-white" />}
            Create Block
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Full typecheck (all modules now exist)**

Run: `npx tsc -b`
Expected: exits 0 with **no** errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `tsc -b` + `vite build` succeed; `dist/` produced with no errors.

- [ ] **Step 4: Commit (includes the deferred App.tsx + App.css deletion)**

```bash
git add src/pages/admin/BlockFormPage.tsx src/App.tsx
git commit -m "feat: block creation with auto-generated units; wire app router"
```

### Task 5.2: Show temp password after staff creation

**Files:**
- Modify: `src/pages/admin/StaffPage.tsx:59-76`

- [ ] **Step 1: Capture and surface the returned temp password**

`createStaffUser` returns `{ uid, tempPassword }`. Update `onCreateStaff` so the admin can copy/share the credential. Add near the other `useState` hooks:
```tsx
  const [tempCred, setTempCred] = useState<{ name: string; email: string; password: string } | null>(null)
```
Replace the body of `onCreateStaff` success path:
```tsx
  const onCreateStaff = async (data: StaffForm) => {
    setCreating(true)
    try {
      const createStaffUser = httpsCallable<StaffForm, { uid: string; tempPassword: string }>(functions, 'createStaffUser')
      const res = await createStaffUser(data)
      setTempCred({ name: data.name, email: data.email, password: res.data.tempPassword })
      toast.success(`Account created for ${data.name}`)
      setShowModal(false)
      reset()
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
      setStaff(snap.docs.map(d => d.data() as AppUser).filter(u => u.role !== 'SUPER_ADMIN'))
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message ?? 'Failed to create staff account')
    } finally {
      setCreating(false)
    }
  }
```

- [ ] **Step 2: Add a credential modal**

Before the closing `</div>` of the component's returned JSX (after the existing create-staff `<Modal>`), add:
```tsx
      <Modal isOpen={!!tempCred} onClose={() => setTempCred(null)} title="Account created" size="sm">
        <p className="text-sm text-gray-600 mb-3">
          Share these one-time credentials with <span className="font-medium">{tempCred?.name}</span>.
          They must change the password on first login.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <p><span className="text-gray-500">Login:</span> <span className="font-mono">{tempCred?.email}</span></p>
          <p><span className="text-gray-500">Temp password:</span> <span className="font-mono">{tempCred?.password}</span></p>
        </div>
        <button
          className="btn-secondary w-full mt-4"
          onClick={() => { navigator.clipboard?.writeText(`${tempCred?.email} / ${tempCred?.password}`); toast.success('Copied') }}
        >
          Copy credentials
        </button>
      </Modal>
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc -b && npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/StaffPage.tsx
git commit -m "feat: display one-time staff credentials after creation"
```

---

## Stage 6 — Seed data & end-to-end verification

### Task 6.1: Admin-SDK seed script

**Files:**
- Create: `scripts/seed.ts`
- Create: `scripts/package.json`
- Create: `scripts/tsconfig.json`
- Create: `scripts/README.md`

- [ ] **Step 1: Create `scripts/package.json`**

```json
{
  "name": "lango-seed",
  "private": true,
  "type": "module",
  "scripts": { "seed": "tsx seed.ts" },
  "dependencies": { "firebase-admin": "^12.7.0" },
  "devDependencies": { "tsx": "^4.19.0" }
}
```

- [ ] **Step 2: Create `scripts/tsconfig.json`**

```json
{ "compilerOptions": { "module": "esnext", "target": "es2021", "moduleResolution": "bundler", "strict": true, "esModuleInterop": true, "skipLibCheck": true } }
```

- [ ] **Step 3: Create `scripts/seed.ts`**

Uses Application Default Credentials. Creates the first Super Admin (with claims), Greenview Apartments, 4 blocks × 24 units, a caretaker, two guards, and a handful of tenants marking some units OCCUPIED.

```ts
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

initializeApp({ credential: applicationDefault() })
const auth = getAuth()
const db = getFirestore()

function unitNumbers(prefix: string, count: number): string[] {
  const width = Math.max(2, String(count).length)
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(width, '0')}`)
}

async function ensureUser(email: string, password: string, displayName: string, claims: Record<string, unknown>) {
  let uid: string
  try {
    const u = await auth.createUser({ email, password, displayName })
    uid = u.uid
  } catch (e: any) {
    if (e?.code === 'auth/email-already-exists') {
      uid = (await auth.getUserByEmail(email)).uid
    } else { throw e }
  }
  await auth.setCustomUserClaims(uid, claims)
  return uid
}

async function main() {
  const now = FieldValue.serverTimestamp()

  // 1. Super Admin
  const adminUid = await ensureUser('admin@lango.dev', 'Lango#Admin1', 'Lango Super Admin', { role: 'SUPER_ADMIN', propertyId: null })
  await db.collection('users').doc(adminUid).set({
    uid: adminUid, name: 'Lango Super Admin', email: 'admin@lango.dev',
    role: 'SUPER_ADMIN', propertyId: null, status: 'ACTIVE', tempPasswordSet: false,
    createdAt: now, updatedAt: now,
  })

  // 2. Property
  const propertyId = 'property_greenview'
  await db.collection('properties').doc(propertyId).set({
    propertyId, name: 'Greenview Apartments', type: 'APARTMENT_BLOCK',
    address: 'Off Kiambu Road, Ruaka', county: 'Kiambu', city: 'Ruaka',
    numberOfBlocks: 4, totalUnits: 96, primaryContact: 'James Mwangi',
    phone: '+254712345678', email: 'admin@greenview.co.ke', plan: 'LARGE',
    status: 'ACTIVE', createdBy: adminUid, occupiedUnits: 0, createdAt: now, updatedAt: now,
  })

  // 3. Blocks + Units
  const blocks = [
    { name: 'Block A', prefix: 'A' }, { name: 'Block B', prefix: 'B' },
    { name: 'Block C', prefix: 'C' }, { name: 'Block D', prefix: 'D' },
  ]
  const createdUnits: { unitId: string; blockId: string; blockName: string; unitNumber: string }[] = []
  for (const b of blocks) {
    const blockRef = db.collection('blocks').doc()
    await blockRef.set({
      blockId: blockRef.id, propertyId, name: b.name, prefix: b.prefix,
      description: '', totalUnits: 24, status: 'ACTIVE', createdAt: now, updatedAt: now,
    })
    for (const unitNumber of unitNumbers(b.prefix, 24)) {
      const unitRef = db.collection('units').doc()
      await unitRef.set({
        unitId: unitRef.id, propertyId, blockId: blockRef.id, blockName: b.name,
        unitNumber, status: 'VACANT', currentTenantId: null, currentTenantName: null,
        createdAt: now, updatedAt: now,
      })
      createdUnits.push({ unitId: unitRef.id, blockId: blockRef.id, blockName: b.name, unitNumber })
    }
  }

  // 4. Tenants — occupy the first few units
  const tenantSeed = [
    { name: 'John Kamau', phone: '+254712000001' },
    { name: 'Mary Wanjiku', phone: '+254712000002' },
    { name: 'Jane Njeri', phone: '+254712000003' },
  ]
  for (let i = 0; i < tenantSeed.length; i++) {
    const unit = createdUnits[i]
    const t = tenantSeed[i]
    const tenantRef = db.collection('tenants').doc()
    await tenantRef.set({
      tenantId: tenantRef.id, propertyId, blockId: unit.blockId, unitId: unit.unitId,
      unitNumber: unit.unitNumber, blockName: unit.blockName, fullName: t.name,
      phoneNumber: t.phone, whatsappNumber: t.phone, moveInDate: now, status: 'ACTIVE',
      createdBy: adminUid, createdAt: now, updatedAt: now,
    })
    await db.collection('units').doc(unit.unitId).update({
      status: 'OCCUPIED', currentTenantId: tenantRef.id, currentTenantName: t.name, updatedAt: now,
    })
  }
  await db.collection('properties').doc(propertyId).update({ occupiedUnits: tenantSeed.length })

  // 5. Staff (caretaker + 2 guards)
  const caretakerUid = await ensureUser('caretaker@greenview.dev', 'Lango#Care1', 'Peter Otieno', { role: 'CARETAKER', propertyId })
  await db.collection('users').doc(caretakerUid).set({
    uid: caretakerUid, name: 'Peter Otieno', email: 'caretaker@greenview.dev', phone: '+254712000010',
    role: 'CARETAKER', propertyId, status: 'ACTIVE', tempPasswordSet: false, createdAt: now, updatedAt: now,
  })
  for (const g of [{ email: 'guard1@greenview.dev', name: 'David Mwangi', phone: '+254712000011' },
                   { email: 'guard2@greenview.dev', name: 'Samuel Kiptoo', phone: '+254712000012' }]) {
    const guardUid = await ensureUser(g.email, 'Lango#Guard1', g.name, { role: 'SECURITY_GUARD', propertyId })
    await db.collection('users').doc(guardUid).set({
      uid: guardUid, name: g.name, email: g.email, phone: g.phone,
      role: 'SECURITY_GUARD', propertyId, status: 'ACTIVE', tempPasswordSet: false, createdAt: now, updatedAt: now,
    })
  }

  console.log('✅ Seed complete. Super Admin: admin@lango.dev / Lango#Admin1')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 4: Create `scripts/README.md`**

```markdown
# Lango seed

Provisions a Super Admin + Greenview demo property.

## Prerequisites
Download a service-account key from the Firebase console
(Project settings → Service accounts → Generate new private key) and export:

    export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/serviceAccount.json

## Run
    cd scripts && npm install && npm run seed

## Demo accounts (all dev-only)
| Role         | Login                     | Password       |
|--------------|---------------------------|----------------|
| Super Admin  | admin@lango.dev           | Lango#Admin1   |
| Caretaker    | caretaker@greenview.dev   | Lango#Care1    |
| Security Guard | guard1@greenview.dev    | Lango#Guard1   |

Real staff accounts are created by the Super Admin in-app (never via public signup).
```

- [ ] **Step 5: Commit**

```bash
cd /home/jane-ngugi/Documents/Lango
git add scripts/
git commit -m "feat: admin-sdk seed script for super admin + greenview demo data"
```

### Task 6.2: Run the seed and verify end-to-end

- [ ] **Step 1: Seed the project**

Run (operator must have `GOOGLE_APPLICATION_CREDENTIALS` set, per `scripts/README.md`):
```bash
cd /home/jane-ngugi/Documents/Lango/scripts && npm install && npm run seed
```
Expected: prints "✅ Seed complete."

- [ ] **Step 2: Start the dev server**

Run: `cd /home/jane-ngugi/Documents/Lango && npm run dev`
Expected: Vite serves at http://localhost:5173.

- [ ] **Step 3: Manual verification checklist** (tick each)

- [ ] Visiting `/` while logged out redirects to `/login`.
- [ ] Log in with `admin@lango.dev` / `Lango#Admin1` → lands on `/admin`.
- [ ] Log in with the Super Admin's phone instead of email also works (after setting a phone on that account, or verify with a staff account that has a phone).
- [ ] Admin dashboard shows Greenview in recent properties; stat cards render numbers (not `undefined`).
- [ ] Open Greenview → Blocks tab shows 4 blocks; Units tab shows 96 units; 3 are OCCUPIED with tenant names.
- [ ] Add a new block "Block E" prefix "E" with 12 auto-generated units → returns to detail page, block + 12 units appear, property unit count increases.
- [ ] Staff page → create a guard → credential modal shows a temp password; the new guard appears in the list.
- [ ] Log out, log in as that new guard → forced to `/change-password`; after changing, lands on `/gate`.
- [ ] Directly navigating to `/admin` as the guard redirects back to `/gate` (role gate holds).

- [ ] **Step 4: Final typecheck, build, and tests**

Run: `cd /home/jane-ngugi/Documents/Lango && npm run test && npx tsc -b && npm run build`
Expected: tests pass; typecheck 0 errors; build succeeds.

- [ ] **Step 5: Commit any verification fixes, then tag the milestone**

```bash
git add -A
git commit -m "chore: super admin foundation milestone verified" --allow-empty
git tag milestone-super-admin
```

---

## Self-Review (completed by plan author)

**Spec coverage vs. `2026-09-03-lango-super-admin-foundation-design.md`:**
- §2 Cloud Functions (createStaffUser/setUserClaims/resolvePhoneToEmail/bootstrapSuperAdmin) → Task 2.3. ✅
- §2 seed script → Task 6.1. ✅
- §3 custom-claims auth, email-or-phone login, temp-password gate, role redirects → Tasks 4.1, 4.2, 3.3. ✅
- §4 route structure → Task 3.3. ✅
- §5 build order: scaffold (0.2/2.1), make-it-run (3.x), functions (2.x), seed (6.1), Super Admin CRUD Properties/Blocks/Units/Staff (existing pages + 5.1/5.2), verify (6.2). ✅
- §2 Firestore indexes → Task 0.2. ✅
- §6 deps: vitest (0.1), firebase-tools invoked via `npx`, functions deps (2.1). Note: `firebase-tools` is used via `npx` rather than installed as a dep to keep the client bundle clean; if the operator prefers a local install, run `npm i -D firebase-tools`.
- Properties CRUD already exists (PropertyFormPage/PropertiesPage/PropertyDetailPage) — only the zod fix (3.1) and wiring (3.3) were needed; no rebuild. Documented so the executor doesn't recreate them.

**Placeholder scan:** No TBD/TODO left; every code step contains complete code; every command has expected output.

**Type consistency:** `generateUnitNumbers(prefix, count)` signature identical in Tasks 1.1, 5.1, and the seed's inline copy. `createStaffUser` returns `{ uid, tempPassword }` in Task 2.3 and is consumed with that exact shape in Task 5.2. Unit doc fields (`unitId, propertyId, blockId, blockName, unitNumber, status, currentTenantId, currentTenantName`) match `Unit` in `src/types/index.ts`. Claims shape `{ role, propertyId }` consistent across functions, rules, and AuthContext.

**Known follow-ups (out of milestone scope, noted for later phases):** `enableIndexedDbPersistence` is deprecated in Firebase 12 in favour of `persistentLocalCache` — revisit during the offline-functionality phase; wiring the Admin dashboard's live aggregates beyond what already renders; Property Manager full dashboard.
