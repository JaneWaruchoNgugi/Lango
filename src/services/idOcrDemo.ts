/**
 * Demo-mode OCR mock. Uses the same IdScanResult interface as the real
 * recognizeIdCard() but returns pre-set Kenyan fixture data — no Firebase
 * call, no Tesseract, no network. Cycles through three samples so the
 * demo guard can exercise high, high+MRZ, and low-confidence scenarios.
 */
import type { IdScanResult } from './idOcr'

const DEMO_RESULTS: IdScanResult[] = [
  {
    docType: 'national_id',
    confidence: 0.95,
    name: 'Grace Wanjiku Kariuki',
    idNumber: '34521876',
    nationality: 'KENYAN',
    sex: 'F',
    dateOfBirth: '1994-03-22',
    issueDate: '2015-06-10',
    fieldConfidence: {
      name: 0.96,
      idNumber: 0.94,
      nationality: 1.0,
      sex: 0.93,
      dateOfBirth: 0.90,
      expiryDate: 0,
      issueDate: 0.85,
      address: 0,
    },
    warnings: [],
  },
  {
    docType: 'passport',
    confidence: 0.97,
    name: 'David Otieno Mwangi',
    idNumber: 'B98765432',
    nationality: 'KEN',
    sex: 'M',
    dateOfBirth: '1988-11-07',
    expiryDate: '2031-11-07',
    issueDate: '2021-11-07',
    fieldConfidence: {
      name: 0.98,
      idNumber: 0.96,
      nationality: 0.93,
      sex: 0.95,
      dateOfBirth: 0.95,
      expiryDate: 0.95,
      issueDate: 0.90,
      address: 0,
    },
    warnings: ['Document boundary could not be confidently detected.'],
  },
  {
    // Low-confidence sample — exercises amber/red confidence badges.
    docType: 'national_id',
    confidence: 0.61,
    name: 'Samuel Kipchoge Rotich',
    idNumber: '29114503',
    nationality: 'KENYAN',
    sex: 'M',
    dateOfBirth: '2001-06-15',
    fieldConfidence: {
      name: 0.65,
      idNumber: 0.60,
      nationality: 1.0,
      sex: 0.80,
      dateOfBirth: 0.58,
      expiryDate: 0,
      issueDate: 0,
      address: 0,
    },
    warnings: ['Low image quality detected. Please retake the photo.'],
  },
]

let _demoIndex = 0

export async function recognizeIdCardDemo(_blob: Blob): Promise<IdScanResult> {
  await new Promise(r => setTimeout(r, 900))
  const result = DEMO_RESULTS[_demoIndex % DEMO_RESULTS.length]
  _demoIndex++
  return result
}
