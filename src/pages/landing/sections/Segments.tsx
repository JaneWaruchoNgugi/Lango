import { Home, Building2, GraduationCap, Factory, type LucideIcon } from 'lucide-react'

const SEGMENTS: { icon: LucideIcon; title: string; blurb: string }[] = [
  { icon: Home, title: 'Residential', blurb: 'Apartments, gated estates and communities — welcome residents and their guests without the queue.' },
  { icon: Building2, title: 'Commercial', blurb: 'Offices, malls and business parks — manage tenants, staff and daily deliveries with a clean audit trail.' },
  { icon: GraduationCap, title: 'Institutional', blurb: 'Schools, campuses and hospitals — control access, log visitor activity and keep people accountable.' },
  { icon: Factory, title: 'Industrial', blurb: 'Warehouses, factories and yards — track contractors, trucks and deliveries in real time, all in one place.' },
]

export function Segments() {
  return (
    <section id="about" className="bg-gray-50/60">
      <div className="max-w-6xl mx-auto px-4 py-16 lg:py-20">
        <div className="text-center">
          <span className="text-xs font-semibold tracking-wide uppercase text-lango-primary">One platform, complete control</span>
          <h2 className="mt-3 text-3xl font-bold text-lango-dark">One system for every property</h2>
          <p className="mt-3 text-gray-500 max-w-2xl mx-auto">From residential apartments to commercial buildings, Lango gives you the tools to manage people, access, deliveries and incidents — effortlessly.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SEGMENTS.map(s => (
            <div key={s.title} className="card p-6 h-full hover:shadow-card-hover transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-lango-primary/10 flex items-center justify-center"><s.icon className="w-6 h-6 text-lango-primary" /></div>
              <h3 className="mt-4 font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{s.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
