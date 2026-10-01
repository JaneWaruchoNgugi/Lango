import { Timestamp } from 'firebase/firestore'

// ============================================================
// ENUMS
// ============================================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'PROPERTY_MANAGER'
  | 'CARETAKER'
  | 'SECURITY_GUARD'
  | 'SALON_OWNER'
  | 'SALON_RECEPTIONIST'
  | 'SALON_PROVIDER'

export type PropertyStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'ARCHIVED'

export type PropertyType =
  | 'APARTMENT_BLOCK'
  | 'GATED_ESTATE'
  | 'MIXED_USE'
  | 'SERVICED_APARTMENTS'
  | 'OTHER'

export type StructureType = 'BLOCKS' | 'SINGLE_BUILDING' | 'VILLAS' | 'CUSTOM'

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

export type ShiftType = 'DAY' | 'NIGHT'

export const SHIFT_CONFIG: Record<ShiftType, { label: string; start: string; end: string }> = {
  DAY:   { label: 'Day Shift',   start: '06:00', end: '18:00' },
  NIGHT: { label: 'Night Shift', start: '18:00', end: '06:00' },
}

export const DEFAULT_SECURITY_POSTS = ['Main Gate', 'Back Gate', 'Service Gate', 'Parking']

export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export type NotificationType = 'VISITOR_ALERT' | 'DELIVERY_ALERT' | 'INCIDENT_ALERT' | 'SYSTEM'

export type AuditAction =
  | 'STAFF_CREATED'
  | 'STAFF_DEACTIVATED'
  | 'STAFF_DELETED'
  | 'PROPERTY_CREATED'
  | 'PROPERTY_SUSPENDED'
  | 'BLOCK_CREATED'
  | 'BLOCK_DELETED'
  | 'UNIT_CREATED'
  | 'UNITS_BULK_CREATED'
  | 'UNIT_RENAMED'
  | 'UNIT_DELETED'
  | 'TENANT_ASSIGNED'
  | 'TENANT_MOVED_OUT'
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'UNIT_STATUS_CHANGED'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_STATUS_CHANGED'
  | 'INCIDENT_NOTE_ADDED'
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
  salonId?: string | null      // for salon roles
  status: StaffStatus
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt?: Timestamp
  createdBy?: string           // uid of SUPER_ADMIN who created this user
  tempPasswordSet?: boolean    // true if user hasn't changed temp password
  idNumber?: string            // guard national ID
  guardNumber?: string         // guard employee/badge number
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
  numberOfBlocks?: number
  totalUnits?: number
  structureType?: StructureType   // absent ⇒ treated as 'BLOCKS'
  primaryContact: string
  phone: string
  email: string
  plan: SubscriptionPlan
  status: PropertyStatus
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  trialEndDate?: Timestamp       // when status = TRIAL; auto-suspend when this passes
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
  blockId?: string | null
  blockName?: string | null   // denormalized for display; null when block-less
  unitNumber: string          // e.g. "A01", "B14"
  floor?: string              // label, e.g. 'Ground', '1st Floor', 'PH'
  displayName?: string        // defaults to unitNumber for display
  unitType?: string           // free-form in P1; managed catalog in P3
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
  blockId?: string | null
  unitId: string
  unitNumber: string      // denormalized
  blockName?: string | null   // denormalized
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
  blockId?: string | null
  blockName?: string | null
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

export type VehicleType = 'CAR' | 'MOTORBIKE' | 'VAN' | 'TRUCK' | 'OTHER'

