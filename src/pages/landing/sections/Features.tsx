import { UserCheck, MessageCircle, LayoutDashboard, Check, type LucideIcon } from 'lucide-react'

const FEATURES: { icon: LucideIcon; title: string; points: string[] }[] = [
  { icon: UserCheck, title: 'Visitor check-in / out', points: ['Fast photo + ID registration', 'Real-time host approvals'] },
  { icon: MessageCircle, title: 'Instant WhatsApp alerts', points: ['Visitor, delivery & incident alerts', 'No app for residents to install'] },
  { icon: LayoutDashboard, title: 'Live dashboard', points: ['Everyone on your property, live', 'Reports & exportable records'] },
]

export function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-4 py-16 lg:py-20">
      <span className="text-xs font-semibold tracking-wide uppercase text-lango-primary">Powerful features</span>
      <h2 className="mt-3 text-3xl font-bold text-lango-dark">Everything you need at the gate</h2>
      <p className="mt-3 text-gray-500 max-w-2xl">Visitors, deliveries and incidents — recorded and visible in real time.</p>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(f => (
          <div key={f.title} className="card p-6 h-full hover:shadow-card-hover transition-shadow">
            <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><f.icon className="w-5 h-5 text-lango-primary" /></div>
            <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
            <ul className="mt-3 space-y-2">
              {f.points.map(p => (
                <li key={p} className="flex items-start gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
