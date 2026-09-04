import { useEffect, useState } from 'react'
import { watchIncidents } from '../services/incidentService'
import type { Incident } from '../types'

export function useIncidents(propertyId: string | null | undefined, status?: Incident['status']) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchIncidents(propertyId,
      i => { setIncidents(i); setLoading(false) },
      e => { setError(e); setLoading(false) }, status)
    return unsub
  }, [propertyId, status])
  return { incidents, loading, error }
}
