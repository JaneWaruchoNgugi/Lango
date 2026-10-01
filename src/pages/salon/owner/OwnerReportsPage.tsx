import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import { EmptyState } from '../../../components/ui/EmptyState'
import { format, startOfDay, startOfWeek, startOfMonth, subMonths } from 'date-fns'
import type { SalonService, SalonProvider, SalonCheckout, SalonServiceType } from '../../../types'
import { SALON_SERVICE_LABELS } from '../../../types'

type Period = 'today' | 'week' | 'month' | string  // string = "YYYY-MM" for historical months

interface ProviderRow {
  provider: SalonProvider
  clientsCount: number
  servicesCount: number
  serviceBreakdown: Partial<Record<SalonServiceType, number>>
}

function getPeriodStart(period: Period): Date {
  const now = new Date()
  if (period === 'today') return startOfDay(now)
  if (period === 'week')  return startOfWeek(now, { weekStartsOn: 1 })
  if (period === 'month') return startOfMonth(now)
  // Historical month e.g. "2026-08"
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

function getPeriodEnd(period: Period): Date {
  if (period === 'today' || period === 'week' || period === 'month') return new Date(Date.now() + 1000)
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m, 1) // first of next month (exclusive)
}

export default function OwnerReportsPage() {
  const { salonId } = useParams<{ salonId: string }>()
  const [searchParams] = useSearchParams()
  const focusProvider = searchParams.get('provider')

  const [providers, setProviders]  = useState<SalonProvider[]>([])
  const [services, setServices]    = useState<SalonService[]>([])
  const [checkouts, setCheckouts]  = useState<SalonCheckout[]>([])
  const [loading, setLoading]      = useState(true)
  const [period, setPeriod]        = useState<Period>('month')
  const [selected, setSelected]    = useState<SalonProvider | null>(null)

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i + 1)
    return format(d, 'yyyy-MM')
  })

  useEffect(() => {
    if (!salonId) return
    Promise.all([
      getDocs(query(collection(db, 'salonProviders'), where('salonId', '==', salonId))),
      getDocs(query(collection(db, 'salonServices'),  where('salonId', '==', salonId))),
      getDocs(query(collection(db, 'salonCheckouts'), where('salonId', '==', salonId))),
    ]).then(([pSnap, sSnap, cSnap]) => {
      const prov = pSnap.docs.map(d => d.data() as SalonProvider)
      setProviders(prov)
      setServices(sSnap.docs.map(d => d.data() as SalonService))
      setCheckouts(cSnap.docs.map(d => d.data() as SalonCheckout))
      if (focusProvider) {
        const p = prov.find(x => x.providerId === focusProvider)
        if (p) setSelected(p)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [salonId, focusProvider])

  const inPeriod = (ts: Timestamp): boolean => {
    const d = ts.toDate()
    return d >= getPeriodStart(period) && d < getPeriodEnd(period)
  }

  const filteredServices  = services.filter(s => inPeriod(s.serviceDate))
  const filteredCheckouts = checkouts.filter(c => inPeriod(c.checkoutAt))

  const totalRevenue = filteredCheckouts.reduce((s, c) => s + c.totalAmount, 0)
  const uniqueClients = new Set(filteredServices.map(s => s.clientId)).size

  const providerRows: ProviderRow[] = providers.map(p => {
    const ps = filteredServices.filter(s => s.providerId === p.providerId)
    const clients = new Set(ps.map(s => s.clientId)).size
    const breakdown: Partial<Record<SalonServiceType, number>> = {}
    ps.forEach(s => { breakdown[s.serviceType] = (breakdown[s.serviceType] ?? 0) + 1 })
    return { provider: p, clientsCount: clients, servicesCount: ps.length, serviceBreakdown: breakdown }
  }).filter(r => r.servicesCount > 0).sort((a, b) => b.servicesCount - a.servicesCount)

  const selectedServices = selected ? filteredServices.filter(s => s.providerId === selected.providerId) : []
  const clientHistory    = selected ? (() => {
    const map = new Map<string, { name: string; services: SalonService[] }>()
    selectedServices.forEach(s => {
      const entry = map.get(s.clientId) ?? { name: s.clientName, services: [] }
      entry.services.push(s)
      map.set(s.clientId, entry)
    })
    return Array.from(map.values())
  })() : []

  if (loading) return <PageLoader />

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Provider performance & revenue</p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {['today', 'week', 'month'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${period === p ? 'bg-lango-primary text-white border-lango-primary' : 'border-gray-200 text-gray-600'}`}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
          <select value={typeof period === 'string' && period.includes('-') ? period : ''}
            onChange={e => e.target.value && setPeriod(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600">
            <option value="">Past months...</option>
            {months.map(m => <option key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</option>)}
          </select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Unique Clients</p>
          <p className="text-2xl font-bold text-gray-900">{uniqueClients}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Services</p>
          <p className="text-2xl font-bold text-gray-900">{filteredServices.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Revenue</p>
          <p className="text-2xl font-bold text-gray-900">KES {totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Provider table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="section-title mb-0">Provider Performance</h3>
        </div>
        {providerRows.length === 0 ? (
          <EmptyState title="No data" description="No services recorded for this period." />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Provider</th>
                  <th className="table-th">Code</th>
                  <th className="table-th text-right">Clients</th>
                  <th className="table-th text-right">Services</th>
                  <th className="table-th">Breakdown</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {providerRows.map(r => (
                  <tr key={r.provider.providerId} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="table-td font-medium">{r.provider.name}</td>
                    <td className="table-td font-mono text-xs text-gray-500">{r.provider.providerCode}</td>
                    <td className="table-td text-right">{r.clientsCount}</td>
                    <td className="table-td text-right">{r.servicesCount}</td>
                    <td className="table-td">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(r.serviceBreakdown).map(([s, n]) => (
                          <span key={s} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {SALON_SERVICE_LABELS[s as SalonServiceType]} ×{n}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="table-td">
                      <button onClick={() => setSelected(selected?.providerId === r.provider.providerId ? null : r.provider)}
                        className="text-xs text-lango-primary">
                        {selected?.providerId === r.provider.providerId ? 'Close' : 'Details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provider detail drill-down */}
      {selected && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="section-title mb-0">{selected.name} · Client History</h3>
            <button onClick={() => setSelected(null)} className="text-xs text-gray-400">✕ Close</button>
          </div>
          {clientHistory.length === 0 ? (
            <EmptyState title="No clients" description="No clients found for this period." />
          ) : (
            <div className="divide-y divide-gray-50">
              {clientHistory.map(c => (
                <div key={c.name + c.services[0]?.clientId} className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.services.map(s => (
                      <span key={s.serviceId} className="text-xs bg-lango-light text-lango-primary px-2 py-0.5 rounded">
                        {SALON_SERVICE_LABELS[s.serviceType]} · {format(s.serviceDate.toDate(), 'dd/MM HH:mm')}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
