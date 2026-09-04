import { useEffect, useState } from 'react'
import { listOccupanciesByUnit } from '../services/occupancyService'
import type { OccupancyRecord } from '../types'

export function useOccupancyHistory(propertyId: string | null | undefined, unitId: string | null | undefined) {
  const [records, setRecords] = useState<OccupancyRecord[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!propertyId || !unitId) { setRecords([]); setLoading(false); return }
    let active = true
    setLoading(true)
    listOccupanciesByUnit(propertyId, unitId)
      .then(r => { if (active) setRecords(r) })
      .catch(e => console.error('[useOccupancyHistory]', e))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [propertyId, unitId])
  return { records, loading }
}
