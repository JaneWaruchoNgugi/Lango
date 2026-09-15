import { useState } from 'react'
import { UserPlus, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../store/demoStore'
import { DemoCurrentlyInside } from './DemoCurrentlyInside'
import { DemoRegisterVisitorForm } from './DemoRegisterVisitorForm'
import { DemoPendingApprovals } from './DemoPendingApprovals'
import type { DemoVisitType } from '../data/types'

const SAMPLE = { name: 'Brian Ochieng', unitNumber: 'A-204', type: 'FRIENDLY_VISIT' as DemoVisitType }

export default function DemoRegisterVisitorPage() {
  const registerVisitor = useDemoStore(s => s.registerVisitor)
  const [formOpen, setFormOpen] = useState(false)
  const registerSample = () => { registerVisitor(SAMPLE); toast.success(`${SAMPLE.name} registered`) }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><UserPlus className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Register a visitor</h1><p className="text-sm text-gray-500">Log an arrival at the gate — they're checked in on the spot.</p></div>
      </div>

      <div className="rounded-2xl bg-lango-dark text-white p-5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> Try it</div>
        <p className="mt-2 text-sm text-white/70 max-w-xl">Register a visitor at the gate — they're checked in instantly and appear in Currently Inside below. Pending approvals are resident-raised requests awaiting your OK.</p>
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

      {formOpen && <DemoRegisterVisitorForm onClose={() => setFormOpen(false)} />}
    </div>
  )
}
