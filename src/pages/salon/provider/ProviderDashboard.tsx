import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { useAuth } from '../../../contexts/AuthContext'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Users, CheckCircle2 } from 'lucide-react'
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { useSalonPermissions } from '../../../hooks/useSalonPermissions'
import toast from 'react-hot-toast'
import type { SalonService } from '../../../types'
import { SALON_SERVICE_LABELS } from '../../../types'

type Filter = 'today' | 'week' | 'month'

export default function ProviderDashboard() {
  const { salonId } = useParams<{ salonId: string }>()
  const { user }    = useAuth()
  const { perms }   = useSalonPermissions()

  const [services, setServices]   = useState<SalonService[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<Filter>('today')
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  const canComplete   = perms?.completeBookings !== false
  const canViewHistory = perms?.viewServiceHistory !== false

  useEffect(() => {
    if (!salonId || !user) return
    const providerUid = user.uid
    // Query by providerUid so that Firebase rules can verify the caller is the provider
    getDocs(query(
      collection(db, 'salonServices'),
      where('salonId', '==', salonId),
      where('providerUid', '==', providerUid),
    )).then(snap => {
      setServices(snap.docs.map(d => d.data() as SalonService)
        .sort((a, b) => b.serviceDate.seconds - a.serviceDate.seconds))
    }).catch(console.error).finally(() => setLoading(false))
  }, [salonId, user])

  const now = new Date()
  const filtered = services.filter(s => {
    const d = s.serviceDate.toDate()
    if (filter === 'today') return d >= startOfDay(now)
    if (filter === 'week')  return d >= startOfWeek(now, { weekStartsOn: 1 })
    return d >= startOfMonth(now)
  })

  // Group by unique clientId to show distinct client sessions
  const clientMap = new Map<string, { name: string; phone?: string; services: SalonService[] }>()
  filtered.forEach(s => {
    const entry = clientMap.get(s.clientId) ?? { name: s.clientName, services: [] }
    entry.services.push(s)
    clientMap.set(s.clientId, entry)
  })
  const clientGroups = Array.from(clientMap.entries())

  const markComplete = async (service: SalonService) => {
    if (!canComplete) return
    setCompleting(service.serviceId)
    try {
      await updateDoc(doc(db, 'salonServices', service.serviceId), { status: 'COMPLETED' })
      setServices(prev => prev.map(s => s.serviceId === service.serviceId ? { ...s, status: 'COMPLETED' } : s))
      toast.success('Service marked complete')
    } catch {
      toast.error('Failed to update service')
    } finally {
      setCompleting(null)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">My Clients</h1>
        <p className="page-subtitle">{user?.profile?.name}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(['today', 'week', 'month'] as Filter[]).map(f => {
          const count = services.filter(s => {
            const d = s.serviceDate.toDate()
            if (f === 'today') return d >= startOfDay(now)
            if (f === 'week')  return d >= startOfWeek(now, { weekStartsOn: 1 })
            return d >= startOfMonth(now)
          }).length
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`card p-4 text-left transition-colors ${filter === f ? 'ring-2 ring-lango-primary' : ''}`}>
              <p className="text-xs text-gray-500 capitalize">{f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </button>
          )
        })}
      </div>

      {!canViewHistory && (
        <div className="card p-4 bg-yellow-50 border-yellow-100">
          <p className="text-xs text-yellow-700">Your service history access is restricted. Contact the salon owner.</p>
        </div>
      )}

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="section-title mb-0">
            {filter === 'today' ? "Today's" : filter === 'week' ? "This Week's" : "This Month's"} Clients ({clientGroups.length})
          </h3>
        </div>
        {clientGroups.length === 0 ? (
          <EmptyState icon={Users} title="No clients" description="No clients assigned for this period." />
        ) : (
          <div className="divide-y divide-gray-50">
            {clientGroups.map(([clientId, group]) => (
              <div key={clientId}>
                <button onClick={() => setExpanded(expanded === clientId ? null : clientId)}
                  className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{group.name}</p>
                    <p className="text-xs text-gray-500">
                      {group.services.map(s => SALON_SERVICE_LABELS[s.serviceType]).join(', ')}
                      {' · '}
                      {format(group.services[0].serviceDate.toDate(), 'dd MMM · h:mm a')}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{expanded === clientId ? '▲' : '▼'}</span>
                </button>
                {expanded === clientId && (
                  <div className="px-5 pb-3 space-y-2 bg-gray-50/50">
                    {group.services.map(s => (
                      <div key={s.serviceId} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="badge badge-blue">{SALON_SERVICE_LABELS[s.serviceType]}</span>
                          {canComplete && s.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => markComplete(s)}
                              disabled={completing === s.serviceId}
                              className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {completing === s.serviceId ? '…' : 'Complete'}
                            </button>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{format(s.serviceDate.toDate(), 'h:mm a, dd MMM')}</p>
                          <span className={`badge ${s.status === 'COMPLETED' ? 'badge-green' : s.status === 'IN_PROGRESS' ? 'badge-yellow' : 'badge-gray'}`}>
                            {s.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                    {/* Prices are intentionally never shown to providers */}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
