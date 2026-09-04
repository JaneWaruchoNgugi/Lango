import { useEffect, useState } from 'react'
import { watchInside } from '../services/visitorService'
import type { Visitor } from '../types'

export function useCurrentVisitors(propertyId: string | null | undefined) {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchInside(propertyId,
      v => { setVisitors(v); setLoading(false) },
      e => { setError(e); setLoading(false) })
    return unsub
  }, [propertyId])
  return { visitors, loading, error }
}
