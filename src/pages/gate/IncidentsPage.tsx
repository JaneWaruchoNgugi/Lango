import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useIncidents } from '../../hooks/useIncidents'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { IncidentSeverityBadge } from '../../components/ui/StatusBadge'
import { AlertTriangle, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { humanize } from '../../utils/humanize'

const severityTone = (s: string) => s === 'CRITICAL' ? 'bg-red-50 text-red-500' : s === 'HIGH' ? 'bg-orange-50 text-orange-500' : 'bg-yellow-50 text-yellow-600'

export default function IncidentsPage() {
  const { user } = useAuth()
  const { incidents, loading } = useIncidents(user?.propertyId)
  if (loading) return <PageLoader />
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <PageHeader icon={AlertTriangle} title="Incidents" subtitle="Security and safety reports from the gate."
        actions={<Link to="/gate/incidents/new" className="btn-primary"><Plus className="w-4 h-4" /> Report incident</Link>} />

      {incidents.length === 0 ? (
        <EmptyState card icon={AlertTriangle} title="No incidents" description="All quiet. Report one if something happens on your shift." />
      ) : (
        <div className="space-y-3">
          {incidents.map(i => (
            <div key={i.incidentId} className="card p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${severityTone(i.severity)}`}><AlertTriangle className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2"><p className="font-semibold text-gray-900 truncate">{humanize(i.type)}</p><IncidentSeverityBadge severity={i.severity} /></div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 whitespace-pre-line">{i.description}</p>
                <p className="text-xs text-gray-400 mt-1">{format(i.createdAt.toDate(), 'd MMM, h:mm a')} · {humanize(i.status)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
