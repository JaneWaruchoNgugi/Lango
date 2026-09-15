export type DemoRole = 'MANAGER' | 'GUARD' | 'CARETAKER' | 'RESIDENT'

export type DemoVisitorStatus = 'PENDING' | 'INSIDE' | 'CHECKED_OUT'
export type DemoVisitType = 'FRIENDLY_VISIT' | 'WORK' | 'DELIVERY' | 'SERVICE_PROVIDER'
export type DemoDeliveryStatus = 'EXPECTED' | 'RECEIVED' | 'COLLECTED' | 'HELD'
export type DemoIncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED'
export type DemoUnitStatus = 'OCCUPIED' | 'VACANT'
export type DemoStaffStatus = 'ACTIVE' | 'INACTIVE'
export type DemoShiftStatus = 'ON' | 'OFF'
export type DemoActivityKind = 'CHECK_IN' | 'CHECK_OUT' | 'DELIVERY' | 'INCIDENT' | 'APPROVAL' | 'SHIFT'

export interface DemoProperty { name: string; location: string; residentCount: number }
export interface DemoBlock { id: string; name: string }
export interface DemoUnit { id: string; blockId: string; unitNumber: string; status: DemoUnitStatus; tenantName: string | null; previousTenants: string[] }
export interface DemoTenant { id: string; name: string; unitNumber: string; phone: string }
export interface DemoVisitor {
  id: string; name: string; unitNumber: string; type: DemoVisitType
  status: DemoVisitorStatus; checkInLabel: string | null
}
export interface DemoDelivery { id: string; company: string; unitNumber: string; expectedLabel: string; status: DemoDeliveryStatus }
export interface DemoIncident { id: string; type: string; location: string; reportedBy: string; timeLabel: string; status: DemoIncidentStatus; assignedTo?: string }
export interface DemoStaff { id: string; name: string; role: string; status: DemoStaffStatus }
export interface DemoActivity { id: string; kind: DemoActivityKind; title: string; subtitle: string; timeLabel: string }
export interface DemoShift { staffId: string; status: DemoShiftStatus; startedLabel: string | null }
export interface DemoApproval { id: string; visitorId: string; visitorName: string; unitNumber: string; purpose: string; type: DemoVisitType }

export interface DemoState {
  role: DemoRole | null
  property: DemoProperty
  blocks: DemoBlock[]
  units: DemoUnit[]
  tenants: DemoTenant[]
  visitors: DemoVisitor[]
  deliveries: DemoDelivery[]
  incidents: DemoIncident[]
  staff: DemoStaff[]
  activity: DemoActivity[]
  shifts: DemoShift[]
  approvals: DemoApproval[]
}
