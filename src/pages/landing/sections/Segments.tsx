import { Home, Building2, GraduationCap, Factory, type LucideIcon } from 'lucide-react'
import type { LandingCopy } from '../i18n'
import { Reveal } from '../components/Reveal'

const icons: LucideIcon[] = [Home, Building2, GraduationCap, Factory]

export function Segments({ t }: { t: LandingCopy }) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <Reveal><h2 className="text-3xl font-bold text-lango-dark text-center">{t.segmentsHeading}</h2></Reveal>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {t.segments.map((s, i) => {
          const Icon = icons[i] ?? Home
          return (
            <Reveal key={s.title} delay={i * 80}>
              <div className="card p-6 h-full">
                <div className="w-11 h-11 rounded-xl bg-lango-light flex items-center justify-center"><Icon className="w-5 h-5 text-lango-primary" /></div>
                <h3 className="mt-4 font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500">{s.blurb}</p>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
