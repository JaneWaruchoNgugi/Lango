import { useState } from 'react'
import { Users, UserPlus, Check, X, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore, selectPendingApprovals } from '../../store/demoStore'
import { DemoCurrentlyInside } from '../../components/DemoCurrentlyInside'
import { Modal } from '../../../components/ui/Modal'
import type { DemoVisitType } from '../../data/types'

const SAMPLE = { name: 'Brian Ochieng', unitNumber: 'A-204', type: 'FRIENDLY_VISIT' as DemoVisitType }
const TYPE_OPTIONS: { value: DemoVisitType; label: string }[] = [
  { value: 'FRIENDLY_VISIT', label: 'Personal visit' },
  { value: 'WORK', label: 'Work' },
  { value: 'SERVICE_PROVIDER', label: 'Service provider' },
  { value: 'DELIVERY', label: 'Delivery' },
]

function RegisterOwnForm({ onClose }: { onClose: () => void }) {
  const registerVisitor = useDemoStore(s => s.registerVisitor)
  const units = useDemoStore(s => s.units)
  const [name, setName] = useState('')
  const [unitNumber, setUnitNumber] = useState(units[0]?.unitNumber ?? '')
  const [type, setType] = useState<DemoVisitType>('FRIENDLY_VISIT')
  const submit = () => {
    if (name.trim().length < 2) { toast.error('Enter a name'); return }
    registerVisitor({ name, unitNumber, type }); toast.success('Visitor registered'); onClose()
  }
  return (
    <Modal isOpen onClose={onClose} title="Register a visitor"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Register</button></>}>
      <div className="space-y-3">
        <div><label className="label">Visitor name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice Wanjiru" /></div>
        <div><label className="label">Visiting unit</label>
          <select className="input" value={unitNumber} onChange={e => setUnitNumber(e.target.value)}>
            {units.map(u => <option key={u.id} value={u.unitNumber}>{u.unitNumber}</option>)}
          </select>
        </div>
        <div><label className="label">Visit type</label>
          <select className="input" value={type} onChange={e => setType(e.target.value as DemoVisitType)}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}

export default function DemoVisitorsPage() {
  const approvals = useDemoStore(selectPendingApprovals)
  const recent = useDemoStore(s => s.visitors.filter(v => v.status === 'CHECKED_OUT'))
  const registerVisitor = useDemoStore(s => s.registerVisitor)
  const approveVisitor = useDemoStore(s => s.approveVisitor)
  const declineVisitor = useDemoStore(s => s.declineVisitor)
  const [formOpen, setFormOpen] = useState(false)
  const [justApproved, setJustApproved] = useState<string | null>(null)

  const registerSample = () => { registerVisitor(SAMPLE); toast.success(`${SAMPLE.name} registered`) }
  const approve = (id: string, name: string) => { approveVisitor(id); setJustApproved(name); toast.success(`${name} approved`) }
  const decline = (id: string, name: string) => { declineVisitor(id); toast(`${name} declined`) }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Visitors</h1><p className="text-sm text-gray-500">Register, approve, and track everyone at the gate.</p></div>
      </div>

      <div className="rounded-2xl bg-lango-dark text-white p-5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> See how visitor management works</div>
        <p className="mt-2 text-sm text-white/70 max-w-xl">A visitor arrives at the gate. Register them, then approve the request — watch them appear in Currently Inside and on your dashboard activity.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={registerSample}><UserPlus className="w-4 h-4" /> Register the sample visitor</button>
          <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20" onClick={() => setFormOpen(true)}>Register your own</button>
        </div>
      </div>

      {justApproved && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
          <Check className="w-4 h-4" /> {justApproved} approved — they may enter.
        </div>
      )}

      <div>
        <h2 className="section-title">Pending approvals</h2>
        {approvals.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-gray-500">No pending approvals.</div>
        ) : (
          <div className="space-y-2">
            {approvals.map(a => (
              <div key={a.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{a.visitorName}</p><p className="text-xs text-gray-500 truncate">{a.unitNumber} · {a.purpose}</p></div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn-primary text-xs" onClick={() => approve(a.id, a.visitorName)}><Check className="w-3.5 h-3.5" /> Approve</button>
                  <button className="btn-secondary text-xs" onClick={() => decline(a.id, a.visitorName)}><X className="w-3.5 h-3.5" /> Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="section-title">Currently inside</h2>
        <DemoCurrentlyInside />
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="section-title">Recent (checked out)</h2>
          <div className="card divide-y divide-gray-50">
            {recent.map(v => (
              <div key={v.id} className="px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-900 truncate">{v.name}</span>
                <span className="text-gray-400 shrink-0">{v.unitNumber}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {formOpen && <RegisterOwnForm onClose={() => setFormOpen(false)} />}
    </div>
  )
}
