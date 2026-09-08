import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useIncidents } from '../../hooks/useIncidents'
import { setIncidentStatus, addIncidentNote } from '../../services/incidentService'
import { canResolveIncidents } from '../../domain/permissions'
import { IncidentSeverityBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { Modal } from '../../components/ui/Modal'
import { AlertTriangle, Search } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Incident } from '../../types'

const STATUSES: Incident['status'][] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']
const TABS: (Incident['status'] | 'ALL')[] = ['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']
const severityTone = (s: string) => s === 'CRITICAL' ? 'bg-red-50 text-red-500' : s === 'HIGH' ? 'bg-orange-50 text-orange-500' : 'bg-yellow-50 text-yellow-600'

export default function IncidentsPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const canResolve = canResolveIncidents(user?.role)
  const { incidents, loading } = useIncidents(user?.propertyId)
  const [selected, setSelected] = useState<Incident | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Incident['status'] | 'ALL'>('ALL')
  const [term, setTerm] = useState('')

  const shown = useMemo(() => {
    const q = term.trim().toLowerCase()
    return incidents
      .filter(i => tab === 'ALL' || i.status === tab)
      .filter(i => !q || [i.type, i.description, i.guardName].some(v => v?.toLowerCase().includes(q)))
  }, [incidents, tab, term])

  const changeStatus = async (i: Incident, s: Incident['status']) => {
    setBusy(true)
    try { await setIncidentStatus(i, s, actor); toast.success(`Incident → ${s}`); setSelected(null) }
    catch (e) { console.error(e); toast.error('Update failed') } finally { setBusy(false) }
  }
  const saveNote = async (i: Incident) => {
    if (!note.trim()) return
    setBusy(true)
    try { await addIncidentNote(i, note.trim(), actor); toast.success('Note added'); setNote(''); setSelected(null) }
    catch (e) { console.error(e); toast.error('Failed') } finally { setBusy(false) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Incidents</h1><p className="text-sm text-gray-500">Track and resolve reported incidents.</p></div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search incidents…" value={term} onChange={e => setTerm(e.target.value)} />
      </div>

      {/* Status chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${tab === t ? 'bg-lango-primary text-white border-lango-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {shown.length === 0 ? (
        <div className="card py-14 flex flex-col items-center text-center px-6">
          <div className="w-28 h-28 rounded-full bg-lango-primary/5 flex items-center justify-center mb-5"><AlertTriangle className="w-12 h-12 text-lango-primary/40" /></div>
          <h3 className="font-bold text-gray-900">No incidents</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{incidents.length === 0 ? 'No incidents have been reported.' : 'No incidents match your search or filters.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(i => (
            <button key={i.incidentId} onClick={() => setSelected(i)} className="card p-4 w-full text-left hover:shadow-card-hover transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${severityTone(i.severity)}`}><AlertTriangle className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2"><p className="font-semibold text-gray-900 truncate">{i.type.replace(/_/g, ' ')}</p><IncidentSeverityBadge severity={i.severity} /></div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 whitespace-pre-line">{i.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{format(i.createdAt.toDate(), 'd MMM, h:mm a')} · {i.status}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected ? selected.type.replace(/_/g, ' ') : ''}>
        {selected && (
          <div className="space-y-4 text-sm">
            <p className="whitespace-pre-line text-gray-700">{selected.description}</p>
            <p className="text-xs text-gray-400">Reported by {selected.guardName} · {format(selected.createdAt.toDate(), 'd MMM yyyy, h:mm a')} · {selected.status}</p>
            {canResolve && (<>
              <div>
                <p className="label">Change status</p>
                <div className="flex gap-2 flex-wrap">{STATUSES.map(s => <button key={s} disabled={busy || s === selected.status} onClick={() => changeStatus(selected, s)} className="btn-secondary text-xs disabled:opacity-40">{s}</button>)}</div>
              </div>
              <div>
                <p className="label">Add note</p>
                <textarea rows={2} className="input resize-none" value={note} onChange={e => setNote(e.target.value)} />
                <button className="btn-primary text-xs mt-2" disabled={busy} onClick={() => saveNote(selected)}>Add note</button>
              </div>
            </>)}
          </div>
        )}
      </Modal>
    </div>
  )
}
