import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, orderBy, limit } from 'firebase/firestore'
import { auditLogsCol } from '../../firebase/collections'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { ScrollText } from 'lucide-react'
import { format } from 'date-fns'
import type { AuditLog, UserRole } from '../../types'

const roleBadge: Record<UserRole, string> = {
  SUPER_ADMIN:      'badge-red',
  PROPERTY_MANAGER: 'badge-blue',
  CARETAKER:        'badge-green',
  SECURITY_GUARD:   'badge-gray',
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState<string>('ALL')

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(query(auditLogsCol, orderBy('timestamp', 'desc'), limit(200)))
        setLogs(snap.docs.map(d => d.data()))
      } catch (err) {
        console.error('Audit logs load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const actions = useMemo(
    () => ['ALL', ...Array.from(new Set(logs.map(l => l.action))).sort()],
    [logs],
  )
  const shown = useMemo(
    () => actionFilter === 'ALL' ? logs : logs.filter(l => l.action === actionFilter),
    [logs, actionFilter],
  )

  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">System Logs</h1>
          <p className="page-subtitle">Audit trail of actions across the platform.</p>
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 bg-white"
        >
          {actions.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All actions' : a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="section-title mb-0">Recent Activity ({shown.length})</h3>
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={ScrollText} title="No log entries" description="Admin and staff actions will be recorded here." />
        ) : (
          <div className="divide-y divide-gray-50">
            {shown.map(log => (
              <div key={log.logId} className="px-5 py-3.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</span>
                    <span className={`badge ${roleBadge[log.actorRole]}`}>{log.actorName}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{log.description}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                  {log.timestamp ? format(log.timestamp.toDate(), 'dd MMM, h:mm a') : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
