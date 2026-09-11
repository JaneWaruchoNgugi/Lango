import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShieldCheck, Home, Wrench, ArrowRight, type LucideIcon } from 'lucide-react'
import { useDemoStore } from '../store/demoStore'
import type { DemoRole } from '../data/types'

const OPTIONS: { role: DemoRole; label: string; hint: string; icon: LucideIcon; path: string }[] = [
  { role: 'MANAGER', label: 'Property Manager', hint: 'Real-time visibility across the whole property', icon: LayoutDashboard, path: '/demo/manager' },
  { role: 'GUARD', label: 'Security Guard', hint: 'Run the gate: register, approve, check in and out', icon: ShieldCheck, path: '/demo/guard' },
  { role: 'RESIDENT', label: 'Resident', hint: 'Approve your visitors and track deliveries', icon: Home, path: '/demo/resident' },
  { role: 'CARETAKER', label: 'Caretaker', hint: 'Day-to-day gate and property operations', icon: Wrench, path: '/demo/caretaker' },
]

export default function DemoEntry() {
  const navigate = useNavigate()
  const setRole = useDemoStore(s => s.setRole)
  const choose = (role: DemoRole, path: string) => { setRole(role); navigate(path) }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-lango-dark text-white px-4 pt-14 pb-20 text-center">
        <span className="inline-block text-xs font-semibold tracking-wide uppercase text-amber-300 mb-3">Interactive Demo</span>
        <h1 className="text-3xl sm:text-4xl font-bold">Experience Lango</h1>
        <p className="mt-3 text-white/70 max-w-xl mx-auto">See how Lango manages your property from the gate to the dashboard. Pick a role to step inside.</p>
      </div>
      <div className="max-w-3xl mx-auto px-4 -mt-12 pb-16 grid sm:grid-cols-2 gap-4">
        {OPTIONS.map(o => (
          <button key={o.role} onClick={() => choose(o.role, o.path)}
            className="card p-5 flex items-center gap-4 text-left hover:shadow-card-hover transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
              <o.icon className="w-6 h-6 text-lango-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{o.label}</p>
              <p className="text-xs text-gray-500">{o.hint}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  )
}
