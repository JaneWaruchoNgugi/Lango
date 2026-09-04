import { useEffect, useState } from 'react'
import { watchDeliveries } from '../services/deliveryService'
import type { Delivery, DeliveryStatus } from '../types'

export function useDeliveries(propertyId: string | null | undefined, status?: DeliveryStatus) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    if (!propertyId) { setLoading(false); return }
    setLoading(true)
    const unsub = watchDeliveries(propertyId,
      d => { setDeliveries(d); setLoading(false) },
      e => { setError(e); setLoading(false) }, status)
    return unsub
  }, [propertyId, status])
  return { deliveries, loading, error }
}
