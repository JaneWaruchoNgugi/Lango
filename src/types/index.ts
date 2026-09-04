import { Timestamp } from 'firebase/firestore'

// ============================================================
// ENUMS
// ============================================================

export type UserRole = 'SUPER_ADMIN' | 'PROPERTY_MANAGER' | 'CARETAKER' | 'SECURITY_GUARD'

export type PropertyStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'ARCHIVED'

export type PropertyType =
  | 'APARTMENT_BLOCK'
  | 'GATED_ESTATE'
  | 'MIXED_USE'
  | 'SERVICED_APARTMENTS'
  | 'OTHER'

export type SubscriptionPlan = 'SMALL' | 'MEDIUM' | 'LARGE' | 'ESTATE'

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED'

export type BlockStatus = 'ACTIVE' | 'ARCHIVED'

export type UnitStatus = 'OCCUPIED' | 'VACANT' | 'RESERVED' | 'MAINTENANCE'

export type TenantStatus = 'ACTIVE' | 'MOVED_OUT' | 'INACTIVE'

export type VisitType = 'FRIENDLY_VISIT' | 'WORK' | 'DELIVERY' | 'SERVICE_PROVIDER'

export type VisitorStatus = 'INSIDE' | 'CHECKED_OUT' | 'DENIED' | 'CANCELLED'

export type DeliveryStatus = 'RECEIVED' | 'COLLECTED' | 'HELD' | 'RETURNED'

export type IncidentType =
  | 'SUSPICIOUS_VISITOR'
  | 'UNAUTHORIZED_ENTRY'
  | 'DISPUTE'
  | 'THEFT'
  | 'EMERGENCY'
  | 'OTHER'

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ShiftStatus = 'ACTIVE' | 'ENDED'

export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export type NotificationType = 'VISITOR_ALERT' | 'DELIVERY_ALERT' | 'INCIDENT_ALERT' | 'SYSTEM'

export type AuditAction =
  | 'STAFF_CREATED'
  | 'STAFF_DEACTIVATED'
  | 'PROPERTY_CREATED'
  | 'PROPERTY_SUSPENDED'
  | 'BLOCK_CREATED'
  | 'UNIT_CREATED'
  | 'TENANT_ASSIGNED'
  | 'TENANT_MOVED_OUT'
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'UNIT_STATUS_CHANGED'
  | 'INCIDENT_RESOLVED'
  | 'DELIVERY_HELD'
  | 'DELIVERY_RETURNED'
  | 'VISITOR_REGISTERED'
  | 'VISITOR_CHECKED_OUT'
  | 'VISITOR_DENIED'
  | 'DELIVERY_REGISTERED'
  | 'DELIVERY_COLLECTED'
  | 'INCIDENT_REPORTED'
  | 'SHIFT_STARTED'
  | 'SHIFT_ENDED'
  | 'SUBSCRIPTION_UPDATED'
  | 'LOGIN'

// ============================================================
// USER
// ============================================================

export interface AppUser {
  uid: string
  name: string
  email: string
  phone?: string
  role: UserRole
  propertyId: string | null    // null for SUPER_ADMIN
  status: StaffStatus
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt?: Timestamp
  createdBy?: string           // uid of SUPER_ADMIN who created this user
  tempPasswordSet?: boolean    // true if user hasn't changed temp password
}

// ============================================================
// PROPERTY
// ============================================================

export interface Property {
  propertyId: string
  name: string
  type: PropertyType
  address: string
  county: string
  city: string
  numberOfBlocks: number
  totalUnits: number
  primaryContact: string
  phone: string
  email: string
  plan: SubscriptionPlan
  status: PropertyStatus
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  // Computed / denormalized for dashboard
  occupiedUnits?: number
  vacantUnits?: number
  visitorsToday?: number
}

// ============================================================
// BLOCK
// ============================================================

