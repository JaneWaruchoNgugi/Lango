import { useEffect, useState } from 'react'
import { watchActiveShift } from '../services/shiftService'
import type { Shift } from '../types'

export function useShift(guardId: string | null | undefined, propertyId: string | null | undefined) {
  const [shift, setShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!guardId || !propertyId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchActiveShift(
      guardId,
      propertyId,
      s => { setShift(s); setLoading(false) },
      () => setLoading(false),
    )
    return unsub
  }, [guardId, propertyId])
  return { shift, loading }
}
