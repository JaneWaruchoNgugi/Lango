import { CalendarCheck, CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react'

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-lango-dark pt-16">
      {/* Dot-grid texture */}
      <div className="absolute inset-0 l-hero-grid" aria-hidden />
      {/* Blue gradient orb — left */}
      <div
        className="absolute -left-64 top-1/4 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 65%)' }}
        aria-hidden
      />
      {/* Amber gradient orb — bottom right */}
      <div
        className="absolute -right-40 bottom-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 65%)' }}
        aria-hidden
      />

      <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-24 lg:pt-16 lg:pb-32">
        <div className="grid lg:grid-cols-[1fr_1.08fr] gap-14 lg:gap-20 items-center">

          {/* ── Left: Copy ── */}
          <div>
            <div className="l-anim-1 inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase bg-lango-amber/10 border border-lango-amber/25 text-lango-amber px-3 py-1.5 rounded-full font-dm">
              <span className="w-1.5 h-1.5 rounded-full bg-lango-amber l-pulse" />
              Built for Kenyan Properties
            </div>

            <h1 className="l-anim-2 mt-6 font-display text-4xl sm:text-5xl lg:text-[3.2rem] font-bold text-white leading-[1.07] tracking-tight">
              Your gate.{' '}
              <br className="hidden sm:block" />
              Every visitor.{' '}
              <span className="text-lango-amber">Zero surprises.</span>
            </h1>

            <p className="l-anim-3 mt-5 text-lg text-gray-300 max-w-md leading-relaxed font-dm">
              Replace the paper gate book with instant WhatsApp alerts, digital visitor records, and live incident tracking.
            </p>

            <ul className="l-anim-4 mt-7 space-y-3">
              {[
                'Live in under 24 hours — we handle your setup',
                'No app for residents to download',
                'Flat monthly pricing from KES 4,000',
              ].map(b => (
                <li key={b} className="flex items-center gap-3 text-sm text-white/65 font-dm">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="l-anim-5 mt-9 flex flex-wrap gap-3">
              <a href="#consultation" className="l-btn-amber">
                <CalendarCheck className="w-4 h-4" />
                Book Free Consultation
              </a>
              <a href="#pricing" className="l-btn-ghost">
                View pricing
              </a>
            </div>

            <div className="l-anim-6 mt-10 flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {([['A','#3b82f6'],['M','#10b981'],['J','#f59e0b'],['K','#ef4444']] as [string,string][]).map(([letter, bg]) => (
                  <div
                    key={letter}
                    className="w-8 h-8 rounded-full ring-2 ring-lango-dark flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: bg }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <div className="font-dm">
                <p className="text-sm font-semibold text-white">Trusted by 500+ properties across Kenya</p>
                <p className="text-xs text-white/40 mt-0.5">★★★★★ &nbsp;4.9 average rating</p>
              </div>
            </div>
          </div>

          {/* ── Right: Product mockup ── */}
          <div className="l-anim-6 relative">
            {/* Glow behind card */}
            <div
              className="absolute -inset-6 rounded-[2.5rem] pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.14) 0%, transparent 70%)' }}
              aria-hidden
            />

            {/* Dashboard card */}
            <div
              className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}
            >
              {/* Browser chrome */}
              <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5" style={{ background: 'rgba(0,0,0,0.22)' }}>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                </div>
                <div className="flex-1 flex justify-center">
                  <span className="text-[11px] text-gray-300 bg-white/5 rounded px-3 py-0.5 font-mono">
                    app.lango.co.ke
                  </span>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gray-300 font-dm">Good afternoon</p>
                    <p className="text-sm font-bold text-white font-display">Mercy Njeri 👋</p>
                  </div>
                  <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full font-mono l-pulse">
                    ● LIVE
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {([
                    { n: '24', label: 'Visitors today', color: 'text-blue-400' },
                    { n: '3',  label: 'Inside now',     color: 'text-green-400' },
                    { n: '1',  label: 'Incidents',       color: 'text-red-400' },
                  ] as { n: string; label: string; color: string }[]).map(({ n, label, color }) => (
                    <div key={label} className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold font-display ${color}`}>{n}</p>
                      <p className="text-[10px] text-gray-400 font-dm mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-2.5">
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest font-dm">Recent Activity</p>
                  {([
                    { dot: 'bg-green-500', label: 'Visitor checked in', sub: 'A-204 · Work visit', time: '2m ago' },
                    { dot: 'bg-blue-400',  label: 'Delivery collected', sub: 'B-103 · Uber Eats',   time: '15m ago' },
                    { dot: 'bg-red-400',   label: 'Incident reported',  sub: 'Main Gate',           time: '1h ago' },
                  ] as { dot: string; label: string; sub: string; time: string }[]).map(({ dot, label, sub, time }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-green-50 font-dm truncate">{label}</p>
                        <p className="text-[10px] text-gray-400 font-dm truncate">{sub}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 font-mono">{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badge — WhatsApp */}
            <div className="l-float-card absolute -top-4 -right-3 l-float">
              <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 font-display">WhatsApp alert sent</p>
                <p className="text-[10px] text-gray-400 font-dm">Tenant notified instantly</p>
              </div>
            </div>

            {/* Floating badge — Secure */}
            <div className="l-float-card absolute -bottom-4 left-8 l-float-2">
              <div className="w-9 h-9 rounded-full bg-lango-primary/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-lango-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 font-display">Secure &amp; auditable</p>
                <p className="text-[10px] text-gray-400 font-dm">Every entry recorded</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative l-stat-divider">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {([
            { n: '500+',  label: 'Properties across Kenya' },
            { n: '10K+',  label: 'Visitors logged monthly' },
            { n: '< 24h', label: 'Average setup time' },
            { n: '4.9★',  label: 'Customer rating' },
          ] as { n: string; label: string }[]).map(({ n, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-bold text-white">{n}</p>
              <p className="text-xs text-gray-400 font-dm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gradient fade to white */}
      <div className="h-10 bg-gradient-to-b from-lango-dark to-white" aria-hidden />
    </section>
  )
}
