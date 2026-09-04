import { useEffect, useState } from 'react'
import { listStaff, listActiveShiftGuardIds } from '../services/staffService'
import type { AppUser } from '../types'

export function useStaff(propertyId: string | null | undefined) {
  const [staff, setStaff] = useState<AppUser[]>([])
  const [onShift, setOnShift] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    let active = true
    setLoading(true)
    Promise.all([listStaff(propertyId), listActiveShiftGuardIds(propertyId)])
      .then(([s, ids]) => { if (active) { setStaff(s); setOnShift(ids) } })
      .catch(e => console.error('[useStaff]', e))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [propertyId])
  return { staff, onShift, loading }
}
