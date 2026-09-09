import { useEffect, useMemo, useState } from 'react'
import { loadActiveTenants, filterTenants } from '../services/tenantService'
import { loadPreApproved, matchPreApproved } from '../services/preApprovalService'
import type { Tenant, PreApprovedVisitor } from '../types'

export function useTenantSearch(propertyId: string | null | undefined) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [preApproved, setPreApproved] = useState<PreApprovedVisitor[]>([])
  const [term, setTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    let active = true
    setLoading(true)
    Promise.all([loadActiveTenants(propertyId), loadPreApproved(propertyId)])
      .then(([t, p]) => { if (active) { setTenants(t); setPreApproved(p) } })
      .catch(err => console.error('[useTenantSearch]', err))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [propertyId])

  const results = useMemo(() => filterTenants(tenants, term), [tenants, term])
  const preApprovedMatches = useMemo(() => matchPreApproved(preApproved, term), [preApproved, term])
  return { term, setTerm, results, preApprovedMatches, tenants, preApproved, loading }
}
