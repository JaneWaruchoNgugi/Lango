import { describe, it, expect } from 'vitest'
import { filterVisitors, type VisitorFilters } from './visitorFilters'
import type { Visitor } from '../../types'

const v = (over: Partial<Visitor>): Visitor => ({
  visitorId: 'x', propertyId: 'p', blockId: 'b1', unitId: 'u1', unitNumber: 'A01', blockName: 'Block A',
  tenantId: 't1', tenantName: 'Jane', guardId: 'g1', guardName: 'Guard', visitorName: 'John',
  idNumber: '', nationality: '', phone: '', visitType: 'FRIENDLY_VISIT', reason: '',
  status: 'INSIDE', checkInTime: { toDate: () => new Date() } as never, notificationSent: false,
  registeredBy: 'g1', registeredByRole: 'SECURITY_GUARD',
  createdAt: {} as never, updatedAt: {} as never,
  ...over,
})

describe('filterVisitors', () => {
  const list = [
    v({ visitorName: 'John', visitType: 'DELIVERY', status: 'CHECKED_OUT', blockId: 'b1', unitId: 'u1', guardId: 'g1' }),
    v({ visitorName: 'Mary', visitType: 'WORK', status: 'INSIDE', blockId: 'b2', unitId: 'u2', guardId: 'g2' }),
  ]
  it('no filters returns all', () => { expect(filterVisitors(list, {} as VisitorFilters)).toHaveLength(2) })
  it('filters by type', () => { expect(filterVisitors(list, { visitType: 'WORK' })).toHaveLength(1) })
  it('filters by status', () => { expect(filterVisitors(list, { status: 'INSIDE' })).toHaveLength(1) })
  it('filters by block and unit', () => { expect(filterVisitors(list, { blockId: 'b1', unitId: 'u1' })).toHaveLength(1) })
  it('filters by guard', () => { expect(filterVisitors(list, { guardId: 'g2' })[0].visitorName).toBe('Mary') })
  it('search matches name/tenant', () => { expect(filterVisitors(list, { term: 'jane' })).toHaveLength(2) })
})
