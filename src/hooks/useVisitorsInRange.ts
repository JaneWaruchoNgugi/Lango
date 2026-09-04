import { useEffect, useState } from 'react'
import { watchVisitorsInRange } from '../services/visitorService'
import type { Visitor } from '../types'

export function useVisitorsInRange(propertyId: string | null | undefined, from: Date, to: Date) {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const fromMs = from.getTime(); const toMs = to.getTime()
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchVisitorsInRange(propertyId, new Date(fromMs), new Date(toMs),
      v => { setVisitors(v); setLoading(false) },
      e => { console.error('[useVisitorsInRange]', e); setLoading(false) })
    return unsub
  }, [propertyId, fromMs, toMs])
  return { visitors, loading }
}
