import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { seed } from '../data/seed'
import type { DemoRole, DemoState, DemoActivity } from '../data/types'

// Fixed headline counts for the current demo day (independent of live INSIDE count).
const VISITORS_TODAY = 8
const EXPECTED_TODAY = 5

export const selectCurrentlyInside = (s: DemoState): number => s.visitors.filter(v => v.status === 'INSIDE').length
export const selectOpenIncidents = (s: DemoState): number => s.incidents.filter(i => i.status === 'OPEN').length
export const selectVisitorsToday = (_s: DemoState): number => VISITORS_TODAY
export const selectExpectedToday = (_s: DemoState): number => EXPECTED_TODAY

interface DemoActions {
  setRole: (role: DemoRole) => void
  addActivity: (entry: DemoActivity) => void
  resetDemo: () => void
}

export type DemoStore = DemoState & DemoActions

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...seed(),
      setRole: (role) => set({ role }),
      addActivity: (entry) => set({ activity: [entry, ...get().activity] }),
      resetDemo: () => set({ ...seed(), role: get().role }),
    }),
    {
      name: 'lango-demo',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      // Persist only the data slices, never the action functions.
      partialize: (s) => ({
        role: s.role, property: s.property, blocks: s.blocks, units: s.units, tenants: s.tenants,
        visitors: s.visitors, deliveries: s.deliveries, incidents: s.incidents, staff: s.staff,
        activity: s.activity, shifts: s.shifts, approvals: s.approvals,
      }),
    },
  ),
)
