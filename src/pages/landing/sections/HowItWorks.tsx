import { UserPlus, Bell, ShieldCheck, ArrowRight, type LucideIcon } from 'lucide-react'

const STEPS: { icon: LucideIcon; title: string; blurb: string }[] = [
  { icon: UserPlus, title: 'Register the visitor', blurb: 'The guard captures the visitor and the host is notified instantly via WhatsApp.' },
  { icon: Bell, title: 'Resident gets an alert', blurb: 'An instant WhatsApp message lets the host approve or deny access.' },
  { icon: ShieldCheck, title: 'Everything is recorded', blurb: 'Check-ins, deliveries and incidents build a searchable digital record.' },
]

export function HowItWorks() {
  return (
    <section id="how" className="max-w-6xl mx-auto px-4 py-16 lg:py-20">
      <div className="text-center">
        <span className="text-xs font-semibold tracking-wide uppercase text-lango-primary">Simple &amp; effective</span>
        <h2 className="mt-3 text-3xl font-bold text-lango-dark">How it works</h2>
        <p className="mt-3 text-gray-500 max-w-2xl mx-auto">Get started in minutes and experience a safer, smarter way to manage your property.</p>
      </div>
      <div className="mt-12 grid md:grid-cols-3 gap-8 md:gap-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="relative text-center px-4">
            <div className="relative inline-flex">
              <div className="w-14 h-14 rounded-2xl bg-lango-primary/10 flex items-center justify-center"><s.icon className="w-6 h-6 text-lango-primary" /></div>
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-lango-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">{s.title}</h3>
            <p className="mt-1.5 text-sm text-gray-500 max-w-xs mx-auto">{s.blurb}</p>
            {i < STEPS.length - 1 && <ArrowRight className="hidden md:block absolute top-7 -right-2 w-5 h-5 text-gray-300" />}
          </div>
        ))}
      </div>
    </section>
  )
}
