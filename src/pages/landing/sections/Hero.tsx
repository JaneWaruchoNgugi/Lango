import { CalendarCheck, PlayCircle, ShieldCheck, MessageCircle, Star } from 'lucide-react'

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-lango-light via-white to-white">
      <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block text-xs font-semibold tracking-wide uppercase text-lango-secondary bg-white px-3 py-1 rounded-full border border-lango-primary/10">Modern Property Management</span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-lango-dark leading-[1.1]">Smarter property management, all in one place.</h1>
          <p className="mt-5 text-lg text-gray-600 max-w-xl">Lango replaces the paper gate book with instant WhatsApp alerts, digital visitor records, and full incident tracking — tighter security and a smoother experience for every kind of property.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#demo" className="btn-primary px-6 py-3"><CalendarCheck className="w-4 h-4" /> Book a Free Demo</a>
            <a href="#how" className="btn-secondary px-6 py-3"><PlayCircle className="w-4 h-4" /> See How It Works</a>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              {['bg-blue-500', 'bg-green-500', 'bg-orange-500'].map(c => <div key={c} className={`w-8 h-8 rounded-full ring-2 ring-white ${c}`} />)}
            </div>
            <div className="text-sm">
              <p className="text-gray-700 font-medium">Trusted by 500+ properties across the region</p>
              <p className="flex items-center gap-1 text-gray-500"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 4.9/5 average rating</p>
            </div>
          </div>
        </div>

        {/* Product mock */}
        <div className="relative">
          <div className="absolute -inset-6 bg-lango-primary/5 rounded-[2.5rem] blur-2xl" />
          <div className="relative rounded-2xl border border-gray-100 bg-white shadow-card-hover overflow-hidden">
            <div className="bg-lango-dark px-4 py-2.5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="p-4 bg-gray-50">
              <p className="text-sm font-semibold text-gray-900">Good afternoon, Mercy Njeri 👋</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[['24', 'Visitors'], ['3', 'Inside'], ['1', 'Incidents']].map(([n, l]) => (
                  <div key={l} className="rounded-lg bg-white border border-gray-100 p-3 text-center"><p className="text-lg font-bold text-gray-900">{n}</p><p className="text-[10px] text-gray-500">{l}</p></div>
                ))}
              </div>
              <div className="mt-3 rounded-lg bg-white border border-gray-100 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-gray-500">Recent Activity</p>
                {[['bg-green-500', 'Visitor checked in', 'A-204 · Work'], ['bg-blue-500', 'Delivery collected', 'B-103 · Uber Eats'], ['bg-red-500', 'Incident reported', 'Main Gate']].map(([c, a, b]) => (
                  <div key={a} className="flex items-center gap-2"><span className={`w-6 h-6 rounded-full ${c}`} /><div className="min-w-0"><p className="text-[11px] font-medium text-gray-800 truncate">{a}</p><p className="text-[10px] text-gray-400 truncate">{b}</p></div></div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute -top-3 -right-2 bg-white rounded-xl shadow-card px-3 py-2 flex items-center gap-2 border border-gray-100">
            <span className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center"><MessageCircle className="w-4 h-4 text-white" /></span>
            <div><p className="text-[11px] font-semibold text-gray-900">Real-time</p><p className="text-[10px] text-gray-500">WhatsApp alerts</p></div>
          </div>
          <div className="absolute -bottom-3 left-6 bg-white rounded-xl shadow-card px-3 py-2 flex items-center gap-2 border border-gray-100">
            <span className="w-7 h-7 rounded-full bg-lango-primary/10 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-lango-primary" /></span>
            <div><p className="text-[11px] font-semibold text-gray-900">Secure</p><p className="text-[10px] text-gray-500">& Reliable</p></div>
          </div>
        </div>
      </div>
    </section>
  )
}
