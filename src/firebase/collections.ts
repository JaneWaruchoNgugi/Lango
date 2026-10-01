import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore'
import { db } from './config'
import type {
  AppUser,
  Property,
  Block,
  Unit,
  Tenant,
  OccupancyRecord,
  Visitor,
  PreApprovedVisitor,
  Delivery,
  Incident,
  Shift,
  Subscription,
  AuditLog,
  Notification,
  Lead,
  AdminAlert,
  PlatformSettings,
  MaintenanceRequest,
  UnitPayment,
  BlacklistEntry,
  VehicleEntry,
  LeaseRecord,
  Complaint,
  UnitInspection,
  TenantInvite,
  Salon,
  SalonProvider,
  SalonClient,
  SalonService,
  SalonClientPricing,
  SalonPackage,
  SalonCheckout,
  SalonStaffPermissions,
  SalonPermissionAuditLog,
} from '../types'

// ============================================================
// TYPED COLLECTION REFERENCES
// ============================================================

export const usersCol       = collection(db, 'users')        as CollectionReference<AppUser>
export const propertiesCol  = collection(db, 'properties')   as CollectionReference<Property>
export const blocksCol      = collection(db, 'blocks')       as CollectionReference<Block>
export const unitsCol       = collection(db, 'units')        as CollectionReference<Unit>
export const tenantsCol     = collection(db, 'tenants')      as CollectionReference<Tenant>
export const occupanciesCol = collection(db, 'occupancies')  as CollectionReference<OccupancyRecord>
export const visitorsCol    = collection(db, 'visitors')     as CollectionReference<Visitor>
export const preApprovedCol = collection(db, 'preApproved')  as CollectionReference<PreApprovedVisitor>
export const deliveriesCol  = collection(db, 'deliveries')   as CollectionReference<Delivery>
export const incidentsCol   = collection(db, 'incidents')    as CollectionReference<Incident>
export const shiftsCol      = collection(db, 'shifts')       as CollectionReference<Shift>
export const subscriptionsCol = collection(db, 'subscriptions') as CollectionReference<Subscription>
export const auditLogsCol   = collection(db, 'auditLogs')    as CollectionReference<AuditLog>
export const notificationsCol = collection(db, 'notifications') as CollectionReference<Notification>
export const leadsCol         = collection(db, 'leads')         as CollectionReference<Lead>

// ============================================================
// DOCUMENT REFERENCE HELPERS
// ============================================================

export const userDoc       = (uid: string)        : DocumentReference<AppUser>       => doc(usersCol, uid)
export const propertyDoc   = (id: string)         : DocumentReference<Property>      => doc(propertiesCol, id)
export const blockDoc      = (id: string)         : DocumentReference<Block>         => doc(blocksCol, id)
export const unitDoc       = (id: string)         : DocumentReference<Unit>          => doc(unitsCol, id)
export const tenantDoc     = (id: string)         : DocumentReference<Tenant>        => doc(tenantsCol, id)
export const occupancyDoc  = (id: string)         : DocumentReference<OccupancyRecord> => doc(occupanciesCol, id)
export const visitorDoc    = (id: string)         : DocumentReference<Visitor>       => doc(visitorsCol, id)
export const deliveryDoc   = (id: string)         : DocumentReference<Delivery>      => doc(deliveriesCol, id)
export const incidentDoc   = (id: string)         : DocumentReference<Incident>      => doc(incidentsCol, id)
export const shiftDoc      = (id: string)         : DocumentReference<Shift>         => doc(shiftsCol, id)
export const subscriptionDoc  = (id: string)       : DocumentReference<Subscription>  => doc(subscriptionsCol, id)
export const notificationDoc  = (id: string)       : DocumentReference<Notification>  => doc(notificationsCol, id)
export const preApprovedDoc   = (id: string)       : DocumentReference<PreApprovedVisitor> => doc(preApprovedCol, id)
export const leadDoc          = (id: string): DocumentReference<Lead> => doc(leadsCol, id)
export const adminAlertsCol   = collection(db, 'adminAlerts')          as CollectionReference<AdminAlert>
export const adminAlertDoc    = (id: string): DocumentReference<AdminAlert> => doc(adminAlertsCol, id)

// Singleton platform settings document (Super Admin write, all staff read)
export const platformSettingsDoc = doc(db, 'platform_settings', 'main') as DocumentReference<PlatformSettings>

// ============================================================
// SALON MANAGEMENT COLLECTIONS
// ============================================================
export const salonsCol           = collection(db, 'salons')              as CollectionReference<Salon>
export const salonProvidersCol   = collection(db, 'salonProviders')      as CollectionReference<SalonProvider>
export const salonClientsCol     = collection(db, 'salonClients')        as CollectionReference<SalonClient>
export const salonServicesCol    = collection(db, 'salonServices')       as CollectionReference<SalonService>
export const salonPricingCol     = collection(db, 'salonClientPricing')  as CollectionReference<SalonClientPricing>
export const salonPackagesCol    = collection(db, 'salonPackages')       as CollectionReference<SalonPackage>
export const salonCheckoutsCol   = collection(db, 'salonCheckouts')      as CollectionReference<SalonCheckout>

export const salonDoc        = (id: string) => doc(salonsCol, id)
export const salonProviderDoc= (id: string) => doc(salonProvidersCol, id)
export const salonClientDoc  = (id: string) => doc(salonClientsCol, id)
export const salonServiceDoc = (id: string) => doc(salonServicesCol, id)
export const salonPricingDoc = (id: string) => doc(salonPricingCol, id)
export const salonPackageDoc = (id: string) => doc(salonPackagesCol, id)
export const salonCheckoutDoc= (id: string) => doc(salonCheckoutsCol, id)

export const salonStaffPermsCol     = collection(db, 'salonStaffPermissions') as CollectionReference<SalonStaffPermissions>
export const salonPermAuditCol      = collection(db, 'salonPermissionAudit')  as CollectionReference<SalonPermissionAuditLog>
export const salonStaffPermsDoc     = (uid: string) => doc(salonStaffPermsCol, uid)
export const salonPermAuditDoc      = (id: string)  => doc(salonPermAuditCol, id)

export const maintenanceCol  = collection(db, 'maintenance')  as CollectionReference<MaintenanceRequest>
export const paymentsCol     = collection(db, 'payments')     as CollectionReference<UnitPayment>
export const blacklistCol    = collection(db, 'blacklist')    as CollectionReference<BlacklistEntry>
export const vehicleLogCol   = collection(db, 'vehicleLog')   as CollectionReference<VehicleEntry>
export const leasesCol       = collection(db, 'leases')       as CollectionReference<LeaseRecord>
export const complaintsCol   = collection(db, 'complaints')   as CollectionReference<Complaint>
export const inspectionsCol    = collection(db, 'inspections')    as CollectionReference<UnitInspection>
export const tenantInvitesCol  = collection(db, 'tenantInvites')  as CollectionReference<TenantInvite>
