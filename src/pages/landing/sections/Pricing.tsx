import { Check } from 'lucide-react'
import type { LandingCopy } from '../i18n'
import { SUBSCRIPTION_PLANS } from '../../../types'
import { waLink } from '../config'
import { Reveal } from '../components/Reveal'

export function Pricing({ t }: { t: LandingCopy }) {
  const plans = Object.values(SUBSCRIPTION_PLANS)
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-4 py-16">
      <Reveal>
        <h2 className="text-3xl font-bold text-lango-dark text-center">{t.pricingHeading}</h2>
        <p className="mt-2 text-center text-gray-500">{t.pricingSub}</p>
      </Reveal>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((p, i) => (
          <Reveal key={p.planId} delay={i * 70}>
            <div className={`card p-6 h-full flex flex-col ${p.planId === 'MEDIUM' ? 'ring-2 ring-lango-primary' : ''}`}>
              <h3 className="font-semibold text-gray-900">{p.name}</h3>
              <p className="mt-2 text-2xl font-bold text-lango-primary">KES {p.monthlyPrice.toLocaleString()}<span className="text-xs font-normal text-gray-400">{t.perMonth}</span></p>
              <ul className="mt-4 space-y-2 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600"><Check className="w-3.5 h-3.5 text-lango-accent flex-shrink-0 mt-0.5" />{f}</li>
                ))}
              </ul>
              <a href={waLink(`${t.pricingCta}: ${p.name}`)} target="_blank" rel="noreferrer" className="btn-primary text-sm mt-5 justify-center">{t.pricingCta}</a>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
