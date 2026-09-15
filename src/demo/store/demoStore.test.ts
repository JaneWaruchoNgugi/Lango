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

describe('demo store delivery lifecycle', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('checkInDelivery moves an EXPECTED delivery to RECEIVED and logs activity', () => {
    const d = useDemoStore.getState().deliveries.find(x => x.status === 'EXPECTED')!
    useDemoStore.getState().checkInDelivery(d.id)
    const s = useDemoStore.getState()
    expect(s.deliveries.find(x => x.id === d.id)!.status).toBe('RECEIVED')
    expect(s.activity[0].title).toBe('Delivery checked in')
    expect(s.activity[0].kind).toBe('DELIVERY')
  })

  it('checkInDelivery is a no-op on a non-EXPECTED delivery', () => {
    const d = useDemoStore.getState().deliveries.find(x => x.status === 'EXPECTED')!
    useDemoStore.getState().checkInDelivery(d.id)          // -> RECEIVED
    const activityLen = useDemoStore.getState().activity.length
    useDemoStore.getState().checkInDelivery(d.id)          // no-op
    const s = useDemoStore.getState()
    expect(s.deliveries.find(x => x.id === d.id)!.status).toBe('RECEIVED')
    expect(s.activity).toHaveLength(activityLen)
  })

  it('collectDelivery moves a RECEIVED delivery to COLLECTED and logs activity', () => {
    const d = useDemoStore.getState().deliveries.find(x => x.status === 'EXPECTED')!
    useDemoStore.getState().checkInDelivery(d.id)          // -> RECEIVED
    useDemoStore.getState().collectDelivery(d.id)          // -> COLLECTED
    const s = useDemoStore.getState()
    expect(s.deliveries.find(x => x.id === d.id)!.status).toBe('COLLECTED')
    expect(s.activity[0].title).toBe('Delivery collected')
  })

  it('collectDelivery is a no-op on a non-RECEIVED delivery', () => {
    const d = useDemoStore.getState().deliveries.find(x => x.status === 'EXPECTED')!
    const activityLen = useDemoStore.getState().activity.length
    useDemoStore.getState().collectDelivery(d.id)          // still EXPECTED -> no-op
    const s = useDemoStore.getState()
    expect(s.deliveries.find(x => x.id === d.id)!.status).toBe('EXPECTED')
    expect(s.activity).toHaveLength(activityLen)
  })

  it('registerDelivery appends an EXPECTED delivery and logs activity', () => {
    const before = useDemoStore.getState().deliveries.length
    useDemoStore.getState().registerDelivery({ company: 'Glovo', unitNumber: 'A-101' })
    const s = useDemoStore.getState()
    expect(s.deliveries).toHaveLength(before + 1)
    const added = s.deliveries[s.deliveries.length - 1]
    expect(added.company).toBe('Glovo')
    expect(added.status).toBe('EXPECTED')
    expect(s.activity[0].title).toBe('Delivery registered')
  })
})

describe('demo store incident lifecycle', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('createIncident adds an OPEN incident and raises selectOpenIncidents', () => {
    const openBefore = selectOpenIncidents(useDemoStore.getState())
    useDemoStore.getState().createIncident({ type: 'Noise Complaint', location: 'Block C', reportedBy: 'Mercy Njeri' })
    const s = useDemoStore.getState()
    expect(selectOpenIncidents(s)).toBe(openBefore + 1)
    expect(s.incidents[s.incidents.length - 1].status).toBe('OPEN')
    expect(s.activity[0].title).toBe('Incident reported')
    expect(s.activity[0].kind).toBe('INCIDENT')
  })

  it('setIncidentStatus RESOLVED lowers selectOpenIncidents; INVESTIGATING does not', () => {
    const inc = useDemoStore.getState().incidents.find(i => i.status === 'OPEN')!
    const openBefore = selectOpenIncidents(useDemoStore.getState())
    useDemoStore.getState().setIncidentStatus(inc.id, 'INVESTIGATING')
    expect(selectOpenIncidents(useDemoStore.getState())).toBe(openBefore) // OPEN count unchanged
    useDemoStore.getState().setIncidentStatus(inc.id, 'RESOLVED')
    const s = useDemoStore.getState()
    expect(s.incidents.find(i => i.id === inc.id)!.status).toBe('RESOLVED')
    expect(selectOpenIncidents(s)).toBe(openBefore - 1)
    expect(s.activity[0].title).toBe('Incident resolved')
  })

  it('assignIncident sets assignedTo and logs activity', () => {
    const inc = useDemoStore.getState().incidents.find(i => i.status === 'OPEN')!
    useDemoStore.getState().assignIncident(inc.id, 'James Mwangi')
    const s = useDemoStore.getState()
    expect(s.incidents.find(i => i.id === inc.id)!.assignedTo).toBe('James Mwangi')
    expect(s.activity[0].title).toBe('Incident assigned')
  })
})

import { selectShiftFor } from './demoStore'

describe('demo store shift lifecycle', () => {
  beforeEach(() => { useDemoStore.getState().resetDemo() })

  it('selectShiftFor returns the seeded shift and undefined for unknown ids', () => {
    expect(selectShiftFor('s-2')(useDemoStore.getState())!.status).toBe('OFF')
    expect(selectShiftFor('nope')(useDemoStore.getState())).toBeUndefined()
  })

  it('startShift flips OFF->ON, sets startedLabel, logs a SHIFT activity', () => {
    useDemoStore.getState().startShift('s-2')
    const s = useDemoStore.getState()
    const shift = selectShiftFor('s-2')(s)!
    expect(shift.status).toBe('ON')
    expect(shift.startedLabel).toBeTruthy()
    expect(s.activity[0].kind).toBe('SHIFT')
    expect(s.activity[0].title).toContain('started their shift')
  })

  it('endShift flips ON->OFF, clears startedLabel, logs a SHIFT activity', () => {
    useDemoStore.getState().startShift('s-2')
    useDemoStore.getState().endShift('s-2')
    const s = useDemoStore.getState()
    const shift = selectShiftFor('s-2')(s)!
    expect(shift.status).toBe('OFF')
    expect(shift.startedLabel).toBeNull()
    expect(s.activity[0].title).toContain('ended their shift')
  })

  it('startShift/endShift are no-ops for an unknown staff id', () => {
    const before = useDemoStore.getState().activity.length
    useDemoStore.getState().startShift('nope')
    useDemoStore.getState().endShift('nope')
    expect(useDemoStore.getState().activity).toHaveLength(before)
  })
})