export interface Block {
  blockId: string
  propertyId: string
  name: string           // e.g. "Block A", "Block B"
  prefix: string         // e.g. "A", "B" — used for unit numbering
  description?: string
  totalUnits: number
  status: BlockStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// UNIT
// ============================================================

export interface Unit {
  unitId: string
  propertyId: string
  blockId: string
  blockName: string      // denormalized for display
  unitNumber: string     // e.g. "A01", "B14"
  floor?: number
  status: UnitStatus
  currentTenantId: string | null
  currentTenantName?: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
  notes?: string
}

// ============================================================
// TENANT
// ============================================================

export interface Tenant {
  tenantId: string
  propertyId: string
  blockId: string
  unitId: string
  unitNumber: string      // denormalized
  blockName: string       // denormalized
  fullName: string
  phoneNumber: string
  whatsappNumber: string
  email?: string
  nationalId?: string
  moveInDate: Timestamp
  moveOutDate?: Timestamp | null
  status: TenantStatus
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

// ============================================================
// OCCUPANCY HISTORY
// ============================================================

export interface OccupancyRecord {
  recordId: string
  propertyId: string
  unitId: string
  unitNumber: string
  blockId: string
  blockName: string
  tenantId: string
  tenantName: string
  tenantPhone: string
  moveInDate: Timestamp
  moveOutDate: Timestamp | null
  createdAt: Timestamp
}

// ============================================================
// VISITOR
// ============================================================

export interface Visitor {
  visitorId: string
  propertyId: string
  blockId: string
  unitId: string
  unitNumber: string       // denormalized
  blockName: string        // denormalized
  tenantId: string
  tenantName: string       // denormalized
  guardId: string
  guardName: string        // denormalized
  shiftId?: string
  visitorName: string
  idNumber: string
  nationality: string
  phone: string
  photoUrl?: string
  visitType: VisitType
  reason: string
  status: VisitorStatus
  checkInTime: Timestamp
  checkOutTime?: Timestamp | null
  durationMinutes?: number | null
  notificationSent: boolean
  notes?: string
  // Conditional — populated only when relevant to the visit type:
  company?: string              // WORK / SERVICE_PROVIDER employer
  workType?: string             // WORK
  workDescription?: string      // WORK
  serviceType?: string          // SERVICE_PROVIDER (required at the form layer)
  serviceDescription?: string   // SERVICE_PROVIDER
  expectedDurationMins?: number // WORK / SERVICE_PROVIDER
  registeredBy: string          // authed guard uid — asserted by rules
  registeredByRole: 'SECURITY_GUARD'
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// PRE-APPROVED VISITOR
// ============================================================

export interface PreApprovedVisitor {
  id: string
  propertyId: string
  unitId: string
  unitNumber: string
  blockId?: string
  blockName?: string
  tenantId: string
  tenantName: string
  name: string
  idNumber: string
  phone?: string
  relationship?: string     // house help, family, etc.
  accessDays: number[]      // 0=Sun, 1=Mon ... 6=Sat
  accessStart: string       // "07:00"
  accessEnd: string         // "18:00"
  isActive: boolean
  createdAt: Timestamp
}

// ============================================================
// DELIVERY
// ============================================================

export interface Delivery {
  deliveryId: string
  propertyId: string
  blockId: string
  unitId: string
  unitNumber: string
  blockName: string
  tenantId: string
  tenantName: string
  guardId: string
  guardName: string
  registeredBy: string
  shiftId?: string
  company: string           // DHL, Glovo, Jumia, etc.
  riderName: string
  riderPhone: string
  riderIdNumber?: string
  packageDescription?: string
  photoUrl?: string
  status: DeliveryStatus
  receivedAt: Timestamp
  collectedAt?: Timestamp | null
  notificationSent: boolean
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// INCIDENT
// ============================================================

export interface Incident {
  incidentId: string
  propertyId: string
  guardId: string
  guardName: string
  type: IncidentType
  description: string
  severity: IncidentSeverity
  photoUrl?: string
  relatedVisitorId?: string
  relatedVisitorName?: string
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED'
  resolvedBy?: string
  resolvedAt?: Timestamp
  reportedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// SHIFT
// ============================================================

export interface Shift {
  shiftId: string
  propertyId: string
  guardId: string
  guardName: string
  status: ShiftStatus
  startTime: Timestamp
  endTime?: Timestamp | null
  visitorsRegistered: number
  deliveriesRegistered: number
  incidentsReported: number
  deviceInfo?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// SUBSCRIPTION
// ============================================================

export interface Subscription {
  subscriptionId: string
  propertyId: string
  planId: SubscriptionPlan
  status: SubscriptionStatus
  startDate: Timestamp
  renewalDate: Timestamp
  price: number           // in KES
  billingCycle: 'MONTHLY' | 'ANNUAL'
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface SubscriptionPlanConfig {
  planId: SubscriptionPlan
  name: string
  maxUnits: number
  monthlyPrice: number
  annualPrice: number
  features: string[]
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  SMALL: {
    planId: 'SMALL',
    name: 'Small',
    maxUnits: 20,
    monthlyPrice: 4000,
    annualPrice: 40000,
    features: ['Up to 20 units', 'WhatsApp alerts', 'Visitor log', 'Basic reports'],
  },
  MEDIUM: {
    planId: 'MEDIUM',
    name: 'Medium',
    maxUnits: 50,
    monthlyPrice: 8000,
    annualPrice: 80000,
    features: ['Up to 50 units', 'WhatsApp alerts', 'Delivery tracking', 'Full reports', 'Incident management'],
  },
  LARGE: {
    planId: 'LARGE',
    name: 'Large',
    maxUnits: 100,
    monthlyPrice: 15000,
    annualPrice: 150000,
    features: ['Up to 100 units', 'All Medium features', 'Multiple blocks', 'Contractor management', 'Analytics'],
  },
  ESTATE: {
    planId: 'ESTATE',
    name: 'Estate',
    maxUnits: 99999,
    monthlyPrice: 30000,
    annualPrice: 300000,
    features: ['Unlimited units', 'All Large features', 'Multi-property', 'API access', 'White-label option'],
  },
}

// ============================================================
// AUDIT LOG
// ============================================================

export interface AuditLog {
  logId: string
  actorId: string
  actorName: string
  actorRole: UserRole
  propertyId: string | null
  action: AuditAction
  entityType: string
  entityId: string
  description: string
  metadata?: Record<string, unknown>
  timestamp: Timestamp
}

// ============================================================
// NOTIFICATION
// ============================================================

export interface Notification {
  notificationId: string
  propertyId: string
  type: NotificationType
  recipientPhone: string
  recipientName: string
  message: string
  status: 'PENDING' | 'SENT' | 'FAILED' | 'MOCK'
  provider: 'WHATSAPP' | 'SMS' | 'MOCK'
  relatedEntityId?: string
  sentAt?: Timestamp
  createdAt: Timestamp
}

// ============================================================
// FORM TYPES (used in forms, not stored directly)
// ============================================================

export interface CreatePropertyForm {
  name: string
  type: PropertyType
  address: string
  county: string
  city: string
  numberOfBlocks: number
  totalUnits: number
  primaryContact: string
  phone: string
  email: string
  plan: SubscriptionPlan
  status: PropertyStatus
}

export interface CreateBlockForm {
  name: string
  prefix: string
  description?: string
  totalUnits: number
  autoGenerateUnits: boolean
}

export interface CreateTenantForm {
  fullName: string
  phoneNumber: string
  whatsappNumber: string
  email?: string
  nationalId?: string
  moveInDate: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelationship?: string
  notes?: string
}

export interface CreateStaffForm {
  name: string
  email: string
  phone: string
  role: Exclude<UserRole, 'SUPER_ADMIN'>
  propertyId: string
  status: StaffStatus
}

export interface ReportIncidentForm {
  type: IncidentType
  description: string
  severity: IncidentSeverity
  relatedVisitorId?: string
  notes?: string
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export interface AdminDashboardStats {
  totalProperties: number
  activeProperties: number
  trialProperties: number
  suspendedProperties: number
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  visitorsToday: number
  visitorsThisMonth: number
  activeGuards: number
  activeCaretakers: number
}

export interface PropertyDashboardStats {
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  visitorsToday: number
  currentlyInside: number
  deliveriesToday: number
  openIncidents: number
  activeGuards: number
}

// ============================================================
// AUTH CONTEXT TYPES
// ============================================================

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  role: UserRole | null
  propertyId: string | null
  profile: AppUser | null
}
