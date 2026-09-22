import { useEffect, useState } from 'react'
import { listShifts } from '../services/shiftService'
import type { Shift } from '../types'

export function useShiftHistory(propertyId: string | null | undefined, guardId?: string | null) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    let active = true
    setLoading(true)
    listShifts(propertyId, { status: 'ENDED', guardId: guardId ?? undefined })
      .then(s => { if (active) setShifts(s) })
      .catch(e => console.error('[useShiftHistory]', e))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [propertyId, guardId, nonce])
  return { shifts, loading, reload: () => setNonce(n => n + 1) }
}
