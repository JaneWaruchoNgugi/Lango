import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useIncidents } from '../../hooks/useIncidents'
import { setIncidentStatus, addIncidentNote } from '../../services/incidentService'
import { canResolveIncidents } from '../../domain/permissions'
import { IncidentSeverityBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Incident } from '../../types'

const STATUSES: Incident['status'][] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']

export default function IncidentsPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const canResolve = canResolveIncidents(user?.role)
  const { incidents, loading } = useIncidents(user?.propertyId)
  const [selected, setSelected] = useState<Incident | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

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
      <h1 className="page-title">Incidents</h1>
      {incidents.length === 0 ? <EmptyState icon={AlertTriangle} title="No incidents" /> : (
        <div className="space-y-3">
          {incidents.map(i => (
            <button key={i.incidentId} onClick={() => setSelected(i)} className="card p-4 w-full text-left hover:shadow-card-hover">
              <div className="flex items-center justify-between"><p className="font-medium text-gray-900">{i.type.replace(/_/g, ' ')}</p><IncidentSeverityBadge severity={i.severity} /></div>
              <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{i.description}</p>
              <p className="text-xs text-gray-400 mt-1">{format(i.createdAt.toDate(), 'd MMM, h:mm a')} · {i.status}</p>
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
