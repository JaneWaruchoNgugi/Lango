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
