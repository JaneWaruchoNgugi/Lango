import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDeliveries } from '../../hooks/useDeliveries'
import { markCollected } from '../../services/deliveryService'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { DeliveryStatusBadge } from '../../components/ui/StatusBadge'
import { Package } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Delivery } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Segmented } from '../../components/ui/Segmented'

export default function DeliveriesPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { deliveries, loading } = useDeliveries(user?.propertyId)
  const [busy, setBusy] = useState<string | null>(null)
  const [tab, setTab] = useState<'today' | 'history'>('today')

  const { today, history } = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const today: Delivery[] = [], history: Delivery[] = []
    for (const d of deliveries) (d.receivedAt.toDate() >= start ? today : history).push(d)
    return { today, history }
  }, [deliveries])
  const shown = tab === 'today' ? today : history

  const collect = async (d: Delivery) => {
    setBusy(d.deliveryId)
    try { await markCollected(d, actor); toast.success('Checked in') }
    catch { toast.error('Update failed') } finally { setBusy(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <PageHeader icon={Package} title="Deliveries" subtitle="Receive parcels and hand them over to residents." className="!mb-2" />

      <Segmented value={tab} onChange={setTab} options={[{ value: 'today', label: 'Today' }, { value: 'history', label: 'History' }]} />

      {shown.length === 0 ? (
        <EmptyState card icon={Package} title="No deliveries" description={tab === 'today' ? 'No deliveries received today yet.' : 'No past deliveries to show.'} />
      ) : (
        <div className="space-y-3">
          {shown.map(d => (
            <div key={d.deliveryId} className="card p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-lango-light flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-lango-primary" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{d.company}</p>
                <p className="text-xs text-gray-500 truncate">{d.unitNumber}{d.riderName ? ` · ${d.riderName}` : ''}</p>
                <p className="text-xs text-gray-400 mt-0.5">Received {format(d.receivedAt.toDate(), 'h:mm a')}</p>
              </div>
              {d.status === 'RECEIVED'
                ? <button className="btn-primary shrink-0" disabled={busy === d.deliveryId} onClick={() => collect(d)}>Check In</button>
                : <DeliveryStatusBadge status={d.status} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
