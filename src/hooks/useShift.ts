import { useEffect, useState } from 'react'
import { watchActiveShift } from '../services/shiftService'
import type { Shift } from '../types'

export function useShift(guardId: string | null | undefined) {
  const [shift, setShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!guardId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchActiveShift(guardId,
      s => { setShift(s); setLoading(false) },
      () => setLoading(false))
    return unsub
  }, [guardId])
  return { shift, loading }
}
