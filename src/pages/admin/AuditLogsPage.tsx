import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { auditLogsCol } from '../../firebase/collections'
import { db } from '../../firebase/config'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { ScrollText, Download } from 'lucide-react'
import { format } from 'date-fns'
import type { AuditLog, Property, UserRole } from '../../types'

const roleBadge: Record<UserRole, string> = {
  SUPER_ADMIN:        'badge-red',
  PROPERTY_MANAGER:   'badge-blue',
  CARETAKER:          'badge-green',
  SECURITY_GUARD:     'badge-gray',
  SALON_OWNER:        'badge-gray',
  SALON_RECEPTIONIST: 'badge-gray',
  SALON_PROVIDER:     'badge-gray',
}

export default function AuditLogsPage() {
  const [logs, setLogs]           = useState<AuditLog[]>([])
  const [propMap, setPropMap]     = useState<Record<string, string>>({})
  const [loading, setLoading]     = useState(true)
  const [actionFilter, setActionFilter] = useState('ALL')
  const [propertyFilter, setPropertyFilter] = useState('ALL')
  const [actorSearch, setActorSearch] = useState('')
  const [fromDate, setFromDate]   = useState('')
  const [toDate, setToDate]       = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [logSnap, propSnap] = await Promise.all([
          getDocs(query(auditLogsCol, orderBy('timestamp', 'desc'), limit(500))),
          getDocs(query(collection(db, 'properties'), orderBy('name'))),
        ])
        setLogs(logSnap.docs.map(d => d.data()))
        const map: Record<string, string> = {}
        propSnap.docs.forEach(d => {
          const p = d.data() as Property
          map[p.propertyId] = p.name
        })
        setPropMap(map)
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

  const properties = useMemo(
    () => [
      { id: 'ALL', name: 'All properties' },
      ...Array.from(new Set(logs.map(l => l.propertyId).filter(Boolean)))
        .map(pid => ({ id: pid!, name: propMap[pid!] ?? pid! }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ],
    [logs, propMap],
  )

  const shown = useMemo(() => {
    const fromMs = fromDate ? new Date(fromDate).getTime() : null
    const toMs   = toDate   ? new Date(toDate + 'T23:59:59').getTime() : null
    return logs.filter(l => {
      if (actionFilter !== 'ALL' && l.action !== actionFilter) return false
      if (propertyFilter !== 'ALL' && l.propertyId !== propertyFilter) return false
      if (actorSearch && !l.actorName.toLowerCase().includes(actorSearch.toLowerCase())) return false
      const ts = l.timestamp?.toMillis?.() ?? 0
      if (fromMs && ts < fromMs) return false
      if (toMs   && ts > toMs)   return false
      return true
    })
  }, [logs, actionFilter, propertyFilter, actorSearch, fromDate, toDate])

  const exportCsv = () => {
    const header = 'Timestamp,Action,Actor,Role,Property,Description'
    const rows   = shown.map(l => [
      l.timestamp ? format(l.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
      l.action,
      l.actorName,
      l.actorRole,
      l.propertyId ? (propMap[l.propertyId] ?? l.propertyId) : 'Platform',
      `"${(l.description ?? '').replace(/"/g, '""')}"`,
    ].join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'audit-logs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">System Logs</h1>
          <p className="page-subtitle">Audit trail of actions across the platform.</p>
        </div>
        <button onClick={exportCsv} disabled={shown.length === 0} className="btn-secondary text-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 bg-white"
        >
          {actions.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All actions' : a.replace(/_/g, ' ')}</option>)}
        </select>
        <select
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 bg-white"
        >
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input
          type="text"
          placeholder="Actor name..."
          value={actorSearch}
          onChange={e => setActorSearch(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 bg-white w-36"
        />
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 bg-white"
          title="From date"
        />
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-700 bg-white"
          title="To date"
        />
        {(actionFilter !== 'ALL' || propertyFilter !== 'ALL' || actorSearch || fromDate || toDate) && (
          <button
            onClick={() => { setActionFilter('ALL'); setPropertyFilter('ALL'); setActorSearch(''); setFromDate(''); setToDate('') }}
            className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-500 bg-white hover:bg-gray-50"
          >
            Clear
          </button>
        )}
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
                    {log.propertyId && propMap[log.propertyId] && (
                      <span className="text-xs text-gray-400">{propMap[log.propertyId]}</span>
                    )}
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
