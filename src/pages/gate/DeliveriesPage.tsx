import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDeliveries } from '../../hooks/useDeliveries'
import { markCollected } from '../../services/deliveryService'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { DeliveryStatusBadge } from '../../components/ui/StatusBadge'
import { Package } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Delivery } from '../../types'

export default function DeliveriesPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { deliveries, loading } = useDeliveries(user?.propertyId)
  const [busy, setBusy] = useState<string | null>(null)

  const collect = async (d: Delivery) => {
    setBusy(d.deliveryId)
    try { await markCollected(d, actor); toast.success('Marked collected') }
    catch { toast.error('Update failed') } finally { setBusy(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <h1 className="page-title">Deliveries</h1>
      {deliveries.length === 0 ? <EmptyState icon={Package} title="No deliveries" /> : (
        <div className="space-y-3">
          {deliveries.map(d => (
            <div key={d.deliveryId} className="card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">📦 {d.company}</p><DeliveryStatusBadge status={d.status} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{d.riderName} · {d.blockName} {d.unitNumber} · {d.tenantName}</p>
              {d.packageDescription && <p className="text-xs text-gray-500">Package: {d.packageDescription}</p>}
              <p className="text-xs text-gray-400 mt-1">Received {format(d.receivedAt.toDate(), 'h:mm a')}</p>
              {d.status === 'RECEIVED' && <button className="btn-secondary text-sm mt-3" disabled={busy === d.deliveryId} onClick={() => collect(d)}>Mark Collected</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
