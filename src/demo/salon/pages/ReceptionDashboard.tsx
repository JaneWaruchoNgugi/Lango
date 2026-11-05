import { Link } from 'react-router-dom'
import { UserPlus, ShoppingBag, Users } from 'lucide-react'
import { PageHeader } from '../../../components/ui/PageHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SALON_SERVICE_LABELS } from '../../../types'
import { useSalonDemo, initials } from '../store'

export default function SalonDemoReceptionDashboard() {
  const { clients, services, providers } = useSalonDemo()
  const active = clients.filter(c => c.status === 'ACTIVE')
  const out = clients.filter(c => c.status === 'CHECKED_OUT')
  const providerName = (id: string) => providers.find(p => p.id === id)?.name.split(' ')[0] ?? '—'

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader title="Reception" subtitle="Hi Mercy, here's the floor right now." className="!mb-0"
        actions={<>
          <Link to="/demo/salon/reception/checkout" className="btn-secondary"><ShoppingBag className="w-4 h-4" /> Checkout</Link>
          <Link to="/demo/salon/reception/register" className="btn-primary"><UserPlus className="w-4 h-4" /> Register client</Link>
        </>} />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'In the salon', value: active.length, dot: 'bg-lango-primary', accent: 'text-lango-primary' },
          { label: 'Checked out', value: out.length, dot: 'bg-emerald-500', accent: 'text-gray-900' },
          { label: 'Total today', value: clients.length, dot: 'bg-gray-300', accent: 'text-gray-900' },
        ].map(k => (
          <div key={k.label} className="card p-4 sm:p-5">
            <p className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-500"><span className={`w-2 h-2 rounded-full ${k.dot}`} />{k.label}</p>
            <p className={`mt-2 font-display text-2xl sm:text-3xl font-bold ${k.accent}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="section-title mb-0">In the salon now</h3>
          <span className="badge badge-blue">{active.length}</span>
        </div>
        {active.length === 0 ? (
          <EmptyState icon={Users} title="No one in the salon" description="Register a client and they'll show here until checkout." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {active.map(c => {
              const mine = services.filter(s => s.clientId === c.id)
              const done = mine.filter(s => s.done).length
              return (
                <li key={c.id} className="px-5 py-4 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-lango-light text-lango-primary text-xs font-semibold flex items-center justify-center shrink-0">{initials(c.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name} <span className="text-xs font-normal text-gray-400">· arrived {c.arrivedLabel}</span></p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {mine.map(s => (
                        <span key={s.id} className={`text-xs px-2 py-0.5 rounded-full ${s.done ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                          {SALON_SERVICE_LABELS[s.type]} · {providerName(s.providerId)}{s.done ? ' ✓' : ''}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{done} of {mine.length} services done</p>
                  </div>
                  <Link to={`/demo/salon/reception/checkout?client=${c.id}`} className="btn-secondary text-xs shrink-0">Checkout</Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
