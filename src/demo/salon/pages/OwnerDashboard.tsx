import { Link } from 'react-router-dom'
import { Users, Wallet, TrendingUp, Scissors, ArrowRight, Smartphone, Banknote } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SALON_SERVICE_LABELS } from '../../../types'
import { useSalonDemo, fmtKes, initials } from '../store'
import { Kpi } from './parts'

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

const DAY_LABELS = ['Today', 'Yest.', '2d', '3d', '4d', '5d', '6d']

export default function SalonDemoOwnerDashboard() {
  const { salon, clients, services, checkouts, providers } = useSalonDemo()
  const today = checkouts.filter(k => k.day === 0)
  const revenueToday = today.reduce((n, k) => n + k.total, 0)
  const revenueWeek = checkouts.reduce((n, k) => n + k.total, 0)
  const active = clients.filter(c => c.status === 'ACTIVE')
  const week = DAY_LABELS.map((label, day) => ({ label, total: checkouts.filter(k => k.day === day).reduce((n, k) => n + k.total, 0) })).reverse()

  const perProvider = providers.map(p => {
    const mine = services.filter(s => s.providerId === p.id)
    return { ...p, count: mine.length, revenue: mine.reduce((n, s) => n + s.price, 0) }
  }).sort((a, b) => b.revenue - a.revenue)
  const top = Math.max(1, ...perProvider.map(p => p.revenue))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title={`${greeting()}, Grace`} subtitle={`${salon.name} · ${salon.location}`} className="!mb-0"
        actions={<Link to="/demo/salon/owner/reports" className="btn-secondary">View reports</Link>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} tone="bg-blue-50 text-blue-600" label="Clients today" value={clients.length} sub={`${active.length} in the salon now`} />
        <Kpi icon={Wallet} tone="bg-emerald-50 text-emerald-600" label="Revenue today" value={fmtKes(revenueToday)} sub={`${today.length} checkouts`} />
        <Kpi icon={TrendingUp} tone="bg-violet-50 text-violet-600" label="Last 7 days" value={fmtKes(revenueWeek)} sub="Paid checkouts" />
        <Kpi icon={Scissors} tone="bg-amber-50 text-amber-600" label="Services today" value={services.length} sub={`${services.filter(s => !s.done).length} in progress`} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h3 className="section-title mb-0">Revenue this week</h3>
            <span className="text-xs text-gray-400">KES</span>
          </div>
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(v) => fmtKes(Number(v))}
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }} />
                <Bar dataKey="total" name="Revenue" radius={[6, 6, 0, 0]}>
                  {week.map((d, i) => <Cell key={d.label} fill={i === week.length - 1 ? '#2563eb' : '#bfdbfe'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="section-title mb-0">Providers today</h3>
            <Link to="/demo/salon/owner/providers" className="text-xs text-lango-primary hover:underline flex items-center gap-1">All <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {perProvider.map(p => (
              <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-lango-light text-lango-primary text-xs font-semibold flex items-center justify-center shrink-0">{initials(p.name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">{fmtKes(p.revenue)}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-lango-primary" style={{ width: `${(p.revenue / top) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 truncate">{p.count} {p.count === 1 ? 'service' : 'services'} · {p.services.map(s => SALON_SERVICE_LABELS[s]).join(', ')}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="section-title mb-0">Latest checkouts</h3></div>
        <ul className="divide-y divide-gray-100">
          {checkouts.slice(0, 5).map(k => (
            <li key={k.id} className="px-5 py-3 flex items-center gap-3">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${k.method === 'MPESA' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {k.method === 'MPESA' ? <Smartphone className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{k.clientName}</p>
                <p className="text-xs text-gray-500">{k.method === 'MPESA' ? `M-Pesa · ${k.mpesaCode}` : 'Cash'} · {k.timeLabel}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 tabular-nums">{fmtKes(k.total)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
