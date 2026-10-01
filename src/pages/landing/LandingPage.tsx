import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Menu, X, Building2, Scissors, ShieldCheck, Users, BarChart3,
  CheckCircle2, Calendar, CreditCard, Package, Bell, Clock,
  Smartphone, Coins, Lock, KeyRound, ArrowRight,
  Phone, Mail, MapPin, UserPlus, MessageCircle, LayoutDashboard,
} from 'lucide-react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import toast from 'react-hot-toast'
import { SUBSCRIPTION_PLANS } from '../../types'
import './landing.css'

// ── Nav ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '#gate',    label: 'Gate Management' },
  { href: '#salon',   label: 'Salon' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#contact', label: 'Contact' },
]

function Nav() {
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-40 l-nav-transition ${scrolled ? 'l-nav-scrolled' : ''}`}>
        <div className="px-6 sm:px-10 lg:px-16 xl:px-24 h-16 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${scrolled ? 'bg-lango-dark' : 'bg-white/12'}`}>
              <span className="font-display font-bold text-sm text-white">L</span>
            </div>
            <span className={`font-display font-bold tracking-wide text-base transition-colors ${scrolled ? 'text-lango-dark' : 'text-white'}`}>LANGO</span>
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
            <Link to="/login"
              className={`text-sm font-medium font-dm transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/65 hover:text-white'}`}>
              Sign In
            </Link>
            <a href="#cta"
              className={`text-sm font-semibold font-dm px-4 py-2 rounded-lg transition-all ${scrolled ? 'bg-lango-amber text-lango-dark hover:bg-amber-400' : 'bg-lango-amber text-lango-dark hover:bg-amber-400'}`}>
              Get Started
            </a>
          </div>

          <button className={`md:hidden p-2 rounded-lg ${scrolled ? 'text-gray-600' : 'text-white/80'}`}
            onClick={() => setOpen(true)} aria-label="Open menu">
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
                <div className="w-8 h-8 rounded-lg bg-lango-dark flex items-center justify-center">
                  <span className="font-display font-bold text-sm text-white">L</span>
                </div>
                <span className="font-display font-bold text-lango-dark">LANGO</span>
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
              <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary w-full justify-center">Sign In</Link>
              <a href="#cta" onClick={() => setOpen(false)} className="l-btn-amber w-full justify-center">Get Started</a>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-lango-dark pt-16">
      <div className="absolute inset-0 l-hero-grid" aria-hidden />
      <div className="absolute -left-64 top-1/3 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 65%)' }} aria-hidden />
      <div className="absolute -right-48 bottom-10 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 65%)' }} aria-hidden />

      <div className="relative px-6 sm:px-10 lg:px-16 xl:px-24 pt-14 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-2xl">
          <div className="l-anim-1 inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase bg-lango-amber/10 border border-lango-amber/25 text-lango-amber px-3 py-1.5 rounded-full font-dm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-lango-amber l-pulse" />
            Built for Kenyan Businesses
          </div>

          <h1 className="l-anim-2 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight">
            Manage your property.
            <br />
            <span className="text-lango-amber">Run your salon.</span>
            <br />
            Stay in control.
          </h1>

          <p className="l-anim-3 mt-6 text-lg text-gray-300 leading-relaxed font-dm max-w-xl">
            Lango is an operations platform built for Kenyan businesses. Whether you manage an apartment complex or a growing salon, Lango gives you the tools to run it properly — with real records, real accountability, and real control.
          </p>

          <div className="l-anim-4 mt-8 flex flex-wrap gap-3">
            <a href="#gate" className="l-btn-primary flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Gate Management
            </a>
            <a href="#salon" className="l-btn-amber flex items-center gap-2">
              <Scissors className="w-4 h-4" /> Salon Management
            </a>
          </div>
        </div>
      </div>

      <div className="relative l-stat-divider">
        <div className="px-6 sm:px-10 lg:px-16 xl:px-24 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: '500+',  label: 'Properties on Lango' },
            { n: '10K+',  label: 'Visitors logged monthly' },
            { n: '< 24h', label: 'Average setup time' },
            { n: '4.9★',  label: 'Customer rating' },
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

// ── Problem ───────────────────────────────────────────────────────────────────

