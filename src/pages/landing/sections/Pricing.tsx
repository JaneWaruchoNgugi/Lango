import { Check } from 'lucide-react'
import { SUBSCRIPTION_PLANS } from '../../../types'

export function Pricing() {
  const plans = Object.values(SUBSCRIPTION_PLANS)
  return (
    <section id="pricing" className="bg-gray-50/60">
      <div className="max-w-6xl mx-auto px-4 py-16 lg:py-20">
        <div className="text-center">
          <span className="text-xs font-semibold tracking-wide uppercase text-lango-primary">Transparent pricing</span>
          <h2 className="mt-3 text-3xl font-bold text-lango-dark">Simple, transparent pricing</h2>
          <p className="mt-3 text-gray-500">Choose the plan that fits your property. No hidden fees.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {plans.map(p => {
            const popular = p.planId === 'MEDIUM'
            return (
              <div key={p.planId} className={`card p-6 h-full flex flex-col relative ${popular ? 'ring-2 ring-lango-primary shadow-card-hover' : ''}`}>
                {popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-lango-primary text-white text-xs px-3 py-1">Most Popular</span>}
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <p className="mt-2 text-2xl font-bold text-gray-900">KES {p.monthlyPrice.toLocaleString()}<span className="text-xs font-normal text-gray-400"> /month</span></p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {f}</li>
                  ))}
                </ul>
                <a href="#demo" className={`mt-6 justify-center ${popular ? 'btn-primary' : 'btn-secondary'}`}>Get Started</a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
