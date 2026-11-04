import { PageHeader } from '../../../components/ui/PageHeader'
import { SALON_SERVICE_LABELS, type SalonServiceType } from '../../../types'
import { useSalonDemo, fmtKes } from '../store'

export default function SalonDemoOwnerReports() {
  const { providers, services, checkouts } = useSalonDemo()
  const rows = providers.map(p => {
    const mine = services.filter(s => s.providerId === p.id)
    return { ...p, clients: new Set(mine.map(s => s.clientId)).size, count: mine.length, revenue: mine.reduce((n, s) => n + s.price, 0) }
  })
  const byType = Object.entries(services.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.type]: (acc[s.type] ?? 0) + s.price }), {}))
    .sort((a, b) => b[1] - a[1])
  const total = byType.reduce((n, [, v]) => n + v, 0) || 1
  const mpesa = checkouts.filter(k => k.method === 'MPESA').reduce((n, k) => n + k.total, 0)
  const cash = checkouts.filter(k => k.method !== 'MPESA').reduce((n, k) => n + k.total, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader title="Reports" subtitle="Today's work by provider, service and payment." className="!mb-0" />
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="section-title mb-0">Provider performance</h3></div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Provider</th><th>Code</th><th className="text-right">Clients</th><th className="text-right">Services</th><th className="text-right">Value</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="font-medium text-gray-900">{r.name}</td>
                  <td className="font-mono text-xs text-gray-500">{r.code}</td>
                  <td className="text-right tabular-nums">{r.clients}</td>
                  <td className="text-right tabular-nums">{r.count}</td>
                  <td className="text-right tabular-nums font-semibold">{fmtKes(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="section-title">Services by value</h3>
          <ul className="space-y-3">
            {byType.map(([type, v]) => (
              <li key={type}>
                <div className="flex justify-between text-sm"><span className="text-gray-600">{SALON_SERVICE_LABELS[type as SalonServiceType]}</span><span className="font-semibold tabular-nums">{fmtKes(v)}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-lango-primary rounded-full" style={{ width: `${(v / total) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="section-title">Payments, last 7 days</h3>
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
            <div className="bg-emerald-500" style={{ width: `${(mpesa / (mpesa + cash || 1)) * 100}%` }} />
            <div className="bg-amber-400 flex-1" />
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between"><span className="flex items-center gap-2 text-gray-600"><span className="w-2 h-2 rounded-full bg-emerald-500" />M-Pesa</span><span className="font-semibold tabular-nums">{fmtKes(mpesa)}</span></li>
            <li className="flex justify-between"><span className="flex items-center gap-2 text-gray-600"><span className="w-2 h-2 rounded-full bg-amber-400" />Cash</span><span className="font-semibold tabular-nums">{fmtKes(cash)}</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