function Problem() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="l-overline">The problem</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight leading-snug">
              Most Kenyan businesses still run on paper, WhatsApp, and guesswork.
            </h2>
            <p className="mt-5 text-gray-500 font-dm leading-relaxed">
              A torn logbook at the gate. A provider who left and took all the client contacts. A payment made in cash with no record. A complaint that was never followed up.
            </p>
            <p className="mt-3 text-gray-500 font-dm leading-relaxed">
              These aren't small problems — they are security gaps, revenue leaks, and liability risks. Lango exists to fix them.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { before: 'Paper visitor logbook',      after: 'Digital record with photo & ID',  color: 'blue' },
              { before: 'WhatsApp for tenant alerts', after: 'Instant structured notification',  color: 'green' },
              { before: 'Provider keeps client list', after: 'Clients stay with the salon',      color: 'amber' },
              { before: 'Cash with no receipt',       after: 'M-Pesa code recorded & tracked',  color: 'purple' },
            ].map(({ before, after, color }) => {
              const colours: Record<string, string> = {
                blue:   'border-blue-100 bg-blue-50/50',
                green:  'border-green-100 bg-green-50/50',
                amber:  'border-amber-100 bg-amber-50/50',
                purple: 'border-purple-100 bg-purple-50/50',
              }
              const dot: Record<string, string> = {
                blue: 'bg-blue-500', green: 'bg-green-500', amber: 'bg-lango-amber', purple: 'bg-purple-500',
              }
              return (
                <div key={before} className={`rounded-2xl border p-4 ${colours[color]}`}>
                  <p className="text-[11px] text-red-400 font-semibold mb-1 font-dm line-through">{before}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot[color]}`} />
                    <p className="text-xs font-semibold text-gray-800 font-dm">{after}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Products overview ─────────────────────────────────────────────────────────

function ProductsOverview() {
  return (
    <section className="bg-gray-50 py-20 lg:py-28">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="text-center mb-14">
          <span className="l-overline">Two products. One platform.</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
            What does Lango do?
          </h2>
          <p className="mt-4 text-gray-500 font-dm max-w-xl mx-auto leading-relaxed">
            Lango currently has two products — one for property security and visitor management, one for salon operations. Both built for the Kenyan market.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Gate */}
          <a href="#gate" className="group l-feature-card p-8 block">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-lango-primary/10 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-lango-primary" />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-lango-dark">Gate & Visitor Management</p>
                <p className="text-sm text-gray-400 font-dm">For apartments & gated properties</p>
              </div>
            </div>
            <p className="text-gray-500 font-dm leading-relaxed text-sm">
              Replace the paper logbook with a live digital system. Log every visitor, alert tenants via WhatsApp, track deliveries, and manage incidents — all from one dashboard.
            </p>
            <ul className="mt-5 space-y-2">
              {['Visitor check-in with photo & ID', 'WhatsApp tenant alerts', 'Delivery & incident tracking', 'Security reports & shift management'].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600 font-dm">
                  <CheckCircle2 className="w-4 h-4 text-lango-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-lango-primary font-dm group-hover:gap-3 transition-all">
              Explore Gate Management <ArrowRight className="w-4 h-4" />
            </div>
          </a>

          {/* Salon */}
          <a href="#salon" className="group l-feature-card p-8 block">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-lango-amber/10 flex items-center justify-center">
                <Scissors className="w-7 h-7 text-lango-amber" />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-lango-dark">Salon Management</p>
                <p className="text-sm text-gray-400 font-dm">For salons with staff & multiple branches</p>
              </div>
            </div>
            <p className="text-gray-500 font-dm leading-relaxed text-sm">
              Keep client records where they belong — with the salon, not the provider. Manage bookings, control what each staff member can see, and track revenue across multiple branches.
            </p>
            <ul className="mt-5 space-y-2">
              {['Client & service records', 'Per-person staff permissions', 'M-Pesa payment recording', 'Multi-branch management'].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600 font-dm">
                  <CheckCircle2 className="w-4 h-4 text-lango-amber shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-lango-amber font-dm group-hover:gap-3 transition-all">
              Explore Salon Management <ArrowRight className="w-4 h-4" />
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}

// ── Section divider ───────────────────────────────────────────────────────────

function ProductDivider({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className={`py-5 px-6 sm:px-10 lg:px-16 xl:px-24 ${color} flex items-center gap-3`}>
      <Icon className="w-5 h-5" />
      <span className="font-display font-bold text-sm tracking-wide">{label}</span>
    </div>
  )
}

// ── Gate Section ──────────────────────────────────────────────────────────────

const GATE_FEATURES = [
  { icon: UserPlus,       title: 'Visitor check-in',       desc: 'Capture ID, photo and purpose in under 60 seconds. Full audit trail for every person who enters.' },
  { icon: Bell,           title: 'WhatsApp tenant alerts',  desc: 'Instant message to the resident the moment their visitor or delivery arrives. No app to download.' },
  { icon: Package,        title: 'Delivery tracking',       desc: 'Log rider details, notify recipients and record collection. Parcels no longer go missing.' },
  { icon: LayoutDashboard,title: 'Live dashboard',          desc: 'See everyone on your property right now. Filter by block, unit or visitor type.' },
  { icon: Clock,          title: 'Incident reporting',      desc: 'Log and escalate incidents with timestamps. Full accountability, always.' },
  { icon: BarChart3,      title: 'Reports & shift logs',    desc: 'Monthly summaries, guard shift records, and visitor history. PDF or CSV export.' },
]

function GateSection() {
  return (
    <section id="gate" className="bg-white py-20 lg:py-28">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-16">
          <div>
            <span className="l-overline">Gate & Visitor Management</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              Your gate runs on paper. It shouldn't.
            </h2>
            <p className="mt-5 text-gray-500 font-dm leading-relaxed">
              Every apartment block, gated estate, and commercial property has one vulnerability: the gate. A paper logbook can't tell you who's inside right now, alert a tenant in real time, or prove accountability when something goes wrong.
            </p>
            <p className="mt-3 text-gray-500 font-dm leading-relaxed">
              Lango Gate gives your security team a digital system that works on any phone — no expensive hardware, no app installation for residents.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#cta" className="l-btn-primary">Book Free Setup Call</a>
              <a href="/demo" className="l-btn-ghost">Try the Demo</a>
            </div>
          </div>

          {/* Mockup */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl"
            style={{ background: '#0f2a43' }}>
            <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5" style={{ background: 'rgba(0,0,0,0.22)' }}>
              <div className="flex gap-1.5">
                {['bg-red-400/70','bg-amber-400/70','bg-green-400/70'].map(c => <span key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />)}
              </div>
              <span className="flex-1 flex justify-center">
                <span className="text-[11px] text-gray-300 bg-white/5 rounded px-3 py-0.5 font-mono">app.lango.co.ke/gate</span>
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-gray-400 font-dm">Sunrise Gardens · Main Gate</p>
                  <p className="text-sm font-bold text-white">Officer James Waweru</p>
                </div>
                <span className="text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full font-mono l-pulse">● LIVE</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ n: '18', l: 'Visitors today', c: 'text-blue-400' },{ n: '4', l: 'Inside now', c: 'text-green-400' },{ n: '2', l: 'Deliveries', c: 'text-lango-amber' }].map(({n,l,c})=>(
                  <div key={l} className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold font-display ${c}`}>{n}</p>
                    <p className="text-[10px] text-gray-400 font-dm mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-2.5">
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest font-dm">Live Activity</p>
                {[
                  { dot: 'bg-green-500', t: 'Visitor checked in', s: 'Unit A-204 · Work visit', time: '2m ago' },
                  { dot: 'bg-blue-400',  t: 'Delivery collected', s: 'Unit B-103 · Jumia',     time: '18m ago' },
                  { dot: 'bg-red-400',   t: 'Incident logged',    s: 'Main Gate',               time: '1h ago' },
                ].map(({dot,t,s,time})=>(
                  <div key={t} className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-white/80 truncate font-dm">{t}</p>
                      <p className="text-[10px] text-gray-400 truncate font-dm">{s}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 font-mono">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GATE_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="l-feature-card p-6">
              <div className="w-11 h-11 rounded-xl bg-lango-primary/8 border border-lango-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-lango-primary" />
              </div>
              <h3 className="font-display font-bold text-gray-900 text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-gray-500 font-dm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Salon Section ─────────────────────────────────────────────────────────────

const SALON_FEATURES = [
  { icon: Users,      title: 'Client records',             desc: "Every client's services, provider, notes and history — stored securely with the salon, not the provider." },
  { icon: ShieldCheck,title: 'Granular staff permissions', desc: 'Set per-person access. A provider sees their clients only. Phone numbers, payments and reports stay protected.' },
  { icon: Calendar,   title: 'Booking management',         desc: 'Reception creates and manages bookings. Providers see their schedule. Clients can book without an app.' },
  { icon: CreditCard, title: 'M-Pesa checkout',           desc: 'Record M-Pesa confirmation codes at checkout. Full payment history by client, provider, and branch.' },
  { icon: Building2,  title: 'Multi-branch',               desc: 'Open a new branch and connect it under one owner account. Consolidated reporting across all locations.' },
  { icon: BarChart3,  title: 'Revenue reports',            desc: 'Monthly revenue by branch, service type and provider. Visible only to the salon owner.' },
]

function SalonSection() {
  return (
    <section id="salon" className="bg-gray-50 py-20 lg:py-28">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="grid lg:grid-cols-2 gap-16 items-start mb-16">
          {/* Permissions mockup */}
          <div className="card p-0 overflow-hidden order-2 lg:order-1">
            <div className="px-5 py-4 border-b border-gray-50 bg-lango-dark">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wide font-dm">Staff Permissions · Glam Hub Salon</p>
              <p className="text-white font-bold mt-0.5">Jane Mwangi — Hair Stylist</p>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="px-5 py-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 font-dm">Client Data</p>
                {[
                  { label: 'Client name',           on: true },
                  { label: 'Service & visit history',on: true },
                  { label: 'Hair notes & allergies', on: true },
                  { label: 'Phone number',           on: false },
                  { label: 'Email address',          on: false },
                ].map(({ label, on }) => (
                  <div key={label} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-700">{label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${on ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                      {on ? '✓ allowed' : '✗ restricted'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 font-dm">Financial</p>
                {['Service prices', 'Payment history', 'Revenue reports'].map(label => (
                  <div key={label} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-700">{label}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">✗ restricted</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-gray-50/60">
                <p className="text-xs text-gray-400 font-dm italic">Permissions set by owner · enforced on the server</p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="l-overline">Salon Management</span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
              Run your salon. Keep control of your clients.
            </h2>
            <p className="mt-5 text-gray-500 font-dm leading-relaxed">
              When a provider leaves, they should leave with their skills — not your client list. Lango keeps every client record, service history and contact detail within the salon, protected by permissions only the owner controls.
            </p>
            <p className="mt-3 text-gray-500 font-dm leading-relaxed">
              Each staff member sees exactly what they need to do their job, and nothing they don't. Every change is audit-logged.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#cta" className="l-btn-amber">Start Free Trial</a>
              <a href="#pricing" className="l-btn-ghost" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>View Salon Pricing</a>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SALON_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="l-feature-card p-6">
              <div className="w-11 h-11 rounded-xl bg-lango-amber/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-lango-amber" />
              </div>
              <h3 className="font-display font-bold text-gray-900 text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-gray-500 font-dm leading-relaxed">{desc}</p>
            </div>
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
    <section id="pricing" className="bg-white py-20 lg:py-28">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="text-center mb-12">
          <span className="l-overline">Simple, honest pricing</span>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold text-lango-dark tracking-tight">
            No hidden fees. No lock-in.
          </h2>
          <p className="mt-4 text-gray-500 font-dm max-w-lg mx-auto leading-relaxed">
            Both products come with a free trial. Choose the plan that fits your property or salon.
          </p>

          {/* Tab switcher */}
          <div className="mt-8 inline-flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button onClick={() => setTab('gate')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold font-dm transition-all ${
                tab === 'gate' ? 'bg-lango-dark text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Building2 className="w-4 h-4" /> Gate Management
            </button>
            <button onClick={() => setTab('salon')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold font-dm transition-all ${
                tab === 'salon' ? 'bg-lango-dark text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Scissors className="w-4 h-4" /> Salon
            </button>
          </div>
        </div>

        {tab === 'gate' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
            {gatePlans.map((p) => {
              const popular = p.planId === 'MEDIUM'
              return (
                <div key={p.planId} className={`rounded-2xl p-6 flex flex-col relative border ${popular ? 'l-plan-popular' : 'bg-white border-gray-100 shadow-sm'}`}>
                  {popular && (
                    <div className="absolute -top-4 inset-x-0 flex justify-center">
                      <span className="text-[11px] font-bold text-lango-dark bg-lango-amber px-3 py-1 rounded-full font-dm uppercase">Most Popular</span>
                    </div>
                  )}
                  <p className={`text-sm font-bold font-display mb-1 ${popular ? 'text-white/55' : 'text-gray-400'}`}>{p.name}</p>
                  <p className={`text-3xl font-bold font-display ${popular ? 'text-white' : 'text-lango-dark'}`}>
                    KES {p.monthlyPrice.toLocaleString()}
                  </p>
                  <p className={`text-[11px] mt-1 font-dm mb-6 ${popular ? 'text-white/38' : 'text-gray-400'}`}>
                    per month · up to {p.maxUnits === 99999 ? 'unlimited' : p.maxUnits} units
                  </p>
                  <ul className="flex-1 space-y-2.5 mb-7">
                    {p.features.map(f => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm font-dm ${popular ? 'text-white/75' : 'text-gray-600'}`}>
                        <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${popular ? 'text-lango-amber' : 'text-green-500'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href="#cta" className={`block text-center text-sm font-semibold rounded-xl py-2.5 font-dm transition-all ${popular ? 'bg-lango-amber text-lango-dark hover:bg-amber-400' : 'border border-lango-primary text-lango-primary hover:bg-lango-primary hover:text-white'}`}>
                    Get Access
                  </a>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'salon' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {SALON_PLANS.map(p => (
              <div key={p.name} className={`rounded-2xl p-6 flex flex-col relative border ${p.popular ? 'l-plan-popular' : 'bg-white border-gray-100 shadow-sm'}`}>
                {p.popular && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="text-[11px] font-bold text-lango-dark bg-lango-amber px-3 py-1 rounded-full font-dm uppercase">Most Popular</span>
                  </div>
                )}
                <p className={`text-sm font-bold font-display mb-1 ${p.popular ? 'text-white/55' : 'text-gray-400'}`}>{p.name}</p>
                <p className={`text-3xl font-bold font-display ${p.popular ? 'text-white' : 'text-lango-dark'}`}>
                  KES {p.price.toLocaleString()}
                </p>
                <p className={`text-[11px] mt-1 font-dm mb-6 ${p.popular ? 'text-white/38' : 'text-gray-400'}`}>per month</p>
                <ul className="flex-1 space-y-2.5 mb-7">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-start gap-2.5 text-sm font-dm ${p.popular ? 'text-white/75' : 'text-gray-600'}`}>
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${p.popular ? 'text-lango-amber' : 'text-green-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="#cta" className={`block text-center text-sm font-semibold rounded-xl py-2.5 font-dm transition-all ${p.popular ? 'bg-lango-amber text-lango-dark hover:bg-amber-400' : 'border border-lango-amber text-lango-amber hover:bg-lango-amber hover:text-lango-dark'}`}>
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
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="text-center mb-12">
          <span className="l-overline text-lango-amber" style={{ color: '#f59e0b' }}>Built for Kenya</span>
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
              <p className="text-[11px] text-white/45 font-dm leading-relaxed">{body}</p>
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
    <section id="cta" className="bg-gray-50 py-20 lg:py-28">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="rounded-3xl bg-lango-dark overflow-hidden relative">
          <div className="absolute inset-0 l-hero-grid opacity-50" aria-hidden />
          <div className="absolute -left-28 -top-28 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)' }} aria-hidden />
          <div className="absolute -right-28 -bottom-28 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 65%)' }} aria-hidden />

          <div className="relative grid lg:grid-cols-2 gap-12 p-8 sm:p-12 lg:p-16">
            <div className="flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-lango-amber font-dm mb-5">
                <span className="w-5 h-px bg-lango-amber/40" /> Get started today
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
                Ready to bring your business into the 21st century?
              </h2>
              <p className="mt-4 text-white/55 font-dm leading-relaxed">
                Whether you manage a gated estate or a growing salon, we'll set you up and get you live. No technical experience needed.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  { icon: Building2, text: 'Gate management — live within 24 hours' },
                  { icon: Scissors,  text: 'Salon management — 30-day free trial' },
                  { icon: Phone,     text: 'We call you to confirm and set everything up' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-white/65 font-dm">
                    <div className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-white/50" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-xs text-white/22 font-dm">No credit card required · No commitment · We'll confirm within one business day</p>
            </div>

            <div>
              {done ? (
                <div className="bg-white/10 border border-white/15 rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-14 h-14 text-green-400 mb-4" />
                  <p className="text-xl font-bold text-white font-display">Request received!</p>
                  <p className="text-white/55 font-dm mt-2 max-w-xs">We'll call or message you within one business day to get you set up.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="bg-white rounded-2xl p-7 space-y-3.5 shadow-2xl">
                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div>
                      <input className="input" placeholder="Your name *"
                        value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div>
                      <input className="input" placeholder="Phone number *" type="tel"
                        value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
                    </div>
                  </div>
                  <input className="input" placeholder="Business / property name"
                    value={form.business} onChange={e => setForm(p => ({ ...p, business: e.target.value }))} />
                  <select className="input text-gray-700"
                    value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))}>
                    <option value="">I'm interested in… (optional)</option>
                    <option value="Gate Management">Gate & Visitor Management</option>
                    <option value="Salon">Salon Management</option>
                    <option value="Both">Both products</option>
                  </select>
                  <textarea className="input resize-none" rows={3} placeholder="Anything else we should know?"
                    value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
                  <button type="submit" disabled={submitting}
                    className="btn-primary w-full justify-center py-3 text-base">
                    {submitting ? 'Sending…' : <><span>Book Free Consultation</span> <ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <p className="text-center text-xs text-gray-400 font-dm">Free, no-obligation call with our team</p>
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
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24 pt-16 pb-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-sm text-white">L</span>
              </div>
              <span className="font-display font-bold text-white text-base tracking-wide">LANGO</span>
            </div>
            <p className="text-sm text-white/40 font-dm leading-relaxed max-w-xs">
              Operations software for Kenyan businesses. Gate management for properties. Salon management for salons.
            </p>
            <div className="mt-7">
              <a href="#cta" className="inline-flex items-center gap-1.5 text-sm font-semibold text-lango-amber hover:text-amber-300 transition-colors font-dm">
                Book a free consultation →
              </a>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-5 font-dm">Products</p>
            <div className="space-y-3 text-sm text-white/45 font-dm">
              <a href="#gate"    className="flex items-center gap-2 hover:text-white transition-colors"><Building2 className="w-3.5 h-3.5" /> Gate Management</a>
              <a href="#salon"   className="flex items-center gap-2 hover:text-white transition-colors"><Scissors  className="w-3.5 h-3.5" /> Salon Management</a>
              <a href="#pricing" className="block hover:text-white transition-colors">Pricing</a>
              <a href="/demo"    className="block hover:text-white transition-colors">Explore Demo</a>
              <Link to="/login"  className="block hover:text-white transition-colors">Sign In</Link>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-5 font-dm">Contact</p>
            <div className="space-y-3.5 text-sm text-white/45 font-dm">
              <a href="tel:+254700000000" className="flex items-center gap-3 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5 text-white/25" /> +254 700 000 000
              </a>
              <a href="mailto:hello@lango.co.ke" className="flex items-center gap-3 hover:text-white transition-colors">
                <Mail className="w-3.5 h-3.5 text-white/25" /> hello@lango.co.ke
              </a>
              <p className="flex items-center gap-3">
                <MapPin className="w-3.5 h-3.5 text-white/25" /> Nairobi, Kenya
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/7 pt-8 flex flex-col sm:flex-row justify-between gap-3 text-xs text-gray-500 font-dm">
          <p>© 2026 Lango. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
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
        <Problem />
        <ProductsOverview />
        <ProductDivider icon={KeyRound} label="Gate & Visitor Management" color="bg-lango-primary/8 text-lango-primary border-y border-lango-primary/10" />
        <GateSection />
        <ProductDivider icon={Scissors} label="Salon Management" color="bg-lango-amber/8 text-lango-amber border-y border-lango-amber/10" />
        <SalonSection />
        <Pricing />
        <Kenya />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
