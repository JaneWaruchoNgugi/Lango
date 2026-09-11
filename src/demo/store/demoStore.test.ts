import { describe, it, expect, beforeEach } from 'vitest'
import { seed } from '../data/seed'
import { useDemoStore, selectCurrentlyInside, selectOpenIncidents, selectVisitorsToday, selectExpectedToday, selectVacantUnits } from './demoStore'

describe('demo store selectors', () => {
  it('selectCurrentlyInside counts INSIDE visitors', () => {
    expect(selectCurrentlyInside(seed())).toBe(2)
  })
  it('selectOpenIncidents counts OPEN incidents', () => {
    expect(selectOpenIncidents(seed())).toBe(1)
  })
  it('selectVisitorsToday is 8 and selectExpectedToday is 5', () => {
    expect(selectVisitorsToday(seed())).toBe(8)
    expect(selectExpectedToday(seed())).toBe(5)
  })
})

describe('demo store actions', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('setRole updates the role', () => {
    useDemoStore.getState().setRole('MANAGER')
    expect(useDemoStore.getState().role).toBe('MANAGER')
  })

  it('addActivity prepends a new activity entry', () => {
    const before = useDemoStore.getState().activity.length
    useDemoStore.getState().addActivity({ id: 'x', kind: 'CHECK_IN', title: 'Test', subtitle: 'A-01', timeLabel: '1:00 PM' })
    const after = useDemoStore.getState().activity
    expect(after).toHaveLength(before + 1)
    expect(after[0].id).toBe('x')
  })

  it('resetDemo restores seeded data but preserves the current role', () => {
    useDemoStore.getState().setRole('GUARD')
    useDemoStore.getState().addActivity({ id: 'y', kind: 'CHECK_IN', title: 'T', subtitle: 's', timeLabel: 't' })
    useDemoStore.getState().resetDemo()
    expect(useDemoStore.getState().activity).toHaveLength(seed().activity.length)
    expect(useDemoStore.getState().role).toBe('GUARD')
  })
})

describe('demo store tenant mutations', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('selectVacantUnits returns only VACANT units', () => {
    const vacant = selectVacantUnits(useDemoStore.getState())
    expect(vacant.length).toBeGreaterThan(0)
    expect(vacant.every(u => u.status === 'VACANT')).toBe(true)
  })

  it('addTenant occupies a vacant unit, adds a tenant, and logs activity', () => {
    const s0 = useDemoStore.getState()
    const unit = selectVacantUnits(s0)[0]
    const tenantsBefore = s0.tenants.length
    const activityBefore = s0.activity.length
    useDemoStore.getState().addTenant({ name: 'Test Tenant', phone: '+254700000000', unitNumber: unit.unitNumber })
    const s1 = useDemoStore.getState()
    expect(s1.tenants).toHaveLength(tenantsBefore + 1)
    expect(s1.units.find(u => u.unitNumber === unit.unitNumber)!.status).toBe('OCCUPIED')
    expect(s1.units.find(u => u.unitNumber === unit.unitNumber)!.tenantName).toBe('Test Tenant')
    expect(s1.activity).toHaveLength(activityBefore + 1)
    expect(s1.activity[0].title).toBe('Tenant added')
  })

  it('updateTenant edits the tenant and syncs the unit tenantName', () => {
    const t = useDemoStore.getState().tenants.find(x => x.unitNumber === 'A-101')!
    useDemoStore.getState().updateTenant(t.id, { name: 'Renamed Person', phone: '+254711111111' })
    const s1 = useDemoStore.getState()
    const updated = s1.tenants.find(x => x.id === t.id)!
    expect(updated.name).toBe('Renamed Person')
    expect(updated.phone).toBe('+254711111111')
    expect(s1.units.find(u => u.unitNumber === 'A-101')!.tenantName).toBe('Renamed Person')
  })
})

import { selectInsideVisitors, selectPendingApprovals } from './demoStore'

describe('demo store visitor lifecycle', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('registerVisitor adds an approval and a "Visitor registered" activity, no inside visitor', () => {
    const insideBefore = selectCurrentlyInside(useDemoStore.getState())
    const apBefore = selectPendingApprovals(useDemoStore.getState()).length
    useDemoStore.getState().registerVisitor({ name: 'Brian Ochieng', unitNumber: 'A-204', type: 'FRIENDLY_VISIT' })
    const s = useDemoStore.getState()
    expect(selectPendingApprovals(s)).toHaveLength(apBefore + 1)
    expect(selectCurrentlyInside(s)).toBe(insideBefore)
    expect(s.activity[0].title).toBe('Visitor registered')
  })

  it('approveVisitor moves the visitor inside and removes the approval', () => {
    useDemoStore.getState().registerVisitor({ name: 'Brian Ochieng', unitNumber: 'A-204', type: 'FRIENDLY_VISIT' })
    const ap = selectPendingApprovals(useDemoStore.getState()).find(a => a.visitorName === 'Brian Ochieng')!
    const insideBefore = selectCurrentlyInside(useDemoStore.getState())
    useDemoStore.getState().approveVisitor(ap.id)
    const s = useDemoStore.getState()
    expect(selectPendingApprovals(s).some(a => a.id === ap.id)).toBe(false)
    expect(selectCurrentlyInside(s)).toBe(insideBefore + 1)
    expect(selectInsideVisitors(s).some(v => v.name === 'Brian Ochieng')).toBe(true)
    expect(s.activity[0].title).toBe('Brian Ochieng checked in')
  })

  it('declineVisitor removes the approval without adding an inside visitor', () => {
    const ap = selectPendingApprovals(useDemoStore.getState())[0]
    const insideBefore = selectCurrentlyInside(useDemoStore.getState())
    useDemoStore.getState().declineVisitor(ap.id)
    const s = useDemoStore.getState()
    expect(selectPendingApprovals(s).some(a => a.id === ap.id)).toBe(false)
    expect(selectCurrentlyInside(s)).toBe(insideBefore)
  })

  it('checkOutVisitor lowers the inside count and marks CHECKED_OUT', () => {
    const inside = selectInsideVisitors(useDemoStore.getState())[0]
    const insideBefore = selectCurrentlyInside(useDemoStore.getState())
    useDemoStore.getState().checkOutVisitor(inside.id)
    const s = useDemoStore.getState()
    expect(selectCurrentlyInside(s)).toBe(insideBefore - 1)
    expect(s.visitors.find(v => v.id === inside.id)!.status).toBe('CHECKED_OUT')
  })
})
