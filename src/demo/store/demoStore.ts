import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { seed } from '../data/seed'
import type { DemoRole, DemoState, DemoActivity, DemoVisitType, DemoIncidentStatus } from '../data/types'

// Fixed headline counts for the current demo day (independent of live INSIDE count).
const VISITORS_TODAY = 8
const EXPECTED_TODAY = 5
const VISIT_PURPOSE: Record<DemoVisitType, string> = {
  FRIENDLY_VISIT: 'Personal visit', WORK: 'Work', DELIVERY: 'Delivery', SERVICE_PROVIDER: 'Service provider',
}

export const selectCurrentlyInside = (s: DemoState): number => s.visitors.filter(v => v.status === 'INSIDE').length
// "Open" = not yet resolved; an incident under investigation is still open.
export const selectOpenIncidents = (s: DemoState): number => s.incidents.filter(i => i.status !== 'RESOLVED').length
export const selectVisitorsToday = (_s: DemoState): number => VISITORS_TODAY
export const selectExpectedToday = (_s: DemoState): number => EXPECTED_TODAY
export const selectVacantUnits = (s: DemoState) => s.units.filter(u => u.status === 'VACANT')
export const selectPendingApprovals = (s: DemoState) => s.approvals
export const selectInsideVisitors = (s: DemoState) => s.visitors.filter(v => v.status === 'INSIDE')
export const selectShiftFor = (staffId: string) => (s: DemoState) => s.shifts.find(x => x.staffId === staffId)

