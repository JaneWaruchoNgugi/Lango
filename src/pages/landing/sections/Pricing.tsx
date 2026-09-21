import { Check } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { SUBSCRIPTION_PLANS } from '../../../types'

export function Pricing() {
  const plans = Object.values(SUBSCRIPTION_PLANS)
  return (
    <section id="pricing" className="bg-white py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-4">

        <Reveal>
          <div className="text-center mb-14">
            <span className="l-overline">Transparent pricing</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              Simple, honest pricing
            </h2>
            <p className="mt-4 text-gray-500 font-dm max-w-lg mx-auto leading-relaxed">
              No hidden fees, no lock-in. Book a free consultation and we'll confirm the best plan for your property.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
          {plans.map((p, i) => {
            const popular = p.planId === 'MEDIUM'
            return (
              <Reveal key={p.planId} delay={i * 80}>
                <div className={`rounded-2xl p-6 flex flex-col h-full relative border ${popular ? 'l-plan-popular' : 'bg-white border-gray-100 shadow-sm'}`}>
                  {popular && (
                    <div className="absolute -top-4 inset-x-0 flex justify-center">
                      <span className="text-[11px] font-bold text-lango-dark bg-lango-amber px-3 py-1 rounded-full font-dm tracking-wide uppercase">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <p className={`text-sm font-bold font-display ${popular ? 'text-white/55' : 'text-gray-400'}`}>
                      {p.name}
                    </p>
                    <p className={`mt-2 text-3xl font-bold font-display ${popular ? 'text-white' : 'text-lango-dark'}`}>
                      KES {p.monthlyPrice.toLocaleString()}
                    </p>
                    <p className={`text-[11px] mt-1.5 font-dm ${popular ? 'text-white/38' : 'text-gray-400'}`}>
                      per month · up to {p.maxUnits === 99999 ? 'unlimited' : p.maxUnits} units
                    </p>
                  </div>

                  <ul className="flex-1 space-y-2.5 mb-7">
                    {p.features.map(f => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm font-dm ${popular ? 'text-white/75' : 'text-gray-600'}`}>
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${popular ? 'text-lango-amber' : 'text-green-500'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#consultation"
                    className={`block text-center text-sm font-semibold rounded-xl py-2.5 px-4 font-dm transition-all ${
                      popular
                        ? 'bg-lango-amber text-lango-dark hover:bg-amber-400'
                        : 'border border-lango-primary text-lango-primary hover:bg-lango-primary hover:text-white'
                    }`}
                  >
                    Get Access
                  </a>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={200}>
          <div className="mt-12 text-center">
            <a href="#consultation" className="l-btn-primary">
              Book a Free Consultation
            </a>
            <p className="mt-3 text-xs text-gray-400 font-dm">
              Free call · No commitment · We'll recommend the best plan for your property
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
