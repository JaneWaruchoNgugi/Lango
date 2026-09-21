import { describe, it, expect } from 'vitest'
import { tourReducer, initialTourState, isTourComplete, TOUR_STEPS, TOUR_STEP_COUNT } from './tourState'

describe('tourReducer', () => {
  it('START activates and sets step 0', () => {
    expect(tourReducer(initialTourState, { type: 'START' })).toEqual({ active: true, step: 0 })
  })

  it('NEXT increments the step', () => {
    expect(tourReducer({ active: true, step: 0 }, { type: 'NEXT' }).step).toBe(1)
  })

  it('NEXT from the last step reaches completion (5) and stays active', () => {
    const s = tourReducer({ active: true, step: TOUR_STEP_COUNT - 1 }, { type: 'NEXT' })
    expect(s.step).toBe(TOUR_STEP_COUNT)
    expect(s.active).toBe(true)
    expect(isTourComplete(s)).toBe(true)
  })

  it('NEXT never exceeds TOUR_STEP_COUNT', () => {
    const s = tourReducer({ active: true, step: TOUR_STEP_COUNT }, { type: 'NEXT' })
    expect(s.step).toBe(TOUR_STEP_COUNT)
  })

  it('DISMISS deactivates and resets to step 0', () => {
    expect(tourReducer({ active: true, step: 3 }, { type: 'DISMISS' })).toEqual({ active: false, step: 0 })
  })
})

describe('TOUR_STEPS', () => {
  it('has 5 steps, all targeting the manager surface', () => {
    expect(TOUR_STEPS).toHaveLength(5)
    expect(TOUR_STEP_COUNT).toBe(5)
    expect(TOUR_STEPS.every(s => s.to.startsWith('/demo/manager'))).toBe(true)
  })

  it('isTourComplete is false before the last step', () => {
    expect(isTourComplete({ active: true, step: 4 })).toBe(false)
  })
})
