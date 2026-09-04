import { describe, it, expect } from 'vitest'
import { formatDuration, durationMinutes } from './format'

describe('formatDuration', () => {
  it('formats sub-hour', () => { expect(formatDuration(32)).toBe('32m') })
  it('formats hours+minutes', () => { expect(formatDuration(95)).toBe('1h 35m') })
  it('handles zero', () => { expect(formatDuration(0)).toBe('0m') })
})

describe('durationMinutes', () => {
  it('computes whole minutes between two dates', () => {
    const a = new Date('2026-09-04T10:00:00Z')
    const b = new Date('2026-09-04T10:32:40Z')
    expect(durationMinutes(a, b)).toBe(33)
  })
})
