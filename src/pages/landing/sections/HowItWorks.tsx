import { UserPlus, Bell, ShieldCheck, type LucideIcon } from 'lucide-react'
import { Reveal } from '../components/Reveal'

const STEPS: { icon: LucideIcon; title: string; blurb: string }[] = [
  {
    icon: UserPlus,
    title: 'Register the visitor',
    blurb: 'The guard captures the visitor\'s ID, photo and purpose. Takes under 60 seconds.',
  },
  {
    icon: Bell,
    title: 'Tenant gets an alert',
    blurb: 'An instant WhatsApp message lets the host approve or deny access before entry.',
  },
  {
    icon: ShieldCheck,
    title: 'Everything is recorded',
    blurb: 'Check-ins, deliveries and incidents build a permanent, searchable digital record.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="bg-white py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-4">

        <Reveal>
          <div className="text-center mb-16">
            <span className="l-overline">Simple &amp; effective</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              How it works
            </h2>
            <p className="mt-4 text-gray-500 max-w-lg mx-auto font-dm leading-relaxed">
              Get live in under 24 hours and transform how your property handles every visitor, delivery, and incident — forever.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-10 md:gap-8">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 110}>
              <div className="relative text-center px-4">
                {/* Icon + number */}
                <div className="relative inline-block">
                  <div className="w-16 h-16 rounded-2xl bg-lango-light border border-lango-primary/12 flex items-center justify-center mx-auto">
                    <step.icon className="w-7 h-7 text-lango-primary" />
                  </div>
                  <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-lango-amber flex items-center justify-center text-xs font-bold text-lango-dark font-display shadow-md">
                    {i + 1}
                  </div>
                </div>

                {/* Connector (desktop) */}
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden md:block absolute top-8 h-px"
                    style={{
                      left: 'calc(50% + 36px)',
                      right: 'calc(-50% + 36px)',
                      background: 'linear-gradient(90deg, #e2e8f0 40%, transparent 100%)',
                    }}
                  />
                )}

                <h3 className="mt-5 font-display font-bold text-gray-900 text-lg">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-500 font-dm leading-relaxed max-w-[220px] mx-auto">{step.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
