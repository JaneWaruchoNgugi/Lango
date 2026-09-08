import { describe, it, expect } from 'vitest'
import { normalizeIdResult } from './idOcr'

describe('normalizeIdResult', () => {
  it('converts null name/idNumber to undefined', () => {
    expect(normalizeIdResult({ docType: 'national_id', name: null, idNumber: null }))
      .toEqual({ docType: 'national_id', name: undefined, idNumber: undefined })
  })

  it('keeps and trims present fields', () => {
    expect(normalizeIdResult({ docType: 'passport', name: '  Jane Warucho Ngugi ', idNumber: 'AK0123456' }))
      .toEqual({ docType: 'passport', name: 'Jane Warucho Ngugi', idNumber: 'AK0123456' })
  })

  it('falls back to "unknown" for an unrecognized docType', () => {
    expect(normalizeIdResult({ docType: 'drivers_license', name: 'X Y', idNumber: '1' }).docType).toBe('unknown')
  })

  it('treats empty/whitespace strings as undefined', () => {
    const r = normalizeIdResult({ docType: 'national_id', name: '   ', idNumber: '' })
    expect(r.name).toBeUndefined()
    expect(r.idNumber).toBeUndefined()
  })
})
