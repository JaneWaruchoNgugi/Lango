# ID Photo Autofill — Kenyan National ID & Passport

**Date:** 2026-09-08
**Status:** Approved
**Area:** Guard app → Register a Guest (Step 2, "Guest Information")

## Problem

When a guard photographs a visitor's ID on the Register-a-Guest screen, they still
type the **Full Name** and **ID / Passport** number by hand. This is slow at a busy
gate and error-prone. We want the captured ID photo to auto-populate those two fields.

## Goals

- After the guard captures/uploads the ID photo, extract **Full Name** and **ID number**
  and offer to fill the form.
- Work **offline** and at **zero per-scan cost** (guards use cheap Android phones on
  metered data; the app already surfaces an online/offline state).
- Never silently overwrite the form with wrong data — the guard confirms first.

## Non-Goals (YAGNI)

- Only two document types: **Kenyan National ID** and **passport** (any nationality, via MRZ).
  Other card types fall through to manual entry.
- No extraction of DOB, sex, district, serial, or place of issue — only name + ID/passport number.
- No server/cloud OCR. No new backend, no Cloud Function.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| OCR engine | **Tesseract.js**, in-browser | Free, offline, no backend; matches app's offline posture. |
| Bundle impact | **Lazy `import('tesseract.js')`** | ~2–4 MB WASM must NOT ship in the initial bundle; loads on first scan. |
| Trigger | **Auto-scan on photo capture** | Fewest taps for the guard. |
| Applying results | **Confirm dialog** before touching form | OCR misreads are common on phone photos; guard reviews/edits first. |
| Card layouts | **Kenyan National ID + passport (MRZ)** | Covers residents and foreign visitors; MRZ is a fixed, OCR-friendly format. |
| Doc-type detection | **Auto**: MRZ present → passport, else National ID | No extra tap; guard can still edit in the confirm dialog. |

## Architecture

Three units, each independently understandable and testable:

### 1. `src/services/idOcr.ts` — OCR + parsing brain (pure logic + thin async wrapper)

```ts
export type DocType = 'national_id' | 'passport'

export interface IdScanResult {
  rawText: string
  docType?: DocType  // detected type, undefined if nothing recognized
  name?: string      // Title-cased, undefined if not confidently found
  idNumber?: string  // ID or passport number, undefined if not found
}

// Lazily loads tesseract.js, recognizes the blob, then parses via parseIdText.
export async function recognizeIdCard(
  blob: Blob,
  onProgress?: (fraction: number) => void,
): Promise<IdScanResult>

// Pure top-level parser: detects MRZ → passport, else National ID. Exported for tests.
export function parseIdText(rawText: string):
  { docType?: DocType; name?: string; idNumber?: string }

// Pure sub-parsers, exported for unit tests.
export function parseKenyanId(rawText: string): { name?: string; idNumber?: string }
export function parseMrz(rawText: string): { name?: string; idNumber?: string } | null
```

**Detection (`parseIdText`):** if the text contains an MRZ (a line matching the TD3 shape —
starts with `P` and is dominated by `<` fillers, or a pair of ~44-char `<`-filled lines),
run `parseMrz`; if it returns non-null, `docType = 'passport'`. Otherwise fall back to
`parseKenyanId` with `docType = 'national_id'`. If neither yields a name or number, all
fields are undefined.

**Parsing heuristics — Kenyan National ID (`parseKenyanId`):**

- **ID number:** match standalone digit runs `\b\d{7,8}\b`. Reject tokens that are part of a
  dotted date (e.g. `72.03.20`) or contain non-digits. If multiple candidates, prefer the
  first 7–8 digit token that is not adjacent to a `.` — the serial line. Return as a string.
- **Full name:** consider all-caps alphabetic lines. Drop known label/boilerplate lines
  (case-insensitive contains): `REPUBLIC OF KENYA`, `JAMHURI YA KENYA`, `FULL NAMES`,
  `SERIAL NUMBER`, `ID NUMBER`, `SEX`, `DATE OF BIRTH`, `DISTRICT OF BIRTH`,
  `PLACE OF ISSUE`, `DATE OF ISSUE`, `HOLDER'S SIGN`, `MALE`, `FEMALE`, `KENYA`.
  From the remaining candidate line(s), take the longest run of alphabetic words (2–4 words
  typical) and normalize to **Title Case**. Return undefined if nothing qualifies.

**Parsing heuristics — Passport MRZ (`parseMrz`, ICAO TD3):**

- Normalize OCR noise: uppercase, strip spaces, map common misreads within the MRZ only
  where unambiguous (the MRZ alphabet is `A–Z`, `0–9`, `<`).
