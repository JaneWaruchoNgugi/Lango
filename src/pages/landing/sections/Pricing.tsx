import { SUBSCRIPTION_PLANS } from '../../../types'

export function Pricing() {
  const plans = Object.values(SUBSCRIPTION_PLANS)
  return (
    <section id="pricing" className="bg-gray-50/60">
      <div className="max-w-6xl mx-auto px-4 py-14 lg:py-16">
        <div className="text-center">
          <span className="text-xs font-semibold tracking-wide uppercase text-lango-primary">Pricing</span>
          <h2 className="mt-3 text-3xl font-bold text-lango-dark">Simple monthly plans</h2>
          <p className="mt-2 text-gray-500">Pick a plan that fits your property. No hidden fees.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map(p => {
            const popular = p.planId === 'MEDIUM'
            return (
              <div key={p.planId} className={`card p-4 text-center relative ${popular ? 'ring-2 ring-lango-primary' : ''}`}>
                {popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 badge bg-lango-primary text-white text-[10px] px-2 py-0.5">Popular</span>}
                <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                <p className="mt-1 text-xl font-bold text-gray-900">KES {p.monthlyPrice.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400">per month</p>
              </div>
            )
          })}
        </div>
        <div className="mt-6 text-center">
          <a href="#demo" className="btn-primary px-6 py-3">Book a Free Demo</a>
          <p className="mt-2 text-xs text-gray-400">See the full feature set live in your interactive demo.</p>
        </div>
      </div>
    </section>
  )
}