interface DemoActions {
  setRole: (role: DemoRole) => void
  addActivity: (entry: DemoActivity) => void
  resetDemo: () => void
  addTenant: (input: { name: string; phone: string; unitNumber: string }) => void
  updateTenant: (id: string, patch: { name?: string; phone?: string }) => void
  registerVisitor: (input: { name: string; unitNumber: string; type: DemoVisitType }) => void
  approveVisitor: (approvalId: string) => void
  declineVisitor: (approvalId: string) => void
  checkOutVisitor: (visitorId: string) => void
  checkInDelivery: (id: string) => void
  collectDelivery: (id: string) => void
  registerDelivery: (input: { company: string; unitNumber: string }) => void
  createIncident: (input: { type: string; location: string; reportedBy: string }) => void
  setIncidentStatus: (id: string, status: DemoIncidentStatus) => void
  assignIncident: (id: string, staffName: string) => void
  startShift: (staffId: string) => void
  endShift: (staffId: string) => void
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
      registerVisitor: ({ name, unitNumber, type }) => set((s) => {
        const uid = crypto.randomUUID()
        return {
          approvals: [...s.approvals, { id: `ap-${uid}`, visitorId: `v-${uid}`, visitorName: name, unitNumber, purpose: VISIT_PURPOSE[type], type }],
          activity: [{ id: `act-${uid}`, kind: 'APPROVAL' as const, title: 'Visitor registered', subtitle: `${unitNumber} · ${name}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      approveVisitor: (approvalId) => set((s) => {
        const a = s.approvals.find(x => x.id === approvalId)
        if (!a) return {}
        return {
          approvals: s.approvals.filter(x => x.id !== approvalId),
          visitors: [{ id: a.visitorId, name: a.visitorName, unitNumber: a.unitNumber, type: a.type, status: 'INSIDE' as const, checkInLabel: 'Just now' }, ...s.visitors],
          activity: [{ id: `act-${a.visitorId}`, kind: 'CHECK_IN' as const, title: `${a.visitorName} checked in`, subtitle: `${a.unitNumber} · ${a.purpose}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      declineVisitor: (approvalId) => set((s) => {
        const a = s.approvals.find(x => x.id === approvalId)
        if (!a) return {}
        return {
          approvals: s.approvals.filter(x => x.id !== approvalId),
          activity: [{ id: `act-dec-${a.id}`, kind: 'CHECK_OUT' as const, title: `${a.visitorName}'s entry declined`, subtitle: a.unitNumber, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      checkOutVisitor: (visitorId) => set((s) => {
        const v = s.visitors.find(x => x.id === visitorId && x.status === 'INSIDE')
        if (!v) return {}
        return {
          visitors: s.visitors.map(x => x.id === visitorId ? { ...x, status: 'CHECKED_OUT' as const } : x),
          activity: [{ id: `act-out-${visitorId}`, kind: 'CHECK_OUT' as const, title: `${v.name} checked out`, subtitle: v.unitNumber, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      checkInDelivery: (id) => set((s) => {
        const d = s.deliveries.find(x => x.id === id && x.status === 'EXPECTED')
        if (!d) return {}
        return {
          deliveries: s.deliveries.map(x => x.id === id ? { ...x, status: 'RECEIVED' as const } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'DELIVERY' as const, title: 'Delivery checked in', subtitle: `${d.unitNumber} · ${d.company}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      collectDelivery: (id) => set((s) => {
        const d = s.deliveries.find(x => x.id === id && x.status === 'RECEIVED')
        if (!d) return {}
        return {
          deliveries: s.deliveries.map(x => x.id === id ? { ...x, status: 'COLLECTED' as const } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'DELIVERY' as const, title: 'Delivery collected', subtitle: `${d.unitNumber} · ${d.company}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      registerDelivery: ({ company, unitNumber }) => set((s) => {
        const uid = crypto.randomUUID()
        return {
          deliveries: [...s.deliveries, { id: `d-${uid}`, company, unitNumber, expectedLabel: 'Just now', status: 'EXPECTED' as const }],
          activity: [{ id: `act-${uid}`, kind: 'DELIVERY' as const, title: 'Delivery registered', subtitle: `${unitNumber} · ${company}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      createIncident: ({ type, location, reportedBy }) => set((s) => {
        const uid = crypto.randomUUID()
        return {
          incidents: [...s.incidents, { id: `i-${uid}`, type, location, reportedBy, timeLabel: 'Just now', status: 'OPEN' as const }],
          activity: [{ id: `act-${uid}`, kind: 'INCIDENT' as const, title: 'Incident reported', subtitle: `${location} · ${type}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      setIncidentStatus: (id, status) => set((s) => {
        const inc = s.incidents.find(x => x.id === id)
        if (!inc) return {}
        const title = status === 'RESOLVED' ? 'Incident resolved'
          : status === 'INVESTIGATING' ? 'Incident under investigation'
          : 'Incident reopened'
        return {
          incidents: s.incidents.map(x => x.id === id ? { ...x, status } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'INCIDENT' as const, title, subtitle: `${inc.location} · ${inc.type}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      assignIncident: (id, staffName) => set((s) => {
        const inc = s.incidents.find(x => x.id === id)
        if (!inc) return {}
        return {
          incidents: s.incidents.map(x => x.id === id ? { ...x, assignedTo: staffName } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'INCIDENT' as const, title: 'Incident assigned', subtitle: `${staffName} · ${inc.location}`, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      startShift: (staffId) => set((s) => {
        const shift = s.shifts.find(x => x.staffId === staffId)
        const member = s.staff.find(x => x.id === staffId)
        if (!shift || !member) return {}
        return {
          shifts: s.shifts.map(x => x.staffId === staffId ? { ...x, status: 'ON' as const, startedLabel: 'Started 8:02 AM' } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'SHIFT' as const, title: `${member.name} started their shift`, subtitle: member.role, timeLabel: 'Just now' }, ...s.activity],
        }
      }),
      endShift: (staffId) => set((s) => {
        const shift = s.shifts.find(x => x.staffId === staffId)
        const member = s.staff.find(x => x.id === staffId)
        if (!shift || !member) return {}
        return {
          shifts: s.shifts.map(x => x.staffId === staffId ? { ...x, status: 'OFF' as const, startedLabel: null } : x),
          activity: [{ id: `act-${crypto.randomUUID()}`, kind: 'SHIFT' as const, title: `${member.name} ended their shift`, subtitle: member.role, timeLabel: 'Just now' }, ...s.activity],
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
