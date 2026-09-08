# ID Photo Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a guard photographs a visitor's Kenyan National ID or passport on the Register-a-Guest screen, auto-extract the Full Name and ID/passport number and offer to fill the form via a confirm dialog.

**Architecture:** In-browser OCR with a lazily-imported `tesseract.js`. A pure parsing layer (`src/services/idOcr.ts`) turns raw OCR text into `{docType, name, idNumber}` — MRZ present → passport, else Kenyan National ID heuristics. A confirm dialog (`IdScanConfirmDialog`) shows detected values as editable inputs; on confirm, `RegisterGuestPage` calls `form.setValue` only for detected fields.

**Tech Stack:** React 19, react-hook-form, TypeScript, Vite, Tailwind, Vitest (node env), tesseract.js.

**Conventions in this repo:** Tests are pure-logic `*.test.ts` files (vitest `environment: 'node'`, `include: ['src/**/*.test.ts']`). There is NO DOM/testing-library setup — do NOT add one. Parsers are unit-tested; the dialog + wiring are verified with `npx tsc -b` and `npm run build`. Modals reuse `src/components/ui/Modal.tsx`; the spinner is `Spinner` from `src/components/ui/LoadingScreen.tsx`.

---

### Task 1: Add tesseract.js dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

Run: `npm install tesseract.js@^5`
Expected: `tesseract.js` appears under `dependencies` in `package.json`; install succeeds.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add tesseract.js for in-browser ID OCR"
```

---

### Task 2: `parseKenyanId` — Kenyan National ID text parser (TDD)

**Files:**
- Create: `src/services/idOcr.ts`
- Test: `src/services/idOcr.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/idOcr.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseKenyanId } from './idOcr'

