import { describe, it, expect } from 'vitest'
import { isAccessAllowedNow, matchPreApproved } from './preApprovalService'
import type { PreApprovedVisitor } from '../types'

const p = { name: 'Susan Akinyi', unitNumber: 'B14', accessDays: [1,2,3,4,5], accessStart: '07:00', accessEnd: '18:00' } as PreApprovedVisitor

describe('isAccessAllowedNow', () => {
  it('allows Wednesday 10:00', () => { expect(isAccessAllowedNow(p, new Date('2026-09-02T10:00:00'))).toBe(true) })
  it('blocks Sunday', () => { expect(isAccessAllowedNow(p, new Date('2026-09-06T10:00:00'))).toBe(false) })
  it('blocks 19:00', () => { expect(isAccessAllowedNow(p, new Date('2026-09-02T19:00:00'))).toBe(false) })
})
describe('matchPreApproved', () => {
  it('matches by name', () => { expect(matchPreApproved([p], 'susan')).toHaveLength(1) })
  it('empty term → none', () => { expect(matchPreApproved([p], '')).toHaveLength(0) })
})
