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