describe('parseKenyanId', () => {
  const clean = [
    'JAMHURI YA KENYA',
    'REPUBLIC OF KENYA',
    'SERIAL NUMBER 345020965',
    'ID NUMBER 37103489',
    'FULL NAMES',
    'JANE WARUCHO NGUGI',
    'DATE OF BIRTH 12.03.1990',
  ].join('\n')

  it('extracts the 7-8 digit ID number, not the 9-digit serial or dates', () => {
    expect(parseKenyanId(clean).idNumber).toBe('37103489')
  })

  it('extracts the name and Title-cases it, skipping label lines', () => {
    expect(parseKenyanId(clean).name).toBe('Jane Warucho Ngugi')
  })

  it('does not pick a dotted date as the ID number', () => {
    const r = parseKenyanId('DATE OF BIRTH 72.03.20\nID NUMBER 12345678')
    expect(r.idNumber).toBe('12345678')
  })

  it('handles mixed-case name lines', () => {
    const r = parseKenyanId('Full Names\nMary Atieno Otieno\nID NUMBER 22334455')
    expect(r.name).toBe('Mary Atieno Otieno')
  })

  it('returns undefined name when only the ID is readable', () => {
    const r = parseKenyanId('ID NUMBER 22334455\nSEX MALE')
    expect(r.name).toBeUndefined()
    expect(r.idNumber).toBe('22334455')
  })

  it('returns both undefined for garbage', () => {
    const r = parseKenyanId('%%% ~~~ ...')
    expect(r.name).toBeUndefined()
    expect(r.idNumber).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/idOcr.test.ts`
Expected: FAIL — "does not provide an export named 'parseKenyanId'".

- [ ] **Step 3: Write minimal implementation**

Create `src/services/idOcr.ts`:

```ts
export type DocType = 'national_id' | 'passport'

export interface IdScanResult {
  rawText: string
  docType?: DocType
  name?: string
  idNumber?: string
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// Label / boilerplate lines that are never a person's name.
const KE_ID_LABELS = [
  'REPUBLIC OF KENYA', 'JAMHURI YA KENYA', 'FULL NAMES', 'SERIAL NUMBER', 'ID NUMBER',
  'SEX', 'DATE OF BIRTH', 'DISTRICT OF BIRTH', 'PLACE OF ISSUE', 'DATE OF ISSUE',
  "HOLDER'S SIGN", 'MALE', 'FEMALE', 'KENYA',
]

export function parseKenyanId(rawText: string): { name?: string; idNumber?: string } {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

  // ID number: first standalone 7-8 digit token. Dotted dates and 9-digit serials
  // are single tokens that fail the exact ^\d{7,8}$ test, so they are skipped.
  let idNumber: string | undefined
  for (const line of lines) {
    for (const tok of line.split(/\s+/)) {
      if (/^\d{7,8}$/.test(tok)) { idNumber = tok; break }
    }
    if (idNumber) break
  }

  // Name: longest non-label line with >= 2 alphabetic words, Title-cased.
  let best = ''
  for (const line of lines) {
    const upper = line.toUpperCase()
    if (KE_ID_LABELS.some(lbl => upper.includes(lbl))) continue
    const words = line.match(/[A-Za-z]{2,}/g)
    if (!words || words.length < 2) continue
    const candidate = words.join(' ')
    if (candidate.length > best.length) best = candidate
  }
  const name = best ? toTitleCase(best) : undefined

  return { name, idNumber }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/idOcr.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/idOcr.ts src/services/idOcr.test.ts
git commit -m "feat: parseKenyanId OCR text parser"
```

---

### Task 3: `parseMrz` — passport MRZ parser (TDD)

**Files:**
- Modify: `src/services/idOcr.ts`
- Test: `src/services/idOcr.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/services/idOcr.test.ts` (add `parseMrz` to the existing import at the top):

```ts
import { parseMrz } from './idOcr'

describe('parseMrz', () => {
  // ICAO TD3: line1 P<COUNTRY SURNAME<<GIVEN<NAMES ; line2 passportNo(0-8) + fillers
  const line1 = 'P<KENNGUGI<<JANE<WARUCHO<<<<<<<<<<<<<<<<<<<<'
  const line2 = 'AK0123456' + '4KEN9003128F2801019<<<<<<<<<<<<<<06'
  const mrz = `${line1}\n${line2}`

  it('parses given-then-surname name order', () => {
    expect(parseMrz(mrz)!.name).toBe('Jane Warucho Ngugi')
  })

  it('parses the passport number from line 2, stripping fillers', () => {
    expect(parseMrz(mrz)!.idNumber).toBe('AK0123456')
  })

  it('returns null for non-MRZ text', () => {
    expect(parseMrz('REPUBLIC OF KENYA\nJANE NGUGI')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/idOcr.test.ts`
Expected: FAIL — "does not provide an export named 'parseMrz'".

- [ ] **Step 3: Write minimal implementation**

Add to `src/services/idOcr.ts` (below `parseKenyanId`):

```ts
export function parseMrz(rawText: string): { name?: string; idNumber?: string } | null {
  const lines = rawText
    .split('\n')
    .map(l => l.replace(/\s+/g, '').toUpperCase())
    .filter(Boolean)

  // Line 1 of a TD3 MRZ: starts with 'P', has '<<' name separators.
  const l1 = lines.find(l => /^P./.test(l) && l.includes('<<'))
  if (!l1) return null
  const l2 = lines[lines.indexOf(l1) + 1]

  // Name: after 'P' + type char + 3-letter country → SURNAME<<GIVEN<NAMES
  let name: string | undefined
  const m = l1.match(/^P.([A-Z]{3})(.*)$/)
  if (m) {
    const [surnameRaw, givenRaw = ''] = m[2].split('<<')
    const surname = surnameRaw.replace(/</g, ' ').trim()
    const given = givenRaw.replace(/</g, ' ').trim()
    const full = `${given} ${surname}`.replace(/\s+/g, ' ').trim()
    if (full) name = toTitleCase(full)
  }

  // Passport number: line 2, characters 0-8, strip '<' fillers.
  let idNumber: string | undefined
  if (l2) {
    const num = l2.slice(0, 9).replace(/</g, '')
    if (num) idNumber = num
  }

  if (!name && !idNumber) return null
  return { name, idNumber }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/idOcr.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/idOcr.ts src/services/idOcr.test.ts
git commit -m "feat: parseMrz passport MRZ parser"
```

---

### Task 4: `parseIdText` — router between passport and National ID (TDD)

**Files:**
- Modify: `src/services/idOcr.ts`
- Test: `src/services/idOcr.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/services/idOcr.test.ts` (add `parseIdText` to the import):

```ts
import { parseIdText } from './idOcr'

describe('parseIdText', () => {
  it('routes MRZ text to passport', () => {
    const mrz = 'P<KENNGUGI<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\nAK01234564KEN'
    const r = parseIdText(mrz)
    expect(r.docType).toBe('passport')
    expect(r.idNumber).toBe('AK0123456')
  })

  it('routes plain ID text to national_id', () => {
    const r = parseIdText('ID NUMBER 37103489\nJANE WARUCHO NGUGI')
    expect(r.docType).toBe('national_id')
    expect(r.name).toBe('Jane Warucho Ngugi')
  })

  it('returns empty object for garbage', () => {
    expect(parseIdText('%%% ~~~')).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/idOcr.test.ts`
Expected: FAIL — "does not provide an export named 'parseIdText'".

- [ ] **Step 3: Write minimal implementation**

Add to `src/services/idOcr.ts` (below `parseMrz`):

```ts
export function parseIdText(
  rawText: string,
): { docType?: DocType; name?: string; idNumber?: string } {
  const mrz = parseMrz(rawText)
  if (mrz) return { docType: 'passport', ...mrz }

  const ke = parseKenyanId(rawText)
  if (ke.name || ke.idNumber) return { docType: 'national_id', ...ke }

  return {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/idOcr.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/idOcr.ts src/services/idOcr.test.ts
git commit -m "feat: parseIdText routes MRZ vs national ID"
```

---

### Task 5: `recognizeIdCard` — lazy-loaded Tesseract wrapper (TDD with mock)

**Files:**
- Modify: `src/services/idOcr.ts`
- Test: `src/services/idOcr.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/services/idOcr.test.ts` (add `recognizeIdCard` to the import, and `vi` to the vitest import so it reads `import { describe, it, expect, vi } from 'vitest'`):

```ts
import { recognizeIdCard } from './idOcr'

vi.mock('tesseract.js', () => ({
  recognize: vi.fn(async () => ({
    data: { text: 'ID NUMBER 37103489\nJANE WARUCHO NGUGI' },
  })),
}))

describe('recognizeIdCard', () => {
  it('delegates OCR text to parseIdText and returns rawText + fields', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    const res = await recognizeIdCard(blob)
    expect(res.docType).toBe('national_id')
    expect(res.name).toBe('Jane Warucho Ngugi')
    expect(res.idNumber).toBe('37103489')
    expect(res.rawText).toContain('37103489')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/idOcr.test.ts`
Expected: FAIL — "does not provide an export named 'recognizeIdCard'".

- [ ] **Step 3: Write minimal implementation**

Add to `src/services/idOcr.ts` (below `parseIdText`):

```ts
/**
 * Runs OCR on an ID/passport photo entirely in the browser.
 * tesseract.js is imported lazily so its ~3MB WASM never ships in the initial bundle.
 * On any failure this resolves to an empty result so the caller can offer manual entry.
 */
export async function recognizeIdCard(
  blob: Blob,
  onProgress?: (fraction: number) => void,
): Promise<IdScanResult> {
  try {
    const { recognize } = await import('tesseract.js')
    const { data } = await recognize(blob, 'eng', {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
      },
    })
    const rawText = data.text ?? ''
    return { rawText, ...parseIdText(rawText) }
  } catch (err) {
    console.error('ID OCR failed', err)
    return { rawText: '' }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/idOcr.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npx vitest run && npx tsc -b`
Expected: all tests pass; tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/services/idOcr.ts src/services/idOcr.test.ts
git commit -m "feat: recognizeIdCard lazy tesseract wrapper"
```

---

### Task 6: `IdScanConfirmDialog` component

**Files:**
- Create: `src/components/gate/IdScanConfirmDialog.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/gate/IdScanConfirmDialog.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/LoadingScreen'
import { recognizeIdCard, type DocType } from '../../services/idOcr'

interface Props {
  /** When non-null, the dialog is open and this blob is scanned. */
  photo: Blob | null
  onConfirm: (fields: { name?: string; idNumber?: string }) => void
  onClose: () => void
}

const DOC_LABEL: Record<DocType, string> = { national_id: 'National ID', passport: 'Passport' }

export function IdScanConfirmDialog({ photo, onConfirm, onClose }: Props) {
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [name, setName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [docType, setDocType] = useState<DocType | undefined>(undefined)
  const [detected, setDetected] = useState(false)

  useEffect(() => {
    if (!photo) return
    let cancelled = false
    setScanning(true); setProgress(0)
    setName(''); setIdNumber(''); setDocType(undefined); setDetected(false)
    recognizeIdCard(photo, f => { if (!cancelled) setProgress(f) }).then(res => {
      if (cancelled) return
      setName(res.name ?? '')
      setIdNumber(res.idNumber ?? '')
      setDocType(res.docType)
      setDetected(Boolean(res.name || res.idNumber))
      setScanning(false)
    })
    return () => { cancelled = true }
  }, [photo])

  if (!photo) return null

  return (
    <Modal
      isOpen={!!photo}
      onClose={onClose}
      title="Scan ID / Passport"
      size="sm"
      footer={scanning ? undefined : (
        <>
          <button className="btn-secondary" onClick={onClose}>Skip</button>
          <button
            className="btn-primary"
            onClick={() => onConfirm({ name: name || undefined, idNumber: idNumber || undefined })}
          >
            Use these details
          </button>
        </>
      )}
    >
      {scanning ? (
        <div className="py-8 flex flex-col items-center gap-3 text-gray-600">
          <Spinner size="md" />
          <p className="text-sm">Reading document… {Math.round(progress * 100)}%</p>
        </div>
      ) : (
        <div className="space-y-4">
          {detected ? (
            docType && (
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-lango-primary/10 text-lango-primary">
                {DOC_LABEL[docType]}
              </span>
            )
          ) : (
            <p className="text-sm text-amber-600">Couldn't read the document — enter details manually.</p>
          )}
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">ID / Passport Number</label>
            <input className="input" value={idNumber} onChange={e => setIdNumber(e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: exits 0 (no type errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/gate/IdScanConfirmDialog.tsx
git commit -m "feat: IdScanConfirmDialog scan+confirm modal"
```

---

### Task 7: Wire the dialog into RegisterGuestPage

**Files:**
- Modify: `src/pages/gate/RegisterGuestPage.tsx`

- [ ] **Step 1: Add the import**

Add near the other component imports (after the `PhotoCapture` import on line 17):

```tsx
import { IdScanConfirmDialog } from '../../components/gate/IdScanConfirmDialog'
```

- [ ] **Step 2: Add scan state**

After the existing `const [photo, setPhoto] = useState<Blob | null>(null)` (line 33), add:

```tsx
  const [scanPhoto, setScanPhoto] = useState<Blob | null>(null)
```

- [ ] **Step 3: Trigger the scan on ID capture**

Replace the ID photo capture line (line 152, `<PhotoCapture onCapture={setPhoto} />`) with:

```tsx
            <PhotoCapture label="Add ID / passport photo (optional)" onCapture={blob => { setPhoto(blob); if (blob) setScanPhoto(blob) }} />
```

- [ ] **Step 4: Render the dialog**

Immediately after that `<PhotoCapture ... />` line (still inside the "Guest Information" card, before its closing `</div>`), add:

```tsx
            <IdScanConfirmDialog
              photo={scanPhoto}
              onClose={() => setScanPhoto(null)}
              onConfirm={fields => {
                if (fields.name) form.setValue('visitorName', fields.name)
                if (fields.idNumber) form.setValue('idNumber', fields.idNumber)
                setScanPhoto(null)
              }}
            />
```

- [ ] **Step 5: Typecheck + build + full test suite**

Run: `npx tsc -b && npx vitest run && npm run build`
Expected: tsc exits 0; all tests pass; production build succeeds (verifies tesseract.js is code-split, not in the main chunk).

- [ ] **Step 6: Commit**

```bash
git add src/pages/gate/RegisterGuestPage.tsx
git commit -m "feat: autofill guest name + ID from scanned ID/passport photo"
```

---

## Manual Verification (after Task 7)

1. `npm run dev`, open Register a Guest → pick any visit type.
2. In "Guest Information", tap **Add ID / passport photo** and capture/upload a Kenyan ID image.
3. Confirm the dialog opens, shows a progress %, then the detected National ID name + number (editable) with a "National ID" badge.
4. Tap **Use these details** → Full Name and ID/Passport fields on the form are populated.
5. Repeat with a passport data-page image → badge reads "Passport"; name/number populated from the MRZ.
6. Tap **Skip** on a scan → form left untouched; captured photo still uploads on submit.
7. Upload a non-ID image → "Couldn't read the document" message with empty editable fields.
