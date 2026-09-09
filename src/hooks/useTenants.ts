import { useCallback, useEffect, useState } from 'react'
import { listTenants } from '../services/tenantService'
import type { Tenant, TenantStatus } from '../types'

export function useTenants(propertyId: string | null | undefined, status?: TenantStatus) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true); setError(null)
    listTenants(propertyId, status)
      .then(setTenants)
      .catch(e => { console.error('[useTenants]', e); setError(e?.message ?? 'Failed to load tenants') })
      .finally(() => setLoading(false))
  }, [propertyId, status])
  useEffect(() => { reload() }, [reload])
  return { tenants, loading, error, reload }
}
