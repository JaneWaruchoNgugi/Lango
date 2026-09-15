export const TOUR_STEPS = [
  { title: 'Register a visitor',   body: "A visitor's at the gate. On Visitors, tap “Register the sample visitor” — they're checked in instantly.", to: '/demo/manager/visitors' },
  { title: 'Approve a request',    body: 'A resident pre-registered a guest. Approve them under Pending approvals to let them in.', to: '/demo/manager/visitors' },
  { title: "See who's inside",     body: 'Everyone you admitted now appears under Currently Inside — live across every role.', to: '/demo/manager/visitors' },
  { title: 'Check in a delivery',  body: 'Open Deliveries and check in a parcel at the gate.', to: '/demo/manager/deliveries' },
  { title: 'Follow the timeline',  body: 'Everything you did lands on the dashboard activity feed — one connected system.', to: '/demo/manager' },
] as const

export const TOUR_STEP_COUNT = TOUR_STEPS.length

export interface TourState { active: boolean; step: number }
export const initialTourState: TourState = { active: false, step: 0 }

export type TourAction = { type: 'START' } | { type: 'NEXT' } | { type: 'DISMISS' }

export function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case 'START':   return { active: true, step: 0 }
    case 'NEXT':    return { ...state, step: Math.min(state.step + 1, TOUR_STEP_COUNT) }
    case 'DISMISS': return { active: false, step: 0 }
    default:        return state
  }
}

export const isTourComplete = (s: TourState): boolean => s.step >= TOUR_STEP_COUNT
