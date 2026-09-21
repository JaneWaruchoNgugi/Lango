import { Check } from 'lucide-react'
import { SUBSCRIPTION_PLANS } from '../../../types'

export function Pricing() {
  const plans = Object.values(SUBSCRIPTION_PLANS)
  return (
    <section id="pricing" className="bg-gray-50/60">
      <div className="max-w-6xl mx-auto px-4 py-4 lg:py-20">
        <div className="text-center">
          <span className="text-xs font-semibold tracking-wide uppercase text-lango-primary">Transparent Pricing</span>
          <h2 className="mt-3 text-3xl font-bold text-lango-dark">Pick the right plan — then book a consultation to get access</h2>
          <p className="mt-2 text-gray-500 max-w-xl mx-auto">
            No hidden fees, no lock-in. Our team will confirm the best fit for your property on the call.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(p => {
            const popular = p.planId === 'MEDIUM'
            return (
              <div
                key={p.planId}
                className={`card p-5 flex flex-col relative ${popular ? 'ring-2 ring-lango-primary' : ''}`}
              >
                {popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 badge bg-lango-primary text-white text-[10px] px-2 py-0.5 whitespace-nowrap">
                    Most Popular
                  </span>
                )}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">KES {p.monthlyPrice.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-400">per month · up to {p.maxUnits === 99999 ? 'unlimited' : p.maxUnits} units</p>
                </div>

                <ul className="flex-1 space-y-2 mb-5">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="#consultation"
                  className={`block text-center text-sm font-semibold rounded-lg py-2 px-4 transition-colors ${
                    popular
                      ? 'bg-lango-primary text-white hover:bg-lango-primary/90'
                      : 'border border-lango-primary text-lango-primary hover:bg-lango-primary hover:text-white'
                  }`}
                >
                  Get Access
                </a>
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <a href="#consultation" className="btn-primary px-7 py-3">
            Book a Consultation to Get Access
          </a>
          <p className="mt-2 text-xs text-gray-400">
            Free call · No commitment · We'll recommend the best plan for your property
          </p>
        </div>
      </div>
    </section>
  )
}
