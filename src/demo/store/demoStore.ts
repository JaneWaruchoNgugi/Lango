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
export const selectVacantUnits = (s: DemoState) => s.units.filter(u => u.status === 'VACANT')

interface DemoActions {
  setRole: (role: DemoRole) => void
  addActivity: (entry: DemoActivity) => void
  resetDemo: () => void
  addTenant: (input: { name: string; phone: string; unitNumber: string }) => void
  updateTenant: (id: string, patch: { name?: string; phone?: string }) => void
}

export type DemoStore = DemoState & DemoActions

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...seed(),
      setRole: (role) => set({ role }),
      addActivity: (entry) => set({ activity: [entry, ...get().activity] }),
      addTenant: ({ name, phone, unitNumber }) => set((s) => {
        const uid = crypto.randomUUID()
        return {
          tenants: [...s.tenants, { id: `t-${uid}`, name, unitNumber, phone }],
          units: s.units.map(u => u.unitNumber === unitNumber ? { ...u, status: 'OCCUPIED' as const, tenantName: name } : u),
          activity: [{ id: `act-${uid}`, kind: 'APPROVAL' as const, title: 'Tenant added', subtitle: `${unitNumber} · ${name}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      updateTenant: (id, patch) => set((s) => {
        const t = s.tenants.find(x => x.id === id)
        return {
          tenants: s.tenants.map(x => x.id === id ? { ...x, ...patch } : x),
          units: (patch.name && t) ? s.units.map(u => u.unitNumber === t.unitNumber ? { ...u, tenantName: patch.name! } : u) : s.units,
        }
      }),
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
