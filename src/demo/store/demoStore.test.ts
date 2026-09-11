import { describe, it, expect, beforeEach } from 'vitest'
import { seed } from '../data/seed'
import { useDemoStore, selectCurrentlyInside, selectOpenIncidents, selectVisitorsToday, selectExpectedToday } from './demoStore'

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
