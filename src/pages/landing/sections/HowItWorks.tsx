import type { LandingCopy } from '../i18n'
import { Reveal } from '../components/Reveal'

export function HowItWorks({ t }: { t: LandingCopy }) {
  return (
    <section className="bg-lango-dark text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <Reveal><h2 className="text-3xl font-bold text-center">{t.howHeading}</h2></Reveal>
        <div className="mt-10 grid sm:grid-cols-3 gap-6">
          {t.steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <div className="text-center px-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-lango-accent text-lango-dark font-bold flex items-center justify-center text-lg">{i + 1}</div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-white/70">{s.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
