import { UserCheck, MessageCircle, LayoutDashboard, Package, Clock, BarChart3, type LucideIcon } from 'lucide-react'
import { Reveal } from '../components/Reveal'

const FEATURES: { icon: LucideIcon; title: string; desc: string; tag?: string }[] = [
  {
    icon: UserCheck,
    title: 'Visitor check-in & check-out',
    desc: 'Photo + ID capture in under 60 seconds. Full audit trail for every person who enters your property.',
    tag: 'Core',
  },
  {
    icon: MessageCircle,
    title: 'Instant WhatsApp alerts',
    desc: 'Tenants are notified the moment a visitor or delivery arrives — no app to download.',
    tag: 'Notifications',
  },
  {
    icon: Package,
    title: 'Delivery management',
    desc: 'Log rider details, notify recipients and track collection. Parcels no longer go missing.',
  },
  {
    icon: LayoutDashboard,
    title: 'Live dashboard',
    desc: 'See everyone on your property in real time. Filter by block, unit, or visitor type.',
  },
  {
    icon: BarChart3,
    title: 'Reports & exports',
    desc: 'Monthly summaries, incident logs and visitor history in one click. PDF or CSV.',
  },
  {
    icon: Clock,
    title: 'Incident tracking',
    desc: 'Log and escalate incidents with timestamps and descriptions. Full accountability, always.',
  },
]

export function Features() {
  return (
    <section id="features" className="bg-gray-50/70 py-20 lg:py-28">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">

        <Reveal>
          <div className="mb-14">
            <span className="l-overline">Everything you need</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight max-w-lg">
              Every tool to run a tighter, safer gate
            </h2>
            <p className="mt-4 text-gray-500 font-dm max-w-lg leading-relaxed">
              From visitor registration to incident management — one platform that replaces every paper logbook, phone call, and WhatsApp chain.
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <div className="l-feature-card p-7 h-full flex flex-col">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-lango-primary/8 border border-lango-primary/10 flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-lango-primary" />
                  </div>
                  {f.tag && (
                    <span className="text-[11px] font-semibold text-lango-primary bg-lango-primary/8 px-2.5 py-0.5 rounded-full font-dm">
                      {f.tag}
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-500 font-dm leading-relaxed flex-1">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
