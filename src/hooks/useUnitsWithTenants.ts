import { useCallback, useEffect, useState } from 'react'
import { listUnitsWithTenant, listBlocks } from '../services/unitService'
import type { Block, Unit } from '../types'

export function useUnitsWithTenants(propertyId: string | null | undefined) {
  const [units, setUnits] = useState<Unit[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const reload = useCallback(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    Promise.all([listUnitsWithTenant(propertyId), listBlocks(propertyId)])
      .then(([u, b]) => { setUnits(u); setBlocks(b) })
      .catch(e => console.error('[useUnitsWithTenants]', e)).finally(() => setLoading(false))
  }, [propertyId])
  useEffect(() => { reload() }, [reload])
  return { units, blocks, loading, reload }
}