export interface Visitor {
  visitorId: string
  propertyId: string
  blockId?: string | null
  unitId: string
  unitNumber: string       // denormalized
  blockName?: string | null   // denormalized
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
  tenantPhone?: string        // denormalized at SMS send time for reply correlation
  smsNotifiedAt?: Timestamp   // when the tenant was last SMSed
  tenantApproval?: 'APPROVED' | 'DENIED' | null
  notes?: string
  // Conditional — populated only when relevant to the visit type:
  company?: string              // WORK / SERVICE_PROVIDER employer
  workType?: string             // WORK
  workDescription?: string      // WORK
  serviceType?: string          // SERVICE_PROVIDER (required at the form layer)
  serviceDescription?: string   // SERVICE_PROVIDER
  expectedDurationMins?: number // WORK / SERVICE_PROVIDER
  appointment?: 'SCHEDULED' | 'UNSCHEDULED' // SERVICE_PROVIDER
  vehicleRegistration?: string  // any type — vehicle plate
  vehicleType?: VehicleType | null   // complements the plate
  vehicleDescription?: string        // make / colour, e.g. "white Toyota"
  gatePassNumber?: string            // physical badge/pass handed over at entry
  itemsBroughtIn?: string            // notable tools/equipment, checked on exit
  numberOfVisitors?: number     // FRIENDLY_VISIT — party size
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
  blockId?: string | null
  blockName?: string | null
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
  blockId?: string | null
  unitId: string
  unitNumber: string
  blockName?: string | null
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
  deliveryType?: string     // Food, Parcel, Groceries, etc.
  trackingNumber?: string   // courier tracking / order number
  vehicleRegistration?: string
  vehicleType?: VehicleType | null
  vehicleDescription?: string
  gatePassNumber?: string
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
  shiftType?: ShiftType
  securityPost?: string
  handoverNote?: string
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
  billingNotes?: string
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
// LEAD (public landing-page demo requests)
// ============================================================

export type LeadStatus = 'NEW' | 'CONTACTED' | 'CLOSED'

export interface Lead {
  leadId: string
  name: string
  propertyName: string
  propertyType: string   // Residential | Commercial | Institutional | Industrial | Other
  phone: string
  email?: string
  message?: string
  source: 'LANDING_FORM'
  status: LeadStatus
  createdAt: Timestamp
}

// ============================================================
// ADMIN ALERTS (platform-level alerts for Super Admin, written by Cloud Fns)
// ============================================================

export interface AdminAlert {
  alertId: string
  type: 'NEW_LEAD'
  leadId: string
  name: string
  phone: string
  propertyType: string
  read: boolean
  createdAt: Timestamp
}

// ============================================================
// PLATFORM SETTINGS (platform_settings/main in Firestore)
// ============================================================

export interface PlatformSettings {
  subscriptionPricing: {
    SMALL: number
    MEDIUM: number
    LARGE: number
    ESTATE: number
  }
  defaultSecurityPosts: string[]
  updatedAt: Timestamp
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
// SETTINGS TYPES
// ============================================================

export interface NotificationPreferences {
  visitor: boolean
  delivery: boolean
  incident: boolean
  emergency: boolean
  channels: {
    inApp: boolean
    whatsapp: boolean
  }
}

export interface PropertySettings {
  emergencyContact: string
  timezone: string
  visitorApprovalRequired: boolean
  allowWalkInVisitors: boolean
  requireVisitorId: boolean
  requireVisitorPhoto: boolean
  visitorApprovalTimeoutMins: number
  invitationExpiryHours: number
  enableDeliveryTracking: boolean
  deliveryNotifications: boolean
  requireCollectorName: boolean
  requireDeliveryPhoto: boolean
  dayShiftStart: string
  dayShiftEnd: string
  nightShiftStart: string
  nightShiftEnd: string
  shiftGracePeriodMins: number
}

export interface UserPreferences {
  soundEnabled: boolean
  vibrationEnabled: boolean
  use24HourTime: boolean
  language: string
  darkMode?: boolean
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
  salonId: string | null
  profile: AppUser | null
}

// ============================================================
// MAINTENANCE REQUEST
// ============================================================

export type MaintenanceStatus   = 'PENDING' | 'IN_PROGRESS' | 'DONE'
export type MaintenanceCategory = 'PLUMBING' | 'ELECTRICAL' | 'STRUCTURAL' | 'CLEANING' | 'APPLIANCE' | 'OTHER'
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface MaintenanceRequest {
  id: string
  propertyId: string
  unitNumber: string
  category: MaintenanceCategory
  description: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  assignedTo?: string | null
  resolvedDate?: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

// ============================================================
// UNIT PAYMENT
// ============================================================

export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE'
export type PaymentMethod = 'CASH' | 'MPESA' | 'BANK' | 'OTHER'

export interface UnitPayment {
  id: string
  propertyId: string
  unitNumber: string
  tenantName?: string | null
  month: string           // "2026-09"
  status: PaymentStatus
  amount?: number | null
  paymentMethod?: PaymentMethod | null
  mpesaCode?: string | null
  notes?: string | null
  paidAt?: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  recordedBy: string
}

// ============================================================
// BLACKLIST
// ============================================================

export interface BlacklistEntry {
  id: string
  propertyId: string
  name: string
  idNumber?: string | null
  phone?: string | null
  reason: string
  isActive: boolean
  addedBy: string
  addedByName: string
  dateAdded: Timestamp
  createdAt: Timestamp
}

// ============================================================
// VEHICLE ENTRY LOG
// ============================================================

export interface VehicleEntry {
  id: string
  propertyId: string
  plate: string
  vehicleType: VehicleType
  makeModel?: string | null
  driverName: string
  driverPhone?: string | null
  unitVisiting?: string | null
  purpose?: string | null
  checkIn: Timestamp
  checkOut?: Timestamp | null
  registeredBy: string
  registeredByName: string
  createdAt: Timestamp
}

// ============================================================
// LEASE RECORD
// ============================================================

export interface LeaseRecord {
  id: string
  propertyId: string
  unitNumber: string
  tenantId: string
  tenantName: string
  tenantPhone?: string | null
  moveInDate: Timestamp
  leaseDurationMonths: number
  leaseEndDate: Timestamp
  monthlyRent?: number | null
  notes?: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================
// COMPLAINT
// ============================================================

export type ComplaintCategory = 'NOISE' | 'CLEANLINESS' | 'SECURITY' | 'MAINTENANCE' | 'NEIGHBOUR' | 'MANAGEMENT' | 'OTHER'
export type ComplaintStatus   = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED'

export interface Complaint {
  id: string
  propertyId: string
  unitNumber?: string | null
  tenantName?: string | null
  category: ComplaintCategory
  description: string
  status: ComplaintStatus
  response?: string | null
  resolvedAt?: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

// ============================================================
// UNIT INSPECTION
// ============================================================

export type InspectionType     = 'MOVE_IN' | 'MOVE_OUT' | 'ROUTINE'
export type InspectionCondition = 'GOOD' | 'FAIR' | 'POOR' | 'NA'

export interface InspectionItem {
  label: string
  condition: InspectionCondition
  notes?: string
}

export interface UnitInspection {
  id: string
  propertyId: string
  unitNumber: string
  tenantName?: string | null
  type: InspectionType
  items: InspectionItem[]
  overallNotes?: string | null
  conductedBy: string
  conductedByName: string
  createdAt: Timestamp
}

// ============================================================
// TENANT PORTAL INVITE
// ============================================================

export interface TenantInvite {
  id: string
  propertyId: string
  tenantId: string
  tenantName: string
  unitNumber: string
  token: string
  expiresAt: Timestamp
  used: boolean
  usedAt?: Timestamp | null
  createdAt: Timestamp
  createdBy: string
}

// ============================================================
// SALON STAFF PERMISSIONS
// ============================================================

export type SalonDataVisibility = 'OWN_CLIENTS' | 'BRANCH_CLIENTS' | 'ALL_CLIENTS'

export type SalonPermissionKey =
  | 'viewClientName' | 'viewServiceHistory' | 'viewAllergiesNotes'
  | 'viewPhone' | 'viewEmail' | 'viewAddress'
  | 'createClients' | 'editClients' | 'deleteClients'
  | 'createBookings' | 'editBookings' | 'cancelBookings' | 'completeBookings'
  | 'viewPrices' | 'viewPayments' | 'viewRevenue' | 'viewReports'
  | 'manageStaff' | 'manageProviders' | 'manageBranches'
  | 'manageServices' | 'manageMarketing' | 'deleteRecords'

export interface SalonStaffPermissions {
  uid: string
  salonId: string
  staffName: string
  role: UserRole
  isActive: boolean
  // Client data
  viewClientName: boolean
  viewServiceHistory: boolean
  viewAllergiesNotes: boolean
  viewPhone: boolean
  viewEmail: boolean
  viewAddress: boolean
  createClients: boolean
  editClients: boolean
  deleteClients: boolean
  // Bookings
  createBookings: boolean
  editBookings: boolean
  cancelBookings: boolean
  completeBookings: boolean
  // Financial
  viewPrices: boolean
  viewPayments: boolean
  viewRevenue: boolean
  viewReports: boolean
  // Management
  manageStaff: boolean
  manageProviders: boolean
  manageBranches: boolean
  manageServices: boolean
  manageMarketing: boolean
  deleteRecords: boolean
  // Visibility scope
  dataVisibility: SalonDataVisibility
  updatedAt: Timestamp
  updatedBy: string
  updatedByName: string
}

export interface SalonPermissionAuditLog {
  logId: string
  salonId: string
  staffId: string
  staffName: string
  changedBy: string
  changedByName: string
  previousPermissions: Partial<Record<SalonPermissionKey, boolean>> & { dataVisibility?: SalonDataVisibility }
  newPermissions: Partial<Record<SalonPermissionKey, boolean>> & { dataVisibility?: SalonDataVisibility }
  timestamp: Timestamp
}

export const PROVIDER_DEFAULT_PERMISSIONS: Omit<SalonStaffPermissions, 'uid' | 'salonId' | 'staffName' | 'role' | 'updatedAt' | 'updatedBy' | 'updatedByName'> = {
  isActive: true,
  viewClientName: true,
  viewServiceHistory: true,
  viewAllergiesNotes: true,
  viewPhone: false,
  viewEmail: false,
  viewAddress: false,
  createClients: false,
  editClients: false,
  deleteClients: false,
  createBookings: false,
  editBookings: false,
  cancelBookings: false,
  completeBookings: true,
  viewPrices: false,
  viewPayments: false,
  viewRevenue: false,
  viewReports: false,
  manageStaff: false,
  manageProviders: false,
  manageBranches: false,
  manageServices: false,
  manageMarketing: false,
  deleteRecords: false,
  dataVisibility: 'OWN_CLIENTS',
}

export const RECEPTIONIST_DEFAULT_PERMISSIONS: Omit<SalonStaffPermissions, 'uid' | 'salonId' | 'staffName' | 'role' | 'updatedAt' | 'updatedBy' | 'updatedByName'> = {
  isActive: true,
  viewClientName: true,
  viewServiceHistory: true,
  viewAllergiesNotes: false,
  viewPhone: true,
  viewEmail: false,
  viewAddress: false,
  createClients: true,
  editClients: true,
  deleteClients: false,
  createBookings: true,
  editBookings: true,
  cancelBookings: true,
  completeBookings: true,
  viewPrices: true,
  viewPayments: true,
  viewRevenue: false,
  viewReports: false,
  manageStaff: false,
  manageProviders: false,
  manageBranches: false,
  manageServices: false,
  manageMarketing: false,
  deleteRecords: false,
  dataVisibility: 'ALL_CLIENTS',
}

// ============================================================
// SALON MANAGEMENT MODULE
// ============================================================

export type SalonStatus = 'ACTIVE' | 'INACTIVE'

export type SalonServiceType =
  | 'HAIR_UNDOING'
  | 'HAIR_WASHING'
  | 'BLOW_DRY'
  | 'HAIR_DRESSING'
  | 'MANICURE'
  | 'PEDICURE'
  | 'LASH_SERVICE'
  | 'TATTOO'
  | 'CLEANING'
  | 'OTHER'

export const SALON_SERVICE_LABELS: Record<SalonServiceType, string> = {
  HAIR_UNDOING: 'Hair Undoing',
  HAIR_WASHING: 'Hair Washing',
  BLOW_DRY:     'Blow-dry',
  HAIR_DRESSING:'Hair Dressing',
  MANICURE:     'Manicure',
  PEDICURE:     'Pedicure',
  LASH_SERVICE: 'Lash Service',
  TATTOO:       'Tattoo',
  CLEANING:     'Cleaning',
  OTHER:        'Other',
}

export type SalonServiceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type SalonClientStatus  = 'ACTIVE' | 'CHECKED_OUT' | 'CANCELLED'
export type SalonPaymentMethod = 'MPESA' | 'CASH' | 'OTHER'

export interface Salon {
  salonId: string
  name: string
  initials: string          // used in provider code generation e.g. "LS"
  phone: string
  location: string
  status: SalonStatus
  ownerUid?: string | null
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  providerCount: number     // atomic counter for provider code generation
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

export interface SalonProvider {
  providerId: string        // Firestore doc id
  salonId: string
  providerCode: string      // e.g. "LS001JD" — unique within salon
  name: string
  phone: string
  idNumber?: string | null
  services: SalonServiceType[]
  status: SalonStatus
  uid?: string | null       // Firebase Auth UID once account is created
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

// One Firestore doc per client visit session
export interface SalonClient {
  clientId: string
  salonId: string
  name: string
  phone: string
  packageId?: string | null  // set if part of a group/family package
  status: SalonClientStatus
  receptionistId: string
  receptionistName: string
  checkoutId?: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Service line item — NO price stored here (providers can read this)
export interface SalonService {
  serviceId: string
  salonId: string
  clientId: string
  clientName: string
  providerId: string         // SalonProvider.providerId (Firestore doc id)
  providerUid?: string | null // Firebase Auth UID of provider (for query by uid)
  providerName: string
  providerCode: string
  serviceType: SalonServiceType
  serviceName?: string
  status: SalonServiceStatus
  serviceDate: Timestamp
  receptionistId: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Pricing doc — same id as clientId; ONLY owner/receptionist can read
export interface SalonClientPricing {
  clientId: string
  salonId: string
  servicesPricing: Array<{
    serviceId: string
    serviceType: SalonServiceType
    providerId: string
    price: number
  }>
  totalAmount: number
  updatedAt: Timestamp
}

export interface SalonPackage {
  packageId: string
  salonId: string
  label: string                   // e.g. "Mama + Mtoto package"
  memberClientIds: string[]
  memberNames: string[]
  totalAmount: number
  status: 'PENDING' | 'CHECKED_OUT'
  receptionistId: string
  receptionistName: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Full checkout record — ONLY owner/receptionist can read
export interface SalonCheckout {
  checkoutId: string
  salonId: string
  clientId: string
  clientName: string
  packageId?: string | null
  servicesSnapshot: Array<{
    serviceId: string
    serviceType: SalonServiceType
    providerId: string
    providerName: string
    providerCode: string
    price: number
  }>
  totalAmount: number
  paymentMethod: SalonPaymentMethod
  mpesaCode?: string | null
  paymentConfirmed: boolean
  hasComplaint: boolean
  complaintText?: string | null
  satisfied: boolean | null
  receptionistId: string
  receptionistName: string
  checkoutAt: Timestamp
  createdAt: Timestamp
}
