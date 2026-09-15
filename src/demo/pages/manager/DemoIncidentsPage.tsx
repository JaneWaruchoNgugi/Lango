import { useState } from 'react'
import { ShieldCheck, ShieldPlus, Sparkles, Search, CheckCircle2, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../../store/demoStore'
import { DemoIncidentBadge } from '../../components/DemoBadges'
import { Modal } from '../../../components/ui/Modal'

const MANAGER_NAME = 'Mercy Njeri'

function ReportIncidentForm({ onClose }: { onClose: () => void }) {
  const createIncident = useDemoStore(s => s.createIncident)
  const [type, setType] = useState('')
  const [location, setLocation] = useState('')
  const submit = () => {
    if (type.trim().length < 2) { toast.error('Describe the incident'); return }
    if (location.trim().length < 1) { toast.error('Enter a location'); return }
    createIncident({ type, location, reportedBy: MANAGER_NAME }); toast.success('Incident reported'); onClose()
  }
  return (
    <Modal isOpen onClose={onClose} title="Report an incident"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Report</button></>}>
      <div className="space-y-3">
        <div><label className="label">What happened?</label><input className="input" value={type} onChange={e => setType(e.target.value)} placeholder="e.g. Noise complaint" /></div>
        <div><label className="label">Location</label><input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Block C" /></div>
      </div>
    </Modal>
  )
}

function AssignForm({ incidentId, onClose }: { incidentId: string; onClose: () => void }) {
  const staff = useDemoStore(s => s.staff)
  const assignIncident = useDemoStore(s => s.assignIncident)
  const [name, setName] = useState(staff[0]?.name ?? '')
  const submit = () => { assignIncident(incidentId, name); toast.success(`Assigned to ${name}`); onClose() }
  return (
    <Modal isOpen onClose={onClose} title="Assign incident"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Assign</button></>}>
      <div><label className="label">Assign to staff member</label>
        <select className="input" value={name} onChange={e => setName(e.target.value)}>
          {staff.map(m => <option key={m.id} value={m.name}>{m.name} · {m.role}</option>)}
        </select>
      </div>
    </Modal>
  )
}

export default function DemoIncidentsPage() {
  const incidents = useDemoStore(s => s.incidents)
  const setIncidentStatus = useDemoStore(s => s.setIncidentStatus)
  const [reportOpen, setReportOpen] = useState(false)
  const [assignId, setAssignId] = useState<string | null>(null)

  const investigate = (id: string) => { setIncidentStatus(id, 'INVESTIGATING'); toast('Marked as investigating') }
  const resolve = (id: string) => { setIncidentStatus(id, 'RESOLVED'); toast.success('Incident resolved') }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Incidents</h1><p className="text-sm text-gray-500">Track and resolve security incidents across the property.</p></div>
      </div>

      <div className="rounded-2xl bg-lango-dark text-white p-5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> See how incidents are tracked</div>
        <p className="mt-2 text-sm text-white/70 max-w-xl">Report an incident, assign it to a guard, then walk it from open to investigating to resolved — resolving it clears the alert on your dashboard.</p>
        <div className="mt-4">
          <button className="btn-primary" onClick={() => setReportOpen(true)}><ShieldPlus className="w-4 h-4" /> Report an incident</button>
        </div>
      </div>

      <div>
        <h2 className="section-title">Incidents</h2>
        {incidents.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-gray-500">No incidents reported.</div>
        ) : (
          <div className="space-y-2">
            {incidents.map(i => (
              <div key={i.id} className="card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><p className="font-medium text-gray-900 truncate">{i.type}</p><DemoIncidentBadge status={i.status} /></div>
                  <p className="text-xs text-gray-500 truncate">{i.location} · {i.reportedBy} · {i.timeLabel}</p>
                  {i.assignedTo && <p className="text-xs text-lango-primary mt-0.5">Assigned to {i.assignedTo}</p>}
                </div>
                <div className="flex flex-wrap justify-end gap-2 shrink-0">
                  {i.status === 'OPEN' && <button className="btn-primary text-xs" onClick={() => investigate(i.id)}><Search className="w-3.5 h-3.5" /> Investigate</button>}
                  {i.status === 'INVESTIGATING' && <button className="btn-primary text-xs" onClick={() => resolve(i.id)}><CheckCircle2 className="w-3.5 h-3.5" /> Resolve</button>}
                  {i.status !== 'RESOLVED' && <button className="btn-secondary text-xs" onClick={() => setAssignId(i.id)}><UserPlus className="w-3.5 h-3.5" /> Assign</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reportOpen && <ReportIncidentForm onClose={() => setReportOpen(false)} />}
      {assignId && <AssignForm incidentId={assignId} onClose={() => setAssignId(null)} />}
    </div>
  )
}
