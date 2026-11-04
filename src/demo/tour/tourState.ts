export const TOUR_STEPS = [
  { title: 'Register a visitor',   body: "A visitor's at the gate. On Visitors, tap “Register a visitor” and fill in the form — they're checked in instantly.", to: '/demo/manager/visitors' },
  { title: 'Approve a request',    body: 'A resident pre-registered a guest. Approve them under Pending approvals to let them in.', to: '/demo/manager/visitors' },
  { title: "See who's inside",     body: 'Everyone you admitted now appears under Currently Inside — live across every role.', to: '/demo/manager/visitors' },
  { title: 'Check in a delivery',  body: 'Open Deliveries and check in a parcel at the gate.', to: '/demo/manager/deliveries' },
  { title: 'Follow the timeline',  body: 'Everything you did lands on the dashboard activity feed — one connected system.', to: '/demo/manager' },
] as const

export const TOUR_STEP_COUNT = TOUR_STEPS.length

export const SALON_TOUR_STEPS = [
  { title: 'Register a client',     body: 'A client walks in. Add her services and pick who does each one. Prices fill in for you.', to: '/demo/salon/reception/register' },
  { title: 'Watch the floor',       body: 'Reception sees everyone in the salon, which services are done and who is doing them.', to: '/demo/salon/reception' },
  { title: 'Stylists mark work done', body: 'Each provider sees only their own clients, never prices. Tap “Done” when a service is finished.', to: '/demo/salon/provider' },
  { title: 'Take payment',          body: 'Pick the client, choose M-Pesa or cash and confirm. The visit closes and the money is recorded.', to: '/demo/salon/reception/checkout' },
  { title: 'The owner sees it all', body: 'Revenue, provider performance and every checkout land on the owner dashboard, live.', to: '/demo/salon/owner' },
] as const

export type TourKind = 'property' | 'salon'
export const TOURS = { property: TOUR_STEPS, salon: SALON_TOUR_STEPS } as const

export interface TourState { active: boolean; step: number }
export const initialTourState: TourState = { active: false, step: 0 }

export type TourAction = { type: 'START' } | { type: 'NEXT' } | { type: 'DISMISS' }

export function tourReducer(state: TourState, action: TourAction, count: number = TOUR_STEP_COUNT): TourState {
  switch (action.type) {
    case 'START':   return { active: true, step: 0 }
    case 'NEXT':    return { ...state, step: Math.min(state.step + 1, count) }
    case 'DISMISS': return { active: false, step: 0 }
    default:        return state
  }
}

export const isTourComplete = (s: TourState, count: number = TOUR_STEP_COUNT): boolean => s.step >= count
