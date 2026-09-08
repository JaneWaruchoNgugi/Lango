import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useIncidents } from '../../hooks/useIncidents'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { IncidentSeverityBadge } from '../../components/ui/StatusBadge'
import { AlertTriangle, Plus } from 'lucide-react'
import { format } from 'date-fns'

const severityTone = (s: string) => s === 'CRITICAL' ? 'bg-red-50 text-red-500' : s === 'HIGH' ? 'bg-orange-50 text-orange-500' : 'bg-yellow-50 text-yellow-600'

export default function IncidentsPage() {
  const { user } = useAuth()
  const { incidents, loading } = useIncidents(user?.propertyId)
  if (loading) return <PageLoader />
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-lango-primary" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Incidents</h1><p className="text-sm text-gray-500">Security &amp; safety reports.</p></div>
        </div>
        <Link to="/gate/incidents/new" className="btn-primary"><Plus className="w-4 h-4" /> Report Incident</Link>
      </div>

      {incidents.length === 0 ? (
        <div className="card py-14 flex flex-col items-center text-center px-6">
          <div className="w-28 h-28 rounded-full bg-lango-primary/5 flex items-center justify-center mb-5"><AlertTriangle className="w-12 h-12 text-lango-primary/40" /></div>
          <h3 className="font-bold text-gray-900">No incidents</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">Report one if something happens on your shift.</p>
          <Link to="/gate/incidents/new" className="btn-primary mt-5"><Plus className="w-4 h-4" /> Report Incident</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map(i => (
            <div key={i.incidentId} className="card p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${severityTone(i.severity)}`}><AlertTriangle className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2"><p className="font-semibold text-gray-900 truncate">{i.type.replace(/_/g, ' ')}</p><IncidentSeverityBadge severity={i.severity} /></div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 whitespace-pre-line">{i.description}</p>
                <p className="text-xs text-gray-400 mt-1">{format(i.createdAt.toDate(), 'd MMM, h:mm a')} · {i.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
