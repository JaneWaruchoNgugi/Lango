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
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Delivery Check-in</h1><p className="text-sm text-gray-500">Receive and check in deliveries.</p></div>
      </div>

      <div className="inline-flex bg-gray-100 rounded-xl p-1">
        {(['today', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-lango-primary text-white' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card py-14 flex flex-col items-center text-center px-6">
          <div className="w-28 h-28 rounded-full bg-lango-primary/5 flex items-center justify-center mb-5"><Package className="w-12 h-12 text-lango-primary/40" /></div>
          <h3 className="font-bold text-gray-900">No deliveries</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{tab === 'today' ? 'No deliveries received today yet.' : 'No past deliveries to show.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(d => (
            <div key={d.deliveryId} className="card p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-lango-primary" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{d.company}</p>
                <p className="text-xs text-gray-500 truncate">{d.unitNumber}{d.riderName ? ` · ${d.riderName}` : ''}</p>
                <p className="text-xs text-gray-400">Received {format(d.receivedAt.toDate(), 'h:mm a')}</p>
              </div>
              {d.status === 'RECEIVED'
                ? <button className="btn-primary text-xs shrink-0" disabled={busy === d.deliveryId} onClick={() => collect(d)}>Check In</button>
                : <DeliveryStatusBadge status={d.status} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
