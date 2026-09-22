import { useState } from 'react'
import { Users, UserPlus, Sparkles } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useDemoStore } from '../../store/demoStore'
import { DemoCurrentlyInside } from '../../components/DemoCurrentlyInside'
import { DemoRegisterVisitorForm } from '../../components/DemoRegisterVisitorForm'
import { DemoPendingApprovals } from '../../components/DemoPendingApprovals'

export default function DemoVisitorsPage() {
  const recent = useDemoStore(useShallow((s) => s.visitors.filter(v => v.status === 'CHECKED_OUT')))
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Visitors</h1><p className="text-sm text-gray-500">Register, approve, and track everyone at the gate.</p></div>
      </div>

      <div className="rounded-2xl bg-lango-dark text-white p-5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> See how visitor management works</div>
        <p className="mt-2 text-sm text-white/70 max-w-xl">A visitor arrives at the gate. Register them and they're checked in on the spot — watch them appear in Currently Inside and on your dashboard activity.</p>
        <div className="mt-4">
          <button className="btn-primary" onClick={() => setFormOpen(true)}><UserPlus className="w-4 h-4" /> Register a visitor</button>
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
