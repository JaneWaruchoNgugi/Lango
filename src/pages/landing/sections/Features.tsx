import { UserCheck, MessageCircle, Package, AlertTriangle, ClipboardList, LayoutDashboard, type LucideIcon } from 'lucide-react'
import type { LandingCopy } from '../i18n'
import { Reveal } from '../components/Reveal'

const icons: LucideIcon[] = [UserCheck, MessageCircle, Package, AlertTriangle, ClipboardList, LayoutDashboard]

export function Features({ t }: { t: LandingCopy }) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <Reveal><h2 className="text-3xl font-bold text-lango-dark text-center">{t.featuresHeading}</h2></Reveal>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {t.features.map((f, i) => {
          const Icon = icons[i] ?? UserCheck
          return (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <div className="card p-6 h-full">
                <Icon className="w-6 h-6 text-lango-primary" />
                <h3 className="mt-3 font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500">{f.blurb}</p>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