- Locate the two MRZ lines (each ~44 chars, `<`-filled). Line 1 begins with `P<` +
  3-letter issuing-country code.
- **Passport number:** line 2, characters 1–9, strip trailing `<` fillers. Alphanumeric
  (e.g. `AK0123456`). Returned in `idNumber`.
- **Name:** line 1 after the country code: `SURNAME<<GIVEN<NAMES<<<…`. Split on `<<` into
  surname vs given names, replace remaining `<` with spaces, collapse, Title-case as
  `Given Names Surname`.
- Return `null` if no plausible MRZ is found, so `parseIdText` falls back to National ID.

All fields are independent and best-effort — any can be `undefined`.

**Robustness:** wrap Tesseract in try/finally so the worker is always terminated; if
recognition throws, return `{ rawText: '', name: undefined, idNumber: undefined }` and let
the dialog show the manual-entry fallback.

### 2. `src/components/gate/IdScanConfirmDialog.tsx` — confirm modal

Props:
```ts
interface Props {
  photo: Blob | null           // when non-null, dialog is open and scans this blob
  onConfirm: (fields: { name?: string; idNumber?: string }) => void
  onClose: () => void
}
```

States:
- **Scanning:** spinner + progress % (from `onProgress`), message "Reading ID…".
- **Result:** editable inputs pre-filled with detected Full Name and ID/Passport Number,
  plus a thumbnail of the photo and a small badge showing the detected type ("National ID"
  / "Passport"). Buttons: **Use these details** → `onConfirm(editedFields)`;
  **Skip** → `onClose()`.
- **Nothing detected** (both undefined): copy "Couldn't read the document — enter details
  manually." Inputs still shown (empty & editable) so the guard can type; same buttons.

The dialog owns the transient edit state; the page only receives final values on confirm.

### 3. `src/pages/gate/RegisterGuestPage.tsx` — wiring only

- Add `const [scanPhoto, setScanPhoto] = useState<Blob | null>(null)`.
- The ID `PhotoCapture`'s `onCapture` becomes: `blob => { setPhoto(blob); if (blob) setScanPhoto(blob) }`
  (keeps existing `photo` upload behavior untouched; also opens the scan dialog).
- Render `<IdScanConfirmDialog photo={scanPhoto} onClose={() => setScanPhoto(null)}
  onConfirm={fields => { if (fields.name) form.setValue('visitorName', fields.name);
  if (fields.idNumber) form.setValue('idNumber', fields.idNumber); setScanPhoto(null) }} />`.
- **Never blanks a field:** only `setValue` for fields that were detected/entered in the dialog.

## Data Flow

```
Guard taps "Add photo" → PhotoCapture returns Blob
  → setPhoto(blob)            (existing: used for Storage upload on submit)
  → setScanPhoto(blob)        (new: opens dialog)
      → IdScanConfirmDialog mounts, calls recognizeIdCard(blob, onProgress)
          → lazy import tesseract.js → OCR → parseIdText(rawText)  (MRZ→passport else National ID)
      → shows editable {name, idNumber}
      → guard taps "Use these details"
          → onConfirm → form.setValue(visitorName / idNumber)
```

## Error Handling

- Tesseract load/recognition failure → treated as "nothing detected"; manual-entry
  fallback copy; form untouched. A `console.error` for diagnostics.
- Non-image or corrupt blob → same fallback path.
- Closing/skipping the dialog leaves the photo captured (still uploads on submit) and the
  form fields as the guard left them.

## Testing

- **Unit (vitest, no browser):** `parseKenyanId` against a table of raw-OCR strings:
  - clean sample (name + ID both present),
  - ID with surrounding dates and dotted tokens (must not pick the date),
  - lowercased/mixed-case name lines,
  - text where only the ID is readable (name undefined),
  - text where only the name is readable (idNumber undefined),
  - pure garbage (both undefined).
- **Unit:** `parseMrz` against TD3 samples:
  - clean 2-line MRZ (passport number + name both parsed, `Given Surname` order),
  - MRZ with trailing `<` fillers in the passport-number field,
  - non-MRZ text → returns `null`.
- **Unit:** `parseIdText` routing — MRZ input → `docType: 'passport'`; National-ID input
  → `docType: 'national_id'`; garbage → all undefined.
- `recognizeIdCard` is tested with `tesseract.js` mocked to return canned `data.text`,
  asserting it delegates to `parseIdText` and terminates the worker.
- Component: light render test that the dialog shows scanning → result and that
  "Use these details" fires `onConfirm` with the edited values.

## Rollout

- Add `tesseract.js` to dependencies.
- Feature is additive and self-contained; no schema, rules, or data-model changes.
