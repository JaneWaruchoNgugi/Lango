import { CheckCircle2 } from 'lucide-react'
import type { LandingCopy } from '../i18n'
import { Reveal } from '../components/Reveal'

export function WhyLango({ t }: { t: LandingCopy }) {
  return (
    <section className="bg-lango-light">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <Reveal><h2 className="text-3xl font-bold text-lango-dark text-center">{t.whyHeading}</h2></Reveal>
        <div className="mt-10 max-w-2xl mx-auto grid sm:grid-cols-2 gap-4">
          {t.whyPoints.map((p, i) => (
            <Reveal key={p} delay={(i % 2) * 80}>
              <div className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-100">
                <CheckCircle2 className="w-5 h-5 text-lango-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
