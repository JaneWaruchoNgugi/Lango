import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu, X, ShieldCheck, Users, Building2, Scissors,
  Calendar, CreditCard, BarChart3, ChevronRight,
  CheckCircle2, Star, Phone, Mail, Coins, Smartphone, Lock,
  KeyRound,
} from 'lucide-react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import toast from 'react-hot-toast'
import '../landing/landing.css'

// ── Nav ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '#s-features',    label: 'Features' },
  { href: '#s-permissions', label: 'Staff & Permissions' },
  { href: '#s-booking',     label: 'Online Booking' },
  { href: '#s-pricing',     label: 'Pricing' },
]

function SalonNav() {
  const [open, setOpen]       = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-40 l-nav-transition ${scrolled ? 'l-nav-scrolled' : ''}`}>
        <div className="px-6 sm:px-10 lg:px-16 xl:px-24 h-16 flex items-center justify-between">
          <a href="#s-home" className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${scrolled ? 'bg-lango-dark' : 'bg-white/12'}`}>
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <div className="leading-none">
              <span className={`font-display font-bold tracking-wide text-sm block transition-colors ${scrolled ? 'text-lango-dark' : 'text-white'}`}>LANGO</span>
              <span className={`text-[10px] font-semibold tracking-widest uppercase block transition-colors ${scrolled ? 'text-lango-primary' : 'text-lango-amber'}`}>Salon</span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium font-dm">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href}
                className={`transition-colors ${scrolled ? 'text-gray-500 hover:text-gray-900' : 'text-white/65 hover:text-white'}`}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/"
              className={`flex items-center gap-1.5 text-sm font-medium font-dm transition-colors px-3 py-1.5 rounded-lg border ${
                scrolled
                  ? 'text-lango-primary border-lango-primary/30 hover:bg-blue-50'
                  : 'text-white/70 border-white/20 hover:bg-white/10'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" /> Gate & Security
            </Link>
            <Link to="/login" className={`text-sm font-medium font-dm transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/65 hover:text-white'}`}>
              Login
            </Link>
            <a href="#s-trial" className={`text-sm font-semibold font-dm px-4 py-2 rounded-lg transition-all ${scrolled ? 'bg-lango-amber text-lango-dark hover:bg-amber-400' : 'bg-lango-amber text-lango-dark hover:bg-amber-400'}`}>
              Start Free Trial
            </a>
          </div>

          <button className={`md:hidden p-2 rounded-lg ${scrolled ? 'text-gray-600' : 'text-white/80'}`} onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-72 max-w-[82%] bg-white shadow-2xl flex flex-col p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-lango-dark flex items-center justify-center"><Scissors className="w-4 h-4 text-white" /></div>
                <span className="font-display font-bold text-lango-dark">LANGO Salon</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map(l => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                  className="py-3 px-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-lango-primary transition-colors font-dm">
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <Link to="/" onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-lango-primary/30 text-sm font-semibold text-lango-primary font-dm hover:bg-blue-50 transition-colors">
                <KeyRound className="w-4 h-4" /> Explore Gate & Security
              </Link>
              <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary w-full justify-center">Login</Link>
              <a href="#s-trial" onClick={() => setOpen(false)} className="l-btn-amber w-full justify-center">Start Free Trial</a>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function SalonHero() {
  return (
    <section id="s-home" className="relative overflow-hidden bg-lango-dark pt-16">
      <div className="absolute inset-0 l-hero-grid" aria-hidden />
      <div className="absolute -left-64 top-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)' }} aria-hidden />

      <div className="relative px-6 sm:px-10 lg:px-16 xl:px-24 pt-12 pb-24 lg:pt-16 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="l-anim-1 inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase bg-lango-amber/10 border border-lango-amber/25 text-lango-amber px-3 py-1.5 rounded-full font-dm">
              <span className="w-1.5 h-1.5 rounded-full bg-lango-amber l-pulse" />
              Built for Kenyan Salons
            </div>

            <h1 className="l-anim-2 mt-6 font-display text-4xl sm:text-5xl font-bold text-white leading-[1.07] tracking-tight">
              Run your salon.{' '}
              <br className="hidden sm:block" />
              <span className="text-lango-amber">Keep control</span>
              <br className="hidden sm:block" />
              of your clients.
            </h1>

            <p className="l-anim-3 mt-5 text-lg text-gray-300 max-w-md leading-relaxed font-dm">
              Manage clients, staff, providers, bookings, payments and multiple branches from one secure dashboard.
            </p>

            <ul className="l-anim-4 mt-7 space-y-3">
              {[
                'Every provider sees only what they need to do their job',
                'Client contact details stay with the salon — not the provider',
                'Built for growing salons in Kenya',
              ].map(b => (
                <li key={b} className="flex items-center gap-3 text-sm text-white/65 font-dm">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="l-anim-5 mt-9 flex flex-wrap gap-3">
              <a href="#s-trial" className="l-btn-amber">
                <Calendar className="w-4 h-4" /> Start 30-Day Free Trial
              </a>
              <a href="#s-trial" className="l-btn-ghost">Book a Demo</a>
            </div>
          </div>

          {/* Product mockup */}
          <div className="l-anim-6 relative">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)' }}>
              <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5" style={{ background: 'rgba(0,0,0,0.22)' }}>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                </div>
                <span className="flex-1 flex justify-center">
                  <span className="text-[11px] text-gray-300 bg-white/5 rounded px-3 py-0.5 font-mono">app.lango.co.ke/salon</span>
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gray-300 font-dm">Glam Hub Salon</p>
                    <p className="text-sm font-bold text-white font-display">Good morning, Wanjiru 👋</p>
                  </div>
                  <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full font-mono l-pulse">● LIVE</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { n: '14', label: 'Clients today',   color: 'text-lango-amber' },
                    { n: '3',  label: 'In service',      color: 'text-green-400'   },
                    { n: '4',  label: 'Providers active',color: 'text-blue-400'    },
                  ].map(({ n, label, color }) => (
                    <div key={label} className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold font-display ${color}`}>{n}</p>
                      <p className="text-[10px] text-gray-400 font-dm mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest font-dm mb-2.5">Jane — Hair Stylist</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Client name',     allowed: true },
                      { label: 'Service history', allowed: true },
                      { label: 'Phone number',    allowed: false },
                      { label: 'Payments',        allowed: false },
                    ].map(({ label, allowed }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-300 font-dm">{label}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono ${allowed ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {allowed ? '✓ allowed' : '✗ restricted'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="l-float-card absolute -top-4 -right-3 l-float">
              <div className="w-9 h-9 rounded-full bg-lango-amber flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-lango-dark" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 font-display">Access controlled</p>
                <p className="text-[10px] text-gray-400 font-dm">Per person, per permission</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative l-stat-divider">
        <div className="px-6 sm:px-10 lg:px-16 xl:px-24 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: 'KES', label: 'Kenyan Shillings supported' },
            { n: 'M-Pesa', label: 'Payment recording built in' },
            { n: '∞', label: 'Branch support' },
            { n: '30-day', label: 'Free trial — no card needed' },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-bold text-white">{n}</p>
              <p className="text-xs text-gray-400 font-dm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="h-10 bg-gradient-to-b from-lango-dark to-white" aria-hidden />
    </section>
  )
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, className = '', children }: { id?: string; className?: string; children: React.ReactNode }) {
  return <section id={id} className={`py-16 lg:py-24 ${className}`}>{children}</section>
}

function SectionHead({ overline, title, sub }: { overline: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center mb-14">
      <span className="l-overline">{overline}</span>
      <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">{title}</h2>
      {sub && <p className="mt-4 text-gray-500 font-dm max-w-xl mx-auto leading-relaxed">{sub}</p>}
    </div>
  )
}

// ── Section 1 — Three pillars ────────────────────────────────────────────────

function S1Features() {
  return (
    <Section id="s-features" className="bg-white">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <SectionHead
          overline="What Lango Salon does"
          title={<>Your salon grows. Your systems<br className="hidden sm:block" /> shouldn't become harder to control.</>}
        />
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              color: 'bg-blue-50 text-blue-600',
              title: 'Client Control',
              body: 'Keep client records within the salon. Every visit, every service, every provider — tracked and accessible to authorised staff only.',
            },
            {
              icon: ShieldCheck,
              color: 'bg-amber-50 text-lango-amber',
              title: 'Staff Control',
              body: 'Give every person only the access they need for their role. Set individual permissions — not just a job title.',
            },
            {
              icon: Building2,
              color: 'bg-green-50 text-green-600',
              title: 'Branch Control',
              body: 'Manage Branch 1, Branch 2, Branch 3 and beyond from one owner account. Consolidated reporting across all locations.',
            },
          ].map(({ icon: Icon, color, title, body }) => (
            <div key={title} className="l-feature-card p-7">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-lango-dark mb-2">{title}</h3>
              <p className="text-gray-500 text-sm font-dm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ── Section 2 — Permissions UI ───────────────────────────────────────────────

function S2Permissions() {
  return (
    <Section id="s-permissions" className="bg-gray-50">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="l-overline">Staff & Permissions</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              Give every employee the access they actually need.
            </h2>
            <p className="mt-5 text-gray-500 font-dm leading-relaxed">
              Permissions are assigned per person — not simply by job title. An owner can grant or revoke individual access to client contact details, financial data, and management functions at any time.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Client name and service history — available to providers by default',
                'Phone, email and address — owner-controlled, off by default',
                'Prices, payments and revenue — restricted to authorised staff only',
                'Every change is audit-logged with the name of who made it',
              ].map(b => (
                <li key={b} className="flex items-start gap-3 text-sm text-gray-600 font-dm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Realistic permissions mockup */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 bg-lango-dark">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wide font-dm">Staff Permissions</p>
              <p className="text-white font-bold mt-0.5">Jane Mwangi — Hair Stylist</p>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="px-5 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Client Data</p>
                {[
                  { label: 'Client name',        on: true },
                  { label: 'Service history',    on: true },
                  { label: 'Hair notes & allergies', on: true },
                  { label: 'Phone number',       on: false },
                  { label: 'Email address',      on: false },
                  { label: 'Physical address',   on: false },
                ].map(({ label, on }) => (
                  <div key={label} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-700">{label}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${on ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                      {on ? '✓ allowed' : '✗ restricted'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Financial</p>
                {[
                  { label: 'Service prices',  on: false },
                  { label: 'Payments',        on: false },
                  { label: 'Revenue reports', on: false },
                ].map(({ label }) => (
                  <div key={label} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-700">{label}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                      ✗ restricted
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-gray-50/50">
                <p className="text-xs text-gray-400 font-dm italic">Last updated by Salon Owner · permissions enforced server-side</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── Section 3 — Online Booking ───────────────────────────────────────────────

function S3Booking() {
  return (
    <Section id="s-booking" className="bg-white">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Booking flow mockup */}
          <div className="card p-0 overflow-hidden order-2 lg:order-1">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-lango-amber/20 flex items-center justify-center">
                <Scissors className="w-4 h-4 text-lango-amber" />
              </div>
              <div>
                <p className="text-sm font-bold text-lango-dark">Glam Hub Nairobi</p>
                <p className="text-[11px] text-gray-400 font-dm">Book a service · No app needed</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[
                { step: '1', label: 'Choose a service', done: true,  value: 'Hair Dressing' },
                { step: '2', label: 'Choose a provider',done: true,  value: 'Jane Mwangi' },
                { step: '3', label: 'Select date & time',done: true, value: 'Thu 3 Oct · 10:00 AM' },
                { step: '4', label: 'Confirm booking',  done: false, value: '' },
              ].map(({ step, label, done, value }) => (
                <div key={step} className={`flex items-center gap-3 p-3 rounded-xl border ${done ? 'border-green-100 bg-green-50/50' : 'border-lango-primary/20 bg-lango-light/50'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-lango-primary text-white'}`}>
                    {done ? '✓' : step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-dm">{label}</p>
                    {value && <p className="text-sm font-semibold text-gray-900">{value}</p>}
                    {!done && <p className="text-sm text-lango-primary font-medium">Tap to confirm →</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="l-overline">Online Booking</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              Let clients book without downloading an app.
            </h2>
            <p className="mt-5 text-gray-500 font-dm leading-relaxed">
              Share your salon's booking link and clients can select a service, choose a provider, and pick a time — all from their phone browser.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'No app install required for clients',
                'Bookings go directly to your reception dashboard',
                'Provider selection keeps client accountability clear',
                'Works on any phone — WhatsApp-shareable link',
              ].map(b => (
                <li key={b} className="flex items-start gap-3 text-sm text-gray-600 font-dm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── Section 4 — Multi-branch ─────────────────────────────────────────────────

function S4Branches() {
  return (
    <Section className="bg-gray-50">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="l-overline">Multi-branch</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              One owner. Every branch.
            </h2>
            <p className="mt-5 text-gray-500 font-dm leading-relaxed">
              As you open new locations, they're all connected under your owner account. Switch between consolidated and branch-specific reporting instantly.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {[
                { label: 'All Branches', clients: 47, revenue: 'KES 128,400', highlight: true },
                { label: 'Branch 1 — CBD',      clients: 18, revenue: 'KES 52,300', highlight: false },
                { label: 'Branch 2 — Westlands', clients: 15, revenue: 'KES 41,800', highlight: false },
                { label: 'Branch 3 — Karen',    clients: 14, revenue: 'KES 34,300', highlight: false },
              ].map(({ label, clients, revenue, highlight }) => (
                <div key={label} className={`p-4 rounded-xl border ${highlight ? 'bg-lango-dark border-lango-dark text-white' : 'bg-white border-gray-100'}`}>
                  <p className={`text-xs font-semibold mb-1 ${highlight ? 'text-white/60' : 'text-gray-400'}`}>{label}</p>
                  <p className={`text-xl font-bold font-display ${highlight ? 'text-lango-amber' : 'text-lango-dark'}`}>{clients}</p>
                  <p className={`text-xs mt-0.5 ${highlight ? 'text-white/50' : 'text-gray-400'}`}>clients · {revenue}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-lango-dark font-display">Branch Comparison</p>
                <span className="badge badge-blue">This Month</span>
              </div>
              {[
                { branch: 'CBD',       pct: 82, color: 'bg-blue-500' },
                { branch: 'Westlands', pct: 65, color: 'bg-lango-amber' },
                { branch: 'Karen',     pct: 53, color: 'bg-green-500' },
              ].map(({ branch, pct, color }) => (
                <div key={branch}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-700 font-dm">Branch — {branch}</span>
                    <span className="text-gray-500">{pct}% capacity</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 font-dm text-center pt-1">Branch permissions do not bypass salon isolation</p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── Section 5 — Staff management ────────────────────────────────────────────

function S5Staff() {
  return (
    <Section className="bg-white">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <SectionHead
          overline="Staff Management"
          title="Your salon. Your staff. Your rules."
          sub="Add, assign, configure and deactivate staff from one place. Each person gets a unique code and access level that the owner controls."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Users,       title: 'Add staff',                body: 'Create provider or receptionist accounts. A temporary login is generated automatically.' },
            { icon: Building2,   title: 'Assign branch',            body: 'Assign staff to one or more branches. They only see clients from their assigned location.' },
            { icon: ShieldCheck, title: 'Set individual permissions',body: 'Configure per-person access — not just a role default. Override any permission at any time.' },
            { icon: CheckCircle2,title: 'Activate / deactivate',    body: 'Deactivate a staff member instantly without deleting their history.' },
            { icon: ChevronRight,title: 'Reset password',           body: 'Generate a new temporary password directly from the owner dashboard.' },
            { icon: BarChart3,   title: 'Track performance',        body: 'See how many clients each provider served without exposing financial data.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="l-feature-card p-5">
              <div className="w-9 h-9 rounded-xl bg-lango-light flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-lango-primary" />
              </div>
              <h3 className="text-sm font-bold text-lango-dark mb-1">{title}</h3>
              <p className="text-xs text-gray-500 font-dm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ── Section 6 — Service history / accountability ─────────────────────────────

function S6History() {
  return (
    <Section className="bg-gray-50">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="l-overline">Provider Accountability</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              Know who served every client.
            </h2>
            <p className="mt-5 text-gray-500 font-dm leading-relaxed">
              Every service is linked to the provider who performed it. Salon management can review service history and identify accountability without exposing financial data to providers.
            </p>
            <p className="mt-3 text-sm text-gray-500 font-dm">
              Providers see only the services they performed — not prices, not revenue, not other providers' client information.
            </p>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Service History</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { client: 'Mary Njoki',    service: 'Blow-dry',     provider: 'Jane',    branch: 'CBD',       date: '2 Oct', status: 'COMPLETED' },
                { client: 'Grace Otieno',  service: 'Hair Dressing',provider: 'Amina',   branch: 'Westlands', date: '2 Oct', status: 'COMPLETED' },
                { client: 'Ann Wambui',    service: 'Manicure',     provider: 'Faith',   branch: 'Karen',     date: '1 Oct', status: 'COMPLETED' },
                { client: 'Susan Kamau',   service: 'Lash Service', provider: 'Jane',    branch: 'CBD',       date: '1 Oct', status: 'COMPLETED' },
              ].map(({ client, service, provider, branch, date, status }) => (
                <div key={client + service} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{client}</p>
                    <p className="text-xs text-gray-500">{service} · {provider} · {branch}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{date}</p>
                    <span className="badge badge-green">{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── Section 7 — Checkout workflow ────────────────────────────────────────────

function S7Checkout() {
  return (
    <Section className="bg-white">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <SectionHead
          overline="Checkout"
          title="From service to payment in one workflow."
          sub="Reception handles checkout. Providers record completion. The owner sees the full picture."
        />
        <div className="flex flex-wrap justify-center gap-2 items-center">
          {[
            { icon: Scissors,     label: 'Service recorded' },
            { icon: CheckCircle2, label: 'Provider marks done' },
            { icon: CreditCard,   label: 'Checkout & M-Pesa' },
            { icon: Star,         label: 'Client satisfaction' },
          ].map(({ icon: Icon, label }, i, arr) => (
            <>
              <div key={label} className="flex flex-col items-center gap-2 w-28">
                <div className="w-12 h-12 rounded-2xl bg-lango-light flex items-center justify-center">
                  <Icon className="w-6 h-6 text-lango-primary" />
                </div>
                <p className="text-xs text-center font-dm text-gray-600">{label}</p>
              </div>
              {i < arr.length - 1 && <ChevronRight key={`arr-${i}`} className="w-4 h-4 text-gray-300 mx-1" />}
            </>
          ))}
        </div>
        <div className="mt-12 grid sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Payment Methods</p>
            <div className="space-y-2">
              {['M-Pesa (record confirmation code)', 'Cash', 'Other'].map(m => (
                <div key={m} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  {m}
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">After Checkout</p>
            <div className="space-y-2">
              {['Complaint recorded if raised', 'Client satisfaction logged', 'Revenue added to owner report'].map(m => (
                <div key={m} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── Section 8 — Client history ───────────────────────────────────────────────

function S8ClientHistory() {
  return (
    <Section className="bg-gray-50">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="l-overline">Client Records</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              Every visit becomes part of your salon's history.
            </h2>
            <p className="mt-5 text-gray-500 font-dm leading-relaxed">
              Build a complete record of each client's visits — services, providers, branches, and relevant notes — while respecting the access permissions you've configured for each staff member.
            </p>
            <ul className="mt-6 space-y-2">
              {[
                'Service type and provider for every visit',
                'Branch and date recorded automatically',
                'Allergies and notes accessible only to permitted staff',
                'No client contact data shown without explicit permission',
              ].map(b => (
                <li key={b} className="flex items-start gap-3 text-sm text-gray-600 font-dm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="font-bold text-gray-900">Mary Njoki</p>
              <p className="text-xs text-gray-400 mt-0.5 font-dm">Client since August 2026 · 7 visits</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { service: 'Blow-dry',      provider: 'Jane',  branch: 'CBD',       date: '2 Oct' },
                { service: 'Hair Dressing', provider: 'Jane',  branch: 'CBD',       date: '18 Sep' },
                { service: 'Manicure',      provider: 'Faith', branch: 'Westlands', date: '5 Sep' },
              ].map(({ service, provider, branch, date }) => (
                <div key={date + service} className="px-5 py-3 flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{service}</p>
                    <p className="text-xs text-gray-500">{provider} · {branch}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{date}</span>
                </div>
              ))}
              <div className="px-5 py-3 bg-gray-50/50">
                <p className="text-xs text-gray-400 font-dm italic">Phone and payment history shown only to permitted staff</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ── Section 9 — Kenya-specific ───────────────────────────────────────────────

function S9Kenya() {
  return (
    <Section className="bg-lango-dark">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <SectionHead
          overline="Built for Kenya"
          title={<span className="text-white">Built for how Kenyan salons operate.</span>}
          sub=""
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: Coins,      color: 'text-lango-amber bg-lango-amber/15', title: 'KES pricing',      body: 'All amounts in Kenya Shillings.' },
            { icon: CreditCard, color: 'text-green-400 bg-green-400/10',     title: 'M-Pesa recording', body: 'Record M-Pesa confirmation codes at checkout.' },
            { icon: Building2,  color: 'text-blue-400 bg-blue-400/10',       title: 'Multi-branch',     body: 'One account, multiple Nairobi locations.' },
            { icon: Smartphone, color: 'text-purple-400 bg-purple-400/10',   title: 'Mobile-first',     body: 'Designed for smartphones first, tablets second.' },
            { icon: Lock,       color: 'text-red-400 bg-red-400/10',         title: 'Owner-controlled', body: 'Permissions set and changed only by the owner.' },
            { icon: BarChart3,  color: 'text-sky-400 bg-sky-400/10',         title: 'Monthly reports',  body: 'Historical revenue reports by month and branch.' },
          ].map(({ icon: Icon, color, title, body }) => (
            <div key={title} className="bg-white/5 border border-white/8 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-white mb-1">{title}</p>
              <p className="text-xs text-white/50 font-dm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ── Section 10 — Founding partner ────────────────────────────────────────────

function S10Partner() {
  return (
    <Section className="bg-white">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="text-center mb-12">
          <span className="l-overline">Founding Partner Programme</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
            Join the first Lango Salon partners.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {[
            { icon: Calendar,    title: '30-day free trial',        body: 'Full access — no credit card required. We set you up.' },
            { icon: Users,       title: 'Direct setup support',     body: 'We configure your salon, staff and branches with you.' },
            { icon: Star,        title: 'Founding partner pricing', body: 'Lock in discounted rates before public launch.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="l-feature-card p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-lango-amber/10 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-lango-amber" />
              </div>
              <h3 className="font-display text-base font-bold text-lango-dark mb-2">{title}</h3>
              <p className="text-sm text-gray-500 font-dm">{body}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <a href="#s-trial" className="l-btn-amber">
            <Star className="w-4 h-4" /> Become a Lango Salon Partner
          </a>
        </div>
      </div>
    </Section>
  )
}

// ── Section 11 + 12 — Pricing & final CTA + Trial Form ──────────────────────

const SALON_PLANS = [
  {
    name: 'Starter',
    price: 3500,
    features: ['1 branch', 'Up to 5 staff', 'Client records', 'Basic reports', '30-day free trial'],
    popular: false,
  },
  {
    name: 'Grow',
    price: 7500,
    features: ['Up to 3 branches', 'Unlimited staff', 'Full permissions system', 'Revenue reports', 'M-Pesa recording', '30-day free trial'],
    popular: true,
  },
  {
    name: 'Scale',
    price: 15000,
    features: ['Unlimited branches', 'Unlimited staff', 'All Grow features', 'Priority support', 'Founding partner pricing', '30-day free trial'],
    popular: false,
  },
]

function S11Pricing() {
  return (
    <Section id="s-pricing" className="bg-gray-50">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <SectionHead
          overline="Pricing"
          title="Simple, honest pricing."
          sub="No hidden fees. Start with a 30-day free trial — we'll recommend the right plan for your salon."
        />
        <div className="grid md:grid-cols-3 gap-5">
          {SALON_PLANS.map((p) => (
            <div key={p.name} className={`rounded-2xl p-6 flex flex-col relative border ${p.popular ? 'l-plan-popular' : 'bg-white border-gray-100 shadow-sm'}`}>
              {p.popular && (
                <div className="absolute -top-4 inset-x-0 flex justify-center">
                  <span className="text-[11px] font-bold text-lango-dark bg-lango-amber px-3 py-1 rounded-full font-dm uppercase">Most Popular</span>
                </div>
              )}
              <div className="mb-6">
                <p className={`text-sm font-bold font-display ${p.popular ? 'text-white/55' : 'text-gray-400'}`}>{p.name}</p>
                <p className={`mt-2 text-3xl font-bold font-display ${p.popular ? 'text-white' : 'text-lango-dark'}`}>
                  KES {p.price.toLocaleString()}
                </p>
                <p className={`text-[11px] mt-1 font-dm ${p.popular ? 'text-white/38' : 'text-gray-400'}`}>per month</p>
              </div>
              <ul className="flex-1 space-y-2.5 mb-7">
                {p.features.map(f => (
                  <li key={f} className={`flex items-start gap-2.5 text-sm font-dm ${p.popular ? 'text-white/75' : 'text-gray-600'}`}>
                    <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${p.popular ? 'text-lango-amber' : 'text-green-500'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#s-trial"
                className={`block text-center text-sm font-semibold rounded-xl py-2.5 px-4 font-dm transition-all ${p.popular ? 'bg-lango-amber text-lango-dark hover:bg-amber-400' : 'border border-lango-primary text-lango-primary hover:bg-lango-primary hover:text-white'}`}>
                Start Free Trial
              </a>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ── Trial/CTA Form ───────────────────────────────────────────────────────────

function S12CtaForm() {
  const [form, setForm]     = useState({ name: '', salonName: '', phone: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]     = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone) return
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'leads'), {
        name:         form.name.trim(),
        propertyName: form.salonName.trim() || 'Salon',
        propertyType: 'Salon',
        phone:        form.phone.trim(),
        message:      form.message.trim() || undefined,
        source:       'LANDING_FORM',
        status:       'NEW',
        createdAt:    serverTimestamp(),
      })
      setDone(true)
      toast.success('We\'ll be in touch shortly!')
    } catch {
      toast.error('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Section id="s-trial" className="bg-lango-dark">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="text-center mb-10">
          <span className="l-overline text-lango-amber" style={{ color: '#f59e0b' }}>Get started</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Your salon. Your clients. Your branches. One Lango.
          </h2>
          <p className="mt-4 text-white/60 font-dm">
            Fill in your details and we'll contact you to set up your free 30-day trial.
          </p>
        </div>

        {done ? (
          <div className="bg-white/10 border border-white/15 rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-lg font-bold text-white font-display">Request received!</p>
            <p className="text-white/60 font-dm mt-2">We'll call or message you within one business day to schedule your salon setup.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white/8 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5 font-dm">Your name *</label>
                <input
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-white/10 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-lango-amber"
                  placeholder="e.g. Wanjiru Kamau"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5 font-dm">Phone number *</label>
                <input
                  type="tel"
                  value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-white/10 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-lango-amber"
                  placeholder="+254 7XX XXX XXX"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5 font-dm">Salon name</label>
              <input
                value={form.salonName} onChange={e => setForm(p => ({ ...p, salonName: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-white/10 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-lango-amber"
                placeholder="e.g. Glam Hub Nairobi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5 font-dm">Message (optional)</label>
              <textarea
                rows={3}
                value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-white/10 border border-white/15 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-lango-amber resize-none"
                placeholder="How many branches? How many providers? Anything else we should know?"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button type="submit" disabled={submitting} className="l-btn-amber flex-1 justify-center">
                {submitting ? 'Sending…' : 'Start Free Trial →'}
              </button>
              <a href="tel:+254700000000" className="l-btn-ghost flex-1 justify-center">
                <Phone className="w-4 h-4" /> Call us instead
              </a>
            </div>
            <p className="text-xs text-white/30 text-center font-dm">No credit card required · We'll handle your setup</p>
          </form>
        )}
      </div>
    </Section>
  )
}

// ── Footer ───────────────────────────────────────────────────────────────────

function SalonFooter() {
  return (
    <footer className="bg-lango-dark border-t border-white/7">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24 py-12">
        <div className="grid sm:grid-cols-3 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Scissors className="w-4 h-4 text-white" /></div>
              <div>
                <span className="font-display font-bold text-white text-sm block">LANGO</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-lango-amber">Salon</span>
              </div>
            </div>
            <p className="text-sm text-white/40 font-dm leading-relaxed">
              Secure salon management for Kenyan salons. Client records, staff permissions, multi-branch — one dashboard.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-4 font-dm">Product</p>
            <div className="space-y-3 text-sm text-white/45 font-dm">
              <a href="#s-features"    className="block hover:text-white transition-colors">Features</a>
              <a href="#s-permissions" className="block hover:text-white transition-colors">Staff & Permissions</a>
              <a href="#s-booking"     className="block hover:text-white transition-colors">Online Booking</a>
              <a href="#s-pricing"     className="block hover:text-white transition-colors">Pricing</a>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-4 font-dm">Contact</p>
            <div className="space-y-3 text-sm text-white/45 font-dm">
              <a href="tel:+254700000000" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5" /> +254 700 000 000
              </a>
              <a href="mailto:hello@lango.co.ke" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-3.5 h-3.5" /> hello@lango.co.ke
              </a>
              <Link to="/" className="block text-blue-400 hover:text-blue-300 transition-colors">Lango Gate & Security →</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/7 pt-8 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/25 font-dm">
          <p>© 2026 Lango. All rights reserved.</p>
          <Link to="/login" className="hover:text-white/60 transition-colors">Sign in →</Link>
        </div>
      </div>
    </footer>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SalonLandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <SalonNav />
      <main>
        <SalonHero />
        <S1Features />
        <S2Permissions />
        <S3Booking />
        <S4Branches />
        <S5Staff />
        <S6History />
        <S7Checkout />
        <S8ClientHistory />
        <S9Kenya />
        <S10Partner />
        <S11Pricing />
        <S12CtaForm />
      </main>
      <SalonFooter />
    </div>
  )
}
