import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu, X, Building2, Scissors, ShieldCheck, Users, BarChart3,
  CheckCircle2, Calendar, CreditCard, Package, Bell, Clock,
  Smartphone, Coins, Lock, ArrowRight, Plus, PlayCircle,
  Phone, Mail, MapPin, UserPlus, MessageCircle, LayoutDashboard,
  PhoneCall, Settings2, Rocket, Zap,
} from 'lucide-react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import toast from 'react-hot-toast'
import { SUBSCRIPTION_PLANS } from '../../types'
import { LangoLogo } from '../../components/ui/LangoLogo'
import './landing.css'

// ── Nav ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '#gate',    label: 'Gate Management' },
  { href: '#salon',   label: 'Salon' },
  { href: '#how',     label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq',     label: 'FAQ' },
]

function Nav() {
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-40 l-nav-transition ${scrolled ? 'l-nav-scrolled' : ''}`}>
        <div className="l-container h-16 flex items-center justify-between">
          <a href="#home" aria-label="Lango home">
            <LangoLogo size={30} tone={scrolled ? 'dark' : 'light'} />
          </a>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium" aria-label="Main">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href}
                className={`transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/70 hover:text-white'}`}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <Link to="/login"
              className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
              Sign in
            </Link>
            <a href="#cta" className="text-sm font-semibold px-4 py-2 rounded-lg bg-lango-amber text-lango-dark hover:bg-amber-400 transition-colors">
              Book a demo
            </a>
          </div>

          <button className={`lg:hidden p-2 -mr-2 rounded-lg ${scrolled ? 'text-gray-700' : 'text-white/85'}`}
            onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-72 max-w-[82%] bg-white shadow-2xl flex flex-col p-6">
            <div className="flex items-center justify-between mb-8">
              <LangoLogo size={28} />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 -mr-2 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map(l => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                  className="py-3 px-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-lango-primary transition-colors">
                  {l.label}
                </a>
              ))}
              <a href="/demo" className="py-3 px-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-lango-primary transition-colors">Try the live demo</a>
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary w-full justify-center">Sign in</Link>
              <a href="#cta" onClick={() => setOpen(false)} className="l-btn-amber w-full justify-center">Book a demo</a>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

