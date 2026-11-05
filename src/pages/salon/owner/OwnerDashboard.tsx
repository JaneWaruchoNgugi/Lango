import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import { PageHeader } from '../../../components/ui/PageHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { humanize } from '../../../utils/humanize'
import { Users, Wallet, TrendingUp, Scissors, ArrowRight, BarChart3, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import type { SalonClient, SalonCheckout, SalonProvider, SalonService } from '../../../types'
import { SALON_SERVICE_LABELS } from '../../../types'

interface Stats {
  clientsToday: number; clientsWeek: number; clientsMonth: number
  revenueToday: number; revenueWeek: number; revenueMonth: number
  servicesTotal: number
}

function StatCard({ icon: Icon, tone, label, value, sub }: {
  icon: LucideIcon; tone: string; label: string; value: string | number; sub?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

const serviceLabel = (s: string) => SALON_SERVICE_LABELS[s as keyof typeof SALON_SERVICE_LABELS] ?? humanize(s)

export default function OwnerDashboard() {
  const { salonId } = useParams<{ salonId: string }>()
  const [stats, setStats]         = useState<Stats | null>(null)
  const [providers, setProviders] = useState<SalonProvider[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!salonId) return
    const load = async () => {
      const now = new Date()
      const todayStart   = Timestamp.fromDate(startOfDay(now))
      const weekStart    = Timestamp.fromDate(startOfWeek(now, { weekStartsOn: 1 }))
      const monthStart   = Timestamp.fromDate(startOfMonth(now))

      const [clientsSnap, checkoutsSnap, servicesSnap, providersSnap] = await Promise.all([
        getDocs(query(collection(db, 'salonClients'), where('salonId', '==', salonId))),
        getDocs(query(collection(db, 'salonCheckouts'), where('salonId', '==', salonId))),
        getDocs(query(collection(db, 'salonServices'), where('salonId', '==', salonId))),
        getDocs(query(collection(db, 'salonProviders'), where('salonId', '==', salonId))),
      ])

      const clients   = clientsSnap.docs.map(d => d.data() as SalonClient)
      const checkouts = checkoutsSnap.docs.map(d => d.data() as SalonCheckout)
      const services  = servicesSnap.docs.map(d => d.data() as SalonService)
      const prov      = providersSnap.docs.map(d => d.data() as SalonProvider)

      const inRange = (ts: Timestamp, from: Timestamp) => ts.seconds >= from.seconds

      const clientsToday = clients.filter(c => inRange(c.createdAt, todayStart)).length
      const clientsWeek  = clients.filter(c => inRange(c.createdAt, weekStart)).length
      const clientsMonth = clients.filter(c => inRange(c.createdAt, monthStart)).length

      const rev = (from: Timestamp) => checkouts
        .filter(c => inRange(c.checkoutAt, from))
        .reduce((s, c) => s + c.totalAmount, 0)

      setStats({
        clientsToday, clientsWeek, clientsMonth,
        revenueToday: rev(todayStart), revenueWeek: rev(weekStart), revenueMonth: rev(monthStart),
        servicesTotal: services.filter(s => inRange(s.serviceDate, monthStart)).length,
      })
      setProviders(prov.filter(p => p.status === 'ACTIVE'))
      setLoading(false)
    }
    load().catch(console.error)
  }, [salonId])

  if (loading) return <PageLoader />

  const fmt = (n: number) => `KES ${n.toLocaleString()}`

  const revenueRows = [
    { label: 'Today', value: stats?.revenueToday ?? 0 },
    { label: 'This week', value: stats?.revenueWeek ?? 0 },
    { label: 'This month', value: stats?.revenueMonth ?? 0 },
  ]
  const maxRevenue = Math.max(1, ...revenueRows.map(r => r.value))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={format(new Date(), 'EEEE, d MMMM yyyy')}
        className="!mb-0"
        actions={
          <>
            <Link to={`/salon/${salonId}/owner/reports`} className="btn-secondary">
              <BarChart3 className="w-4 h-4" /> Reports
            </Link>
            <Link to={`/salon/${salonId}/owner/providers`} className="btn-primary">
              <UserPlus className="w-4 h-4" /> Add provider
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} tone="bg-blue-50 text-blue-600" label="Clients today" value={stats?.clientsToday ?? 0}
          sub={`${stats?.clientsWeek ?? 0} this week · ${stats?.clientsMonth ?? 0} this month`} />
        <StatCard icon={Wallet} tone="bg-emerald-50 text-emerald-600" label="Revenue today" value={fmt(stats?.revenueToday ?? 0)}
          sub={`${fmt(stats?.revenueWeek ?? 0)} this week`} />
        <StatCard icon={TrendingUp} tone="bg-violet-50 text-violet-600" label="Revenue this month" value={fmt(stats?.revenueMonth ?? 0)} />
        <StatCard icon={Scissors} tone="bg-amber-50 text-amber-600" label="Services this month" value={stats?.servicesTotal ?? 0}
          sub={`${providers.length} active providers`} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="section-title mb-0">Revenue</h3>
          <p className="text-xs text-gray-500 mt-0.5">Paid checkouts</p>
          <ul className="mt-5 space-y-4">
            {revenueRows.map(r => (
              <li key={r.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-gray-600">{r.label}</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{fmt(r.value)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-lango-primary" style={{ width: `${(r.value / maxRevenue) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card lg:col-span-3">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="section-title mb-0">Active providers ({providers.length})</h3>
            <Link to={`/salon/${salonId}/owner/providers`} className="text-xs text-lango-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {providers.length === 0 ? (
            <EmptyState icon={Scissors} title="No providers yet" description="Add your stylists so receptionists can assign clients to them." />
          ) : (
            <div className="divide-y divide-gray-100">
              {providers.slice(0, 5).map(p => (
                <Link key={p.providerId} to={`/salon/${salonId}/owner/reports?provider=${p.providerId}`}
                  className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/60 transition-colors">
                  <span className="w-9 h-9 rounded-full bg-lango-light text-lango-primary text-xs font-semibold flex items-center justify-center shrink-0">
                    {p.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.services.map(serviceLabel).join(', ') || 'No services set'}</p>
                  </div>
                  <span className="badge badge-gray font-mono shrink-0">{p.providerCode}</span>
                  <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
