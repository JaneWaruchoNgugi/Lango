import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDeliveries } from '../../hooks/useDeliveries'
import { markCollected, markHeld, markReturned } from '../../services/deliveryService'
import { canManageDeliveries } from '../../domain/permissions'
import { DeliveryStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { Package, Plus, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { DeliveryStatus } from '../../types'

const TABS: (DeliveryStatus | 'ALL')[] = ['ALL', 'RECEIVED', 'COLLECTED', 'HELD', 'RETURNED']

export default function DeliveriesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const canManage = canManageDeliveries(user?.role)
  const { deliveries, loading } = useDeliveries(user?.propertyId)
  const [tab, setTab] = useState<DeliveryStatus | 'ALL'>('ALL')
  const [term, setTerm] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const base = user?.role === 'PROPERTY_MANAGER' ? '/property' : user?.role === 'SECURITY_GUARD' ? '/gate' : '/caretaker'
  const addDelivery = () => navigate(`${base}/register`)

  const shown = useMemo(() => {
    const q = term.trim().toLowerCase()
    return deliveries
      .filter(d => tab === 'ALL' || d.status === tab)
      .filter(d => !q || [d.company, d.riderName, d.unitNumber, d.tenantName, d.trackingNumber, d.packageDescription]
        .some(v => v?.toLowerCase().includes(q)))
  }, [deliveries, tab, term])

  const act = async (fn: () => Promise<void>, id: string) => {
    setBusy(id)
    try { await fn(); toast.success('Updated') } catch (e) { console.error(e); toast.error('Update failed') } finally { setBusy(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-lango-primary" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Deliveries</h1><p className="text-sm text-gray-500">Track and manage all delivery requests.</p></div>
        </div>
        <button className="btn-primary" onClick={addDelivery}><Plus className="w-4 h-4" /> Add Delivery</button>
      </div>

      {/* Search + reset */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name, company, item or reference…" value={term} onChange={e => setTerm(e.target.value)} />
        </div>
        <button className="btn-secondary px-3" title="Reset filters" onClick={() => { setTerm(''); setTab('ALL') }}><Filter className="w-4 h-4" /></button>
      </div>

      {/* Status chips — single scrollable row */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${
              tab === t ? 'bg-lango-primary text-white border-lango-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {shown.length === 0 ? (
        <div className="card py-14 flex flex-col items-center text-center px-6">
          <div className="relative w-28 h-28 rounded-full bg-lango-primary/5 flex items-center justify-center mb-5">
            <Package className="w-12 h-12 text-lango-primary/40" />
          </div>
          <h3 className="font-bold text-gray-900">No deliveries</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">There are no deliveries in this range or matching your filters.</p>
          <button className="btn-primary mt-5" onClick={addDelivery}><Plus className="w-4 h-4" /> Add Delivery</button>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(d => (
            <div key={d.deliveryId} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-lango-primary/10 flex items-center justify-center shrink-0"><Package className="w-5 h-5 text-lango-primary" /></div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{d.company}</p>
                    <p className="text-xs text-gray-500 truncate">{d.riderName} · {d.blockName} {d.unitNumber}{d.tenantName ? ` · ${d.tenantName}` : ''}</p>
                    {d.packageDescription && <p className="text-xs text-gray-500 truncate">{d.packageDescription}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">Received {format(d.receivedAt.toDate(), 'd MMM, h:mm a')}</p>
                  </div>
                </div>
                <DeliveryStatusBadge status={d.status} />
              </div>
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
