import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config'

export type DocType = 'national_id' | 'passport' | 'driver_license' | 'unknown'

export interface FieldConfidence {
  name: number
  idNumber: number
  dateOfBirth: number
  nationality: number
  sex: number
  expiryDate: number
  issueDate: number
  address: number
}

export interface IdScanResult {
  docType: DocType
  confidence?: number
  name?: string
  idNumber?: string
  dateOfBirth?: string   // ISO date YYYY-MM-DD
  nationality?: string
  sex?: string           // "M" | "F"
  expiryDate?: string    // ISO date YYYY-MM-DD
  issueDate?: string     // ISO date YYYY-MM-DD
  address?: string
  fieldConfidence?: FieldConfidence
  warnings?: string[]
}

interface RawResult {
  docType?: string
  confidence?: number
  name?: string | null
  idNumber?: string | null
  dateOfBirth?: string | null
  nationality?: string | null
  sex?: string | null
  expiryDate?: string | null
  issueDate?: string | null
  address?: string | null
  fieldConfidence?: FieldConfidence
  warnings?: string[]
}

const VALID_DOC_TYPES: DocType[] = ['national_id', 'passport', 'driver_license', 'unknown']

function str(v: string | null | undefined): string | undefined {
  const t = v?.trim()
  return t || undefined
}

/** Pure: normalize the Cloud Function payload into the client shape (null/empty → undefined). */
export function normalizeIdResult(raw: RawResult): IdScanResult {
  const docType = VALID_DOC_TYPES.includes(raw.docType as DocType)
    ? (raw.docType as DocType)
    : 'unknown'
  return {
    docType,
    confidence: raw.confidence,
    name: str(raw.name),
    idNumber: str(raw.idNumber),
    dateOfBirth: str(raw.dateOfBirth),
    nationality: str(raw.nationality),
    sex: str(raw.sex),
    expiryDate: str(raw.expiryDate),
    issueDate: str(raw.issueDate),
    address: str(raw.address),
    fieldConfidence: raw.fieldConfidence,
    warnings: raw.warnings?.filter(Boolean),
  }
}

async function downscaleImage(blob: Blob, maxEdge = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) { bitmap.close(); return blob }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b ?? blob), 'image/jpeg', 0.9))
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.readAsDataURL(blob)
  })
}

const analyzeIdDocument = httpsCallable<
  { imageBase64: string; mediaType: string; docType?: string },
  RawResult
>(functions, 'analyzeIdDocument')

/**
 * Reads a Kenyan National ID, passport, or driver's license photo via the
 * Python-OCR-backed `analyzeIdDocument` Cloud Function. Resolves to a
 * degraded (`unknown`) result on any failure so the caller can fall back to
 * manual entry.
 */
export async function recognizeIdCard(blob: Blob): Promise<IdScanResult> {
  try {
    const processed = await downscaleImage(blob).catch(() => blob)
    const mediaType = processed.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const imageBase64 = await blobToBase64(processed)
    const { data } = await analyzeIdDocument({ imageBase64, mediaType })
    return normalizeIdResult(data)
  } catch (err) {
    console.error('ID document scan failed', err)
    return { docType: 'unknown' }
  }
}
