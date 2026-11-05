import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShieldCheck, Wrench, ArrowRight, PlayCircle, Crown, ConciergeBell, Scissors, type LucideIcon } from 'lucide-react'
import { useDemoStore } from '../store/demoStore'
import { useSalonDemo } from '../salon/store'
import { useDemoTour } from '../tour/DemoTourContext'
import { LangoLogo } from '../../components/ui/LangoLogo'
import type { DemoRole } from '../data/types'
import type { SalonDemoRole } from '../salon/data'

const PROPERTY: { role: DemoRole; label: string; hint: string; icon: LucideIcon; path: string }[] = [
  { role: 'MANAGER', label: 'Property manager', hint: 'Live view across the whole property', icon: LayoutDashboard, path: '/demo/manager' },
  { role: 'GUARD', label: 'Security guard', hint: 'Register, approve, check in and out', icon: ShieldCheck, path: '/demo/guard' },
  { role: 'CARETAKER', label: 'Caretaker', hint: 'Day-to-day gate and property work', icon: Wrench, path: '/demo/caretaker' },
]
const SALON: { role: SalonDemoRole; label: string; hint: string; icon: LucideIcon; path: string }[] = [
  { role: 'OWNER', label: 'Salon owner', hint: 'Revenue, stylists and reports', icon: Crown, path: '/demo/salon/owner' },
  { role: 'RECEPTION', label: 'Receptionist', hint: 'Register clients and take payment', icon: ConciergeBell, path: '/demo/salon/reception' },
  { role: 'PROVIDER', label: 'Stylist', hint: 'See your clients, mark work done', icon: Scissors, path: '/demo/salon/provider' },
]

function RoleCard({ label, hint, icon: Icon, onClick }: { label: string; hint: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card p-5 flex items-center gap-4 text-left hover:shadow-card-hover hover:border-lango-primary/30 transition-all group">
      <div className="w-12 h-12 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-lango-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-lango-primary transition-colors" />
    </button>
  )
}

export default function DemoEntry() {
  const navigate = useNavigate()
  const setRole = useDemoStore(s => s.setRole)
  const setSalonRole = useSalonDemo(s => s.setRole)
  const { start } = useDemoTour()

  return (
    <div className="min-h-full bg-surface">
      <div className="bg-lango-dark text-white px-4 pt-8 pb-24">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate('/')} aria-label="Back to home"><LangoLogo tone="light" /></button>
          <div className="text-center mt-10">
            <span className="inline-block text-xs font-semibold tracking-wide uppercase text-amber-300 mb-3">Interactive demo</span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">Try Lango with sample data</h1>
            <p className="mt-3 text-white/70 max-w-xl mx-auto">No sign-up. Pick a business and a role, or take a one-minute guided tour.</p>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 -mt-14 pb-16 grid lg:grid-cols-2 gap-6">
        {[
          { key: 'property' as const, title: 'Property and gate', sub: 'Greenview Apartments', roles: PROPERTY.map(o => ({ ...o, go: () => { setRole(o.role); navigate(o.path) } })) },
          { key: 'salon' as const, title: 'Salon', sub: 'Amani Beauty Studio', roles: SALON.map(o => ({ ...o, go: () => { setSalonRole(o.role); navigate(o.path) } })) },
        ].map(group => (
          <section key={group.key} className="rounded-3xl bg-white border border-gray-200/70 shadow-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 px-1 mb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900">{group.title}</h2>
                <p className="text-xs text-gray-500">{group.sub}</p>
              </div>
              <button onClick={() => start(group.key)} className="btn-primary text-xs shrink-0">
                <PlayCircle className="w-4 h-4" /> Guided tour
              </button>
            </div>
            <div className="grid gap-3">
              {group.roles.map(o => <RoleCard key={o.role} label={o.label} hint={o.hint} icon={o.icon} onClick={o.go} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
