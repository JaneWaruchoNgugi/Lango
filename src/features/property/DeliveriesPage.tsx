import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDeliveries } from '../../hooks/useDeliveries'
import { markCollected, markHeld, markReturned } from '../../services/deliveryService'
import { canManageDeliveries } from '../../domain/permissions'
import { DeliveryStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Package } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { DeliveryStatus } from '../../types'

const TABS: (DeliveryStatus | 'ALL')[] = ['ALL', 'RECEIVED', 'COLLECTED', 'HELD', 'RETURNED']

export default function DeliveriesPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const canManage = canManageDeliveries(user?.role)
  const { deliveries, loading } = useDeliveries(user?.propertyId)
  const [tab, setTab] = useState<DeliveryStatus | 'ALL'>('ALL')
  const [busy, setBusy] = useState<string | null>(null)

  const shown = useMemo(() => tab === 'ALL' ? deliveries : deliveries.filter(d => d.status === tab), [deliveries, tab])

  const act = async (fn: () => Promise<void>, id: string) => {
    setBusy(id)
    try { await fn(); toast.success('Updated') } catch (e) { console.error(e); toast.error('Update failed') } finally { setBusy(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <h1 className="page-title">Deliveries</h1>
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-lg border ${tab === t ? 'bg-lango-primary text-white border-lango-primary' : 'border-gray-200 text-gray-600'}`}>{t}</button>)}
      </div>
      {shown.length === 0 ? <EmptyState icon={Package} title="No deliveries" /> : (
        <div className="space-y-3">
          {shown.map(d => (
            <div key={d.deliveryId} className="card p-4">
              <div className="flex items-center justify-between"><p className="font-medium text-gray-900">📦 {d.company}</p><DeliveryStatusBadge status={d.status} /></div>
              <p className="text-xs text-gray-500 mt-1">{d.riderName} · {d.blockName} {d.unitNumber} · {d.tenantName}</p>
              {d.packageDescription && <p className="text-xs text-gray-500">Package: {d.packageDescription}</p>}
              <p className="text-xs text-gray-400 mt-1">Received {format(d.receivedAt.toDate(), 'd MMM, h:mm a')}</p>
              {canManage && d.status === 'RECEIVED' && (
                <div className="flex gap-2 mt-3">
                  <button className="btn-secondary text-xs" disabled={busy === d.deliveryId} onClick={() => act(() => markCollected(d, actor), d.deliveryId)}>Mark collected</button>
                  <button className="btn-secondary text-xs" disabled={busy === d.deliveryId} onClick={() => act(() => markHeld(d, actor), d.deliveryId)}>Hold</button>
                  <button className="btn-secondary text-xs" disabled={busy === d.deliveryId} onClick={() => act(() => markReturned(d, actor), d.deliveryId)}>Return</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
