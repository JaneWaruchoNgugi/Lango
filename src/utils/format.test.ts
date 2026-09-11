import { describe, it, expect } from 'vitest'
import { formatDuration, durationMinutes } from './format'
import { Timestamp } from 'firebase/firestore'
import { tsToInputDate, inputDateToDate, formatMonthYear, formatDateLong, tenancyLength } from './format'

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

describe('date helpers', () => {
  const jan2025 = new Date(2025, 0, 12) // 12 Jan 2025, local

  it('tsToInputDate formats a Date as yyyy-mm-dd', () => {
    expect(tsToInputDate(jan2025)).toBe('2025-01-12')
  })

  it('tsToInputDate accepts a Firestore Timestamp', () => {
    expect(tsToInputDate(Timestamp.fromDate(jan2025))).toBe('2025-01-12')
  })

  it('inputDateToDate round-trips with tsToInputDate', () => {
    expect(tsToInputDate(inputDateToDate('2025-01-12'))).toBe('2025-01-12')
  })

  it('formatMonthYear gives "Jan 2025"', () => {
    expect(formatMonthYear(jan2025)).toBe('Jan 2025')
  })

  it('formatDateLong gives "12 Jan 2025"', () => {
    expect(formatDateLong(jan2025)).toBe('12 Jan 2025')
  })

  it('tenancyLength across a year and a quarter', () => {
    expect(tenancyLength(new Date(2024, 0, 1), new Date(2025, 3, 1))).toBe('1 yr 3 mo')
  })

  it('tenancyLength under a month reads in days', () => {
    expect(tenancyLength(new Date(2025, 0, 1), new Date(2025, 0, 10))).toBe('9 days')
  })

  it('tenancyLength same day reads "1 day"', () => {
    expect(tenancyLength(new Date(2025, 0, 1), new Date(2025, 0, 1))).toBe('1 day')
  })

  it('tenancyLength whole months only omits the year part when < 1yr', () => {
    expect(tenancyLength(new Date(2025, 0, 1), new Date(2025, 4, 1))).toBe('4 mo')
  })
})
