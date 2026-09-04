import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useIncidents } from '../../hooks/useIncidents'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { IncidentSeverityBadge } from '../../components/ui/StatusBadge'
import { AlertTriangle, Plus } from 'lucide-react'
import { format } from 'date-fns'

export default function IncidentsPage() {
  const { user } = useAuth()
  const { incidents, loading } = useIncidents(user?.propertyId)
  if (loading) return <PageLoader />
  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Incidents</h1>
        <Link to="/gate/incidents/new" className="btn-primary text-sm"><Plus className="w-4 h-4" /> Report</Link>
      </div>
      {incidents.length === 0 ? <EmptyState icon={AlertTriangle} title="No incidents" description="Report one if something happens." /> : (
        <div className="space-y-3">
          {incidents.map(i => (
            <div key={i.incidentId} className="card p-4">
              <div className="flex items-center justify-between"><p className="font-medium text-gray-900">{i.type.replace(/_/g, ' ')}</p><IncidentSeverityBadge severity={i.severity} /></div>
              <p className="text-xs text-gray-500 mt-1">{i.description}</p>
              <p className="text-xs text-gray-400 mt-1">{format(i.createdAt.toDate(), 'd MMM, h:mm a')} · {i.status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
