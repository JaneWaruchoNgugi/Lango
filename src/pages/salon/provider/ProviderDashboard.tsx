import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { useAuth } from '../../../contexts/AuthContext'
import { PageHeader } from '../../../components/ui/PageHeader'
import { humanize } from '../../../utils/humanize'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Users, CheckCircle2, ChevronDown } from 'lucide-react'
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
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHeader title="My clients" subtitle={user?.profile?.name} className="!mb-0" />

      <div role="tablist" className="grid grid-cols-3 gap-3 sm:gap-4">
        {(['today', 'week', 'month'] as Filter[]).map(f => {
          const count = services.filter(s => {
            const d = s.serviceDate.toDate()
            if (f === 'today') return d >= startOfDay(now)
            if (f === 'week')  return d >= startOfWeek(now, { weekStartsOn: 1 })
            return d >= startOfMonth(now)
          }).length
          const active = filter === f
          return (
            <button key={f} role="tab" aria-selected={active} onClick={() => setFilter(f)}
              className={`rounded-2xl border p-4 sm:p-5 text-left transition-all ${active
                ? 'bg-lango-dark border-lango-dark text-white shadow-card'
                : 'bg-white border-gray-200/80 text-gray-900 hover:border-gray-300'}`}>
              <p className={`text-xs sm:text-sm font-medium ${active ? 'text-white/70' : 'text-gray-500'}`}>
                {f === 'today' ? 'Today' : f === 'week' ? 'This week' : 'This month'}
              </p>
              <p className="mt-2 font-display text-2xl sm:text-3xl font-bold">{count}</p>
            </button>
          )
        })}
      </div>

      {!canViewHistory && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">Your service history access is restricted. Contact the salon owner.</p>
        </div>
      )}

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="section-title mb-0">
            {filter === 'today' ? "Today's" : filter === 'week' ? "This week's" : "This month's"} clients ({clientGroups.length})
          </h3>
        </div>
        {clientGroups.length === 0 ? (
          <EmptyState icon={Users} title="No clients" description="No clients assigned for this period." />
        ) : (
          <div className="divide-y divide-gray-100">
            {clientGroups.map(([clientId, group]) => (
              <div key={clientId}>
                <button onClick={() => setExpanded(expanded === clientId ? null : clientId)}
                  aria-expanded={expanded === clientId} className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{group.name}</p>
                    <p className="text-xs text-gray-500">
                      {group.services.map(s => SALON_SERVICE_LABELS[s.serviceType]).join(', ')}
                      {' · '}
                      {format(group.services[0].serviceDate.toDate(), 'dd MMM · h:mm a')}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded === clientId ? 'rotate-180' : ''}`} />
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
                            {humanize(s.status)}
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
