import { useState } from 'react'
import { Users, UserPlus, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../../store/demoStore'
import { DemoCurrentlyInside } from '../../components/DemoCurrentlyInside'
import { DemoRegisterVisitorForm } from '../../components/DemoRegisterVisitorForm'
import { DemoPendingApprovals } from '../../components/DemoPendingApprovals'
import type { DemoVisitType } from '../../data/types'

const SAMPLE = { name: 'Brian Ochieng', unitNumber: 'A-204', type: 'FRIENDLY_VISIT' as DemoVisitType }

export default function DemoVisitorsPage() {
  const recent = useDemoStore(s => s.visitors.filter(v => v.status === 'CHECKED_OUT'))
  const registerVisitor = useDemoStore(s => s.registerVisitor)
  const [formOpen, setFormOpen] = useState(false)

  const registerSample = () => { registerVisitor(SAMPLE); toast.success(`${SAMPLE.name} registered`) }

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

      <div>
        <h2 className="section-title">Pending approvals</h2>
        <DemoPendingApprovals />
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

      {formOpen && <DemoRegisterVisitorForm onClose={() => setFormOpen(false)} />}
    </div>
  )
}
