import { getDocs, query, where, orderBy } from 'firebase/firestore'
import { tenantsCol } from '../firebase/collections'
import type { Tenant } from '../types'

/** Loads ACTIVE tenants for a property once; the UI filters this list live. */
export async function loadActiveTenants(propertyId: string): Promise<Tenant[]> {
  const snap = await getDocs(query(tenantsCol,
    where('propertyId', '==', propertyId), where('status', '==', 'ACTIVE'), orderBy('fullName')))
  return snap.docs.map(d => d.data() as Tenant)
}

export function filterTenants(tenants: Tenant[], term: string): Tenant[] {
  const t = term.trim().toLowerCase()
  if (!t) return tenants
  return tenants.filter(x =>
    x.fullName.toLowerCase().includes(t) ||
    x.unitNumber.toLowerCase().includes(t) ||
    x.blockName.toLowerCase().includes(t) ||
    x.phoneNumber.includes(t) || (x.whatsappNumber ?? '').includes(t))
}
