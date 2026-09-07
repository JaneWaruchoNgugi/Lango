import { MessageCircle } from 'lucide-react'
import type { LandingCopy } from '../i18n'
import { waLink } from '../config'
import { Reveal } from '../components/Reveal'
import hero from '../../../assets/hero.png'

export function Hero({ t }: { t: LandingCopy }) {
  return (
    <section className="bg-gradient-to-b from-lango-light to-white">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-lango-secondary bg-white px-3 py-1 rounded-full border border-lango-primary/10">{t.hero.badge}</span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-lango-dark leading-tight">{t.hero.title}</h1>
          <p className="mt-4 text-lg text-gray-600">{t.hero.subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={waLink(t.form.heading)} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> {t.hero.ctaPrimary}
            </a>
            <a href="#pricing" className="btn-secondary">{t.hero.ctaSecondary}</a>
          </div>
          <p className="mt-4 text-xs text-gray-400">{t.hero.trust}</p>
        </Reveal>
        <Reveal delay={120} className="hidden lg:block">
          <img src={hero} alt="Lango gate management" className="w-full rounded-2xl shadow-card-hover" />
        </Reveal>
      </div>
    </section>
  )
}
