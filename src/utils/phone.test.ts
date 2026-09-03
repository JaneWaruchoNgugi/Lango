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