/** Product visual: the guard dashboard, a WhatsApp alert and a salon checkout, all drawn in HTML. */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] lg:max-w-none" aria-hidden>
      {/* Dashboard window */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0b2238] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
        <div className="px-4 py-2.5 flex items-center gap-3 border-b border-white/5 bg-black/20">
          <div className="flex gap-1.5">
            {['bg-red-400/70','bg-amber-400/70','bg-green-400/70'].map(c => <span key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />)}
          </div>
          <span className="flex-1 flex justify-center">
            <span className="text-[11px] text-gray-400 bg-white/5 rounded px-3 py-0.5 font-mono">lango · Main Gate</span>
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-400">Sunrise Gardens · Day shift</p>
              <p className="text-sm font-semibold text-white">Good morning, Officer Waweru</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 l-pulse" /> ON SHIFT
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[{ n: '18', l: 'Visitors today', c: 'text-blue-300' },{ n: '4', l: 'Inside now', c: 'text-green-300' },{ n: '2', l: 'Deliveries', c: 'text-amber-300' }].map(({n,l,c})=>(
              <div key={l} className="bg-white/[0.04] border border-white/5 rounded-xl p-3">
                <p className={`text-2xl font-bold font-display ${c}`}>{n}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <div className="bg-white/[0.04] border border-white/5 rounded-xl p-3.5 space-y-3">
            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">Live activity</p>
            {[
              { icon: UserPlus, c: 'text-green-300 bg-green-400/10', t: 'Visitor checked in', s: 'Unit A-204 · Work visit', time: '2m' },
              { icon: Package,  c: 'text-blue-300 bg-blue-400/10',   t: 'Delivery collected', s: 'Unit B-103 · Jumia',     time: '18m' },
              { icon: Clock,    c: 'text-red-300 bg-red-400/10',     t: 'Incident logged',    s: 'Main Gate · Resolved',    time: '1h' },
            ].map(({icon: I,c,t,s,time})=>(
              <div key={t} className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c}`}><I className="w-3.5 h-3.5" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-white/85 truncate">{t}</p>
                  <p className="text-[10px] text-gray-400 truncate">{s}</p>
                </div>
                <span className="text-[10px] text-gray-500 shrink-0 tabular-nums">{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp alert */}
      <div className="l-float absolute -left-4 sm:-left-10 -bottom-14 w-64 rounded-2xl bg-white p-3.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center"><MessageCircle className="w-3.5 h-3.5 text-white" /></span>
          <p className="text-[11px] font-semibold text-gray-900">WhatsApp · Lango</p>
          <span className="ml-auto text-[10px] text-gray-400">now</span>
        </div>
        <p className="text-[12px] text-gray-700 leading-snug">Hi Mary, <b>Peter Kamau</b> is at the Main Gate to visit A-204. He has been checked in.</p>
      </div>

      {/* Salon checkout */}
      <div className="l-float-2 absolute -right-3 sm:-right-6 -top-6 w-56 rounded-2xl bg-white p-3.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><Scissors className="w-3.5 h-3.5 text-amber-600" /></span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-900">Checkout · Lush Studio</p>
            <p className="text-[10px] text-gray-500">Braids · Faith N.</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[13px] font-bold text-gray-900 font-display">KES 3,500</span>
          <span className="text-[10px] font-semibold text-green-700 bg-green-50 ring-1 ring-inset ring-green-600/20 px-2 py-0.5 rounded-full">M-Pesa ✓</span>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-lango-dark pt-16">
      <div className="absolute inset-0 l-hero-grid opacity-60" aria-hidden />
      <div className="absolute inset-0 l-hero-glow" aria-hidden />

      <div className="relative l-container pt-14 pb-24 lg:pt-24 lg:pb-32 grid lg:grid-cols-[1.05fr_1fr] gap-16 lg:gap-12 items-center">
        <div>
          <div className="l-anim-1 inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase bg-white/[0.06] border border-white/10 text-white/80 px-3 py-1.5 rounded-full mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-lango-amber l-pulse" />
            Built in Kenya, for Kenyan businesses
          </div>

          <h1 className="l-anim-2 font-display text-[2.6rem] sm:text-5xl lg:text-[3.6rem] font-bold text-white leading-[1.04] tracking-tight">
            Run your gate and your salon <span className="text-lango-amber">without the paperwork.</span>
          </h1>

          <p className="l-anim-3 mt-6 text-lg text-slate-300 leading-relaxed max-w-xl">
            Lango replaces the gate logbook and the salon notebook with one simple system. Every visitor, delivery, client and payment is recorded, and the right people are alerted on WhatsApp.
          </p>

          <div className="l-anim-4 mt-9 flex flex-wrap gap-3">
            <a href="#cta" className="l-btn-amber">
              Book a free demo <ArrowRight className="w-4 h-4" />
            </a>
            <a href="/demo" className="l-btn-ghost">
              <PlayCircle className="w-4 h-4" /> Try it yourself
            </a>
          </div>

          <ul className="l-anim-5 mt-10 grid grid-cols-2 gap-x-6 gap-y-3 max-w-md text-sm text-slate-300">
            {['Live in 24 hours', 'No app for residents', 'Works on any smartphone', 'Priced in KES, no lock-in'].map(t => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-lango-amber shrink-0" /> {t}</li>
            ))}
          </ul>
        </div>

        <div className="l-anim-6 px-4 sm:px-8 lg:px-0">
          <HeroVisual />
        </div>
      </div>
    </section>
  )
}

// ── Facts strip ───────────────────────────────────────────────────────────────

function Facts() {
  return (
    <section className="bg-white border-b border-gray-100">
      <div className="l-container py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { icon: Zap,           n: 'Under 60s', l: 'to check in a visitor with ID and photo' },
          { icon: MessageCircle, n: 'Instant',   l: 'WhatsApp alert to the resident' },
          { icon: Rocket,        n: '24 hours',  l: 'from first call to a live gate' },
          { icon: Lock,          n: 'You decide', l: 'who sees client numbers and revenue' },
        ].map(({ icon: Icon, n, l }) => (
          <div key={n} className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-lango-light text-lango-primary flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
            <div>
              <p className="font-display text-lg font-bold text-lango-dark leading-tight">{n}</p>
              <p className="text-sm text-gray-500 leading-snug mt-0.5">{l}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Problem ───────────────────────────────────────────────────────────────────

function Problem() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="l-container grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="l-overline">The problem</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight leading-tight">
            Most Kenyan businesses still run on paper, WhatsApp and guesswork.
          </h2>
          <p className="mt-5 text-gray-600 leading-relaxed">
            A torn logbook at the gate. A provider who left and took all the client contacts. A payment made in cash with no record. A complaint that was never followed up.
          </p>
          <p className="mt-3 text-gray-600 leading-relaxed">
            These aren't small problems. They are security gaps, revenue leaks and liability risks, and Lango exists to fix them.
          </p>
        </div>

        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-3 sm:p-4 space-y-2.5">
          {[
            { before: 'Paper visitor logbook',      after: 'Digital record with photo and ID' },
            { before: 'Group WhatsApp for alerts',  after: 'A direct alert to the right resident' },
            { before: 'Provider keeps client list', after: 'Clients stay with the salon' },
            { before: 'Cash with no receipt',       after: 'M-Pesa code recorded at checkout' },
          ].map(({ before, after }) => (
            <div key={before} className="grid sm:grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3.5 shadow-sm">
              <p className="text-xs sm:text-sm text-gray-400 line-through decoration-red-300">{before}</p>
              <ArrowRight className="hidden sm:block w-4 h-4 text-gray-300" />
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />{after}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Products overview ─────────────────────────────────────────────────────────

function ProductsOverview() {
  const products = [
    {
      href: '#gate', icon: Building2, tone: 'blue' as const,
      name: 'Gate & Visitor Management', who: 'For apartments, estates and offices',
      body: 'Replace the paper logbook with a live digital system. Log every visitor, alert tenants on WhatsApp, track deliveries and manage incidents from one dashboard.',
      points: ['Visitor check-in with photo and ID', 'WhatsApp tenant alerts', 'Delivery and incident tracking', 'Guard shifts and handovers'],
    },
    {
      href: '#salon', icon: Scissors, tone: 'amber' as const,
      name: 'Salon Management', who: 'For salons with staff and branches',
      body: 'Keep client records with the salon, not the provider. Control what each staff member can see, record every M-Pesa payment and track revenue by provider.',
      points: ['Client and service records', 'Per-person staff permissions', 'M-Pesa payment recording', 'Provider performance reports'],
    },
  ]
  return (
    <section className="bg-gray-50 py-20 lg:py-28">
      <div className="l-container">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <span className="l-overline">Two products, one platform</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
            Pick the part of your business you want to fix first.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {products.map(p => {
            const blue = p.tone === 'blue'
            return (
              <a key={p.name} href={p.href} className="group l-feature-card p-8 lg:p-10 flex flex-col">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${blue ? 'bg-lango-primary/10 text-lango-primary' : 'bg-lango-amber/15 text-amber-600'}`}>
                  <p.icon className="w-6 h-6" />
                </div>
                <p className="font-display text-xl font-bold text-lango-dark">{p.name}</p>
                <p className="text-sm text-gray-500 mt-1">{p.who}</p>
                <p className="mt-5 text-gray-600 leading-relaxed">{p.body}</p>
                <ul className="mt-6 space-y-2.5 flex-1">
                  {p.points.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${blue ? 'text-lango-primary' : 'text-amber-500'}`} /> {f}
                    </li>
                  ))}
                </ul>
                <span className={`mt-8 inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-3 transition-all ${blue ? 'text-lango-primary' : 'text-amber-600'}`}>
                  See how it works <ArrowRight className="w-4 h-4" />
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Feature grid (shared by gate and salon) ─────────────────────────────────────

function FeatureGrid({ items, tone }: { items: { icon: React.ElementType; title: string; desc: string }[]; tone: 'blue' | 'amber' }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
      {items.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="flex gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone === 'blue' ? 'bg-lango-light text-lango-primary' : 'bg-amber-50 text-amber-600'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Gate Section ──────────────────────────────────────────────────────────────

const GATE_FEATURES = [
  { icon: UserPlus,       title: 'Visitor check-in',       desc: 'Capture ID, photo and purpose in under 60 seconds. A full audit trail for every person who enters.' },
  { icon: Bell,           title: 'WhatsApp tenant alerts',  desc: 'An instant message to the resident the moment their visitor or delivery arrives. No app to download.' },
  { icon: Package,        title: 'Delivery tracking',       desc: 'Log rider details, notify recipients and record collection. Parcels stop going missing.' },
  { icon: LayoutDashboard,title: 'Live dashboard',          desc: 'See everyone on your property right now. Filter by block, unit or visitor type.' },
  { icon: Clock,          title: 'Incidents and shifts',    desc: 'Guards start and end shifts, log incidents with timestamps and hand over notes to the next shift.' },
  { icon: BarChart3,      title: 'Reports',                 desc: 'Monthly summaries, shift records and visitor history, ready to export.' },
]

function GateSection() {
  return (
    <section id="gate" className="bg-white py-20 lg:py-28 scroll-mt-16">
      <div className="l-container">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center mb-20">
          <div>
            <span className="l-overline">Gate & Visitor Management</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              Your gate runs on paper. It shouldn't.
            </h2>
            <p className="mt-5 text-gray-600 leading-relaxed">
              Every apartment block, gated estate and office has one weak point: the gate. A paper logbook can't tell you who is inside right now, alert a tenant in real time, or prove what happened when something goes wrong.
            </p>
            <p className="mt-3 text-gray-600 leading-relaxed">
              Lango gives your security team a digital gate book that works on any phone or tablet. No special hardware, and nothing for residents to install.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#cta" className="l-btn-primary">Book a free setup call</a>
              <a href="/demo" className="l-btn-light"><PlayCircle className="w-4 h-4" /> Try the gate demo</a>
            </div>
          </div>

          {/* Register-a-visitor mockup */}
          <div className="relative" aria-hidden>
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-50 to-transparent" />
            <div className="relative rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              <div className="bg-lango-dark px-5 py-4">
                <p className="text-[11px] text-white/50">Register a guest · Step 2 of 3</p>
                <p className="text-white font-semibold mt-0.5">Personal visit</p>
                <div className="mt-3 h-1.5 rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-lango-amber" /></div>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3.5">
                {[['Full name', 'Peter Kamau'], ['Phone', '0712 345 678'], ['ID number', '•••• 4821'], ['Visiting', 'A-204 · Mary W.']].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-[11px] font-medium text-gray-500 mb-1">{l}</p>
                    <div className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900">{v}</div>
                  </div>
                ))}
                <div className="col-span-2 flex items-center gap-3 rounded-xl bg-green-50 ring-1 ring-inset ring-green-600/15 px-3.5 py-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800">ID scanned. Name and number filled in automatically.</p>
                </div>
                <div className="col-span-2 flex justify-end gap-2 pt-1">
                  <span className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600">Back</span>
                  <span className="px-4 py-2 rounded-lg bg-lango-primary text-sm font-medium text-white">Review &amp; register</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FeatureGrid items={GATE_FEATURES} tone="blue" />
      </div>
    </section>
  )
}

// ── Salon Section ─────────────────────────────────────────────────────────────

const SALON_FEATURES = [
  { icon: Users,      title: 'Client records',             desc: "Every client's services, provider and history, stored with the salon, not the provider." },
  { icon: ShieldCheck,title: 'Staff permissions',          desc: 'Set access per person. A provider sees their own clients only. Phone numbers, payments and reports stay protected.' },
  { icon: Calendar,   title: 'Reception workflow',         desc: 'Reception registers clients and assigns providers. Providers see their queue on their own phone.' },
  { icon: CreditCard, title: 'M-Pesa checkout',            desc: 'Record the M-Pesa confirmation code at checkout, with full payment history by client and provider.' },
  { icon: Building2,  title: 'Multi-branch',               desc: 'Run more than one branch under one owner account.' },
  { icon: BarChart3,  title: 'Revenue reports',            desc: 'Revenue by service and provider, visible only to the owner.' },
]

function SalonSection() {
  return (
    <section id="salon" className="bg-[#fffaf0] py-20 lg:py-28 scroll-mt-16">
      <div className="l-container">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center mb-20">
          {/* Permissions mockup */}
          <div className="order-2 lg:order-1 rounded-2xl border border-amber-100 bg-white shadow-xl overflow-hidden" aria-hidden>
            <div className="px-5 py-4 bg-lango-dark flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-sm font-semibold">JM</span>
              <div>
                <p className="text-[11px] text-white/50">Staff permissions · Glam Hub Salon</p>
                <p className="text-white font-semibold">Jane Mwangi, Hair Stylist</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { group: 'Client data', rows: [['Client name', true], ['Service and visit history', true], ['Phone number', false]] },
                { group: 'Money',       rows: [['Service prices', false], ['Payment history', false], ['Revenue reports', false]] },
              ].map(({ group, rows }) => (
                <div key={group} className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
                  {rows.map(([label, on]) => (
                    <div key={label as string} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700">{label}</span>
                      <span className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${on ? 'bg-green-500' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="px-5 py-3 bg-gray-50 flex items-center gap-2 text-xs text-gray-500">
                <Lock className="w-3.5 h-3.5" /> Set by the owner and enforced on the server
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="l-overline" style={{ color: '#d97706' }}>Salon Management</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              Run your salon. Keep your clients.
            </h2>
            <p className="mt-5 text-gray-600 leading-relaxed">
              When a provider leaves, they should leave with their skills, not your client list. Lango keeps every client record, service and contact detail inside the salon, protected by permissions only the owner controls.
            </p>
            <p className="mt-3 text-gray-600 leading-relaxed">
              Each staff member sees exactly what they need to do their job, and every change is logged.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#cta" className="l-btn-amber">Start a 30-day free trial</a>
              <a href="#pricing" className="l-btn-light">See salon pricing</a>
            </div>
          </div>
        </div>

        <FeatureGrid items={SALON_FEATURES} tone="amber" />
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { icon: PhoneCall, title: 'Book a call',            body: 'Tell us about your property or salon. We answer within one business day.' },
    { icon: Settings2, title: 'We set everything up',   body: 'We add your blocks, units, tenants or staff and train your guards or reception team.' },
    { icon: Rocket,    title: 'Go live',                body: 'Your team logs in on the phones they already have. Most gates are live within 24 hours.' },
  ]
  return (
    <section id="how" className="bg-gray-50 py-20 lg:py-28 scroll-mt-16">
      <div className="l-container">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="l-overline">How it works</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">Live in three simple steps</h2>
          <p className="mt-4 text-gray-600">No technical skills needed. We do the setup with you.</p>
        </div>
        <ol className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
              <span className="absolute top-6 right-6 font-display text-5xl font-bold text-gray-100 select-none">{i + 1}</span>
              <span className="w-11 h-11 rounded-xl bg-lango-dark text-white flex items-center justify-center"><s.icon className="w-5 h-5" /></span>
              <h3 className="mt-5 font-display text-lg font-semibold text-lango-dark">{s.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  { q: 'Do residents need to install an app?', a: 'No. Residents get alerts on WhatsApp. Only your guards, caretaker and manager sign in to Lango, on any smartphone, tablet or computer.' },
  { q: 'What hardware do we need at the gate?', a: 'Just a smartphone or tablet with a camera and internet. The camera is used to photograph visitor IDs, which fills in their details automatically.' },
  { q: 'How long does setup take?', a: 'Most gates are live within 24 hours of the first call. We add your blocks, units and tenants and show your team how to use it.' },
  { q: 'Who can see client phone numbers and revenue in the salon?', a: 'Only the people you allow. The owner sets permissions per staff member, and they are enforced on the server, so a provider cannot get around them.' },
  { q: 'Is there a free trial or a contract?', a: 'Both products come with a free trial (30 days for salons). Plans are monthly in Kenya Shillings with no lock-in.' },
  { q: 'Can I manage more than one property or branch?', a: 'Yes. The larger gate plans cover multiple blocks and properties, and salon plans cover multiple branches under one owner account.' },
]

function Faq() {
  return (
    <section id="faq" className="bg-gray-50 py-20 lg:py-28 scroll-mt-16">
      <div className="l-container grid lg:grid-cols-[1fr_1.6fr] gap-12">
        <div>
          <span className="l-overline">FAQ</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">Questions we hear a lot</h2>
          <p className="mt-4 text-gray-600">Something else on your mind? <a href="#cta" className="font-semibold text-lango-primary hover:underline">Ask us directly</a>.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map(f => (
            <details key={f.q} className="l-faq group rounded-2xl bg-white border border-gray-200 px-5 open:shadow-sm">
              <summary className="flex items-center justify-between gap-4 py-4 font-semibold text-gray-900">
                {f.q}
                <Plus className="l-faq-icon w-5 h-5 text-gray-400 shrink-0" />
              </summary>
              <p className="pb-5 -mt-1 text-gray-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

const SALON_PLANS = [
  { name: 'Starter', price: 3500, popular: false, features: ['1 branch', 'Up to 5 staff', 'Client records', 'Basic reports', '30-day free trial'] },
  { name: 'Grow',    price: 7500, popular: true,  features: ['Up to 3 branches', 'Unlimited staff', 'Full permissions', 'Revenue reports', 'M-Pesa recording', '30-day free trial'] },
  { name: 'Scale',   price: 15000,popular: false, features: ['Unlimited branches', 'Unlimited staff', 'All Grow features', 'Priority support', 'Founding partner rate'] },
]

function Pricing() {
  const [tab, setTab] = useState<'gate' | 'salon'>('gate')
  const gatePlans = Object.values(SUBSCRIPTION_PLANS)

  return (
    <section id="pricing" className="bg-white py-20 lg:py-28 scroll-mt-16">
      <div className="l-container">
        <div className="text-center mb-12">
          <span className="l-overline">Simple, honest pricing</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
            No hidden fees. No lock-in.
          </h2>
          <p className="mt-4 text-gray-600 max-w-lg mx-auto leading-relaxed">
            Both products come with a free trial. Choose the plan that fits your property or salon.
          </p>

          {/* Tab switcher */}
          <div className="mt-8 inline-flex items-center bg-gray-100 rounded-xl p-1 gap-1" role="tablist">
            <button onClick={() => setTab('gate')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'gate' ? 'bg-lango-dark text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Building2 className="w-4 h-4" /> Gate Management
            </button>
            <button onClick={() => setTab('salon')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'salon' ? 'bg-lango-dark text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Scissors className="w-4 h-4" /> Salon
            </button>
          </div>
        </div>

        {tab === 'gate' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch pt-4">
            {gatePlans.map((p) => {
              const popular = p.planId === 'MEDIUM'
              return (
                <div key={p.planId} className={`rounded-2xl p-6 flex flex-col relative border ${popular ? 'l-plan-popular lg:-my-3 lg:py-9' : 'bg-white border-gray-200 shadow-sm'}`}>
                  {popular && (
                    <div className="absolute -top-4 inset-x-0 flex justify-center">
                      <span className="text-[11px] font-bold text-lango-dark bg-lango-amber px-3 py-1 rounded-full uppercase">Most Popular</span>
                    </div>
                  )}
                  <p className={`text-sm font-bold font-display mb-1 ${popular ? 'text-white/70' : 'text-gray-500'}`}>{p.name}</p>
                  <p className={`text-3xl font-bold font-display ${popular ? 'text-white' : 'text-lango-dark'}`}>
                    KES {p.monthlyPrice.toLocaleString()}
                  </p>
                  <p className={`text-[11px] mt-1 mb-6 ${popular ? 'text-white/60' : 'text-gray-400'}`}>
                    per month · up to {p.maxUnits === 99999 ? 'unlimited' : p.maxUnits} units
                  </p>
                  <ul className="flex-1 space-y-2.5 mb-7">
                    {p.features.map(f => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm ${popular ? 'text-white/75' : 'text-gray-600'}`}>
                        <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${popular ? 'text-lango-amber' : 'text-green-500'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href="#cta" className={`block text-center text-sm font-semibold rounded-xl py-2.5 transition-all ${popular ? 'bg-lango-amber text-lango-dark hover:bg-amber-400' : 'border border-lango-primary text-lango-primary hover:bg-lango-primary hover:text-white'}`}>
                    Get Access
                  </a>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'salon' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto items-stretch pt-4">
            {SALON_PLANS.map(p => (
              <div key={p.name} className={`rounded-2xl p-6 flex flex-col relative border ${p.popular ? 'l-plan-popular lg:-my-3 lg:py-9' : 'bg-white border-gray-200 shadow-sm'}`}>
                {p.popular && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="text-[11px] font-bold text-lango-dark bg-lango-amber px-3 py-1 rounded-full uppercase">Most Popular</span>
                  </div>
                )}
                <p className={`text-sm font-bold font-display mb-1 ${p.popular ? 'text-white/70' : 'text-gray-500'}`}>{p.name}</p>
                <p className={`text-3xl font-bold font-display ${p.popular ? 'text-white' : 'text-lango-dark'}`}>
                  KES {p.price.toLocaleString()}
                </p>
                <p className={`text-[11px] mt-1 mb-6 ${p.popular ? 'text-white/60' : 'text-gray-400'}`}>per month</p>
                <ul className="flex-1 space-y-2.5 mb-7">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-start gap-2.5 text-sm ${p.popular ? 'text-white/75' : 'text-gray-600'}`}>
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${p.popular ? 'text-lango-amber' : 'text-green-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="#cta" className={`block text-center text-sm font-semibold rounded-xl py-2.5 transition-all ${p.popular ? 'bg-lango-amber text-lango-dark hover:bg-amber-400' : 'border border-lango-amber text-lango-amber hover:bg-lango-amber hover:text-lango-dark'}`}>
                  Start Free Trial
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ── Kenya ─────────────────────────────────────────────────────────────────────

function Kenya() {
  return (
    <section className="bg-lango-dark py-20 lg:py-28">
      <div className="l-container">
        <div className="text-center mb-12">
          <span className="l-overline" style={{ color: '#f59e0b' }}>Built for Kenya</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Designed for how Kenyan businesses actually operate.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: Coins,       color: 'text-lango-amber bg-lango-amber/15', title: 'KES pricing',       body: 'All amounts in Kenya Shillings.' },
            { icon: CreditCard,  color: 'text-green-400 bg-green-400/10',     title: 'M-Pesa',           body: 'Record Mpesa codes at checkout.' },
            { icon: Building2,   color: 'text-blue-400 bg-blue-400/10',       title: 'Multi-branch',     body: 'One account, multiple locations.' },
            { icon: Smartphone,  color: 'text-purple-400 bg-purple-400/10',   title: 'Mobile-first',     body: 'Works on any basic smartphone.' },
            { icon: Lock,        color: 'text-red-400 bg-red-400/10',         title: 'Owner-controlled', body: 'You decide who sees what.' },
            { icon: MessageCircle,color: 'text-sky-400 bg-sky-400/10',        title: 'WhatsApp alerts',  body: 'No app needed for residents.' },
          ].map(({ icon: Icon, color, title, body }) => (
            <div key={title} className="bg-white/5 border border-white/8 rounded-2xl p-5 text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-white mb-1">{title}</p>
              <p className="text-xs text-white/60 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA / Lead form ───────────────────────────────────────────────────────────

function Cta() {
  const [form, setForm]     = useState({ name: '', business: '', phone: '', product: '', message: '' })
  const [submitting, setSub] = useState(false)
  const [done, setDone]     = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone) return
    setSub(true)
    try {
      await addDoc(collection(db, 'leads'), {
        name:         form.name.trim(),
        propertyName: form.business.trim() || 'Not specified',
        propertyType: form.product || 'General',
        phone:        form.phone.trim(),
        ...(form.message.trim() ? { message: form.message.trim() } : {}),
        source:       'LANDING_FORM',
        status:       'NEW',
        createdAt:    serverTimestamp(),
      })
      setDone(true)
      toast.success("We'll be in touch within one business day.")
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSub(false)
    }
  }

  return (
    <section id="cta" className="bg-white py-20 lg:py-28 scroll-mt-16">
      <div className="l-container">
        <div className="rounded-3xl bg-lango-dark overflow-hidden relative">
          <div className="absolute inset-0 l-hero-grid opacity-50" aria-hidden />
          <div className="absolute -left-28 -top-28 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)' }} aria-hidden />
          <div className="absolute -right-28 -bottom-28 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 65%)' }} aria-hidden />

          <div className="relative grid lg:grid-cols-2 gap-12 p-8 sm:p-12 lg:p-16">
            <div className="flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-lango-amber mb-5">
                <span className="w-5 h-px bg-lango-amber/40" /> Get started today
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
                See Lango running on your own property or salon.
              </h2>
              <p className="mt-4 text-white/70 leading-relaxed">
                Whether you manage a gated estate or a growing salon, we'll set you up and get you live. No technical experience needed.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  { icon: Building2, text: 'Gate management — live within 24 hours' },
                  { icon: Scissors,  text: 'Salon management — 30-day free trial' },
                  { icon: Phone,     text: 'We call you to confirm and set everything up' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-white/80">
                    <div className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-lango-amber" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-xs text-white/50">No credit card required · No commitment · We'll confirm within one business day</p>
            </div>

            <div>
              {done ? (
                <div className="bg-white/10 border border-white/15 rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-14 h-14 text-green-400 mb-4" />
                  <p className="text-xl font-bold text-white font-display">Request received!</p>
                  <p className="text-white/55 mt-2 max-w-xs">We'll call or message you within one business day to get you set up.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="bg-white rounded-2xl p-6 sm:p-7 space-y-3.5 shadow-2xl">
                  <p className="font-display text-lg font-semibold text-lango-dark">Book a free demo</p>
                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div>
                      <input className="input" placeholder="Your name *" aria-label="Your name"
                        value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div>
                      <input className="input" placeholder="Phone number *" type="tel" aria-label="Phone number"
                        value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
                    </div>
                  </div>
                  <input className="input" placeholder="Business / property name" aria-label="Business or property name"
                    value={form.business} onChange={e => setForm(p => ({ ...p, business: e.target.value }))} />
                  <select className="input text-gray-700" aria-label="Product you're interested in"
                    value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))}>
                    <option value="">I'm interested in… (optional)</option>
                    <option value="Gate Management">Gate & Visitor Management</option>
                    <option value="Salon">Salon Management</option>
                    <option value="Both">Both products</option>
                  </select>
                  <textarea className="input resize-none" rows={3} placeholder="Anything else we should know?" aria-label="Message"
                    value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
                  <button type="submit" disabled={submitting}
                    className="btn-primary w-full justify-center py-3 text-base">
                    {submitting ? 'Sending…' : <><span>Book Free Consultation</span> <ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <p className="text-center text-xs text-gray-500">Free, no-obligation call with our team</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer id="contact" className="bg-lango-dark border-t border-white/7">
      <div className="l-container pt-16 pb-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          <div className="lg:col-span-2">
            <LangoLogo size={30} tone="light" className="mb-5" />
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Operations software for Kenyan businesses. Gate management for properties. Salon management for salons.
            </p>
            <div className="mt-7">
              <a href="#cta" className="inline-flex items-center gap-1.5 text-sm font-semibold text-lango-amber hover:text-amber-300 transition-colors">
                Book a free consultation →
              </a>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-5">Products</p>
            <div className="space-y-3 text-sm text-white/65">
              <a href="#gate"    className="flex items-center gap-2 hover:text-white transition-colors"><Building2 className="w-3.5 h-3.5" /> Gate Management</a>
              <a href="#salon"   className="flex items-center gap-2 hover:text-white transition-colors"><Scissors  className="w-3.5 h-3.5" /> Salon Management</a>
              <a href="#pricing" className="block hover:text-white transition-colors">Pricing</a>
              <a href="/demo"    className="block hover:text-white transition-colors">Explore Demo</a>
              <Link to="/login"  className="block hover:text-white transition-colors">Sign In</Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-5">Contact</p>
            <div className="space-y-3.5 text-sm text-white/65">
              <a href="tel:+254700000000" className="flex items-center gap-3 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5 text-white/40" /> +254 700 000 000
              </a>
              <a href="mailto:hello@lango.co.ke" className="flex items-center gap-3 hover:text-white transition-colors">
                <Mail className="w-3.5 h-3.5 text-white/40" /> hello@lango.co.ke
              </a>
              <p className="flex items-center gap-3">
                <MapPin className="w-3.5 h-3.5 text-white/40" /> Nairobi, Kenya
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/7 pt-8 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Lango. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <Facts />
        <Problem />
        <ProductsOverview />
        <GateSection />
        <SalonSection />
        <HowItWorks />
        <Pricing />
        <Kenya />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
