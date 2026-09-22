import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useIncidents } from '../../hooks/useIncidents'
import { useDeliveries } from '../../hooks/useDeliveries'
import { useCurrentVisitors } from '../../hooks/useCurrentVisitors'
import { IncidentSeverityBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { BarChart3, DoorOpen, Package, AlertTriangle, Shield } from 'lucide-react'
import { format } from 'date-fns'
import type { Incident } from '../../types'

const TABS: (Incident['status'] | 'ALL')[] = ['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']

export default function ReportsPlaceholder() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Incident['status'] | 'ALL'>('ALL')

  const { incidents, loading: incLoading } = useIncidents(user?.propertyId)
  const { deliveries, loading: delLoading } = useDeliveries(user?.propertyId)
  const { visitors, loading: visLoading } = useCurrentVisitors(user?.propertyId)

  const loading = incLoading || delLoading || visLoading

  const shownIncidents = useMemo(
    () => incidents.filter(i => tab === 'ALL' || i.status === tab),
    [incidents, tab],
  )

  if (loading) return <PageLoader />

  const openCount = incidents.filter(i => i.status === 'OPEN').length
  const highCount = incidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
          <BarChart3 className="w-5 h-5 text-lango-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Property activity summary.</p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={DoorOpen}      bg="bg-purple-50" color="text-purple-600" label="Currently Inside"  value={visitors.length} />
        <Metric icon={Package}       bg="bg-blue-50"   color="text-blue-600"   label="Total Deliveries"  value={deliveries.length} />
        <Metric icon={AlertTriangle} bg="bg-orange-50" color="text-orange-600" label="Total Incidents"   value={incidents.length} sub={`${openCount} open`} />
        <Metric icon={Shield}        bg="bg-red-50"    color="text-red-600"    label="Critical / High"   value={highCount} />
      </div>

      {/* Incident reports section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Incident Reports</h2>
          <span className="text-xs text-gray-400">Guards &amp; caretakers</span>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 mb-4">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${tab === t ? 'bg-lango-primary text-white border-lango-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {shownIncidents.length === 0 ? (
          <div className="card py-12 flex flex-col items-center text-center px-6">
            <AlertTriangle className="w-10 h-10 text-gray-200 mb-3" />
            <p className="font-medium text-gray-700">No incidents</p>
            <p className="text-sm text-gray-400 mt-1">
              {incidents.length === 0 ? 'None reported yet.' : 'None match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shownIncidents.map(i => (
              <div key={i.incidentId} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    i.severity === 'CRITICAL' ? 'bg-red-50' : i.severity === 'HIGH' ? 'bg-orange-50' : 'bg-yellow-50'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      i.severity === 'CRITICAL' ? 'text-red-500' : i.severity === 'HIGH' ? 'text-orange-500' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{i.type.replace(/_/g, ' ')}</p>
                      <IncidentSeverityBadge severity={i.severity} />
                    </div>
                    {i.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 whitespace-pre-line">{i.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Shield className="w-3 h-3 shrink-0" />
                        {i.guardName}
                      </span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{format(i.createdAt.toDate(), 'd MMM, h:mm a')}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className={`text-xs font-semibold ${
                        i.status === 'OPEN'
                          ? 'text-red-500'
                          : i.status === 'RESOLVED' || i.status === 'CLOSED'
                            ? 'text-green-600'
                            : 'text-yellow-600'
                      }`}>{i.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ icon: Icon, bg, color, label, value, sub }: {
  icon: typeof DoorOpen; bg: string; color: string; label: string; value: number; sub?: string
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${bg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}
