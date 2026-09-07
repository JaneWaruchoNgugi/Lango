import type { LandingCopy } from '../i18n'
import { Reveal } from '../components/Reveal'

export function Faq({ t }: { t: LandingCopy }) {
  return (
    <section className="bg-lango-light">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Reveal><h2 className="text-3xl font-bold text-lango-dark text-center">{t.faqHeading}</h2></Reveal>
        <div className="mt-8 space-y-3">
          {t.faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="card p-5 group">
                <summary className="font-medium text-gray-900 cursor-pointer list-none flex justify-between items-center">
                  {f.q}<span className="text-lango-primary group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-2 text-sm text-gray-500">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
