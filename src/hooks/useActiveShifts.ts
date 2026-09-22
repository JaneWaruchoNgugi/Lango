import { useEffect, useState } from 'react'
import { watchActiveShifts } from '../services/shiftService'
import type { Shift } from '../types'

export function useActiveShifts(propertyId: string | null | undefined) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchActiveShifts(propertyId,
      s => { setShifts(s); setLoading(false) },
      () => setLoading(false),
    )
    return unsub
  }, [propertyId])
  return { shifts, loading }
}
