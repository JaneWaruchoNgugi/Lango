import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import type { SalonClient, SalonCheckout, SalonProvider, SalonService } from '../../../types'
import { SALON_SERVICE_LABELS } from '../../../types'

interface Stats {
  clientsToday: number; clientsWeek: number; clientsMonth: number
  revenueToday: number; revenueWeek: number; revenueMonth: number
  servicesTotal: number
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Clients</p>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Today"      value={stats?.clientsToday ?? 0} />
          <StatCard label="This Week"  value={stats?.clientsWeek ?? 0} />
          <StatCard label="This Month" value={stats?.clientsMonth ?? 0} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Revenue</p>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Today"      value={fmt(stats?.revenueToday ?? 0)} />
          <StatCard label="This Week"  value={fmt(stats?.revenueWeek ?? 0)} />
          <StatCard label="This Month" value={fmt(stats?.revenueMonth ?? 0)} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">This Month's Services</p>
        <StatCard label="Total services performed" value={stats?.servicesTotal ?? 0} />
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="section-title mb-0">Active Providers ({providers.length})</h3>
          <Link to={`/salon/${salonId}/owner/providers`} className="text-xs text-lango-primary">View all →</Link>
        </div>
        {providers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No providers yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {providers.slice(0, 5).map(p => (
              <div key={p.providerId} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{p.providerCode} · {p.services.map(s => SALON_SERVICE_LABELS[s]).join(', ')}</p>
                </div>
                <Link to={`/salon/${salonId}/owner/reports?provider=${p.providerId}`}
                  className="text-xs text-lango-primary">View</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
